import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';

const CartContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('cart');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';

  // ✅ Prevent multiple fetches in StrictMode
  const didFetch = useRef(false);

  // ✅ Keep localStorage in sync
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  // ✅ Load cart from server (only once per token change)
  useEffect(() => {
    const loadCartFromServer = async () => {
      if (!token || didFetch.current) return;
      didFetch.current = true;

      try {
        setBusy(true);
        const res = await axios.get(`${API_BASE}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const serverItems =
          res.data?.items?.map(i => ({
            id: i.product?._id || i.product,
            name: i.product?.name || '',
            price: i.product?.price || 0,
            image: i.product?.image || i.product?.thumbnail || '',
            qty: i.quantity || 1,
          })) || [];

        // ✅ Only set if data is valid
        if (Array.isArray(serverItems) && serverItems.length > 0) {
          setItems(serverItems);
        }
      } catch (err) {
        console.error('Failed to load cart:', err);
      } finally {
        setBusy(false);
      }
    };

    loadCartFromServer();
  }, [token]);

  // ✅ Add item to cart
  const add = async (p, qty = 1) => {
    if (!p?._id && !p?.id && !p?.sku) return;
    const itemId = p._id || p.id || p.sku;
    setBusy(true);

    setItems(prev => {
      const found = prev.find(it => it.id === itemId);
      if (found) {
        return prev.map(it =>
          it.id === itemId ? { ...it, qty: it.qty + qty } : it
        );
      }
      return [...prev, { id: itemId, name: p.name, price: p.price, image: p.image || p.thumbnail, qty }];
    });

    try {
      if (token) {
        const body = { product: itemId, quantity: qty };
        await axios.post(`${API_BASE}/api/cart/add`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error('Failed to add item to server:', err);
    } finally {
      setBusy(false);
    }
  };

  // ✅ Update quantity
  const updateQty = async (id, qty) => {
    const newQty = Math.max(0, qty);
    if (newQty === 0) return remove(id);
    setBusy(true);

    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, qty: newQty } : it))
    );

    try {
      if (token) {
        const body = { product: id, quantity: newQty };
        await axios.put(`${API_BASE}/api/cart/item`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error('Failed to update qty:', err);
    } finally {
      setBusy(false);
    }
  };

  // ✅ Remove item
  const remove = async id => {
    setBusy(true);
    setItems(prev => prev.filter(it => it.id !== id));
    try {
      if (token) {
        await axios.delete(`${API_BASE}/api/cart/item/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
    } finally {
      setBusy(false);
    }
  };

  // ✅ Clear cart
  const clear = async () => {
    setItems([]);
    if (token) {
      try {
        await axios.delete(`${API_BASE}/api/cart/clear`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('Failed to clear cart:', err);
      }
    }
  };

  // ✅ Totals calculation
  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
      0
    );
    const count = items.reduce((c, it) => c + (Number(it.qty) || 1), 0);
    return { subtotal, count };
  }, [items]);

  // ✅ Checkout
  const checkout = async (couponCode, shipping) => {
    if (items.length === 0) return { ok: false, error: 'Your cart is empty.' };
    if (!token) return { ok: false, error: 'Please login to place your order.' };

    try {
      setBusy(true);
      const body = {
        products: items.map(it => ({ product: it.id, quantity: it.qty })),
        ...(couponCode ? { couponCode } : {}),
        ...(shipping ? { shipping } : {}),
      };
      const res = await axios.post(`${API_BASE}/api/orders`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await clear();
      return { ok: true, order: res.data?.order };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    } finally {
      setBusy(false);
    }
  };

  const value = { items, totals, busy, add, updateQty, remove, clear, checkout };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
