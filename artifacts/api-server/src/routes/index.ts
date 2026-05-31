import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import avatarRouter from "./avatar";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(avatarRouter);

export default router;
