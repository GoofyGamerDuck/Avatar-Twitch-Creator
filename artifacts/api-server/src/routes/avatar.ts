import { Router, type IRouter } from "express";
import { db, usersTable, avatarSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SaveAvatarBody, GetUserAvatarParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/avatar", async (req, res): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [avatar] = await db
    .select()
    .from(avatarSettingsTable)
    .where(eq(avatarSettingsTable.userId, userId));

  if (!avatar) {
    res.status(404).json({ error: "Avatar not found" });
    return;
  }

  res.json(avatar);
});

router.put("/avatar", async (req, res): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = SaveAvatarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(avatarSettingsTable)
    .where(eq(avatarSettingsTable.userId, userId));

  let avatar;
  if (existing) {
    [avatar] = await db
      .update(avatarSettingsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(avatarSettingsTable.userId, userId))
      .returning();
  } else {
    [avatar] = await db
      .insert(avatarSettingsTable)
      .values({ userId, ...parsed.data })
      .returning();
  }

  res.json(avatar);
});

router.get("/users/:username/avatar", async (req, res): Promise<void> => {
  const params = GetUserAvatarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const username = params.data.username.toLowerCase();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.twitchUsername, username));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [avatar] = await db
    .select()
    .from(avatarSettingsTable)
    .where(eq(avatarSettingsTable.userId, user.id));

  if (!avatar) {
    res.status(404).json({ error: "Avatar not configured" });
    return;
  }

  res.json({
    twitchUsername: user.twitchUsername,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl,
    avatar,
  });
});

export default router;
