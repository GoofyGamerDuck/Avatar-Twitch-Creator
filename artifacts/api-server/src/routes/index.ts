import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import avatarRouter from "./avatar";
import adminRouter from "./admin";
import chatRouter from "./chat";
import partsRouter from "./parts";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(avatarRouter);
router.use(adminRouter);
router.use(chatRouter);
router.use(partsRouter);
router.use(storageRouter);

export default router;
