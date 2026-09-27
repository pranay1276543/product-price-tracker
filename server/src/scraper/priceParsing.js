/**
 * The store renders the real price digits as full-width unicode characters
 * (e.g. "３１，９７０" instead of "31,970"), probably to make naive text scraping harder.
 * This converts each character back to a normal ASCII digit/comma/rupee sign.
 */
const FULLWIDTH_OFFSET = 0xfee0; // difference between full-width and normal ASCII code points

export function normalizeDigits(text) {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      // Full-width digits/punctuation live in the range 0xFF01-0xFF5E
      if (code >= 0xff01 && code <= 0xff5e) {
        return String.fromCharCode(code - FULLWIDTH_OFFSET);
      }
      return char;
    })
    .join("");
}

/**
 * Takes the raw text pulled from the manifest's "priceValue" element and turns it into a
 * plain number, e.g. "₹31,970" -> 31970. Returns null if it doesn't look like a real price,
 * so the caller can treat that as a failed scrape instead of saving garbage.
 */
export function parsePriceText(rawText) {
  if (!rawText) return null;

  const normalized = normalizeDigits(rawText);
  const digitsOnly = normalized.replace(/[^\d.]/g, "");

  if (!digitsOnly) return null;

  const value = Number(digitsOnly);
  return Number.isFinite(value) && value > 0 ? value : null;
}
