import { Router } from "express";
import { searchProductsHandler, getProductDetailHandler } from "../controllers/productsController.js";

const router = Router();

router.get("/search", searchProductsHandler);
router.get("/:id", getProductDetailHandler);

export default router;
