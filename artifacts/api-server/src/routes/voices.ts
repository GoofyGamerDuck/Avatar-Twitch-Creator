import { Router, type IRouter } from "express";
import { db, voicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/voices", async (req, res): Promise<void> => {
  const voices = await db
    .select()
    .from(voicesTable)
    .where(eq(voicesTable.isActive, true))
    .orderBy(voicesTable.sortOrder, voicesTable.createdAt);

  res.json({ voices });
});

export default router;
