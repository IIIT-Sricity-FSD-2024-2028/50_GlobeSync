import React, { useState, useEffect, useRef } from 'react';
import { expensesApi } from '../../services/api';

const EXPENSE_TYPES = [
  'Hotel',
  'Flight',
  'Transport',
  'Food',
  'Activity',
  'Shopping',
];

/**
 * ExpenseFormModal: Controlled form modal for creating or updating travel expenses.
 * Validates required fields matching CreateExpenseDto:
 * - amount: number >= 0
 * - type: enum ['Hotel', 'Flight', 'Transport', 'Food', 'Activity', 'Shopping']
 * - tripId: valid integer belonging to authenticated traveler
 * - description: non-empty string
 */
export default function ExpenseFormModal({
  isOpen = false,
  editingExpense = null,
  trips = [],
  onSave,
  onClose,
}) {
  const isEdit = Boolean(editingExpense);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'Food',
    tripId: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Keep trips ref updated without triggering form resets during active user typing
  const tripsRef = useRef(trips);
  useEffect(() => {
    tripsRef.current = trips;
  }, [trips]);

  const expenseId = editingExpense?.expenseId || editingExpense?.id || null;
  const activeExpenseKey = expenseId ? `edit-${expenseId}` : 'new';

  // Synchronize form values and clear obsolete errors ONLY when modal opens or active record changes.
  // Unrelated parent re-renders (e.g. passing new trips array reference) will NOT reset an actively edited form!
  useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        setFormData({
          description: editingExpense.description || '',
          amount: editingExpense.amount !== undefined && editingExpense.amount !== null ? String(editingExpense.amount) : '',
          type: editingExpense.type || 'Food',
          tripId: editingExpense.tripId ? String(editingExpense.tripId) : '',
        });
      } else {
        const defaultTripId = tripsRef.current.length > 0
          ? String(tripsRef.current[0].tripId || tripsRef.current[0].id)
          : '';
        setFormData({
          description: '',
          amount: '',
          type: 'Food',
          tripId: defaultTripId,
        });
      }
      setErrors({});
      setBackendError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, activeExpenseKey]);

  // Visibility check placed AFTER all hooks have executed unconditionally
  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required.';
    }

    const numAmount = Number(formData.amount);
    if (formData.amount === '' || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Amount must be a positive number greater than 0.';
    }

    if (!EXPENSE_TYPES.includes(formData.type)) {
      newErrors.type = 'Please select a valid expense category.';
    }

    const numTripId = Number(formData.tripId);
    if (!formData.tripId || isNaN(numTripId) || numTripId <= 0) {
      newErrors.tripId = 'Please select an associated travel trip.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setBackendError(null);

    const payload = {
      description: formData.description.trim(),
      amount: Number(formData.amount),
      type: formData.type,
      tripId: Number(formData.tripId),
    };

    try {
      if (isEdit) {
        // Calls PUT /expenses/:id (ownership verified by RolesGuard)
        const updated = await expensesApi.update(editingExpense.expenseId, payload);
        onSave(updated, true);
      } else {
        // Calls POST /expenses (ownership verified by RolesGuard)
        const created = await expensesApi.create(payload);
        onSave(created, false);
      }
      onClose();
    } catch (err) {
      console.error('[ExpenseFormModal] Error saving expense:', err);
      setBackendError(err.message || 'Failed to save expense to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
              {isEdit ? '✏️ Edit Travel Expense' : '➕ Add Travel Expense'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Track spending against your registered travel itineraries.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Server Error Banner */}
        {backendError && (
          <div
            style={{
              margin: '16px 24px 0',
              padding: '12px 16px',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '13px',
            }}
          >
            <strong>⚠️ Server Error:</strong> {backendError}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Description *
            </label>
            <input
              type="text"
              placeholder="e.g. Dinner at Le Petit Bistro"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.description ? '#ef4444' : 'var(--border)'}`,
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {errors.description && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.description}
              </span>
            )}
          </div>

          {/* Amount & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: `1.5px solid ${errors.amount ? '#ef4444' : 'var(--border)'}`,
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              {errors.amount && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.amount}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Category *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: `1.5px solid ${errors.type ? '#ef4444' : 'var(--border)'}`,
                  fontSize: '14px',
                  outline: 'none',
                  background: '#fff',
                }}
              >
                {EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Associated Trip */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Associated Trip *
            </label>
            <select
              value={formData.tripId}
              onChange={(e) => handleInputChange('tripId', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.tripId ? '#ef4444' : 'var(--border)'}`,
                fontSize: '14px',
                outline: 'none',
                background: '#fff',
              }}
            >
              <option value="">-- Select Your Trip --</option>
              {trips.map((t) => (
                <option key={t.tripId || t.id} value={t.tripId || t.id}>
                  Trip #{t.tripId || t.id}: {t.destination} ({t.startDate || 'TBD'})
                </option>
              ))}
            </select>
            {errors.tripId && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.tripId}
              </span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 600 }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '9px 22px', fontSize: '13px', fontWeight: 700 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving to Backend...' : isEdit ? '💾 Update Expense' : '➕ Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
