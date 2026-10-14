import React, { useCallback, useEffect, useRef, useState } from 'react';
import SummaryCard from '../common/SummaryCard';
import './admin.css';

/**
 * AdminUI.jsx
 *
 * Core shared admin layout, primitives, and state coordination hook.
 *
 * Architectural & Educational Design:
 * 1. useAdminData: Coordinates remote list loading with in-flight abort control
 *    and clear separation between mutation execution vs background refresh errors.
 * 2. AdminPage: Top-level layout providing title, action bar, status banners,
 *    and accessible loading/error states.
 * 3. Controlled Primitives (Field, SelectField, AdminDialog, DeleteDialog):
 *    Expanded from compressed single-liners to accessible elements with field-level
 *    error rendering and in-dialog error banners.
 */

// ─── Formatters & Utility Constants ──────────────────────────────────────────

/**
 * Formats a numeric value into INR currency string.
 */
export const money = (value, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

export const tripStatuses = ['Planning', 'Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'];
export const bookingStatuses = ['Pending', 'Confirmed', 'Cancelled'];
export const agencyStatuses = ['pending', 'approved', 'rejected'];

/**
 * Resolves customer display name from either direct traveler or partner agency.
 * Consistent with shared schema conventions (businessName for agencies).
 */
export const ownerLabel = (row, travelers = [], agencies = []) => {
  if (row.travelerId != null) {
    const traveler = travelers.find((t) => t.travelerId === row.travelerId);
    return traveler?.name || `Traveler #${row.travelerId}`;
  }
  if (row.agencyId != null) {
    const agency = agencies.find((a) => a.agencyId === row.agencyId);
    return agency?.businessName || agency?.name || `Agency #${row.agencyId}`;
  }
  return 'Unassigned';
};

/**
 * Multi-field case-insensitive search predicate.
 */
export const matches = (values, query) =>
  values
    .filter((v) => v != null)
    .join(' ')
    .toLowerCase()
    .includes(query.trim().toLowerCase());

// ─── Shared Admin Data Hook ──────────────────────────────────────────────────

/**
 * useAdminData
 *
 * Centralizes the data-lifecycle pattern for admin pages:
 * - Mount / dependency data fetching with AbortController signal
 * - Explicit distinction between mutation failure vs subsequent refresh failure
 * - Exposes loading, busy, error, and notice states
 */
export function useAdminData(loader) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const active = useRef(true);
  const controller = useRef(null);

  // Fetch / reload handler
  const load = useCallback(async () => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;

    setLoading(true);
    setError('');

    try {
      const result = await loader({ signal: next.signal });
      if (active.current && !next.signal.aborted) {
        setData(result);
      }
    } catch (err) {
      if (active.current && !next.signal.aborted) {
        setError(err.message || 'Failed to load records.');
      }
    } finally {
      if (active.current && !next.signal.aborted) {
        setLoading(false);
      }
    }
  }, [loader]);

  useEffect(() => {
    active.current = true;
    load();
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, [load]);

  /**
   * Executes a mutation operation.
   * Crucial separation: Distinguishes between mutation failure
   * and a failed background refresh after mutation succeeded.
   */
  const run = async (operation, message, onSuccess) => {
    if (busy) return false;
    setBusy(true);
    setError('');
    setNotice('');

    let operationResult = null;
    let operationSucceeded = false;

    // Phase 1: Run mutation
    try {
      operationResult = await operation();
      operationSucceeded = true;
      if (!active.current) return true;
      onSuccess?.(operationResult);
      if (message) setNotice(message);
    } catch (err) {
      if (active.current) {
        setError(err.message || 'Action failed.');
      }
      return false;
    } finally {
      if (active.current) {
        setBusy(false);
      }
    }

    // Phase 2: Reload fresh records from backend
    if (operationSucceeded) {
      try {
        await load();
      } catch (refreshErr) {
        if (active.current) {
          setError(
            `Mutation saved successfully, but background data refresh failed: ${refreshErr.message}. Click Refresh to reload.`
          );
        }
      }
    }

    return true;
  };

  return {
    data,
    loading,
    error,
    notice,
    busy,
    load,
    run,
    setError,
    setNotice,
  };
}

// ─── Layout Primitives ───────────────────────────────────────────────────────

/**
 * AdminPage
 * Standard header, actions, feedback banners, and loading boundary.
 */
export function AdminPage({ title, resource, children, actions }) {
  const isBusy = resource.loading || resource.busy;

  return (
    <div className="admin-page" aria-busy={isBusy}>
      <header className="admin-heading">
        <h1>{title}</h1>
        <div className="admin-actions">
          {actions}
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isBusy}
            onClick={resource.load}
            title="Reload records from backend"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Page-level error banner */}
      {resource.error && (
        <div className="admin-alert admin-error" role="alert">
          <span>{resource.error}</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={isBusy}
            onClick={resource.load}
            style={{ marginLeft: '12px' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Page-level success notice */}
      {resource.notice && (
        <div className="admin-alert admin-success" role="status">
          ✓ {resource.notice}
        </div>
      )}

      {/* Main content or loading state */}
      {resource.loading ? (
        <p role="status" className="admin-empty">
          Loading records…
        </p>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Filters
 * Search input and optional status dropdown filter.
 */
export function Filters({ query, setQuery, status, setStatus, statuses = [], extra }) {
  return (
    <div className="admin-filters">
      <label>
        Search
        <input
          aria-label="Search"
          type="search"
          placeholder="Filter records..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {setStatus && (
        <label>
          Status
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}

      {extra}
    </div>
  );
}

/**
 * AdminTable
 * Accessible paginated table component with custom column renders.
 */
export function AdminTable({ columns, rows = [], rowKey }) {
  const [page, setPage] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    setPage(0);
  }, [rows]);

  const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
  const current = Math.min(page, lastPage);
  const pageRows = rows.slice(current * pageSize, (current + 1) * pageSize);

  if (!rows.length) {
    return <p className="admin-empty">No matching records found.</p>;
  }

  return (
    <>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.label} scope="col">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row[rowKey]}>
                {columns.map((col) => (
                  <td key={col.label}>
                    {col.render ? col.render(row) : (row[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <span>
          {rows.length} records · Page {current + 1} of {lastPage + 1}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={current === lastPage}
          onClick={() => setPage(current + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
}

/**
 * Metrics
 * Grid of summary metric cards.
 */
export function Metrics({ items = [] }) {
  return (
    <div className="admin-metrics">
      {items.map(([label, value, linkTo]) => (
        <SummaryCard
          key={label}
          label={label}
          value={<span className="admin-metric-value">{value}</span>}
          linkTo={linkTo}
          style={{ borderRadius: 8 }}
        />
      ))}
    </div>
  );
}

// ─── Controlled Form Primitives ──────────────────────────────────────────────

/**
 * Field
 * Accessible controlled input field with label, optional error message, and helper text.
 */
export function Field({ label, error, helperText, id, required, ...props }) {
  const fieldId = id || props.name;

  return (
    <div className="admin-field-group">
      <label htmlFor={fieldId} className="admin-field-label">
        {label}
        {required && <span className="admin-required-star" aria-hidden="true"> *</span>}
      </label>
      <input
        id={fieldId}
        required={required}
        className={`admin-input ${error ? 'admin-input-error' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-err` : helperText ? `${fieldId}-help` : undefined}
        {...props}
      />
      {helperText && !error && (
        <span id={`${fieldId}-help`} className="admin-field-help">
          {helperText}
        </span>
      )}
      {error && (
        <span id={`${fieldId}-err`} className="admin-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/**
 * SelectField
 * Accessible controlled dropdown with label, values list, and field-level error rendering.
 */
export function SelectField({ label, values = [], error, helperText, id, required, ...props }) {
  const selectId = id || props.name;

  return (
    <div className="admin-field-group">
      <label htmlFor={selectId} className="admin-field-label">
        {label}
        {required && <span className="admin-required-star" aria-hidden="true"> *</span>}
      </label>
      <select
        id={selectId}
        aria-label={label}
        required={required}
        className={`admin-select ${error ? 'admin-input-error' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-err` : helperText ? `${selectId}-help` : undefined}
        {...props}
      >
        {values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      {helperText && !error && (
        <span id={`${selectId}-help`} className="admin-field-help">
          {helperText}
        </span>
      )}
      {error && (
        <span id={`${selectId}-err`} className="admin-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/**
 * AdminDialog
 * Native HTML5 modal dialog with focus restoration, escape handling,
 * and direct in-dialog error display.
 */
export function AdminDialog({ title, onClose, busy = false, error = null, children }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousActiveElement = document.activeElement;
    const dialogElement = dialogRef.current;
    if (dialogElement && !dialogElement.open) {
      dialogElement.showModal();
    }
    return () => {
      if (dialogElement && dialogElement.open) {
        dialogElement.close();
      }
      previousActiveElement?.focus();
    };
  }, []);

  const handleCancel = (e) => {
    e.preventDefault();
    if (!busy) {
      closeRef.current?.();
    }
  };

  return (
    <dialog
      className="admin-dialog"
      ref={dialogRef}
      aria-label={title}
      onCancel={handleCancel}
    >
      <div className="admin-dialog-heading">
        <h2>{title}</h2>
        <button
          type="button"
          aria-label="Close dialog"
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* Render error inside active dialog so users see feedback immediately */}
      {error && (
        <div className="admin-dialog-error-banner" role="alert">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {children}
    </dialog>
  );
}

/**
 * FormActions
 * Standardized Cancel and Submit buttons for dialog forms.
 */
export function FormActions({ busy = false, submitLabel = 'Save', onCancel }) {
  return (
    <div className="admin-actions" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={busy}
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={busy}
      >
        {busy ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}

/**
 * DeleteDialog
 * Confirmation modal for destructive actions with in-dialog warning & error display.
 */
export function DeleteDialog({
  title,
  warning,
  onClose,
  onConfirm,
  busy = false,
  error = null,
}) {
  return (
    <AdminDialog title={title} onClose={onClose} busy={busy} error={error}>
      <p style={{ lineHeight: 1.6, color: 'var(--text-secondary, #475569)' }}>
        {warning}
      </p>
      <div className="admin-actions" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? 'Deleting…' : 'Delete permanently'}
        </button>
      </div>
    </AdminDialog>
  );
}

/**
 * Details
 * Definition list presentation for structured entity inspection.
 */
export function Details({ entries = [] }) {
  return (
    <dl className="admin-details">
      {entries.map(([key, value]) => (
        <React.Fragment key={key}>
          <dt>{key}</dt>
          <dd>{value ?? '-'}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
