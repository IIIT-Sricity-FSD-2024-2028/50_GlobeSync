import React, { useState } from 'react';
import { supportTicketsApi } from '../../services/api';

/**
 * TicketForm: Controlled form for creating a new support ticket.
 * 
 * Features:
 * - Controlled inputs for category, subject, description, priority, and optional linked booking
 * - Client-side validation: prevents empty or whitespace-only submissions
 * - Prevents double submission while request is in flight
 * - Passes new ticket record to parent via onTicketCreated callback
 */
export default function TicketForm({
  travelerId,
  bookings = [],
  onTicketCreated,
}) {
  const [formData, setFormData] = useState({
    category: 'Booking Issue',
    subject: '',
    description: '',
    priority: 'Medium',
    bookingId: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    const trimmedSubject = formData.subject.trim();
    if (!trimmedSubject) {
      newErrors.subject = 'Subject is required and cannot be empty.';
    } else if (trimmedSubject.length < 4) {
      newErrors.subject = 'Subject must be at least 4 characters.';
    }

    const trimmedDescription = formData.description.trim();
    if (!trimmedDescription) {
      newErrors.description = 'Description is required and cannot be empty.';
    } else if (trimmedDescription.length < 10) {
      newErrors.description = 'Please provide at least 10 characters detailing your issue.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    // Format issueType matching backend format (storing booking reference in issueType)
    const formattedIssueType = formData.bookingId
      ? `${formData.category} [BK#${formData.bookingId}]: ${formData.subject.trim()}`
      : `${formData.category}: ${formData.subject.trim()}`;

    const payload = {
      travelerId: Number(travelerId),
      issueType: formattedIssueType,
      description: formData.description.trim(),
      priority: formData.priority,
      status: 'Open',
    };

    try {
      const createdTicket = await supportTicketsApi.create(payload);
      
      // Reset form state after successful submission
      setFormData({
        category: 'Booking Issue',
        subject: '',
        description: '',
        priority: 'Medium',
        bookingId: '',
      });
      setErrors({});

      if (onTicketCreated) {
        onTicketCreated(createdTicket);
      }
    } catch (err) {
      console.error('[TicketForm] Submission failed:', err);
      setServerError(err.message || 'Failed to submit support ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
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
      <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-light, #eee)', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
          🎫 Create Support Ticket
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
          Describe your inquiry or dispute. Requests are routed directly to the support care desk in the order received.
        </p>
      </div>

      {serverError && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '10px',
            color: '#991b1b',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          ⚠️ {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Category & Priority Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Issue Category *
            </label>
            <select
              className="form-control"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)' }}
            >
              <option value="Booking Issue">Booking Issue</option>
              <option value="Refund Request">Refund Request</option>
              <option value="Itinerary Inquiry">Itinerary Inquiry</option>
              <option value="Payment Dispute">Payment Dispute</option>
              <option value="Technical Support">Technical Support</option>
              <option value="Other">Other Exception</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Priority Level
            </label>
            <select
              className="form-control"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)' }}
            >
              <option value="Low">Low (General Inquiry)</option>
              <option value="Medium">Medium (Standard Request)</option>
              <option value="High">High (Urgent Disruption)</option>
            </select>
          </div>
        </div>

        {/* Optional Linked Booking */}
        {bookings && bookings.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Linked Booking (Optional)
            </label>
            <select
              className="form-control"
              value={formData.bookingId}
              onChange={(e) => handleInputChange('bookingId', e.target.value)}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)' }}
            >
              <option value="">None / Not linked to a specific booking</option>
              {bookings.map((b) => (
                <option key={b.bookingId} value={b.bookingId}>
                  BK#{b.bookingId} — {b.type} ({b.service}) [{b.status}]
                </option>
              ))}
            </select>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              Linked booking references are recorded in the issue identifier (e.g. <code>[BK#18]</code>) to provide context for care agents.
            </p>
          </div>
        )}

        {/* Subject */}
        <div style={{ marginBottom: '16px' }}>
          <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
            Subject *
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="Brief headline of the request (e.g., Incorrect departure timing on ticket)"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: errors.subject ? '1.5px solid #ef4444' : '1.5px solid var(--border)',
            }}
          />
          {errors.subject && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: 600 }}>
              {errors.subject}
            </p>
          )}
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
            Detailed Description *
          </label>
          <textarea
            className="form-control"
            rows="4"
            placeholder="Provide complete context, dates, passenger names, or specifics so our team can resolve your issue quickly..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: errors.description ? '1.5px solid #ef4444' : '1.5px solid var(--border)',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
          {errors.description && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: 600 }}>
              {errors.description}
            </p>
          )}
        </div>

        {/* Tip Box */}
        <div
          style={{
            background: 'var(--bg-soft, #f8fafc)',
            padding: '12px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--muted)',
            marginBottom: '20px',
            lineHeight: 1.5,
          }}
        >
          💡 <strong>Priority Notice:</strong> High-priority requests are prioritized by customer care agents immediately. For active flight/train departures, please review itinerary tickets directly.
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 700,
            borderRadius: '10px',
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Submitting Request...' : '📩 Submit Support Ticket'}
        </button>
      </form>
    </div>
  );
}
