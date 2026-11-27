import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSession } from '../../context/SessionContext';
import { fetchTravelerTickets, createTravelerTicket } from '../../store/travelerSupport/travelerSupport-actions';
import { fetchTravelerBookings } from '../../store/travelerBookings/travelerBookings-actions';
import TicketForm from '../../components/support/TicketForm';
import TicketList from '../../components/support/TicketList';

export default function TravelerSupportPage() {
  // 1. Router / Session / Dispatch
  const { user } = useSession();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const travelerId = Number(user?.travelerId || user?.traveler_id || user?.id);

  // 2. Redux Selectors
  const { tickets, loading, error } = useSelector((state) => state.travelerSupport);
  const { bookings } = useSelector((state) => state.travelerBookings);

  // 3. Local UI State
  const [bookingsWarning, setBookingsWarning] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // 4. Data Fetching
  useEffect(() => {
    if (travelerId) {
      dispatch(fetchTravelerTickets(travelerId));
      dispatch(fetchTravelerBookings(travelerId));
    }
  }, [dispatch, travelerId]);

  // 5. Event Handlers
  const retryBookings = async () => {
    try {
      await dispatch(fetchTravelerBookings(travelerId));
      setBookingsWarning(null);
    } catch (err) {
      console.warn('[SupportPage] Retry bookings failed:', err);
    }
  };

  // Handler: Child callback when TicketForm creates a new ticket
  const handleTicketCreated = (newTicket) => {
    setSuccessBanner(`Support Ticket #TICK-${newTicket.ticketId} has been submitted successfully!`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleCreateTicket = async (payload) => {
    return dispatch(createTravelerTicket(payload));
  };

  const openTicketsCount = tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;
  const resolvedTicketsCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  const supportPrefill = useMemo(() => {
    const qBookingId = searchParams.get('bookingId');
    const qTripId = searchParams.get('tripId');
    const qIssueType = searchParams.get('issueType');
    const qReason = searchParams.get('reason');
    const qNotes = searchParams.get('notes');
    if (!qBookingId && !qTripId && !qIssueType) return null;

    // Derive authoritative booking metadata strictly from backend-owned bookings list
    const ownedBooking = qBookingId
      ? bookings.find((b) => String(b.bookingId) === String(qBookingId))
      : null;

    const lines = [];
    if (ownedBooking) {
      lines.push(`Booking Reference: BK#${ownedBooking.bookingId} — ${ownedBooking.service} (${ownedBooking.type})`);
      lines.push(`Booking Status: ${ownedBooking.status} | Amount: ₹${Number(ownedBooking.amount || 0).toLocaleString('en-IN')}`);
      if (ownedBooking.departureAtUtc || ownedBooking.departure_at_utc || ownedBooking.bookingDate) {
        lines.push(`Scheduled Date/Time: ${ownedBooking.departureAtUtc || ownedBooking.departure_at_utc || ownedBooking.bookingDate}`);
      }
      if (ownedBooking.tripId) lines.push(`Related Trip: #${ownedBooking.tripId}`);
    } else if (qTripId) {
      lines.push(`Related Trip: #${qTripId}`);
    }
    lines.push('Restriction: Ordinary cancellation window (<12 hours) has closed.');
    if (qReason) lines.push(`Requested Reason: ${qReason}`);
    if (qNotes) lines.push(`Additional Details: ${qNotes}`);
    lines.push('Note: Request is subject to Support review under GlobeSync cancellation policy.');

    return {
      category: qIssueType === 'Cancellation Assistance' ? 'Cancellation Assistance' : 'Booking Issue',
      priority: 'High',
      bookingId: ownedBooking ? String(ownedBooking.bookingId) : '',
      subject: ownedBooking
        ? `Cancellation Assistance — BK#${ownedBooking.bookingId} (${ownedBooking.service})`
        : qTripId
          ? `Cancellation Assistance — Trip #${qTripId}`
          : 'Cancellation Assistance Request',
      description: lines.join('\n'),
    };
  }, [searchParams, bookings]);

  return (
    <div className="traveler-support-page">
      {/* Hero Support Banner */}
      <div
        style={{
          background: 'var(--gradient, linear-gradient(135deg, #E8467C 0%, #F5A623 100%))',
          borderRadius: '20px',
          padding: '32px 36px',
          color: '#fff',
          marginBottom: '28px',
          boxShadow: '0 10px 25px rgba(232, 70, 124, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            🛡️ 24/7 Traveler Helpdesk
          </span>
          <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '10px 0 6px 0' }}>
            Support & Resolution Center
          </h2>
          <p style={{ opacity: 0.95, fontSize: '14px', maxWidth: '560px', margin: 0, lineHeight: 1.5 }}>
            Have a question regarding your itinerary, flight dates, guide communication, or refund requests? Submit an inquiry and our care team will resolve it.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              padding: '12px 18px',
              borderRadius: '12px',
              minWidth: '110px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{openTicketsCount}</div>
            <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600 }}>Active Tickets</div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              padding: '12px 18px',
              borderRadius: '12px',
              minWidth: '110px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{resolvedTicketsCount}</div>
            <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600 }}>Resolved Cases</div>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="feedback-banner success" style={{ marginBottom: '24px' }}>
          <span>✓ {successBanner}</span>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="feedback-banner-close"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '24px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '14px',
            color: '#991b1b',
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
          <h4 style={{ fontSize: '16px', fontWeight: 700 }}>Connection Error</h4>
          <p style={{ fontSize: '13px', margin: '4px 0 14px' }}>{error}</p>
          <button
            type="button"
            onClick={() => dispatch(fetchTravelerTickets(travelerId))}
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            Retry Connection ↺
          </button>
        </div>
      )}

      {/* Main Grid: Ticket Form & Ticket List */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
          gap: '28px',
          alignItems: 'start',
        }}
      >
        {/* Left: Controlled Ticket Creation Form */}
        <div>
          {bookingsWarning && (
            <div
              style={{
                padding: '12px 16px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '13px', color: '#92400e' }}>
                <strong>⚠️ Bookings Notice:</strong> {bookingsWarning}
              </div>
              <button
                type="button"
                onClick={() => retryBookings()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#b45309',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '12px',
                  textDecoration: 'underline',
                }}
              >
                Retry Bookings ↺
              </button>
            </div>
          )}
          <TicketForm
            travelerId={travelerId}
            bookings={bookings}
            initialContext={supportPrefill}
            onTicketCreated={handleTicketCreated}
            onSubmitTicket={handleCreateTicket}
          />
        </div>

        {/* Right: Ticket List and FAQ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <TicketList
            tickets={tickets}
            travelerName={user?.name || 'Traveler'}
            isLoading={loading}
            onRefresh={() => dispatch(fetchTravelerTickets(travelerId))}
          />

          {/* Frequently Asked Questions Card */}
          <div
            className="card"
            style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '24px',
            }}
          >
            <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
              ❓ Frequently Asked Questions
            </h4>

            <div style={{ marginBottom: '14px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                📌 How do I follow up on a refund request?
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                Refunds are tracked by the finance desk. Select "Refund Request" when creating a ticket and link the affected Booking ID.
              </div>
            </div>

            <div style={{ marginBottom: '14px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                📌 What constitutes an urgent disruption?
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                Urgent priority is reserved for flights departing within 12 hours, missed connections, or guide emergencies during ongoing tours.
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                📌 Can I talk directly to my tour guide?
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                Yes! For daily itineraries and local logistics, visit the <strong>Messages</strong> tab to chat directly with your assigned guide.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
