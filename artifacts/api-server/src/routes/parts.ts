import { Router, type IRouter } from "express";
import { db, avatarPartsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/parts", async (req, res): Promise<void> => {
  const parts = await db
    .select()
    .from(avatarPartsTable)
    .where(eq(avatarPartsTable.isActive, true))
    .orderBy(avatarPartsTable.sortOrder, avatarPartsTable.createdAt);

  res.json({ parts });
});

export default router;
