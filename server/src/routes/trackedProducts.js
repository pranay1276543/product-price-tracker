import { Router } from "express";
import {
  listTrackedProducts,
  createTrackedProduct,
  getTrackedProductHistory,
  getTrackedProductLogs,
} from "../controllers/trackedProductsController.js";

const router = Router();

router.get("/", listTrackedProducts);
router.post("/", createTrackedProduct);
router.get("/:id/history", getTrackedProductHistory);
router.get("/:id/logs", getTrackedProductLogs);

export default router;
