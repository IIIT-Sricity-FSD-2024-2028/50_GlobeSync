import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { dashboardApi, supportTicketsApi, travelersApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';
import SupportTicketDetailModal from '../../components/support/SupportTicketDetailModal';
import SupportCreateTicketModal from '../../components/support/SupportCreateTicketModal';

/**
 * SupportDashboardPage
 * 
 * Strategic monitoring and live agent operations center for customer support.
 * Integrates backend metrics from GET /dashboard/support, ticket queues,
 * SLA velocity visualization, and live ticket resolution workflows.
 */
export default function SupportDashboardPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const careId = user?.careId || user?.care_id || user?.id || 1;

  const [metrics, setMetrics] = useState({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    refundRequests: 0,
    pendingRefunds: 0,
  });
  const [tickets, setTickets] = useState([]);
  const [travelers, setTravelers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Agent online status toggle
  const [isOnline, setIsOnline] = useState(() => {
    return localStorage.getItem('support_agent_online') !== 'false';
  });

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleAgentStatus = () => {
    setIsOnline((prev) => {
      const next = !prev;
      localStorage.setItem('support_agent_online', String(next));
      showToast(next ? 'Agent status: Online and ready for tickets! ✓' : 'Agent status: Offline.');
      return next;
    });
  };

  const loadDashboardData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, ticketsRes, travelersRes] = await Promise.allSettled([
        dashboardApi.getSupport({ signal }),
        supportTicketsApi.getAll({ signal }),
        travelersApi.getAll({ signal }),
      ]);

      if (signal?.aborted) return;

      if (dashRes.status === 'fulfilled' && dashRes.value) {
        setMetrics(dashRes.value);
      }
      if (ticketsRes.status === 'fulfilled' && Array.isArray(ticketsRes.value)) {
        setTickets(ticketsRes.value);
      }
      if (travelersRes.status === 'fulfilled' && Array.isArray(travelersRes.value)) {
        setTravelers(travelersRes.value);
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Failed to load support dashboard:', err);
        setError(err.message || 'Failed to load support metrics from server');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadDashboardData(controller.signal);
    return () => controller.abort();
  }, []);

  const handleStatusUpdate = async (ticketId, newStatus) => {
    await supportTicketsApi.updateStatus(ticketId, newStatus);
    showToast(`Ticket #${ticketId} updated to ${newStatus}! ✓`);
    // Refresh tickets and metrics
    const [dashRes, ticketsRes] = await Promise.all([
      dashboardApi.getSupport(),
      supportTicketsApi.getAll(),
    ]);
    if (dashRes) setMetrics(dashRes);
    if (ticketsRes) setTickets(ticketsRes);
    // Update selected ticket in place if open
    setSelectedTicket((prev) => (prev && prev.ticketId === ticketId ? { ...prev, status: newStatus } : prev));
  };

  const handleCreateTicket = async (ticketData) => {
    await supportTicketsApi.create(ticketData);
    showToast('Support ticket successfully logged! ✓');
    const [dashRes, ticketsRes] = await Promise.all([
      dashboardApi.getSupport(),
      supportTicketsApi.getAll(),
    ]);
    if (dashRes) setMetrics(dashRes);
    if (ticketsRes) setTickets(ticketsRes);
  };

  // Recent 5 tickets reversed
  const recentTickets = [...tickets].reverse().slice(0, 5);

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
      case 'medium':
        return { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' };
      case 'low':
        return { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' };
      default:
        return { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' };
    }
  };

  // 7-day velocity chart mock metrics derived from live ticket volumes
  const velocityData = [
    { day: 'Mon', count: Math.max(12, tickets.length * 2) },
    { day: 'Tue', count: Math.max(18, tickets.length * 3) },
    { day: 'Wed', count: Math.max(15, tickets.length * 2 + 1) },
    { day: 'Thu', count: Math.max(22, tickets.length * 3 + 2) },
    { day: 'Fri', count: Math.max(19, tickets.length * 3) },
    { day: 'Sat', count: Math.max(10, tickets.length) },
    { day: 'Sun', count: Math.max(8, Math.floor(tickets.length * 0.8)) },
  ];
  const maxVelocity = Math.max(...velocityData.map((d) => d.count), 1);

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontWeight: 700,
            fontSize: '14px',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Top Welcome & Agent Status Bar */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
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
            Customer Support Center 🎧
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Welcome back, <strong>{user?.name || 'Support Specialist'}</strong> (Desk #{careId}). SLA compliance is actively monitored.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Agent Online Toggle */}
          <div
            onClick={toggleAgentStatus}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '24px',
              border: isOnline ? '1.5px solid #10b981' : '1.5px solid #d1d5db',
              background: isOnline ? '#ecfdf5' : '#f9fafb',
              color: isOnline ? '#059669' : '#6b7280',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isOnline ? '#10b981' : '#9ca3af',
                boxShadow: isOnline ? '0 0 8px #10b981' : 'none',
              }}
            />
            <span>{isOnline ? 'Agent Online' : 'Agent Offline'}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
              border: 'none',
              fontWeight: 700,
              padding: '10px 18px',
            }}
          >
            + Log Ticket
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard
          label="Open Tickets"
          value={loading ? '...' : metrics.openTickets}
          icon="🎫"
          subtitle="Pending customer agent response"
          badge="High Priority"
          linkTo="/support/tickets"
          color="#10b981"
        />
        <SummaryCard
          label="Resolved Tickets"
          value={loading ? '...' : metrics.resolvedTickets}
          icon="✅"
          subtitle="Successfully closed tickets"
          badge="SLA 98.4%"
          linkTo="/support/tickets"
          color="#059669"
        />
        <SummaryCard
          label="Refund Claims"
          value={loading ? '...' : metrics.refundRequests}
          icon="💰"
          subtitle={`${metrics.pendingRefunds || 0} processing approval`}
          badge="Ledger"
          linkTo="/support/refunds"
          color="#3b82f6"
        />
        <SummaryCard
          label="Global Tickets Queue"
          value={loading ? '...' : metrics.totalTickets}
          icon="📋"
          subtitle="All platform support cases"
          badge="Desk #1"
          linkTo="/support/tickets"
          color="#6366f1"
        />
      </div>

      {/* Analytics & Velocity Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Resolution Velocity Chart */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Resolution Velocity (Last 7 Days)
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--muted)', background: '#f1f5f9', padding: '4px 8px', borderRadius: '8px' }}>
              Avg Response: 1.4h
            </span>
          </div>

          <div
            style={{
              height: '160px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '12px',
              padding: '16px 12px 24px',
              background: '#f8fafc',
              borderRadius: '12px',
            }}
          >
            {velocityData.map((d) => {
              const heightPct = Math.round((d.count / maxVelocity) * 100);
              return (
                <div
                  key={d.day}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    title={`${d.day}: ${d.count} tickets handled`}
                    style={{
                      width: '100%',
                      maxWidth: '32px',
                      height: `${heightPct}%`,
                      background: 'linear-gradient(180deg, #10b981 0%, #34d399 100%)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>First Contact Resolution</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>94.2%</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>CSAT Rating</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>4.8 / 5.0 ⭐</div>
            </div>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Recent Support Feed
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                ➕
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>New Escalation Ticket</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Traveler reported flight delay exception.</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>5 mins ago</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                ✅
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Case Resolved</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Ticket #{tickets[0]?.ticketId || 101} closed by {user?.name || 'Support'}.</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>25 mins ago</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                💰
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Refund Review Assigned</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Refund claim queued for booking ledger credit.</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>1 hour ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Support Requests Table */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Recent Support Requests
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Latest incoming tickets requiring desk assessment
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/support/tickets')}
            className="btn btn-secondary btn-sm"
          >
            View Full Ticket Queue →
          </button>
        </div>

        {recentTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎫</div>
            <p>No recent support tickets in queue</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Ticket ID</th>
                  <th style={{ padding: '10px 12px' }}>Traveler</th>
                  <th style={{ padding: '10px 12px' }}>Issue Category</th>
                  <th style={{ padding: '10px 12px' }}>Priority</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((t) => {
                  const tr = travelers.find((trav) => (trav.travelerId || trav.traveler_id) === t.travelerId);
                  return (
                    <tr key={t.ticketId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#10b981' }}>
                        #{t.ticketId}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{tr ? tr.name : `Customer #${t.travelerId || 'Agency'}`}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>TC00{t.travelerId}</div>
                      </td>
                      <td style={{ padding: '12px', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.issueType}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, ...getPriorityStyle(t.priority) }}>
                          {t.priority || 'Medium'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge status={t.status} />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(t)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          View Details
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

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <SupportTicketDetailModal
          isOpen={Boolean(selectedTicket)}
          ticket={selectedTicket}
          traveler={travelers.find((tr) => (tr.travelerId || tr.traveler_id) === selectedTicket.travelerId)}
          onClose={() => setSelectedTicket(null)}
          onStatusUpdate={handleStatusUpdate}
          onNavigateToMessages={(tId) => navigate(`/support/messages?travelerId=${tId}`)}
          onNavigateToRefunds={() => navigate('/support/refunds')}
        />
      )}

      {/* Create Ticket Modal */}
      <SupportCreateTicketModal
        isOpen={isCreateModalOpen}
        travelers={travelers}
        careId={careId}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTicket}
      />
    </div>
  );
}
