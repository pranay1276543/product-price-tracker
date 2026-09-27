# Design Note

## Overall architecture

React talks to an Express API, which is the only thing that talks to Supabase and to the
mock store. The scraper is a separate module (`server/src/scraper/`) that Express calls
either from a manual test or from the `/api/scrape` endpoint that cron-job.org hits every
2 hours. Keeping the scraper as plain functions (not tied to Express req/res) means the
exact same code runs headless in production and headed for the demo recording
(`npm run scrape:headed`) - there's no separate "fake demo" implementation to keep in sync.

## Why React

Required by the assignment brief, and it's what I'm most comfortable explaining live.

## Why Node/Express

Same reasoning - simple, minimal-ceremony routing, and it's the natural fit for running
Playwright (a Node library) inside the same process that also serves the API.

## Scraping strategy, and why Playwright (not plain HTTP fetching)

I inspected the live store's network traffic before writing any scraper code (see the
class-mapping "manifest" and the `/quote` endpoint referenced in `selectorConfig.js`).
Two things ruled out plain `axios + cheerio`:

1. **The product listing/detail JSON never contains price or stock at all.** They only
   appear in the DOM after the page's own client-side JS runs.
2. **Getting the real price requires solving a proof-of-work challenge** (`/api/v2/handshake`,
   which returns a WASM blob and can itself return `429 rate_limited`) before the
   `/quote` endpoint will respond. Reimplementing that challenge by hand in Node would mean
   reverse-engineering an obfuscated WASM module - fragile, easy to break silently when the
   store changes it, and exactly the kind of "obscure trick" I was asked to avoid.

So the scraper drives a real headless Chromium browser via Playwright: it lets the store's
own JavaScript solve its own challenge, waits for the price panel to reach a resolved state,
and reads the result from the DOM. This is the assignment's "use Playwright only when the
page genuinely requires it" case, not a default reached for out of convenience.

### How price is actually extracted

The store also renders several decoy price-looking values in the DOM (a hidden
`.price-value` span, a "Member price" figure, a hidden `[data-price]` amount) alongside the
real one. Rather than guess which is real from styling, the scraper fetches
`/api/v2/manifest` on every run, which maps semantic names (`priceValue`, `stock`, ...) to
the store's current (rotating) CSS class names, and reads only the element with the
`priceValue` class. The real price's digits are also rendered as individual full-width
unicode characters (`３１，９７０`); `priceParsing.js` normalizes these back to ASCII before
parsing the number.

### How the product ID and options are handled

- The store's numeric `id` (from `/api/v2/listings`) is stored as-is as `product_id` - never
  a generated ID of our own.
- Options come from the product detail endpoint's `options: [{id, label}]` array. The user
  picks a label in the UI; we store both the label (for display) and the store's own option
  `id` (used to build the eventual quote request/selection on the page).

## Retry strategy

Two retry layers, deliberately kept separate rather than merged into one "clever" loop:

1. **Inside a single page load**, the store's own frontend retries its flaky `/quote` call
   internally (observed up to 6 attempts with backoff). The scraper just waits for that to
   finish - it doesn't try to out-guess the store's internal timing.
2. **Around the whole page load**, `scrapeProduct.js` retries up to `SCRAPE_MAX_ATTEMPTS`
   (default 3) full attempts if the page fails to load, the option isn't found, or the price
   panel never resolves in time. Three was chosen because the store's own UI already retries
   internally up to 6 times per page load - re-doing the whole page load 3 more times on top
   of that gives real resilience against transient page/network issues without hammering the
   store for many minutes on a single product during a scheduled run.

## Data validation ("never store fake data")

`scrapeProduct.js` only returns `success: true` if it got both a valid, positive parsed
price **and** non-empty stock text. Any other outcome - timeout, missing option, unparsable
price - is treated as a failure. `runScrapeAll.js` writes to `price_history` only on
success; on failure it writes only to `scrape_logs`, with `price`/`stock` left `null`.
There is no code path that writes a `0` price or a placeholder stock value.

## How failures are logged

Every attempt (success or failure) gets one row in `scrape_logs`, with the outcome
(`success` / `retried` / `failed`), attempt count, and - for failures - the real error
message captured from either a thrown exception or an observed non-2xx response from the
store's own `/quote` endpoint (captured via `page.on("response")`), not a generic string.

## Scheduling strategy, and why cron-job.org

Render's free tier sleeps an idle instance, so a `setInterval` inside the Node process
would silently stop running once the instance went to sleep - it might never fire at all,
or might fire on an unpredictable schedule after cold starts. An external cron service
sends an HTTP request on a real wall-clock schedule regardless of whether the instance is
currently warm; Render will spin up to serve the request either way. `POST /api/scrape` is
protected by a `X-Cron-Secret` header check so it can't be triggered by anyone else who
finds the URL.

## Free-tier deployment considerations

- Render free web services sleep after inactivity; the first scrape request after a sleep
  will be slow (cold start) but will still complete and get logged normally.
- Playwright needs its browser binaries installed at build time on Render
  (`npx playwright install --with-deps chromium` in the build command) - it does not ship
  with the `playwright` npm package by default.
- Supabase's free tier is plenty for this data volume (a handful of products scraped every
  2 hours produces a small number of rows per day).

## Database design

Three tables, described in full in `database/schema.sql`: `tracked_products` (one row per
product+option being tracked), `price_history` (one row per *successful* scrape),
`scrape_logs` (one row per *attempt*, success or failure). Splitting history from logs
keeps the price chart free of failed-attempt noise while still keeping a complete, honest
record of every attempt for the log view and CSV export.

## Trade-offs

- Search fetches and caches the store's entire catalog (960 products) rather than relying
  on a `?q=` search parameter that wasn't confirmed to exist - simpler and more explainable,
  at the cost of a periodic full-catalog refetch instead of a targeted query.
- The outer retry count (3) and the internal wait timeout (30s) are fixed constants rather
  than configurable per-product, to keep the retry logic easy to reason about, per the
  assignment's request to avoid "an unnecessarily complicated retry library."

## How page changes are handled

The one thing genuinely tied to the store's exact structure - CSS selectors and the product
URL pattern - is isolated in a single file, `selectorConfig.js`, with the reasoning for each
selector documented inline. If the store changes its markup, that's the only file that
should need editing.

## How incorrect data is prevented

Covered above under "Data validation" - the short version is that the scraper has exactly
one success path (valid price + valid stock) and everything else is a logged failure.

---

## AI Usage Disclosure

I used Claude (Anthropic) to help design and write this project, working iteratively
through the actual assignment rather than generating it from the brief alone:

- I gave Claude the assignment PDF and my own "master prompt" describing the code style
  I wanted (simple, human-written, no over-engineering).
- Claude could not execute JavaScript against the live mock store from its own sandboxed
  environment (no browser binary available, and its web-fetch tool wouldn't hit unlisted
  API routes), so it was upfront about that limitation instead of inventing selectors. I
  then did the actual inspection myself in Chrome DevTools (Elements + Network tabs) and
  fed back real HTML, real API responses (including the `/manifest` and `/quote` payloads,
  the handshake/proof-of-work behaviour, and the observed 429/503 failure modes), which
  Claude used to write the real scraper logic instead of guessing at the site's structure.
- Claude wrote the initial project scaffold (schema, Express routes/controllers, the
  Playwright scraper, the React frontend, this document) based on that real inspection data.

**What still needs to be verified/corrected by me before submission (placeholders, not
fabricated):**

- [ ] `TODO in server/src/scraper/selectorConfig.js`: confirm the exact product detail page
  URL pattern against the live site's address bar and update `buildProductUrl()` if needed.
- [ ] Confirm the option-selection trigger for loading the price (hover vs. automatic vs.
  click) matches what `waitForOfferResolution()`/`selectOption()` assume, by watching a
  `npm run scrape:headed` run against a couple of different products.
- [ ] `<Describe here what broke the first time you actually ran `scrape:headed` against
  the live store, and what you changed to fix it - e.g. a selector that didn't match, a
  timeout that was too short, a stock format you hadn't seen before.>`
- [ ] `<Describe any other correction you made after testing against real, live data - the
  assignment specifically asks for this, and it should reflect what actually happened when
  you ran this, not what I predicted might happen.>`
