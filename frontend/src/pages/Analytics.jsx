import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import TopNav from './components/layout/TopNav';
import Sidebar from './components/layout/Sidebar';
import './components/css/Dashboard.css';
import './components/css/Analytics.css'; 

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// No changes to the KPI component
function KPI({ title, value, delta, icon, color }) {
  const trendColor = delta >= 0 ? 'text-success' : 'text-danger';
  const sign = delta > 0 ? '+' : '';
  
  return (
    <div className="card h-100 stat-card">
      <div className="card-body d-flex align-items-center">
        <div className={`icon-wrap me-3 bg-${color}-subtle text-${color}`}>
          <i className={`bi ${icon} fs-3`}></i>
        </div>
        <div>
          <div className="text-muted small text-uppercase fw-semibold">{title}</div>
          <div className="fs-4 fw-bold mb-0 d-flex align-items-baseline gap-2">
            <span>{value}</span>
            {delta !== undefined && (
              <span className={`badge rounded-pill bg-${delta >= 0 ? 'success' : 'danger'}-subtle ${trendColor}`}>{sign}{delta}%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Analytics() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]); // NEW: State for products list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // MODIFIED: useEffect to fetch both orders and products concurrently
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const config = { headers: token ? { Authorization: `Bearer ${token}` } : {} };
        
        // Use Promise.all to fetch both datasets at the same time
        const [ordersRes, productsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/orders`, config),
          axios.get(`${API_BASE}/api/products`, config)
        ]);

        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // No changes to filteredOrders logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const d = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : '';
      const okStart = !dateRange.start || d >= dateRange.start;
      const okEnd = !dateRange.end || d <= dateRange.end;
      return okStart && okEnd;
    });
  }, [orders, dateRange]);

  // No changes to the existing metrics calculation
  const metrics = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const orderCount = filteredOrders.length;
    const avgOrderValue = orderCount ? totalRevenue / orderCount : 0;
    const withCoupon = filteredOrders.filter(o => !!o.couponCode).length;
    const couponSavings = filteredOrders.reduce((sum, o) => sum + (Number(o.discount) || 0), 0);

    const productMap = new Map();
    for (const o of filteredOrders) {
      for (const l of (o.products || [])) {
        const name = l.product?.name || String(l.product);
        const revenue = (Number(l.price) || 0) * (Number(l.quantity) || 0);
        const prev = productMap.get(name) || { name, revenue: 0, qty: 0 };
        prev.revenue += revenue;
        prev.qty += Number(l.quantity) || 0;
        productMap.set(name, prev);
      }
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const byDayMap = new Map();
    for (const o of filteredOrders) {
      const key = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : 'unknown';
      byDayMap.set(key, (byDayMap.get(key) || 0) + (Number(o.totalAmount) || 0));
    }
    const revenueByDay = Array.from(byDayMap.entries())
      .filter(([d]) => d !== 'unknown')
      .sort((a, b) => a[0] < b[0] ? -1 : 1);
      
    return { totalRevenue, orderCount, avgOrderValue, withCoupon, couponSavings, topProducts, revenueByDay };
  }, [filteredOrders]);
  
  // NEW: Memoized calculation for distributor metrics
  const distributorMetrics = useMemo(() => {
    if (!products.length || !filteredOrders.length) {
        return [];
    }

    // Create a map of products by their ID for efficient lookup
    const productsById = new Map(products.map(p => [p._id, p]));
    const distributorMap = new Map();

    for (const order of filteredOrders) {
        for (const item of (order.products || [])) {
            // Handle cases where item.product is a populated object or just an ID string
            const productId = typeof item.product === 'object' && item.product?._id ? item.product._id : item.product;
            const productDetails = productsById.get(productId);

            // If the product exists in our products list and has a distributor
            if (productDetails && productDetails.distributor) {
                const distributorName = productDetails.distributor;
                const revenue = (Number(item.price) || 0) * (Number(item.quantity) || 0);
                
                const existing = distributorMap.get(distributorName) || { name: distributorName, revenue: 0, unitsSold: 0 };
                existing.revenue += revenue;
                existing.unitsSold += Number(item.quantity) || 0;
                
                distributorMap.set(distributorName, existing);
            }
        }
    }

    // Return a sorted array of distributor data
    return Array.from(distributorMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, products]);


  // No changes to the CSV export function
  const doExportCsv = () => {
    const rows = [
      ['Order ID', 'Date', 'Total', 'Discount', 'Coupon', 'Status'],
      ...filteredOrders.map(o => [
        o._id,
        o.createdAt ? new Date(o.createdAt).toISOString() : '',
        String(o.totalAmount || 0),
        String(o.discount || 0),
        o.couponCode || '',
        o.status || '',
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-wrapper min-vh-100 d-flex flex-column">
      <TopNav />
      <div className="dashboard-body d-flex flex-grow-1">
        <Sidebar />
        <main className="dashboard-content flex-grow-1">
          <div className="container-fluid py-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 page-header">
              <h4 className="mb-2 mb-sm-0">Analytics</h4>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <label className="text-muted small">From</label>
                  <input type="date" className="form-control form-control-sm" value={dateRange.start} onChange={(e) => setDateRange(s => ({ ...s, start: e.target.value }))} />
                </div>
                <div className="d-flex align-items-center gap-2">
                  <label className="text-muted small">To</label>
                  <input type="date" className="form-control form-control-sm" value={dateRange.end} onChange={(e) => setDateRange(s => ({ ...s, end: e.target.value }))} />
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={doExportCsv}><i className="bi bi-download me-2"></i>Export CSV</button>
              </div>
            </div>
            
            {loading && (
              <div className="card shadow-sm text-center py-5 rounded-3">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            
            {error && !loading && (
                <div className="alert alert-danger" role="alert">{error}</div>
            )}

            {!loading && filteredOrders.length > 0 && (
              <>
                {/* --- KPIs (No Changes) --- */}
                <div className="row g-3 mb-3">
                  <div className="col-12 col-sm-6 col-lg-3"><KPI title="Total Expenditure" value={`₹${Number(metrics.totalRevenue || 0).toLocaleString()}`} delta={0} icon="bi-currency-rupee" color="success" /></div>
                  <div className="col-12 col-sm-6 col-lg-3"><KPI title="Orders" value={`${metrics.orderCount}`} delta={0} icon="bi-bag" color="primary" /></div>
                  <div className="col-12 col-sm-6 col-lg-3"><KPI title="Avg. Order Value" value={`₹${Number(metrics.avgOrderValue || 0).toFixed(0).toLocaleString?.() || Number(metrics.avgOrderValue || 0).toFixed(0)}`} delta={0} icon="bi-basket" color="secondary" /></div>
                  <div className="col-12 col-sm-6 col-lg-3"><KPI title="Coupon Savings" value={`₹${Number(metrics.couponSavings || 0).toLocaleString()}`} delta={0} icon="bi-ticket-perforated" color="info" /></div>
                </div>

                {/* --- Coupon Usage & Top Products (No Changes) --- */}
                <div className="row g-3 mb-3">
                  <div className="col-12 col-xl-8">
                    <div className="card h-100 shadow-sm rounded-3">
                      <div className="card-header"><h6 className="mb-0 text-uppercase fw-bold">Coupon Usage</h6></div>
                      <div className="card-body d-flex flex-column justify-content-center">
                        {(() => {
                          const total = metrics.orderCount || 0;
                          const couponOrders = metrics.withCoupon || 0;
                          const noCoupon = Math.max(0, total - couponOrders);
                          const pctCoupon = total ? Math.round((couponOrders / total) * 100) : 0;
                          const pctNo = 100 - pctCoupon;
                          return (
                            <>
                              <div className="mb-3">
                                <div className="d-flex justify-content-between small mb-1"><span>Orders with Coupon</span><span>{pctCoupon}%</span></div>
                                <div className="progress" role="progressbar" aria-label="With Coupon" aria-valuenow={pctCoupon} aria-valuemin="0" aria-valuemax="100">
                                  <div className="progress-bar bg-primary" style={{ width: `${pctCoupon}%` }}></div>
                                </div>
                              </div>
                              <div>
                                <div className="d-flex justify-content-between small mb-1"><span>Orders without Coupon</span><span>{pctNo}%</span></div>
                                <div className="progress" role="progressbar" aria-label="No Coupon" aria-valuenow={pctNo} aria-valuemin="0" aria-valuemax="100">
                                  <div className="progress-bar bg-secondary" style={{ width: `${pctNo}%` }}></div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-xl-4">
                    <div className="card h-100 shadow-sm rounded-3">
                      <div className="card-header"><h6 className="mb-0 text-uppercase fw-bold">Top Products</h6></div>
                      <div className="list-group list-group-flush">
                        {metrics.topProducts.length === 0 && (
                          <div className="list-group-item text-muted text-center py-4">No products yet</div>
                        )}
                        {metrics.topProducts.map(p => (
                          <div key={p.name} className="list-group-item d-flex justify-content-between align-items-center">
                            <span><i className="bi bi-star-fill text-warning me-2"></i>{p.name} <span className="text-muted small">×{p.qty}</span></span>
                            <span className="badge text-bg-light">₹{Number(p.revenue).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- NEW: Sales by Distributor Card --- */}
                <div className="row g-3 mb-3">
                    <div className="col-12">
                        <div className="card shadow-sm rounded-3">
                            <div className="card-header"><h6 className="mb-0 text-uppercase fw-bold">Sales by Distributor</h6></div>
                            <div className="list-group list-group-flush">
                                {distributorMetrics.length === 0 && (
                                    <div className="list-group-item text-muted text-center py-4">No distributor sales data for the selected range.</div>
                                )}
                                {distributorMetrics.map(dist => (
                                    <div key={dist.name} className="list-group-item d-flex justify-content-between align-items-center">
                                        <span><i className="bi bi-truck text-info me-2"></i>{dist.name} <span className="text-muted small">({dist.unitsSold} units)</span></span>
                                        <span className="fw-semibold">₹{Number(dist.revenue).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Revenue by Day (No Changes) --- */}
                <div className="row g-3">
                  <div className="col-12">
                    <div className="card shadow-sm rounded-3">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 text-uppercase fw-bold">Revenue by Day</h6>
                        <small className="text-muted">{metrics.revenueByDay.length} days</small>
                      </div>
                      <div className="card-body">
                        {metrics.revenueByDay.length === 0 && <div className="text-muted text-center py-4">No data for selected range</div>}
                        {metrics.revenueByDay.length > 0 && (
                          <div className="d-flex align-items-end" style={{ gap: 8, minHeight: 120 }}>
                            {(() => {
                              const max = Math.max(...metrics.revenueByDay.map(([,v]) => v));
                              return metrics.revenueByDay.map(([d, v]) => (
                                <div key={d} className="text-center analytics-bar" title={`₹${Number(v).toLocaleString()} on ${d}`}>
                                  <div className="bg-primary" style={{ height: `${max ? Math.max(6, (v/max)*100) : 0}%` }}></div>
                                  <div className="small text-muted mt-1" style={{ fontSize: 10 }}>{new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!loading && filteredOrders.length === 0 && !error && (
              <div className="card shadow-sm rounded-3">
                <div className="card-body text-center text-muted py-5">No order data found for the selected date range.</div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Analytics;