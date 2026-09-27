const STYLES = {
  success: "bg-green-50 text-green-700 border-green-200",
  retried: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

export default function StatusBadge({ outcome }) {
  const style = STYLES[outcome] || "bg-gray-50 text-gray-700 border-gray-200";
  return (
    <span className={`inline-block text-xs font-medium border rounded px-2 py-0.5 ${style}`}>
      {outcome.toUpperCase()}
    </span>
  );
}
