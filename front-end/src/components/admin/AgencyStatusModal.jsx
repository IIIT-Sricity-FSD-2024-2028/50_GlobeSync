import React, { useState, useEffect } from 'react';
import { AdminDialog, SelectField, Field, FormActions } from './AdminUI';

const practicalAgencyStatuses = [
  { value: 'pending', label: 'Pending Verification' },
  { value: 'approved', label: 'Approved (Active Partner)' },
  { value: 'suspended', label: 'Suspended (Temporary Freeze)' },
  { value: 'rejected', label: 'Rejected (Declined)' },
];

/**
 * AgencyStatusModal
 *
 * Practical governance modal for reviewing an agency's approval status and commission rate.
 *
 * Revised Governance Architecture:
 * - Admin independent authority for routine approve/reject/suspend (Category B: Super Admin notified).
 * - Standard commission range: 1.0% to 1.5% (Admin authorized).
 * - Rates outside 1.0%–1.5% route to Super Admin Prior Approval (Category C).
 */
export default function AgencyStatusModal({
  isOpen,
  agency,
  busy,
  dialogError,
  onClose,
  onUpdate,
  onRequestSuperAdminApproval,
}) {
  const [status, setStatus] = useState('pending');
  const [commissionRate, setCommissionRate] = useState('');
  const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isOpen && agency) {
      setStatus(agency.status === 'pending' ? 'approved' : (agency.status || 'approved'));
      setCommissionRate(
        agency.commissionRate != null
          ? String(agency.commissionRate)
          : agency.status === 'pending'
            ? '1.5'
            : '',
      );
      setReason('');
      setFieldErrors({});
    }
  }, [isOpen, agency]);

  if (!isOpen || !agency) return null;

  const allowedStatuses =
    agency.status === 'pending'
      ? [
          { value: 'approved', label: 'Approve Agency (Grant Partner Access)' },
          { value: 'rejected', label: 'Reject Application' },
          { value: 'pending', label: 'Keep Pending Verification' },
        ]
      : agency.status === 'rejected'
        ? [
            { value: 'approved', label: 'Approve Upon Resubmission' },
            { value: 'pending', label: 'Re-open as Pending Verification' },
            { value: 'rejected', label: 'Keep Rejected' },
          ]
        : agency.status === 'suspended'
          ? [
              { value: 'approved', label: 'Restore Approved Access' },
              { value: 'suspended', label: 'Keep Suspended' },
            ]
          : practicalAgencyStatuses.filter((s) => s.value !== 'pending');

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

  const rateValue = commissionRate.trim() !== '' ? Number(commissionRate) : null;
  const isExceptionalRate = rateValue !== null && (rateValue < 1.0 || rateValue > 1.5);

  const validate = () => {
    const errors = {};
    if (rateValue !== null && Number.isNaN(rateValue)) {
      errors.commissionRate = 'Commission rate must be a valid number.';
    }
    if (!reason.trim()) {
      errors.reason = 'Administrative decision reason is mandatory for governance auditing.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (isExceptionalRate) {
      // Route to Super Admin prior approval (Category C)
      if (onRequestSuperAdminApproval) {
        onRequestSuperAdminApproval({
          type: 'AGENCY_STATUS_COMMISSION',
          entityType: 'agency',
          entityId: agency.agencyId,
          proposedValues: {
            status,
            commissionRate: rateValue,
            statusReason: reason.trim(),
          },
          reason: `Exceptional commission request (${rateValue}%): ${reason.trim()}`,
        });
      }
      return;
    }

    const payload = {
      status,
      reason: reason.trim(),
    };
    if (rateValue !== null) {
      payload.commissionRate = rateValue;
    }

    onUpdate(payload);
  };

  return (
    <AdminDialog
      title={`Agency Governance Review: ${agency.businessName}`}
      onClose={onClose}
      busy={busy}
      error={dialogError}
    >
      <form onSubmit={handleSubmit} noValidate>
        <SelectField
          id="agency-status-select"
          label="Partner Status"
          values={allowedStatuses}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={busy}
          helperText="Admin independently approves or rejects onboarding applications (Super Admin is notified automatically). Approved agencies gain full partner permissions."
        />

        <Field
          id="agency-rate-input"
          label="Commission Rate (%)"
          type="number"
          step="0.01"
          value={commissionRate}
          onChange={handleCommissionChange}
          placeholder="e.g. 1.25"
          disabled={busy}
          error={fieldErrors.commissionRate}
          helperText="Admin authorized range: 1.0% to 1.5%. Rates outside this range trigger a Super Admin approval request."
        />

        {isExceptionalRate && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '0.85rem', color: '#92400e' }}>
            <strong>High-Risk Exception (Category C):</strong> Commission rate {rateValue}% is outside the standard 1.0%–1.5% delegation. Submitting this will automatically route an Approval Request to the Super Admin.
          </div>
        )}

        <Field
          id="agency-decision-reason"
          label="Decision & Verification Reason (Mandatory)"
          type="text"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (fieldErrors.reason) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.reason;
                return next;
              });
            }
          }}
          placeholder="e.g. Verified trade license, GST certificate and corporate office"
          disabled={busy}
          error={fieldErrors.reason}
          helperText="Audit logged and visible in Super Admin notifications and historical reports."
        />

        <FormActions
          busy={busy}
          onCancel={onClose}
          submitLabel={isExceptionalRate ? 'Submit for Super Admin Approval' : 'Save Status & Commission'}
        />
      </form>
    </AdminDialog>
  );
}
