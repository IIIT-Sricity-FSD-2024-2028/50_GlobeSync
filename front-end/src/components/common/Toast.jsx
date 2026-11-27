import React from 'react';

/**
 * Toast notification banner
 */
export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;

  const getStyle = () => {
    switch (type) {
      case 'error':
        return { background: '#ef4444', color: '#fff' };
      case 'warning':
        return { background: '#f59e0b', color: '#fff' };
      default:
        return { background: '#10b981', color: '#fff' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        padding: '14px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 9999,
        fontWeight: 500,
        ...getStyle(),
      }}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
        >
          &times;
        </button>
      )}
    </div>
  );
}
