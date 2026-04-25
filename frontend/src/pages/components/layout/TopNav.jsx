import React, { useState, useEffect } from "react";
import { Navbar, Container, Nav, Dropdown } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../../context/CartContext.jsx";
import "../css/TopNav.css";

const TopNav = () => {
  const navigate = useNavigate();
  const { totals } = useCart ? useCart() : { totals: { count: 0 } };

  const [notifications] = useState([
    { id: 1, text: "New order ORD-1012 placed", read: false },
    { id: 2, text: "Stock low: Smartwatch Pro", read: false },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ✅ Initialize user from localStorage safely
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser
        ? JSON.parse(storedUser)
        : { name: "Guest", avatar: "https://via.placeholder.com/40" };
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      return { name: "Guest", avatar: "https://via.placeholder.com/40" };
    }
  });

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ Listen for localStorage user changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage on change", e);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <Navbar
      expand="lg"
      className={`custom-navbar py-3 sticky-top ${scrolled ? "scrolled" : ""}`}
      variant="dark"
    >
      <Container fluid>
        <Navbar.Brand as={Link} to="/mymarket" className="brand-logo">
          <i className="bi bi-shop-window me-2"></i>
          <span className="brand-text">My Market</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="topnav" className="custom-toggler" />
        <Navbar.Collapse id="topnav">
          <Nav className="ms-auto align-items-center gap-2">
            {/* 🛒 Cart Button */}
            <Link
              to="/cart"
              className="btn btn-warning login-btn position-relative"
            >
              <i className="bi bi-cart3 text-dark"></i>
              {totals.count > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {totals.count}
                </span>
              )}
            </Link>

            {/* 🔔 Notifications */}
            <Dropdown align="end">
              <Dropdown.Toggle
                variant="warning"
                className="login-btn position-relative"
              >
                <i className="bi bi-bell text-dark"></i>
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {unreadCount}
                  </span>
                )}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {notifications.length === 0 ? (
                  <Dropdown.ItemText>No notifications</Dropdown.ItemText>
                ) : (
                  notifications.map((n) => (
                    <Dropdown.Item key={n.id}>{n.text}</Dropdown.Item>
                  ))
                )}
              </Dropdown.Menu>
            </Dropdown>

            {/* 👤 Profile Dropdown */}
            <Dropdown align="end">
              <Dropdown.Toggle
                variant="link"
                id="dropdown-profile"
                className="d-flex align-items-center profile-toggle"
              >
                <img
                  src={user.avatar || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_lvjjRAVDQ-nBDq_4dy1xCyRjjDaHV-Tqcw&s"}
                  alt={user.name || "User"}
                  className="user-avatar rounded-circle"
                />
                <span className="profile-name d-none d-lg-inline ms-2">
                  {user.name || "User"}
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item as={Link} to="/profile">
                  Profile
                </Dropdown.Item>
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default TopNav;
