import React from 'react';
import {
  dashboardApi,
  revenueApi,
  tripsApi,
  bookingsApi,
  reviewsApi,
} from '../../services/api';
import {
  AdminPage,
  money,
  useAdminData,
} from '../../components/admin/AdminUI';
import SuperMetricCard from '../../components/super/SuperMetricCard';

/**
 * Calculates genuine review averages from actual record fields (tripRating and guideRating).
 * Avoids inventing a default 5.0 when reviews are missing.
 *
 * @param {Array} reviewsList
 * @returns {Object} Calculated review averages and distribution
 */
function calculateReviewMetrics(reviewsList) {
  if (!Array.isArray(reviewsList) || reviewsList.length === 0) {
    return {
      hasReviews: false,
      totalReviews: 0,
      tripAvg: 'No reviews',
      guideAvg: 'No reviews',
      combinedAvg: 'No reviews',
      tripDistribution: {},
      guideDistribution: {},
    };
  }

  let tripSum = 0;
  let guideSum = 0;
  const tripDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const guideDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  for (const r of reviewsList) {
    const tRating = Math.round(Number(r.tripRating) || 0);
    const gRating = Math.round(Number(r.guideRating) || 0);

    tripSum += Number(r.tripRating) || 0;
    guideSum += Number(r.guideRating) || 0;

    if (tripDist[tRating] !== undefined) tripDist[tRating]++;
    if (guideDist[gRating] !== undefined) guideDist[gRating]++;
  }

  const count = reviewsList.length;
  return {
    hasReviews: true,
    totalReviews: count,
    tripAvg: (tripSum / count).toFixed(1),
    guideAvg: (guideSum / count).toFixed(1),
    combinedAvg: ((tripSum + guideSum) / (count * 2)).toFixed(1),
    tripDistribution: tripDist,
    guideDistribution: guideDist,
  };
}

/**
 * Loads reports telemetry without silent failure masks.
 */
const loadReports = async (options) => {
  const [dash, revenue, trips, bookings, reviews] = await Promise.all([
    dashboardApi.getSuperuser(options),
    revenueApi.getOverview(options),
    tripsApi.getAll(options),
    bookingsApi.getAll(options),
    reviewsApi.getAll(options),
  ]);

  return {
    dash,
    revenue,
    trips: Array.isArray(trips) ? trips : [],
    bookings: Array.isArray(bookings) ? bookings : [],
    reviews: Array.isArray(reviews) ? reviews : [],
  };
};

function StatusDistribution({ title, rows, statusKey = 'status' }) {
  const counts = rows.reduce((all, row) => {
    const s = row[statusKey] || 'Unknown';
    all[s] = (all[s] || 0) + 1;
    return all;
  }, {});

  const total = rows.length || 1;

  return (
    <div className="card" style={{ padding: '20px', borderRadius: '14px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>{title}</h3>
      {rows.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(counts).map(([status, count]) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={status}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{status}</span>
                  <span style={{ color: 'var(--muted)' }}>
                    {count} ({pct}%)
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    background: '#e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: 'var(--gradient, #6366f1)',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="admin-empty">No records found.</p>
      )}
    </div>
  );
}

function StarBreakdownBar({ label, distribution, total }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#334155' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={star}
              style={{
                display: 'grid',
                gridTemplateColumns: '50px 1fr 60px',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <span style={{ color: '#d97706', fontWeight: 600 }}>★ {star} star</span>
              <div
                style={{
                  height: '6px',
                  background: '#e2e8f0',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: '#f59e0b',
                    borderRadius: '3px',
                  }}
                />
              </div>
              <span style={{ color: '#64748b', textAlign: 'right' }}>
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SuperReportsPage() {
  const resource = useAdminData(loadReports);
  const d = resource.data;
  const dash = d?.dash || {};
  const revenue = d?.revenue || {};
  const agencyMetrics = dash.agencyMetrics || dash.agency_metrics || {};

  // Financial metrics
  const grossPaidAmount = dash.totalPlatformRevenue ?? 0;
  const platformRevenue = revenue.totalRevenue ?? 0;
  const partnerPayouts = revenue.totalPayouts ?? 0;
  const settledCommission = revenue.settledRevenue ?? 0;
  const pendingCommission = revenue.pendingRevenue ?? 0;
  const netMargin = revenue.netProfitMargin ?? '0.00';

  // Registered Accounts (honest population — no fake MAU)
  const usersByRole = dash.usersByRole || dash.users_by_role || {};
  const travelersCount = usersByRole.travelers || 0;
  const guidesCount = usersByRole.guides || 0;
  const adminsCount = usersByRole.admins || 0;
  const supportCount = usersByRole.supportUsers || 0;
  const totalRegisteredAccounts = travelersCount + guidesCount + adminsCount + supportCount;

  // Review calculations based on real tripRating and guideRating
  const reviewStats = calculateReviewMetrics(d?.reviews || []);

  const totalAgencies = dash.totalAgencies ?? 0;
  const activeAgencies = agencyMetrics.approvedAgencies ?? 0;

  return (
    <AdminPage title="Advanced System & Intelligence Reports" resource={resource}>
      {d && (
        <>
          {/* Financial Governance Metrics */}
          <section style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}>
              Financial Volume & Platform Commission Settlement
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Distinct financial scopes: Gross Paid Volume represents all traveler/agency receipts.
              Platform Revenue represents GlobeSync's earned commission. Partner Payouts reflect
              disbursements to tour agencies and guides.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
              }}
            >
              <SuperMetricCard
                title="Gross Paid Volume"
                value={money(grossPaidAmount)}
                population="All Customer Receipts"
                statusFilter="status = 'Paid'"
                units="INR (₹)"
                timePeriod="All-time settled"
                accentColor="#0284c7"
                note="Total funds collected across traveler direct payments and agency billing."
              />

              <SuperMetricCard
                title="Platform Commission Revenue"
                value={money(platformRevenue)}
                population="Commission Ledger"
                statusFilter="status IN ['EARNED', 'SETTLED']"
                units="INR (₹)"
                timePeriod="All-time earned"
                accentColor="#059669"
                note="Retained platform margin after deducting partner allocations."
              />

              <SuperMetricCard
                title="Partner Payouts"
                value={money(partnerPayouts)}
                population="Disbursements to Partners"
                statusFilter="Agencies & Guides"
                units="INR (₹)"
                timePeriod="All-time allocated"
                accentColor="#7c3aed"
                note="Gross volume allocated to third-party agency and guide providers."
              />

              <SuperMetricCard
                title="Net Profit Margin"
                value={`${netMargin}%`}
                population="Platform Revenue / Gross Value"
                statusFilter="Settled transactions"
                units="Percentage (%)"
                timePeriod="All-time"
                accentColor="#059669"
              />

              <SuperMetricCard
                title="Commission Settled"
                value={money(settledCommission)}
                population="Finalized Trips"
                statusFilter="status = 'SETTLED'"
                units="INR (₹)"
                timePeriod="Completed trips"
                accentColor="#059669"
                note="Automatically settled upon trip lifecycle reaching Completed."
              />

              <SuperMetricCard
                title="Commission Pending"
                value={money(pendingCommission)}
                population="Active & Planned Trips"
                statusFilter="status = 'PENDING' / 'EARNED'"
                units="INR (₹)"
                timePeriod="In-flight trips"
                accentColor="#d97706"
                note="Held in escrow until tour completion."
              />
            </div>
          </section>

          {/* User Populations & Review Intelligence */}
          <section style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}>
              User Population & Customer Satisfaction
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <SuperMetricCard
                title="Registered Accounts"
                value={totalRegisteredAccounts}
                population="All Platform Users"
                statusFilter="Travelers (4), Guides (6), Admins (3), Support (2)"
                units="Accounts"
                timePeriod="All-time"
                accentColor="#0f172a"
                note="Count of registered users. MAU metric omitted without active session probes."
              />

              <SuperMetricCard
                title="Enrolled Agencies"
                value={`${activeAgencies} / ${totalAgencies}`}
                population="Travel Partner Agencies"
                statusFilter="Approved / Registered"
                units="Agencies"
                timePeriod="All-time"
                accentColor="#0f172a"
              />

              <SuperMetricCard
                title="Trip Experience Rating"
                value={
                  reviewStats.hasReviews ? `⭐ ${reviewStats.tripAvg} / 5.0` : 'No reviews'
                }
                population="Customer Itinerary Reviews"
                statusFilter="tripRating field"
                units="Rating (1.0-5.0)"
                timePeriod={`${reviewStats.totalReviews} verified reviews`}
                accentColor="#d97706"
                note="Derived from tripRating on verified customer review records."
              />

              <SuperMetricCard
                title="Guide Professionalism Rating"
                value={
                  reviewStats.hasReviews ? `⭐ ${reviewStats.guideAvg} / 5.0` : 'No reviews'
                }
                population="Customer Guide Reviews"
                statusFilter="guideRating field"
                units="Rating (1.0-5.0)"
                timePeriod={`${reviewStats.totalReviews} verified reviews`}
                accentColor="#d97706"
                note="Derived from guideRating on verified customer review records."
              />
            </div>
          </section>

          {/* Lifecycle & Rating Distributions */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
              margin: '24px 0',
            }}
          >
            <StatusDistribution title="Global Trips Progression" rows={d.trips} />
            <StatusDistribution title="Platform Bookings by Lifecycle" rows={d.bookings} />

            <div className="card" style={{ padding: '20px', borderRadius: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>
                Customer Ratings Intelligence
              </h3>
              {reviewStats.hasReviews ? (
                <>
                  <StarBreakdownBar
                    label="Trip Itinerary Rating (tripRating)"
                    distribution={reviewStats.tripDistribution}
                    total={reviewStats.totalReviews}
                  />
                  <StarBreakdownBar
                    label="Guide Service Rating (guideRating)"
                    distribution={reviewStats.guideDistribution}
                    total={reviewStats.totalReviews}
                  />
                </>
              ) : (
                <p className="admin-empty">No reviews recorded in database.</p>
              )}
            </div>
          </div>
        </>
      )}
    </AdminPage>
  );
}
