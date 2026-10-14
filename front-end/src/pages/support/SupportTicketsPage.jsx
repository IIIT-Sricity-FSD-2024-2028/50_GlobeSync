import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { supportTicketsApi, travelersApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';
import SupportTicketDetailModal from '../../components/support/SupportTicketDetailModal';
import SupportCreateTicketModal from '../../components/support/SupportCreateTicketModal';

/**
 * SupportTicketsPage
 * 
 * Central queue management interface for Customer Support specialists.
 * Provides multi-criteria filtering, bulk actions, detailed ticket modals,
 * and status transitions.
 */
export default function SupportTicketsPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const careId = user?.careId || user?.care_id || user?.id || 1;

  const [tickets, setTickets] = useState([]);
  const [travelers, setTravelers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Bulk Selection
  const [selectedTicketIds, setSelectedTicketIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Modals
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadTicketsData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsRes, travelersRes] = await Promise.allSettled([
        supportTicketsApi.getAll({ signal }),
        travelersApi.getAll({ signal }),
      ]);

      if (signal?.aborted) return;

      if (ticketsRes.status === 'fulfilled' && Array.isArray(ticketsRes.value)) {
        setTickets(ticketsRes.value);
      } else if (!ticketsRes.reason?.isCancelled) {
        setError(ticketsRes.reason?.message || 'Failed to load tickets queue from backend');
      }

      if (travelersRes.status === 'fulfilled' && Array.isArray(travelersRes.value)) {
        setTravelers(travelersRes.value);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(err.message || 'An unexpected error occurred while loading tickets.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadTicketsData(controller.signal);
    return () => controller.abort();
  }, []);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus =
        statusFilter === 'All' ||
        (t.status || '').toLowerCase() === statusFilter.toLowerCase();

      const matchesPriority =
        priorityFilter === 'All' ||
        (t.priority || '').toLowerCase() === priorityFilter.toLowerCase();

      const tr = travelers.find((trav) => (trav.travelerId || trav.traveler_id) === t.travelerId);
      const travelerName = tr ? tr.name.toLowerCase() : '';

      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        String(t.ticketId).includes(search) ||
        (t.issueType || '').toLowerCase().includes(search) ||
        (t.description || '').toLowerCase().includes(search) ||
        travelerName.includes(search);

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tickets, travelers, statusFilter, priorityFilter, searchTerm]);

  // Bulk Selection Handlers
  const handleToggleSelectAll = (checked) => {
    if (checked) {
      setSelectedTicketIds(new Set(filteredTickets.map((t) => t.ticketId)));
    } else {
      setSelectedTicketIds(new Set());
    }
  };

  const handleToggleTicket = (id) => {
    setSelectedTicketIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkResolve = async () => {
    if (selectedTicketIds.size === 0 || bulkProcessing) return;
    setBulkProcessing(true);
    const ids = Array.from(selectedTicketIds);
    try {
      await Promise.all(ids.map((id) => supportTicketsApi.updateStatus(id, 'Resolved')));
      showToast(`Bulk updated ${ids.length} tickets to Resolved! ✓`);
      setSelectedTicketIds(new Set());
      await loadTicketsData();
    } catch (err) {
      showToast(`Bulk update error: ${err.message || 'Some tickets failed'}`);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleStatusUpdate = async (ticketId, newStatus) => {
    await supportTicketsApi.updateStatus(ticketId, newStatus);
    showToast(`Ticket #${ticketId} status changed to ${newStatus}! ✓`);
    const refreshed = await supportTicketsApi.getAll();
    if (refreshed) setTickets(refreshed);
    setSelectedTicket((prev) => (prev && prev.ticketId === ticketId ? { ...prev, status: newStatus } : prev));
  };

  const handleCreateTicket = async (ticketData) => {
    await supportTicketsApi.create(ticketData);
    showToast('New ticket logged in queue! ✓');
    const refreshed = await supportTicketsApi.getAll();
    if (refreshed) setTickets(refreshed);
  };

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

  // Metrics summary
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const progressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  return (
    <div>
      {/* Toast */}
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

      {/* Topbar */}
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
            Tickets Management Queue 🎫
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Monitor, prioritize, and resolve traveler escalations with live status updates.
          </p>
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
          + Log Support Ticket
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
          label="Total Tickets"
          value={loading ? '...' : totalCount}
          icon="📋"
          subtitle="All platform issues"
          color="#3b82f6"
        />
        <SummaryCard
          label="Open"
          value={loading ? '...' : openCount}
          icon="🎫"
          subtitle="Awaiting agent response"
          badge="Action Needed"
          color="#dc2626"
        />
        <SummaryCard
          label="In Progress"
          value={loading ? '...' : progressCount}
          icon="⏳"
          subtitle="Under active investigation"
          color="#f59e0b"
        />
        <SummaryCard
          label="Resolved / Closed"
          value={loading ? '...' : resolvedCount}
          icon="✅"
          subtitle="Successfully concluded"
          color="#10b981"
        />
      </div>

      {/* Filter and Table Container */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
        {/* Controls Bar */}
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
          {/* Search */}
          <div style={{ minWidth: '260px', flex: '1 1 260px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search by ID, traveler, category..."
              className="form-control"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="form-control"
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
            Loading tickets queue...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🎫</div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>No tickets found</h4>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>No records match your selected search or filter criteria.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedTicketIds.size > 0 && selectedTicketIds.size === filteredTickets.length}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '10px 12px' }}>ID</th>
                  <th style={{ padding: '10px 12px' }}>Traveler</th>
                  <th style={{ padding: '10px 12px' }}>Issue Category</th>
                  <th style={{ padding: '10px 12px' }}>Priority</th>
                  <th style={{ padding: '10px 12px' }}>Desk Agent</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Created</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => {
                  const tr = travelers.find((trav) => (trav.travelerId || trav.traveler_id) === t.travelerId);
                  const isChecked = selectedTicketIds.has(t.ticketId);

                  return (
                    <tr
                      key={t.ticketId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isChecked ? '#f0fdf4' : 'transparent',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTicket(t.ticketId)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#10b981' }}>
                        #{t.ticketId}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{tr ? tr.name : `Traveler #${t.travelerId || 'Agency'}`}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>TC00{t.travelerId}</div>
                      </td>
                      <td style={{ padding: '12px', maxWidth: '260px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.issueType}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.description}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, ...getPriorityStyle(t.priority) }}>
                          {t.priority || 'Medium'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--muted)', fontSize: '13px' }}>
                        {t.careId ? `Desk #${t.careId}` : 'Unassigned'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge status={t.status} />
                      </td>
                      <td style={{ padding: '12px', color: 'var(--muted)', fontSize: '12px' }}>
                        {t.created ? new Date(t.created).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(t)}
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

      {/* Floating Bulk Actions Bar */}
      {selectedTicketIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            zIndex: 1000,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '14px' }}>
            {selectedTicketIds.size} tickets selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={bulkProcessing}
              onClick={handleBulkResolve}
              className="btn btn-sm"
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                padding: '6px 14px',
              }}
            >
              {bulkProcessing ? 'Resolving...' : '✓ Mark Resolved'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedTicketIds(new Set())}
              className="btn btn-secondary btn-sm"
              style={{ background: '#475569', color: '#fff', border: 'none', padding: '6px 12px' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

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
