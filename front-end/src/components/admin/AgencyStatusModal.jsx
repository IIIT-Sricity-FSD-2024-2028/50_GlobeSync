import React, { useState, useEffect } from 'react';
import { AdminDialog, SelectField, Field, FormActions, agencyStatuses } from './AdminUI';

/**
 * AgencyStatusModal
 *
 * Educational modal component for reviewing an agency's approval status and commission rate.
 *
 * Pedagogical Architecture:
 * 1. RBAC & Lifecycle Context:
 *    - Explains to learners how the `status` field gates access across the platform.
 *      Only 'approved' agencies have valid JWT tokens issued upon login.
 * 2. Revenue Commission Policy:
 *    - Enforces the 1.0% - 1.5% commission rate bound mandated by the backend DTO.
 *    - Demonstrates client-side guardrails before sending payload to PATCH /agencies/:id/status.
 * 3. Controlled Inputs & Error Feedback:
 *    - Provides field-level validation and in-dialog error display.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is visible
 * @param {Object|null} props.agency - The target agency record
 * @param {boolean} props.busy - True while status update mutation is running
 * @param {string|null} props.dialogError - Backend error message if mutation failed
 * @param {Function} props.onClose - Dismiss modal callback
 * @param {Function} props.onUpdate - Callback receiving { status, [commissionRate] }
 */
export default function AgencyStatusModal({
  isOpen,
  agency,
  busy,
  dialogError,
  onClose,
  onUpdate,
}) {
  const [status, setStatus] = useState('pending');
  const [commissionRate, setCommissionRate] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isOpen && agency) {
      setStatus(agency.status || 'pending');
      setCommissionRate(agency.commissionRate != null ? String(agency.commissionRate) : '');
      setFieldErrors({});
    }
  }, [isOpen, agency]);

  if (!isOpen || !agency) return null;

  const handleCommissionChange = (e) => {
    setCommissionRate(e.target.value);
    if (fieldErrors.commissionRate) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.commissionRate;
        return next;
      });
    }
  };

  const validate = () => {
    const errors = {};
    if (commissionRate.trim() !== '') {
      const rate = Number(commissionRate);
      if (Number.isNaN(rate) || rate < 1.0 || rate > 1.5) {
        errors.commissionRate = 'Commission rate must be a valid number between 1.0% and 1.5%.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = { status };
    if (commissionRate.trim() !== '') {
      payload.commissionRate = Number(commissionRate);
    }

    onUpdate(payload);
  };

  return (
    <AdminDialog
      title={`Agency Status & Commission: ${agency.businessName}`}
      onClose={onClose}
      busy={busy}
      error={dialogError}
    >
      <form onSubmit={handleSubmit} noValidate>
        <SelectField
          id="agency-status-select"
          label="Approval Status"
          values={agencyStatuses}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={busy}
          helperText="Only 'approved' agencies can log into the platform and manage packages."
        />

        <Field
          id="agency-rate-input"
          label="Commission Rate (%)"
          type="number"
          min="1.0"
          max="1.5"
          step="0.01"
          value={commissionRate}
          onChange={handleCommissionChange}
          placeholder="e.g. 1.25 (optional)"
          disabled={busy}
          error={fieldErrors.commissionRate}
          helperText="Standard platform range is 1.0% to 1.5%. Leaving this blank preserves the current rate."
        />

        <div className="admin-status-note" style={{ marginTop: '0.75rem', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem', color: '#475569' }}>
          <strong>Partner Lifecycle Rules:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
            <li><strong>Pending:</strong> Registered partner waiting for administrative vetting.</li>
            <li><strong>Approved:</strong> Active partner with full access to create packages and accept trips.</li>
            <li><strong>Rejected:</strong> Partner access suspended or declined.</li>
          </ul>
        </div>

        <FormActions
          busy={busy}
          onCancel={onClose}
          submitLabel="Update Status & Commission"
        />
      </form>
    </AdminDialog>
  );
}
