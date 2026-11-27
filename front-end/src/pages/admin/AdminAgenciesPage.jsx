import React, { useState, useMemo } from 'react';
import { agenciesApi, approvalsApi } from '../../services/api';
import { useReduxAdminData } from '../../store/hooks';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  Filters,
  AdminDialog,
  Field,
  FormActions,
  agencyStatuses,
  matches,
} from '../../components/admin/AdminUI';
import AgencyFormModal from '../../components/admin/AgencyFormModal';
import AgencyStatusModal from '../../components/admin/AgencyStatusModal';
import AgencyDetailsModal from '../../components/admin/AgencyDetailsModal';

/**
 * AdminAgenciesPage
 *
 * Primary administrative coordinator for managing partner travel agencies.
 *
 * Pedagogical Architecture:
 * 1. Page / Coordinator Separation:
 *    - The page coordinates table presentation, search filters, modal visibility, and API orchestration.
 *    - Individual form presentation, input state, and field validations are delegated to dedicated
 *      controlled components: `AgencyFormModal`, `AgencyStatusModal`, and `AgencyDetailsModal`.
 * 2. Explicit, Named Handlers:
 *    - Replaces anonymous inline callbacks with named handlers (`handleOpenCreate`, `handleSaveAgency`,
 *      `handleUpdateStatus`, `handleConfirmDelete`, etc.) making state ownership unambiguous for students.
 * 3. In-Dialog Error Propagation:
 *    - When an API mutation fails, the resulting error is passed into the open modal dialog
 *      (`dialogError={resource.error}`) so the administrator sees actionable feedback inside the dialog.
 * 4. Safe Deletion & Historical Integrity:
 *    - Warns the user of the backend policy preventing unsafe removal of agencies with associated packages/trips.
 */
export default function AdminAgenciesPage() {
  // ─── API Resource State ───────────────────────────────────────────────────
  const resource = useReduxAdminData('agencies');

  // ─── Search & Filter State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // ─── Modal Dialog States ──────────────────────────────────────────────────
  // Agency under creation (editingAgency === null) or edit (editingAgency === record)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null);

  // Agency under status & commission review
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusAgency, setStatusAgency] = useState(null);

  // Agency under deactivation / approval request
  const [deactivatingAgency, setDeactivatingAgency] = useState(null);
  const [deactivationReason, setDeactivationReason] = useState('');

  // Agency under detailed inspection
  const [viewingAgency, setViewingAgency] = useState(null);

  // ─── Filtered Table Rows ──────────────────────────────────────────────────
  const filteredAgencies = useMemo(() => {
    if (!resource.data) return [];
    return resource.data.filter((agency) => {
      const matchesStatus = !selectedStatus || agency.status === selectedStatus;
      const matchesSearch = matches(
        [agency.agencyId, agency.businessName, agency.contactEmail, agency.contactPhone],
        searchQuery
      );
      return matchesStatus && matchesSearch;
    });
  }, [resource.data, selectedStatus, searchQuery]);

  // ─── Create & Edit Agency Handlers ────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingAgency(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (agency) => {
    setEditingAgency(agency);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAgency(null);
  };

  const handleSaveAgency = (payload) => {
    const isEditMode = Boolean(editingAgency && editingAgency.agencyId);
    const action = isEditMode ? 'update' : 'create';
    const actionPayload = isEditMode ? [editingAgency.agencyId, payload] : payload;

    const successMessage = isEditMode
      ? `Agency "${payload.businessName}" updated successfully.`
      : `Agency "${payload.businessName}" registered successfully.`;

    resource.run(action, actionPayload, successMessage, () => {
      handleCloseForm();
    });
  };

  // ─── Status & Commission Review Handlers ───────────────────────────────────
  const handleOpenStatus = (agency) => {
    setStatusAgency(agency);
    setIsStatusOpen(true);
  };

  const handleCloseStatus = () => {
    setIsStatusOpen(false);
    setStatusAgency(null);
  };

  const handleUpdateStatus = (payload) => {
    if (!statusAgency) return;

    resource.run(
      'updateStatus', [statusAgency.agencyId, payload],
      `Updated status for ${statusAgency.businessName}.`,
      () => {
        handleCloseStatus();
      }
    );
  };

  // ─── Inspection Handlers ──────────────────────────────────────────────────
  const handleViewDetails = (agency) => {
    resource.run(
      'getDetails', agency.agencyId,
      'Agency profile details loaded.',
      (detailedAgency) => {
        setViewingAgency(detailedAgency);
      }
    );
  };

  const handleCloseDetails = () => {
    setViewingAgency(null);
  };

  // ─── Super Admin Approval Handlers (Category C) ───────────────────────────
  const handleRequestSuperAdminApproval = (approvalPayload) => {
    resource.run(
      'createApproval', approvalPayload,
      'Approval request submitted to Super Admin successfully.',
      () => {
        handleCloseStatus();
      }
    );
  };

  const handleOpenDeactivate = (agency) => {
    setDeactivatingAgency(agency);
    setDeactivationReason('');
  };

  const handleCloseDeactivate = () => {
    setDeactivatingAgency(null);
    setDeactivationReason('');
  };

  const handleConfirmDeactivateRequest = () => {
    if (!deactivatingAgency || !deactivationReason.trim()) return;

    resource.run(
      'createApproval', {
          type: 'AGENCY_STATUS_COMMISSION',
          entityType: 'agency',
          entityId: deactivatingAgency.agencyId,
          proposedValues: {
            status: 'rejected',
            statusReason: deactivationReason.trim(),
          },
          reason: `Permanent deactivation requested by Admin: ${deactivationReason.trim()}`,
        },
      `Submitted deactivation approval request for ${deactivatingAgency.businessName}.`,
      () => {
        handleCloseDeactivate();
      }
    );
  };

  // ─── Table Column Definitions ─────────────────────────────────────────────
  const tableColumns = [
    { label: 'ID', key: 'agencyId' },
    { label: 'Business Name', key: 'businessName' },
    { label: 'Contact Email', key: 'contactEmail' },
    { label: 'Contact Phone', key: 'contactPhone' },
    {
      label: 'Status',
      render: (agency) => <StatusBadge status={agency.status} />,
    },
    {
      label: 'Commission',
      render: (agency) =>
        agency.commissionRate == null ? 'Default' : `${agency.commissionRate}%`,
    },
    {
      label: 'Actions',
      render: (agency) => {
        const st = (agency.status || 'pending').toLowerCase();
        return (
          <div className="admin-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleViewDetails(agency)}
              disabled={resource.busy}
              title={st === 'pending' ? 'Inspect application & documents' : 'Inspect agency profile'}
            >
              {st === 'pending' ? 'View Application' : 'View'}
            </button>

            {st === 'pending' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenStatus(agency)}
                disabled={resource.busy}
                title="Independently approve or reject this agency application"
              >
                Approve / Reject
              </button>
            )}

            {st === 'approved' && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenEdit(agency)}
                  disabled={resource.busy}
                  title="Edit permitted ordinary agency contact info"
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenStatus(agency)}
                  disabled={resource.busy}
                  title="Manage commission rate or temporarily suspend"
                >
                  Suspend / Rate
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenDeactivate(agency)}
                  disabled={resource.busy}
                  title="Request permanent deactivation via Super Admin (Category C)"
                  style={{ color: '#dc2626' }}
                >
                  Deactivate
                </button>
              </>
            )}

            {st === 'rejected' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenStatus(agency)}
                disabled={resource.busy}
                title="Re-open or review resubmitted application"
              >
                Review Decision
              </button>
            )}

            {st === 'suspended' && (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenStatus(agency)}
                  disabled={resource.busy}
                  title="Restore suspended agency account"
                >
                  Restore / Review
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenDeactivate(agency)}
                  disabled={resource.busy}
                  title="Request permanent deactivation via Super Admin (Category C)"
                  style={{ color: '#dc2626' }}
                >
                  Deactivate
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AdminPage
      title="Agencies"
      resource={resource}
      actions={
        <button
          type="button"
          className="btn btn-primary"
          disabled={resource.busy}
          onClick={handleOpenCreate}
        >
          Create agency
        </button>
      }
    >
      {resource.data && (
        <>
          <Filters
            query={searchQuery}
            setQuery={setSearchQuery}
            status={selectedStatus}
            setStatus={setSelectedStatus}
            statuses={agencyStatuses}
          />
          <AdminTable
            rowKey="agencyId"
            rows={filteredAgencies}
            columns={tableColumns}
          />
        </>
      )}

      {/* Read-only profile inspection modal */}
      <AgencyDetailsModal
        isOpen={Boolean(viewingAgency)}
        agency={viewingAgency}
        onClose={handleCloseDetails}
        onReviewStatus={handleOpenStatus}
      />

      {/* Create / Edit Agency controlled form modal */}
      <AgencyFormModal
        isOpen={isFormOpen}
        agency={editingAgency}
        busy={resource.busy}
        dialogError={resource.error}
        onClose={handleCloseForm}
        onSave={handleSaveAgency}
      />

      {/* Status & Commission rate configuration modal */}
      <AgencyStatusModal
        isOpen={isStatusOpen}
        agency={statusAgency}
        busy={resource.busy}
        dialogError={resource.error}
        onClose={handleCloseStatus}
        onUpdate={handleUpdateStatus}
        onRequestSuperAdminApproval={handleRequestSuperAdminApproval}
      />

      {/* High-Risk Permanent Deactivation Request Dialog (Category C) */}
      {deactivatingAgency && (
        <AdminDialog
          title={`Request Deactivation: ${deactivatingAgency.businessName}`}
          onClose={handleCloseDeactivate}
          busy={resource.busy}
          error={resource.error}
        >
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Permanent deactivation or account termination is an irreversible high-risk decision (Category C Governance).
            </p>
            <p style={{ margin: 0 }}>
              This request will be routed to the Super Admin for authorization before any account privileges are revoked.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmDeactivateRequest();
            }}
          >
            <Field
              id="deactivation-reason"
              label="Deactivation Justification (Required)"
              type="text"
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              placeholder="e.g. Contract breach, non-compliance with passenger safety standards"
              disabled={resource.busy}
              helperText="Provide detailed legal/operational rationale for Super Admin review."
            />
            <FormActions
              busy={resource.busy}
              onCancel={handleCloseDeactivate}
              submitLabel="Submit Deactivation Request"
            />
          </form>
        </AdminDialog>
      )}
    </AdminPage>
  );
}
