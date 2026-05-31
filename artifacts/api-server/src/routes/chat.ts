import { Router, type IRouter, type Request, type Response } from "express";
import { Client as TmiClient } from "tmi.js";
import { db, usersTable, avatarSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

export interface ChatMessage {
  id: string;
  username: string;
  displayName: string;
  message: string;
  color: string | null;
  avatar: {
    skinTone: string;
    hairStyle: string;
    hairColor: string;
    headShape: string;
    eyeStyle: string;
    eyeColor: string;
    eyeWidth: number;
    eyeSpacing: number;
    mouthStyle: string;
    mouthColor: string;
    outfitStyle: string;
    outfitColor: string;
    accessory: string | null;
    accessoryColor: string;
    accessories: { name: string; color: string; position?: { x: number; y: number; scale: number } }[];
    layerOrder: string[];
    backgroundColor: string;
    partPositions: Record<string, { x: number; y: number; scale?: number }>;
    voiceId: string;
  } | null;
  profileImageUrl: string | null;
}

// Shared per-channel IRC connection pool
const channelPool = new Map<
  string,
  { client: TmiClient; listeners: Set<(msg: ChatMessage) => void> }
>();

async function subscribeToChannel(
  channel: string,
  listener: (msg: ChatMessage) => void,
): Promise<() => void> {
  const key = channel.toLowerCase().replace(/^#/, "");

  if (!channelPool.has(key)) {
    const client = new TmiClient({ channels: [key] });
    const listeners = new Set<(msg: ChatMessage) => void>();
    channelPool.set(key, { client, listeners });

    await client.connect();

    client.on("message", async (_chan, tags, message, self) => {
      if (self) return;
      const username = (tags.username ?? "").toLowerCase();
      const displayName = tags["display-name"] ?? username;

      let avatar: ChatMessage["avatar"] = null;
      let profileImageUrl: string | null = null;

      try {
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.twitchUsername, username));
        if (user) {
          profileImageUrl = user.profileImageUrl;
          const [avatarData] = await db
            .select()
            .from(avatarSettingsTable)
            .where(eq(avatarSettingsTable.userId, user.id));
          if (avatarData) {
            avatar = {
              skinTone: avatarData.skinTone,
              hairStyle: avatarData.hairStyle,
              hairColor: avatarData.hairColor,
              headShape: avatarData.headShape,
              eyeStyle: avatarData.eyeStyle,
              eyeColor: avatarData.eyeColor,
              eyeWidth: avatarData.eyeWidth,
              eyeSpacing: avatarData.eyeSpacing,
              mouthStyle: avatarData.mouthStyle,
              mouthColor: avatarData.mouthColor,
              outfitStyle: avatarData.outfitStyle,
              outfitColor: avatarData.outfitColor,
              accessory: avatarData.accessory ?? null,
              accessoryColor: avatarData.accessoryColor,
              accessories: (avatarData.accessories ?? []) as { name: string; color: string; position?: { x: number; y: number; scale: number } }[],
              layerOrder: (avatarData.layerOrder ?? []) as string[],
              backgroundColor: avatarData.backgroundColor,
              partPositions: (avatarData.partPositions ?? {}) as Record<string, { x: number; y: number; scale?: number }>,
              voiceId: avatarData.voiceId,
            };
          }
        }
      } catch {
        // DB lookup failure is non-fatal
      }

      const chatMsg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        username,
        displayName,
        message,
        color: tags.color ?? null,
        avatar,
        profileImageUrl,
      };

      channelPool.get(key)?.listeners.forEach((l) => l(chatMsg));
    });
  }

  const entry = channelPool.get(key)!;
  entry.listeners.add(listener);

  return () => {
    const e = channelPool.get(key);
    if (!e) return;
    e.listeners.delete(listener);
    if (e.listeners.size === 0) {
      e.client.disconnect().catch(() => {});
      channelPool.delete(key);
    }
  };
}

router.get("/chat/stream", async (req: Request, res: Response): Promise<void> => {
  const channel = String(req.query.channel ?? "")
    .toLowerCase()
    .replace(/^#/, "");

  if (!channel) {
    res.status(400).json({ error: "channel query parameter is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const pingInterval = setInterval(() => {
    res.write(":ping\n\n");
  }, 25000);

  const send = (msg: ChatMessage) => {
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  };

  let unsubscribe: (() => void) | null = null;

  try {
    unsubscribe = await subscribeToChannel(channel, send);
  } catch (err) {
    req.log.error({ err, channel }, "Failed to connect to Twitch IRC");
    clearInterval(pingInterval);
    res.write(`event: error\ndata: ${JSON.stringify({ error: "Failed to connect to chat" })}\n\n`);
    res.end();
    return;
  }

  req.on("close", () => {
    clearInterval(pingInterval);
    unsubscribe?.();
  });
});

export default router;
