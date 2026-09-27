import StatusBadge from "./StatusBadge.jsx";

export default function ScrapeLog({ logs }) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">No scrape attempts recorded yet.</p>;
  }

  return (
    <div className="border border-gray-200 rounded bg-white divide-y divide-gray-100">
      {logs.map((log) => (
        <div key={log.id} className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{new Date(log.timestamp).toLocaleString("en-IN")}</span>
            <StatusBadge outcome={log.outcome} />
          </div>
          <div className="mt-1 text-sm text-gray-600">
            {log.outcome === "failed" ? (
              <span>Failed after {log.attempts} attempt(s): {log.error_message}</span>
            ) : (
              <span>
                ₹{Number(log.price).toLocaleString("en-IN")} · {log.stock}
                {log.attempts > 1 ? ` · succeeded on attempt ${log.attempts}` : ""}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
