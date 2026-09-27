import { API, STORE_BASE_URL } from "./selectorConfig.js";

/**
 * The store's /api/v2/listings endpoint is paginated (20 items/page, 48 pages, 960 products
 * total) and we didn't find a documented `?q=` search parameter while inspecting the site.
 * Rather than guess at an undocumented parameter, we fetch the whole catalog once, cache it
 * in memory, and search it locally with a simple substring match. 960 small product records
 * is a trivial amount of memory, and the catalog doesn't change often enough to justify
 * anything fancier than a periodic refresh.
 */
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cachedProducts = null;
let cachedAt = 0;

async function fetchAllListings() {
  const firstPageUrl = new URL(`${STORE_BASE_URL}/api/v2/listings`);
  firstPageUrl.searchParams.set("page", "1");
  firstPageUrl.searchParams.set("limit", "20");

  const firstResponse = await fetch(API.listings(firstPageUrl.searchParams));
  if (!firstResponse.ok) {
    throw new Error(`store listings request failed with status ${firstResponse.status}`);
  }
  const firstPage = await firstResponse.json();

  const allResults = [...firstPage.results];
  const totalPages = firstPage.totalPages || 1;

  for (let page = 2; page <= totalPages; page++) {
    const url = new URL(`${STORE_BASE_URL}/api/v2/listings`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", "20");

    const response = await fetch(API.listings(url.searchParams));
    if (!response.ok) continue; // one flaky page shouldn't break the whole catalog fetch
    const body = await response.json();
    allResults.push(...body.results);
  }

  return allResults;
}

async function getCatalog() {
  const isStale = !cachedProducts || Date.now() - cachedAt > CACHE_TTL_MS;
  if (isStale) {
    cachedProducts = await fetchAllListings();
    cachedAt = Date.now();
  }
  return cachedProducts;
}

export async function searchProducts(query) {
  const catalog = await getCatalog();
  if (!query) return catalog.slice(0, 20);

  const needle = query.trim().toLowerCase();
  return catalog.filter((product) => product.name.toLowerCase().includes(needle));
}

export async function getProductById(id) {
  const catalog = await getCatalog();
  return catalog.find((product) => String(product.id) === String(id)) || null;
}
