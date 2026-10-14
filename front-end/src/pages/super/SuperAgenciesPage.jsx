import React, { useState } from 'react';
import { agenciesApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import SummaryCard from '../../components/common/SummaryCard';
import {
  AdminPage,
  AdminTable,
  Filters,
  AdminDialog,
  Field,
  SelectField,
  FormActions,
  DeleteDialog,
  Details,
  agencyStatuses,
  matches,
  useAdminData,
} from '../../components/admin/AdminUI';

const blank = {
  businessName: '',
  contactEmail: '',
  contactPhone: '',
  password: '',
  status: 'approved',
  commissionRate: '10',
};

export default function SuperAgenciesPage() {
  const resource = useAdminData(agenciesApi.getAll);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [statusAgency, setStatusAgency] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'approved', commissionRate: '10' });
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const change = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const openCreate = () => {
    setEditing({});
    setForm(blank);
  };

  const openEdit = (agency) => {
    setEditing(agency);
    setForm({
      businessName: agency.businessName || '',
      contactEmail: agency.contactEmail || '',
      contactPhone: agency.contactPhone || '',
      password: '',
      status: agency.status || 'pending',
      commissionRate: String(agency.commissionRate ?? 10),
    });
  };

  const openStatusRate = (agency) => {
    setStatusAgency(agency);
    setStatusForm({
      status: agency.status || 'pending',
      commissionRate: String(agency.commissionRate ?? 10),
    });
  };

  const agencies = resource.data || [];
  const totalAgencies = agencies.length;
  const approvedCount = agencies.filter((a) => a.status === 'approved').length;
  const pendingCount = agencies.filter((a) => a.status === 'pending').length;
  const rejectedCount = agencies.filter((a) => a.status === 'rejected').length;

  const rows = agencies.filter(
    (a) =>
      (!status || a.status === status) &&
      matches([a.agencyId, a.businessName, a.contactEmail, a.contactPhone], query)
  );

  const save = (e) => {
    e.preventDefault();
    const payload = {
      businessName: form.businessName.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
    };

    if (!editing.agencyId) {
      payload.password = form.password || 'agency123';
      payload.status = form.status;
      if (form.commissionRate !== '') payload.commissionRate = Number(form.commissionRate);
      resource.run(
        () => agenciesApi.create(payload),
        'Agency account created successfully.',
        () => setEditing(null)
      );
    } else {
      // Update profile and optionally status / commissionRate
      const id = editing.agencyId;
      resource.run(
        async () => {
          await agenciesApi.update(id, payload);
          const newStatus = form.status;
          const newRate = Number(form.commissionRate);
          if (editing.status !== newStatus || editing.commissionRate !== newRate) {
            await agenciesApi.updateStatus(id, {
              status: newStatus,
              commissionRate: newRate,
            });
          }
        },
        'Agency updated successfully.',
        () => setEditing(null)
      );
    }
  };

  const saveStatusRate = (e) => {
    e.preventDefault();
    const id = statusAgency.agencyId;
    const payload = {
      status: statusForm.status,
      commissionRate: Number(statusForm.commissionRate) || 10,
    };
    resource.run(
      () => agenciesApi.updateStatus(id, payload),
      `Agency status updated to ${statusForm.status} with ${payload.commissionRate}% commission.`,
      () => setStatusAgency(null)
    );
  };

  const quickApprove = (agency) => {
    resource.run(
      () =>
        agenciesApi.updateStatus(agency.agencyId, {
          status: 'approved',
          commissionRate: agency.commissionRate ?? 10,
        }),
      `Agency ${agency.businessName} approved!`,
      null
    );
  };

  const quickReject = (agency) => {
    resource.run(
      () =>
        agenciesApi.updateStatus(agency.agencyId, {
          status: 'rejected',
          commissionRate: agency.commissionRate ?? 10,
        }),
      `Agency ${agency.businessName} rejected / suspended.`,
      null
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    resource.run(
      () => agenciesApi.delete(deleting.agencyId),
      `Agency ${deleting.businessName} terminated and removed.`,
      () => setDeleting(null)
    );
  };

  return (
    <AdminPage
      title="Agency Reseller Ecosystem"
      resource={resource}
      actions={
        <button
          className="btn btn-primary"
          disabled={resource.busy}
          onClick={openCreate}
        >
          + Create Agency
        </button>
      }
    >
      {resource.data && (
        <>
          {/* Summary KPI Strip matching super/agencies.html */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <SummaryCard
              label="Total Enrolled Agencies"
              value={totalAgencies}
              style={{ borderRadius: 12 }}
            />
            <SummaryCard
              label="Approved Partners"
              value={<span style={{ color: '#059669' }}>{approvedCount}</span>}
              style={{ borderRadius: 12 }}
            />
            <SummaryCard
              label="Pending Approvals"
              value={
                <span style={{ color: pendingCount > 0 ? '#d97706' : '#6b7280' }}>
                  {pendingCount}
                </span>
              }
              style={{ borderRadius: 12 }}
            />
            <SummaryCard
              label="Rejected / Suspended"
              value={<span style={{ color: '#dc2626' }}>{rejectedCount}</span>}
              style={{ borderRadius: 12 }}
            />
          </div>

          <Filters {...{ query, setQuery, status, setStatus }} statuses={agencyStatuses} />

          <AdminTable
            rowKey="agencyId"
            rows={rows}
            columns={[
              { label: 'Agency ID', key: 'agencyId' },
              { label: 'Business Name', key: 'businessName' },
              { label: 'Contact Email', key: 'contactEmail' },
              { label: 'Contact Phone', key: 'contactPhone' },
              {
                label: 'Status',
                render: (a) => <StatusBadge status={a.status} />,
              },
              {
                label: 'Commission',
                render: (a) =>
                  a.commissionRate == null ? '10%' : `${a.commissionRate}%`,
              },
              {
                label: 'Actions',
                render: (a) => (
                  <div className="admin-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setViewing(a)}
                    >
                      View
                    </button>
                    {a.status === 'pending' && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ background: '#10b981', borderColor: '#10b981' }}
                        disabled={resource.busy}
                        onClick={() => quickApprove(a)}
                      >
                        Approve
                      </button>
                    )}
                    {a.status !== 'rejected' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#dc2626' }}
                        disabled={resource.busy}
                        onClick={() => quickReject(a)}
                      >
                        Reject
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEdit(a)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openStatusRate(a)}
                    >
                      Tier / Rate
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleting(a)}
                    >
                      Terminate
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      {/* View Agency Dialog */}
      {viewing && (
        <AdminDialog
          title={`Agency Profile: ${viewing.businessName}`}
          onClose={() => setViewing(null)}
          busy={false}
        >
          <Details
            entries={[
              ['Agency ID', viewing.agencyId],
              ['Business Name', viewing.businessName],
              ['Official Email', viewing.contactEmail],
              ['Phone Number', viewing.contactPhone],
              ['Partner Status', viewing.status],
              ['Commission Rate', `${viewing.commissionRate ?? 10}%`],
              ['Registration Date', viewing.createdAt || 'N/A'],
            ]}
          />
        </AdminDialog>
      )}

      {/* Create / Edit Agency Dialog */}
      {editing && (
        <AdminDialog
          title={editing.agencyId ? `Edit Agency: ${editing.businessName}` : 'Create New Agency'}
          onClose={() => setEditing(null)}
          busy={resource.busy}
        >
          <form onSubmit={save}>
            <Field
              label="Business Name"
              name="businessName"
              value={form.businessName}
              onChange={change}
              required
              disabled={resource.busy}
            />
            <Field
              label="Contact Email"
              name="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={change}
              required
              disabled={resource.busy}
            />
            <Field
              label="Contact Phone"
              name="contactPhone"
              value={form.contactPhone}
              onChange={change}
              required
              disabled={resource.busy}
            />

            {!editing.agencyId && (
              <Field
                label="Account Password"
                name="password"
                type="password"
                placeholder="Min 6 characters"
                minLength="6"
                value={form.password}
                onChange={change}
                required
                disabled={resource.busy}
              />
            )}

            <SelectField
              label="Status"
              name="status"
              values={agencyStatuses}
              value={form.status}
              onChange={change}
              disabled={resource.busy}
            />

            <Field
              label="Commission Rate (%)"
              name="commissionRate"
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.commissionRate}
              onChange={change}
              disabled={resource.busy}
            />

            {resource.error && (
              <p className="admin-error" role="alert">
                {resource.error}
              </p>
            )}

            <FormActions busy={resource.busy} onCancel={() => setEditing(null)} />
          </form>
        </AdminDialog>
      )}

      {/* Status & Commission Modal */}
      {statusAgency && (
        <AdminDialog
          title={`Update Status & Commission: ${statusAgency.businessName}`}
          onClose={() => setStatusAgency(null)}
          busy={resource.busy}
        >
          <form onSubmit={saveStatusRate}>
            <SelectField
              label="Status"
              name="status"
              values={agencyStatuses}
              value={statusForm.status}
              onChange={(e) =>
                setStatusForm((p) => ({ ...p, status: e.target.value }))
              }
              disabled={resource.busy}
            />
            <Field
              label="Commission Rate (%)"
              type="number"
              min="0"
              max="100"
              step="1"
              value={statusForm.commissionRate}
              onChange={(e) =>
                setStatusForm((p) => ({ ...p, commissionRate: e.target.value }))
              }
              disabled={resource.busy}
            />
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
              Only approved agencies can authenticate and book trips. Setting commission percentage configures agency fee split.
            </p>
            {resource.error && (
              <p className="admin-error" role="alert">
                {resource.error}
              </p>
            )}
            <FormActions busy={resource.busy} onCancel={() => setStatusAgency(null)} />
          </form>
        </AdminDialog>
      )}

      {/* Delete / Terminate Dialog */}
      {deleting && (
        <DeleteDialog
          title={`Terminate Agency ${deleting.businessName}?`}
          warning="This action permanently terminates the agency partnership and disables login access. Bookings, client passengers and transactions will be preserved for financial auditing."
          busy={resource.busy}
          error={resource.error}
          onClose={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </AdminPage>
  );
}
