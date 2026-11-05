import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from '../../context/SessionContext';
import { supportTicketsApi, agencyApi, tripsApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';
import Toast from '../../components/common/Toast';

const ISSUE_TYPES = [
  'Commission Query',
  'Booking Discrepancy',
  'Payment & Billing Question',
  'Passenger Roster Correction',
  'Cancellation & Refund Assistance',
  'Guide Reassignment',
  'Technical Issue',
];

const FAQS = [
  {
    q: 'When are agency reseller commissions settled?',
    a: 'Commissions remain in PENDING status while client trips are ongoing, and automatically transition to EARNED/SETTLED upon payment confirmation and tour completion.',
  },
  {
    q: 'How does client passenger insurance work for agency bookings?',
    a: 'Every client passenger booked through GlobeSync includes mandatory travel insurance at a flat platform rate of 7% of base fare. Optional cancellation protection is calculated at 5% of base fare.',
  },
  {
    q: 'Can our agency update passenger roster passport numbers post-booking?',
    a: 'Yes, you can edit passenger documentation, contact information, and medical notes at any time from your Passenger Roster screen prior to trip departure.',
  },
  {
    q: 'Are live bank transfers made when confirming client demo bookings?',
    a: 'No. All transaction entries in this demo environment reflect simulated corporate invoices. No real credit card or bank funds are moved.',
  },
];

/**
 * AgencySupportPage
 * 
 * Manages partner tickets with customer care desk, enables raising tickets linked to
 * specific client trips with priority levels, and provides an end-to-end 2-way conversation thread.
 */
export default function AgencySupportPage() {
  const { user } = useSession();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [tickets, setTickets] = useState([]);
  const [agencyTrips, setAgencyTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // New ticket modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [priority, setPriority] = useState('Medium');
  const [selectedTripId, setSelectedTripId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Conversation thread view
  const [activeTicket, setActiveTicket] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef(null);

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsData, tripsData] = await Promise.all([
        supportTicketsApi.getByAgency(agencyId, { signal }).catch(() => []),
        tripsApi.getByAgency(agencyId, { signal }).catch(() => []),
      ]);

      if (!signal?.aborted) {
        setTickets(Array.isArray(ticketsData) ? ticketsData : []);
        setAgencyTrips(Array.isArray(tripsData) ? tripsData : []);
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Failed to load agency tickets:', err);
        setError(err.message || 'Failed to load support tickets.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (agencyId) {
      loadData(controller.signal);
    }
    return () => controller.abort();
  }, [agencyId]);

  // Scroll conversation to bottom on update
  useEffect(() => {
    if (activeTicket && messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [activeTicket, activeTicket?.replies]);

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length,
    [tickets]
  );
  const resolvedCount = useMemo(
    () => tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length,
    [tickets]
  );

  // Open conversation thread modal
  const handleOpenThread = async (ticket) => {
    const ticketId = ticket.ticketId || ticket.id;
    setActiveTicket(ticket);
    setThreadLoading(true);
    try {
      const fullTicket = await agencyApi.getTicketThread(ticketId);
      if (fullTicket) {
        setActiveTicket(fullTicket);
      }
    } catch (err) {
      console.warn('Could not fetch updated thread from backend, using cached:', err);
    } finally {
      setThreadLoading(false);
    }
  };

  // Submit new ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setSubmitError('Please describe the inquiry or issue details.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        agencyId,
        tripId: selectedTripId ? Number(selectedTripId) : null,
        issueType,
        priority,
        description: description.trim(),
        status: 'Open',
      };

      const created = await supportTicketsApi.create(payload);
      setShowCreateModal(false);
      setDescription('');
      setSelectedTripId('');
      setPriority('Medium');
      setIssueType(ISSUE_TYPES[0]);

      setToast({
        message: `Support ticket #${created.ticketId || created.id || 'new'} opened successfully!`,
        type: 'success',
      });

      // Reload tickets
      const controller = new AbortController();
      loadData(controller.signal);
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      setSubmitError(err.message || 'Failed to submit ticket to customer support desk.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit reply into conversation thread
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeTicket) return;

    setSendingReply(true);
    const ticketId = activeTicket.ticketId || activeTicket.id;
    const senderName = user?.businessName || user?.name || 'Horizon Travel Agency';

    try {
      const updatedTicket = await agencyApi.replyTicket(ticketId, {
        message: replyMessage.trim(),
        senderName,
      });

      if (updatedTicket && Array.isArray(updatedTicket.replies)) {
        setActiveTicket(updatedTicket);
        // Also update in tickets list
        setTickets((prev) =>
          prev.map((t) => ((t.ticketId || t.id) === ticketId ? updatedTicket : t))
        );
      } else if (updatedTicket && updatedTicket.message) {
        setActiveTicket((prev) => ({
          ...prev,
          replies: [...(prev?.replies || []), updatedTicket],
        }));
      } else {
        // Fallback optimistic append
        const newReply = {
          replyId: Date.now(),
          senderRole: 'agency',
          senderName,
          message: replyMessage.trim(),
          timestamp: new Date().toISOString(),
        };
        setActiveTicket((prev) => ({
          ...prev,
          replies: [...(prev?.replies || []), newReply],
        }));
      }

      setReplyMessage('');
      setToast({ message: 'Reply sent to Support Desk.', type: 'success' });
    } catch (err) {
      console.error('Failed to post reply:', err);
      setToast({ message: err.message || 'Failed to send reply.', type: 'error' });
    } finally {
      setSendingReply(false);
    }
  };

  const getPriorityBadge = (prio) => {
    const p = (prio || 'Medium').toLowerCase();
    if (p === 'high') {
      return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'HIGH' };
    }
    if (p === 'low') {
      return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: 'LOW' };
    }
    return { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'MEDIUM' };
  };

  return (
    <div className="agency-support-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            Agency Helpdesk & Support Desk
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Submit client trip inquiries, request guide assignments, review commission disputes, and communicate with GlobeSync operations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            setSubmitError(null);
          }}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(13,148,136,0.25)',
          }}
        >
          <span>+</span> Open Support Ticket
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <SummaryCard
          title="Total Tickets"
          value={String(tickets.length)}
          subtitle="All-time partner inquiries"
          icon="🎫"
        />
        <SummaryCard
          title="Active Inquiries"
          value={String(openCount)}
          subtitle="Awaiting response or in progress"
          icon="⏳"
        />
        <SummaryCard
          title="Resolved Tickets"
          value={String(resolvedCount)}
          subtitle="Successfully closed cases"
          icon="✅"
        />
      </div>

      {/* 2-column layout: Tickets on left, FAQs on right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '24px',
        }}
      >
        {/* Ticket List */}
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Your Support Tickets ({tickets.length})
            </h3>
            <button
              type="button"
              onClick={() => {
                const controller = new AbortController();
                loadData(controller.signal);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0d9488',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              Loading support tickets...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>{error}</p>
              <button
                type="button"
                onClick={() => {
                  const controller = new AbortController();
                  loadData(controller.signal);
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#fff', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>🎫</div>
              <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>No tickets opened</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>
                Need help with a client trip or commission question? Open a ticket above.
              </p>
            </div>
          ) : (
            <div>
              {tickets.map((t) => {
                const ticketId = t.ticketId || t.id;
                const repliesCount = Array.isArray(t.replies) ? t.replies.length : 0;
                const prioBadge = getPriorityBadge(t.priority);
                const linkedTrip = agencyTrips.find((trip) => trip.tripId === t.tripId);

                return (
                  <div
                    key={ticketId}
                    style={{
                      padding: '18px 22px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#0d9488', fontSize: '14px' }}>
                          #{ticketId}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                          {t.issueType || 'Partner Inquiry'}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: prioBadge.bg,
                            color: prioBadge.color,
                            border: `1px solid ${prioBadge.border}`,
                          }}
                        >
                          {prioBadge.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <StatusBadge status={t.status || 'Open'} />
                      </div>
                    </div>

                    {t.tripId && (
                      <div style={{ fontSize: '12px', color: '#0f766e', background: '#f0fdfa', padding: '4px 10px', borderRadius: '6px', display: 'inline-block', width: 'fit-content' }}>
                        ✈️ Linked Client Trip: <strong>#{t.tripId} {linkedTrip ? `— ${linkedTrip.title || linkedTrip.destination}` : ''}</strong>
                      </div>
                    )}

                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      {t.description}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Logged: {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Recent'}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenThread(t)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: '1px solid #0d9488',
                          background: '#f0fdfa',
                          color: '#0d9488',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        💬 View Discussion ({repliesCount})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agency FAQs */}
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            padding: '24px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            Frequently Asked Partner Questions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {FAQS.map((faq, idx) => (
              <div key={idx} style={{ borderBottom: idx < FAQS.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ color: '#0d9488' }}>Q:</span>
                  {faq.q}
                </div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, paddingLeft: '20px' }}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '20px',
              fontSize: '13px',
              color: '#0f766e',
            }}
          >
            🛡️ <strong>Direct Operations SLA:</strong> Critical ticket priorities (HIGH) are acknowledged by GlobeSync support leads within 15 minutes.
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
              Open New Support Ticket
            </h2>

            {submitError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                {submitError}
              </div>
            )}

            <form onSubmit={handleCreateTicket}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                    Category *
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    {ISSUE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                    Priority Level *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value="Low">Low (General inquiry)</option>
                    <option value="Medium">Medium (Trip updates)</option>
                    <option value="High">High (Urgent departure issue)</option>
                  </select>
                </div>
              </div>

              {/* Linked Trip Dropdown */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Link to Client Trip (Optional)
                </label>
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value="">-- No specific trip / General Agency Inquiry --</option>
                  {agencyTrips.map((trip) => (
                    <option key={trip.tripId} value={trip.tripId}>
                      Trip #{trip.tripId} — {trip.title || trip.destination} ({trip.status})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Description & Details *
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide booking IDs, passenger names, or details regarding your inquiry..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0d9488',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2-Way Interactive Conversation Thread Modal */}
      {activeTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '680px',
              height: '80vh',
              maxHeight: '750px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#0d9488' }}>
                    #{activeTicket.ticketId || activeTicket.id}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {activeTicket.issueType}
                  </span>
                  <StatusBadge status={activeTicket.status || 'Open'} />
                </div>
                {activeTicket.tripId && (
                  <div style={{ fontSize: '12px', color: '#0f766e', marginTop: '4px' }}>
                    ✈️ Client Trip #{activeTicket.tripId}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#64748b',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Conversation Messages Container */}
            <div
              ref={messagesEndRef}
              style={{
                flex: 1,
                padding: '20px 24px',
                overflowY: 'auto',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Initial Issue Description Card */}
              <div
                style={{
                  background: '#fff',
                  padding: '16px 18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488' }}>
                    📌 ORIGINAL INQUIRY
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {activeTicket.createdAt ? new Date(activeTicket.createdAt).toLocaleDateString() : 'Initial'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#1e293b', lineHeight: 1.6 }}>
                  {activeTicket.description}
                </div>
              </div>

              {/* Thread Messages */}
              {threadLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                  Loading conversation thread...
                </div>
              ) : (!activeTicket.replies || activeTicket.replies.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
                  💬 No responses yet. Send a message below to coordinate with the Customer Support Desk.
                </div>
              ) : (
                activeTicket.replies.map((reply, idx) => {
                  const isAgency = (reply.senderRole || '').toLowerCase() === 'agency';
                  return (
                    <div
                      key={reply.replyId || idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAgency ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          marginBottom: '4px',
                          fontWeight: 600,
                        }}
                      >
                        {reply.senderName || (isAgency ? 'Agency Partner' : 'Support Desk')} ·{' '}
                        {reply.timestamp ? new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                      </div>
                      <div
                        style={{
                          maxWidth: '75%',
                          padding: '12px 16px',
                          borderRadius: isAgency ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isAgency ? '#0d9488' : '#ffffff',
                          color: isAgency ? '#ffffff' : '#0f172a',
                          border: isAgency ? 'none' : '1px solid #e2e8f0',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                          fontSize: '14px',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {reply.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Input Box */}
            <form
              onSubmit={handleSendReply}
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#fff',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                placeholder="Type your message to Support Desk..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                disabled={sendingReply}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={sendingReply || !replyMessage.trim()}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: !replyMessage.trim() ? '#94a3b8' : '#0d9488',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: !replyMessage.trim() || sendingReply ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {sendingReply ? 'Sending...' : 'Send 💬'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
