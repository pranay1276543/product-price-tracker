export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
      <span className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-accent animate-spin" />
      {label}
    </div>
  );
}
