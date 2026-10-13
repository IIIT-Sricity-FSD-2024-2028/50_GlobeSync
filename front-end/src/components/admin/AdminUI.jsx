import React, { useCallback, useEffect, useRef, useState } from 'react';
import SummaryCard from '../common/SummaryCard';
import './admin.css';

export const money = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(value ?? 0);
export const tripStatuses = ['Planning', 'Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'];
export const bookingStatuses = ['Pending', 'Confirmed', 'Cancelled'];
export const agencyStatuses = ['pending', 'approved', 'rejected'];
export const ownerLabel = (row, travelers = [], agencies = []) => row.travelerId != null
  ? travelers.find(t => t.travelerId === row.travelerId)?.name || `Traveler #${row.travelerId}`
  : row.agencyId != null
    ? agencies.find(a => a.agencyId === row.agencyId)?.businessName || `Agency #${row.agencyId}`
    : 'Unassigned';
export const matches = (values, query) => values.filter(v => v != null).join(' ').toLowerCase().includes(query.trim().toLowerCase());

export function useAdminData(loader) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  const controller = useRef(null);
  const load = useCallback(async () => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setLoading(true);
    setError('');
    try {
      const result = await loader({ signal: next.signal });
      if (active.current && !next.signal.aborted) setData(result);
    } catch (err) {
      if (active.current && !next.signal.aborted) setError(err.message);
    } finally {
      if (active.current && !next.signal.aborted) setLoading(false);
    }
  }, [loader]);
  useEffect(() => {
    active.current = true;
    load();
    return () => { active.current = false; controller.current?.abort(); };
  }, [load]);
  const run = async (operation, message, onSuccess) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await operation();
      if (!active.current) return;
      onSuccess?.(result);
      setNotice(message);
      await load();
    } catch (err) {
      if (active.current) setError(err.message);
    } finally {
      if (active.current) setBusy(false);
    }
  };
  return { data, loading, error, notice, busy, load, run };
}

export function AdminPage({ title, resource, children, actions }) {
  return <div className="admin-page" aria-busy={resource.loading || resource.busy}>
    <header className="admin-heading"><h1>{title}</h1><div className="admin-actions">
      {actions}<button className="btn btn-secondary" disabled={resource.loading || resource.busy} onClick={resource.load}>Refresh</button>
    </div></header>
    {resource.error && <div className="admin-alert admin-error" role="alert">{resource.error} <button className="btn btn-secondary btn-sm" disabled={resource.busy || resource.loading} onClick={resource.load}>Retry</button></div>}
    {resource.notice && <div className="admin-alert admin-success" role="status">{resource.notice}</div>}
    {resource.loading ? <p role="status" className="admin-empty">Loading...</p> : children}
  </div>;
}

export function Filters({ query, setQuery, status, setStatus, statuses = [], extra }) {
  return <div className="admin-filters">
    <label>Search<input aria-label="Search" type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
    {setStatus && <label>Status<select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}>
      <option value="">All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}
    </select></label>}{extra}
  </div>;
}

export function AdminTable({ columns, rows, rowKey }) {
  const [page, setPage] = useState(0);
  const pageSize = 15;
  useEffect(() => { setPage(0); }, [rows]);
  const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
  const current = Math.min(page, lastPage);
  if (!rows.length) return <p className="admin-empty">No matching records.</p>;
  return <><div className="admin-table-wrap"><table>
    <thead><tr>{columns.map(c => <th key={c.label} scope="col">{c.label}</th>)}</tr></thead>
    <tbody>{rows.slice(current * pageSize, (current + 1) * pageSize).map(row => <tr key={row[rowKey]}>
      {columns.map(c => <td key={c.label}>{c.render ? c.render(row) : row[c.key] ?? '-'}</td>)}
    </tr>)}</tbody>
  </table></div><div className="admin-pagination"><span>{rows.length} records · Page {current + 1} of {lastPage + 1}</span>
    <button className="btn btn-secondary btn-sm" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
    <button className="btn btn-secondary btn-sm" disabled={current === lastPage} onClick={() => setPage(current + 1)}>Next</button>
  </div></>;
}

export function Metrics({ items }) {
  return <div className="admin-metrics">{items.map(([label, value, linkTo]) =>
    <SummaryCard key={label} label={label} value={<span className="admin-metric-value">{value}</span>} linkTo={linkTo} style={{ borderRadius: 8 }} />
  )}</div>;
}

export function Field({ label, ...props }) {
  return <label className="admin-field">{label}<input {...props} /></label>;
}
export function SelectField({ label, values, ...props }) {
  return <label className="admin-field">{label}<select aria-label={label} {...props}>{values.map(v => <option key={v} value={v}>{v}</option>)}</select></label>;
}

export function AdminDialog({ title, onClose, busy, children }) {
  const dialog = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    return () => { element.close(); previous?.focus(); };
  }, []);
  return <dialog className="admin-dialog" ref={dialog} aria-label={title} onCancel={e => { e.preventDefault(); if (!busy) close.current(); }}>
    <div className="admin-dialog-heading"><h2>{title}</h2><button type="button" aria-label="Close dialog" className="btn btn-secondary btn-sm" disabled={busy} onClick={onClose}>×</button></div>
    {children}
  </dialog>;
}

export function FormActions({ busy, onCancel }) {
  return <div className="admin-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>Cancel</button>
    <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button></div>;
}

export function DeleteDialog({ title, warning, onClose, onConfirm, busy, error }) {
  return <AdminDialog title={title} onClose={onClose} busy={busy}>
    <p>{warning}</p>{error && <p role="alert" className="admin-error">{error}</p>}
    <div className="admin-actions"><button className="btn btn-secondary" disabled={busy} onClick={onClose}>Cancel</button>
      <button className="btn btn-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting...' : 'Delete permanently'}</button></div>
  </AdminDialog>;
}

export function Details({ entries }) {
  return <dl className="admin-details">{entries.map(([key, value]) => <React.Fragment key={key}>
    <dt>{key}</dt><dd>{value ?? '-'}</dd>
  </React.Fragment>)}</dl>;
}
