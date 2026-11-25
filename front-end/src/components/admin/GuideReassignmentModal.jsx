import React, { useState, useEffect } from 'react';
import { AdminDialog, FormActions, SelectField, Field } from './AdminUI';

export default function GuideReassignmentModal({
  isOpen,
  trip,
  guides,
  busy,
  dialogError,
  onClose,
  onSubmit,
}) {
  const [replacementGuideId, setReplacementGuideId] = useState('');
  const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setReplacementGuideId('');
      setReason('');
      setFieldErrors({});
    }
  }, [isOpen]);

  if (!isOpen || !trip) return null;

  // Filter out the currently assigned guide
  const eligibleGuides = (guides || []).filter((g) => g.guideId !== trip.guideId);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!replacementGuideId) {
      errors.replacementGuideId = 'Please select a replacement guide.';
    }
    if (!reason.trim()) {
      errors.reason = 'A mandatory justification is required for guide reassignment.';
    } else if (reason.trim().length < 5) {
      errors.reason = 'Justification must be at least 5 characters long.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    onSubmit({
      replacementGuideId: Number(replacementGuideId),
      reason: reason.trim(),
    });
  };

  const currentGuideName = (guides || []).find((g) => g.guideId === trip.guideId)?.name || 'Unassigned';

  return (
    <AdminDialog
      title={`Request Guide Reassignment — Trip #${trip.tripId}`}
      busy={busy}
      dialogError={dialogError}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem', color: '#166534' }}>
          <strong>Contractual Governance Notice:</strong> Submitting this request initiates the official 2-step actor consent workflow. The traveler will receive a consent request with your reason, followed by confirmation from the replacement guide. The trip assignment will only update after both parties grant their explicit consent.
        </div>

        <div style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
          <div><strong>Destination:</strong> {trip.destination}</div>
          <div><strong>Travel Dates:</strong> {trip.startDate} → {trip.endDate}</div>
          <div><strong>Currently Assigned:</strong> {currentGuideName}</div>
        </div>

        <SelectField
          label="Proposed Replacement Guide"
          name="replacementGuideId"
          value={replacementGuideId}
          error={fieldErrors.replacementGuideId}
          disabled={busy}
          onChange={(e) => {
            setReplacementGuideId(e.target.value);
            if (fieldErrors.replacementGuideId) {
              setFieldErrors((prev) => ({ ...prev, replacementGuideId: undefined }));
            }
          }}
          options={[
            { value: '', label: 'Select an available replacement guide...' },
            ...eligibleGuides.map((g) => ({
              value: String(g.guideId),
              label: `${g.name} — Rating: ${g.rating}★ | ₹${g.pricePerTrip}/trip | Exp: ${g.experience} yrs`,
            })),
          ]}
        />

        <div className="field-group" style={{ marginBottom: '16px' }}>
          <label htmlFor="reassignment-reason" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Operational Justification (Mandatory)
          </label>
          <textarea
            id="reassignment-reason"
            rows={4}
            placeholder="Explain why guide reassignment is necessary (e.g. guide schedule conflict, traveler preference, emergency)..."
            value={reason}
            disabled={busy}
            onChange={(e) => {
              setReason(e.target.value);
              if (fieldErrors.reason) {
                setFieldErrors((prev) => ({ ...prev, reason: undefined }));
              }
            }}
            style={{
              width: '100%',
              minHeight: '90px',
              padding: '10px 12px',
              borderRadius: '6px',
              border: fieldErrors.reason ? '1px solid #ef4444' : '1px solid #cbd5e1',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              color: '#1e293b',
              backgroundColor: busy ? '#f1f5f9' : '#ffffff',
              boxSizing: 'border-box',
              resize: 'vertical',
              outline: 'none',
              cursor: busy ? 'not-allowed' : 'text',
            }}
          />
          {fieldErrors.reason && (
            <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
              {fieldErrors.reason}
            </span>
          )}
        </div>

        <FormActions
          busy={busy}
          onCancel={onClose}
          submitLabel="Submit Reassignment Request"
        />
      </form>
    </AdminDialog>
  );
}
