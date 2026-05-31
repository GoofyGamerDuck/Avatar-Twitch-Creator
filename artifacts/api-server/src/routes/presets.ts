import { Router, type IRouter, type Request, type Response } from "express";
import { db, avatarPresetsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";

const router: IRouter = Router();
const MAX_PRESETS = 5;

// GET /api/presets — user's presets
router.get("/presets", async (req: Request, res: Response): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const presets = await db.select().from(avatarPresetsTable)
    .where(eq(avatarPresetsTable.userId, userId))
    .orderBy(avatarPresetsTable.createdAt);
  res.json({ presets });
});

// POST /api/presets — create (max 5)
router.post("/presets", async (req: Request, res: Response): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { name, data } = req.body as { name: string; data: Record<string, unknown> };
  if (!name || !data) { res.status(400).json({ error: "name and data required" }); return; }

  const [{ total }] = await db
    .select({ total: count() })
    .from(avatarPresetsTable)
    .where(eq(avatarPresetsTable.userId, userId));

  if (Number(total) >= MAX_PRESETS) {
    res.status(400).json({ error: `Maximum ${MAX_PRESETS} presets allowed` }); return;
  }

  const [preset] = await db.insert(avatarPresetsTable)
    .values({ userId, name: name.trim(), data })
    .returning();
  res.status(201).json({ preset });
});

// PUT /api/presets/:id — rename
router.put("/presets/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const { name } = req.body as { name: string };
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [preset] = await db.update(avatarPresetsTable)
    .set({ name: name.trim() })
    .where(and(eq(avatarPresetsTable.id, id), eq(avatarPresetsTable.userId, userId)))
    .returning();
  if (!preset) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ preset });
});

// DELETE /api/presets/:id
router.delete("/presets/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = parseInt(String(req.params.id), 10);
  await db.delete(avatarPresetsTable)
    .where(and(eq(avatarPresetsTable.id, id), eq(avatarPresetsTable.userId, userId)));
  res.json({ success: true });
});

export default router;
