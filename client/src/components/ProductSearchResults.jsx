export default function ProductSearchResults({ results, onSelect }) {
  if (results.length === 0) {
    return <p className="text-sm text-gray-500">No products matched your search.</p>;
  }

  return (
    <ul className="border border-gray-200 rounded divide-y divide-gray-200 bg-white">
      {results.map((product) => (
        <li key={product.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">{product.name}</p>
            <p className="text-xs text-gray-500">
              {product.brand} · {product.category} · SKU {product.sku}
            </p>
          </div>
          <button
            onClick={() => onSelect(product)}
            className="text-sm font-medium text-accent hover:underline"
          >
            Select
          </button>
        </li>
      ))}
    </ul>
  );
}
