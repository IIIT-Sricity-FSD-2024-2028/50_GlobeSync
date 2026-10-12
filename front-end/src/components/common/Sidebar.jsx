import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';

/**
 * Shared Sidebar component
 * @param {Array} menuItems - Role-specific navigation items passed as props: [{ label, path, icon }]
 * @param {boolean} isOpen - Controls visibility on smaller screens
 * @param {Function} onClose - Closes drawer on smaller screens after navigation
 */
export default function Sidebar({ menuItems = [], isOpen = false, onClose }) {
  const { role, user, logout } = useSession();
  const location = useLocation();

  return (
    <>
      {/* Backdrop for smaller screens when sidebar drawer is open */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 90,
          }}
        />
      )}

      <aside
        className={`sidebar ${isOpen ? 'open' : ''}`}
        style={{
          width: 'var(--sidebar-width, 250px)',
          background: '#fff',
          borderRight: '1px solid var(--border-light, #f3f4f6)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Logo / Portal Badge */}
        <div className="sidebar-logo">
          <div className="logo-icon">🌐</div>
          <div>
            <div className="logo-text">GlobeSync</div>
            <div className="logo-sub">{role ? role.toUpperCase() : 'PORTAL'}</div>
          </div>
        </div>

        {/* Dynamic Role Navigation Items passed via props */}
        <nav className="sidebar-nav" style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 20px',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  background: isActive ? '#ffeef5' : 'transparent',
                  borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '14px',
                  transition: 'all 0.15s',
                }}
              >
                <span className="nav-icon" style={{ fontSize: '18px' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with Session Details and Logout */}
        <div
          className="sidebar-footer"
          style={{
            padding: '16px',
            borderTop: '1px solid var(--border-light, #f3f4f6)',
            background: '#fafafa',
          }}
        >
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {user?.name || user?.businessName || 'Signed-In User'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Role: <strong style={{ color: 'var(--primary)' }}>{role}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="logout-btn"
            style={{
              width: '100%',
              padding: '9px 12px',
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
