import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import TopNav from './components/layout/TopNav';
import Sidebar from './components/layout/Sidebar';
import Ai from './components/Ai'; // Import your AI component here
import './components/css/Dashboard.css';

// Reusable Stat Card Component
const StatCard = ({ icon, label, value, trend }) => (
  <div className="card stat-card h-100 shadow-sm">
    <div className="card-body d-flex align-items-center flex-wrap">
      <div className="icon-wrap me-3 mb-2 mb-md-0">
        <i className={`bi ${icon} fs-3`}></i>
      </div>
      <div className="flex-grow-1 min-w-0">
        <div className="text-muted small text-uppercase fw-semibold text-truncate">{label}</div>
        <div className="d-flex align-items-baseline gap-2 flex-wrap">
          <div className="fs-5 fs-md-4 fw-bold text-truncate">{value}</div>
          {trend !== undefined && (
            <span
              className={`badge rounded-pill ${trend > 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
            >
              {trend > 0 ? `+${trend}%` : `${trend}%`}
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

function Dashboard() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/orders`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        setOrders(Array.isArray(res.data) ? res.data : []);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount ? totalRevenue / orderCount : 0;
    const couponSavings = orders.reduce((sum, o) => sum + (Number(o.discount) || 0), 0);
    return { totalRevenue, orderCount, avgOrderValue, couponSavings };
  }, [orders]);

  const recent = useMemo(() => {
    return [...orders]
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      .reverse()
      .slice(0, 8);
  }, [orders]);

  return (
    <div className="dashboard-wrapper min-vh-100 d-flex flex-column">
      <TopNav />
      <div className="dashboard-body d-flex flex-grow-1 flex-column flex-lg-row">
        <Sidebar />
        <main className="dashboard-content flex-grow-1">
          <div className="container-fluid py-4">

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center flex-wrap mb-4">
              <h4 className="mb-2 mb-md-0">Dashboard</h4>
              <div className="text-muted small text-truncate">
                {loading ? 'Loading...' : `${orders.length} orders loaded`}
                {error && <span className="text-danger ms-2">{error}</span>}
              </div>
            </div>

            {/* Stat Cards */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-sm-6 col-md-6 col-xl-3">
                <StatCard icon="bi-currency-rupee" label="Expenditure" value={`₹${Number(metrics.totalRevenue || 0).toLocaleString()}`} />
              </div>
              <div className="col-12 col-sm-6 col-md-6 col-xl-3">
                <StatCard icon="bi-bag-check" label="Orders" value={`${metrics.orderCount}`} />
              </div>
              <div className="col-12 col-sm-6 col-md-6 col-xl-3">
                <StatCard
                  icon="bi-basket"
                  label="Avg. Order Value"
                  value={`₹${Number(metrics.avgOrderValue || 0).toFixed(0).toLocaleString?.() || Number(metrics.avgOrderValue || 0).toFixed(0)}`}
                />
              </div>
              <div className="col-12 col-sm-6 col-md-6 col-xl-3">
                <StatCard icon="bi-ticket-perforated" label="Coupon Savings" value={`₹${Number(metrics.couponSavings || 0).toLocaleString()}`} />
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
                  <h6 className="mb-2 mb-md-0">Recent Orders</h6>
                  <Link to="/orders" className="btn btn-sm btn-outline-secondary">View All</Link>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th className="text-end">Items</th>
                        <th className="text-end">Total</th>
                        <th>Coupon</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map(o => (
                        <tr key={o._id}>
                          <td className="text-break" style={{ maxWidth: 200 }}>{o._id}</td>
                          <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                          <td className="text-end">{Array.isArray(o.products) ? o.products.reduce((c, l) => c + (Number(l.quantity) || 0), 0) : 0}</td>
                          <td className="text-end">₹{Number(o.totalAmount || 0).toLocaleString()}</td>
                          <td>{o.couponCode || '-'}</td>
                          <td><span className="badge bg-primary-subtle text-primary">{o.status}</span></td>
                          <td className="text-end">
                            <Link className="btn btn-sm btn-outline-primary" to={`/order/${o._id}/confirmation`}>
                              <i className="bi bi-receipt me-1" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {!loading && recent.length === 0 && (
                        <tr><td colSpan={7} className="text-center text-muted p-4">No recent orders</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* AI Recommendations Section */}
            <div className="card shadow-sm mt-4">
              <div className="card-body">
                <Ai />  {/* Your existing AI component renders here */}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
