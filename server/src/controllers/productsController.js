import { STORE_BASE_URL } from "../scraper/selectorConfig.js";
import { searchProducts } from "../scraper/catalogCache.js";
import { buildProductUrl } from "../scraper/selectorConfig.js";

// GET /api/products/search?q=phone
export async function searchProductsHandler(req, res) {
  const query = req.query.q || "";

  try {
    const results = await searchProducts(query);
    res.json({ results });
  } catch (err) {
    console.error("Product search failed:", err.message);
    res.status(502).json({ error: "Could not search the store right now. Please try again." });
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET /api/products/:id  -> product detail including its options, straight from the store
export async function getProductDetailHandler(req, res) {
  const { id } = req.params;

  let lastError = null;

  // The mock store is deliberately flaky (it can return occasional errors), so a single
  // fetch attempt isn't reliable enough even for reading basic product detail. Two tries
  // with a short pause is enough to ride out a one-off blip without making the user wait long.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const url = `${STORE_BASE_URL}/api/v2/items/${id}`;
      console.log(`Fetching product detail: ${url} (attempt ${attempt})`);
      const response = await fetch(url);
      if (response.status === 404) {
        return res.status(404).json({ error: "Product not found on the store." });
      }
      if (!response.ok) {
        lastError = `store returned status ${response.status}`;
        await wait(500);
        continue;
      }
      const product = await response.json();
      return res.json({
        ...product,
        productUrl: buildProductUrl(product.id),
      });
    } catch (err) {
      lastError = err.message;
      await wait(500);
    }
  }

  console.error("Product detail fetch failed after retry:", lastError);
  res.status(502).json({ error: `Could not reach the store right now (${lastError}). Please try again.` });
}