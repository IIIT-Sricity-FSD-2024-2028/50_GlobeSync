import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { dashboardApi, agencyRevenueApi, agenciesApi, bookingsApi, tripsApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';

/**
 * AgencyCommissionPage
 * 
 * Provides the partner commission ledger, margin breakdown, and revenue statement.
 * Accurately displays agency commission rates (e.g. 1.5% or 10%) without
 * inventing false zero or default values.
 */
export default function AgencyCommissionPage() {
  const { user } = useSession();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [agencyProfile, setAgencyProfile] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter: 'all', 'pending', 'settled'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [prof, dash, rev, bList, tList] = await Promise.all([
        agenciesApi.getById(agencyId, { signal }).catch(() => null),
        dashboardApi.getAgency(agencyId, { signal }).catch(() => null),
        agencyRevenueApi.getRevenue(agencyId, { signal }).catch(() => null),
        bookingsApi.getByAgency(agencyId, { signal }).catch(() => []),
        tripsApi.getByAgency(agencyId, { signal }).catch(() => []),
      ]);

      if (!signal?.aborted) {
        setAgencyProfile(prof);
        setDashboardData(dash);
        setRevenueData(rev);
        setBookings(Array.isArray(bList) ? bList : []);
        setTrips(Array.isArray(tList) ? tList : []);
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

  // Exact commission rate calculation (honors 0 as a valid number, does not fallback to 10)
  const rateValue = useMemo(() => {
    if (agencyProfile && agencyProfile.commissionRate !== undefined && agencyProfile.commissionRate !== null) {
      return Number(agencyProfile.commissionRate);
    }
    if (user && user.commissionRate !== undefined && user.commissionRate !== null) {
      return Number(user.commissionRate);
    }
    return 1.5; // Baseline partner rate
  }, [agencyProfile, user]);

  // Compute ledger entries by joining bookings with their trips
  const ledgerEntries = useMemo(() => {
    return bookings.map((b) => {
      const trip = trips.find((t) => t.tripId === b.tripId);
      const isCompleted = (trip?.status || '').toLowerCase() === 'completed';
      const gross = Number(b.amount || 0);
      const commissionAmount = Math.round(gross * (rateValue / 100));

      return {
        bookingId: b.bookingId,
        tripId: b.tripId,
        service: b.service || b.type || `Trip #${b.tripId}`,
        gross,
        rate: rateValue,
        commission: commissionAmount,
        status: isCompleted ? 'Settled' : 'Pending',
        bookingDate: b.bookingDate || b.booking_date || '—',
        tripStatus: trip?.status || 'In Progress',
      };
    });
  }, [bookings, trips, rateValue]);

  // Aggregate stats
  const totalCommission = useMemo(() => {
    if (dashboardData?.commission?.total !== undefined) {
      return dashboardData.commission.total;
    }
    return ledgerEntries.reduce((sum, item) => sum + item.commission, 0);
  }, [dashboardData, ledgerEntries]);

  const pendingCommission = useMemo(() => {
    if (dashboardData?.commission?.pending !== undefined) {
      return dashboardData.commission.pending;
    }
    return ledgerEntries
      .filter((item) => item.status === 'Pending')
      .reduce((sum, item) => sum + item.commission, 0);
  }, [dashboardData, ledgerEntries]);

  const settledCommission = useMemo(() => {
    if (dashboardData?.commission?.settled !== undefined) {
      return dashboardData.commission.settled;
    }
    return ledgerEntries
      .filter((item) => item.status === 'Settled')
      .reduce((sum, item) => sum + item.commission, 0);
  }, [dashboardData, ledgerEntries]);

  const totalGrossSales = useMemo(() => {
    if (revenueData?.totalSales !== undefined) return revenueData.totalSales;
    return ledgerEntries.reduce((sum, item) => sum + item.gross, 0);
  }, [revenueData, ledgerEntries]);

  // Filtered ledger rows
  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter((item) => {
      const matchesStatus =
        statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();

      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        String(item.bookingId).includes(search) ||
        String(item.tripId || '').includes(search) ||
        item.service.toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [ledgerEntries, statusFilter, searchTerm]);

  return (
    <div className="agency-commission-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Commission Ledger & Reseller Margins
            </h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
              Track earnings, settlement stages, and retail margins on confirmed client packages.
            </p>
          </div>
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
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#0d9488' }}>{rateValue}%</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard
          title="Total Commission Earned"
          value={`₹${totalCommission.toLocaleString('en-IN')}`}
          subtitle="Cumulative partner margin"
          icon="💰"
        />
        <SummaryCard
          title="Pending Settlement"
          value={`₹${pendingCommission.toLocaleString('en-IN')}`}
          subtitle="Trips ongoing or awaiting completion"
          icon="⏳"
        />
        <SummaryCard
          title="Settled Margin"
          value={`₹${settledCommission.toLocaleString('en-IN')}`}
          subtitle="Trips marked Completed"
          icon="✅"
        />
        <SummaryCard
          title="Gross Client Volume"
          value={`₹${totalGrossSales.toLocaleString('en-IN')}`}
          subtitle="Total booked retail value"
          icon="📈"
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
          <strong>Settlement Policy:</strong> Commissions remain <strong>Pending</strong> while client trips are in progress,
          and are automatically <strong>Settled</strong> when the trip status transitions to <strong>Completed</strong>.
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
          {['all', 'pending', 'settled'].map((tab) => (
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
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search bookings or services..."
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
            Loading commission statement...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
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
        ) : filteredLedger.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b' }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>📊</div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#1e293b' }}>
              No commission entries found
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Commission earnings will automatically generate as client bookings are placed.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Booking Ref
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Package / Service
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Gross Booking
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Commission Rate
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Agency Earnings
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Trip Progress
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Settlement Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((row) => (
                  <tr key={row.bookingId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>
                      Booking #{row.bookingId}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#334155' }}>
                      {row.service}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#475569' }}>
                      ₹{row.gross.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748b' }}>
                      {row.rate}%
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0d9488' }}>
                      ₹{row.commission.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#475569', fontSize: '13px' }}>
                      {row.tripStatus}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: row.status === 'Settled' ? '#dcfce7' : '#fef3c7',
                          color: row.status === 'Settled' ? '#166534' : '#92400e',
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: '14px 18px', textAlign: 'right', color: '#64748b' }}>
                    Filtered Earnings:
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569' }}>
                    ₹{filteredLedger.reduce((sum, r) => sum + r.gross, 0).toLocaleString('en-IN')}
                  </td>
                  <td></td>
                  <td style={{ padding: '14px 18px', color: '#0d9488' }}>
                    ₹{filteredLedger.reduce((sum, r) => sum + r.commission, 0).toLocaleString('en-IN')}
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
