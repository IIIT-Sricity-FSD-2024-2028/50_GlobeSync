import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSession } from '../../context/SessionContext';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { fetchTravelerTrips } from '../../store/travelerTrips/travelerTrips-actions';
import { travelerBookingsActions } from '../../store/travelerBookings/travelerBookings-slice';
import {
  fetchTravelerBookings,
  cancelTravelerBooking,
  confirmBookingTripStatus,
  submitTravelerReview,
} from '../../store/travelerBookings/travelerBookings-actions';
import BookingList from '../../components/bookings/BookingList';
import BookingStats from '../../components/bookings/BookingStats';
import PaymentModal from '../../components/bookings/PaymentModal';
import BookingDetailModal from '../../components/bookings/BookingDetailModal';
import BookingCancelModal from '../../components/bookings/BookingCancelModal';
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
  // 1. Session / Dispatch
  const { user } = useSession();
  const dispatch = useDispatch();
  const travelerId = Number(user?.travelerId || user?.traveler_id || user?.id);

  // 2. Redux Selectors
  const { bookings, reviewedBookingIds, loading, error } = useSelector(
    (state) => state.travelerBookings
  );
  const { trips } = useSelector((state) => state.travelerTrips);

  // 3. Local UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [payingBooking, setPayingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const [cancelBookingError, setCancelBookingError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [partialTripRecovery, setPartialTripRecovery] = useState(null);
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewForm, setReviewForm] = useState({ tripRating: 5, guideRating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // 4. Data Fetching & Realtime Listeners
  const loadData = () => {
    if (travelerId) {
      dispatch(fetchTravelerBookings(travelerId));
      dispatch(fetchTravelerTrips(travelerId));
    }
  };

  useEffect(() => {
    loadData();
  }, [dispatch, travelerId]);

  const showToast = (msg, type = 'success') => {
    setToastType(type);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Realtime updates without full page reload
  useRealtimeEvent('booking.status_changed', (event) => {
    if (event?.bookingId) {
      dispatch(travelerBookingsActions.updateBooking({ bookingId: event.bookingId, status: event.status }));
      if (travelerId) dispatch(fetchTravelerBookings(travelerId));
      showToast(`⚡ Live Update: Booking #${event.bookingId} is now ${event.status}`, 'success');
    }
  });

  useRealtimeEvent('refund.processed', (event) => {
    if (event?.bookingId) {
      const amount = event.refundAmountMinor ? `₹${(event.refundAmountMinor / 100).toFixed(2)}` : '';
      if (travelerId) dispatch(fetchTravelerBookings(travelerId));
      showToast(`💰 Live: Refund ${amount} processed for Booking #${event.bookingId}`, 'success');
    }
  });

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
    dispatch(travelerBookingsActions.updateBooking(updatedBooking));

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
      await dispatch(confirmBookingTripStatus(tripId));
      setPartialTripRecovery(null);
      setActionMessage(`Trip #${tripId} status confirmed successfully!`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('[TravelerBookingsPage] Trip confirmation retry failed:', err);
      showToast(`Trip confirmation retry failed: ${err.message}`, 'error');
    }
  };

  const handleCancelBooking = (booking) => {
    setCancellingBooking(booking);
    setCancelBookingError(null);
  };

  const handleConfirmCancelBooking = async (booking, cancellationReason) => {
    const bookingId = Number(booking.bookingId || booking.id);
    setIsCancellingBooking(true);
    setCancelBookingError(null);

    try {
      // Cancellation always goes through the server policy (12-hour rule, refund tiers).
      // A failure is shown to the traveler instead of being bypassed with a status edit.
      await dispatch(cancelTravelerBooking(bookingId, cancellationReason));

      setCancellingBooking(null);
      showToast(`Booking BK00${bookingId} cancelled successfully.`);
    } catch (err) {
      console.error('[TravelerBookingsPage] Cancel failed:', err);
      setCancelBookingError(err.message || 'Could not cancel booking.');
    } finally {
      setIsCancellingBooking(false);
    }
  };

  // Review Handlers (only allowed for COMPLETED bookings, once per booking)
  const handleWriteReview = (booking) => {
    setReviewingBooking(booking);
    setReviewForm({ tripRating: 5, guideRating: 5, comment: '' });
    setReviewError(null);
  };

  const handleSubmitReview = async (e) => {
    if (e) e.preventDefault();
    if (!reviewingBooking) return;
    if (!reviewForm.comment.trim()) {
      setReviewError('Please share a few words about your experience.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);

    const bookingId = Number(reviewingBooking.bookingId || reviewingBooking.id);
    const trip = trips.find((t) => (t.tripId || t.id) === reviewingBooking.tripId);
    const guideId = Number(reviewingBooking.guideId || trip?.guideId) || undefined;

    try {
      await dispatch(
        submitTravelerReview({
          bookingId,
          tripId: reviewingBooking.tripId,
          travelerId,
          guideId,
          tripRating: Number(reviewForm.tripRating),
          guideRating: Number(reviewForm.guideRating),
          comment: reviewForm.comment.trim(),
        })
      );

      setReviewingBooking(null);
      showToast('Thank you! Your verified review has been submitted. ⭐', 'success');
    } catch (err) {
      console.error('[TravelerBookingsPage] Submit review failed:', err);
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
      <BookingStats />

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
          onWriteReview={handleWriteReview}
          reviewedBookingIds={reviewedBookingIds}
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

      {/* Controlled Booking Cancellation Modal with Reason */}
      {cancellingBooking && (
        <BookingCancelModal
          isOpen={Boolean(cancellingBooking)}
          booking={cancellingBooking}
          onClose={() => {
            setCancellingBooking(null);
            setCancelBookingError(null);
          }}
          onConfirm={handleConfirmCancelBooking}
          isCancelling={isCancellingBooking}
          error={cancelBookingError}
        />
      )}

      {/* Controlled Write Review Modal */}
      {reviewingBooking && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '28px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800 }}>
              ⭐ Review Your Completed Booking
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              BK00{reviewingBooking.bookingId || reviewingBooking.id} • {reviewingBooking.service} ({reviewingBooking.type})
            </p>

            {reviewError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '12px', marginBottom: '14px' }}>
                ⚠️ {reviewError}
              </div>
            )}

            <form onSubmit={handleSubmitReview}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Trip Experience (1-5)
                  </label>
                  <select
                    value={reviewForm.tripRating}
                    onChange={(e) => setReviewForm({ ...reviewForm, tripRating: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 - Exceptional)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 - Very Good)</option>
                    <option value={3}>⭐⭐⭐ (3 - Average)</option>
                    <option value={2}>⭐⭐ (2 - Poor)</option>
                    <option value={1}>⭐ (1 - Terrible)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Guide Rating (1-5)
                  </label>
                  <select
                    value={reviewForm.guideRating}
                    onChange={(e) => setReviewForm({ ...reviewForm, guideRating: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 - Exceptional)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 - Very Good)</option>
                    <option value={3}>⭐⭐⭐ (3 - Average)</option>
                    <option value={2}>⭐⭐ (2 - Poor)</option>
                    <option value={1}>⭐ (1 - Terrible)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Your Review / Testimonial *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell other travelers about your experience, the tour guide, and key highlights..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => setReviewingBooking(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--primary, #0284c7)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isSubmittingReview ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Verified Review ⭐'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
