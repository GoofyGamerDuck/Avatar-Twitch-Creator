import { Router, type IRouter, type Request, type Response } from "express";
import { db, voicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// Piper binary lives next to the workspace root (downloaded during setup)
const PIPER_DIR = "/home/runner/workspace/bin/piper";
const PIPER_BIN = path.join(PIPER_DIR, "piper");
const PIPER_ESPEAK_DATA = path.join(PIPER_DIR, "espeak-ng-data");
const MODEL_CACHE_DIR = path.join(os.tmpdir(), "piper-models");

// In-memory cache: voiceId → absolute paths to cached model files on disk
const modelCache = new Map<number, { modelFile: string; configFile: string }>();

async function ensureModelCached(
  voice: { id: number; modelPath: string; modelConfigPath: string },
): Promise<{ modelFile: string; configFile: string }> {
  const cached = modelCache.get(voice.id);
  if (cached) return cached;

  const voiceDir = path.join(MODEL_CACHE_DIR, String(voice.id));
  await fs.mkdir(voiceDir, { recursive: true });

  const modelFile = path.join(voiceDir, "model.onnx");
  const configFile = path.join(voiceDir, "model.onnx.json");

  // Download model file if not already cached
  const [modelExists, configExists] = await Promise.all([
    fs.access(modelFile).then(() => true).catch(() => false),
    fs.access(configFile).then(() => true).catch(() => false),
  ]);

  if (!modelExists) {
    const file = await objectStorageService.getObjectEntityFile(voice.modelPath);
    await file.download({ destination: modelFile });
  }
  if (!configExists) {
    const file = await objectStorageService.getObjectEntityFile(voice.modelConfigPath);
    await file.download({ destination: configFile });
  }

  const entry = { modelFile, configFile };
  modelCache.set(voice.id, entry);
  return entry;
}

function synthesizeWithPiper(
  text: string,
  modelFile: string,
  configFile: string,
  res: Response,
): void {
  const proc = spawn(
    PIPER_BIN,
    [
      "--model", modelFile,
      "--config", configFile,
      "--output_file", "-",
      "--quiet",
      "--espeak_data", PIPER_ESPEAK_DATA,
    ],
    { env: { ...process.env, LD_LIBRARY_PATH: PIPER_DIR } },
  );

  proc.stdin.write(text, "utf8");
  proc.stdin.end();

  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Cache-Control", "no-store");

  let errBuf = "";
  proc.stderr.on("data", (d: Buffer) => { errBuf += d.toString(); });

  proc.on("error", (err) => {
    if (!res.headersSent) res.status(500).json({ error: "Piper spawn error", detail: err.message });
    else res.destroy();
  });

  proc.on("close", (code) => {
    if (code !== 0 && !res.headersSent) {
      res.status(500).json({ error: "Piper synthesis failed", detail: errBuf });
    }
  });

  proc.stdout.pipe(res);
}

router.get("/tts/synthesize", async (req: Request, res: Response): Promise<void> => {
  const voiceId = req.query.voiceId as string | undefined;
  const text = (req.query.text as string | undefined)?.trim();

  if (!voiceId || !text) {
    res.status(400).json({ error: "voiceId and text required" });
    return;
  }

  // Find matching active voice by name (case-insensitive) or numeric id
  const allVoices = await db.select().from(voicesTable).where(eq(voicesTable.isActive, true));
  const voice = allVoices.find(v =>
    v.name.toLowerCase() === voiceId.toLowerCase() || String(v.id) === voiceId,
  );

  if (!voice) {
    res.status(404).json({ error: "Voice not found" });
    return;
  }

  // ── Piper (ONNX model) ────────────────────────────────────────────────────
  if (voice.modelPath && voice.modelConfigPath) {
    try {
      const { modelFile, configFile } = await ensureModelCached({
        id: voice.id,
        modelPath: voice.modelPath,
        modelConfigPath: voice.modelConfigPath,
      });
      synthesizeWithPiper(text, modelFile, configFile, res);
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Model file not found in storage" });
      } else {
        req.log.error({ err }, "Piper synthesis error");
        res.status(500).json({ error: "Piper synthesis error" });
      }
    }
    return;
  }

  // ── ElevenLabs ───────────────────────────────────────────────────────────
  if (voice.elevenLabsVoiceId) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "ElevenLabs API key not configured" });
      return;
    }

    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.elevenLabsVoiceId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
        }),
      },
    );

    if (!elRes.ok) {
      const body = await elRes.text().catch(() => "");
      req.log.warn({ status: elRes.status, body }, "ElevenLabs API error");
      res.status(502).json({ error: "ElevenLabs API error", detail: body });
      return;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");

    const reader = elRes.body?.getReader();
    if (!reader) { res.status(500).json({ error: "No response body" }); return; }
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
    return;
  }

  res.status(404).json({ error: "No TTS engine configured for this voice" });
});

export default router;
