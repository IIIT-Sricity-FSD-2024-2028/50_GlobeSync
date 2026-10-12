import React from 'react';

const CATEGORY_ICONS = {
  Flight: '✈️',
  Hotel: '🏨',
  Food: '🍽️',
  Transport: '🚌',
  Activity: '🎯',
  Shopping: '🛍️',
  Other: '📦',
};

const CATEGORY_COLORS = {
  Flight: '#E8467C',
  Hotel: '#F5A623',
  Food: '#10b981',
  Transport: '#3b82f6',
  Activity: '#8b5cf6',
  Shopping: '#ec4899',
  Other: '#6b7280',
};

/**
 * ExpenseStats: Metric calculations and category breakdown progress visualization
 * Preserves legacy expense calculations:
 * - Total On-Trip Spent
 * - Average Spent per Trip
 * - Breakdown by expense categories with relative percentage bar fills
 */
export default function ExpenseStats({
  expenses = [],
  trips = [],
  isPartial = false,
  partialFailedCount = 0,
}) {
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const avgTrip = trips.length > 0 ? totalSpent / trips.length : totalSpent;

  // Group by category
  const byType = {};
  expenses.forEach((e) => {
    const type = e.type || 'Other';
    byType[type] = (byType[type] || 0) + Number(e.amount || 0);
  });

  const sortedCategories = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* High-level KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div
          className="card"
          style={{
            background: isPartial ? '#fffdf7' : '#fff',
            borderRadius: '16px',
            padding: '20px',
            border: isPartial ? '1.5px solid #fde68a' : '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Total On-Trip Spent
            </span>
            {isPartial && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#b45309',
                  background: '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                ⚠️ Incomplete
              </span>
            )}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: isPartial ? '#b45309' : 'var(--primary)', marginTop: '4px' }}>
            ₹{totalSpent.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: isPartial ? '#b45309' : '#059669', marginTop: '4px', fontWeight: 600 }}>
            {isPartial
              ? `Partial total (${partialFailedCount} trip${partialFailedCount > 1 ? 's' : ''} missing)`
              : `Across ${trips.length} travel ${trips.length === 1 ? 'itinerary' : 'itineraries'}`}
          </div>
        </div>

        <div
          className="card"
          style={{
            background: isPartial ? '#fffdf7' : '#fff',
            borderRadius: '16px',
            padding: '20px',
            border: isPartial ? '1.5px solid #fde68a' : '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Avg Spent Per Trip
            </span>
            {isPartial && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#b45309',
                  background: '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                ⚠️ Partial
              </span>
            )}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            ₹{Math.round(avgTrip).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: isPartial ? '#b45309' : 'var(--muted)', marginTop: '4px' }}>
            {isPartial ? 'Calculated from partial trip records' : 'Derived from logged records'}
          </div>
        </div>

        <div
          className="card"
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Expense Entries Logged
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {expenses.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            {sortedCategories.length} unique categories
          </div>
        </div>
      </div>

      {/* Category Breakdown Progress Bars */}
      <div
        className="card"
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '22px',
          border: '1px solid var(--border)',
        }}
      >
        <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '16px' }}>
          📊 Spending by Category
        </h4>

        {sortedCategories.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
            No expense breakdown available yet. Log an expense to visualize category distributions.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sortedCategories.map(([type, amount]) => {
              const percentage = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
              const barColor = CATEGORY_COLORS[type] || 'var(--primary)';
              const icon = CATEGORY_ICONS[type] || '📦';

              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>
                      {icon} {type} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({percentage}%)</span>
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: barColor,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scope Explanation & Accounting Clarity */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          fontSize: '12px',
          color: '#475569',
          lineHeight: 1.5,
        }}
      >
        <strong>ℹ️ Accounting Scope:</strong> Totals reflect individual on-trip expense line items recorded via <code>POST /expenses</code> (meals, local transport, excursions, shopping). They represent your itemized out-of-pocket spending and do not duplicate initial trip booking invoices.
      </div>
    </div>
  );
}
