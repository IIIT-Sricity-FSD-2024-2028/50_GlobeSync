import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { supportTicketsApi, bookingsApi } from '../../services/api';
import TicketForm from '../../components/support/TicketForm';
import TicketList from '../../components/support/TicketList';

/**
 * TravelerSupportPage: Traveler customer support portal.
 * 
 * Responsibilities:
 * - Loads traveler's support tickets via GET /support-tickets/traveler/:travelerId
 * - Loads traveler's bookings via GET /bookings/traveler/:travelerId for linking exceptions
 * - Provides controlled ticket creation via TicketForm (POST /support-tickets)
 * - Renders TicketList with search, status filtering, and priority indicators
 * - Provides clear manual refresh mechanism without WebSocket or polling complexity
 */
export default function TravelerSupportPage() {
  const { user } = useSession();
  const travelerId = Number(user?.travelerId || user?.traveler_id || user?.id);

  const [tickets, setTickets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingsWarning, setBookingsWarning] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  const loadData = async (signal) => {
    if (!travelerId) {
      setLoading(false);
      setError('No authenticated traveler session found. Please log in.');
      return;
    }

    setLoading(true);
    setError(null);
    setBookingsWarning(null);

    try {
      // Parallel loading distinguishing required tickets from optional bookings
      const [ticketsRes, bookingsRes] = await Promise.allSettled([
        supportTicketsApi.getByTraveler(travelerId, { signal }),
        bookingsApi.getByTraveler(travelerId, { signal }),
      ]);

      if (signal?.aborted) return;

      // 1. Primary Required: Support Tickets
      if (ticketsRes.status === 'fulfilled') {
        setTickets(Array.isArray(ticketsRes.value) ? ticketsRes.value : []);
      } else if (!ticketsRes.reason?.isCancelled) {
        setError(ticketsRes.reason?.message || 'Failed to load support tickets from backend.');
      }

      // 2. Secondary Optional: Bookings for linking exceptions
      if (bookingsRes.status === 'fulfilled') {
        setBookings(Array.isArray(bookingsRes.value) ? bookingsRes.value : []);
        setBookingsWarning(null);
      } else if (!bookingsRes.reason?.isCancelled) {
        setBookings([]);
        if (ticketsRes.status === 'fulfilled') {
          setBookingsWarning(
            'Your travel bookings list is temporarily unavailable. You can still submit support tickets without linking a booking.'
          );
        }
      }
    } catch (err) {
      if (!err.isCancelled && !signal?.aborted) {
        console.error('[TravelerSupportPage] Error loading support data:', err);
        setError(err.message || 'Failed to load support records from backend.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const retryBookings = async () => {
    try {
      const data = await bookingsApi.getByTraveler(travelerId);
      setBookings(Array.isArray(data) ? data : []);
      setBookingsWarning(null);
    } catch (err) {
      console.warn('[SupportPage] Retry bookings failed:', err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [travelerId]);

  // Handler: Child callback when TicketForm creates a new ticket
  const handleTicketCreated = (newTicket) => {
    // Immutable append of newly created ticket to the tickets state
    setTickets((prev) => [newTicket, ...prev]);
    setSuccessBanner(`Support Ticket #TICK-${newTicket.ticketId} has been submitted successfully!`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const openTicketsCount = tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;
  const resolvedTicketsCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

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
            onClick={() => loadData()}
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
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
            onTicketCreated={handleTicketCreated}
          />
        </div>

        {/* Right: Ticket List and FAQ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <TicketList
            tickets={tickets}
            isLoading={loading}
            onRefresh={() => loadData()}
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
