import React, { useState, useEffect } from 'react';
import { AdminDialog, SelectField, Details, FormActions, tripStatuses, money } from './AdminUI';

/**
 * TripStatusModal
 *
 * Controlled dialog component for inspecting an assigned trip and updating its lifecycle status.
 *
 * Responsibilities:
 * - Displays a comprehensive, structured read-only summary of the trip.
 * - Manages the controlled `nextStatus` selection state.
 * - Educational feature: Explains backend Finite State Machine (FSM) transition rules:
 *   - Planning  -> [Pending, Cancelled]
 *   - Pending   -> [Confirmed, Cancelled]
 *   - Confirmed -> [Active, Cancelled]
 *   - Active    -> [Completed, Cancelled]
 *   - Terminal statuses (Completed, Cancelled) cannot transition further.
 * - Highlights domain consequences: Marking a trip as 'Completed' automatically settles
 *   all pending agency commissions linked to the tour.
 * - Displays errors directly inside the active dialog.
 */

// Permitted transitions map according to backend Finite State Machine
const ALLOWED_TRANSITIONS = {
  Planning: ['Pending', 'Cancelled'],
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Active', 'Cancelled'],
  Active: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

export default function TripStatusModal({
  isOpen,
  trip = null,
  ownerName = 'Unassigned',
  guideName = 'Unassigned',
  packageName = 'Custom trip',
  isBusy = false,
  error = null,
  onClose,
  onSubmit,
}) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [validationNote, setValidationNote] = useState(null);

  // Sync draft status whenever dialog opens with a new trip
  useEffect(() => {
    if (isOpen && trip) {
      setSelectedStatus(trip.status || 'Planning');
      setValidationNote(null);
    }
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;

  const currentStatus = trip.status;
  const isChanged = selectedStatus !== currentStatus;
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  const isTerminal = currentStatus === 'Completed' || currentStatus === 'Cancelled';
  const isTransitionValid = selectedStatus === currentStatus || allowedNext.includes(selectedStatus);

  // Status change handler with instant validation explanation
  const handleStatusChange = (e) => {
    const next = e.target.value;
    setSelectedStatus(next);

    if (next === currentStatus) {
      setValidationNote(null);
    } else if (!allowedNext.includes(next)) {
      setValidationNote(
        `⚠️ Invalid transition from '${currentStatus}' to '${next}'. Backend lifecycle rules permit: [${allowedNext.join(', ')}].`
      );
    } else if (next === 'Completed') {
      setValidationNote(
        'ℹ️ Marking this trip as Completed will finalize the tour and automatically settle all pending agency commissions.'
      );
    } else {
      setValidationNote(`Advancing trip lifecycle from '${currentStatus}' to '${next}'.`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isChanged) {
      onClose();
      return;
    }
    onSubmit(trip.tripId, selectedStatus);
  };

  const detailsEntries = [
    ['Trip ID', `#${trip.tripId}`],
    ['Destination', trip.destination],
    ['Customer / Requestor', ownerName],
    ['Travel Dates', `${trip.startDate} to ${trip.endDate}`],
    ['Estimated Budget', money(trip.budget)],
    ['Assigned Guide', guideName],
    ['Guide Response', trip.guideStatus || 'Pending Response'],
    ['Package Reference', packageName],
    ['Current Status', currentStatus],
  ];

  return (
    <AdminDialog
      title={`Trip #${trip.tripId}: ${trip.destination}`}
      onClose={onClose}
      busy={isBusy}
      error={error}
    >
      {/* Read-only Structured Details */}
      <Details entries={detailsEntries} />

      {/* Status Update Form */}
      <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
        <SelectField
          label="Lifecycle Status"
          name="tripStatus"
          values={tripStatuses}
          value={selectedStatus}
          onChange={handleStatusChange}
          disabled={isBusy || isTerminal}
          helperText={
            isTerminal
              ? `This trip is in terminal status '${currentStatus}' and cannot be transitioned further.`
              : `Allowed next steps: ${allowedNext.join(', ') || 'None'}`
          }
        />

        {/* Dynamic Transition Context Note */}
        {validationNote && (
          <div
            className={isTransitionValid ? 'admin-status-note' : 'admin-field-error'}
            style={{ marginBottom: '14px' }}
          >
            {validationNote}
          </div>
        )}

        <FormActions
          busy={isBusy}
          submitLabel={isChanged ? `Update to ${selectedStatus}` : 'Done'}
          onCancel={onClose}
        />
      </form>
    </AdminDialog>
  );
}
