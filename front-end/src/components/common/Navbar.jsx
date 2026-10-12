import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSession, getDashboardPath } from '../../context/SessionContext';

export default function Navbar() {
  const { isAuthenticated, role, logout } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="landing-nav" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <Link to="/" className="nav-brand" onClick={handleNavClick}>
        <div className="brand-icon">✈</div>
        <span className="brand-title">GlobeSync</span>
      </Link>

      {/* Desktop & Mobile Menu */}
      <ul className={`nav-links-list ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <li>
          <Link
            to="/"
            onClick={handleNavClick}
            style={{ color: location.pathname === '/' ? 'var(--primary)' : 'var(--muted)', fontWeight: location.pathname === '/' ? 700 : 500 }}
          >
            Home
          </Link>
        </li>
        <li>
          <a href="/#features" onClick={handleNavClick}>
            Features
          </a>
        </li>
        <li>
          <a href="/#destinations" onClick={handleNavClick}>
            Destinations
          </a>
        </li>
        <li>
          <Link
            to="/portal-select"
            onClick={handleNavClick}
            style={{ color: location.pathname === '/portal-select' ? 'var(--primary)' : 'var(--muted)', fontWeight: location.pathname === '/portal-select' ? 700 : 500 }}
          >
            Portals
          </Link>
        </li>
        <li>
          <Link
            to="/about"
            onClick={handleNavClick}
            style={{ color: location.pathname === '/about' ? 'var(--primary)' : 'var(--muted)', fontWeight: location.pathname === '/about' ? 700 : 500 }}
          >
            About
          </Link>
        </li>
        <li>
          <Link
            to="/contact"
            onClick={handleNavClick}
            style={{ color: location.pathname === '/contact' ? 'var(--primary)' : 'var(--muted)', fontWeight: location.pathname === '/contact' ? 700 : 500 }}
          >
            Contact
          </Link>
        </li>
      </ul>

      {/* CTA action buttons */}
      <div className="nav-cta-group">
        {isAuthenticated ? (
          <>
            <Link
              to={getDashboardPath(role)}
              className="btn-nav-login"
              onClick={handleNavClick}
            >
              Dashboard ({role})
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                handleNavClick();
              }}
              className="btn-nav-get-started"
              style={{ background: '#ef4444' }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-nav-login" onClick={handleNavClick}>
              Sign In
            </Link>
            <Link to="/signup/traveler" className="btn-nav-get-started" onClick={handleNavClick}>
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
