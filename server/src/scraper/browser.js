import { chromium } from "playwright";

/**
 * Launches a Playwright browser.
 *
 * headed=true opens a visible window - used only for the demo recording
 * (`npm run scrape:headed`). The normal server and the scheduled scrape endpoint
 * always call this with headed=false, since Render's servers have no display anyway.
 */
export async function launchBrowser(headed = false) {
  return chromium.launch({
    headless: !headed,

    // Local workaround: if Playwright's own Chromium download is blocked (e.g. by a
    // restrictive network), set CHROME_EXECUTABLE_PATH in .env to point at an already-
    // installed Chrome/Edge on this machine instead. Leave it unset on Render/production -
    // there, `npx playwright install --with-deps chromium` in the build command installs
    // Playwright's own browser normally, and this override should not be set at all.
    executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,

    // slowMo makes the headed run easier to actually watch/record; it does nothing headless.
    slowMo: headed ? 250 : 0,

    // Render (and most container platforms) run as root in a restricted sandbox, which
    // Chromium's own sandbox doesn't like. This is the standard, documented workaround -
    // not a security concern here since we only ever navigate to one known, trusted site.
    args: headed ? [] : ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}