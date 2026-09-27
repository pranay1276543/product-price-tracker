import { getExportCsvUrl } from "../services/api.js";

export default function ExportButton() {
  return (
    <a
      href={getExportCsvUrl()}
      className="inline-block text-sm font-medium border border-gray-300 rounded px-3 py-1.5 bg-white hover:bg-gray-50"
    >
      Export CSV
    </a>
  );
}
