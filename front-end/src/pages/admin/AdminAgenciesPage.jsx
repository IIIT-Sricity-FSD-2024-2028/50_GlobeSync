import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAdminAgencies,
  fetchAdminAgencyById,
  createAdminAgency,
  updateAdminAgency,
  updateAdminAgencyStatus,
  requestAdminAgencyDeactivation,
} from '../../store/admin-agencies/admin-agencies-actions';
import { adminAgenciesActions } from '../../store/admin-agencies/admin-agencies-slice';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  Filters,
  AdminDialog,
  Field,
  FormActions,
  agencyStatuses,
} from '../../components/admin/AdminUI';
import AgencyFormModal from '../../components/admin/AgencyFormModal';
import AgencyStatusModal from '../../components/admin/AgencyStatusModal';
import AgencyDetailsModal from '../../components/admin/AgencyDetailsModal';

export default function AdminAgenciesPage() {
  const dispatch = useDispatch();

  const agencies = useSelector((state) => state.adminAgencies.agencies);
  const selectedAgencyId = useSelector((state) => state.adminAgencies.selectedAgencyId);
  const detailedAgency = useSelector((state) =>
    selectedAgencyId
      ? state.adminAgencies.detailsByAgencyId?.[selectedAgencyId]?.data || null
      : state.adminAgencies.detailedAgency
  );
  const search = useSelector((state) => state.adminAgencies.search);
  const statusFilter = useSelector((state) => state.adminAgencies.statusFilter);
  const deactivationReason = useSelector((state) => state.adminAgencies.deactivationReason);
  const modal = useSelector((state) => state.adminAgencies.modal);
  const loading = useSelector((state) => state.adminAgencies.loading);
  const error = useSelector((state) => state.adminAgencies.error);

  useEffect(() => {
    dispatch(fetchAdminAgencies());
  }, [dispatch]);

  const selectedAgency = useMemo(() => {
    if (!selectedAgencyId) return null;
    return agencies.find((a) => a.agencyId === selectedAgencyId) || null;
  }, [agencies, selectedAgencyId]);

  const filteredAgencies = useMemo(() => {
    const list = Array.isArray(agencies) ? agencies : [];
    return list.filter((agency) => {
      if (statusFilter && agency.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          String(agency.agencyId ?? '').toLowerCase().includes(q) ||
          (agency.businessName ?? '').toLowerCase().includes(q) ||
          (agency.contactEmail ?? '').toLowerCase().includes(q) ||
          (agency.contactPhone ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [agencies, search, statusFilter]);

  const handleOpenCreate = () => {
    dispatch(adminAgenciesActions.openFormModal(null));
  };

  const handleOpenEdit = (agency) => {
    dispatch(adminAgenciesActions.openFormModal(agency.agencyId));
  };

  const handleCloseForm = () => {
    dispatch(adminAgenciesActions.closeFormModal());
  };

  const handleSaveAgency = async (payload) => {
    try {
      if (selectedAgency && selectedAgency.agencyId) {
        await dispatch(updateAdminAgency(selectedAgency.agencyId, payload));
      } else {
        await dispatch(createAdminAgency(payload));
      }
    } catch {
      // Error handled in Redux state
    }
  };

  const handleOpenStatus = (agency) => {
    dispatch(adminAgenciesActions.openStatusModal(agency.agencyId));
  };

  const handleCloseStatus = () => {
    dispatch(adminAgenciesActions.closeStatusModal());
  };

  const handleUpdateStatus = async (payload) => {
    if (!selectedAgency) return;
    try {
      await dispatch(updateAdminAgencyStatus(selectedAgency.agencyId, payload));
    } catch {
      // Error handled in Redux state
    }
  };

  const handleViewDetails = (agency) => {
    dispatch(adminAgenciesActions.openDetailsModal(agency.agencyId));
    dispatch(fetchAdminAgencyById(agency.agencyId));
  };

  const handleCloseDetails = () => {
    dispatch(adminAgenciesActions.closeDetailsModal());
  };

  const handleOpenDeactivate = (agency) => {
    dispatch(adminAgenciesActions.openDeactivateModal(agency.agencyId));
  };

  const handleCloseDeactivate = () => {
    dispatch(adminAgenciesActions.closeDeactivateModal());
  };

  const handleConfirmDeactivateRequest = async () => {
    if (!selectedAgency || !deactivationReason.trim()) return;
    try {
      await dispatch(requestAdminAgencyDeactivation(selectedAgency.agencyId, deactivationReason.trim()));
    } catch {
      // Error handled in Redux state
    }
  };

  const resource = {
    loading,
    busy: loading,
    load: () => dispatch(fetchAdminAgencies({ force: true })),
    error,
    data: agencies,
  };

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
              disabled={loading}
              title={st === 'pending' ? 'Inspect application & documents' : 'Inspect agency profile'}
            >
              {st === 'pending' ? 'View Application' : 'View'}
            </button>

            {st === 'pending' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenStatus(agency)}
                disabled={loading}
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
                  disabled={loading}
                  title="Edit permitted ordinary agency contact info"
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenStatus(agency)}
                  disabled={loading}
                  title="Manage commission rate or temporarily suspend"
                >
                  Suspend / Rate
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenDeactivate(agency)}
                  disabled={loading}
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
                disabled={loading}
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
                  disabled={loading}
                  title="Restore suspended agency account"
                >
                  Restore / Review
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenDeactivate(agency)}
                  disabled={loading}
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
          disabled={loading}
          onClick={handleOpenCreate}
        >
          Create agency
        </button>
      }
    >
      {agencies && (
        <>
          <Filters
            query={search}
            setQuery={(val) => dispatch(adminAgenciesActions.setSearch(val))}
            status={statusFilter}
            setStatus={(val) => dispatch(adminAgenciesActions.setStatusFilter(val))}
            statuses={agencyStatuses}
          />
          <AdminTable
            rowKey="agencyId"
            rows={filteredAgencies}
            columns={tableColumns}
          />
        </>
      )}

      <AgencyDetailsModal
        isOpen={modal.detailsOpen && Boolean(detailedAgency || selectedAgency)}
        agency={detailedAgency || selectedAgency}
        onClose={handleCloseDetails}
        onReviewStatus={handleOpenStatus}
      />

      <AgencyFormModal
        isOpen={modal.formOpen}
        agency={selectedAgency}
        busy={loading}
        dialogError={error}
        onClose={handleCloseForm}
        onSave={handleSaveAgency}
      />

      <AgencyStatusModal
        isOpen={modal.statusOpen}
        agency={selectedAgency}
        busy={loading}
        dialogError={error}
        onClose={handleCloseStatus}
        onUpdate={handleUpdateStatus}
        onRequestSuperAdminApproval={(p) => dispatch(requestAdminAgencyDeactivation(selectedAgency.agencyId, p?.reason || 'Status review'))}
      />

      {modal.deactivateOpen && selectedAgency && (
        <AdminDialog
          title={`Request Deactivation: ${selectedAgency.businessName}`}
          onClose={handleCloseDeactivate}
          busy={loading}
          error={error}
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
              onChange={(e) => dispatch(adminAgenciesActions.setDeactivationReason(e.target.value))}
              placeholder="e.g. Contract breach, non-compliance with passenger safety standards"
              disabled={loading}
              helperText="Provide detailed legal/operational rationale for Super Admin review."
            />
            <FormActions
              busy={loading}
              onCancel={handleCloseDeactivate}
              submitLabel="Submit Deactivation Request"
            />
          </form>
        </AdminDialog>
      )}
    </AdminPage>
  );
}
