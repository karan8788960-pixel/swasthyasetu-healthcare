import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jarvisRouter from "./jarvis";
import swasthyaDataRouter from "./swasthyasetu-data";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jarvisRouter);
router.use(swasthyaDataRouter);

export default router;
