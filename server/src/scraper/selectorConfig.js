/**
 * All of the mock store's site-specific knowledge lives in this one file.
 *
 * Why: the assignment explicitly warns the store's HTML can change, and asks us not to
 * depend on fragile selectors. We can't stop the store's classes from being randomised
 * (see below), but we CAN make sure that if something changes, there is exactly one file
 * to look at and fix, instead of selectors scattered across the scraper.
 *
 * What we found inspecting https://demo.inelabteamdev.com (see DESIGN_NOTE.md for the
 * full write-up):
 *
 * - GET  {STORE_BASE_URL}/api/v2/listings?page=&limit=&q=   -> product search / listing
 * - GET  {STORE_BASE_URL}/api/v2/items/:id                   -> product detail (name, specs,
 *   options), but NOT price or stock
 * - GET  {STORE_BASE_URL}/api/v2/ui/manifest                 -> maps semantic field names
 *   (priceValue, stock, mrp, ...) to the CSS class names currently in use on the page. The
 *   store rotates these class names, so we always read this fresh instead of hardcoding them.
 * - The real price/stock only appear in the DOM after the page's own JS solves a
 *   proof-of-work challenge (GET/POST {STORE_BASE_URL}/api/v2/handshake) and fetches
 *   GET {STORE_BASE_URL}/api/v2/items/:id/quote?opt=:optionId. This endpoint is
 *   deliberately flaky (occasional 503 / 429) and the challenge is solved with a WASM
 *   blob we deliberately do NOT try to reimplement - we let a real headless browser run
 *   the page's own code, which is the correct use of Playwright here rather than a
 *   default choice. See DESIGN_NOTE.md, "Why Playwright".
 * - The panel also renders several decoy price-looking values (a hidden `.price-value`
 *   span, a "Member price" figure, a hidden `[data-price]` amount). These are NOT the
 *   real price. The real price is the manifest's "priceValue" class, and its digits are
 *   rendered as individual full-width unicode characters (e.g. "３１，９７０"), which we
 *   normalise back to plain digits in priceParsing.js.
 */

export const STORE_BASE_URL = process.env.STORE_BASE_URL || "https://demo.inelabteamdev.com";

export const API = {
  listings: (params) => `${STORE_BASE_URL}/api/v2/listings?${params.toString()}`,
  manifest: `${STORE_BASE_URL}/api/v2/ui/manifest`,
};

// Confirmed via browser address bar: product pages are at /item/{id}, using the store's
// numeric id - NOT /product/{slug} as originally guessed, and not the slug at all.
export function buildProductUrl(productId) {
  return `${STORE_BASE_URL}/item/${productId}`;
}

export const SELECTORS = {
  // Option picker: a row of buttons, the selected one has aria-pressed="true"
  optionPicker: ".opt-picker",
  optionChip: ".opt-chip",
  optionChipSelectedAttr: "aria-pressed",

  // The price/stock panel has two states, toggled by class name:
  //   "offer-locked" - price not loaded yet ("Price locked...")
  //   "offer-ready"  - price loaded, real values are readable
  // and a give-up state after SCRAPE_MAX internal attempts ("Couldn't load the price...").
  offerPanel: ".offer-panel",
  offerReadyClass: "offer-ready",
  offerLockedClass: "offer-locked",
  offerRow: ".offer-row",
  offerFacts: ".offer-facts",
  // Structural, not text-based: there is exactly one VISIBLE action button inside the offer
  // panel at any given time ("Check today's price", "Check again", or "Retry"). Matching on
  // exact wording was fragile (this store's real apostrophe character didn't match a plain
  // ASCII one). :visible guards against a possible hidden decoy button also matching this
  // same structural selector - the same pattern we found with the cookie banner's "Allow" button.
  checkPriceButton: ".offer-panel button:visible",
  giveUpText: "Couldn't load the price",
};