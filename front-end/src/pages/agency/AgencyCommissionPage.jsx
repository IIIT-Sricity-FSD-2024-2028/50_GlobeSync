import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { agencyApi, agenciesApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';

/**
 * AgencyCommissionPage
 * 
 * Provides live partner commission ledger, margin breakdown, and revenue statement.
 * Fetches live data from GET /api/agency/commissions joined with Trip and Booking details.
 * Includes CSV export for accounting and filter tabs (ALL, PENDING, EARNED, CANCELLED).
 */
export default function AgencyCommissionPage() {
  const { user } = useSession();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [agencyProfile, setAgencyProfile] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter tabs: 'ALL', 'PENDING', 'EARNED', 'CANCELLED'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [commData, profData] = await Promise.all([
        agencyApi.getCommissions({ signal }).catch(() => []),
        agenciesApi.getById(agencyId, { signal }).catch(() => null),
      ]);

      if (!signal?.aborted) {
        setCommissions(Array.isArray(commData) ? commData : []);
        setAgencyProfile(profData);
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Failed to load agency commission data:', err);
        setError(err.message || 'Failed to load commission statement.');
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

  // Contract commission rate
  const contractedRate = useMemo(() => {
    if (agencyProfile?.commissionRate !== undefined && agencyProfile?.commissionRate !== null) {
      return Number(agencyProfile.commissionRate);
    }
    if (user?.commissionRate !== undefined && user?.commissionRate !== null) {
      return Number(user.commissionRate);
    }
    return 10.0;
  }, [agencyProfile, user]);

  // Aggregate stats
  const totalGrossSales = useMemo(() => {
    return commissions
      .filter((c) => c.status !== 'cancelled' && c.status !== 'void')
      .reduce((sum, item) => sum + Number(item.grossAmount || 0), 0);
  }, [commissions]);

  const earnedCommission = useMemo(() => {
    return commissions
      .filter((c) => c.status === 'earned' || c.status === 'settled')
      .reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0);
  }, [commissions]);

  const pendingCommission = useMemo(() => {
    return commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0);
  }, [commissions]);

  const averageCommissionRate = useMemo(() => {
    const activeEntries = commissions.filter((c) => c.status !== 'cancelled' && c.status !== 'void');
    if (activeEntries.length === 0) return contractedRate;
    const totalRate = activeEntries.reduce((sum, item) => sum + Number(item.rate || contractedRate), 0);
    return Number((totalRate / activeEntries.length).toFixed(1));
  }, [commissions, contractedRate]);

  // Filtered rows
  const filteredLedger = useMemo(() => {
    return commissions.filter((item) => {
      // Status matching
      let matchesStatus = true;
      const st = (item.status || '').toLowerCase();
      if (statusFilter === 'PENDING') {
        matchesStatus = st === 'pending';
      } else if (statusFilter === 'EARNED') {
        matchesStatus = st === 'earned' || st === 'settled';
      } else if (statusFilter === 'CANCELLED') {
        matchesStatus = st === 'cancelled' || st === 'void';
      }

      // Search matching
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        String(item.commissionId || '').includes(term) ||
        String(item.tripId || '').includes(term) ||
        String(item.bookingRef || '').toLowerCase().includes(term) ||
        String(item.tripTitle || '').toLowerCase().includes(term) ||
        String(item.destination || '').toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [commissions, statusFilter, searchTerm]);

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredLedger.length === 0) return;

    const headers = [
      'Commission ID',
      'Trip / Booking',
      'Destination',
      'Gross Amount (₹)',
      'Commission Rate (%)',
      'Commission Amount (₹)',
      'Status',
      'Date',
    ];

    const rows = filteredLedger.map((row) => [
      row.commissionId || `COM-${row.tripId}`,
      `"${(row.tripTitle || row.bookingRef || `Trip #${row.tripId}`).replace(/"/g, '""')}"`,
      `"${(row.destination || 'N/A').replace(/"/g, '""')}"`,
      Number(row.grossAmount || 0),
      Number(row.rate || contractedRate),
      Number(row.commissionAmount || 0),
      (row.status || 'pending').toUpperCase(),
      `"${(row.createdAt || row.date || new Date().toISOString().slice(0, 10)).replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `agency_commissions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeStyle = (status) => {
    const st = (status || '').toLowerCase();
    if (st === 'earned' || st === 'settled') {
      return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', label: 'EARNED' };
    }
    if (st === 'pending') {
      return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', label: 'PENDING' };
    }
    if (st === 'cancelled' || st === 'void') {
      return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', label: 'CANCELLED' };
    }
    return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', label: (status || 'UNKNOWN').toUpperCase() };
  };

  return (
    <div className="agency-commission-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Commission Ledger & B2B Margins
            </h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
              Real-time audit log of partner commissions, client trip gross bookings, and payout settlement status.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
                borderRadius: '24px',
                padding: '6px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '13px', color: '#0f766e', fontWeight: 600 }}>Contracted Rate:</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0d9488' }}>{contractedRate}%</span>
            </div>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredLedger.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: filteredLedger.length === 0 ? '#f1f5f9' : '#0d9488',
                color: filteredLedger.length === 0 ? '#94a3b8' : '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: filteredLedger.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: filteredLedger.length === 0 ? 'none' : '0 2px 6px rgba(13,148,136,0.25)',
              }}
            >
              📥 Export to CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard
          title="Total Gross Sales"
          value={`₹${totalGrossSales.toLocaleString('en-IN')}`}
          subtitle="Cumulative gross client trip value"
          icon="📈"
        />
        <SummaryCard
          title="Total Commission Earned"
          value={`₹${earnedCommission.toLocaleString('en-IN')}`}
          subtitle="Confirmed & realized partner margin"
          icon="💰"
        />
        <SummaryCard
          title="Pending Commission"
          value={`₹${pendingCommission.toLocaleString('en-IN')}`}
          subtitle="Awaiting client trip completion"
          icon="⏳"
        />
        <SummaryCard
          title="Average Commission Rate"
          value={`${averageCommissionRate}%`}
          subtitle="Across all agency bookings"
          icon="📊"
        />
      </div>

      {/* Auto-settlement policy alert */}
      <div
        style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: '#92400e',
        }}
      >
        <span style={{ fontSize: '18px' }}>ℹ️</span>
        <div>
          <strong>Settlement Policy:</strong> Commissions are recorded in <strong>PENDING</strong> status when trips are booked,
          automatically become <strong>EARNED</strong> upon client payment confirmation, and settle when the tour completes.
          Cancelled trips are automatically marked <strong>CANCELLED</strong> with commission voided.
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          {['ALL', 'PENDING', 'EARNED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              style={{
                border: 'none',
                background: statusFilter === tab ? '#fff' : 'transparent',
                color: statusFilter === tab ? '#0d9488' : '#64748b',
                fontWeight: statusFilter === tab ? 700 : 600,
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                boxShadow: statusFilter === tab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search trip, destination, ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              width: '240px',
            }}
          />
          <button
            type="button"
            onClick={() => {
              const controller = new AbortController();
              loadData(controller.signal);
            }}
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

      {/* Main Ledger Table */}
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            Loading live commission ledger...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
            <p style={{ margin: '0 0 16px 0', fontWeight: 600 }}>{error}</p>
            <button
              type="button"
              onClick={() => {
                const controller = new AbortController();
                loadData(controller.signal);
              }}
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
        ) : filteredLedger.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b' }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>📊</div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#1e293b' }}>
              No commission entries found
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Commissions will automatically generate when you create client trips or resell packages.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Entry ID
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Trip / Booking Details
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Destination
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Gross Amount
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Rate
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Commission Margin
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Date Recorded
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((row) => {
                  const badge = getStatusBadgeStyle(row.status);
                  return (
                    <tr key={row.commissionId || row.tripId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0d9488' }}>
                        #{row.commissionId || `TR-${row.tripId}`}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {row.tripTitle || `Trip #${row.tripId}`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Ref: {row.bookingRef || `TR-${row.tripId}`}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#334155' }}>
                        {row.destination || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#475569' }}>
                        ₹{Number(row.grossAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748b' }}>
                        {row.rate || contractedRate}%
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0d9488', fontSize: '15px' }}>
                        ₹{Number(row.commissionAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: badge.background,
                            color: badge.color,
                            border: badge.border,
                            display: 'inline-block',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px' }}>
                        {row.createdAt || row.date || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                  <td colSpan={3} style={{ padding: '14px 18px', textAlign: 'right', color: '#64748b' }}>
                    Filtered Subtotals:
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569' }}>
                    ₹{filteredLedger.reduce((sum, r) => sum + Number(r.grossAmount || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td></td>
                  <td style={{ padding: '14px 18px', color: '#0d9488' }}>
                    ₹{filteredLedger.reduce((sum, r) => sum + Number(r.commissionAmount || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
