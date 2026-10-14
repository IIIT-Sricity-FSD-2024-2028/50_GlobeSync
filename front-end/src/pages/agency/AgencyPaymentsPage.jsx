import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { paymentsApi, refundsApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';

/**
 * AgencyPaymentsPage
 * 
 * Displays the payments and associated refunds ledger for this agency.
 * Includes clear transparency notes highlighting that payment records
 * are simulated corporate ledger entries and not real financial transfers.
 */
export default function AgencyPaymentsPage() {
  const { user } = useSession();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter: 'all', 'paid', 'pending'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [paymentsData, refundsData] = await Promise.all([
        paymentsApi.getByAgency(agencyId, { signal }),
        refundsApi.getByAgency(agencyId, { signal }),
      ]);

      if (!signal?.aborted) {
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
        setRefunds(Array.isArray(refundsData) ? refundsData : []);
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Failed to load agency payments ledger:', err);
        setError(err.message || 'Failed to load payments from backend.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (agencyId) {
      loadData(controller.signal);
    }
    return () => controller.abort();
  }, [agencyId]);

  // Derived financial metrics
  const totalPaid = useMemo(() => {
    return payments
      .filter((p) => (p.status || '').toLowerCase() === 'paid')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const totalPending = useMemo(() => {
    return payments
      .filter((p) => (p.status || '').toLowerCase() === 'pending')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const totalActiveRefunds = useMemo(() => {
    return refunds
      .filter((r) => r.refundStatus === 'Processing' || r.refund_status === 'Processing')
      .reduce((sum, r) => {
        const p = payments.find((pay) => pay.paymentId === r.paymentId);
        return sum + (p ? Number(p.amount) || 0 : 0);
      }, 0);
  }, [refunds, payments]);

  // Filtered rows
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const status = (p.status || '').toLowerCase();
      const matchesStatus =
        statusFilter === 'all' || status === statusFilter.toLowerCase();

      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        String(p.paymentId || '').includes(search) ||
        String(p.bookingId || '').includes(search) ||
        String(p.tripId || '').includes(search) ||
        (p.method || '').toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [payments, statusFilter, searchTerm]);

  const filteredTotal = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  return (
    <div className="agency-payments-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner & Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '0 0 6px 0' }}>
          Payments & Billing Ledger
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', margin: 0, fontSize: '15px' }}>
          Track all recorded wholesale package payments and active refund settlements.
        </p>
      </div>

      {/* Mandatory Sandbox / Simulation Notice */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '22px', lineHeight: 1 }}>ℹ️</span>
        <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: 1.5 }}>
          <strong>Simulated Corporate Billing Notice:</strong> All transactions listed below reflect
          in-memory simulated payment confirmations for agency client packages. No live credit card
          or real bank transfers are initiated or processed in this demonstration environment.
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <SummaryCard
          title="Total Paid (All Time)"
          value={`₹${totalPaid.toLocaleString('en-IN')}`}
          subtitle={`${payments.filter((p) => (p.status || '').toLowerCase() === 'paid').length} completed transactions`}
          icon="💳"
        />
        <SummaryCard
          title="Pending Payments"
          value={`₹${totalPending.toLocaleString('en-IN')}`}
          subtitle={`${payments.filter((p) => (p.status || '').toLowerCase() === 'pending').length} awaiting confirmation`}
          icon="⏳"
        />
        <SummaryCard
          title="Active Refunds Value"
          value={`₹${totalActiveRefunds.toLocaleString('en-IN')}`}
          subtitle={`${refunds.filter((r) => (r.refundStatus || r.refund_status) === 'Processing').length} in processing`}
          icon="🔄"
        />
      </div>

      {/* Control bar: search & status filter tabs */}
      <div
        style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid var(--border-light, #e2e8f0)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          {['all', 'paid', 'pending'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              style={{
                border: 'none',
                background: statusFilter === tab ? '#fff' : 'transparent',
                color: statusFilter === tab ? '#0d9488' : '#64748b',
                fontWeight: statusFilter === tab ? 700 : 500,
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                textTransform: 'capitalize',
                boxShadow: statusFilter === tab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '14px',
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search ID, method, booking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                width: '240px',
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid var(--border-light, #e2e8f0)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px', animation: 'spin 1s infinite linear' }}>⏳</div>
            <p style={{ margin: 0, fontWeight: 600 }}>Loading payments and refund records...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <p style={{ margin: '0 0 16px 0', fontWeight: 600 }}>{error}</p>
            <button
              type="button"
              onClick={() => loadData()}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#0d9488',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b' }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>💳</div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#1e293b' }}>
              No payments recorded
            </h3>
            <p style={{ margin: 0, fontSize: '14px', maxWidth: '400px', marginInline: 'auto' }}>
              {searchTerm || statusFilter !== 'all'
                ? 'No payments match your current search and filter criteria.'
                : 'Transactions will appear here when client packages or custom itineraries are confirmed.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Payment ID
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Reference
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Amount
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Method
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Recorded Date
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Refund Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => {
                  const associatedRefund = refunds.find(
                    (r) => r.paymentId === p.paymentId || r.payment_id === p.paymentId
                  );

                  return (
                    <tr
                      key={p.paymentId || p.payment_id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>
                        #{p.paymentId || p.payment_id}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569' }}>
                        {p.bookingId ? `Booking #${p.bookingId}` : p.tripId ? `Trip #${p.tripId}` : '—'}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0d9488' }}>
                        ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#334155' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px' }}>🏦</span>
                          {p.method || 'Corporate Invoice'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <StatusBadge status={p.status || 'Pending'} />
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px' }}>
                        {p.paymentDate || p.payment_date || '—'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {associatedRefund ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background:
                                (associatedRefund.refundStatus || associatedRefund.refund_status) === 'Completed'
                                  ? '#dcfce7'
                                  : '#fef3c7',
                              color:
                                (associatedRefund.refundStatus || associatedRefund.refund_status) === 'Completed'
                                  ? '#166534'
                                  : '#92400e',
                            }}
                          >
                            Refund: {associatedRefund.refundStatus || associatedRefund.refund_status}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: '14px 18px', textAlign: 'right', color: '#64748b' }}>
                    Total Filtered:
                  </td>
                  <td style={{ padding: '14px 18px', color: '#0d9488' }}>
                    ₹{filteredTotal.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
