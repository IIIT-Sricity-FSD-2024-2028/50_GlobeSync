import React from 'react';

/**
 * Resolve image path from backend seed format to Vite public assets
 */
export function resolvePackageImage(imagePath) {
  if (!imagePath) return '/destinations/default-trip.png';
  if (imagePath.startsWith('../static/destinations/')) {
    return imagePath.replace('../static/destinations/', '/destinations/');
  }
  if (imagePath.startsWith('static/destinations/')) {
    return imagePath.replace('static/destinations/', '/destinations/');
  }
  return imagePath;
}

/**
 * PackageCard: Presentation component for an individual travel package
 * @param {Object} pkg - Package data object from backend API
 * @param {Function} onSelect - Callback when card or 'View Details' is clicked
 * @param {Function} onPlanTrip - Callback when 'Plan Trip' action is clicked
 */
export default function PackageCard({ pkg, onSelect, onPlanTrip }) {
  if (!pkg) return null;

  const imageSrc = resolvePackageImage(pkg.image);

  return (
    <div
      className="card"
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Package Image Banner */}
      <div
        style={{
          height: '170px',
          backgroundImage: `url(${imageSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            color: 'var(--primary)',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          ⏱ {pkg.duration} Days
        </span>
      </div>

      {/* Package Card Body */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
          {pkg.name}
        </h3>

        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📍</span>
          <span>{pkg.destinations}</span>
        </div>

        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '14px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {pkg.description}
        </p>

        {/* Highlights tag */}
        {pkg.highlights && (
          <div
            style={{
              fontSize: '11px',
              color: '#831843',
              background: '#fdf2f8',
              border: '1px solid #fbcfe8',
              borderRadius: '8px',
              padding: '6px 10px',
              marginBottom: '16px',
              lineHeight: '1.4',
            }}
          >
            ✨ <strong>Highlights:</strong> {pkg.highlights}
          </div>
        )}

        {/* Footer with Price and Callback Actions */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '14px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Est. Budget
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
              ₹{Number(pkg.budget || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(pkg)}
                style={{
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#f3f4f6',
                  color: 'var(--text)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Details
              </button>
            )}

            {onPlanTrip && (
              <button
                type="button"
                onClick={() => onPlanTrip(pkg)}
                className="btn btn-primary"
                style={{
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Plan Trip →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
