import { supabase } from "../config/supabaseClient.js";
import { launchBrowser } from "./browser.js";
import { scrapeProduct } from "./scrapeProduct.js";

const MAX_ATTEMPTS = Number(process.env.SCRAPE_MAX_ATTEMPTS || 3);

async function getActiveTrackedProducts() {
  const { data, error } = await supabase
    .from("tracked_products")
    .select("*")
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function saveSuccessfulScrape(trackedProduct, result) {
  const { error: priceError } = await supabase.from("price_history").insert({
    tracked_product_id: trackedProduct.id,
    price: result.price,
    stock: result.stock,
  });
  if (priceError) throw new Error(priceError.message);

  const { error: logError } = await supabase.from("scrape_logs").insert({
    tracked_product_id: trackedProduct.id,
    outcome: result.attempts > 1 ? "retried" : "success",
    price: result.price,
    stock: result.stock,
    attempts: result.attempts,
    error_message: null,
  });
  if (logError) throw new Error(logError.message);
}

async function saveFailedScrape(trackedProduct, result) {
  // Never write price/stock on failure - leave them null, per the assignment's data
  // validation requirement. Only the honest failure log gets a row.
  const { error } = await supabase.from("scrape_logs").insert({
    tracked_product_id: trackedProduct.id,
    outcome: "failed",
    price: null,
    stock: null,
    attempts: result.attempts,
    error_message: result.errorMessage,
  });
  if (error) throw new Error(error.message);
}

/**
 * Scrapes every active tracked product, one at a time. If one product fails, we log the
 * failure and move on to the next - a single bad product must never stop the whole run.
 * Returns a small summary so the caller (the /api/scrape route) can report what happened.
 */
export async function runScrapeAll({ headed = false } = {}) {
  const trackedProducts = await getActiveTrackedProducts();
  const browser = await launchBrowser(headed);

  const summary = { total: trackedProducts.length, succeeded: 0, failed: 0, results: [] };

  try {
    for (const trackedProduct of trackedProducts) {
      console.log(`Starting scrape for "${trackedProduct.product_name}" (${trackedProduct.selected_option})...`);

      let result;
      try {
        result = await scrapeProduct(browser, trackedProduct, { maxAttempts: MAX_ATTEMPTS });
      } catch (err) {
        // Defensive: scrapeProduct shouldn't throw, but if the browser itself dies mid-run,
        // record it as a failure for this product and keep going rather than crashing the batch.
        result = { success: false, price: null, stock: null, attempts: MAX_ATTEMPTS, errorMessage: err.message };
      }

      if (result.success) {
        console.log(`  Success: price ${result.price}, stock "${result.stock}" (attempt ${result.attempts})`);
        await saveSuccessfulScrape(trackedProduct, result);
        summary.succeeded++;
      } else {
        console.log(`  Failed after ${result.attempts} attempt(s): ${result.errorMessage}`);
        await saveFailedScrape(trackedProduct, result);
        summary.failed++;
      }

      summary.results.push({
        trackedProductId: trackedProduct.id,
        productName: trackedProduct.product_name,
        success: result.success,
      });
    }
  } finally {
    await browser.close();
  }

  return summary;
}
