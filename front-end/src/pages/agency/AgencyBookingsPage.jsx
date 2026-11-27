import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { tripsApi } from '../../services/api';
import { useResource } from '../../store/hooks';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';
import BookingDetailModal from '../../components/agency/BookingDetailModal';
import AgencyDayActivitiesModal from '../../components/agency/AgencyDayActivitiesModal';

/**
 * AgencyBookingsPage
 * 
 * Lists and inspects client bookings made by this agency.
 * Displays booking financial breakdowns, payment status/reference, net settlement,
 * passenger counts, commission, and inspection/reconciliation dialogs.
 */
export default function AgencyBookingsPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTripId = searchParams.get('tripId');
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);
  const agencyResource = useResource('agencies', { scope: 'getById', id: agencyId }, { load: Boolean(agencyId) });
  const bookingResource = useResource('bookings', { scope: 'getByAgency', id: agencyId }, { load: Boolean(agencyId) });
  const tripResource = useResource('trips', { scope: 'getByAgency', id: agencyId }, { load: Boolean(agencyId) });
  const paymentResource = useResource('payments', { scope: 'getByAgency', id: agencyId }, { load: Boolean(agencyId) });
  const commissionRate = Number(agencyResource.items[0]?.commissionRate ?? user?.commissionRate ?? 1.5);
  const bookings = bookingResource.items;
  const trips = tripResource.items;
  const payments = paymentResource.items;
  const loading = bookingResource.status === 'loading';
  const error = bookingResource.error || tripResource.error || paymentResource.error || agencyResource.error;

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState(initialTripId ? String(initialTripId) : '');

  // Modals
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activitiesTrip, setActivitiesTrip] = useState(null);
  const [loadingTripId, setLoadingTripId] = useState(null);

  const handleOpenActivities = async (b) => {
    if (!b.tripId) return;
    setLoadingTripId(b.bookingId);
    try {
      const tripData = await tripsApi.getById(b.tripId);
      setActivitiesTrip(tripData);
    } catch (err) {
      console.warn('Could not load full trip, using booking reference:', err);
      setActivitiesTrip({
        tripId: b.tripId,
        destination: b.service || 'Client Tour',
        status: b.status || 'Confirmed',
        startDate: b.bookingDate,
      });
    } finally {
      setLoadingTripId(null);
    }
  };

  const loadBookings = () => Promise.all([
    bookingResource.refresh(),
    tripResource.refresh(),
    paymentResource.refresh(),
    agencyResource.refresh(),
  ]);

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard
          title="Total Bookings"
          value={loading ? '...' : totalCount}
          icon="📋"
          subtitle="All client reservations"
          color="#19b6a6"
        />
        <SummaryCard
          title="Confirmed"
          value={loading ? '...' : confirmedCount}
          icon="✅"
          subtitle="Ready for travel"
          color="#10b981"
        />
        <SummaryCard
          title="Pending"
          value={loading ? '...' : pendingCount}
          icon="⏳"
          subtitle="Under review"
          color="#f59e0b"
        />
        <SummaryCard
          title="Total Client Billing"
          value={loading ? '...' : `₹${totalBilled.toLocaleString('en-IN')}`}
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
                  <th style={{ padding: '10px 12px' }}>Commission / Net</th>
                  <th style={{ padding: '10px 12px' }}>Payment & Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const amt = Number(b.amount) || 0;
                  const comm = Math.round(amt * (commissionRate / 100));
                  const netSettlement = amt - comm;
                  const linkedTrip = trips.find((t) => Number(t.tripId) === Number(b.tripId));
                  const linkedPayment = payments.find((p) => Number(p.bookingId) === Number(b.bookingId));
                  const passengerCount = linkedTrip?.travelersCount || linkedTrip?.passengerIds?.length || 1;
                  const isPaid = ['CONFIRMED', 'PAID', 'COMPLETED'].includes(String(b.status || '').toUpperCase()) || linkedPayment?.status === 'Paid';

                  return (
                    <tr key={b.bookingId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#19b6a6' }}>
                        BK00{b.bookingId}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.service}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Trip #{b.tripId} · {b.type || 'Package'} · 👥 {passengerCount} {passengerCount === 1 ? 'Passenger' : 'Passengers'}
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--muted)', fontSize: '13px' }}>
                        {b.bookingDate || 'N/A'}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>
                        <div>₹{amt.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '11px', color: isPaid ? '#059669' : '#d97706', fontWeight: 600 }}>
                          {isPaid ? `Paid (Due: ₹0)` : `Outstanding: ₹${netSettlement.toLocaleString('en-IN')}`}
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#059669' }}>
                        <div>+₹{comm.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                          Net: ₹{netSettlement.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge status={b.status || 'Confirmed'} />
                        {linkedPayment && (
                          <div style={{ fontSize: '11px', color: '#0f766e', marginTop: '3px', fontWeight: 600 }}>
                            PAY-{linkedPayment.paymentId} ({linkedPayment.method})
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                          {b.tripId && (
                            <button
                              type="button"
                              onClick={() => navigate('/agency/trips')}
                              style={{
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              🗺️ View Trip
                            </button>
                          )}
                          {b.tripId && (
                            <button
                              type="button"
                              onClick={() => handleOpenActivities(b)}
                              disabled={loadingTripId === b.bookingId}
                              style={{
                                background: '#f0fdfa',
                                color: '#0f766e',
                                border: '1px solid #99f6e4',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {loadingTripId === b.bookingId ? 'Loading...' : '📅 Activities'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(b)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                          >
                            👁 Inspect
                          </button>
                        </div>
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
          onBookingUpdated={() => loadBookings()}
        />
      )}

      {/* Day Activities Modal */}
      {activitiesTrip && (
        <AgencyDayActivitiesModal
          isOpen={Boolean(activitiesTrip)}
          trip={activitiesTrip}
          onClose={() => setActivitiesTrip(null)}
          onSuccess={() => loadBookings()}
        />
      )}
    </div>
  );
}
