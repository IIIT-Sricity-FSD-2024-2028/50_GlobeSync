import React from 'react';

/**
 * PackageFilter: Controlled filter bar for packages
 * Receives filter values and callback props for changes.
 */
export default function PackageFilter({
  searchTerm,
  onSearchChange,
  selectedDuration,
  onDurationChange,
  maxBudget,
  onBudgetChange,
  sortBy,
  onSortChange,
  onReset,
  totalCount,
}) {
  return (
    <div
      className="card"
      style={{
        padding: '20px 24px',
        borderRadius: '16px',
        marginBottom: '24px',
        background: '#fff',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'end',
        }}
      >
        {/* Search by text */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Destination / Title
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="e.g. Paris, Tokyo, Alps, Bali"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Duration selector */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Duration
          </label>
          <select
            value={selectedDuration}
            onChange={(e) => onDurationChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              background: '#fff',
            }}
          >
            <option value="ALL">All Durations</option>
            <option value="SHORT">Short (1 - 4 Days)</option>
            <option value="MEDIUM">Standard (5 - 7 Days)</option>
            <option value="LONG">Extended (8+ Days)</option>
          </select>
        </div>

        {/* Max Budget Slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Max Budget
            </label>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
              ₹{Number(maxBudget).toLocaleString('en-IN')}
            </span>
          </div>
          <input
            type="range"
            min="10000"
            max="250000"
            step="5000"
            value={maxBudget}
            onChange={(e) => onBudgetChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
        </div>

        {/* Sorting options */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              background: '#fff',
            }}
          >
            <option value="RECOMMENDED">Featured / Default</option>
            <option value="PRICE_ASC">Price: Low to High</option>
            <option value="PRICE_DESC">Price: High to Low</option>
            <option value="DURATION">Duration: Days</option>
          </select>
        </div>
      </div>

      {/* Filter status strip & Clear button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid var(--border-light)',
          fontSize: '13px',
        }}
      >
        <div style={{ color: 'var(--muted)' }}>
          Showing <strong>{totalCount}</strong> packages
        </div>

        <button
          type="button"
          onClick={onReset}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Reset Filters ↺
        </button>
      </div>
    </div>
  );
}
