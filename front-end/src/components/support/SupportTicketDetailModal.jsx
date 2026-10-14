import React, { useState } from 'react';
import StatusBadge from '../common/StatusBadge';

/**
 * SupportTicketDetailModal
 * 
 * Displays full ticket details, traveler identity card, internal notes,
 * and allows transitioning ticket status ('Open', 'In Progress', 'Resolved', 'Closed').
 */
export default function SupportTicketDetailModal({
  isOpen,
  ticket,
  traveler,
  onClose,
  onStatusUpdate,
  onNavigateToMessages,
  onNavigateToRefunds,
}) {
  const [internalNotes, setInternalNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);

  if (!isOpen || !ticket) return null;

  const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

  const handleStatusChange = async (newStatus) => {
    if (newStatus === ticket.status || updatingStatus) return;
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      await onStatusUpdate(ticket.ticketId, newStatus);
    } catch (err) {
      setStatusError(err.message || 'Failed to update ticket status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setInternalNotes((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: noteText.trim(),
        author: 'Support Agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setNoteText('');
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

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-light, #eee)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-soft, #fafafa)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Support Request #{ticket.ticketId}
              </span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  ...getPriorityStyle(ticket.priority),
                }}
              >
                {ticket.priority || 'Medium'} Priority
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Logged on {ticket.created ? new Date(ticket.created).toLocaleString() : 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
          {/* Left Column: Ticket Details & Notes */}
          <div>
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid var(--border-light, #e2e8f0)',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  Issue Category
                </span>
                <StatusBadge status={ticket.status} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {ticket.issueType}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>
                Description
              </div>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  lineHeight: '1.6',
                  background: '#fff',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {ticket.description}
              </p>
            </div>

            {/* Status Transition Control */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Update Ticket Status
              </label>
              {statusError && (
                <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '12px', marginBottom: '8px' }}>
                  {statusError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {validStatuses.map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(st)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: ticket.status === st ? '2px solid var(--primary, #10b981)' : '1px solid #d1d5db',
                      background: ticket.status === st ? '#ecfdf5' : '#fff',
                      color: ticket.status === st ? '#059669' : '#374151',
                      cursor: updatingStatus ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {ticket.status === st ? `✓ ${st}` : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Internal Resolution Notes
              </label>
              <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record internal escalation notes or follow-up status..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-start', padding: '6px 14px', fontSize: '12px' }}
                >
                  + Add Note
                </button>
              </form>

              {internalNotes.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {internalNotes.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '8px 10px',
                        background: '#f1f5f9',
                        borderRadius: '6px',
                        fontSize: '12px',
                        borderLeft: '3px solid #3b82f6',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', marginBottom: '2px' }}>
                        <span>{n.author}</span>
                        <span>{n.timestamp}</span>
                      </div>
                      <div style={{ color: 'var(--text-primary)' }}>{n.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Traveler Profile Card & Quick Actions */}
          <div>
            {traveler ? (
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '22px',
                    fontWeight: 800,
                    margin: '0 auto 12px',
                  }}
                >
                  {traveler.name ? traveler.name[0] : 'T'}
                </div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>
                  {traveler.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  Customer ID: TC00{traveler.travelerId || traveler.traveler_id || ticket.travelerId}
                </div>

                <div style={{ marginTop: '14px', textAlign: 'left', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Email:</span>
                    <span style={{ fontWeight: 600 }}>{traveler.email || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Phone:</span>
                    <span style={{ fontWeight: 600 }}>{traveler.phone || 'N/A'}</span>
                  </div>
                </div>

                {onNavigateToMessages && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToMessages(traveler.travelerId || traveler.traveler_id || ticket.travelerId);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{
                      width: '100%',
                      marginTop: '16px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                    }}
                  >
                    💬 Message Traveler
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                  marginBottom: '16px',
                  color: 'var(--muted)',
                  fontSize: '13px',
                }}
              >
                No traveler profile linked (ID: #{ticket.travelerId || 'Agency'})
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Support Actions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {onNavigateToRefunds && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToRefunds(ticket.travelerId);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: 'flex-start', padding: '8px 12px', fontSize: '13px' }}
                  >
                    💰 Review & Initiate Refund
                  </button>
                )}
                {ticket.status !== 'Resolved' && (
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange('Resolved')}
                    className="btn btn-sm"
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      fontWeight: 700,
                      padding: '8px 12px',
                      fontSize: '13px',
                      cursor: updatingStatus ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ✅ Quick Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-light, #eee)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'var(--bg-soft, #fafafa)',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Close Dialog
          </button>
        </div>
      </div>
    </div>
  );
}
