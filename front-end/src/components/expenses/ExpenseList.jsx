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

/**
 * ExpenseList: Table and cards for displaying travel expenses with search-aware empty states
 * and permitted edit/delete actions.
 */
export default function ExpenseList({
  expenses = [],
  trips = [],
  onEdit,
  onDelete,
  hasActiveSearch = false,
  onClearSearch,
  userRole = 'traveler',
}) {
  const getTripDestination = (tripId) => {
    const t = trips.find((item) => (item.tripId || item.id) === tripId);
    return t ? `📍 ${t.destination}` : `Trip #${tripId}`;
  };

  if (expenses.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          borderRadius: '16px',
          background: '#fff',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>💰</div>
        {hasActiveSearch ? (
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800 }}>No matching expenses found</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '6px 0 16px' }}>
              No expenses match your search query. Try searching for a different keyword or category.
            </p>
            {onClearSearch && (
              <button
                type="button"
                onClick={onClearSearch}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
              >
                Clear Search ↺
              </button>
            )}
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800 }}>No expenses recorded yet</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '6px 0 0' }}>
              Add your first on-trip expense to track food, transport, accommodations, and activities.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 18px' }}>Description</th>
              <th style={{ padding: '14px 18px' }}>Type</th>
              <th style={{ padding: '14px 18px' }}>Trip</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => {
              const icon = CATEGORY_ICONS[expense.type] || '📦';
              return (
                <tr
                  key={expense.expenseId}
                  style={{
                    borderBottom: '1px solid var(--border-light, #eee)',
                    transition: 'background 0.2s',
                  }}
                >
                  <td style={{ padding: '16px 18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <div>{expense.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>
                      ID #{expense.expenseId}
                    </div>
                  </td>
                  <td style={{ padding: '16px 18px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: '#f1f5f9',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {icon} {expense.type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {getTripDestination(expense.tripId)}
                  </td>
                  <td style={{ padding: '16px 18px', textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: '15px' }}>
                    ₹{Number(expense.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => onEdit(expense)}
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px', fontWeight: 600, borderRadius: '6px' }}
                      >
                        ✏️ Edit
                      </button>
                      {userRole === 'superuser' && onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(expense)}
                          style={{
                            padding: '5px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            background: '#fff',
                            border: '1px solid #fee2e2',
                            color: '#dc2626',
                            cursor: 'pointer',
                          }}
                          title="Delete expense"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
