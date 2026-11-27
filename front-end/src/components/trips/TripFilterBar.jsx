import React from 'react';

const STATUS_OPTIONS = ['ALL', 'Planning', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

/**
 * TripFilterBar: Search and status filter controls for traveler trips.
 * 
 * Props:
 * - searchQuery (string): Active search text
 * - onSearchChange (func): Handler for search input
 * - statusFilter (string): Selected trip status pill
 * - onStatusFilterChange (func): Handler for status pill click
 * - hasActiveFilters (bool): True if filters are applied
 * - onClearFilters (func): Handler to reset all filters
 */
export default function TripFilterBar({
  searchQuery = '',
  onSearchChange,
  statusFilter = 'ALL',
  onStatusFilterChange,
  hasActiveFilters = false,
  onClearFilters,
}) {
  return (
    <div className="filter-container">
      {/* Search Input */}
      <div>
        <input
          type="text"
          placeholder="🔍 Search itineraries by destination or Trip ID..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="form-control"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="filter-tabs-row">
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginRight: '4px', textTransform: 'uppercase' }}>
          Status:
        </span>
        {STATUS_OPTIONS.map((tab) => {
          const isActive = statusFilter === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onStatusFilterChange(tab)}
              className={`filter-pill-btn ${isActive ? 'active' : ''}`}
            >
              {tab}
            </button>
          );
        })}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="filter-reset-btn"
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
}
