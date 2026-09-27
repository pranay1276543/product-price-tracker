import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold text-gray-900">
          Product Price Tracker
        </Link>
        <span className="text-sm text-gray-500">INE mock store</span>
      </div>
    </header>
  );
}
