/**
 * Builds the CSV export required by the assignment: one row per scrape attempt,
 * with the store's product id, product name, selected option, ISO 8601 UTC timestamp,
 * price, stock and outcome. Failed attempts are included with empty price/stock.
 */
function escapeCsvField(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildScrapeHistoryCsv(rows) {
  const header = ["product_id", "product_name", "selected_option", "timestamp", "price", "stock", "outcome"];
  const lines = [header.join(",")];

  for (const row of rows) {
    const line = [
      row.product_id,
      row.product_name,
      row.selected_option,
      new Date(row.timestamp).toISOString(),
      row.price ?? "",
      row.stock ?? "",
      row.outcome,
    ]
      .map(escapeCsvField)
      .join(",");
    lines.push(line);
  }

  return lines.join("\n");
}
