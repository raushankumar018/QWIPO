import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import TopNav from "./components/layout/TopNav";
import Sidebar from "./components/layout/Sidebar"; // updated to use the same sidebar
import ProductCard from "./components/ProductCard";
import CartBar from "./components/CartBar";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import "./components/css/Dashboard.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function MyMarket() {
  const [products, setProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
  });

  const { items: cartItems, add, updateQty, remove, checkout, busy } = useCart();
  const { show } = useToast();
  const token = localStorage.getItem("authToken");

  const fetchProducts = async (opts = {}) => {
    const { category, minPrice, maxPrice } = { ...filters, ...opts };
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE}/api/products`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: {
          _: Date.now(),
          limit: 50,
          ...(category ? { category } : {}),
          ...(minPrice ? { minPrice } : {}),
          ...(maxPrice ? { maxPrice } : {}),
        },
      });
      const list = Array.isArray(res.data?.products) ? res.data.products : [];
      setProducts(list);

      // build category list from results
      const cats = Array.from(new Set(list.map((p) => p.category).filter(Boolean)));
      setAllCategories(cats);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const handleFilterChange = ({ field, value }) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    const reset = { category: "", minPrice: "", maxPrice: "" };
    setFilters(reset);
    fetchProducts(reset);
  };

  const handleApply = () => {
    fetchProducts();
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.distributor?.name || "").toLowerCase().includes(q)
    );
  }, [products, query]);

  return (
    <div className="dashboard-wrapper min-vh-100 d-flex flex-column">
      <TopNav />
      <div className="dashboard-body d-flex flex-grow-1">
        <Sidebar /> {/* Using Orders-style Sidebar */}

        <main className="dashboard-content flex-grow-1">
          <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-3 text-center ">
              <h4>Products</h4>
            </div>

            {/* Filter Row */}
            <div className="card mb-3">
              <div className="card-body">
                <div className="row g-2 align-items-center">
                  {/* Category Dropdown */}
                  <div className="col-auto">
                    <select
                      className="form-select"
                      value={filters.category}
                      onChange={(e) =>
                        handleFilterChange({ field: "category", value: e.target.value })
                      }
                    >
                      <option value="">All Categories</option>
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Min Price */}
                  <div className="col-auto" style={{ minWidth: 120 }}>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Min Price"
                      value={filters.minPrice}
                      onChange={(e) =>
                        handleFilterChange({ field: "minPrice", value: e.target.value })
                      }
                    />
                  </div>

                  {/* Max Price */}
                  <div className="col-auto" style={{ minWidth: 120 }}>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Max Price"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        handleFilterChange({ field: "maxPrice", value: e.target.value })
                      }
                    />
                  </div>

                  {/* Search Box */}
                  <div className="col">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        className="form-control"
                        placeholder="Search by name, SKU, brand"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className="col-auto">
                    <button className="btn btn-primary" onClick={handleApply}>
                      Apply
                    </button>
                  </div>

                  {/* Reset Button */}
                  <div className="col-auto">
                    <button className="btn btn-outline-secondary" onClick={handleReset}>
                      Reset
                    </button>
                  </div>
                </div>

                {/* Loading / Error */}
                <div className="mt-2">
                  {loading && <span className="text-muted me-3">Loading...</span>}
                  {error && <span className="text-danger">{error}</span>}
                </div>
              </div>
            </div>





            {/* Product Grid */}
            <div className="card">
              <div className="card-body">
                {!loading && filtered.length === 0 && (
                  <div className="text-center py-4 text-muted">
                    No products found
                  </div>
                )}
                <div className="row g-3">
                  {filtered.map((p) => (
                    <div className="col-6 col-md-4 col-lg-3" key={p._id || p.id || p.sku}>
                      <ProductCard product={p} onAdd={() => add(p)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Cart Bar */}
      <CartBar
        items={cartItems}
        onQty={updateQty}
        onRemove={remove}
        onCheckout={async () => {
          const res = await checkout();
          if (res?.ok)
            show("Order placed successfully", { variant: "success" });
          else if (res?.error) show(res.error, { variant: "danger" });
        }}
        busy={busy}
      />
    </div>
  );
}

export default MyMarket;
