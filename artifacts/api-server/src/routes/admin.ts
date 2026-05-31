import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, avatarPartsTable, voicesTable, cosmeticRequestsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const pw = req.headers["x-admin-password"] as string | undefined;
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid admin password" }); return;
  }
  next();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/admin/verify", (req: Request, res: Response): void => {
  const pw = req.headers["x-admin-password"] as string | undefined;
  if (!ADMIN_PASSWORD) { res.status(500).json({ error: "ADMIN_PASSWORD not configured" }); return; }
  res.json({ ok: pw === ADMIN_PASSWORD });
});

// ── Parts ─────────────────────────────────────────────────────────────────────
router.get("/admin/parts", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const parts = await db.select().from(avatarPartsTable)
    .orderBy(avatarPartsTable.category, avatarPartsTable.sortOrder, avatarPartsTable.createdAt);
  res.json({ parts });
});

router.post("/admin/parts", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { category, name, label, imageUrl, sortOrder } = req.body as {
    category: string; name: string; label: string; imageUrl: string; sortOrder?: number;
  };
  if (!category || !name || !label) { res.status(400).json({ error: "category, name, label required" }); return; }
  const [part] = await db.insert(avatarPartsTable)
    .values({ category, name, label, imageUrl: imageUrl ?? "", sortOrder: sortOrder ?? 0 }).returning();
  res.status(201).json({ part });
});

router.patch("/admin/parts/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { isActive, sortOrder, label, allowColorOverride } = req.body as {
    isActive?: boolean; sortOrder?: number; label?: string; allowColorOverride?: boolean;
  };
  const updates: Record<string, unknown> = {};
  if (isActive !== undefined) updates.isActive = isActive;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (label !== undefined) updates.label = label;
  if (allowColorOverride !== undefined) updates.allowColorOverride = allowColorOverride;
  const [part] = await db.update(avatarPartsTable).set(updates).where(eq(avatarPartsTable.id, id)).returning();
  if (!part) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ part });
});

router.delete("/admin/parts/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(avatarPartsTable).where(eq(avatarPartsTable.id, id));
  res.json({ success: true });
});

// ── Voices ────────────────────────────────────────────────────────────────────
router.get("/admin/voices", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const voices = await db.select().from(voicesTable).orderBy(voicesTable.sortOrder, voicesTable.createdAt);
  res.json({ voices });
});

router.post("/admin/voices", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, description, pitch, rate, browserVoiceName, elevenLabsVoiceId, modelPath, modelConfigPath, sortOrder } = req.body as {
    name: string; description?: string; pitch?: number; rate?: number;
    browserVoiceName?: string; elevenLabsVoiceId?: string;
    modelPath?: string; modelConfigPath?: string; sortOrder?: number;
  };
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [voice] = await db.insert(voicesTable).values({
    name, description: description ?? "", pitch: pitch ?? 1.0, rate: rate ?? 1.0,
    browserVoiceName: browserVoiceName ?? null,
    elevenLabsVoiceId: elevenLabsVoiceId ?? null,
    modelPath: modelPath ?? null,
    modelConfigPath: modelConfigPath ?? null,
    sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json({ voice });
});

router.patch("/admin/voices/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { name, description, pitch, rate, browserVoiceName, isActive, sortOrder } = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (pitch !== undefined) updates.pitch = pitch;
  if (rate !== undefined) updates.rate = rate;
  if (browserVoiceName !== undefined) updates.browserVoiceName = browserVoiceName;
  if (req.body.elevenLabsVoiceId !== undefined) updates.elevenLabsVoiceId = req.body.elevenLabsVoiceId;
  if (req.body.modelPath !== undefined) updates.modelPath = req.body.modelPath;
  if (req.body.modelConfigPath !== undefined) updates.modelConfigPath = req.body.modelConfigPath;
  if (isActive !== undefined) updates.isActive = isActive;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  const [voice] = await db.update(voicesTable).set(updates).where(eq(voicesTable.id, id)).returning();
  if (!voice) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ voice });
});

router.delete("/admin/voices/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(voicesTable).where(eq(voicesTable.id, id));
  res.json({ success: true });
});

// ── Cosmetic Requests ─────────────────────────────────────────────────────────
router.get("/admin/cosmetic-requests", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const status = (req.query.status as string) || "pending";
  const rows = await db
    .select({
      request: cosmeticRequestsTable,
      twitchUsername: usersTable.twitchUsername,
      displayName: usersTable.displayName,
    })
    .from(cosmeticRequestsTable)
    .innerJoin(usersTable, eq(cosmeticRequestsTable.userId, usersTable.id))
    .where(eq(cosmeticRequestsTable.status, status))
    .orderBy(desc(cosmeticRequestsTable.createdAt));

  res.json({ requests: rows.map(r => ({ ...r.request, twitchUsername: r.twitchUsername, displayName: r.displayName })) });
});

router.patch("/admin/cosmetic-requests/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { status, adminNote } = req.body as { status: string; adminNote?: string };

  const [request] = await db
    .update(cosmeticRequestsTable)
    .set({ status, adminNote: adminNote ?? null, reviewedAt: new Date() })
    .where(eq(cosmeticRequestsTable.id, id))
    .returning();

  if (!request) { res.status(404).json({ error: "Not found" }); return; }

  // Auto-create avatar_part on approval
  if (status === "approved") {
    await db.insert(avatarPartsTable).values({
      category: request.category,
      name: request.name,
      label: request.label,
      imageUrl: request.imageUrl,
    });
  }

  res.json({ request });
});

export default router;
