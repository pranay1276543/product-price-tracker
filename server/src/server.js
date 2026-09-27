import "dotenv/config";
import express from "express";
import cors from "cors";

import productsRoutes from "./routes/products.js";
import trackedProductsRoutes from "./routes/trackedProducts.js";
import scrapeRoutes from "./routes/scrape.js";
import exportRoutes from "./routes/export.js";

const app = express();
const port = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());

app.use(
  cors({
    origin(origin, callback) {
      // allow requests with no origin (curl, server-to-server, cron-job.org) and configured origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      }
    },
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/products", productsRoutes);
app.use("/api/tracked-products", trackedProductsRoutes);
app.use("/api/scrape", scrapeRoutes);
app.use("/api/export", exportRoutes);

// Basic error handler so unexpected errors return JSON instead of crashing the response.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(port, () => {
  console.log(`Product Price Tracker API listening on port ${port}`);
});
