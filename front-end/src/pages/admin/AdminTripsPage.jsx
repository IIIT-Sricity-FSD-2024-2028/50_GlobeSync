import React, { useState, useMemo } from 'react';
import {
  tripsApi,
  travelersApi,
  agenciesApi,
  guidesApi,
  packagesApi,
} from '../../services/api';
import { useReduxAdminData } from '../../store/hooks';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  Filters,
  tripStatuses,
  matches,
  money,
  ownerLabel,
} from '../../components/admin/AdminUI';
import TripDetailsModal from '../../components/admin/TripDetailsModal';
import GuideReassignmentModal from '../../components/admin/GuideReassignmentModal';

/**
 * AdminTripsPage
 * Primary route: /admin/trips
 *
 * Platform Operations & Governance:
 * 1. Operational Oversight:
 *    - Admin monitors trips, searches/filters, and inspects full trip details, traveler info,
 *      associated bookings, and itinerary progression without directly owning or mutating traveler agreements.
 * 2. Contractual Integrity & Prohibited Direct Mutations:
 *    - Admin cannot directly modify traveler destination, origin, dates, budget, or force lifecycle statuses.
 *    - Admin cannot delete traveler trips.
 * 3. Consent-Based Guide Reassignment:
 *    - Admin initiates replacement guide proposals with mandatory justification.
 *    - Reassignment requires Traveler Consent followed by Replacement Guide acceptance before execution.
 * 4. Resilient Composite Loader:
 *    - Uses Promise.allSettled to ensure that auxiliary endpoint failures do not crash the primary management portal.
 */

const loadTripsData = async (options) => {
  const [tripsRes, travelersRes, agenciesRes, guidesRes, packagesRes] = await Promise.allSettled([
    tripsApi.getAll(options),
    travelersApi.getAll(options),
    agenciesApi.getAll(options),
    guidesApi.getAll(options),
    packagesApi.getAll(options),
  ]);

  const trips = tripsRes.status === 'fulfilled' && Array.isArray(tripsRes.value) ? tripsRes.value : [];
  const travelers =
    travelersRes.status === 'fulfilled'
      ? Array.isArray(travelersRes.value)
        ? travelersRes.value
        : travelersRes.value?.value || []
      : [];
  const agencies =
    agenciesRes.status === 'fulfilled'
      ? Array.isArray(agenciesRes.value)
        ? agenciesRes.value
        : agenciesRes.value?.value || []
      : [];
  const guides = guidesRes.status === 'fulfilled' && Array.isArray(guidesRes.value) ? guidesRes.value : [];
  const packages = packagesRes.status === 'fulfilled' && Array.isArray(packagesRes.value) ? packagesRes.value : [];

  return { trips, travelers, agencies, guides, packages };
};

export default function AdminTripsPage() {
  const resource = useReduxAdminData('adminTrips');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [inspectingTrip, setInspectingTrip] = useState(null);
  const [reassigningTrip, setReassigningTrip] = useState(null);

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

  // ─── Action Handlers ───────────────────────────────────────────────────────
  const handleOpenInspect = (trip) => {
    setInspectingTrip(trip);
  };

  const handleCloseInspect = () => {
    setInspectingTrip(null);
  };

  const handleOpenReassign = (trip) => {
    setReassigningTrip(trip);
  };

  const handleCloseReassign = () => {
    setReassigningTrip(null);
  };

  const handleSubmitReassignment = (payload) => {
    if (!reassigningTrip) return;
    resource.run(
      'requestReassignment', [reassigningTrip.tripId, payload],
      `Guide reassignment request submitted for trip #${reassigningTrip.tripId}. Consent request dispatched to traveler.`,
      () => {
        setReassigningTrip(null);
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
      render: (t) => {
        const canReassign = !['Cancelled', 'Completed'].includes(t.status);
        return (
          <div className="admin-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenInspect(t)}
              disabled={resource.busy}
              title="Inspect comprehensive trip details, bookings, and assignment history"
            >
              Inspect
            </button>
            {canReassign && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenReassign(t)}
                disabled={resource.busy}
                title="Initiate consent-based guide reassignment request"
              >
                Reassign Guide
              </button>
            )}
          </div>
        );
      },
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

      {/* Comprehensive Trip Inspection Modal */}
      <TripDetailsModal
        isOpen={Boolean(inspectingTrip)}
        trip={inspectingTrip}
        ownerName={inspectingTrip ? resolveOwnerName(inspectingTrip) : 'Unassigned'}
        guideName={inspectingTrip ? resolveGuideName(inspectingTrip) : 'Unassigned'}
        packageName={inspectingTrip ? resolvePackageName(inspectingTrip) : 'Custom trip'}
        onClose={handleCloseInspect}
        onRequestReassign={handleOpenReassign}
      />

      {/* Consent-Based Guide Reassignment Request Modal */}
      <GuideReassignmentModal
        isOpen={Boolean(reassigningTrip)}
        trip={reassigningTrip}
        guides={d?.guides || []}
        busy={resource.busy}
        dialogError={resource.error}
        onClose={handleCloseReassign}
        onSubmit={handleSubmitReassignment}
      />
    </AdminPage>
  );
}
