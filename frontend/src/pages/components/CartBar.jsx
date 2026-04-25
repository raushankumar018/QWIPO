import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext"; // Import your custom hook
import "./css/CartBar.css";

const CartBar = () => {
  const navigate = useNavigate();
  // Get all necessary state and functions from the context
  const { items, busy, updateQty, remove } = useCart();

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
      0
    );
    const count = items.reduce((c, it) => c + (Number(it.qty) || 1), 0);
    return { subtotal, count, subtotalFormatted: subtotal.toLocaleString() };
  }, [items]);

  if (items.length === 0) return null;

  const handleCheckoutClick = () => {
    navigate("/cart");
  };

  return (
    <div className="cartbar shadow-lg">
      <div className="cartbar-content container-fluid">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-lg-7">
            <div className="cart-items d-flex gap-3 overflow-auto">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="cart-chip d-flex align-items-center gap-2"
                >
                  <img
                    src={
                      it.image ||
                      it.thumbnail ||
                      "https://via.placeholder.com/40"
                    }
                    alt={it.name}
                  />
                  <div className="chip-info">
                    <div className="name text-truncate" title={it.name}>
                      {it.name}
                    </div>
                    <div className="price small text-muted">
                      ₹{Number(it.price || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="qty d-flex align-items-center">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => updateQty(it.id, it.qty - 1)}
                      disabled={busy || it.qty <= 1}
                    >
                      -
                    </button>
                    <input
                      className="form-control form-control-sm text-center"
                      style={{ width: 48 }}
                      value={it.qty}
                      onChange={(e) =>
                        updateQty(
                          it.id,
                          Math.max(1, Number(e.target.value) || 1)
                        )
                      }
                    />
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => updateQty(it.id, it.qty + 1)}
                      disabled={busy}
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => remove(it.id)}
                    disabled={busy}
                  >
                    <i className="bi bi-x"></i>
                  </button>{" "}
                </div>
              ))}
            </div>
          </div>
          <div
            className="col-12 col-lg-5 d-flex justify-content-lg-end align-items-center gap-3"
            data-item-count={totals.count}
            data-subtotal-formatted={totals.subtotalFormatted}
          >
            <div className="summary text-end">
              <div className="small text-muted">Items</div>
              <div className="fw-bold">{totals.count}</div>
            </div>
            <div className="summary text-end">
              <div className="small text-muted">Subtotal</div>
              <div className="fw-bold">₹{totals.subtotalFormatted}</div>
            </div>
            {/* ✅ UPDATED: Replaced 'Checkout' with 'Cart' and an icon */}
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={handleCheckoutClick}
            >
              {busy ? (
                <>
                  <i className="bi bi-arrow-clockwise spin me-1"></i>
                  Placing...
                </>
              ) : (
                <>
                  <i className="bi bi-cart-fill me-1"></i>
                  Cart
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartBar;
