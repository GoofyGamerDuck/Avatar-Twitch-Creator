import { Router, type IRouter, type Request } from "express";
import { db, usersTable, avatarSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID ?? "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET ?? "";

function getRedirectUri(req: Request): string {
  // Prefer req.headers.host (set by Railway) over x-forwarded-host (legacy Replit proxy)
  const publicHost = req.headers.host ?? "";

  if (publicHost && publicHost !== "localhost" && !publicHost.startsWith("localhost:")) {
    const proto = req.protocol || "https";
    return `${proto}://${publicHost}/api/auth/twitch/callback`;
  }

  // Fallback: env-var based (for local dev)
  const appUrl = process.env.APP_URL ?? "";
  if (appUrl) {
    return `${appUrl}/api/auth/twitch/callback`;
  }
  return `http://${publicHost || "localhost"}/api/auth/twitch/callback`;
}

// Informational endpoint — lets the frontend show the exact URL to register
router.get("/auth/redirect-uri", (req, res): void => {
  res.json({ redirectUri: getRedirectUri(req) });
});

router.get("/auth/twitch", (req, res): void => {
  if (!TWITCH_CLIENT_ID) {
    res.status(500).json({ error: "Twitch OAuth not configured. Set TWITCH_CLIENT_ID." });
    return;
  }
  const redirectUri = getRedirectUri(req);
  req.log.info({ redirectUri }, "Twitch OAuth redirect");
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "user:read:email",
  });
  res.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
});

router.get("/auth/twitch/callback", async (req, res): Promise<void> => {
  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  const error = Array.isArray(req.query.error) ? req.query.error[0] : req.query.error;
  const errorDesc = Array.isArray(req.query.error_description)
    ? req.query.error_description[0]
    : req.query.error_description;

  req.log.info({ code: !!code, error, errorDesc }, "Twitch callback received");

  if (error || !code || typeof code !== "string") {
    req.log.warn({ error, errorDesc }, "Twitch OAuth error");
    res.redirect(`/?error=${encodeURIComponent(String(error ?? "unknown"))}&desc=${encodeURIComponent(String(errorDesc ?? ""))}`);
    return;
  }

  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    res.status(500).json({ error: "Twitch OAuth not configured." });
    return;
  }

  const redirectUri = getRedirectUri(req);
  req.log.info({ redirectUri }, "Exchanging code for token");

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      req.log.error({ status: tokenRes.status, body }, "Twitch token exchange failed");
      res.redirect("/?error=token_exchange_failed");
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    // Fetch user profile from Twitch
    const userRes = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": TWITCH_CLIENT_ID,
      },
    });

    if (!userRes.ok) {
      req.log.error({ status: userRes.status }, "Twitch user fetch failed");
      res.redirect("/?error=user_fetch_failed");
      return;
    }

    const userData = (await userRes.json()) as {
      data: Array<{
        id: string;
        login: string;
        display_name: string;
        profile_image_url: string;
      }>;
    };

    const twitchUser = userData.data[0];
    if (!twitchUser) {
      res.redirect("/?error=no_user_data");
      return;
    }

    // Upsert user in database
    const [user] = await db
      .insert(usersTable)
      .values({
        twitchId: twitchUser.id,
        twitchUsername: twitchUser.login,
        displayName: twitchUser.display_name,
        profileImageUrl: twitchUser.profile_image_url,
      })
      .onConflictDoUpdate({
        target: usersTable.twitchId,
        set: {
          twitchUsername: twitchUser.login,
          displayName: twitchUser.display_name,
          profileImageUrl: twitchUser.profile_image_url,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Create default avatar settings if not exists
    await db
      .insert(avatarSettingsTable)
      .values({
        userId: user.id,
        skinTone: "medium",
        hairStyle: "short",
        hairColor: "brown",
        eyeStyle: "default",
        mouthStyle: "smile",
        outfitStyle: "casual",
        accessory: null,
        voiceId: "alloy",
      })
      .onConflictDoNothing();

    // Store user ID in session
    (req.session as { userId?: number }).userId = user.id;

    req.log.info({ userId: user.id, username: twitchUser.login }, "User logged in via Twitch");
    res.redirect("/studio");
  } catch (err) {
    req.log.error({ err }, "Twitch callback error");
    res.redirect("/?error=internal_error");
  }
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    twitchId: user.twitchId,
    twitchUsername: user.twitchUsername,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl,
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, "Session destroy error");
    }
  });
  res.json({ success: true });
});

export default router;
