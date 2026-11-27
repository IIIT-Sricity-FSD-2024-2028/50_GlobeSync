import React from 'react';
import { AdminDialog, Details, money } from './AdminUI';
import StatusBadge from '../common/StatusBadge';

export default function BookingInspectionModal({
  isOpen,
  booking = null,
  payment = null,
  payments = [],
  trip = null,
  agency = null,
  destinationName = 'Unknown Trip',
  ownerName = 'Unassigned',
  onClose,
}) {
  if (!isOpen || !booking) return null;

  const grossAmount =
    booking.total_minor != null
      ? Number(booking.total_minor) / 100
      : booking.totalPriceMinor != null
        ? Number(booking.totalPriceMinor) / 100
        : booking.amount != null
          ? Number(booking.amount)
          : booking.totalAmount != null
            ? Number(booking.totalAmount)
            : null;

  const insuranceAmount = Number(booking.insuranceAmount ?? booking.insuranceFee ?? 0);
  const cancellationFee = Number(booking.cancellationFee ?? 0);
  const hasCancellationProtection = Boolean(
    booking.cancellationProtectionSelected || booking.cancellationProtection,
  );
  const insuranceRatePct =
    booking.insuranceRate != null
      ? `${Math.round(Number(booking.insuranceRate) <= 1 ? Number(booking.insuranceRate) * 100 : Number(booking.insuranceRate))}%`
      : 'N/A';

  const baseServiceFee =
    grossAmount != null
      ? Number(booking.baseAmount ?? booking.serviceFee ?? Math.max(0, grossAmount - insuranceAmount - cancellationFee))
      : null;

  const isAgencyBooking = Boolean(booking.agencyId);
  const commissionRate = isAgencyBooking ? Number(agency?.commissionRate ?? 1.5) : 0;
  const agencyCommission =
    isAgencyBooking && grossAmount != null ? Math.round((grossAmount * commissionRate) / 100) : 0;
  const netPlatformSettlement =
    isAgencyBooking && grossAmount != null ? grossAmount - agencyCommission : grossAmount;

  const allPayments = payments.length > 0 ? payments : payment ? [payment] : [];
  const paidPayments = allPayments.filter((p) => String(p.status).toLowerCase() === 'paid');
  const paidTotal = paidPayments.reduce(
    (sum, p) => sum + (p.amountMinor != null ? Number(p.amountMinor) / 100 : Number(p.amount || 0)),
    0,
  );
  const expectedPayable = netPlatformSettlement ?? 0;
  const isSettled = ['CONFIRMED', 'PAID', 'COMPLETED'].includes(String(booking.status || '').toUpperCase()) || paidPayments.length > 0;
  const isCancelledOrRefunded = ['CANCELLED', 'REFUNDED', 'EXPIRED'].includes(String(booking.status || '').toUpperCase());
  const outstandingAmount = isCancelledOrRefunded || isSettled ? 0 : Math.max(0, expectedPayable - paidTotal);

  const detailItems = [
    ['Booking Reference', `BK00${booking.bookingId} (#${booking.bookingId})`],
    ['Booking Date', booking.bookingDate || 'N/A'],
    ['Item Type', booking.itemType || booking.type || 'Package'],
    ['Service Description', booking.service || 'Travel Booking'],
    ['Associated Trip', `${destinationName}${trip?.startDate ? ` (${trip.startDate} → ${trip.endDate})` : ''}`],
    ['Customer / Owner', ownerName],
    ['Gross Booking Amount', grossAmount === null ? 'Unavailable' : money(grossAmount)],
    ['Base Service Fee', baseServiceFee === null ? 'Unavailable' : money(baseServiceFee)],
  ];

  if (insuranceAmount > 0 || booking.insuranceSelected) {
    detailItems.push(['Travel Insurance', `${money(insuranceAmount)} (${insuranceRatePct})`]);
  }
  if (hasCancellationProtection || cancellationFee > 0) {
    detailItems.push(['Flexible Cancellation Protection', `${money(cancellationFee)} (Protected)`]);
  }
  if (isAgencyBooking && grossAmount != null) {
    detailItems.push([`Agency Commission (${commissionRate}%)`, money(agencyCommission)]);
    detailItems.push(['Net Platform Settlement', money(netPlatformSettlement)]);
  }
  detailItems.push(['Paid Amount', paidPayments.length > 0 ? money(paidTotal) : money(0) + ' (Unpaid)']);
  detailItems.push(['Outstanding Amount', money(outstandingAmount)]);
  if (booking.refundAmount != null) {
    detailItems.push(['Refunded Amount', `${money(booking.refundAmount)} (${booking.refundPercentage || 0}%)`]);
  }

  return (
    <AdminDialog
      title={`Booking Inspection — #${booking.bookingId}: ${booking.service || booking.type || 'Travel Item'}`}
      busy={false}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Operational Reservation Status:</span>
            <StatusBadge status={booking.status} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Recorded Gateway Payment Status:</span>
            {payment ? (
              <StatusBadge status={payment.status} />
            ) : (
              <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: 500 }}>
                Unrecorded / Pending Payment
              </span>
            )}
          </div>
        </div>

        <Details items={detailItems} />

        {allPayments.length > 0 && (
          <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <strong>Payment Attempts ({allPayments.length}):</strong>
            {allPayments.map((p) => (
              <div key={p.paymentId} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span>PAY-{p.paymentId} · {p.method || 'Online'} · {p.paymentDate || ''}</span>
                <span><strong>{money(p.amountMinor ? p.amountMinor / 100 : p.amount)}</strong> ({p.status})</span>
              </div>
            ))}
          </div>
        )}

        {(String(booking.status).toLowerCase() === 'cancelled' || booking.cancelledAt) && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', color: '#991b1b' }}>
            <strong>Cancellation Record:</strong> Reason: {booking.cancellationReason || 'Cancelled under policy'} | Cancelled At: {booking.cancelledAt ? new Date(booking.cancelledAt).toLocaleString() : 'Recorded'}
            {booking.refundAmount != null && (
              <div>Refund Processed: {money(booking.refundAmount)} ({booking.refundPercentage || 0}%)</div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </AdminDialog>
  );
}
