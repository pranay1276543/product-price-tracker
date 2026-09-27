import { Router } from "express";
import { triggerScrape } from "../controllers/scrapeController.js";

const router = Router();

router.post("/", triggerScrape);

export default router;
