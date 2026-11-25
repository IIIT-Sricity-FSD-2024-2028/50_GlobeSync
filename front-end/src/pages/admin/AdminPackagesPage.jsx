import React, { useState, useMemo } from 'react';
import { packagesApi } from '../../services/api';
import { resolvePackageImage } from '../../components/packages/PackageCard';
import {
  AdminPage,
  AdminTable,
  Filters,
  AdminDialog,
  FormActions,
  matches,
  money,
  useAdminData,
} from '../../components/admin/AdminUI';
import PackageFormDialog from '../../components/admin/PackageFormDialog';

/**
 * AdminPackagesPage
 * Primary route: /admin/packages
 *
 * Operational Authority & Governance:
 * 1. Independent Operational Authority:
 *    - Admin creates, edits, publishes, and archives packages independently.
 * 2. Mandatory Super Admin Notifications:
 *    - Every successful administrative creation, update, and archival automatically generates
 *      an informational audit notification to Super Admin.
 * 3. Controlled Archival:
 *    - Package removal uses controlled archival with a mandatory reason, preventing new bookings
 *      while preserving historical bookings and financial records.
 */
export default function AdminPackagesPage() {
  const resource = useAdminData(packagesApi.getAll);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formError, setFormError] = useState(null);

  // Archive modal state
  const [archivingPackage, setArchivingPackage] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveError, setArchiveError] = useState(null);

  // ─── Filtered Packages List ────────────────────────────────────────────────
  const filteredPackages = useMemo(() => {
    const rawList = Array.isArray(resource.data) ? resource.data : [];
    if (!searchQuery.trim()) return rawList;

    return rawList.filter((pkg) =>
      matches([pkg.packageId, pkg.name, pkg.destinations, pkg.highlights, pkg.status], searchQuery)
    );
  }, [resource.data, searchQuery]);

  // ─── Action Handlers ───────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingPackage(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (resource.busy) return;
    setIsFormOpen(false);
    setEditingPackage(null);
    setFormError(null);
  };

  const handleSavePackage = async (formData) => {
    setFormError(null);

    const isUpdate = Boolean(editingPackage && editingPackage.packageId);
    const operation = () =>
      isUpdate
        ? packagesApi.update(editingPackage.packageId, formData)
        : packagesApi.create(formData);

    const successMessage = isUpdate
      ? `Package "${formData.name}" updated successfully (Super Admin notified).`
      : `New package "${formData.name}" created successfully (Super Admin notified).`;

    const succeeded = await resource.run(
      operation,
      successMessage,
      () => {
        setIsFormOpen(false);
        setEditingPackage(null);
      }
    );

    if (!succeeded && resource.error) {
      setFormError(resource.error);
    }
  };

  const handleOpenArchive = (pkg) => {
    setArchivingPackage(pkg);
    setArchiveReason('');
    setArchiveError(null);
  };

  const handleCloseArchive = () => {
    if (resource.busy) return;
    setArchivingPackage(null);
    setArchiveReason('');
    setArchiveError(null);
  };

  const handleConfirmArchive = async (e) => {
    e.preventDefault();
    if (!archivingPackage) return;
    if (!archiveReason.trim()) {
      setArchiveError('A mandatory reason is required to archive this package.');
      return;
    }

    const packageId = archivingPackage.packageId;
    const packageName = archivingPackage.name;

    const succeeded = await resource.run(
      () => packagesApi.archive(packageId, archiveReason.trim()),
      `Package "${packageName}" (#${packageId}) archived successfully. Super Admin has been notified, and new bookings are blocked while historical records remain intact.`,
      () => {
        setArchivingPackage(null);
      }
    );

    if (!succeeded && resource.error) {
      setArchiveError(resource.error);
    }
  };

  // ─── Table Columns Definition ──────────────────────────────────────────────
  const columns = [
    {
      label: 'Image',
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
          disabled={resource.busy || resource.loading}
          onClick={handleOpenCreate}
        >
          ➕ Create Package
        </button>
      }
    >
      {resource.data && (
        <>
          {/* Search Bar */}
          <Filters
            query={searchQuery}
            setQuery={setSearchQuery}
          />

          {/* Paginated Packages Table */}
          <AdminTable
            rowKey="packageId"
            rows={filteredPackages}
            columns={columns}
          />
        </>
      )}

      {/* Controlled Create/Edit Package Dialog */}
      <PackageFormDialog
        isOpen={isFormOpen}
        packageData={editingPackage}
        isBusy={resource.busy}
        error={formError || (isFormOpen ? resource.error : null)}
        onClose={handleCloseForm}
        onSubmit={handleSavePackage}
      />

      {/* Controlled Archival Dialog */}
      {archivingPackage && (
        <AdminDialog
          title={`Archive Package "${archivingPackage.name}"?`}
          busy={resource.busy}
          dialogError={archiveError}
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
                disabled={resource.busy}
                onChange={(e) => {
                  setArchiveReason(e.target.value);
                  if (archiveError) setArchiveError(null);
                }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <FormActions
              busy={resource.busy}
              onCancel={handleCloseArchive}
              submitLabel="Confirm Archival"
            />
          </form>
        </AdminDialog>
      )}
    </AdminPage>
  );
}
