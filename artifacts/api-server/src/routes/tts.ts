import { Router, type IRouter, type Request, type Response } from "express";
import { db, voicesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/tts/synthesize", async (req: Request, res: Response): Promise<void> => {
  const voiceId = req.query.voiceId as string | undefined;
  const text = req.query.text as string | undefined;

  if (!voiceId || !text) {
    res.status(400).json({ error: "voiceId and text required" });
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "ElevenLabs API key not configured" });
    return;
  }

  const normalized = voiceId.toLowerCase();
  const allVoices = await db.select().from(voicesTable)
    .where(eq(voicesTable.isActive, true));
  const voice = allVoices.find(v =>
    v.name.toLowerCase() === normalized || String(v.id) === voiceId
  );

  if (!voice?.elevenLabsVoiceId) {
    res.status(404).json({ error: "No ElevenLabs voice ID for this voice" });
    return;
  }

  const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.elevenLabsVoiceId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
    }),
  });

  if (!elRes.ok) {
    const body = await elRes.text().catch(() => "");
    req.log.warn({ status: elRes.status, body }, "ElevenLabs API error");
    res.status(502).json({ error: "ElevenLabs API error", detail: body });
    return;
  }

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Voice-Name", voice.name);

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
});

export default router;
