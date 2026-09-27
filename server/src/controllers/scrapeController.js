import { runScrapeAll } from "../scraper/runScrapeAll.js";

// POST /api/scrape
// Called by cron-job.org every 2 hours. Protected by a shared secret so random people
// on the internet can't trigger scrapes against our Render instance.
export async function triggerScrape(req, res) {
  const providedSecret = req.header("X-Cron-Secret");

  if (!providedSecret || providedSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Missing or invalid cron secret." });
  }

  try {
    const summary = await runScrapeAll({ headed: false });
    res.json({ message: "Scrape run complete.", summary });
  } catch (err) {
    console.error("Scheduled scrape run crashed:", err.message);
    res.status(500).json({ error: "Scrape run failed to complete.", details: err.message });
  }
}
