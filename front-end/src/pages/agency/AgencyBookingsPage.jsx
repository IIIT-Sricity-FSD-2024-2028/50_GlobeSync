import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { bookingsApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';
import BookingDetailModal from '../../components/agency/BookingDetailModal';

/**
 * AgencyBookingsPage
 * 
 * Lists and inspects client bookings made by this agency.
 * Displays booking financial breakdowns, status badges, and inspection dialogs.
 */
export default function AgencyBookingsPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);
  const commissionRate = Number(user?.commissionRate ?? 1.5);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadBookings = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingsApi.getByAgency(agencyId, { signal });
      if (!signal?.aborted && Array.isArray(data)) {
        setBookings(data);
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Failed to load agency bookings:', err);
        setError(err.message || 'Failed to load bookings from backend.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (agencyId) {
      loadBookings(controller.signal);
    }
    return () => controller.abort();
  }, [agencyId]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesStatus =
        statusFilter === 'All' ||
        (b.status || '').toLowerCase() === statusFilter.toLowerCase();

      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        String(b.bookingId).includes(search) ||
        (b.service || '').toLowerCase().includes(search) ||
        (b.type || '').toLowerCase().includes(search) ||
        String(b.tripId || '').includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, statusFilter, searchTerm]);

  // Counts
  const totalCount = bookings.length;
  const confirmedCount = bookings.filter((b) => b.status === 'Confirmed').length;
  const pendingCount = bookings.filter((b) => b.status === 'Pending').length;
  const totalBilled = bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  return (
    <div>
      {/* Top Header */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfc 100%)',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Client Tour Bookings 🎫
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Manage client package bookings, track statuses, and audit reseller billing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/agency/book-package')}
          className="btn btn-primary"
          style={{
            background: 'linear-gradient(135deg, #19b6a6 0%, #0ea5e9 100%)',
            border: 'none',
            fontWeight: 700,
            padding: '10px 18px',
          }}
        >
          + Book New Tour
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Counters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard
          label="Total Bookings"
          value={loading ? '...' : totalCount}
          icon="📋"
          subtitle="All client reservations"
          color="#19b6a6"
        />
        <SummaryCard
          label="Confirmed"
          value={loading ? '...' : confirmedCount}
          icon="✅"
          subtitle="Ready for travel"
          color="#10b981"
        />
        <SummaryCard
          label="Pending"
          value={loading ? '...' : pendingCount}
          icon="⏳"
          subtitle="Under review"
          color="#f59e0b"
        />
        <SummaryCard
          label="Total Client Billing"
          value={loading ? '...' : `$${totalBilled.toLocaleString()}`}
          icon="💰"
          subtitle="Gross retail booked"
          color="#3b82f6"
        />
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
        {/* Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '16px',
          }}
        >
          <div style={{ minWidth: '260px', flex: '1 1 260px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search by booking ID, service name..."
              className="form-control"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
            Loading agency bookings...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🎫</div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              No bookings recorded
            </h4>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              No client bookings match your selected criteria.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Booking ID</th>
                  <th style={{ padding: '10px 12px' }}>Service / Tour</th>
                  <th style={{ padding: '10px 12px' }}>Booking Date</th>
                  <th style={{ padding: '10px 12px' }}>Retail Amount</th>
                  <th style={{ padding: '10px 12px' }}>Est. Commission</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const amt = Number(b.amount) || 0;
                  const comm = amt * (commissionRate / 100);

                  return (
                    <tr key={b.bookingId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#19b6a6' }}>
                        BK00{b.bookingId}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.service}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Trip Reference #{b.tripId} · {b.type || 'Package'}
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--muted)', fontSize: '13px' }}>
                        {b.bookingDate || 'N/A'}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>
                        ${amt.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#059669' }}>
                        +${comm.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge status={b.status || 'Confirmed'} />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(b)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          👁 Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          isOpen={Boolean(selectedBooking)}
          booking={selectedBooking}
          commissionRate={commissionRate}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}
