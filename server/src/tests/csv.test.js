import { test } from "node:test";
import assert from "node:assert/strict";
import { buildScrapeHistoryCsv } from "../utils/csv.js";

test("buildScrapeHistoryCsv includes a header row with the required columns", () => {
  const csv = buildScrapeHistoryCsv([]);
  assert.equal(csv, "product_id,product_name,selected_option,timestamp,price,stock,outcome");
});

test("buildScrapeHistoryCsv formats a successful row correctly", () => {
  const csv = buildScrapeHistoryCsv([
    {
      product_id: "2233",
      product_name: "Halvard Wi-Fi Router Edge",
      selected_option: "2-pack",
      timestamp: "2026-09-25T14:00:00.000Z",
      price: 60000,
      stock: "In Stock",
      outcome: "success",
    },
  ]);
  const rows = csv.split("\n");
  assert.equal(rows[1], "2233,Halvard Wi-Fi Router Edge,2-pack,2026-09-25T14:00:00.000Z,60000,In Stock,success");
});

test("buildScrapeHistoryCsv leaves price and stock empty for failed attempts, but keeps the row", () => {
  const csv = buildScrapeHistoryCsv([
    {
      product_id: "2233",
      product_name: "Halvard Wi-Fi Router Edge",
      selected_option: "2-pack",
      timestamp: "2026-09-25T16:00:00.000Z",
      price: null,
      stock: null,
      outcome: "failed",
    },
  ]);
  const rows = csv.split("\n");
  assert.equal(rows[1], "2233,Halvard Wi-Fi Router Edge,2-pack,2026-09-25T16:00:00.000Z,,,failed");
});
