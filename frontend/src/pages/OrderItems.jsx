import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import TopNav from './components/layout/TopNav';
import Sidebar from './components/layout/Sidebar';
import './components/css/Dashboard.css'; // Main dashboard layout

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// MOVED: Helper function moved outside the component for better practice.
const orderStatusToBadgeClass = (status) => {
  switch (status) {
    case 'Delivered':
      return 'bg-success-subtle text-success';
    case 'Pending':
      return 'bg-warning-subtle text-warning';
    case 'Shipped':
      return 'bg-info-subtle text-info';
    case 'Cancelled':
      return 'bg-danger-subtle text-danger';
    default:
      return 'bg-secondary-subtle text-secondary';
  }
};

export default function OrderItems() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/orders`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        setOrders(Array.isArray(res.data) ? res.data : []);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  const lines = useMemo(() => {
    const out = [];
    for (const o of orders) {
      for (const l of (o.products || [])) {
        out.push({
          key: `${o._id}-${l._id || l.product}`,
          orderId: o._id,
          date: o.createdAt,
          status: o.status,
          couponCode: o.couponCode,
          discount: o.discount || 0,
          productName: l.product?.name || String(l.product),
          quantity: l.quantity,
          price: l.price,
          lineTotal: (Number(l.price) || 0) * (Number(l.quantity) || 0),
        });
      }
    }
    return out;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lines.filter((r) => {
      const d = r.date ? new Date(r.date).toISOString().slice(0, 10) : '';
      const matchesQuery = `${r.orderId} ${r.productName}`.toLowerCase().includes(q);
      const matchesDate = (dateRange.start === '' || d >= dateRange.start) && (dateRange.end === '' || d <= dateRange.end);
      return matchesQuery && matchesDate;
    }).sort((a, b) => {
      const get = (row, key) => {
        if (key === 'date') return new Date(row.date);
        if (key === 'order') return row.orderId;
        if (key === 'name') return row.productName;
        if (key === 'total') return row.lineTotal;
        return row[key];
      };
      const av = get(a, sort.key);
      const bv = get(b, sort.key);
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [lines, query, dateRange, sort]);

  const requestSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const getSortIcon = (key) => {
    if (sort.key !== key) return 'bi-sort-alpha-down';
    return sort.dir === 'asc' ? 'bi-sort-alpha-down' : 'bi-sort-alpha-up-alt';
  };

  return (
    <div className="dashboard-wrapper min-vh-100 d-flex flex-column">
      <TopNav />
      <div className="dashboard-body d-flex flex-grow-1">
        <Sidebar />
        <main className="dashboard-content flex-grow-1">
          <div className="container-fluid py-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-3">
              <h4 className="page-title mb-0">My Order Items</h4> {/* Removed mb-3 for better alignment */}
              <div className="d-flex gap-2">
                <Link to="/orders" className="btn btn-outline-secondary action-btn">Back to Orders</Link>
              </div>
            </div>

            <div className="card shadow-sm rounded-3 mb-3">
              {/* FIXED: Improved header layout for responsiveness */}
              <div className="card-header d-flex flex-wrap gap-3 align-items-center justify-content-between">
                <div className="d-flex flex-wrap gap-3 align-items-center">
                  <div className="input-group" style={{ maxWidth: 320 }}>
                    <span className="input-group-text"><i className="bi bi-search" /></span>
                    <input className="form-control" placeholder="Search by product or order id" value={query} onChange={(e) => setQuery(e.target.value)} />
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <label className="text-muted small mb-0">From</label>
                    <input type="date" className="form-control" value={dateRange.start} onChange={(e) => setDateRange(s => ({ ...s, start: e.target.value }))} />
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <label className="text-muted small mb-0">To</label>
                    <input type="date" className="form-control" value={dateRange.end} onChange={(e) => setDateRange(s => ({ ...s, end: e.target.value }))} />
                  </div>
                </div>
                <div className="text-muted small">
                  {loading ? 'Loading...' : `${filtered.length} items`}
                  {error && <span className="text-danger ms-2">{error}</span>}
                </div>
              </div>

              {loading && (
                <div className="text-center p-5">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              )}

              {!loading && filtered.length === 0 && (
                <div className="card-body text-center text-muted p-4">No order items found</div>
              )}

              {!loading && filtered.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th onClick={() => requestSort('date')} className="sortable">Date <i className={`bi ${getSortIcon('date')}`} /></th>
                        <th onClick={() => requestSort('order')} className="sortable">Order ID <i className={`bi ${getSortIcon('order')}`} /></th>
                        <th onClick={() => requestSort('name')} className="sortable">Product <i className={`bi ${getSortIcon('name')}`} /></th>
                        <th className="text-end">Qty</th>
                        <th className="text-end sortable" onClick={() => requestSort('price')}>Price <i className={`bi ${getSortIcon('price')}`} /></th>
                        <th className="text-end sortable" onClick={() => requestSort('total')}>Line Total <i className={`bi ${getSortIcon('total')}`} /></th>
                        <th>Status</th>
                        <th>Coupon</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.key}>
                          <td>{r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                          <td className="text-break" style={{ maxWidth: 160 }}>{r.orderId}</td>
                          {/* FIXED: Prevents long product names from breaking the table */}
                          <td className="text-break" style={{ minWidth: 200 }}>{r.productName}</td>
                          <td className="text-end">{r.quantity}</td>
                          <td className="text-end">₹{Number(r.price).toLocaleString()}</td>
                          <td className="text-end">₹{Number(r.lineTotal).toLocaleString()}</td>
                          <td>
                            <span className={`badge text-capitalize ${orderStatusToBadgeClass(r.status)
                              }`}>
                              {r.status}
                            </span>
                          </td>
                          <td>{r.couponCode || '-'}</td>
                          <td className="text-end">
                            {/* ADDED: title attribute for tooltip */}
                            <Link className="btn btn-sm btn-outline-primary" to={`/order/${r.orderId}/confirmation`} title="View Order Invoice">
                              <i className="bi bi-receipt me-1" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
