import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSession } from '../../context/SessionContext';
import {
  fetchTravelerExpenses,
  createTravelerExpense,
  updateTravelerExpense,
  deleteTravelerExpense,
} from '../../store/travelerExpenses/travelerExpenses-actions';
import ExpenseStats from '../../components/expenses/ExpenseStats';
import ExpenseList from '../../components/expenses/ExpenseList';
import ExpenseFormModal from '../../components/expenses/ExpenseFormModal';
import Toast from '../../components/common/Toast';

/**
 * TravelerExpensesPage: Full expense tracking and reporting screen for travelers.
 * - Loads traveler trips via GET /trips/traveler/:travelerId
 * - Loads expenses per trip via GET /expenses/trip/:tripId (enforcing trip child ownership)
 * - Controlled modal for adding/editing expenses via POST /expenses & PUT /expenses/:id
 * - Preserves spending calculations (total on-trip, average per trip, category percentage breakdown)
 * - CSV report export
 * - Enforces and reports backend RBAC (DELETE /expenses/:id is restricted to Superuser)
 */
export default function TravelerExpensesPage() {
  // 1. Session / Dispatch
  const { user, role } = useSession();
  const dispatch = useDispatch();
  const travelerId = Number(user?.travelerId || user?.traveler_id || user?.id);

  // 2. Redux Selectors
  const { expenses, budgetGauges, loading: expensesLoading, error: expensesError } = useSelector(
    (state) => state.travelerExpenses
  );
  const { trips, loading: tripsLoading, error: tripsError } = useSelector(
    (state) => state.travelerTrips
  );
  const loading = expensesLoading || tripsLoading;
  const error = tripsError || expensesError;

  // 3. Local UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // 4. Data Fetching
  const loadData = () => {
    if (travelerId) {
      dispatch(fetchTravelerExpenses(travelerId));
    }
  };

  useEffect(() => {
    loadData();
  }, [dispatch, travelerId]);

  // 5. Event Handlers
  const showToast = (msg, type = 'success') => {
    setToastType(type);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Derived filter during render
  const filteredExpenses = expenses.filter((e) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const desc = (e.description || '').toLowerCase();
    const type = (e.type || '').toLowerCase();
    const idStr = String(e.expenseId || '');
    return desc.includes(q) || type.includes(q) || idStr.includes(q);
  });

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleCloseModal = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  // Immutable update upon successful backend response
  const handleSaveExpense = async (payload, isEdit, expenseId) => {
    const savedExpense = isEdit
      ? await dispatch(updateTravelerExpense(expenseId, payload))
      : await dispatch(createTravelerExpense(payload));
    if (isEdit) {
      setActionMessage(`Expense #${savedExpense.expenseId} updated successfully!`);
    } else {
      setActionMessage(`New expense ("${savedExpense.description}") logged successfully!`);
    }

    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
  };

  // Delete handler with confirmation and backend RBAC handling
  const handleDeleteExpense = async (expense) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this expense: "${expense.description}" (₹${expense.amount})?`
    );
    if (!confirmDelete) return;

    try {
      await dispatch(deleteTravelerExpense(expense.expenseId));
      setActionMessage(`Expense #${expense.expenseId} deleted.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('[TravelerExpensesPage] Failed to delete expense:', err);
      // Handles 403 Forbidden because traveler role cannot delete expenses on backend
      showToast(
        `Action Restricted: ${err.message} (RolesGuard restricts deletion to Superuser)`,
        'error'
      );
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      showToast('No expenses available to export.', 'warning');
      return;
    }

    const headers = ['Expense ID', 'Description', 'Type', 'Trip ID', 'Amount (INR)'];
    const rows = expenses.map((e) => [
      e.expenseId,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.type,
      e.tripId,
      e.amount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GlobeSync_Expenses_Traveler_${travelerId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="traveler-expenses-page">
      {/* Header */}
      <div className="traveler-page-header">
        <div>
          <h2 className="traveler-page-header-title">Expense Tracker 💰</h2>
          <p className="traveler-page-header-subtitle">
            Monitor and record on-trip spending across accommodations, flights, dining, and transit.
          </p>
        </div>

        <div className="traveler-page-header-actions">
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn btn-secondary"
            title="Download CSV export"
          >
            ⬇ Export CSV
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="btn btn-primary"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div className="feedback-banner success">
          <span>✓ {actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="feedback-banner-close"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="state-box">
          <div className="state-box-icon">⏳</div>
          <h3 className="state-box-title">Loading your travel expenses...</h3>
          <p className="state-box-text">Fetching expenses across your scheduled itineraries...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          style={{
            padding: '28px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '16px',
            textAlign: 'center',
            color: '#991b1b',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
          <h4 style={{ fontSize: '17px', fontWeight: 800 }}>Failed to load expenses</h4>
          <p style={{ fontSize: '14px', margin: '8px 0 16px' }}>{error}</p>
          <button type="button" onClick={loadData} className="btn btn-primary">
            Retry Connection ↺
          </button>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <>
          {/* Real-time Budget Gauges */}
          {budgetGauges.length > 0 && (
            <div
              className="card"
              style={{
                padding: '22px',
                borderRadius: '16px',
                background: '#fff',
                border: '1px solid var(--border)',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    🎯 Trip Budget Gauges (Live)
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                    Computed in real time from booked reservations + itemized on-trip expenses vs total itinerary budget.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
                  gap: '16px',
                }}
              >
                {budgetGauges.map((gauge) => {
                  const pct = Math.min(100, Math.max(0, gauge.percentageUsed || 0));
                  const isOver = gauge.status === 'over_budget' || (gauge.percentageUsed || 0) > 100;
                  const isWarn = gauge.status === 'warning' || (gauge.percentageUsed || 0) >= 85;
                  const statusColor = isOver ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981';
                  const statusBg = isOver ? '#fef2f2' : isWarn ? '#fffbeb' : '#ecfdf5';
                  const statusBorder = isOver ? '#fecaca' : isWarn ? '#fde68a' : '#a7f3d0';
                  const statusLabel = isOver ? '⚠️ Over Budget' : isWarn ? '⚡ Near Limit' : '✓ On Track';

                  return (
                    <div
                      key={gauge.tripId}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                          Trip #{gauge.tripId}: {gauge.destination}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            color: statusColor,
                            background: statusBg,
                            border: `1px solid ${statusBorder}`,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                        <span>Used: <strong>₹{(gauge.totalExpenses || 0).toLocaleString('en-IN')}</strong> ({gauge.percentageUsed}%)</span>
                        <span>Budget: <strong>₹{(gauge.budget || 0).toLocaleString('en-IN')}</strong></span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: statusColor,
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                        <span>
                          Remaining: <strong style={{ color: gauge.remaining < 0 ? '#ef4444' : '#10b981' }}>
                            ₹{(gauge.remaining || 0).toLocaleString('en-IN')}
                          </strong>
                        </span>
                        <span>
                          Bookings: ₹{(gauge.breakdown?.bookingExpenses || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metrics & Breakdown */}
          <ExpenseStats />

          {/* Search Bar */}
          <div
            className="card"
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              background: '#fff',
              border: '1px solid var(--border)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '16px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search expenses by description, type, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Expense Table List */}
          <ExpenseList
            expenses={filteredExpenses}
            trips={trips}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteExpense}
            hasActiveSearch={searchQuery.trim().length > 0}
            onClearSearch={() => setSearchQuery('')}
            userRole={role}
          />
        </>
      )}

      {/* Controlled Add/Edit Expense Modal */}
      <ExpenseFormModal
        isOpen={isFormOpen}
        editingExpense={editingExpense}
        trips={trips}
        onSave={handleSaveExpense}
        onClose={handleCloseModal}
      />

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage('')}
      />
    </div>
  );
}
