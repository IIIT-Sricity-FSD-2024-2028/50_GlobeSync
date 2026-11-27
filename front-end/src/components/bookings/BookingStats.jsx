import React from 'react';

/**
 * BookingStats: Displays top-level financial and volume metrics for traveler bookings.
 * 
 * Props:
 * - totalCount (number): Count of all bookings across itineraries
 * - totalAmount (number): Cumulative rupee volume of all bookings
 * - confirmedCount (number): Count of Confirmed bookings ready for travel
 * - pendingCount (number): Count of Pending bookings awaiting payment
 */
export default function BookingStats({
  totalCount = 0,
  totalAmount = 0,
  confirmedCount = 0,
  pendingCount = 0,
}) {
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <span className="kpi-label">Total Bookings</span>
        <div className="kpi-value">{totalCount}</div>
        <div className="kpi-subtext">Across all scheduled itineraries</div>
      </div>

      <div className="kpi-card">
        <span className="kpi-label">Total Booked Volume</span>
        <div className="kpi-value" style={{ color: 'var(--primary)' }}>
          ₹{totalAmount.toLocaleString('en-IN')}
        </div>
        <div className="kpi-subtext">Combined booking costs</div>
      </div>

      <div className="kpi-card">
        <span className="kpi-label">Confirmed Bookings</span>
        <div className="kpi-value" style={{ color: '#059669' }}>
          {confirmedCount}
        </div>
        <div className="kpi-subtext" style={{ color: '#059669', fontWeight: 600 }}>
          Ready for travel execution
        </div>
      </div>

      <div className="kpi-card">
        <span className="kpi-label">Pending Payment</span>
        <div className="kpi-value" style={{ color: '#d97706' }}>
          {pendingCount}
        </div>
        <div className="kpi-subtext" style={{ color: '#d97706', fontWeight: 600 }}>
          {pendingCount > 0 ? 'Requires checkout action' : 'All clear'}
        </div>
      </div>
    </div>
  );
}
