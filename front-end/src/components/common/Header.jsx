import React from 'react';
import { useSession } from '../../context/SessionContext';

/**
 * Shared Header for authenticated dashboard workspaces
 */
export default function Header({ title, onToggleSidebar, isSidebarOpen }) {
  const { user, role, logout } = useSession();

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'superuser': return { bg: '#ede9fe', color: '#6d28d9', label: '👑 Superuser' };
      case 'admin': return { bg: '#fae8ff', color: '#a21caf', label: '📊 Admin' };
      case 'guide': return { bg: '#ffedd5', color: '#c2410c', label: '🧭 Guide' };
      case 'support': return { bg: '#dcfce7', color: '#15803d', label: '🎧 Support' };
      case 'agency': return { bg: '#e0f2fe', color: '#0369a1', label: '🏢 Agency' };
      default: return { bg: '#ffe4e6', color: '#be123c', label: '🎒 Traveler' };
    }
  };

  const badge = getRoleBadgeColor();

  return (
    <header
      className="dashboard-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        background: '#fff',
        borderBottom: '1px solid var(--border-light, #f3f4f6)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Mobile sidebar toggle button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="mobile-menu-toggle"
          aria-label="Toggle Navigation Menu"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'none', // Controlled via CSS media queries
          }}
        >
          {isSidebarOpen ? '✕' : '☰'}
        </button>

        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
            {title || `${role ? role.charAt(0).toUpperCase() + role.slice(1) : ''} Workspace`}
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Signed in as {user?.email || 'Authenticated User'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            background: badge.bg,
            color: badge.color,
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {badge.label}
        </span>

        <button
          type="button"
          onClick={logout}
          style={{
            background: 'none',
            border: '1px solid #fecaca',
            color: '#dc2626',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
