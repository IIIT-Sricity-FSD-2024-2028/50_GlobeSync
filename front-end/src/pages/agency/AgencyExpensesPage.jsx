import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { tripsApi, expensesApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';

const EXPENSE_TYPES = ['Hotel', 'Flight', 'Transport', 'Food', 'Activity', 'Shopping'];

/**
 * AgencyExpensesPage
 * 
 * Read-only spend breakdown and optional expense logger for agency-owned client trips.
 */
export default function AgencyExpensesPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(
    searchParams.get('tripId') ? Number(searchParams.get('tripId')) : null
  );
  const [expenses, setExpenses] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [error, setError] = useState(null);

  // Search filter inside table
  const [searchTerm, setSearchTerm] = useState('');

  // Log expense modal / form
  const [showAddModal, setShowAddModal] = useState(false);
  const [formType, setFormType] = useState('Hotel');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Load trips owned by agency
  useEffect(() => {
    const controller = new AbortController();
    const fetchTrips = async () => {
      setLoadingTrips(true);
      setError(null);
      try {
        const data = await tripsApi.getByAgency(agencyId, { signal: controller.signal });
        if (!controller.signal.aborted) {
          const list = Array.isArray(data) ? data : [];
          setTrips(list);
          if (list.length > 0 && !selectedTripId) {
            setSelectedTripId(list[0].tripId);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || 'Failed to load agency trips.');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingTrips(false);
      }
    };

    if (agencyId) fetchTrips();
    return () => controller.abort();
  }, [agencyId]);

  // Load expenses whenever selectedTripId changes
  useEffect(() => {
    if (!selectedTripId) return;

    const controller = new AbortController();
    const fetchExpenses = async () => {
      setLoadingExpenses(true);
      setError(null);
      try {
        const data = await expensesApi.getByTrip(selectedTripId, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setExpenses(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || 'Failed to load trip expenses.');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingExpenses(false);
      }
    };

    fetchExpenses();
    return () => controller.abort();
  }, [selectedTripId]);

  const activeTrip = useMemo(() => {
    return trips.find((t) => t.tripId === selectedTripId) || null;
  }, [trips, selectedTripId]);

  // Aggregated metrics
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const tripBudget = Number(activeTrip?.budget || 0);

  // Group by category
  const categoryTotals = useMemo(() => {
    const map = {};
    EXPENSE_TYPES.forEach((t) => (map[t] = 0));
    expenses.forEach((e) => {
      const type = e.type || 'Other';
      map[type] = (map[type] || 0) + (Number(e.amount) || 0);
    });
    return map;
  }, [expenses]);

  // Filtered expenses table
  const filteredExpenses = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return expenses;
    return expenses.filter(
      (e) =>
        (e.description || '').toLowerCase().includes(term) ||
        (e.type || '').toLowerCase().includes(term) ||
        String(e.amount || '').includes(term)
    );
  }, [expenses, searchTerm]);

  const handleTripChange = (e) => {
    const id = Number(e.target.value);
    setSelectedTripId(id);
    setSearchParams({ tripId: String(id) });
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setFormError(null);

    const amountNum = Number(formAmount);
    if (!formAmount || isNaN(amountNum) || amountNum <= 0) {
      setFormError('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!formDesc.trim()) {
      setFormError('Please enter a description for the expense.');
      return;
    }

    setSubmitting(true);
    try {
      await expensesApi.create({
        tripId: selectedTripId,
        type: formType,
        amount: amountNum,
        description: formDesc.trim(),
      });

      // Refresh list
      const refreshed = await expensesApi.getByTrip(selectedTripId);
      setExpenses(Array.isArray(refreshed) ? refreshed : []);
      setShowAddModal(false);
      setFormAmount('');
      setFormDesc('');
    } catch (err) {
      setFormError(err.message || 'Failed to save expense.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="agency-expenses-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Topbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            Client Trip Expenses
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Detailed cost tracking, operational vouchers, and category spend breakdowns.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/agency/bookings')}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            ← Back to Bookings
          </button>
          {selectedTripId && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(13,148,136,0.2)',
              }}
            >
              + Log Expense
            </button>
          )}
        </div>
      </div>

      {/* Trip Selector Bar */}
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
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
            Select Client Trip:
          </label>
          <select
            value={selectedTripId || ''}
            onChange={handleTripChange}
            disabled={loadingTrips || trips.length === 0}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              background: '#f8fafc',
              flex: 1,
              maxWidth: '420px',
            }}
          >
            {trips.length === 0 ? (
              <option value="">No trips available</option>
            ) : (
              trips.map((t) => (
                <option key={t.tripId} value={t.tripId}>
                  Trip #{t.tripId} — {t.destination || 'Unspecified'} ({t.status || 'Pending'})
                </option>
              ))
            )}
          </select>
        </div>

        {activeTrip && (
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Trip Reference: <strong>#{activeTrip.tripId}</strong> | Dates:{' '}
            <strong>{activeTrip.startDate || '—'} to {activeTrip.endDate || '—'}</strong>
          </div>
        )}
      </div>

      {loadingTrips ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Loading trips...
        </div>
      ) : trips.length === 0 ? (
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '60px 24px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No client trips found</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Book a package or create a custom itinerary first to manage client trip expenses.
          </p>
        </div>
      ) : (
        <>
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
              title="Total Recorded Spend"
              value={`₹${totalSpent.toLocaleString('en-IN')}`}
              subtitle="Sum of all logged expenses"
              icon="💰"
            />
            <SummaryCard
              title="Trip Budget"
              value={`₹${tripBudget.toLocaleString('en-IN')}`}
              subtitle={
                tripBudget > 0
                  ? totalSpent > tripBudget
                    ? '⚠️ Over Budget'
                    : `₹${(tripBudget - totalSpent).toLocaleString('en-IN')} remaining`
                  : 'Budget not specified'
              }
              icon="🎯"
            />
            <SummaryCard
              title="Expenses Logged"
              value={String(expenses.length)}
              subtitle="Line items recorded"
              icon="📋"
            />
          </div>

          {/* 2-column breakdown & latest */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
              marginBottom: '28px',
            }}
          >
            {/* By Category */}
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 18px 0', color: '#0f172a' }}>
                Spend by Category
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {EXPENSE_TYPES.map((cat) => {
                  const amount = categoryTotals[cat] || 0;
                  const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          marginBottom: '4px',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#334155' }}>{cat}</span>
                        <span style={{ color: '#0d9488', fontWeight: 700 }}>
                          ₹{amount.toLocaleString('en-IN')} ({pct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          background: '#f1f5f9',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #0d9488 0%, #0284c7 100%)',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Overview / Trip Snapshot */}
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
                  Trip Financial Snapshot
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Trip Status:</span>
                    <strong style={{ color: '#0f172a' }}>{activeTrip?.status || 'Pending'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Destination:</span>
                    <strong style={{ color: '#0f172a' }}>{activeTrip?.destination || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Guide Assigned:</span>
                    <strong style={{ color: '#0f172a' }}>{activeTrip?.guideId ? `Guide #${activeTrip.guideId}` : 'None'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                    <span style={{ color: '#64748b' }}>Budget Utilization:</span>
                    <strong style={{ color: totalSpent > tripBudget && tripBudget > 0 ? '#ef4444' : '#0d9488' }}>
                      {tripBudget > 0 ? `${Math.round((totalSpent / tripBudget) * 100)}%` : 'N/A'}
                    </strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  marginTop: '16px',
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                💡 Expenses logged here assist your agency in accounting for on-ground vendor costs, accommodation vouchers, and client activity fees.
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                All Expenses Logged for Trip #{selectedTripId}
              </h3>
              <input
                type="text"
                placeholder="Search descriptions, types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  width: '220px',
                }}
              />
            </div>

            {loadingExpenses ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Loading expenses...
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  No expenses logged for this trip yet.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                        Description
                      </th>
                      <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                        Type
                      </th>
                      <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp, idx) => (
                      <tr key={exp.id || exp.expenseId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 500, color: '#0f172a' }}>
                          {exp.description || '—'}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#f1f5f9',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#334155',
                            }}
                          >
                            {exp.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0d9488' }}>
                          ₹{Number(exp.amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                      <td style={{ padding: '12px 18px', color: '#64748b' }}>Total Spend:</td>
                      <td></td>
                      <td style={{ padding: '12px 18px', color: '#0d9488' }}>
                        ₹{totalSpent.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
              Log Trip Expense
            </h2>

            {formError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleAddExpense}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Category *
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  {EXPENSE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 4500"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Description / Vendor *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Airport Transfer Shuttle"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0d9488',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
