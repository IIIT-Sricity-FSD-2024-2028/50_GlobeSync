import React from 'react';
import { Link } from 'react-router-dom';

/**
 * SummaryCard: Simple, reusable KPI summary card receiving label and value through props.
 *
 * Props:
 * - label (string, required): Title / metric label
 * - value (string | number, required): Metric value to display
 * - icon (string / ReactNode, optional): Visual icon or emoji
 * - subtitle (string, optional): Contextual helper caption
 * - badge (string, optional): Small tag or indicator
 * - linkTo (string, optional): Route to navigate to when clicked
 * - onClick (function, optional): Click handler callback
 * - color (string, optional): Custom accent color
 */
export default function SummaryCard({
  label,
  value,
  icon,
  subtitle,
  badge,
  linkTo,
  onClick,
  color = 'var(--primary, #E8467C)',
  className = '',
  style = {},
}) {
  const cardContent = (
    <div
      className={`card summary-card ${className}`}
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '22px 24px',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: linkTo || onClick ? 'pointer' : 'default',
        textDecoration: 'none',
        color: 'inherit',
        minHeight: '130px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {label}
          </span>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginTop: '6px',
              lineHeight: 1.1,
            }}
          >
            {value !== undefined && value !== null ? value : '—'}
          </div>
        </div>

        {icon && (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--bg-soft, #f8fafc)',
              border: '1px solid var(--border-light, #f1f5f9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '6px' }}>
        {subtitle && (
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {subtitle}
          </span>
        )}

        {badge && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '10px',
              background: '#f1f5f9',
              color: 'var(--text-secondary)',
            }}
          >
            {badge}
          </span>
        )}

        {linkTo && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '12px',
              fontWeight: 700,
              color: color,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            View →
          </span>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
