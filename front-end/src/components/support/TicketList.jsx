import React, { useState } from 'react';
import StatusBadge from '../common/StatusBadge';

/**
 * TicketList: Displays the traveler's support tickets with status, priority, and date.
 * 
 * Features:
 * - Search by keyword (subject, description, ticket ID)
 * - Status filtering (All, Open, In Progress, Resolved, Closed)
 * - Clear empty and loading states
 * - Priority color tags (High, Medium, Low)
 */
export default function TicketList({
  tickets = [],
  isLoading = false,
  onRefresh,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Filter tickets by search and status
  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus =
      statusFilter === 'All' ||
      ticket.status?.toLowerCase() === statusFilter.toLowerCase();

    const matchesSearch =
      searchTerm === '' ||
      ticket.issueType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(ticket.ticketId).includes(searchTerm) ||
      String(ticket.caseId).includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="card"
      style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}
    >
      {/* Header and Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-light, #eee)',
          paddingBottom: '12px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            📋 My Support Tickets
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
            {tickets.length} total {tickets.length === 1 ? 'ticket' : 'tickets'} submitted
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="btn btn-secondary"
          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', fontWeight: 600 }}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : '🔄 Refresh List'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        <div style={{ flex: 1, minWidth: '180px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search tickets by ID, issue, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '9px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '13px' }}
          />
        </div>

        <select
          className="form-control"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ minWidth: '140px', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '13px' }}
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
          <p style={{ fontSize: '14px', fontWeight: 600 }}>Loading support tickets from backend...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTickets.length === 0 && (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--bg-soft, #f8fafc)',
            borderRadius: '12px',
            border: '1px dashed var(--border)',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎫</div>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {searchTerm || statusFilter !== 'All' ? 'No matching tickets found' : 'No support tickets yet'}
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '400px', margin: '6px auto 0' }}>
            {searchTerm || statusFilter !== 'All'
              ? 'Try modifying your search keywords or status filter.'
              : 'Submit a ticket on the left whenever you need assistance with bookings, itineraries, or payments.'}
          </p>
        </div>
      )}

      {/* Ticket Cards Stream */}
      {!isLoading && filteredTickets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredTickets
            .slice()
            .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0))
            .map((ticket) => {
              const priorityStyle = getPriorityStyle(ticket.priority);

              return (
                <div
                  key={ticket.ticketId}
                  style={{
                    padding: '18px 20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light, #eee)',
                    background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Top Bar: ID, Date, Priority, Status */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          color: 'var(--primary, #E8467C)',
                          background: '#fff0f5',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        #TICK-{ticket.ticketId}
                      </span>
                      {ticket.caseId && (
                        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                          Case #{ticket.caseId}
                        </span>
                      )}
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        &bull; {formatDate(ticket.created)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          ...priorityStyle,
                        }}
                      >
                        {ticket.priority || 'Medium'}
                      </span>
                      <StatusBadge status={ticket.status || 'Open'} />
                    </div>
                  </div>

                  {/* Issue Type Headline */}
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {ticket.issueType}
                  </h4>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary, #4b5563)',
                      lineHeight: 1.6,
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {ticket.description}
                  </p>

                  {/* Footer metadata */}
                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px solid #f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: 'var(--muted)',
                    }}
                  >
                    <span>
                      👤 Assigned Desk: <strong>{ticket.careId ? `Care Desk Queue #${ticket.careId}` : 'General Support Desk'}</strong>
                    </span>
                    <span style={{ fontStyle: 'italic' }}>
                      {ticket.status === 'Resolved' || ticket.status === 'Closed' ? '✓ Case resolved' : '⏳ In active queue'}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
