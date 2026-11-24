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
  if (createdTrip.awaitingGuide) {
    const due = createdTrip.guideResponseDueAt ? new Date(createdTrip.guideResponseDueAt) : null;
    const dueText = due && !isNaN(due.getTime())
      ? due.toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })
      : 'within 3 hours';
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '36px 28px', borderRadius: '20px', background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>⏳</div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Request sent to your guide</h2>
          <p style={{ color: '#475569', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            <strong>{createdTrip.guideName || 'Your guide'}</strong> will reply within <strong>3 hours</strong> (by <strong>{dueText}</strong>)
            to say whether they will travel with you.
          </p>
          <div
            style={{
              textAlign: 'left',
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px 20px',
              fontSize: '13px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '22px',
            }}
          >
            <div><strong>Trip:</strong> #{createdTrip.tripId} • {createdTrip.destination} ({createdTrip.startDate} → {createdTrip.endDate})</div>
            <div><strong>Status:</strong> Saved as draft, waiting for guide</div>
            <div>✓ Your choices (transport, hotel, guide) are saved. Nothing is booked or charged yet.</div>
            <div>✓ When the guide accepts, you get a notification. Open <strong>My Trips</strong> and press <strong>Continue booking</strong> to book and pay.</div>
            <div>✓ If the guide declines or does not reply in 3 hours, you can choose another guide or continue without one.</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/traveler/trips" className="btn btn-primary" style={{ padding: '10px 22px', fontWeight: 700 }}>
              Go to My Trips
            </Link>
            <button type="button" onClick={onPlanAnotherTrip} className="btn btn-secondary" style={{ padding: '10px 22px', fontWeight: 600 }}>
              Plan another trip
            </button>
          </div>
        </div>
      </div>
    );
  }

  const actualStatus = createdTrip.status || submissionProgress.tripStatus || 'Pending';
  const isDraft = createdTrip.isDraft || actualStatus === 'Planning';

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
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>{isDraft ? '📝' : '🎉'}</div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
          {isDraft ? 'Itinerary Saved as Draft!' : 'Trip Created Successfully!'}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '460px', margin: '0 auto 24px' }}>
          Your itinerary from <strong>{createdTrip.origin || formData?.origin || formData?.currentLocation || 'New Delhi'}</strong> to <strong>{createdTrip.destination}</strong> has been saved with Trip ID{' '}
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
          <div>
            <strong>Route:</strong> 🛫 {createdTrip.origin || formData?.origin || formData?.currentLocation || 'New Delhi, India'} <span style={{ color: 'var(--primary)', margin: '0 4px' }}>➔</span> 🛬 {createdTrip.destination}
          </div>
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
            background: isDraft ? '#f0fdf4' : '#fefce8',
            border: isDraft ? '1px solid #bbf7d0' : '1px solid #fef08a',
            borderRadius: '10px',
            fontSize: '12px',
            color: isDraft ? '#166534' : '#854d0e',
            marginBottom: '24px',
            textAlign: 'left',
            lineHeight: 1.5,
          }}
        >
          {isDraft ? (
            <div>
              <strong>ℹ️ Draft Saved:</strong> This itinerary is saved in <strong>Planning</strong> status. No bookings were charged or created yet. You can resume planning, configure transport, and finalize bookings anytime from <strong>My Trips</strong>.
            </div>
          ) : (
            <div>
              <strong>ℹ️ Next Step:</strong> This trip is saved as <strong>Pending</strong>. Individual transport and hotel bookings require payment to confirm. Once all bookings are paid, your trip transitions to <strong>Confirmed</strong>.
            </div>
          )}
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
