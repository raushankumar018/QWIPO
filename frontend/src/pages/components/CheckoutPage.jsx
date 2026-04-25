import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from "../../context/CartContext";
import CheckoutItemCard from './CheckoutItemCard';
import TopNav from './layout/TopNav';
import RecommendedProducts from './RecommendedProducts'; // ✅ Import the new component
import './css/CheckoutPage.css';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, busy, checkout, totals } = useCart();

  if (!items || items.length === 0) {
    return (
      <>
        <TopNav />
        <div className="container my-5 text-center">
          <h2>Your cart is empty.</h2>
          <p>Please add items to your cart to proceed to checkout.</p>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
            Go to Shopping
          </button>
        </div>
      </>
    );
  }

  const [shipping, setShipping] = useState({ name: '', address: '', city: '', zip: '' });
  const [couponCode, setCouponCode] = useState('');
  const discount = 50;
  const platformFee = 7;
  const totalAmount = totals.subtotal - discount + platformFee;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShipping({ ...shipping, [name]: value });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (busy) return;
    const result = await checkout(couponCode, shipping);
    if (result.ok) {
      alert('Order placed successfully!');
      navigate('/order-confirmation');
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <>
      <TopNav />
      <div className="checkout-page container my-1">
        <h2 className="mb-4 text-center">Checkout</h2>
        <form onSubmit={handleCheckout}>
          <div className="row g-4 d-flex align-items-stretch">
            {/* Left Column */}
            <div className="col-md-7 d-flex">
              <div className="card shadow-sm p-4 w-100">
                <h5 className="card-title">Order Items</h5>
                {items.map((item) => (
                  <CheckoutItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Right Column */}
            <div className="col-md-5 d-flex">
              <div className="card shadow-sm p-4 w-100">
                <h5 className="card-title">Price Details</h5>
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Price ({items.length} item)</span>
                    <span>₹{totals.subtotal.toLocaleString()}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between text-success">
                    <span>Discount</span>
                    <span>-₹{discount.toLocaleString()}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Platform Fee</span>
                    <span>₹{platformFee.toLocaleString()}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between fw-bold">
                    <span>Total Amount</span>
                    <span>₹{totalAmount.toLocaleString()}</span>
                  </li>
                </ul>

                <div className="mt-4">
                  <h6>Apply Coupon</h6>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                    />
                    <button className="btn btn-outline-secondary" type="button">
                      Apply
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-success fw-bold">
                  You will save ₹{(totals.subtotal - totalAmount).toLocaleString()} on this order
                </p>

                <button
                  className="btn btn-primary btn-lg w-100 mt-4"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? 'Placing Order...' : 'Place Order'}
                </button>

                <div className="d-flex align-items-center mt-3 p-3 bg-light rounded">
                  <i className="bi bi-shield-lock-fill text-muted me-2"></i>
                  <span className="small text-muted">
                    Safe and Secure Payments. Easy returns. 100% Authentic products.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      <RecommendedProducts />
    </>
  );
};

export default CheckoutPage;
