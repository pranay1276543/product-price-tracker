import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PriceHistory from "../components/PriceHistory.jsx";
import ScrapeLog from "../components/ScrapeLog.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { getTrackedProductHistory, getTrackedProductLogs } from "../services/api.js";

export default function ProductDetails() {
  const { id } = useParams();
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("history");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [historyData, logsData] = await Promise.all([
          getTrackedProductHistory(id),
          getTrackedProductLogs(id),
        ]);
        setHistory(historyData);
        setLogs(logsData);
      } catch (err) {
        setError("Could not load this product's history.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-accent hover:underline">
        ← Back to dashboard
      </Link>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("history")}
          className={`text-sm font-medium px-3 py-2 border-b-2 ${
            activeTab === "history" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500"
          }`}
        >
          Price History
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`text-sm font-medium px-3 py-2 border-b-2 ${
            activeTab === "logs" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500"
          }`}
        >
          Scrape Log
        </button>
      </div>

      <ErrorMessage message={error} />
      {isLoading ? (
        <LoadingSpinner />
      ) : activeTab === "history" ? (
        <PriceHistory history={history} />
      ) : (
        <ScrapeLog logs={logs} />
      )}
    </div>
  );
}
