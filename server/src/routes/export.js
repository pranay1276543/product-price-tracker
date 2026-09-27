import { Router } from "express";
import { exportScrapeHistoryCsv } from "../controllers/exportController.js";

const router = Router();

router.get("/", exportScrapeHistoryCsv);

export default router;
