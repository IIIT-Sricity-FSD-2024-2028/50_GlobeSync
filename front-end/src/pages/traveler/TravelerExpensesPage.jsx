import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { tripsApi, expensesApi } from '../../services/api';
import ExpenseStats from '../../components/expenses/ExpenseStats';
import ExpenseList from '../../components/expenses/ExpenseList';
import ExpenseFormModal from '../../components/expenses/ExpenseFormModal';

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
  const { user, role } = useSession();

  const [trips, setTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [partialError, setPartialError] = useState(null);

  // Search filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Controlled Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Action Notification State
  const [actionMessage, setActionMessage] = useState(null);

  const travelerId = Number(user?.travelerId || user?.traveler_id || user?.id);

  // Load all trips and expenses for this traveler with honest feedback and partial results handling
  const loadData = async (signal) => {
    if (!travelerId) {
      setLoading(false);
      setError('No authenticated traveler ID found. Please log in.');
      return;
    }

    setLoading(true);
    setError(null);
    setPartialError(null);

    try {
      // 1. Fetch traveler's trips (Required)
      const tripsData = await tripsApi.getByTraveler(travelerId, { signal });
      if (signal?.aborted) return;

      const loadedTrips = Array.isArray(tripsData) ? tripsData : [];
      setTrips(loadedTrips);

      if (loadedTrips.length === 0) {
        setExpenses([]);
        setPartialError(null);
        return;
      }

      // 2. Fetch expenses per trip without silent catch(() => []) fallbacks
      const results = await Promise.allSettled(
        loadedTrips.map((t) =>
          expensesApi.getByTrip(t.tripId || t.id, { signal })
        )
      );

      if (signal?.aborted) return;

      const successfulExpenses = [];
      const failedTrips = [];

      results.forEach((res, index) => {
        if (res.status === 'fulfilled') {
          if (Array.isArray(res.value)) {
            successfulExpenses.push(...res.value);
          }
        } else if (!res.reason?.isCancelled) {
          failedTrips.push(loadedTrips[index]);
        }
      });

      if (failedTrips.length === loadedTrips.length && loadedTrips.length > 0) {
        // Required data failed completely
        setError('Failed to load expense records for your trips. Please check your backend connection.');
        setExpenses([]);
        setPartialError(null);
      } else if (failedTrips.length > 0) {
        // Partial results: Display loaded expenses with prominent incomplete warning
        setExpenses(successfulExpenses);
        setPartialError({
          failedCount: failedTrips.length,
          failedTrips,
          message: `Expenses could not be loaded for ${failedTrips.length} of your trips (${failedTrips.map((t) => t.destination || `#${t.tripId}`).join(', ')}). The totals and breakdowns below are incomplete.`,
        });
      } else {
        // Full success
        setExpenses(successfulExpenses);
        setPartialError(null);
      }
    } catch (err) {
      if (!err.isCancelled && !signal?.aborted) {
        console.error('[TravelerExpensesPage] Failed to load expense data:', err);
        setError(err.message || 'Failed to load expense records from backend.');
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

    return () => {
      controller.abort();
    };
  }, [travelerId]);

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
  const handleSaveExpense = (savedExpense, isEdit) => {
    if (isEdit) {
      setExpenses((prev) =>
        prev.map((e) => (e.expenseId === savedExpense.expenseId ? savedExpense : e))
      );
      setActionMessage(`Expense #${savedExpense.expenseId} updated successfully!`);
    } else {
      setExpenses((prev) => [savedExpense, ...prev]);
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
      // Calls DELETE /expenses/:id
      await expensesApi.delete(expense.expenseId);

      setExpenses((prev) => prev.filter((e) => e.expenseId !== expense.expenseId));
      setActionMessage(`Expense #${expense.expenseId} deleted.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('[TravelerExpensesPage] Failed to delete expense:', err);
      // Handles 403 Forbidden because traveler role cannot delete expenses on backend
      alert(
        `Action Restricted: ${err.message}\n\nNote: Backend security rules (RolesGuard) restrict expense record deletion strictly to Superuser roles. As a traveler, you can edit the expense description or reduce the amount, but cannot permanently delete financial records.`
      );
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      alert('No expenses available to export.');
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
          <button type="button" onClick={() => loadData()} className="btn btn-primary">
            Retry Connection ↺
          </button>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <>
          {/* Partial Results Warning Banner */}
          {partialError && (
            <div
              style={{
                padding: '16px 20px',
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <strong style={{ color: '#92400e', fontSize: '14px', display: 'block', marginBottom: '2px' }}>
                  ⚠️ Incomplete Expense Records
                </strong>
                <p style={{ color: '#b45309', fontSize: '13px', lineHeight: 1.4 }}>
                  {partialError.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadData()}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '12px', borderColor: '#d97706', color: '#b45309' }}
              >
                Retry Missing Expenses ↺
              </button>
            </div>
          )}

          {/* Metrics & Breakdown */}
          <ExpenseStats
            expenses={expenses}
            trips={trips}
            isPartial={Boolean(partialError)}
            partialFailedCount={partialError?.failedCount || 0}
          />

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
    </div>
  );
}
