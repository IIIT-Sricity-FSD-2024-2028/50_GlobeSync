import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { refundsApi, travelersApi, bookingsApi, paymentsApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';
import SupportRefundDetailModal from '../../components/support/SupportRefundDetailModal';
import SupportCreateRefundModal from '../../components/support/SupportCreateRefundModal';

/**
 * SupportRefundsPage
 * 
 * Manages traveler refund claims and processing actions for customer support.
 * Explicitly distinguishes internal platform ledger adjustments from real payment gateway settlements.
 */
export default function SupportRefundsPage() {
  const [searchParams] = useSearchParams();
  const prefillTravelerId = searchParams.get('travelerId');

  const [refunds, setRefunds] = useState([]);
  const [travelers, setTravelers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(Boolean(prefillTravelerId));
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [refundsRes, travelersRes, bookingsRes, paymentsRes] = await Promise.allSettled([
        refundsApi.getAll({ signal }),
        travelersApi.getAll({ signal }),
        bookingsApi.getAll({ signal }),
        paymentsApi.getAll({ signal }),
      ]);

      if (signal?.aborted) return;

      if (refundsRes.status === 'fulfilled' && Array.isArray(refundsRes.value)) {
        setRefunds(refundsRes.value);
      } else if (!refundsRes.reason?.isCancelled) {
        setError(refundsRes.reason?.message || 'Failed to load refund records from backend');
      }

      if (travelersRes.status === 'fulfilled' && Array.isArray(travelersRes.value)) {
        setTravelers(travelersRes.value);
      }
      if (bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value)) {
        setBookings(bookingsRes.value);
      }
      if (paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value)) {
        setPayments(paymentsRes.value);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(err.message || 'An unexpected error occurred while loading refund data.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, []);

  // Status updates
  const handleStatusUpdate = async (refundId, newStatus) => {
    await refundsApi.updateStatus(refundId, newStatus);
    showToast(`Refund REF00${refundId} updated to ${newStatus}! ✓`);
    const refreshed = await refundsApi.getAll();
    if (refreshed) setRefunds(refreshed);
    setSelectedRefund((prev) => (prev && prev.refundId === refundId ? { ...prev, refundStatus: newStatus } : prev));
  };

  // Create refund
  const handleCreateRefund = async (refundData) => {
    await refundsApi.create(refundData);
    showToast('Refund claim successfully recorded! ✓');
    const refreshed = await refundsApi.getAll();
    if (refreshed) setRefunds(refreshed);
  };

  // Filtered refunds
  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      const matchesStatus =
        statusFilter === 'All' ||
        (r.refundStatus || '').toLowerCase() === statusFilter.toLowerCase();

      const search = searchTerm.toLowerCase().trim();
      const pmtStr = `pmt00${r.paymentId}`.toLowerCase();
      const refStr = `ref00${r.refundId}`.toLowerCase();

      // Find linked payment & booking
      const payment = payments.find((p) => p.paymentId === r.paymentId);
      const booking = payment ? bookings.find((b) => b.bookingId === payment.bookingId) : null;
      const traveler = booking ? travelers.find((t) => (t.travelerId || t.traveler_id) === booking.travelerId) : null;
      const travelerName = traveler ? traveler.name.toLowerCase() : '';

      const matchesSearch =
        !search ||
        refStr.includes(search) ||
        pmtStr.includes(search) ||
        String(r.paymentId).includes(search) ||
        travelerName.includes(search) ||
        (r.refundDate || '').includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [refunds, payments, bookings, travelers, statusFilter, searchTerm]);

  // Metric counts
  const totalRefunds = refunds.length;
  const processingRefunds = refunds.filter((r) => r.refundStatus === 'Processing').length;
  const completedRefunds = refunds.filter((r) => r.refundStatus === 'Completed').length;
  const rejectedRefunds = refunds.filter((r) => r.refundStatus === 'Rejected').length;

  return (
    <div>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontWeight: 700,
            fontSize: '14px',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Top Welcome Bar */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Refund Ledger & Processing 💰
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Review, investigate, and record internal ledger refund claims for traveler bookings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
            border: 'none',
            fontWeight: 700,
            padding: '10px 18px',
          }}
        >
          + Initiate Refund
        </button>
      </div>

      {/* Gateway Distinction Disclaimer Banner */}
      <div
        style={{
          padding: '16px 20px',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '14px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.05)',
        }}
      >
        <div style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>⚖️</div>
        <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#065f46' }}>
          <strong>Policy Notice on Internal Ledger Updates vs External Gateway Transfers:</strong>
          <br />
          Updating refund records to <em>Completed</em> records an approved credit within the GlobeSync internal revenue ledger. External banking rails (e.g. credit card reversals or gateway ACH transfers) require third-party settlement (5-7 business days) or remain simulated demo records. No real automated third-party wire transfers are executed.
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard
          label="Total Refund Claims"
          value={loading ? '...' : totalRefunds}
          icon="📋"
          subtitle="All platform refund requests"
          color="#3b82f6"
        />
        <SummaryCard
          label="Processing / In Review"
          value={loading ? '...' : processingRefunds}
          icon="⏳"
          subtitle="Awaiting support decision"
          badge="Action Needed"
          color="#f59e0b"
        />
        <SummaryCard
          label="Completed (Approved)"
          value={loading ? '...' : completedRefunds}
          icon="✅"
          subtitle="Internal ledger credited"
          color="#10b981"
        />
        <SummaryCard
          label="Rejected Claims"
          value={loading ? '...' : rejectedRefunds}
          icon="✕"
          subtitle="Declined after investigation"
          color="#ef4444"
        />
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
        {/* Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '16px',
          }}
        >
          <div style={{ minWidth: '260px', flex: '1 1 260px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search by REF#, PMT#, traveler, date..."
              className="form-control"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
            Loading refund records...
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>💰</div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>No refund records</h4>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>No records match your selected criteria.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Refund ID</th>
                  <th style={{ padding: '10px 12px' }}>Payment Ref</th>
                  <th style={{ padding: '10px 12px' }}>Traveler / Booking</th>
                  <th style={{ padding: '10px 12px' }}>Recorded Date</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRefunds.map((r) => {
                  const pmt = payments.find((p) => p.paymentId === r.paymentId);
                  const bk = pmt ? bookings.find((b) => b.bookingId === pmt.bookingId) : null;
                  const tr = bk ? travelers.find((t) => (t.travelerId || t.traveler_id) === bk.travelerId) : null;

                  return (
                    <tr key={r.refundId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#10b981' }}>
                        REF00{r.refundId}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>
                        PMT00{r.paymentId}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{tr ? tr.name : 'Registered Traveler'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {bk ? `${bk.service} ($${bk.amount})` : `BK00${pmt?.bookingId || 'N/A'}`}
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--muted)', fontSize: '13px' }}>
                        {r.refundDate || 'N/A'} {r.refundTime ? `at ${r.refundTime}` : ''}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge status={r.refundStatus || 'Processing'} />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedRefund(r)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          👁 Inspect / Process
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Details Modal */}
      {selectedRefund && (
        <SupportRefundDetailModal
          isOpen={Boolean(selectedRefund)}
          refund={selectedRefund}
          payment={payments.find((p) => p.paymentId === selectedRefund.paymentId)}
          booking={(() => {
            const p = payments.find((pay) => pay.paymentId === selectedRefund.paymentId);
            return p ? bookings.find((b) => b.bookingId === p.bookingId) : null;
          })()}
          traveler={(() => {
            const p = payments.find((pay) => pay.paymentId === selectedRefund.paymentId);
            const b = p ? bookings.find((bk) => bk.bookingId === p.bookingId) : null;
            return b ? travelers.find((t) => (t.travelerId || t.traveler_id) === b.travelerId) : null;
          })()}
          onClose={() => setSelectedRefund(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Create Refund Modal */}
      <SupportCreateRefundModal
        isOpen={isCreateModalOpen}
        travelers={travelers}
        bookings={bookings}
        payments={payments}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateRefund}
      />
    </div>
  );
}
