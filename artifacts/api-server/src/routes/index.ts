import { Router, type IRouter } from "express";
import healthRouter from "./health";
import seiikiRouter from "./seiiki";
import authRouter from "./auth";
import locationsRouter from "./locations";
import cmsRouter from "./cms";
import paywuzRouter from "./paywuz";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(locationsRouter);
router.use(cmsRouter);
router.use(paywuzRouter);
router.use(seiikiRouter);

export default router;
