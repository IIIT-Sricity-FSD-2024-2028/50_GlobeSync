import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAdminTrips,
  requestAdminGuideReassignment,
} from '../../store/admin-trips/admin-trips-actions';
import { adminTripsActions } from '../../store/admin-trips/admin-trips-slice';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  Filters,
  tripStatuses,
  money,
  ownerLabel,
} from '../../components/admin/AdminUI';
import TripDetailsModal from '../../components/admin/TripDetailsModal';
import GuideReassignmentModal from '../../components/admin/GuideReassignmentModal';

export default function AdminTripsPage() {
  const dispatch = useDispatch();

  const trips = useSelector((state) => state.adminTrips.trips);
  const relatedTravelers = useSelector((state) => state.adminTrips.relatedTravelers);
  const relatedAgencies = useSelector((state) => state.adminTrips.relatedAgencies);
  const relatedGuides = useSelector((state) => state.adminTrips.relatedGuides);
  const relatedPackages = useSelector((state) => state.adminTrips.relatedPackages);
  const selectedTripId = useSelector((state) => state.adminTrips.selectedTripId);
  const reassigningTripId = useSelector((state) => state.adminTrips.reassigningTripId);
  const search = useSelector((state) => state.adminTrips.search);
  const statusFilter = useSelector((state) => state.adminTrips.statusFilter);
  const loading = useSelector((state) => state.adminTrips.loading);
  const error = useSelector((state) => state.adminTrips.error);

  useEffect(() => {
    dispatch(fetchAdminTrips());
  }, [dispatch]);

  const inspectingTrip = useMemo(() => {
    if (!selectedTripId) return null;
    return trips.find((t) => t.tripId === selectedTripId) || null;
  }, [trips, selectedTripId]);

  const reassigningTrip = useMemo(() => {
    if (!reassigningTripId) return null;
    return trips.find((t) => t.tripId === reassigningTripId) || null;
  }, [trips, reassigningTripId]);

  // Resolvers
  const resolveOwnerName = (row) =>
    ownerLabel(row, relatedTravelers || [], relatedAgencies || []);

  const resolveGuideName = (row) => {
    if (row.guideId == null) return 'Unassigned';
    const guide = (relatedGuides || []).find((g) => g.guideId === row.guideId);
    return guide?.name || `Guide #${row.guideId}`;
  };

  const resolvePackageName = (row) => {
    if (row.packageId == null) return 'Custom trip';
    const pkg = (relatedPackages || []).find((p) => p.packageId === row.packageId);
    return pkg?.name || `Package #${row.packageId}`;
  };

  const filteredTrips = useMemo(() => {
    const list = Array.isArray(trips) ? trips : [];
    return list.filter((trip) => {
      if (statusFilter && trip.status !== statusFilter) return false;
      if (search.trim()) {
        const owner = resolveOwnerName(trip);
        const guide = resolveGuideName(trip);
        const q = search.toLowerCase();
        return (
          String(trip.tripId ?? '').toLowerCase().includes(q) ||
          (trip.destination ?? '').toLowerCase().includes(q) ||
          owner.toLowerCase().includes(q) ||
          guide.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [trips, search, statusFilter, relatedTravelers, relatedAgencies, relatedGuides]);

  const handleSubmitReassignment = async (payload) => {
    if (!reassigningTrip) return;
    try {
      await dispatch(requestAdminGuideReassignment(reassigningTrip.tripId, payload));
    } catch {
      // Handled in state
    }
  };

  const resource = {
    loading,
    busy: loading,
    load: () => dispatch(fetchAdminTrips()),
    error,
    data: trips,
  };

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
              onClick={() => dispatch(adminTripsActions.setSelectedTripId(t.tripId))}
              disabled={loading}
              title="Inspect comprehensive trip details, bookings, and assignment history"
            >
              Inspect
            </button>
            {canReassign && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => dispatch(adminTripsActions.setReassigningTripId(t.tripId))}
                disabled={loading}
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
      {trips && (
        <>
          <Filters
            query={search}
            setQuery={(val) => dispatch(adminTripsActions.setSearch(val))}
            status={statusFilter}
            setStatus={(val) => dispatch(adminTripsActions.setStatusFilter(val))}
            statuses={tripStatuses}
          />
          <AdminTable
            rowKey="tripId"
            rows={filteredTrips}
            columns={columns}
          />
        </>
      )}

      <TripDetailsModal
        isOpen={Boolean(inspectingTrip)}
        trip={inspectingTrip}
        ownerName={inspectingTrip ? resolveOwnerName(inspectingTrip) : 'Unassigned'}
        guideName={inspectingTrip ? resolveGuideName(inspectingTrip) : 'Unassigned'}
        packageName={inspectingTrip ? resolvePackageName(inspectingTrip) : 'Custom trip'}
        onClose={() => dispatch(adminTripsActions.clearSelectedTrip())}
        onRequestReassign={(t) => dispatch(adminTripsActions.setReassigningTripId(t.tripId))}
      />

      <GuideReassignmentModal
        isOpen={Boolean(reassigningTrip)}
        trip={reassigningTrip}
        guides={relatedGuides || []}
        busy={loading}
        dialogError={error}
        onClose={() => dispatch(adminTripsActions.clearReassigningTrip())}
        onSubmit={handleSubmitReassignment}
      />
    </AdminPage>
  );
}
