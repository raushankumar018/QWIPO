import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import TopNav from './components/layout/TopNav';
import Sidebar from './components/layout/Sidebar';
import './components/css/Dashboard.css'; // Main dashboard layout
import './components/css/Orders.css'; // Specific styles for the Orders page

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/orders`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  return (
    <div className="dashboard-wrapper min-vh-100 d-flex flex-column">
      <TopNav />
      <div className="dashboard-body d-flex flex-grow-1">
        <Sidebar />
        <main className="dashboard-content flex-grow-1">
          <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="page-title">Orders</h4>
              <button className="btn btn-outline-secondary action-btn">
                <i className="bi bi-download me-2"></i>Export
              </button>
            </div>

            {loading && (
              <div className="card shadow-sm text-center py-5 rounded-3">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="alert alert-danger" role="alert">{error}</div>
            )}

            {!loading && orders.length === 0 && (
              <div className="card shadow-sm rounded-3">
                <div className="card-body text-center text-muted py-5">No orders found</div>
              </div>
            )}

            {!loading && orders.length > 0 && (
              <div className="card shadow-sm rounded-3">
                <div className="card-body table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th className="text-end">Total Amount</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order._id}>
                          <td>
                            <div className="order-id-truncated" title={order._id}>{order._id}</div>
                          </td>
                          <td className="text-nowrap">{order.shippingAddress?.name || '—'}</td>
                          <td className="text-nowrap">{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td>{order.products?.length || 0}</td>
                          <td className="text-end">₹{Number(order.totalAmount || 0).toLocaleString()}</td>
                          <td>
                            <span
                              className={`badge text-capitalize ${
                                order.status === 'Delivered'
                                  ? 'bg-success-subtle text-success'
                                  : order.status === 'Pending'
                                  ? 'bg-warning-subtle text-warning'
                                  : 'bg-secondary-subtle text-secondary'
                              }`}
                            >
                              {order.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="text-end">
                            <Link to={`/order/${order._id}/confirmation`} className="btn btn-sm btn-outline-secondary">
                              <i className="bi bi-receipt me-1"></i>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Orders;