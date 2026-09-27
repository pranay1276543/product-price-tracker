import { supabase } from "../config/supabaseClient.js";
import { buildProductUrl } from "../scraper/selectorConfig.js";

// GET /api/tracked-products
export async function listTrackedProducts(req, res) {
  const { data, error } = await supabase
    .from("tracked_products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Attach each product's latest price/stock so the dashboard doesn't need a second round trip.
  const withLatestPrice = await Promise.all(
    data.map(async (product) => {
      const { data: latest } = await supabase
        .from("price_history")
        .select("price, stock, timestamp")
        .eq("tracked_product_id", product.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      return { ...product, latestPrice: latest || null };
    })
  );

  res.json({ trackedProducts: withLatestPrice });
}

// POST /api/tracked-products
// body: { productId, productSlug, productName, selectedOption, optionId }
export async function createTrackedProduct(req, res) {
  const { productId, productSlug, productName, selectedOption, optionId } = req.body;

  if (!productId || !productSlug || !productName || !selectedOption || !optionId) {
    return res.status(400).json({
      error: "productId, productSlug, productName, selectedOption and optionId are all required.",
    });
  }

  const { data, error } = await supabase
    .from("tracked_products")
    .insert({
      product_id: String(productId),
      product_slug: productSlug,
      product_name: productName,
      product_url: buildProductUrl(productId),
      selected_option: selectedOption,
      option_id: optionId,
    })
    .select()
    .single();

  if (error) {
    // unique_violation - this product+option is already being tracked
    if (error.code === "23505") {
      return res.status(409).json({ error: "This product and option is already being tracked." });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ trackedProduct: data });
}

// GET /api/tracked-products/:id/history
export async function getTrackedProductHistory(req, res) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("price_history")
    .select("*")
    .eq("tracked_product_id", id)
    .order("timestamp", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ history: data });
}

// GET /api/tracked-products/:id/logs
export async function getTrackedProductLogs(req, res) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("scrape_logs")
    .select("*")
    .eq("tracked_product_id", id)
    .order("timestamp", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: data });
}
