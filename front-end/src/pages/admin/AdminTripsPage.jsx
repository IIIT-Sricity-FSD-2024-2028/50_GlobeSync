import React, { useState, useMemo } from 'react';
import {
  tripsApi,
  travelersApi,
  agenciesApi,
  guidesApi,
  packagesApi,
} from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  Filters,
  DeleteDialog,
  tripStatuses,
  matches,
  money,
  ownerLabel,
  useAdminData,
} from '../../components/admin/AdminUI';
import TripStatusModal from '../../components/admin/TripStatusModal';
import TripEditModal from '../../components/admin/TripEditModal';

/**
 * AdminTripsPage
 * Primary route: /admin/trips
 *
 * State & Architectural Ownership:
 * 1. AdminTripsPage (Page Coordinator):
 *    - Owns composite data loader (fetching trips, travelers, agencies, guides, packages concurrently).
 *    - Owns search filter queries and status filters.
 *    - Controls selection of the active trip record for inspection, editing, and deletion.
 * 2. TripEditModal (Controlled Form Component):
 *    - Allows full editing of trip destination, travel dates, and budget.
 *    - Handles guide assignment & reassignment, explaining the automatic reset of guideStatus to 'Pending'.
 *    - Preserves customer ownership (travelerId/agencyId) and checks FSM transition rules.
 * 3. TripStatusModal (Quick Status Lifecycle Component):
 *    - Explains lifecycle rules (FSM transitions, commission settlement).
 * 4. DeleteDialog:
 *    - Explains backend safety policy preventing unsafe deletion if active dependencies exist.
 */

// Composite loader fetching all dependent collections in parallel
const loadTripsData = async (options) => {
  const [trips, travelers, agencies, guides, packages] = await Promise.all([
    tripsApi.getAll(options),
    travelersApi.getAll(options),
    agenciesApi.getAll(options),
    guidesApi.getAll(options),
    packagesApi.getAll(options),
  ]);

  return {
    trips: Array.isArray(trips) ? trips : [],
    travelers: Array.isArray(travelers) ? travelers : travelers?.value || [],
    agencies: Array.isArray(agencies) ? agencies : agencies?.value || [],
    guides: Array.isArray(guides) ? guides : [],
    packages: Array.isArray(packages) ? packages : [],
  };
};

export default function AdminTripsPage() {
  const resource = useAdminData(loadTripsData);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected trip for quick status modal
  const [statusTrip, setStatusTrip] = useState(null);

  // Selected trip for full edit & guide assignment modal
  const [editingTrip, setEditingTrip] = useState(null);

  // Selected trip for deletion
  const [deletingTrip, setDeletingTrip] = useState(null);

  // ─── Entity Name Resolvers ─────────────────────────────────────────────────
  const d = resource.data;

  const resolveOwnerName = (row) =>
    ownerLabel(row, d?.travelers || [], d?.agencies || []);

  const resolveGuideName = (row) => {
    if (row.guideId == null) return 'Unassigned';
    const guide = (d?.guides || []).find((g) => g.guideId === row.guideId);
    return guide?.name || `Guide #${row.guideId}`;
  };

  const resolvePackageName = (row) => {
    if (row.packageId == null) return 'Custom trip';
    const pkg = (d?.packages || []).find((p) => p.packageId === row.packageId);
    return pkg?.name || `Package #${row.packageId}`;
  };

  // ─── Memoized Filtered Trips ───────────────────────────────────────────────
  const filteredTrips = useMemo(() => {
    const rawTrips = d?.trips || [];
    return rawTrips.filter((trip) => {
      // 1. Status Filter
      if (statusFilter && trip.status !== statusFilter) {
        return false;
      }

      // 2. Search Query Match
      if (searchQuery.trim()) {
        const owner = resolveOwnerName(trip);
        const guide = resolveGuideName(trip);
        return matches(
          [trip.tripId, trip.destination, owner, guide, trip.guideStatus, trip.budget],
          searchQuery
        );
      }

      return true;
    });
  }, [d?.trips, statusFilter, searchQuery, d?.travelers, d?.agencies, d?.guides]);

  // ─── Modal Handlers ────────────────────────────────────────────────────────

  // Quick Status Modal
  const handleOpenStatusModal = (trip) => {
    setStatusTrip(trip);
  };

  const handleCloseStatusModal = () => {
    setStatusTrip(null);
  };

  const handleUpdateTripStatus = (tripId, nextStatus) => {
    resource.run(
      () => tripsApi.updateStatus(tripId, nextStatus),
      `Trip #${tripId} status updated to '${nextStatus}'.`,
      () => {
        setStatusTrip(null);
      }
    );
  };

  // Full Edit & Guide Assignment Modal
  const handleOpenEditTrip = (trip) => {
    setEditingTrip(trip);
  };

  const handleCloseEditTrip = () => {
    setEditingTrip(null);
  };

  const handleSaveTripDetails = (tripId, payload) => {
    resource.run(
      () => tripsApi.update(tripId, payload),
      `Trip #${tripId} details and guide assignment saved.`,
      () => {
        setEditingTrip(null);
      }
    );
  };

  // Deletion Handlers
  const handleOpenDelete = (trip) => {
    setDeletingTrip(trip);
  };

  const handleCloseDelete = () => {
    setDeletingTrip(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingTrip) return;
    resource.run(
      () => tripsApi.delete(deletingTrip.tripId),
      `Trip #${deletingTrip.tripId} deleted successfully.`,
      () => {
        setDeletingTrip(null);
      }
    );
  };

  // ─── Table Columns Definition ──────────────────────────────────────────────
  const columns = [
    {
      label: 'ID',
      render: (t) => `#${t.tripId}`,
    },
    {
      label: 'Destination',
      key: 'destination',
    },
    {
      label: 'Customer / Owner',
      render: resolveOwnerName,
    },
    {
      label: 'Dates',
      render: (t) => `${t.startDate} → ${t.endDate}`,
    },
    {
      label: 'Budget',
      render: (t) => money(t.budget),
    },
    {
      label: 'Assigned Guide',
      render: resolveGuideName,
    },
    {
      label: 'Guide Status',
      render: (t) =>
        t.guideStatus ? (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor:
                t.guideStatus === 'Accepted'
                  ? '#dcfce7'
                  : t.guideStatus === 'Declined'
                  ? '#fee2e2'
                  : '#fef3c7',
              color:
                t.guideStatus === 'Accepted'
                  ? '#166534'
                  : t.guideStatus === 'Declined'
                  ? '#991b1b'
                  : '#92400e',
            }}
          >
            {t.guideStatus}
          </span>
        ) : (
          <span style={{ color: '#94a3b8' }}>None</span>
        ),
    },
    {
      label: 'Trip Status',
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      label: 'Actions',
      render: (t) => (
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenEditTrip(t)}
            disabled={resource.busy}
            title="Edit trip details and manage guide assignment"
          >
            Edit / Assign
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenStatusModal(t)}
            disabled={resource.busy}
            title="Update lifecycle status"
          >
            Status
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => handleOpenDelete(t)}
            disabled={resource.busy}
            title="Delete trip record"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminPage title="Trips Oversight" resource={resource}>
      {resource.data && (
        <>
          {/* Filters Bar: Search & Status Dropdown */}
          <Filters
            query={searchQuery}
            setQuery={setSearchQuery}
            status={statusFilter}
            setStatus={setStatusFilter}
            statuses={tripStatuses}
          />

          {/* Paginated Trips Table */}
          <AdminTable
            rowKey="tripId"
            rows={filteredTrips}
            columns={columns}
          />
        </>
      )}

      {/* Controlled Trip Detail, Edit, & Guide Assignment Modal */}
      <TripEditModal
        isOpen={Boolean(editingTrip)}
        trip={editingTrip}
        guides={d?.guides || []}
        ownerName={editingTrip ? resolveOwnerName(editingTrip) : 'Unassigned'}
        packageName={editingTrip ? resolvePackageName(editingTrip) : 'Custom trip'}
        isBusy={resource.busy}
        error={resource.error}
        onClose={handleCloseEditTrip}
        onSubmit={handleSaveTripDetails}
      />

      {/* Controlled Trip Status Lifecycle Modal */}
      <TripStatusModal
        isOpen={Boolean(statusTrip)}
        trip={statusTrip}
        ownerName={statusTrip ? resolveOwnerName(statusTrip) : 'Unassigned'}
        guideName={statusTrip ? resolveGuideName(statusTrip) : 'Unassigned'}
        packageName={statusTrip ? resolvePackageName(statusTrip) : 'Custom trip'}
        isBusy={resource.busy}
        error={resource.error}
        onClose={handleCloseStatusModal}
        onSubmit={handleUpdateTripStatus}
      />

      {/* Permanent Deletion Dialog */}
      {deletingTrip && (
        <DeleteDialog
          title={`Delete Trip #${deletingTrip.tripId}: ${deletingTrip.destination}?`}
          warning="This action will permanently delete this trip. If dependent records (such as bookings, itineraries, or payments) exist, the backend policy will reject the deletion to protect historical data."
          busy={resource.busy}
          error={resource.error}
          onClose={handleCloseDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
    </AdminPage>
  );
}
