import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { supportTicketsApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';

const ISSUE_TYPES = [
  'Commission Query',
  'Booking Discrepancy',
  'Payment & Billing Question',
  'Passenger Roster Correction',
  'Cancellation & Refund Assistance',
  'Technical Issue',
];

const FAQS = [
  {
    q: 'When are agency reseller commissions settled?',
    a: 'Commissions remain in Pending status while client trips are ongoing, and automatically transition to Settled when the client trip is marked Completed by operations.',
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
 * Manages partner tickets with customer care desk and provides agency FAQs.
 */
export default function AgencySupportPage() {
  const { user } = useSession();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New ticket modal
  const [showModal, setShowModal] = useState(false);
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const loadTickets = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await supportTicketsApi.getByAgency(agencyId, { signal });
      if (!signal?.aborted) {
        setTickets(Array.isArray(data) ? data : []);
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
      loadTickets(controller.signal);
    }
    return () => controller.abort();
  }, [agencyId]);

  const openCount = tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setSubmitError('Please describe the issue or inquiry.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        agencyId,
        issueType,
        description: description.trim(),
        status: 'Open',
      };

      await supportTicketsApi.create(payload);
      setShowModal(false);
      setDescription('');
      // Reload tickets
      loadTickets();
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      setSubmitError(err.message || 'Failed to submit ticket to customer support.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="agency-support-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
            Agency Helpdesk & Support
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Submit partner inquiries, commission queries, and review operational documentation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowModal(true);
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
            boxShadow: '0 4px 12px rgba(13,148,136,0.25)',
          }}
        >
          + Open Support Ticket
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
          subtitle="All-time agency requests"
          icon="🎫"
        />
        <SummaryCard
          title="Active Inquiries"
          value={String(openCount)}
          subtitle="Awaiting support team response"
          icon="⏳"
        />
        <SummaryCard
          title="Resolved Tickets"
          value={String(resolvedCount)}
          subtitle="Successfully closed issues"
          icon="✅"
        />
      </div>

      {/* 2-column layout: Tickets on left, FAQs on right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
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
              onClick={() => loadTickets()}
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
                onClick={() => loadTickets()}
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
              {tickets.map((t) => (
                <div
                  key={t.ticketId || t.ticket_id}
                  onClick={() => setSelectedTicket(t)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#0d9488', fontSize: '13px' }}>
                        #{t.ticketId || t.ticket_id}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                        {t.issueType || 'Inquiry'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Logged: {t.createdAt || t.created_at || 'Recently'}
                    </div>
                  </div>

                  <StatusBadge status={t.status || 'Open'} />
                </div>
              ))}
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
              padding: '14px',
              marginTop: '20px',
              fontSize: '13px',
              color: '#0f766e',
            }}
          >
            💬 <strong>Need immediate coordination?</strong> Use the{' '}
            <a href="/agency/messages" style={{ color: '#0d9488', fontWeight: 700, textDecoration: 'underline' }}>
              Messages Center
            </a>{' '}
            to chat directly with your assigned tour guides or dedicated account manager.
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showModal && (
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
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
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
              <div style={{ marginBottom: '16px' }}>
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
                  onClick={() => setShowModal(false)}
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
                    fontWeight: 600,
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

      {/* Ticket Details Inspection Dialog */}
      {selectedTicket && (
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
              padding: '24px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0d9488' }}>
                  #{selectedTicket.ticketId || selectedTicket.ticket_id}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {selectedTicket.issueType}
                </span>
              </div>
              <StatusBadge status={selectedTicket.status || 'Open'} />
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '14px', lineHeight: 1.6, color: '#1e293b' }}>
              {selectedTicket.description}
            </div>

            {selectedTicket.resolutionNotes && (
              <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '10px', border: '1px solid #86efac', marginBottom: '20px', fontSize: '13px', color: '#166534' }}>
                <strong>Support Resolution:</strong> {selectedTicket.resolutionNotes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
