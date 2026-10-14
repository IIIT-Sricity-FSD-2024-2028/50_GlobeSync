import React, { useState, useMemo } from 'react';
import { packagesApi } from '../../services/api';
import { resolvePackageImage } from '../../components/packages/PackageCard';
import {
  AdminPage,
  AdminTable,
  Filters,
  DeleteDialog,
  matches,
  money,
  useAdminData,
} from '../../components/admin/AdminUI';
import PackageFormDialog from '../../components/admin/PackageFormDialog';

/**
 * AdminPackagesPage
 * Primary route: /admin/packages
 *
 * State & Architectural Ownership:
 * 1. AdminPackagesPage (Page Coordinator):
 *    - Owns list-level data (`resource` via useAdminData), search query, and modal open/close states.
 *    - Owns API communication coordination (create, update, delete).
 *    - Controls modal lifecycle: opening, closing, passing active entity.
 * 2. PackageFormDialog (Child Form Component):
 *    - Owns draft input values, touched state, and business-domain field validation rules.
 *    - Communicates upwards via `onSubmit(payload)` and `onClose()`.
 *    - Renders validation messages directly below affected inputs and API errors inside the dialog.
 */
export default function AdminPackagesPage() {
  // Remote resource hook managing packages list, loading flag, busy state, and notices
  const resource = useAdminData(packagesApi.getAll);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null); // null = creating, object = editing
  const [formError, setFormError] = useState(null);

  // Delete modal state
  const [deletingPackage, setDeletingPackage] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // ─── Filtered Packages List ────────────────────────────────────────────────

  const filteredPackages = useMemo(() => {
    const rawList = Array.isArray(resource.data) ? resource.data : [];
    if (!searchQuery.trim()) return rawList;

    return rawList.filter((pkg) =>
      matches([pkg.packageId, pkg.name, pkg.destinations, pkg.highlights], searchQuery)
    );
  }, [resource.data, searchQuery]);

  // ─── Action Handlers ───────────────────────────────────────────────────────

  // Open modal in "Create" mode
  const handleOpenCreate = () => {
    setEditingPackage(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open modal in "Edit" mode with pre-populated package
  const handleOpenEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Close form modal and clear dialog error
  const handleCloseForm = () => {
    if (resource.busy) return;
    setIsFormOpen(false);
    setEditingPackage(null);
    setFormError(null);
  };

  /**
   * Save Package (Create or Update)
   * Dispatches API request through resource.run() to ensure proper loading
   * and mutation-vs-refresh error tracking.
   */
  const handleSavePackage = async (formData) => {
    setFormError(null);

    const isUpdate = Boolean(editingPackage && editingPackage.packageId);
    const operation = () =>
      isUpdate
        ? packagesApi.update(editingPackage.packageId, formData)
        : packagesApi.create(formData);

    const successMessage = isUpdate
      ? `Package "${formData.name}" updated successfully.`
      : `New package "${formData.name}" created successfully.`;

    const succeeded = await resource.run(
      operation,
      successMessage,
      () => {
        setIsFormOpen(false);
        setEditingPackage(null);
      }
    );

    // If mutation failed, capture error in dialog state so it displays inside the active modal
    if (!succeeded && resource.error) {
      setFormError(resource.error);
    }
  };

  // Open Delete confirmation dialog
  const handleOpenDelete = (pkg) => {
    setDeletingPackage(pkg);
    setDeleteError(null);
  };

  // Close Delete dialog
  const handleCloseDelete = () => {
    if (resource.busy) return;
    setDeletingPackage(null);
    setDeleteError(null);
  };

  /**
   * Confirm Delete
   * Calls DELETE /packages/:id. Note: Backend enforces referential integrity
   * and blocks deletion if trips or bookings reference this package.
   */
  const handleConfirmDelete = async () => {
    if (!deletingPackage) return;
    setDeleteError(null);

    const packageId = deletingPackage.packageId;
    const packageName = deletingPackage.name;

    const succeeded = await resource.run(
      () => packagesApi.delete(packageId),
      `Package "${packageName}" (#${packageId}) deleted successfully.`,
      () => {
        setDeletingPackage(null);
      }
    );

    if (!succeeded && resource.error) {
      setDeleteError(resource.error);
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
      label: 'Actions',
      render: (pkg) => (
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenEdit(pkg)}
            title="Edit package details"
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => handleOpenDelete(pkg)}
            title="Delete package"
          >
            Delete
          </button>
        </div>
      ),
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

      {/* Permanent Delete Confirmation Dialog */}
      {deletingPackage && (
        <DeleteDialog
          title={`Delete Package "${deletingPackage.name}"?`}
          warning="This action permanently removes the package from the shared catalog. If any trips or bookings currently reference this package, the system will block deletion to protect referential integrity."
          busy={resource.busy}
          error={deleteError || (deletingPackage ? resource.error : null)}
          onClose={handleCloseDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
    </AdminPage>
  );
}
