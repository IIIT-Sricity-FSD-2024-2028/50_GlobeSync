import React from 'react';
import { useSelector } from 'react-redux';

/**
 * BookingStats: Displays top-level financial and volume metrics for traveler bookings.
 * Reads bookings directly from Redux (state.travelerBookings.bookings) to avoid prop drilling.
 */
export default function BookingStats() {
  const bookings = useSelector((state) => state.travelerBookings.bookings);

  const totalCount = bookings.length;
  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const confirmedCount = bookings.filter((b) => b.status === 'Confirmed').length;
  const pendingCount = bookings.filter((b) => b.status === 'Pending' || b.status === 'HELD').length;
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
