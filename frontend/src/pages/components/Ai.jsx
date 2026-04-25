import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Zap, Info, ShoppingCart, Minus, Plus } from "lucide-react";
import { useCart } from "../../context/CartContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import "./css/AI.css";

const getApiBase = () => import.meta.env.VITE_API_BASE || "http://localhost:5000";
const API_BASE = getApiBase();

export default function AIRecommendations() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantities, setQuantities] = useState({});
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("authToken") || localStorage.getItem("token");
        const res = await axios.post(`${API_BASE}/api/recommendations/generate`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data;

        const processed = (data.recommendations || []).map(p => ({
          ...p,
          price: p.price ?? 120,
          stock: p.stock ?? 100,
          distributor: p.distributor?.name || "Qwipo Wholesale",
        }));
        const initialQuantities = {};
        processed.forEach(p => (initialQuantities[p.product_id] = 1));

        setProducts(processed);
        setQuantities(initialQuantities);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };

    if (!hasFetched.current) {
      fetchRecommendations();
      hasFetched.current = true;
    }
  }, []);

  const updateQty = (id, val) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, Math.min(999, val)),
    }));
  };

  const { add } = useCart ? useCart() : { add: null };
  const { show } = useToast ? useToast() : { show: null };

  const handleAddToCart = (product) => {
    const qty = quantities[product.product_id] || 1;
    if (add) {
      add({
        ...product,
        // map product_id to _id so cart recognizes it properly
        _id: product.product_id || product._id, 
        name: product.title || product.name,
      }, qty);
      if (show) show(`Added ${qty}x ${product.title || product.name} to cart`, { variant: "success" });
    } else {
      console.log("Added to cart:", { ...product, qty });
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Generating AI recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger text-center my-5" role="alert">
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="ai-recommendations-wrapper container">
      <div className="text-center">
        <h4 className="ai-section-title">
          <Zap className="ai-zap-icon" size={28} /> 
          AI Recommended Products Based on Your Order History
        </h4>
      </div>

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
        {products.map((p) => (
          <div className="col" key={p.product_id}>
            <div className="ai-card">
              <div className="ai-card-img-wrapper">
                <div className="ai-relevance-badge">
                  <Zap size={12} fill="currentColor" /> {(p.score * 100).toFixed(0)}% Match
                </div>
                <img
                  src={p.image || `https://placehold.co/400x400?text=${encodeURIComponent(p.title || "Product")}`}
                  className="ai-card-img"
                  alt={p.title}
                  onError={(e) => {
                    e.target.src = `https://placehold.co/400x400?text=${encodeURIComponent(p.title || "Product")}`;
                  }}
                />
              </div>
              <div className="ai-card-body">
                <h5 className="ai-card-title text-truncate" title={p.title}>{p.title}</h5>
                <p className="ai-card-distributor">{p.distributor}</p>

                <div className="ai-reason-box">
                  <p className="ai-reason-text">
                    <Info size={16} className="ai-reason-icon" />
                    {p.reason || "AI rationale unavailable."}
                  </p>
                </div>

                <div className="d-flex align-items-center justify-content-between mt-auto mb-3">
                  <span className="ai-price">₹{p.price.toFixed(2)}</span>
                  <div className="ai-qty-controls d-flex align-items-center">
                    <button className="ai-qty-btn" onClick={() => updateQty(p.product_id, (quantities[p.product_id] || 1) - 1)}>
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      className="ai-qty-input"
                      value={quantities[p.product_id] || 1}
                      onChange={(e) => updateQty(p.product_id, Number(e.target.value))}
                      min="1"
                      max="999"
                    />
                    <button className="ai-qty-btn" onClick={() => updateQty(p.product_id, (quantities[p.product_id] || 1) + 1)}>
                      <Plus size={14} />
                    </button>
                  </div> 
                </div>

                <button
                  className="ai-add-btn w-100"
                  onClick={() => handleAddToCart(p)}
                >
                  <ShoppingCart size={18} /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
