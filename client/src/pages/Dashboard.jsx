import { useEffect, useState } from "react";
import SearchBar from "../components/SearchBar.jsx";
import ProductSearchResults from "../components/ProductSearchResults.jsx";
import OptionPicker from "../components/OptionPicker.jsx";
import TrackedProductCard from "../components/TrackedProductCard.jsx";
import ExportButton from "../components/ExportButton.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { searchProducts, getProductDetail, trackProduct, getTrackedProducts } from "../services/api.js";

export default function Dashboard() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [isLoadingTracked, setIsLoadingTracked] = useState(true);

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);

  async function loadTrackedProducts() {
    setIsLoadingTracked(true);
    try {
      const data = await getTrackedProducts();
      setTrackedProducts(data);
    } catch (err) {
      setError("Could not load tracked products.");
    } finally {
      setIsLoadingTracked(false);
    }
  }

  useEffect(() => {
    loadTrackedProducts();
  }, []);

  async function handleSearch(query) {
    setIsSearching(true);
    setError(null);
    setSelectedProduct(null);
    try {
      const results = await searchProducts(query);
      setSearchResults(results);
    } catch (err) {
      setError("Search failed. The store may be temporarily unreachable.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSelectProduct(product) {
    setError(null);
    try {
      const detail = await getProductDetail(product.id);
      setSelectedProduct(detail);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load this product's details.");
    }
  }

  async function handleTrack(option) {
    setIsTracking(true);
    setError(null);
    try {
      await trackProduct({
        productId: selectedProduct.id,
        productSlug: selectedProduct.slug,
        productName: selectedProduct.name,
        selectedOption: option.label,
        optionId: option.id,
      });
      setSelectedProduct(null);
      setSearchResults([]);
      await loadTrackedProducts();
    } catch (err) {
      setError(err.response?.data?.error || "Could not track this product.");
    } finally {
      setIsTracking(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SearchBar onSearch={handleSearch} isSearching={isSearching} />
        <ErrorMessage message={error} />
        {isSearching && <LoadingSpinner label="Searching the store..." />}
        {!isSearching && searchResults.length > 0 && !selectedProduct && (
          <ProductSearchResults results={searchResults} onSelect={handleSelectProduct} />
        )}
        {selectedProduct && (
          <OptionPicker
            product={selectedProduct}
            onTrack={handleTrack}
            onCancel={() => setSelectedProduct(null)}
            isTracking={isTracking}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Tracked Products</h2>
          <ExportButton />
        </div>

        {isLoadingTracked && <LoadingSpinner label="Loading tracked products..." />}

        {!isLoadingTracked && trackedProducts.length === 0 && (
          <p className="text-sm text-gray-500">
            Nothing tracked yet. Search for a product above to get started.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {trackedProducts.map((tp) => (
            <TrackedProductCard key={tp.id} trackedProduct={tp} />
          ))}
        </div>
      </section>
    </div>
  );
}
