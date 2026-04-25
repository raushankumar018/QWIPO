import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import '../css/Sidebar.css';

const Sidebar = () => {
  const location = useLocation(); // Hook to get the current location
  let isRetailer = false;

  try {
    const raw = localStorage.getItem('user');
    const u = raw ? JSON.parse(raw) : null;
    isRetailer = u?.role === 'retailer';
  } catch (e) {
    console.error("Error parsing user from localStorage", e);
  }

  return (
    <aside className="dashboard-sidebar bg-body-tertiary border-end">
      <div className="p-3">
        <div className="d-flex align-items-center mb-3">
          <i className="bi bi-sliders2-vertical me-2 text-primary"></i>
          <span className="fw-semibold text-uppercase small text-muted">
            Navigation
          </span>
        </div>

        <Nav className="flex-column gap-1">
          <Nav.Link
            as={Link}
            to="/dashboard"
            className={`sidebar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            <i className="bi bi-speedometer2 me-2"></i> Dashboard
          </Nav.Link>

          <Nav.Link
            as={Link}
            to="/mymarket"
            className={`sidebar-link ${location.pathname === '/mymarket' ? 'active' : ''}`}
          >
            <i className="bi bi-shop me-2"></i> Market
          </Nav.Link>

          {isRetailer && (
            <Nav.Link
              as={Link}
              to="/retailer"
              className={`sidebar-link ${location.pathname === '/retailer' ? 'active' : ''}`}
            >
              <i className="bi bi-shop-window me-2"></i> Distributer Dashboard
            </Nav.Link>
          )}

          <Nav.Link
            as={Link}
            to="/product"
            className={`sidebar-link ${location.pathname.startsWith('/product') ? 'active' : ''}`}
          >
            <i className="bi bi-box-seam me-2"></i> Products
          </Nav.Link>

          <Nav.Link
            as={Link}
            to="/orders"
            className={`sidebar-link ${location.pathname.startsWith('/orders') ? 'active' : ''}`}
          >
            <i className="bi bi-bag-check me-2"></i> Orders
          </Nav.Link>

          <Nav.Link
            as={Link}
            to="/order-items"
            className={`sidebar-link ${location.pathname.startsWith('/order-items') ? 'active' : ''}`}
          >
            <i className="bi bi-list-check me-2"></i> Order Items
          </Nav.Link>

          {/* <Nav.Link
            as={Link}
            to="/customers"
            className={`sidebar-link ${location.pathname.startsWith('/customers') ? 'active' : ''}`}
          >
            <i className="bi bi-people me-2"></i> Customers
          </Nav.Link> */}

          <Nav.Link
            as={Link}
            to="/analytics"
            className={`sidebar-link ${location.pathname.startsWith('/analytics') ? 'active' : ''}`}
          >
            <i className="bi bi-bar-chart-line me-2"></i> Analytics
          </Nav.Link>

          <Nav.Link as={Link} to="#" disabled className="sidebar-link">
            <i className="bi bi-currency-rupee me-2"></i> Payments
          </Nav.Link>
        </Nav>
      </div>
    </aside>
  );
};

export default Sidebar;
