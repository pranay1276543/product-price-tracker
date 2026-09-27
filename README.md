# Product Price Tracker

A small full-stack app that searches INE's mock store (`https://demo.inelabteamdev.com`),
lets you track a specific product + option, and scrapes its price and stock every 2 hours -
storing an honest history of every scrape attempt, success or failure.

Built for the INE Software Engineer Intern assignment.

## Features

- Search the mock store by partial or full product name
- Pick a product **and** a specific option (e.g. "2-pack", "16GB") to track
- Scheduled scraping every 2 hours via an external cron trigger (no always-on process)
- Price and stock history per tracked product (chart + table)
- Per-product scrape log showing every attempt, including failures, with the real error
- CSV export of the full scrape history (ISO 8601 UTC timestamps, failed rows included)
- Headed scraper mode for recording a demo of retries/failures in a visible browser
- Never stores a fabricated price or stock value - a failed scrape leaves them empty

## Architecture

```
Browser (React/Vite/Tailwind, on Vercel)
        │  REST calls
        ▼
Express API (on Render)
   ├── /api/products/search   → searches a cached copy of the store's catalog
   ├── /api/tracked-products  → CRUD for tracked product+option pairs (Supabase)
   └── /api/scrape (POST)     → runs the scraper for all active tracked products
                                  (called every 2 hours by cron-job.org, protected by
                                   a shared secret header)
        │
        ▼
Playwright scraper → loads the real product page in a headless browser, selects the
                      option, waits for the store's own price panel to resolve, reads
                      price/stock from the DOM, and writes results to Supabase.
        │
        ▼
Supabase (PostgreSQL): tracked_products, price_history, scrape_logs
```

See `DESIGN_NOTE.md` for the reasoning behind these choices, especially why the scraper
uses Playwright rather than plain HTTP fetching.

## Technology Stack

- **Frontend:** React + Vite + Tailwind CSS, deployed on Vercel
- **Backend:** Node.js + Express, deployed on Render
- **Database:** Supabase (PostgreSQL)
- **Scraping:** Playwright (headless Chromium)
- **Scheduling:** cron-job.org calling a secret-protected `POST /api/scrape` endpoint

## Folder Structure

```
product-price-tracker/
├── client/                 React + Vite + Tailwind frontend
│   └── src/
│       ├── components/     small, reusable UI pieces
│       ├── pages/          Dashboard, ProductDetails
│       └── services/api.js the one place that talks to the backend
├── server/                 Express backend
│   └── src/
│       ├── routes/         thin route definitions
│       ├── controllers/    one function per endpoint
│       ├── scraper/        the scraping logic (the core of the assignment)
│       ├── scripts/        scrape:headed entry point
│       ├── config/         Supabase client
│       ├── utils/          CSV building
│       └── tests/          unit tests (node:test)
├── database/schema.sql     the full SQL schema
├── README.md               this file
└── DESIGN_NOTE.md          the "why", trade-offs, and AI usage disclosure
```

## Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com) (free tier).
2. Open the SQL editor and run the contents of `database/schema.sql`.
3. From **Project Settings → API**, copy the **Project URL** and the **service_role key**
   (not the anon key - the backend needs the service role key to bypass RLS).

## Environment Variables

**server/.env** (copy from `server/.env.example`):

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only, never expose to the frontend) |
| `PORT` | Local port for the Express server (Render sets its own in production) |
| `STORE_BASE_URL` | The mock store URL - do not change |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |
| `CRON_SECRET` | Shared secret cron-job.org must send to trigger a scrape |
| `SCRAPE_MAX_ATTEMPTS` | How many full page-load retries the scraper does per product |
| `SCRAPE_HEADED` | Unused by the server directly; the headed script always forces headed mode |

**client/.env** (copy from `client/.env.example`):

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | URL of the backend API, e.g. `http://localhost:4000/api` |

## Local Installation

```bash
git clone <your-repo-url>
cd product-price-tracker

# Backend
cd server
npm install
cp .env.example .env   # fill in your Supabase details and a CRON_SECRET
npx playwright install chromium
npm run dev             # http://localhost:4000

# Frontend (in a new terminal)
cd client
npm install
cp .env.example .env
npm run dev              # http://localhost:5173
```

## Running the Scraper

- **Ad-hoc / manual scrape (headless):**
  ```bash
  curl -X POST http://localhost:4000/api/scrape -H "X-Cron-Secret: <your CRON_SECRET>"
  ```
- **Headed demo mode** (visible browser, for recording):
  ```bash
  cd server
  npm run scrape:headed
  ```

## Manual Testing Checklist

1. Start both servers, add a product via search on the dashboard.
2. Run `npm run scrape:headed` and watch it load the page, select the option, and resolve
   (or retry/fail) the price panel.
3. Refresh the dashboard - price/stock should now be populated.
4. Open "History & Logs" - confirm the price history chart/table and the scrape log both show
   the run you just did.
5. Click "Export CSV" - confirm the downloaded file has one row for that scrape with the
   correct product id, option, and an ISO 8601 UTC timestamp.
6. Run `npm test` inside `server/` - all unit tests should pass.

## cron-job.org Setup (2-hour schedule)

1. Deploy the backend to Render first (below) and note its URL.
2. Create a free account at [cron-job.org](https://cron-job.org).
3. Create a new cron job:
   - **URL:** `https://<your-render-app>.onrender.com/api/scrape`
   - **Method:** `POST`
   - **Schedule:** every 2 hours
   - **Headers:** add `X-Cron-Secret: <the same value as CRON_SECRET on Render>`
4. Save and trigger it once manually to confirm it returns `200` with a summary JSON body.

## Deployment

### Backend → Render

1. New **Web Service**, connect the GitHub repo, root directory `server`.
2. Build command: `npm install && npx playwright install --with-deps chromium`
3. Start command: `npm start`
4. Add all the environment variables from `server/.env.example` (with real values).
5. Set `CORS_ALLOWED_ORIGINS` to your Vercel URL once you have it (step below).

### Frontend → Vercel

1. New Project, import the repo, root directory `client`.
2. Framework preset: Vite. Build command `npm run build`, output `dist`.
3. Add `VITE_API_BASE_URL` = `https://<your-render-app>.onrender.com/api`.
4. Deploy, then go back to Render and update `CORS_ALLOWED_ORIGINS` with this Vercel URL.

### Database → Supabase

Already created above; no separate deploy step. Just make sure Render has the same
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.

### Scheduler → cron-job.org

See the section above.

## Error & Retry Strategy (summary)

The scraper retries the full page load up to `SCRAPE_MAX_ATTEMPTS` times (default 3) if
the option can't be found, the price panel never resolves, or price/stock can't be read.
Within a single page load, the store's own frontend already retries its flaky `/quote`
endpoint internally (observed up to 6 times) - we wait for that to finish rather than
racing it. If every attempt fails, the scrape is logged as `failed` with the real error
message and **no** price/stock row is written. One product failing never stops the rest
of the batch (see `runScrapeAll.js`). Full reasoning in `DESIGN_NOTE.md`.

## Known Limitations

- The exact product-detail page URL pattern was inferred from the store's slug field and
  should be double-checked against the live site before final submission (see the `TODO`
  comment in `server/src/scraper/selectorConfig.js`).
- Search is done by fetching and caching the store's full catalog (960 products) rather
  than relying on a `?q=` parameter that wasn't confirmed to exist on `/api/v2/listings`.
- No automated end-to-end browser test of the full scrape flow against the live store is
  included - only unit tests for the pure logic (price parsing, CSV building). Given how
  flaky the store deliberately is, an e2e test would be flaky itself; the headed mode is
  the intended way to verify the real flow.

## AI Usage Disclosure

See `DESIGN_NOTE.md` for the full, honest account of how AI tools were used on this
project and what had to be corrected.
