import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useCart } from "../../context/CartContext.jsx";
import { useToast } from '../../context/ToastContext.jsx';
import TopNav from './layout/TopNav';
import Sidebar from './layout/Sidebar';
import './css/Checkout.css'; // ✅ new CSS file

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const Checkout = () => {
  const navigate = useNavigate();
  const { show } = useToast();
  const { items, totals, checkout, busy } = useCart();
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState(null);
  const [shipping, setShipping] = useState({ name: '', phone: '', address: '', city: '', state: '', zip: '' });
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="dashboard-wrapper min-vh-100 d-flex flex-column checkout-wrapper">
      <TopNav />
      <div className="dashboard-body d-flex flex-grow-1">
        <Sidebar />
        <main className="dashboard-content flex-grow-1 checkout-content">
          <div className="container-fluid py-4">
            <h4 className="mb-4 d-flex align-items-center">
              <i className="bi bi-bag-check-fill text-primary me-2"></i> Checkout
            </h4>

            <div className="row g-4 justify-content-center">
              <div className="col-12 col-lg-8">
                <div className="card shadow-sm rounded-4 border-0 checkout-card">
                  <div className="card-body p-4">
                    <h6 className="mb-4 text-uppercase text-muted border-bottom pb-2">Order Summary</h6>

                    <div className="list-group list-group-flush mb-4 order-list">
                      {items.map(it => (
                        <div
                          key={it.id}
                          className="list-group-item d-flex align-items-center gap-3 py-3 order-item"
                        >
                          <img
                            src={it.image || 'https://via.placeholder.com/56'}
                            alt={it.name}
                            width={56}
                            height={56}
                            className="rounded-3 shadow-sm"
                          />
                          <div className="flex-grow-1">
                            <div className="fw-semibold text-dark">{it.name}</div>
                            <div className="text-muted small">
                              ₹{Number(it.price || 0).toLocaleString()} × {it.qty}
                            </div>
                          </div>
                          <div className="fw-bold text-primary">
                            ₹{(Number(it.price || 0) * Number(it.qty)).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span>Subtotal</span>
                      <strong>₹{totals.subtotal.toLocaleString()}</strong>
                    </div>

                    <div className="coupon-section mb-4">
                      <label className="form-label small text-muted">Coupon code</label>
                      <div className="input-group">
                        <input
                          className="form-control"
                          value={coupon}
                          onChange={(e) => setCoupon(e.target.value)}
                          placeholder="ENTER CODE"
                        />
                        <button
                          className="btn btn-outline-primary"
                          disabled={!coupon || busy}
                          onClick={async () => {
                            try {
                              const res = await axios.get(`${API_BASE}/api/coupons/validate`, {
                                params: { code: coupon, amount: totals.subtotal },
                                headers: token ? { Authorization: `Bearer ${token}` } : {}
                              });
                              setApplied({ code: res.data.code, discount: res.data.discount, finalAmount: res.data.finalAmount });
                              show(`Coupon ${res.data.code} applied: -₹${res.data.discount.toLocaleString()}`, { variant: 'success' });
                            } catch (err) {
                              setApplied(null);
                              show(err.response?.data?.message || err.message || 'Invalid coupon', { variant: 'danger' });
                            }
                          }}
                        >
                          Apply
                        </button>
                      </div>
                      {applied && (
                        <div className="small text-success mt-2">
                          ✅ Applied {applied.code}: -₹{Number(applied.discount || 0).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {applied && (
                      <div className="d-flex justify-content-between mb-2 text-success fw-semibold">
                        <span>Discount</span>
                        <span>-₹{Number(applied.discount || 0).toLocaleString()}</span>
                      </div>
                    )}

                    <div className="d-flex justify-content-between mb-4 grand-total">
                      <span>Grand Total</span>
                      <strong className="fs-5 text-primary">
                        ₹{Number((applied?.finalAmount ?? totals.subtotal)).toLocaleString()}
                      </strong>
                    </div>

                    <h6 className="mb-3 text-uppercase text-muted border-bottom pb-2">Shipping Details</h6>
                    <div className="shipping-form">
                      <input className="form-control form-control-sm mb-2" value={shipping.name} onChange={(e) => setShipping(s => ({ ...s, name: e.target.value }))} placeholder="Full Name" />
                      <input className="form-control form-control-sm mb-2" value={shipping.phone} onChange={(e) => setShipping(s => ({ ...s, phone: e.target.value }))} placeholder="Phone" />
                      <textarea className="form-control form-control-sm mb-2" rows={2} value={shipping.address} onChange={(e) => setShipping(s => ({ ...s, address: e.target.value }))} placeholder="Address" />
                      <div className="row g-2 mb-3">
                        <div className="col-6"><input className="form-control form-control-sm" value={shipping.city} onChange={(e) => setShipping(s => ({ ...s, city: e.target.value }))} placeholder="City" /></div>
                        <div className="col-3"><input className="form-control form-control-sm" value={shipping.state} onChange={(e) => setShipping(s => ({ ...s, state: e.target.value }))} placeholder="State" /></div>
                        <div className="col-3"><input className="form-control form-control-sm" value={shipping.zip} onChange={(e) => setShipping(s => ({ ...s, zip: e.target.value }))} placeholder="PIN" /></div>
                      </div>
                    </div>

                    <button
                      className="btn btn-primary w-100 fw-bold rounded-3 shadow-sm"
                      disabled={busy || !shipping.name || !shipping.address}
                      onClick={async () => {
                        const res = await checkout(applied?.code, shipping);
                        if (res?.ok) {
                          show('Order placed successfully', { variant: 'success' });
                          if (res.order?._id) navigate(`/order/${res.order._id}/confirmation`);
                        } else if (res?.error) {
                          show(res.error, { variant: 'danger' });
                        }
                      }}
                    >
                      {busy ? 'Placing...' : 'Place Order'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Checkout;
