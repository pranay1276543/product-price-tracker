import { API, SELECTORS, buildProductUrl } from "./selectorConfig.js";
import { parsePriceText } from "./priceParsing.js";

const OFFER_RESOLUTION_TIMEOUT_MS = 30_000; // the store itself can take ~6 internal attempts to resolve
const PAGE_NAV_TIMEOUT_MS = 20_000;

/**
 * Fetches the manifest that maps semantic field names to the store's current (rotating)
 * CSS class names. We fetch this fresh on every scrape rather than hardcoding class names,
 * since the whole point of the manifest is that the classes change.
 */
async function fetchManifest(page) {
  const response = await page.request.get(API.manifest);
  if (!response.ok()) {
    throw new Error(`manifest request failed with status ${response.status()}`);
  }
  const manifest = await response.json();
  return manifest.classes;
}

/**
 * Clicks the option chip matching the tracked option's label, if it isn't already selected.
 *
 * Returns one of:
 *  - { found: true, disabled: false }  - option exists and is now selected
 *  - { found: true, disabled: true }   - option exists but is disabled/unavailable right now
 *    (some products show greyed-out variants, e.g. an edition that's out of stock)
 *  - { found: false }                  - the label doesn't exist on the page at all
 *    (e.g. the store renamed its options)
 */
async function selectOption(page, optionLabel) {
  const chips = page.locator(`${SELECTORS.optionPicker} ${SELECTORS.optionChip}`);
  const count = await chips.count();

  for (let i = 0; i < count; i++) {
    const chip = chips.nth(i);
    const text = (await chip.innerText()).trim();
    if (text.toLowerCase() === optionLabel.trim().toLowerCase()) {
      const isDisabled = await chip.isDisabled();
      if (isDisabled) {
        return { found: true, disabled: true };
      }
      const isSelected = (await chip.getAttribute(SELECTORS.optionChipSelectedAttr)) === "true";
      if (!isSelected) {
        await chip.click({ force: true });
      }
      return { found: true, disabled: false };
    }
  }
  return { found: false };
}

/**
 * Waits until the offer panel either resolves (offer-ready) or gives up (shows the
 * "Couldn't load the price after N attempts" message). Both are terminal states from the
 * store's own internal retry loop - we don't try to detect every intermediate "Retrying..."
 * state, we just wait for one of the two outcomes.
 */
async function waitForOfferResolution(page) {
  const panel = page.locator(SELECTORS.offerPanel).first();

  try {
    await page.waitForFunction(
      ({ panelSelector, readyClass, giveUpText }) => {
        const el = document.querySelector(panelSelector);
        if (!el) return false;
        if (el.classList.contains(readyClass)) return true;
        if (el.textContent && el.textContent.includes(giveUpText)) return true;
        return false;
      },
      {
        panelSelector: SELECTORS.offerPanel,
        readyClass: SELECTORS.offerReadyClass,
        giveUpText: SELECTORS.giveUpText,
      },
      { timeout: OFFER_RESOLUTION_TIMEOUT_MS }
    );
  } catch {
    return { resolved: false, reason: "timed out waiting for price panel to resolve" };
  }

  const panelClass = (await panel.getAttribute("class")) || "";
  if (panelClass.includes(SELECTORS.offerReadyClass)) {
    return { resolved: true };
  }

  const panelText = await panel.innerText();
  return { resolved: false, reason: panelText.trim() || "store gave up loading the price" };
}

async function extractPriceAndStock(page, manifestClasses) {
  const priceLocator = page.locator(`${SELECTORS.offerRow} .${manifestClasses.priceValue}`).first();
  const stockLocator = page.locator(`${SELECTORS.offerFacts} .${manifestClasses.stock}`).first();

  const priceText = await priceLocator.innerText().catch(() => null);
  const stockText = await stockLocator.innerText().catch(() => null);

  const price = parsePriceText(priceText);
  const stock = stockText ? stockText.trim() : null;

  return { price, stock };
}

/**
 * A cookie-consent banner appears on first load and overlays the page, blocking clicks/hovers
 * on the price panel underneath it. Since every scrape attempt uses a fresh browser context
 * (no stored consent from a previous run), this banner appears every single time, not just
 * once - so we always check for it right after navigating, before touching anything else.
 */
async function dismissCookieBanner(page) {
  // This store has a habit of rendering decoy duplicates of things (hidden price spans,
  // fake stock values) - it's entirely plausible there's a second, non-visible "Allow"
  // button in the DOM. `:visible` makes sure we only ever click the one actually on screen.
  const allowButton = page.locator("button:has-text('Allow'):visible").first();
  try {
    await allowButton.waitFor({ state: "visible", timeout: 6000 });
    await allowButton.click({ force: true, timeout: 5000 });

    // Confirm the visible dialog itself disappeared...
    await allowButton.waitFor({ state: "hidden", timeout: 3000 });

    // ...but a separate, invisible backdrop layer survives the dialog closing and keeps
    // intercepting every click/hover across the whole page (confirmed via Playwright's own
    // "<div class="consent-scrim">...</div> intercepts pointer events" error on later clicks).
    // Removing it directly is more reliable than trying to click through it.
    await page.evaluate(() => {
      const scrim = document.querySelector(".consent-scrim");
      if (scrim) scrim.remove();
    });

    console.log("  Cookie banner dismissed.");
  } catch (err) {
    console.log(`  No cookie banner dismissed (${err.message.split("\n")[0]}).`);
  }
}

/**
 * Actively triggers the price load, the way a real user does: hover over the price panel,
 * then click "Check today's price" (or "Check again"/"Retry" if that's what's showing)
 * if such a button exists and is enabled. Some products resolve automatically without
 * this - in that case there's simply no matching button to click, which is fine.
 */
async function triggerPriceLoad(page) {
  const panel = page.locator(SELECTORS.offerPanel).first();
  const button = page.locator(SELECTORS.checkPriceButton).first();
  if ((await button.count()) === 0) return; // no such button on this product - fine

  for (let attempt = 1; attempt <= 3; attempt++) {
    await dismissCookieBanner(page);

    // Key fact: the button starts out with a real HTML `disabled` attribute, and browsers
    // never deliver hover/click events to a disabled element - no automation trick changes
    // that. The panel's own hint text ("Hover over the price area...") tells us the enable
    // logic must be listening on the surrounding panel instead, so we hover THAT - a normal,
    // enabled element - and let it flip the button's disabled state before we ever touch it.
    const panelBox = await panel.boundingBox();
    if (!panelBox) return;

    const panelCenterX = panelBox.x + panelBox.width / 2;
    const panelCenterY = panelBox.y + panelBox.height / 2;
    await page.mouse.move(panelBox.x + 10, panelBox.y + 10);
    await page.mouse.move(panelCenterX, panelCenterY, { steps: 20 });
    await wait(700);

    const stillDisabled = (await button.getAttribute("disabled")) !== null;
    console.log(`  Debug: button disabled after hovering panel = ${stillDisabled}`);

    if (!stillDisabled) {
      const box = await button.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      return;
    }

    await wait(1000);
  }
}

/**
 * Scrapes a single tracked product + option. Retries the whole page load up to maxAttempts
 * times if something goes wrong (page fails to load, option not found, price never resolves).
 * Never returns a fabricated price/stock - on failure, price and stock are both null.
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapeProduct(browser, trackedProduct, { maxAttempts = 3 } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Simple linear backoff before retrying (not before the first attempt). The store's
    // /quote and /handshake endpoints can themselves return 429 rate_limited - giving
    // them a few seconds of breathing room between our own outer retries is friendlier
    // than immediately hammering a page that just told us to slow down.
    if (attempt > 1) {
      await wait(2000 * (attempt - 1));
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(PAGE_NAV_TIMEOUT_MS);

    // Track the store's own quote-endpoint failures so a real error message ends up in our logs.
    let lastQuoteFailure = null;
    page.on("response", (response) => {
      if (response.url().includes("/quote") && !response.ok()) {
        lastQuoteFailure = `store quote endpoint returned ${response.status()}`;
      }
    });

    try {
      const url = buildProductUrl(trackedProduct.product_id);
      await page.goto(url, { waitUntil: "load" });

      await dismissCookieBanner(page);

      const manifestClasses = await fetchManifest(page);

      const optionResult = await selectOption(page, trackedProduct.selected_option);
      if (!optionResult.found) {
        lastError = `option "${trackedProduct.selected_option}" was not found on the product page`;
        continue;
      }
      if (optionResult.disabled) {
        // Not a bug and not worth retrying immediately - the option is genuinely
        // unavailable right now. Record it plainly and let the next scheduled run
        // (2 hours later) check again, rather than burning all our retries on it.
        lastError = `option "${trackedProduct.selected_option}" is currently disabled/unavailable on the store`;
        break;
      }

      await triggerPriceLoad(page);

      const resolution = await waitForOfferResolution(page);
      if (!resolution.resolved) {
        lastError = lastQuoteFailure || resolution.reason;
        continue;
      }

      const { price, stock } = await extractPriceAndStock(page, manifestClasses);
      if (price === null || !stock) {
        lastError = "price or stock could not be read from the resolved page";
        continue;
      }

      return { success: true, price, stock, attempts: attempt, errorMessage: null };
    } catch (err) {
      lastError = err.message;
    } finally {
      await context.close();
    }
  }

  return { success: false, price: null, stock: null, attempts: maxAttempts, errorMessage: lastError };
}