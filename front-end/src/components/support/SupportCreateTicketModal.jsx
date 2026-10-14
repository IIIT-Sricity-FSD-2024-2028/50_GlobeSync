import React, { useState } from 'react';

/**
 * SupportCreateTicketModal
 * 
 * Allows support specialists to log incoming support requests for travelers.
 * Validates required fields and handles asynchronous submission with feedback.
 */
export default function SupportCreateTicketModal({
  isOpen,
  travelers = [],
  careId,
  onClose,
  onCreate,
}) {
  const [travelerId, setTravelerId] = useState('');
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Open');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!travelerId) errs.travelerId = 'Please select a traveler';
    if (!issueType.trim()) errs.issueType = 'Issue category is required';
    if (!description.trim()) errs.description = 'Issue description is required';
    else if (description.trim().length < 5) errs.description = 'Description must be at least 5 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onCreate({
        travelerId: Number(travelerId),
        issueType: issueType.trim(),
        description: description.trim(),
        priority,
        status,
        careId: Number(careId) || 1,
      });
      // Reset form on success
      setTravelerId('');
      setIssueType('');
      setDescription('');
      setPriority('Medium');
      setStatus('Open');
      setErrors({});
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create ticket. Please try again.');
    } finally {
      setSubmitting(false);
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
          maxWidth: '560px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Log New Support Ticket 🎫
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Create an escalation case on behalf of a traveler
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {submitError && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fee2e2',
                color: '#b91c1c',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              ⚠️ {submitError}
            </div>
          )}

          {/* Traveler Select */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Select Traveler *
            </label>
            <select
              value={travelerId}
              onChange={(e) => {
                setTravelerId(e.target.value);
                if (errors.travelerId) setErrors((prev) => ({ ...prev, travelerId: null }));
              }}
              className="form-control"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.travelerId ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            >
              <option value="">-- Choose traveler --</option>
              {travelers.map((t) => (
                <option key={t.travelerId || t.traveler_id} value={t.travelerId || t.traveler_id}>
                  {t.name} (TC00{t.travelerId || t.traveler_id}) — {t.email}
                </option>
              ))}
            </select>
            {errors.travelerId && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.travelerId}
              </span>
            )}
          </div>

          {/* Issue Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Issue Category / Title *
            </label>
            <input
              type="text"
              value={issueType}
              onChange={(e) => {
                setIssueType(e.target.value);
                if (errors.issueType) setErrors((prev) => ({ ...prev, issueType: null }));
              }}
              placeholder="e.g., Booking date mismatch, Payment error, Guide change"
              className="form-control"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.issueType ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            />
            {errors.issueType && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.issueType}
              </span>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Detailed Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: null }));
              }}
              placeholder="Describe the traveler's complaint or operational issue with context..."
              rows={3}
              className="form-control"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.description ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
            {errors.description && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.description}
              </span>
            )}
          </div>

          {/* Row: Priority & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="form-control"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High (Urgent Escalation)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-control"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              >
                <option value="Open">Open (Pending)</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '10px 18px', fontSize: '14px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                padding: '10px 22px',
                fontSize: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                fontWeight: 700,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Logging Ticket...' : 'Create Ticket ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
