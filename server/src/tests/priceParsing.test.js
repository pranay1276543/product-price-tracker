import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDigits, parsePriceText } from "../scraper/priceParsing.js";

test("normalizeDigits converts full-width digits to ASCII", () => {
  assert.equal(normalizeDigits("３１，９７０"), "31,970");
});

test("parsePriceText extracts a plain number from a rupee-formatted string", () => {
  assert.equal(parsePriceText("₹31,970"), 31970);
});

test("parsePriceText handles the store's full-width digit rendering", () => {
  assert.equal(parsePriceText("₹３１，９７０"), 31970);
});

test("parsePriceText returns null for empty or missing text", () => {
  assert.equal(parsePriceText(""), null);
  assert.equal(parsePriceText(null), null);
});

test("parsePriceText returns null for non-price text (never fabricates a value)", () => {
  assert.equal(parsePriceText("Loading..."), null);
});
