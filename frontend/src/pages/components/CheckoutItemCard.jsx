import React from 'react';
import { useCart } from '../../context/CartContext';
import './css/CheckoutItemCard.css';

const CheckoutItemCard = ({ item }) => {
  const { remove, updateQty } = useCart();

  const handleDecrease = () => {
    if (item.qty > 1) {
      updateQty(item.id, item.qty - 1);
    } else {
      remove(item.id);
    }
  };

  const handleIncrease = () => {
    updateQty(item.id, item.qty + 1);
  };

  return (
    <div className="checkout-item-card d-flex align-items-center mb-3 p-3 border rounded">
      <img 
        src={item.image || 'https://via.placeholder.com/60'} 
        alt={item.name} 
        className="item-image me-3" 
      />
      <div className="item-details flex-grow-1">
        <h6 className="item-name mb-1">{item.name}</h6>
        <p className="item-price text-muted mb-2">
          ₹{Number(item.price).toLocaleString()} x {item.qty}
        </p>
        <div className="quantity-controls d-flex align-items-center">
          <button
            className="btn btn-outline-danger btn-sm me-2"
            onClick={handleDecrease}
          >
            −
          </button>
          <span className="mx-1">{item.qty}</span>
          <button
            className="btn btn-outline-primary btn-sm ms-2"
            onClick={handleIncrease}
          >
            +
          </button>
        </div>
      </div>
      <div className="item-total fw-bold ms-3">
        ₹{(Number(item.price) * item.qty).toLocaleString()}
      </div>
    </div>
  );
};

export default CheckoutItemCard;
