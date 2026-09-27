import { useState } from "react";

export default function SearchBar({ onSearch, isSearching }) {
  const [query, setQuery] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products... (e.g. camera, hair straightener)"
        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={isSearching}
        className="bg-gray-900 text-white text-sm font-medium rounded px-4 py-2 hover:bg-gray-800 disabled:opacity-50"
      >
        {isSearching ? "Searching..." : "Search"}
      </button>
    </form>
  );
}
