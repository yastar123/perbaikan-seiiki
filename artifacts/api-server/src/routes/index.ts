import { Router, type IRouter } from "express";
import healthRouter from "./health";
import seiikiRouter from "./seiiki";

const router: IRouter = Router();

router.use(healthRouter);
router.use(seiikiRouter);

export default router;
