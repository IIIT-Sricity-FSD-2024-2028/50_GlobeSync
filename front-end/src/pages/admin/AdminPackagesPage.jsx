import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAdminPackages,
  createAdminPackage,
  updateAdminPackage,
  archiveAdminPackage,
} from '../../store/admin-packages/admin-packages-actions';
import { adminPackagesActions } from '../../store/admin-packages/admin-packages-slice';
import { resolvePackageImage } from '../../components/packages/PackageCard';
import {
  AdminPage,
  AdminTable,
  Filters,
  AdminDialog,
  FormActions,
  money,
} from '../../components/admin/AdminUI';
import PackageFormDialog from '../../components/admin/PackageFormDialog';

export default function AdminPackagesPage() {
  const dispatch = useDispatch();

  const packages = useSelector((state) => state.adminPackages.packages);
  const selectedPackageId = useSelector((state) => state.adminPackages.selectedPackageId);
  const search = useSelector((state) => state.adminPackages.search);
  const modal = useSelector((state) => state.adminPackages.modal);
  const archiveReason = useSelector((state) => state.adminPackages.archiveReason);
  const loading = useSelector((state) => state.adminPackages.loading);
  const error = useSelector((state) => state.adminPackages.error);

  useEffect(() => {
    dispatch(fetchAdminPackages());
  }, [dispatch]);

  const filteredPackages = useMemo(() => {
    const list = Array.isArray(packages) ? packages : [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((pkg) =>
      (pkg.name ?? '').toLowerCase().includes(q) ||
      (pkg.destinations ?? '').toLowerCase().includes(q) ||
      String(pkg.packageId ?? '').includes(q)
    );
  }, [packages, search]);

  const editingPackage = selectedPackageId
    ? packages.find((p) => p.packageId === selectedPackageId) || null
    : null;

  const archivingPackage = modal.archiveOpen && selectedPackageId
    ? packages.find((p) => p.packageId === selectedPackageId) || null
    : null;

  const handleOpenCreate = () => {
    dispatch(adminPackagesActions.openCreateModal());
  };

  const handleOpenEdit = (pkg) => {
    dispatch(adminPackagesActions.openEditModal(pkg.packageId));
  };

  const handleCloseForm = () => {
    if (loading) return;
    dispatch(adminPackagesActions.closeModal());
  };

  const handleSavePackage = async (formData) => {
    try {
      if (editingPackage && editingPackage.packageId) {
        await dispatch(updateAdminPackage(editingPackage.packageId, formData));
      } else {
        await dispatch(createAdminPackage(formData));
      }
      dispatch(adminPackagesActions.closeModal());
    } catch {
      // Error is stored in state.adminPackages.error
    }
  };

  const handleOpenArchive = (pkg) => {
    dispatch(adminPackagesActions.openArchiveModal(pkg.packageId));
  };

  const handleCloseArchive = () => {
    if (loading) return;
    dispatch(adminPackagesActions.closeModal());
  };

  const handleConfirmArchive = async (e) => {
    e.preventDefault();
    if (!archivingPackage) return;
    if (!archiveReason.trim()) {
      dispatch(adminPackagesActions.setError('A mandatory reason is required to archive this package.'));
      return;
    }

    try {
      await dispatch(archiveAdminPackage(archivingPackage.packageId, archiveReason.trim()));
      dispatch(adminPackagesActions.closeModal());
    } catch {
      // Error stored in state.adminPackages.error
    }
  };

  const resource = {
    loading,
    busy: loading,
    load: () => dispatch(fetchAdminPackages({ force: true })),
    error,
    data: packages,
  };

  const columns = [
    {
      label: 'Cover',
      render: (pkg) => (
        <img
          className="admin-package-image"
          src={resolvePackageImage(pkg.image)}
          alt={pkg.name}
          onError={(e) => {
            if (!e.currentTarget.src.endsWith('/destinations/default-trip.png')) {
              e.currentTarget.src = '/destinations/default-trip.png';
            }
          }}
        />
      ),
    },
    {
      label: 'ID',
      key: 'packageId',
    },
    {
      label: 'Package Title',
      key: 'name',
    },
    {
      label: 'Destinations',
      key: 'destinations',
    },
    {
      label: 'Duration',
      render: (pkg) => `${pkg.duration || 1} Days`,
    },
    {
      label: 'Budget',
      render: (pkg) => money(pkg.budget),
    },
    {
      label: 'Status',
      render: (pkg) => {
        const isArchived = pkg.status === 'archived' || pkg.status === 'ARCHIVED';
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: isArchived ? '#fee2e2' : '#dcfce7',
              color: isArchived ? '#991b1b' : '#166534',
            }}
          >
            {isArchived ? 'Archived' : 'Active'}
          </span>
        );
      },
    },
    {
      label: 'Actions',
      render: (pkg) => {
        const isArchived = pkg.status === 'archived' || pkg.status === 'ARCHIVED';
        return (
          <div className="admin-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenEdit(pkg)}
              title="Edit package details"
            >
              Edit
            </button>
            {!isArchived && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenArchive(pkg)}
                title="Archive package (controlled removal)"
              >
                Archive
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AdminPage
      title="Packages Catalog"
      resource={resource}
      actions={
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={handleOpenCreate}
        >
          ➕ Create Package
        </button>
      }
    >
      {packages && (
        <>
          <Filters
            query={search}
            setQuery={(val) => dispatch(adminPackagesActions.setSearch(val))}
          />
          <AdminTable
            rowKey="packageId"
            rows={filteredPackages}
            columns={columns}
          />
        </>
      )}

      <PackageFormDialog
        isOpen={modal.createOpen || modal.editOpen}
        packageData={editingPackage}
        isBusy={loading}
        error={error}
        onClose={handleCloseForm}
        onSubmit={handleSavePackage}
      />

      {archivingPackage && (
        <AdminDialog
          title={`Archive Package "${archivingPackage.name}"?`}
          busy={loading}
          error={error}
          onClose={handleCloseArchive}
        >
          <form onSubmit={handleConfirmArchive}>
            <p style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '14px' }}>
              Archiving disables new traveler bookings for this package while preserving all historical booking and financial records. Super Admin will receive an informational notice.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                Archival Reason (Mandatory)
              </label>
              <textarea
                className="input-control"
                rows={3}
                placeholder="Explain the reason for archival (e.g. End of seasonal tour, revised itinerary)..."
                value={archiveReason}
                disabled={loading}
                onChange={(e) => dispatch(adminPackagesActions.setArchiveReason(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <FormActions
              busy={loading}
              onCancel={handleCloseArchive}
              submitLabel="Confirm Archival"
            />
          </form>
        </AdminDialog>
      )}
    </AdminPage>
  );
}
