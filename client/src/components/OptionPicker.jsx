import { useState } from "react";

export default function OptionPicker({ product, onTrack, onCancel, isTracking }) {
  const [selectedOptionId, setSelectedOptionId] = useState(product.options?.[0]?.id || null);

  const selectedOption = product.options?.find((opt) => opt.id === selectedOptionId);

  return (
    <div className="border border-gray-200 rounded bg-white p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{product.name}</p>
        <p className="text-xs text-gray-500">SKU {product.sku}</p>
      </div>

      {product.options?.length > 0 ? (
        <div>
          <p className="text-xs text-gray-500 mb-1">{product.optionAxis || "Option"}</p>
          <div className="flex flex-wrap gap-2">
            {product.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedOptionId(opt.id)}
                className={`text-sm border rounded px-3 py-1 ${
                  opt.id === selectedOptionId
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">This product has no selectable options.</p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          disabled={!selectedOption || isTracking}
          onClick={() => onTrack(selectedOption)}
          className="text-sm font-medium bg-accent text-white rounded px-4 py-1.5 disabled:opacity-50"
        >
          {isTracking ? "Adding..." : "Track this product"}
        </button>
        <button onClick={onCancel} className="text-sm font-medium text-gray-500 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
