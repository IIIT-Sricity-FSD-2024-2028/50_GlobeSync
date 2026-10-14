import React, { useState, useEffect } from 'react';
import {
  AdminDialog,
  Field,
  SelectField,
  FormActions,
  Details,
  tripStatuses,
  money,
} from './AdminUI';

/**
 * Permitted transitions map according to backend Finite State Machine.
 */
const ALLOWED_TRANSITIONS = {
  Planning: ['Pending', 'Cancelled'],
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Active', 'Cancelled'],
  Active: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

/**
 * TripEditModal
 *
 * Controlled dialog component for editing trip details and managing guide assignment/reassignment.
 *
 * Pedagogical Architecture & Domain Rules:
 * 1. Owner Relationship Preservation:
 *    - The trip's customer ownership (travelerId or agencyId) is immutable here and preserved in the update payload.
 * 2. Guide Assignment & GuideStatus Reset:
 *    - Administrators can assign or reassign a certified guide from the registered guides list.
 *    - When guideId changes, backend policy automatically resets guideStatus to 'Pending'
 *      (or clears it if set to unassigned/null) to solicit acceptance from the new guide.
 * 3. Status Transitions (FSM):
 *    - Validates status transitions against ALLOWED_TRANSITIONS.
 *    - Highlights that transitioning to 'Completed' triggers commission settlement.
 * 4. In-Dialog Error Display:
 *    - Renders any backend validation failure directly inside the dialog.
 */
export default function TripEditModal({
  isOpen,
  trip = null,
  guides = [],
  ownerName = 'Unassigned',
  packageName = 'Custom trip',
  isBusy = false,
  error = null,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    guideId: '',
    status: 'Planning',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [guideNote, setGuideNote] = useState(null);
  const [statusNote, setStatusNote] = useState(null);

  // Synchronize form state whenever dialog opens with a target trip
  useEffect(() => {
    if (isOpen && trip) {
      setFormData({
        destination: trip.destination || '',
        startDate: trip.startDate || '',
        endDate: trip.endDate || '',
        budget: trip.budget != null ? String(trip.budget) : '',
        guideId: trip.guideId != null ? String(trip.guideId) : '',
        status: trip.status || 'Planning',
      });
      setFieldErrors({});
      setGuideNote(null);
      setStatusNote(null);
    }
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;

  const currentStatus = trip.status;
  const currentGuideId = trip.guideId != null ? String(trip.guideId) : '';
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];

  /**
   * Universal change handler with real-time domain guidance.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-level error
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    // Guide change advisory
    if (name === 'guideId') {
      if (value !== currentGuideId) {
        if (value === '') {
          setGuideNote('Removing the assigned guide will clear guideStatus.');
        } else {
          const newGuide = guides.find((g) => String(g.guideId) === value);
          const guideLabel = newGuide ? newGuide.name : `#${value}`;
          setGuideNote(
            `Assigning ${guideLabel} will reset guideStatus to 'Pending', requesting acceptance from the newly assigned guide.`
          );
        }
      } else {
        setGuideNote(null);
      }
    }

    // Status change advisory
    if (name === 'status') {
      if (value === currentStatus) {
        setStatusNote(null);
      } else if (!allowedNext.includes(value)) {
        setStatusNote(
          `⚠️ Invalid transition from '${currentStatus}' to '${value}'. Allowed transitions: [${allowedNext.join(', ')}].`
        );
      } else if (value === 'Completed') {
        setStatusNote(
          'ℹ️ Transitioning to Completed will finalize this trip and automatically settle all pending partner commissions.'
        );
      } else {
        setStatusNote(`Advancing trip lifecycle from '${currentStatus}' to '${value}'.`);
      }
    }
  };

  /**
   * Validates form fields prior to dispatching update.
   */
  const validateForm = () => {
    const errors = {};

    if (!formData.destination.trim()) {
      errors.destination = 'Destination is required.';
    } else if (formData.destination.trim().length < 3) {
      errors.destination = 'Destination must be at least 3 characters.';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required.';
    }

    if (!formData.endDate) {
      errors.endDate = 'End date is required.';
    } else if (formData.startDate && formData.endDate < formData.startDate) {
      errors.endDate = 'End date cannot be earlier than start date.';
    }

    const budgetNum = Number(formData.budget);
    if (!formData.budget || Number.isNaN(budgetNum) || budgetNum <= 0) {
      errors.budget = 'Please enter a valid positive budget amount in INR.';
    }

    // FSM status transition check
    if (formData.status !== currentStatus && !allowedNext.includes(formData.status)) {
      errors.status = `Cannot transition from '${currentStatus}' to '${formData.status}'. Allowed: [${allowedNext.join(', ')}].`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Construct sanitized payload preserving owner relationships
    const payload = {
      destination: formData.destination.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      budget: Number(formData.budget),
      guideId: formData.guideId === '' ? null : Number(formData.guideId),
      status: formData.status,
      // Preserve existing owner relationship
      ...(trip.travelerId != null ? { travelerId: trip.travelerId } : {}),
      ...(trip.agencyId != null ? { agencyId: trip.agencyId } : {}),
      ...(trip.packageId != null ? { packageId: trip.packageId } : {}),
    };

    onSubmit(trip.tripId, payload);
  };

  const readOnlyEntries = [
    ['Trip ID', `#${trip.tripId}`],
    ['Customer / Owner', ownerName],
    ['Package Reference', packageName],
    ['Current Guide Status', trip.guideStatus || 'Unassigned / None'],
  ];

  return (
    <AdminDialog
      title={`Edit Trip #${trip.tripId}: ${trip.destination}`}
      onClose={onClose}
      busy={isBusy}
      error={error}
    >
      <Details entries={readOnlyEntries} />

      <form onSubmit={handleSubmit} noValidate style={{ marginTop: '16px' }}>
        <Field
          id="trip-destination"
          label="Destination"
          name="destination"
          value={formData.destination}
          onChange={handleChange}
          required
          disabled={isBusy}
          error={fieldErrors.destination}
          helperText="Primary travel location or tour circuit."
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field
            id="trip-startDate"
            label="Start Date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            required
            disabled={isBusy}
            error={fieldErrors.startDate}
          />
          <Field
            id="trip-endDate"
            label="End Date"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange}
            required
            disabled={isBusy}
            error={fieldErrors.endDate}
          />
        </div>

        <Field
          id="trip-budget"
          label="Budget (INR)"
          name="budget"
          type="number"
          min="1"
          step="1"
          value={formData.budget}
          onChange={handleChange}
          required
          disabled={isBusy}
          error={fieldErrors.budget}
          helperText="Total budgeted package cost."
        />

        {/* Guide Assignment / Reassignment */}
        <div className="admin-field-group">
          <label htmlFor="trip-guideId" className="admin-field-label">
            Assigned Tour Guide
          </label>
          <select
            id="trip-guideId"
            name="guideId"
            className="form-control"
            value={formData.guideId}
            onChange={handleChange}
            disabled={isBusy}
          >
            <option value="">-- No Guide Assigned (Unassigned) --</option>
            {guides.map((g) => (
              <option key={g.guideId} value={String(g.guideId)}>
                {g.name} ({g.email || `Guide #${g.guideId}`})
              </option>
            ))}
          </select>
          <span className="admin-field-help">
            Select a verified guide. Reassigning a guide automatically resets Guide Response to 'Pending'.
          </span>
          {guideNote && (
            <div
              className="admin-status-note"
              style={{
                marginTop: '6px',
                padding: '6px 10px',
                backgroundColor: '#eff6ff',
                borderRadius: '4px',
                fontSize: '0.85rem',
                color: '#1e40af',
              }}
            >
              ℹ️ {guideNote}
            </div>
          )}
        </div>

        {/* Status Transition */}
        <SelectField
          id="trip-status"
          label="Trip Status"
          name="status"
          values={tripStatuses}
          value={formData.status}
          onChange={handleChange}
          disabled={isBusy}
          error={fieldErrors.status}
          helperText={`Current status: ${currentStatus}. Valid transitions: [${allowedNext.join(', ') || 'None (Terminal)'}].`}
        />

        {statusNote && (
          <div
            className="admin-status-note"
            style={{
              marginBottom: '1rem',
              padding: '8px 12px',
              backgroundColor: statusNote.startsWith('⚠️') ? '#fef2f2' : '#f0fdf4',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: statusNote.startsWith('⚠️') ? '#991b1b' : '#166534',
            }}
          >
            {statusNote}
          </div>
        )}

        <FormActions
          busy={isBusy}
          onCancel={onClose}
          submitLabel="Save Trip & Assignment"
        />
      </form>
    </AdminDialog>
  );
}
