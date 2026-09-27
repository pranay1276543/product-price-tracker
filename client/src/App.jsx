import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tracked/:id" element={<ProductDetails />} />
        </Routes>
      </main>
    </div>
  );
}
