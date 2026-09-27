import { Link } from "react-router-dom";

function formatTimestamp(isoString) {
  if (!isoString) return "Never";
  return new Date(isoString).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function TrackedProductCard({ trackedProduct }) {
  const latest = trackedProduct.latestPrice;

  return (
    <div className="border border-gray-200 rounded bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{trackedProduct.product_name}</p>
          <p className="text-xs text-gray-500">Option: {trackedProduct.selected_option}</p>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-4">
        <div>
          <p className="text-xs text-gray-500">Current price</p>
          <p className="text-lg font-semibold text-gray-900">
            {latest ? `₹${Number(latest.price).toLocaleString("en-IN")}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Stock</p>
          <p className="text-sm text-gray-800">{latest ? latest.stock : "—"}</p>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Last scraped: {formatTimestamp(latest?.timestamp)}
      </p>

      <div className="mt-3 flex gap-3">
        <Link to={`/tracked/${trackedProduct.id}`} className="text-sm font-medium text-accent hover:underline">
          History &amp; Logs
        </Link>
      </div>
    </div>
  );
}
