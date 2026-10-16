import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { bookingsApi, tripsApi } from '../../services/api';
import BookingList from '../../components/bookings/BookingList';
import BookingStats from '../../components/bookings/BookingStats';
import PaymentModal from '../../components/bookings/PaymentModal';
import BookingDetailModal from '../../components/bookings/BookingDetailModal';
import Toast from '../../components/common/Toast';

/**
 * TravelerBookingsPage: Comprehensive bookings management and payment execution portal for travelers.
 * 
 * State Ownership:
 * - bookings: List of all booking items owned by the authenticated traveler
 * - trips: Contextual list of trips used to display destination labels
 * - Filter state: searchQuery, typeFilter, statusFilter (derived filtering in render)
 * - Modal state: payingBooking (PaymentModal), viewingBooking (BookingDetailModal)
 */
export default function TravelerBookingsPage() {
  const { user } = useSession();
  const travelerId = Number(user?.travelerId || user?.traveler_id || user?.id);

  // 1. Primary Data State
  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // 3. Modal Dialog State
  const [payingBooking, setPayingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);

  // 4. Feedback & Partial Success Recovery State
  const [actionMessage, setActionMessage] = useState(null);
  const [partialTripRecovery, setPartialTripRecovery] = useState(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastType(type);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Data Loading: Distinguishes required bookings from optional trip context
  const loadData = async (signal) => {
    if (!travelerId) {
      setLoading(false);
      setError('No authenticated traveler ID found. Please log in.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [bookingsRes, tripsRes] = await Promise.allSettled([
        bookingsApi.getByTraveler(travelerId, { signal }),
        tripsApi.getByTraveler(travelerId, { signal }),
      ]);

      if (signal?.aborted) return;

      // 1. Required: Bookings
      if (bookingsRes.status === 'fulfilled') {
        setBookings(Array.isArray(bookingsRes.value) ? bookingsRes.value : []);
      } else if (!bookingsRes.reason?.isCancelled) {
        console.error('[TravelerBookingsPage] Failed to load bookings:', bookingsRes.reason);
        setError(bookingsRes.reason?.message || 'Failed to load booking records from backend.');
      }

      // 2. Optional: Trip context for displaying destination names
      if (tripsRes.status === 'fulfilled') {
        setTrips(Array.isArray(tripsRes.value) ? tripsRes.value : []);
      } else {
        setTrips([]);
      }
    } catch (err) {
      if (!err.isCancelled && !signal?.aborted) {
        console.error('[TravelerBookingsPage] Unexpected error loading bookings:', err);
        setError(err.message || 'Failed to load booking records from backend.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [travelerId]);

  // Derived filtered bookings list during render (no duplicate state)
  const filteredBookings = bookings.filter((b) => {
    const matchesType = typeFilter === 'ALL' || b.type?.toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus = statusFilter === 'ALL' || b.status?.toLowerCase() === statusFilter.toLowerCase();

    const q = searchQuery.trim().toLowerCase();
    const service = (b.service || '').toLowerCase();
    const idStr = String(b.bookingId || b.id || '');
    const matchesSearch = !q || service.includes(q) || idStr.includes(q);

    return matchesType && matchesStatus && matchesSearch;
  });

  const hasActiveFilters = searchQuery.trim().length > 0 || typeFilter !== 'ALL' || statusFilter !== 'ALL';

  // Named Handlers
  const handleRefresh = () => {
    loadData();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
  };

  const handlePaymentSuccess = (updatedBooking, paymentRecord, meta = {}) => {
    // Immutable update replacing confirmed booking
    setBookings((prev) =>
      prev.map((b) =>
        (b.bookingId || b.id) === (updatedBooking.bookingId || updatedBooking.id)
          ? updatedBooking
          : b
      )
    );

    const isRec = Boolean(meta?.isRecovered);
    const amountStr = Number(paymentRecord?.amount || updatedBooking.amount).toLocaleString('en-IN');
    const paymentIdStr = paymentRecord?.paymentId ? ` (Payment #${paymentRecord.paymentId})` : '';

    if (isRec) {
      setActionMessage(
        `Recovered existing payment of ₹${amountStr}${paymentIdStr}! Booking BK00${updatedBooking.bookingId} is Confirmed.`
      );
    } else {
      setActionMessage(
        `Payment of ₹${amountStr}${paymentIdStr} confirmed! Booking BK00${updatedBooking.bookingId} is now Confirmed.`
      );
    }

    if (meta?.tripConfirmationError) {
      setPartialTripRecovery({
        tripId: updatedBooking.tripId,
        bookingId: updatedBooking.bookingId,
        error: meta.tripConfirmationError,
      });
    } else {
      setPartialTripRecovery(null);
    }

    setTimeout(() => {
      setActionMessage(null);
    }, 5000);
  };

  const handleRetryTripFromBanner = async () => {
    if (!partialTripRecovery) return;
    const { tripId } = partialTripRecovery;
    try {
      const currentTrip = await tripsApi.getById(tripId);
      // Respect finite state machine: Planning -> Pending -> Confirmed
      if (currentTrip.status === 'Planning') {
        await tripsApi.updateStatus(tripId, 'Pending');
      }
      await tripsApi.updateStatus(tripId, 'Confirmed');

      setTrips((prev) =>
        prev.map((t) => (t.tripId === tripId ? { ...t, status: 'Confirmed' } : t))
      );
      setPartialTripRecovery(null);
      setActionMessage(`Trip #${tripId} status confirmed successfully!`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('[TravelerBookingsPage] Trip confirmation retry failed:', err);
      showToast(`Trip confirmation retry failed: ${err.message}`, 'error');
    }
  };

  const handleCancelBooking = async (booking) => {
    const bookingId = Number(booking.bookingId || booking.id);
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel booking: "${booking.service}" (BK00${bookingId})?`
    );
    if (!confirmCancel) return;

    try {
      const payload = {
        bookingDate: booking.bookingDate,
        tripId: booking.tripId,
        travelerId: booking.travelerId,
        service: booking.service,
        type: booking.type,
        amount: booking.amount,
        status: 'Cancelled',
      };

      await bookingsApi.update(bookingId, payload);

      setBookings((prev) =>
        prev.map((b) => ((b.bookingId || b.id) === bookingId ? { ...b, status: 'Cancelled' } : b))
      );

      setActionMessage(`Booking BK00${bookingId} has been cancelled.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('[TravelerBookingsPage] Cancel failed:', err);
      showToast(`Could not cancel booking: ${err.message}`, 'error');
    }
  };

  // Derived financial metrics
  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const confirmedCount = bookings.filter((b) => b.status === 'Confirmed').length;
  const pendingCount = bookings.filter((b) => b.status === 'Pending').length;

  return (
    <div className="traveler-bookings-page">
      {/* Page Header */}
      <div className="traveler-page-header">
        <div>
          <h2 className="traveler-page-header-title">My Travel Bookings 🎫</h2>
          <p className="traveler-page-header-subtitle">
            Review reserved flights, hotels, and transit, process pending payments, or view transaction history.
          </p>
        </div>

        <div className="traveler-page-header-actions">
          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-secondary"
            title="Refresh bookings from backend"
          >
            ↻ Refresh Records
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionMessage && (
        <div className="feedback-banner success">
          <span>✓ {actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="feedback-banner-close"
          >
            ✕
          </button>
        </div>
      )}

      {/* Partial Success Warning Banner (Trip Confirmation Retry) */}
      {partialTripRecovery && (
        <div
          className="feedback-banner warning"
          style={{
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            color: '#92400e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            padding: '12px 18px',
            borderRadius: '10px',
            lineHeight: 1.5,
          }}
        >
          <div>
            <strong>⚠️ Partial Success:</strong> Payment for Booking BK00{partialTripRecovery.bookingId} is confirmed,
            but Trip #{partialTripRecovery.tripId} status update could not be completed ({partialTripRecovery.error}).
            <strong> No additional payment will be charged.</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
            <button
              type="button"
              onClick={handleRetryTripFromBanner}
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              Retry Trip Confirmation ↺
            </button>
            <button
              type="button"
              onClick={() => setPartialTripRecovery(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#92400e' }}
              title="Dismiss warning"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* High-level KPI Cards Component */}
      <BookingStats
        totalCount={bookings.length}
        totalAmount={totalAmount}
        confirmedCount={confirmedCount}
        pendingCount={pendingCount}
      />

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search bookings by service name or BK ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ border: 'none', background: 'transparent' }}
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              background: '#fff',
            }}
          >
            <option value="ALL">All Types</option>
            <option value="Flight">✈️ Flights</option>
            <option value="Hotel">🏨 Hotels</option>
            <option value="Transport">🚌 Transport</option>
            <option value="Activity">🎯 Activities</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              background: '#fff',
            }}
          >
            <option value="ALL">All Status</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 600 }}
            >
              Reset Filters ↺
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="state-box">
          <div className="state-box-icon">⏳</div>
          <h3 className="state-box-title">Loading your travel bookings...</h3>
          <p className="state-box-text">Fetching reservations from the backend...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          className="card"
          style={{
            padding: '28px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '16px',
            textAlign: 'center',
            color: '#991b1b',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
          <h4 style={{ fontSize: '17px', fontWeight: 800 }}>Failed to load bookings</h4>
          <p style={{ fontSize: '14px', margin: '8px 0 16px' }}>{error}</p>
          <button type="button" onClick={handleRefresh} className="btn btn-primary">
            Retry Connection ↺
          </button>
        </div>
      )}

      {/* Bookings Table List */}
      {!loading && !error && (
        <BookingList
          bookings={filteredBookings}
          trips={trips}
          onPayNow={(booking) => setPayingBooking(booking)}
          onView={(booking) => setViewingBooking(booking)}
          onCancel={handleCancelBooking}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Controlled Payment Modal */}
      {payingBooking && (
        <PaymentModal
          key={`payment-${payingBooking.bookingId || payingBooking.id}`}
          isOpen={Boolean(payingBooking)}
          booking={payingBooking}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={() => setPayingBooking(null)}
        />
      )}

      {/* Booking Detail & Payment History Ledger Modal */}
      {viewingBooking && (
        <BookingDetailModal
          isOpen={Boolean(viewingBooking)}
          booking={viewingBooking}
          trip={trips.find((t) => (t.tripId || t.id) === viewingBooking.tripId)}
          onClose={() => setViewingBooking(null)}
          onPayNow={(b) => {
            setViewingBooking(null);
            setPayingBooking(b);
          }}
        />
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage('')}
      />
    </div>
  );
}
