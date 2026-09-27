import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
});

export async function searchProducts(query) {
  const { data } = await api.get("/products/search", { params: { q: query } });
  return data.results;
}

export async function getProductDetail(id) {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

export async function getTrackedProducts() {
  const { data } = await api.get("/tracked-products");
  return data.trackedProducts;
}

export async function trackProduct(payload) {
  const { data } = await api.post("/tracked-products", payload);
  return data.trackedProduct;
}

export async function getTrackedProductHistory(id) {
  const { data } = await api.get(`/tracked-products/${id}/history`);
  return data.history;
}

export async function getTrackedProductLogs(id) {
  const { data } = await api.get(`/tracked-products/${id}/logs`);
  return data.logs;
}

export function getExportCsvUrl() {
  return `${api.defaults.baseURL}/export`;
}

export default api;
