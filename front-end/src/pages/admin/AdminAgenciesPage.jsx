import React, { useState, useMemo } from 'react';
import { agenciesApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  Filters,
  DeleteDialog,
  agencyStatuses,
  matches,
  useAdminData,
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
  const resource = useAdminData(agenciesApi.getAll);

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

  // Agency under deletion review
  const [deletingAgency, setDeletingAgency] = useState(null);

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
    const action = isEditMode
      ? () => agenciesApi.update(editingAgency.agencyId, payload)
      : () => agenciesApi.create(payload);

    const successMessage = isEditMode
      ? `Agency "${payload.businessName}" updated successfully.`
      : `Agency "${payload.businessName}" registered successfully.`;

    resource.run(action, successMessage, () => {
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
      () => agenciesApi.updateStatus(statusAgency.agencyId, payload),
      `Updated status for ${statusAgency.businessName}.`,
      () => {
        handleCloseStatus();
      }
    );
  };

  // ─── Inspection Handlers ──────────────────────────────────────────────────
  const handleViewDetails = (agency) => {
    resource.run(
      () => agenciesApi.getById(agency.agencyId),
      'Agency profile details loaded.',
      (detailedAgency) => {
        setViewingAgency(detailedAgency);
      }
    );
  };

  const handleCloseDetails = () => {
    setViewingAgency(null);
  };

  // ─── Deletion Handlers ────────────────────────────────────────────────────
  const handleOpenDelete = (agency) => {
    setDeletingAgency(agency);
  };

  const handleCloseDelete = () => {
    setDeletingAgency(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingAgency) return;

    resource.run(
      () => agenciesApi.delete(deletingAgency.agencyId),
      `Agency "${deletingAgency.businessName}" deleted.`,
      () => {
        handleCloseDelete();
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
      render: (agency) => (
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleViewDetails(agency)}
            disabled={resource.busy}
            title="Inspect agency profile"
          >
            View
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenEdit(agency)}
            disabled={resource.busy}
            title="Edit contact info"
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenStatus(agency)}
            disabled={resource.busy}
            title="Review approval and commission"
          >
            Status / rate
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => handleOpenDelete(agency)}
            disabled={resource.busy}
            title="Delete agency record"
          >
            Delete
          </button>
        </div>
      ),
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
      />

      {/* Permanent deletion confirmation modal */}
      {deletingAgency && (
        <DeleteDialog
          title={`Delete ${deletingAgency.businessName}?`}
          warning="This permanently removes the agency and its login credentials. If this agency has associated packages or trips, the backend will prevent deletion to preserve data integrity."
          busy={resource.busy}
          error={resource.error}
          onClose={handleCloseDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
    </AdminPage>
  );
}
