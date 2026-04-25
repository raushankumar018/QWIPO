import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import TopNav from './components/layout/TopNav';
import Sidebar from './components/layout/Sidebar';
import RecommendedProducts from './components/RecommendedProducts';
import './components/css/Cart.css';

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQty, remove, busy } = useCart();

  return (
    <div className="dashboard-wrapper min-vh-100 d-flex flex-column">
      <TopNav />
      <div className="dashboard-body d-flex flex-grow-1">
        <Sidebar />
        <main className="dashboard-content flex-grow-1">
          <div className="container-fluid py-4">
            <h4 className="mb-4 d-flex align-items-center">
              Cart <span className="badge bg-secondary-subtle text-secondary ms-2">{items.length}</span>
            </h4>

            {items.length === 0 ? (
              <div className="card shadow-sm rounded-3">
                <div className="card-body text-center text-muted py-5">Your cart is empty.</div>
              </div>
            ) : (
              <div className="row g-4">
                {/* Cart Items List */}
                <div className="col-12">
                  <div className="card shadow-sm rounded-3">
                    <div className="list-group list-group-flush">
                      {items.map(it => (
                        <div
                          key={it.id}
                          className="list-group-item d-flex align-items-center gap-3 py-3 cart-item-hover"
                        >
                          <img
                            src={it.image || 'https://via.placeholder.com/56'}
                            alt={it.name}
                            width={56}
                            height={56}
                            style={{ objectFit: 'cover', borderRadius: 10 }}
                          />
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{it.name}</div>
                            <div className="text-muted small">₹{Number(it.price || 0).toLocaleString()}</div>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              disabled={busy || it.qty <= 1}
                              onClick={() => updateQty(it.id, Math.max(1, it.qty - 1))}
                            >
                              -
                            </button>
                            <input
                              className="form-control form-control-sm text-center"
                              style={{ width: 60 }}
                              value={it.qty}
                              onChange={(e) => updateQty(it.id, Math.max(1, Number(e.target.value) || 1))}
                            />
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              disabled={busy}
                              onClick={() => updateQty(it.id, it.qty + 1)}
                            >
                              +
                            </button>
                          </div>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            disabled={busy}
                            onClick={() => remove(it.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Proceed to Checkout Button */}
                  <div className="d-flex justify-content-end mt-4">
                    <button 
                      className="btn btn-primary"
                      onClick={() => navigate('/checkout')}
                    >
                      Proceed to Checkout
                      <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                  </div>
                </div>

                {/* Recommended Products below cart items */}
                <div className="col-12 mt-4">
                  <h5 className="mb-3">You might also like</h5>
                  <RecommendedProducts />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Cart;