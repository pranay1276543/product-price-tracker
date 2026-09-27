import { runScrapeAll } from "../scraper/runScrapeAll.js";

// POST /api/scrape
// Called by cron-job.org every 2 hours. Protected by a shared secret so random people
// on the internet can't trigger scrapes against our Render instance.
export async function triggerScrape(req, res) {
  const providedSecret = req.header("X-Cron-Secret");

  if (!providedSecret || providedSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Missing or invalid cron secret." });
  }

  // Respond immediately rather than waiting for the scrape to finish. Scraping several
  // products - each with its own retries against a deliberately slow/flaky store - can
  // easily take longer than an external cron service's own request timeout (cron-job.org's
  // free tier times out around 30s). We acknowledge the trigger right away and let the
  // actual scrape keep running in the background; results land in Supabase regardless of
  // whether the caller is still listening for a response.
  res.status(202).json({ message: "Scrape run started." });

  runScrapeAll({ headed: false }).catch((err) => {
    console.error("Scheduled scrape run crashed:", err.message);
  });
}