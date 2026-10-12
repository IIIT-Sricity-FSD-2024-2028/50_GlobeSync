import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';

/**
 * TripCreationSuccessView: Displays truthful confirmation view for newly created trips.
 * 
 * Features:
 * - Shows actual saved backend status (Pending)
 * - Lists linked booking records (Transport and Hotel)
 * - Shows guide assignment status with explicit retry if message failed
 * - Clarifies next steps: individual bookings require payment to confirm the trip
 */
export default function TripCreationSuccessView({
  createdTrip,
  submissionProgress,
  formData,
  onRetryGuideNotification,
  onPlanAnotherTrip,
  onClearSubmission,
}) {
  const actualStatus = createdTrip.status || submissionProgress.tripStatus || 'Pending';

  return (
    <div style={{ maxWidth: '680px', margin: '40px auto', textAlign: 'center' }}>
      <div
        className="card"
        style={{
          padding: '40px 32px',
          borderRadius: '20px',
          background: '#ffffff',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
          Trip Created Successfully!
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '460px', margin: '0 auto 24px' }}>
          Your itinerary for <strong>{createdTrip.destination}</strong> has been saved with Trip ID{' '}
          <strong>#{createdTrip.tripId}</strong>.
        </p>

        {/* Saved Record Details Card */}
        <div
          style={{
            padding: '18px 22px',
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            textAlign: 'left',
            marginBottom: '24px',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><strong>Trip ID:</strong> #{createdTrip.tripId}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Saved Status:</span>
              <StatusBadge status={actualStatus} />
            </div>
          </div>
          <div><strong>Destination:</strong> {createdTrip.destination}</div>
          <div><strong>Dates:</strong> {createdTrip.startDate} → {createdTrip.endDate}</div>
          <div><strong>Total Trip Budget:</strong> ₹{Number(createdTrip.budget).toLocaleString('en-IN')}</div>

          {/* Linked Bookings Information */}
          <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px dashed var(--border)' }}>
            <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Linked Booking Records:
            </div>
            {submissionProgress.transportBooking?.completed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
                <span>✓</span>
                <span>Transport Booking: <strong>#{submissionProgress.transportBooking.bookingId}</strong> ({formData.transportName || 'Transport'})</span>
              </div>
            ) : formData.transportName ? (
              <div style={{ color: '#b45309' }}>⚠️ Transport booking pending</div>
            ) : null}

            {submissionProgress.hotelBooking?.completed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', marginTop: '4px' }}>
                <span>✓</span>
                <span>Accommodation Booking: <strong>#{submissionProgress.hotelBooking.bookingId}</strong> ({formData.hotelName || 'Stay'})</span>
              </div>
            ) : formData.hotelName ? (
              <div style={{ color: '#b45309', marginTop: '4px' }}>⚠️ Accommodation booking pending</div>
            ) : null}

            {/* Guide Assignment Status */}
            {formData.guideId && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)' }}>
                {submissionProgress.guideNotification?.completed ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
                    <span>✓</span>
                    <span>Guide Assignment: Tour guide #{formData.guideId} notified via message.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', color: '#b45309' }}>
                    <span>⚠️ Guide assigned to trip, but introductory message failed ({submissionProgress.guideNotification?.error || 'delivery error'}).</span>
                    <button
                      type="button"
                      onClick={onRetryGuideNotification}
                      style={{
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        color: '#92400e',
                        fontWeight: 700,
                        fontSize: '11px',
                        padding: '3px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      Retry Message ↺
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Truthful Guidance Note */}
        <div
          style={{
            padding: '12px 16px',
            background: '#fefce8',
            border: '1px solid #fef08a',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#854d0e',
            marginBottom: '24px',
            textAlign: 'left',
            lineHeight: 1.5,
          }}
        >
          <strong>ℹ️ Next Step:</strong> This trip is saved as <strong>Pending</strong>. Individual transport and hotel bookings require payment to confirm. Once all bookings are paid, your trip transitions to <strong>Confirmed</strong>.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/traveler/bookings"
            className="btn btn-primary"
            onClick={onClearSubmission}
            style={{ padding: '10px 22px', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}
          >
            Pay Bookings 💳 →
          </Link>
          <Link
            to="/traveler/trips"
            className="btn btn-secondary"
            onClick={onClearSubmission}
            style={{ padding: '10px 20px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}
          >
            View in My Trips 📍
          </Link>
          <button
            type="button"
            onClick={onPlanAnotherTrip}
            className="btn btn-secondary"
            style={{ padding: '10px 18px', fontSize: '13px' }}
          >
            Plan Another Trip
          </button>
        </div>
      </div>
    </div>
  );
}
