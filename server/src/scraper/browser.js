import { chromium } from "playwright";

/**
 * Launches a Playwright browser.
 *
 * headed=true opens a visible Chrome window - used only for the demo recording.
 * The normal server and scheduled scrape endpoint run in headless mode.
 */
export async function launchBrowser(headed = false) {
  return chromium.launch({
    headless: !headed,

    // Use the Google Chrome already installed on this computer.
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",

    // Makes the headed run easier to watch/record.
    slowMo: headed ? 250 : 0,

    // Required for restricted/container environments such as Render.
    args: headed ? [] : ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}