import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const closeMenu = () => setMobileMenuOpen(false);

  // Exact matching for root vs child routes
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' ? 'nav-link active' : 'nav-link';
    }
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <header className="navbar-container">
      <nav className="navbar">
        {/* Brand Logo / Home */}
        <div className="navbar-brand">
          <Link to="/" onClick={closeMenu}>
            🎫 <span className="brand-title">Queue System</span>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="navbar-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Navigation Links and Auth Actions */}
        <div className={`navbar-collapse ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="navbar-links">
            <Link to="/" className={isActive('/')} onClick={closeMenu}>
              Home
            </Link>

            <Link
              to="/display-board"
              className={isActive('/display-board')}
              onClick={closeMenu}
            >
              Display Board
            </Link>

            {/* Customers and visitors can access 'Take a Queue Token' */}
            {(!user || !isStaff) && (
              <Link
                to="/take-token"
                className={isActive('/take-token')}
                onClick={closeMenu}
              >
                Take a Queue Token
              </Link>
            )}

            {/* Staff members can access 'Staff Dashboard' and 'Activity Logs' */}
            {isStaff && (
              <>
                <Link
                  to="/staff"
                  className={isActive('/staff')}
                  onClick={closeMenu}
                >
                  Staff Dashboard
                </Link>
                <Link
                  to="/staff/logs"
                  className={isActive('/staff/logs')}
                  onClick={closeMenu}
                >
                  Activity Logs
                </Link>
              </>
            )}
          </div>

          <div className="navbar-auth">
            {user ? (
              <div className="navbar-user">
                <span className="user-info">
                  <span className={`role-badge role-${user.role}`}>{user.role}</span>
                  <span className="username-text">{user.username}</span>
                </span>
                <button onClick={handleLogout} className="btn btn-outline btn-sm btn-logout">
                  Logout
                </button>
              </div>
            ) : (
              <div className="navbar-auth-links">
                <Link
                  to="/login"
                  className={`btn btn-sm ${location.pathname === '/login' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={closeMenu}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className={`btn btn-sm ${location.pathname === '/register' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={closeMenu}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
