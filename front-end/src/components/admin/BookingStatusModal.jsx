import React, { useState, useEffect } from 'react';
import { AdminDialog, SelectField, Details, FormActions, bookingStatuses, money } from './AdminUI';
import StatusBadge from '../common/StatusBadge';

/**
 * Formats a stored insurance rate accurately.
 * In the GlobeSync data model, insurance rates are stored as fractional values
 * (e.g. 0.07 represents 7%, not 0.07%).
 *
 * @param {number|string|null} rate
 * @returns {string} Formatted percentage string
 */
export const formatInsuranceRate = (rate) => {
  if (rate == null) return 'N/A';
  const num = Number(rate);
  if (Number.isNaN(num)) return 'N/A';
  const pct = num <= 1 ? Math.round(num * 100) : num;
  return `${pct}% (stored: ${num})`;
};

/**
 * BookingStatusModal
 *
 * Controlled dialog component for inspecting booking financials and updating operational status.
 *
 * Pedagogical Architecture & Domain Constraints:
 * 1. Operational Status vs. Payment Status Separation:
 *    - Clearly distinguishes between operational reservation status (Pending, Confirmed, Cancelled)
 *      and actual financial settlement (Paid, Pending, or Unrecorded).
 *    - Explicitly clarifies to administrators and students that confirming a booking does NOT create
 *      or simulate a payment. Payments originate only from traveler gateway submission or agency billing.
 * 2. Accurate Insurance Rate Display:
 *    - Corrects the display of stored fractional insurance rates (0.07 = 7%).
 * 3. In-Dialog Error Rendering:
 *    - Displays any backend validation errors directly inside the active modal.
 */
export default function BookingStatusModal({
  isOpen,
  booking = null,
  payment = null,
  destinationName = 'Unknown Trip',
  ownerName = 'Unassigned',
  isBusy = false,
  error = null,
  onClose,
  onSubmit,
}) {
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    if (isOpen && booking) {
      setSelectedStatus(booking.status || 'Pending');
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const currentStatus = booking.status;
  const isChanged = selectedStatus !== currentStatus;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isChanged) {
      onClose();
      return;
    }
    onSubmit(booking.bookingId, selectedStatus);
  };

  const paymentDisplay = payment ? (
    <span>
      <StatusBadge status={payment.status} />{' '}
      <small style={{ color: '#64748b' }}>
        ({payment.method} &bull; {payment.paymentDate ? `Date: ${payment.paymentDate}` : ''})
      </small>
    </span>
  ) : (
    <span style={{ color: '#d97706', fontWeight: 500 }}>
      ⚠️ No payment recorded (Unpaid)
    </span>
  );

  const detailsEntries = [
    ['Booking ID', `#${booking.bookingId}`],
    ['Service Description', booking.service],
    ['Booking Type', booking.type],
    ['Associated Trip', destinationName],
    ['Customer / Account', ownerName],
    ['Booking Date', booking.bookingDate],
    ['Total Booking Value', money(booking.amount)],
    ['Transport Mode', booking.transportMode || 'Standard / Unspecified'],
    ['Travel Insurance', booking.insuranceSelected ? 'Yes (Selected)' : 'No (Declined)'],
    ['Insurance Rate', formatInsuranceRate(booking.insuranceRate)],
    ['Insurance Premium', booking.insuranceAmount != null ? money(booking.insuranceAmount) : 'N/A'],
    [
      'Cancellation Protection',
      booking.cancellationProtectionSelected ? 'Yes (Active)' : 'No (Declined)',
    ],
    [
      'Cancellation Fee / Coverage',
      booking.cancellationFee != null ? money(booking.cancellationFee) : 'N/A',
    ],
    ['Operational Status', <StatusBadge key="op-status" status={currentStatus} />],
    ['Recorded Payment Status', paymentDisplay],
  ];

  return (
    <AdminDialog
      title={`Booking #${booking.bookingId}: ${booking.service}`}
      onClose={onClose}
      busy={isBusy}
      error={error}
    >
      {/* Comprehensive Booking & Financial Details */}
      <Details entries={detailsEntries} />

      {/* Operational Policy Note */}
      <div
        className="admin-status-note"
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          backgroundColor: '#f8fafc',
          borderLeft: '4px solid #3b82f6',
          borderRadius: '4px',
          fontSize: '0.85rem',
          color: '#334155',
        }}
      >
        <strong>Policy Notice on Booking vs. Payment:</strong>
        <p style={{ margin: '0.25rem 0 0 0' }}>
          Confirming an operational booking reserves travel slots and itinerary resources.
          It does <strong>not</strong> create or simulate a payment record. Real payment records
          are generated exclusively when a traveler completes checkout or an agency settles billing.
        </p>
      </div>

      {/* Status Update Form */}
      <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
        <SelectField
          id="booking-status-select"
          label="Operational Booking Status"
          name="bookingStatus"
          values={bookingStatuses}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          disabled={isBusy}
          helperText="Pending = awaiting confirmation; Confirmed = reservation active; Cancelled = reservation released."
        />

        {selectedStatus === 'Cancelled' && currentStatus !== 'Cancelled' && (
          <div
            className="admin-field-error"
            style={{
              marginBottom: '12px',
              padding: '6px 10px',
              backgroundColor: '#fef2f2',
              borderRadius: '4px',
            }}
          >
            ⚠️ Marking this booking as Cancelled terminates the reservation hold.
          </div>
        )}

        <FormActions
          busy={isBusy}
          onCancel={onClose}
          submitLabel={isChanged ? 'Update Booking Status' : 'Close'}
        />
      </form>
    </AdminDialog>
  );
}
