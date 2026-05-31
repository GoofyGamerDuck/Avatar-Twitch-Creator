import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, avatarPartsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const pw = req.headers["x-admin-password"] as string | undefined;
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid admin password" });
    return;
  }
  next();
}

router.post("/admin/verify", (req: Request, res: Response): void => {
  const pw = req.headers["x-admin-password"] as string | undefined;
  if (!ADMIN_PASSWORD) {
    res.status(500).json({ error: "ADMIN_PASSWORD not configured" });
    return;
  }
  res.json({ ok: pw === ADMIN_PASSWORD });
});

router.get("/admin/parts", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parts = await db
    .select()
    .from(avatarPartsTable)
    .orderBy(avatarPartsTable.category, avatarPartsTable.sortOrder);
  res.json({ parts });
});

router.post("/admin/parts", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { category, name, label, imageUrl, sortOrder } = req.body as {
    category: string;
    name: string;
    label: string;
    imageUrl: string;
    sortOrder?: number;
  };

  if (!category || !name || !label || !imageUrl) {
    res.status(400).json({ error: "category, name, label, and imageUrl are required" });
    return;
  }

  const [part] = await db
    .insert(avatarPartsTable)
    .values({ category, name, label, imageUrl, sortOrder: sortOrder ?? 0 })
    .returning();

  res.status(201).json({ part });
});

router.patch("/admin/parts/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { isActive, sortOrder, label } = req.body as { isActive?: boolean; sortOrder?: number; label?: string };

  const updates: Partial<{ isActive: boolean; sortOrder: number; label: string }> = {};
  if (isActive !== undefined) updates.isActive = isActive;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (label !== undefined) updates.label = label;

  const [part] = await db
    .update(avatarPartsTable)
    .set(updates)
    .where(eq(avatarPartsTable.id, id))
    .returning();

  if (!part) {
    res.status(404).json({ error: "Part not found" });
    return;
  }
  res.json({ part });
});

router.delete("/admin/parts/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(avatarPartsTable).where(eq(avatarPartsTable.id, id));
  res.json({ success: true });
});

export default router;
