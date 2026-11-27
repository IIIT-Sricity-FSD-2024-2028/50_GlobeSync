import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTravelerPackages } from '../../store/travelerPackages/travelerPackages-actions';
import PackageCard from './PackageCard';

/**
 * PackageList: Renders packages grid and manages loading, error, and empty states.
 * Reads loading and error from Redux (state.travelerPackages) to avoid prop drilling.
 */
export default function PackageList({
  packages = [],
  onSelectPackage,
  onPlanTrip,
  onRetry,
  onClearFilters,
}) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.travelerPackages);
  const handleRetry = onRetry || (() => dispatch(fetchTravelerPackages()));
  // 1. Loading State
  if (loading) {
    return (
      <div
        className="card"
        style={{
          padding: '60px 20px',
          textAlign: 'center',
          borderRadius: '16px',
          background: '#fff',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📦</div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
          Loading travel packages...
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Fetching available tour itineraries from the GlobeSync API backend.
        </p>
      </div>
    );
  }

  // 2. Failed Request Error State (No fake fallback)
  if (error) {
    return (
      <div
        style={{
          padding: '32px 24px',
          background: '#fef2f2',
          border: '1px solid #fee2e2',
          borderRadius: '16px',
          textAlign: 'center',
          color: '#991b1b',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
          Failed to load packages
        </h3>
        <p style={{ fontSize: '14px', maxWidth: '500px', margin: '0 auto 16px', lineHeight: '1.6' }}>
          {error}
        </p>
        {handleRetry && (
          <button
            type="button"
            onClick={handleRetry}
            className="btn btn-primary"
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            Retry Request ↺
          </button>
        )}
      </div>
    );
  }

  // 3. Empty Search Results State
  if (packages.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: '60px 20px',
          textAlign: 'center',
          borderRadius: '16px',
          background: '#fff',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
          No matching packages found
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 18px', lineHeight: '1.6' }}>
          No itineraries matched your current search keywords or duration/budget filters.
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="btn btn-primary"
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            Clear Search Filters
          </button>
        )}
      </div>
    );
  }

  // 4. Populated Packages Grid
  return (
    <div
      className="packages-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
        gap: '24px',
      }}
    >
      {packages.map((pkg) => (
        <PackageCard
          key={pkg.packageId} // Stable backend database primary key
          pkg={pkg}
          onSelect={onSelectPackage}
          onPlanTrip={onPlanTrip}
        />
      ))}
    </div>
  );
}
