import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { useRealtime } from '../../context/RealtimeContext';

/**
 * Shared Header for authenticated dashboard workspaces with Realtime Notification Bell
 */
export default function Header({ title, onToggleSidebar, isSidebarOpen }) {
  const { user, role, logout } = useSession();
  const navigate = useNavigate();
  const { isConnected, reconnecting, notifications, unreadCount, markAsRead, markAllAsRead } = useRealtime();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
  };

  const handleNotificationClick = (n) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    const meta = n.metadata || {};
    const nType = String(n.type || '').toLowerCase();
    let targetPath = null;
    if (role === 'traveler') {
      if (nType.includes('reassignment') && meta.requestId) {
        targetPath = `/traveler/trips?reassignmentId=${meta.requestId}`;
      } else if (meta.tripId) {
        targetPath = `/traveler/trips?tripId=${meta.tripId}`;
      }
    } else if (role === 'guide') {
      if (nType.includes('reassignment') || nType.includes('guide_assignment')) {
        targetPath = '/guide/requests';
      }
    } else if (role === 'admin') {
      if (nType === 'agency_application') {
        targetPath = '/admin/agencies';
      } else if (nType.includes('reassignment') || meta.tripId) {
        targetPath = '/admin/trips';
      }
    }
    if (targetPath) {
      setIsDropdownOpen(false);
      navigate(targetPath);
    }
  };

  return (
    <header
      className="dashboard-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        rowGap: '10px',
        padding: '16px 28px',
        background: '#fff',
        borderBottom: '1px solid var(--border-light, #f3f4f6)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: '1 1 200px' }}>
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
            display: 'none',
          }}
        >
          {isSidebarOpen ? '✕' : '☰'}
        </button>

        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
            {title || `${role ? role.charAt(0).toUpperCase() + role.slice(1) : ''} Workspace`}
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Signed in as {user?.email || 'Authenticated User'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Live Status indicator */}
        <span
          title={isConnected ? 'Live WebSocket connected' : reconnecting ? 'Reconnecting to live server...' : 'Realtime offline'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '12px',
            background: isConnected ? '#ecfdf5' : '#fffbeb',
            color: isConnected ? '#065f46' : '#92400e',
            border: `1px solid ${isConnected ? '#a7f3d0' : '#fde68a'}`,
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isConnected ? '#10b981' : '#f59e0b',
              display: 'inline-block',
            }}
          />
          {isConnected ? 'Live' : reconnecting ? 'Connecting...' : 'Offline'}
        </span>

        {/* ─── REALTIME NOTIFICATION BELL DROPDOWN ──────────────────────────── */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-label="View notifications"
            style={{
              background: 'none',
              border: '1px solid var(--border, #e5e7eb)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              fontSize: '18px',
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  border: '2px solid #fff',
                  minWidth: '16px',
                  textAlign: 'center',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '46px',
                width: '340px',
                maxHeight: '440px',
                background: '#fff',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f9fafb',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                  Notifications ({unreadCount} new)
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 4px',
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '360px' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                    🎉 You're all caught up! No notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f4f6',
                        background: n.is_read ? '#fff' : '#f0f9ff',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      {!n.is_read && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#0284c7',
                            marginTop: '6px',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: n.is_read ? 600 : 700, color: '#1e293b' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                          {n.body}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                          {formatRelativeTime(n.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Badge */}
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

        {/* Logout Button */}
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
