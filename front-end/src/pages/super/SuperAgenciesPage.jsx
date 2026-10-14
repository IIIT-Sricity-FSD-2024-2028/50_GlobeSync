import React, { useState, useMemo } from 'react';
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+0-9\s\-()]{7,20}$/;

const blankAgency = {
  businessName: '',
  contactEmail: '',
  contactPhone: '',
  password: '',
  status: 'approved',
  commissionRate: '', // Clean empty string — never default to 10%
};

/**
 * SuperAgenciesPage
 * Primary route: /super/agencies
 *
 * Superuser portal for partner travel agencies management.
 *
 * Architecture & Policy Compliance:
 * 1. Shared Commission Contract:
 *    - Commission rate adheres strictly to the 1.0% - 1.5% platform constraint.
 *    - Eliminates all hardcoded 10% defaults.
 *    - Omitting a rate (empty string) leaves the rate unconfigured/preserved, distinct from modifying it.
 * 2. Honest Step-Wise Error Handling:
 *    - When updating profile details and status/rate in a compound operation,
 *      handles profile update success followed by status update failure honestly with clear recovery guidance.
 * 3. Client-Side Field Validation:
 *    - Checks duplicate emails, phone format, and commission rate bounds with in-dialog error display.
 */
export default function SuperAgenciesPage() {
  const resource = useAdminData(agenciesApi.getAll);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  // Edit / Create Dialog State
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankAgency);
  const [fieldErrors, setFieldErrors] = useState({});

  // Status & Commission Dialog State
  const [statusAgency, setStatusAgency] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'approved', commissionRate: '' });
  const [statusErrors, setStatusErrors] = useState({});

  // Delete & View States
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const agencies = resource.data || [];
  const totalAgencies = agencies.length;
  const approvedCount = agencies.filter((a) => a.status === 'approved').length;
  const pendingCount = agencies.filter((a) => a.status === 'pending').length;
  const rejectedCount = agencies.filter((a) => a.status === 'rejected').length;

  const rows = useMemo(() => {
    return agencies.filter(
      (a) =>
        (!status || a.status === status) &&
        matches([a.agencyId, a.businessName, a.contactEmail, a.contactPhone], query)
    );
  }, [agencies, status, query]);

  // ─── Change Handlers ────────────────────────────────────────────────────────

  const change = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const changeStatusForm = (e) => {
    const { name, value } = e.target;
    setStatusForm((prev) => ({ ...prev, [name]: value }));
    if (statusErrors[name]) {
      setStatusErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // ─── Modal Openers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing({});
    setForm(blankAgency);
    setFieldErrors({});
  };

  const openEdit = (agency) => {
    setEditing(agency);
    setForm({
      businessName: agency.businessName || '',
      contactEmail: agency.contactEmail || '',
      contactPhone: agency.contactPhone || '',
      password: '',
      status: agency.status || 'pending',
      commissionRate: agency.commissionRate != null ? String(agency.commissionRate) : '',
    });
    setFieldErrors({});
  };

  const openStatusRate = (agency) => {
    setStatusAgency(agency);
    setStatusForm({
      status: agency.status || 'pending',
      commissionRate: agency.commissionRate != null ? String(agency.commissionRate) : '',
    });
    setStatusErrors({});
  };

  // ─── Validations ───────────────────────────────────────────────────────────

  const validateAgencyForm = () => {
    const errors = {};
    const isNew = !editing?.agencyId;

    if (!form.businessName.trim()) {
      errors.businessName = 'Business name is required.';
    } else if (form.businessName.trim().length < 2) {
      errors.businessName = 'Business name must be at least 2 characters.';
    }

    if (!form.contactEmail.trim()) {
      errors.contactEmail = 'Contact email is required.';
    } else if (!EMAIL_REGEX.test(form.contactEmail.trim())) {
      errors.contactEmail = 'Please provide a valid email address.';
    } else {
      // Check duplicate email
      const isDuplicate = agencies.some(
        (a) =>
          a.contactEmail.toLowerCase() === form.contactEmail.trim().toLowerCase() &&
          a.agencyId !== editing?.agencyId
      );
      if (isDuplicate) {
        errors.contactEmail = 'This email is already registered by another agency.';
      }
    }

    if (!form.contactPhone.trim()) {
      errors.contactPhone = 'Contact phone number is required.';
    } else if (!PHONE_REGEX.test(form.contactPhone.trim())) {
      errors.contactPhone = 'Please enter a valid phone number (7-20 digits).';
    }

    if (isNew) {
      if (!form.password) {
        errors.password = 'Initial password is required for new agencies.';
      } else if (form.password.length < 6) {
        errors.password = 'Password must be at least 6 characters.';
      }
    }

    if (form.commissionRate.trim() !== '') {
      const rate = Number(form.commissionRate);
      if (Number.isNaN(rate) || rate < 1.0 || rate > 1.5) {
        errors.commissionRate = 'Commission rate must be between 1.0% and 1.5%.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStatusForm = () => {
    const errors = {};
    if (statusForm.commissionRate.trim() !== '') {
      const rate = Number(statusForm.commissionRate);
      if (Number.isNaN(rate) || rate < 1.0 || rate > 1.5) {
        errors.commissionRate = 'Commission rate must be between 1.0% and 1.5%.';
      }
    }
    setStatusErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Save Handlers ─────────────────────────────────────────────────────────

  const save = async (e) => {
    e.preventDefault();
    if (!validateAgencyForm()) return;

    const isNew = !editing.agencyId;

    if (isNew) {
      const payload = {
        businessName: form.businessName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        password: form.password,
        status: form.status,
      };
      if (form.commissionRate.trim() !== '') {
        payload.commissionRate = Number(form.commissionRate);
      }

      resource.run(
        () => agenciesApi.create(payload),
        'Agency account created successfully.',
        () => setEditing(null)
      );
    } else {
      const id = editing.agencyId;
      const profilePayload = {
        businessName: form.businessName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
      };

      const statusChanged = form.status !== editing.status;
      const currentRateStr = editing.commissionRate != null ? String(editing.commissionRate) : '';
      const rateChanged = form.commissionRate.trim() !== currentRateStr;

      resource.run(
        async () => {
          // Step 1: Update profile details
          await agenciesApi.update(id, profilePayload);

          // Step 2: Update status or commission rate if changed
          if (statusChanged || rateChanged) {
            const statusPayload = { status: form.status };
            if (form.commissionRate.trim() !== '') {
              statusPayload.commissionRate = Number(form.commissionRate);
            }
            try {
              await agenciesApi.updateStatus(id, statusPayload);
            } catch (statusErr) {
              // Honest step-wise error reporting with recovery instruction
              throw new Error(
                `Agency profile contact details were saved, but updating status/commission rate failed: ${statusErr.message}. You can update the status or rate using the "Status / rate" button.`
              );
            }
          }
        },
        'Agency profile updated successfully.',
        () => setEditing(null)
      );
    }
  };

  const saveStatusRate = (e) => {
    e.preventDefault();
    if (!validateStatusForm()) return;

    const id = statusAgency.agencyId;
    const payload = {
      status: statusForm.status,
    };
    // Only send commissionRate if explicitly provided; otherwise leave empty to preserve existing
    if (statusForm.commissionRate.trim() !== '') {
      payload.commissionRate = Number(statusForm.commissionRate);
    }

    resource.run(
      () => agenciesApi.updateStatus(id, payload),
      `Agency status updated to '${statusForm.status}'${
        payload.commissionRate != null ? ` with ${payload.commissionRate}% commission` : ''
      }.`,
      () => setStatusAgency(null)
    );
  };

  const quickApprove = (agency) => {
    const payload = { status: 'approved' };
    if (agency.commissionRate != null) {
      payload.commissionRate = agency.commissionRate;
    }
    resource.run(
      () => agenciesApi.updateStatus(agency.agencyId, payload),
      `Agency ${agency.businessName} approved!`,
      null
    );
  };

  const quickReject = (agency) => {
    resource.run(
      () =>
        agenciesApi.updateStatus(agency.agencyId, {
          status: 'rejected',
        }),
      `Agency ${agency.businessName} rejected.`,
      null
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    resource.run(
      () => agenciesApi.delete(deleting.agencyId),
      `Agency ${deleting.businessName} deleted successfully.`,
      () => setDeleting(null)
    );
  };

  return (
    <AdminPage
      title="Agencies Directory"
      resource={resource}
      actions={
        <button
          className="btn btn-primary"
          disabled={resource.busy}
          onClick={openCreate}
        >
          + Register Agency
        </button>
      }
    >
      {/* Overview Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard title="Total Agencies" value={totalAgencies} icon="🏢" color="primary" />
        <SummaryCard title="Approved" value={approvedCount} icon="✅" color="success" />
        <SummaryCard title="Pending Review" value={pendingCount} icon="⏳" color="warning" />
        <SummaryCard title="Rejected" value={rejectedCount} icon="❌" color="danger" />
      </div>

      {resource.data && (
        <>
          <Filters
            query={query}
            setQuery={setQuery}
            status={status}
            setStatus={setStatus}
            statuses={agencyStatuses}
          />

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
                label: 'Commission Rate',
                render: (a) =>
                  a.commissionRate != null ? `${a.commissionRate}%` : 'Platform Default',
              },
              {
                label: 'Quick Decision',
                render: (a) => (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {a.status !== 'approved' && (
                      <button
                        className="btn btn-success btn-sm"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        disabled={resource.busy}
                        onClick={() => quickApprove(a)}
                        title="Approve agency immediately"
                      >
                        Approve
                      </button>
                    )}
                    {a.status !== 'rejected' && (
                      <button
                        className="btn btn-warning btn-sm"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        disabled={resource.busy}
                        onClick={() => quickReject(a)}
                        title="Reject agency"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                ),
              },
              {
                label: 'Actions',
                render: (a) => (
                  <div className="admin-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        resource.run(
                          () => agenciesApi.getById(a.agencyId),
                          'Agency details loaded.',
                          setViewing
                        )
                      }
                      title="View agency profile"
                    >
                      View
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEdit(a)}
                      title="Edit agency details"
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openStatusRate(a)}
                      title="Adjust approval status & commission rate"
                    >
                      Status / rate
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleting(a)}
                      title="Delete agency"
                    >
                      Delete
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
              ['Email Address', viewing.contactEmail],
              ['Phone Number', viewing.contactPhone],
              ['Account Status', viewing.status],
              [
                'Commission Rate',
                viewing.commissionRate != null ? `${viewing.commissionRate}%` : 'Platform Default',
              ],
              ['Registration Date', viewing.createdAt || 'N/A'],
            ]}
          />
        </AdminDialog>
      )}

      {/* Create / Edit Agency Dialog */}
      {editing && (
        <AdminDialog
          title={editing.agencyId ? `Edit Agency: ${editing.businessName}` : 'Register New Agency'}
          onClose={() => setEditing(null)}
          busy={resource.busy}
          error={resource.error}
        >
          <form onSubmit={save} noValidate>
            <Field
              id="super-agency-businessName"
              label="Business Name"
              name="businessName"
              value={form.businessName}
              onChange={change}
              required
              disabled={resource.busy}
              error={fieldErrors.businessName}
              placeholder="e.g. Skyline Travel Group"
            />

            <Field
              id="super-agency-contactEmail"
              label="Contact Email"
              name="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={change}
              required
              disabled={resource.busy}
              error={fieldErrors.contactEmail}
              placeholder="e.g. info@skylinetravel.com"
            />

            <Field
              id="super-agency-contactPhone"
              label="Contact Phone"
              name="contactPhone"
              type="tel"
              value={form.contactPhone}
              onChange={change}
              required
              disabled={resource.busy}
              error={fieldErrors.contactPhone}
              placeholder="e.g. +91 98765 43210"
            />

            {!editing.agencyId && (
              <>
                <Field
                  id="super-agency-password"
                  label="Initial Password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={change}
                  required
                  disabled={resource.busy}
                  error={fieldErrors.password}
                  helperText="Password for partner agency portal sign-in."
                />

                <SelectField
                  id="super-agency-status"
                  label="Initial Status"
                  name="status"
                  values={agencyStatuses}
                  value={form.status}
                  onChange={change}
                  disabled={resource.busy}
                />
              </>
            )}

            <Field
              id="super-agency-commissionRate"
              label="Commission Rate (%)"
              name="commissionRate"
              type="number"
              min="1.0"
              max="1.5"
              step="0.01"
              value={form.commissionRate}
              onChange={change}
              disabled={resource.busy}
              error={fieldErrors.commissionRate}
              placeholder="1.0 to 1.5 (leave empty for default)"
              helperText="Allowed platform commission rate range: 1.0% to 1.5%."
            />

            <FormActions busy={resource.busy} onCancel={() => setEditing(null)} />
          </form>
        </AdminDialog>
      )}

      {/* Adjust Status & Commission Rate Dialog */}
      {statusAgency && (
        <AdminDialog
          title={`Status & Rate: ${statusAgency.businessName}`}
          onClose={() => setStatusAgency(null)}
          busy={resource.busy}
          error={resource.error}
        >
          <form onSubmit={saveStatusRate} noValidate>
            <SelectField
              id="super-statusAgency-status"
              label="Approval Status"
              name="status"
              values={agencyStatuses}
              value={statusForm.status}
              onChange={changeStatusForm}
              disabled={resource.busy}
              helperText="Only 'approved' agencies can log in to the agency portal."
            />

            <Field
              id="super-statusAgency-rate"
              label="Commission Rate (%)"
              name="commissionRate"
              type="number"
              min="1.0"
              max="1.5"
              step="0.01"
              value={statusForm.commissionRate}
              onChange={changeStatusForm}
              disabled={resource.busy}
              error={statusErrors.commissionRate}
              placeholder="e.g. 1.25 (optional)"
              helperText="Platform standard: 1.0% to 1.5%. Leaving this empty preserves the current rate."
            />

            <div
              className="admin-status-note"
              style={{
                backgroundColor: '#f8fafc',
                borderLeft: '4px solid #6366f1',
                padding: '10px 14px',
                borderRadius: '4px',
                fontSize: '0.85rem',
                color: '#475569',
                margin: '12px 0 16px',
              }}
            >
              <strong>Policy:</strong> Omitting the commission rate preserves the existing configured
              rate. Setting a new rate requires a value between 1.0% and 1.5%.
            </div>

            <FormActions busy={resource.busy} onCancel={() => setStatusAgency(null)} />
          </form>
        </AdminDialog>
      )}

      {/* Delete Agency Confirmation */}
      {deleting && (
        <DeleteDialog
          title={`Delete Agency: ${deleting.businessName}?`}
          warning="This action permanently deletes this agency account and terminates login access. If this agency has associated packages or trips, deletion will be rejected to protect historical integrity."
          busy={resource.busy}
          error={resource.error}
          onClose={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </AdminPage>
  );
}
