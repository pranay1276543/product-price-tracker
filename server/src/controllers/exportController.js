import { supabase } from "../config/supabaseClient.js";
import { buildScrapeHistoryCsv } from "../utils/csv.js";

// GET /api/export
export async function exportScrapeHistoryCsv(req, res) {
  // Join scrape_logs with tracked_products so each row has the product's id/name/option,
  // not just the tracked_product_id foreign key.
  const { data, error } = await supabase
    .from("scrape_logs")
    .select(
      `
      timestamp,
      outcome,
      price,
      stock,
      tracked_products ( product_id, product_name, selected_option )
    `
    )
    .order("timestamp", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const rows = data.map((row) => ({
    product_id: row.tracked_products.product_id,
    product_name: row.tracked_products.product_name,
    selected_option: row.tracked_products.selected_option,
    timestamp: row.timestamp,
    price: row.price,
    stock: row.stock,
    outcome: row.outcome,
  }));

  const csv = buildScrapeHistoryCsv(rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=scrape_history.csv");
  res.send(csv);
}
