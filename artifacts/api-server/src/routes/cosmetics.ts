import { Router, type IRouter, type Request, type Response } from "express";
import { db, cosmeticRequestsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/cosmetics/my-requests — authenticated user's own requests
router.get("/cosmetics/my-requests", async (req: Request, res: Response): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const requests = await db
    .select()
    .from(cosmeticRequestsTable)
    .where(eq(cosmeticRequestsTable.userId, userId))
    .orderBy(desc(cosmeticRequestsTable.createdAt));

  res.json({ requests });
});

// POST /api/cosmetics/request — submit a cosmetic request
router.post("/cosmetics/request", async (req: Request, res: Response): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { category, name, label, imageUrl } = req.body as {
    category: string; name: string; label: string; imageUrl: string;
  };
  if (!category || !name || !label || !imageUrl) {
    res.status(400).json({ error: "category, name, label, imageUrl are required" }); return;
  }

  const [request] = await db
    .insert(cosmeticRequestsTable)
    .values({ userId, category, name: name.toLowerCase().replace(/\s+/g, "_"), label, imageUrl })
    .returning();

  res.status(201).json({ request });
});

export default router;
