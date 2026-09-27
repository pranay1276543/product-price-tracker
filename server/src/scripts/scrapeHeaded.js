/**
 * Runs the exact same scraper used in production, but with a visible browser window,
 * so its behaviour (including retries and failures) can be watched and recorded.
 *
 * Usage: npm run scrape:headed
 *
 * This reuses runScrapeAll() - the real scraping logic - rather than a separate fake
 * "demo" implementation, so what you record is what actually runs on schedule.
 */
import "dotenv/config";
import { runScrapeAll } from "../scraper/runScrapeAll.js";

const summary = await runScrapeAll({ headed: true });

console.log("\n--- Headed scrape run summary ---");
console.log(`Total: ${summary.total}, Succeeded: ${summary.succeeded}, Failed: ${summary.failed}`);
for (const result of summary.results) {
  console.log(`  ${result.success ? "OK  " : "FAIL"} - ${result.productName}`);
}
