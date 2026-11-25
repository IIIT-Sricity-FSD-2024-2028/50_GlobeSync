import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { tripsApi, itinerariesApi } from '../../services/api';
import TripList from '../../components/trips/TripList';
import TripFilterBar from '../../components/trips/TripFilterBar';
import ActiveTripHeader from '../../components/trips/ActiveTripHeader';
import TripEditModal from '../../components/trips/TripEditModal';
import TripCancelModal from '../../components/trips/TripCancelModal';
import ItineraryList from '../../components/itineraries/ItineraryList';
import ItineraryForm from '../../components/itineraries/ItineraryForm';
import Toast from '../../components/common/Toast';

/**
 * TravelerTripsPage: Displays and manages all travel itineraries owned by the authenticated traveler.
 * 
 * State Ownership:
 * - trips: Array of trip records fetched via GET /trips/traveler/:travelerId
 * - selectedTrip: Currently focused trip for daily itinerary scheduling (synced with ?tripId=)
 * - itineraries: Daily schedule items for the selected trip (GET /itineraries/trip/:tripId)
 * - editingTrip: Trip object for TripEditModal
 * - editingItinerary / showItineraryForm: Itinerary activity form states
 * - statusFilter / searchQuery: Local filter states applied during render
 */
export default function TravelerTripsPage() {
  const { user, role } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const travelerId = Number(user?.travelerId || user?.traveler_id || user?.id);

  // 1. Primary Trips State
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pending Guide Reassignments Consent Requests
  const [pendingReassignments, setPendingReassignments] = useState([]);
  const [consentBusy, setConsentBusy] = useState(false);

  // 2. Filter State
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 3. Trip Edit & Cancel Modal State
  const [editingTrip, setEditingTrip] = useState(null);
  const [cancellingTrip, setCancellingTrip] = useState(null);
  const [isCancellingTrip, setIsCancellingTrip] = useState(false);
  const [cancelTripError, setCancelTripError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastType(type);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Section reference for smooth scrolling without direct DOM access
  const itinerarySectionRef = useRef(null);

  // 4. Selected Trip for Itinerary Management (Synced with URL)
  const [selectedTrip, setSelectedTrip] = useState(null);

  // 5. Itinerary Data State for Selected Trip
  const [itineraries, setItineraries] = useState([]);
  const [itinerariesLoading, setItinerariesLoading] = useState(false);
  const [itinerariesError, setItinerariesError] = useState(null);

  // 6. Itinerary Form State
  const [showItineraryForm, setShowItineraryForm] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState(null);
  const [itineraryActionMessage, setItineraryActionMessage] = useState(null);

  // Load trips from backend with AbortController cleanup
  const loadTrips = async (signal) => {
    if (!travelerId) {
      setLoading(false);
      setError('No authenticated traveler ID found. Please log in.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [data, reassignmentsData] = await Promise.all([
        tripsApi.getByTraveler(travelerId, { signal }),
        tripsApi.getMyReassignments({ signal }).catch(() => []),
      ]);
      if (signal?.aborted) return;

      const loadedTrips = Array.isArray(data) ? data : [];
      setTrips(loadedTrips);

      const pending = Array.isArray(reassignmentsData)
        ? reassignmentsData.filter(
            (r) => r.status === 'PENDING_CONSENT' && (r.travelerConsent === 'PENDING' || !r.travelerConsent),
          )
        : [];
      setPendingReassignments(pending);

      // Restore selected trip if URL query (?tripId=...) is present
      const urlTripId = searchParams.get('tripId');
      if (urlTripId) {
        const matchingTrip = loadedTrips.find(
          (t) => String(t.tripId || t.id) === String(urlTripId)
        );
        if (matchingTrip) {
          setSelectedTrip(matchingTrip);
        }
      }
    } catch (err) {
      if (!err.isCancelled && !signal?.aborted) {
        console.error('[TravelerTripsPage] Failed to load trips:', err);
        setError(err.message || 'Failed to load traveler trips from backend.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  // Effect: Fetch trips on mount or when authenticated travelerId changes
  useEffect(() => {
    const controller = new AbortController();
    loadTrips(controller.signal);

    return () => {
      controller.abort();
    };
  }, [travelerId]);

  // Effect: Synchronize selectedTrip with URL query parameter (?tripId=...)
  useEffect(() => {
    const urlTripId = searchParams.get('tripId');
    if (!urlTripId) {
      if (selectedTrip) {
        setSelectedTrip(null);
      }
    } else if (trips.length > 0) {
      const matchingTrip = trips.find(
        (t) => String(t.tripId || t.id) === String(urlTripId)
      );
      if (matchingTrip) {
        if (!selectedTrip || String(selectedTrip.tripId || selectedTrip.id) !== String(matchingTrip.tripId || matchingTrip.id)) {
          setSelectedTrip(matchingTrip);
        }
      } else {
        setSelectedTrip(null);
      }
    }
  }, [searchParams, trips]);

  // Effect: Load itinerary activities whenever selectedTrip changes
  useEffect(() => {
    if (!selectedTrip) {
      setItineraries([]);
      setItinerariesError(null);
      setShowItineraryForm(false);
      setEditingItinerary(null);
      return;
    }

    const tripId = Number(selectedTrip.tripId || selectedTrip.id);
    const controller = new AbortController();

    setItinerariesLoading(true);
    setItinerariesError(null);
    setShowItineraryForm(false);
    setEditingItinerary(null);

    itinerariesApi
      .getByTrip(tripId, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setItineraries(Array.isArray(data) ? data : []);
          setItinerariesLoading(false);
        }
      })
      .catch((err) => {
        if (!err.isCancelled && !controller.signal.aborted) {
          console.error('[TravelerTripsPage] Failed to load itineraries:', err);
          setItinerariesError(err.message || 'Failed to load itinerary entries from backend.');
          setItinerariesLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedTrip?.tripId]);

  // Derived filter applied during render (no duplicate state)
  const filteredTrips = trips.filter((t) => {
    const matchesStatus =
      statusFilter === 'ALL' || t.status?.toLowerCase() === statusFilter.toLowerCase();

    const dest = (t.destination || '').toLowerCase();
    const origin = (t.origin || '').toLowerCase();
    const idStr = String(t.tripId || t.id || '');
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || dest.includes(query) || origin.includes(query) || idStr.includes(query);

    return matchesStatus && matchesSearch;
  });

  const hasActiveFilters = statusFilter !== 'ALL' || searchQuery.trim().length > 0;

  // Named Handlers
  const handleRefresh = () => {
    loadTrips();
  };

  const handleClearFilters = () => {
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  const handleSelectTrip = (trip) => {
    if (selectedTrip?.tripId === trip.tripId) {
      handleDeselectTrip();
    } else {
      setSelectedTrip(trip);
      setSearchParams({ tripId: String(trip.tripId || trip.id) });

      setTimeout(() => {
        itinerarySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleDeselectTrip = () => {
    setSelectedTrip(null);
    setSearchParams({});
    setShowItineraryForm(false);
    setEditingItinerary(null);
  };

  const handleTripUpdated = (updatedTrip) => {
    setTrips((prevTrips) =>
      prevTrips.map((t) => (t.tripId === updatedTrip.tripId ? updatedTrip : t))
    );

    if (selectedTrip?.tripId === updatedTrip.tripId) {
      setSelectedTrip(updatedTrip);
    }

    setEditingTrip(null);
    setActionMessage(`Trip #${updatedTrip.tripId} (${updatedTrip.destination}) updated successfully!`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleTravelerConsent = async (requestId, consent, reason) => {
    setConsentBusy(true);
    try {
      await tripsApi.respondTravelerConsent(requestId, {
        decision: consent ? 'ACCEPT' : 'REJECT',
        reason,
      });
      showToast(consent ? 'Guide reassignment accepted. Waiting for replacement guide confirmation.' : 'Guide reassignment declined. Original guide preserved.');
      setPendingReassignments((prev) => prev.filter((r) => r.id !== requestId));
      loadTrips();
    } catch (err) {
      showToast(err.message || 'Failed to submit consent.', 'error');
    } finally {
      setConsentBusy(false);
    }
  };

  const handleCancelTrip = (trip) => {
    setCancellingTrip(trip);
    setCancelTripError(null);
  };

  const handleConfirmCancelTrip = async (trip, cancellationReason) => {
    setIsCancellingTrip(true);
    setCancelTripError(null);

    try {
      await tripsApi.updateStatus(trip.tripId, {
        status: 'Cancelled',
        cancellationReason,
      });

      setTrips((prevTrips) =>
        prevTrips.map((t) =>
          t.tripId === trip.tripId
            ? { ...t, status: 'Cancelled', cancellationReason }
            : t
        )
      );

      if (selectedTrip?.tripId === trip.tripId) {
        setSelectedTrip((prev) =>
          prev ? { ...prev, status: 'Cancelled', cancellationReason } : null
        );
        setShowItineraryForm(false);
        setEditingItinerary(null);
      }

      setCancellingTrip(null);
      showToast(`Trip #${trip.tripId} has been cancelled.`);
    } catch (err) {
      console.error('[TravelerTripsPage] Failed to cancel trip:', err);
      setCancelTripError(err.message || 'Failed to cancel trip.');
    } finally {
      setIsCancellingTrip(false);
    }
  };

  const handleItinerarySaved = (savedItem, isEdit) => {
    if (isEdit) {
      setItineraries((prev) =>
        prev.map((item) => (item.itineraryId === savedItem.itineraryId ? savedItem : item))
      );
      setEditingItinerary(null);
      setItineraryActionMessage(
        `Activity #${savedItem.itineraryId} ("${savedItem.activity}") updated successfully!`
      );
    } else {
      setItineraries((prev) => [...prev, savedItem]);
      setShowItineraryForm(false);
      setItineraryActionMessage(
        `New activity ("${savedItem.activity}") added to Day ${savedItem.dayNumber}!`
      );
    }

    setTimeout(() => setItineraryActionMessage(null), 4000);
  };

  const handleDeleteItinerary = async (item) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this activity: "${item.activity}" (ID #${item.itineraryId})?`
    );
    if (!confirmDelete) return;

    try {
      await itinerariesApi.delete(item.itineraryId);
      setItineraries((prev) => prev.filter((i) => i.itineraryId !== item.itineraryId));
      setItineraryActionMessage(`Activity #${item.itineraryId} deleted successfully.`);
      setTimeout(() => setItineraryActionMessage(null), 4000);
    } catch (err) {
      console.error('[TravelerTripsPage] Failed to delete itinerary:', err);
      showToast(
        `Action Restricted: ${err.message} (RolesGuard restricts itinerary deletion to Admins)`,
        'error'
      );
    }
  };

  const reloadSelectedTripItineraries = () => {
    if (!selectedTrip) return;
    const tripId = Number(selectedTrip.tripId || selectedTrip.id);
    setItinerariesLoading(true);
    setItinerariesError(null);
    itinerariesApi
      .getByTrip(tripId)
      .then((data) => {
        setItineraries(Array.isArray(data) ? data : []);
        setItinerariesLoading(false);
      })
      .catch((err) => {
        setItinerariesError(err.message || 'Failed to reload itinerary.');
        setItinerariesLoading(false);
      });
  };

  return (
    <div className="traveler-trips-page">
      {/* Page Header */}
      <div className="traveler-page-header">
        <div>
          <h2 className="traveler-page-header-title">My Travel Itineraries 📍</h2>
          <p className="traveler-page-header-subtitle">
            Manage your scheduled itineraries, update journey details, or coordinate daily schedules.
          </p>
        </div>

        <div className="traveler-page-header-actions">
          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-secondary"
            title="Refresh trips from backend"
          >
            ↻ Refresh
          </button>
          <Link
            to="/traveler/plan"
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            + Plan New Trip 🗺
          </Link>
        </div>
      </div>

      {/* Temporary Action Feedback Banner */}
      {actionMessage && (
        <div className="feedback-banner success">
          <span>✓ {actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="feedback-banner-close"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pending Guide Reassignment Consent Banners (Category D Governance) */}
      {pendingReassignments.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {pendingReassignments.map((req) => {
            const isHighlighted = String(searchParams.get('reassignmentId') || '') === String(req.id);
            const priceDiff = Number(req.priceDifference || 0);
            return (
              <div
                key={req.id}
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: isHighlighted ? '#fef3c7' : '#fffbeb',
                  border: `1.5px solid ${isHighlighted ? '#d97706' : '#fef3c7'}`,
                  borderLeft: '5px solid #f59e0b',
                  marginBottom: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#92400e', fontSize: '15px' }}>
                    ⚠️ Guide Replacement Consent Requested for Trip #{req.tripId}
                    {req.tripDestination ? ` (${req.tripDestination})` : ''}
                  </span>
                  <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
                    Requested {new Date(req.createdAt).toLocaleDateString()}
                    {req.expiresAt ? ` • Respond by ${new Date(req.expiresAt).toLocaleString()}` : ''}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#78350f', lineHeight: 1.5 }}>
                  <div>
                    Administration proposed replacing{' '}
                    <strong>{req.currentGuideName || `Guide #${req.currentGuideId || 'None'}`}</strong>{' '}
                    with{' '}
                    <strong>{req.proposedGuideName || `Guide #${req.proposedGuideId}`}</strong>
                    {req.proposedGuideExperienceYears != null ? ` (${req.proposedGuideExperienceYears} yrs exp` : ''}
                    {req.proposedGuideRating != null ? `, ★ ${req.proposedGuideRating})` : req.proposedGuideExperienceYears != null ? ')' : ''}.
                  </div>
                  {req.tripStartDate && req.tripEndDate && (
                    <div style={{ fontSize: '13px', marginTop: '2px' }}>
                      <strong>Trip Dates:</strong> {req.tripStartDate} → {req.tripEndDate}
                    </div>
                  )}
                  <div style={{ fontSize: '13px', marginTop: '2px' }}>
                    <strong>Reason:</strong> "{req.reason}"
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '2px' }}>
                    <strong>Rate Impact:</strong>{' '}
                    {priceDiff === 0
                      ? 'No additional guide fee (same daily rate).'
                      : priceDiff > 0
                        ? `Proposed guide daily rate is ₹${priceDiff.toLocaleString('en-IN')}/day higher (₹${Number(req.proposedGuideDailyRate || 0).toLocaleString('en-IN')}/day). Explicit traveler consent required.`
                        : `Proposed guide daily rate is ₹${Math.abs(priceDiff).toLocaleString('en-IN')}/day lower (₹${Number(req.proposedGuideDailyRate || 0).toLocaleString('en-IN')}/day).`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={consentBusy}
                    onClick={() => handleTravelerConsent(req.id, true, 'Traveler consented via portal')}
                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                  >
                    ✓ Accept New Guide
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={consentBusy}
                    onClick={() => handleTravelerConsent(req.id, false, 'Traveler declined replacement guide')}
                    style={{ color: '#dc2626' }}
                  >
                    ✕ Decline Replacement
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search & Status Filter Controls */}
      <TripFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Loading State */}
      {loading && (
        <div className="state-box">
          <div className="state-box-icon">📍</div>
          <h3 className="state-box-title">Loading your travel itineraries...</h3>
          <p className="state-box-text">Fetching trips from the backend...</p>
        </div>
      )}

      {/* Loading Error State */}
      {!loading && error && (
        <div
          className="card"
          style={{
            padding: '28px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '16px',
            textAlign: 'center',
            color: '#991b1b',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
          <h4 style={{ fontSize: '17px', fontWeight: 800 }}>Failed to load itineraries</h4>
          <p style={{ fontSize: '14px', margin: '8px 0 16px' }}>{error}</p>
          <button type="button" onClick={() => loadTrips()} className="btn btn-primary">
            Retry Connection ↺
          </button>
        </div>
      )}

      {/* Trips List */}
      {!loading && !error && (
        <TripList
          trips={filteredTrips}
          onEditTrip={(trip) => setEditingTrip(trip)}
          onCancelTrip={handleCancelTrip}
          selectedTripId={selectedTrip?.tripId || selectedTrip?.id}
          onSelectTrip={handleSelectTrip}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* ========================================================== */}
      {/* Daily Itinerary Management Section (when trip is selected) */}
      {/* ========================================================== */}
      {selectedTrip && (
        <div
          id="itinerary-manager-section"
          ref={itinerarySectionRef}
          style={{
            marginTop: '36px',
            paddingTop: '24px',
            borderTop: '2px dashed var(--border)',
          }}
        >
          {/* Active Trip Header Banner */}
          <ActiveTripHeader
            selectedTrip={selectedTrip}
            onOpenAddActivity={() => {
              setShowItineraryForm(true);
              setEditingItinerary(null);
            }}
            onClose={handleDeselectTrip}
          />

          {/* Action Notification Banner for Itinerary */}
          {itineraryActionMessage && (
            <div className="feedback-banner success">
              <span>✓ {itineraryActionMessage}</span>
              <button
                type="button"
                onClick={() => setItineraryActionMessage(null)}
                className="feedback-banner-close"
              >
                ✕
              </button>
            </div>
          )}

          {/* Controlled Add/Edit Itinerary Form */}
          {(showItineraryForm || editingItinerary) && (
            <ItineraryForm
              key={editingItinerary ? `edit-${editingItinerary.itineraryId || editingItinerary.id}` : `new-${selectedTrip?.tripId || selectedTrip?.id}`}
              selectedTrip={selectedTrip}
              editingItem={editingItinerary}
              onSave={handleItinerarySaved}
              onCancel={() => {
                setShowItineraryForm(false);
                setEditingItinerary(null);
              }}
            />
          )}

          {/* Itinerary Activities List */}
          <ItineraryList
            itineraries={itineraries}
            selectedTrip={selectedTrip}
            onEditItem={(item) => {
              setEditingItinerary(item);
              setShowItineraryForm(false);
              itinerarySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            onDeleteItem={handleDeleteItinerary}
            onOpenAddForm={() => {
              setShowItineraryForm(true);
              setEditingItinerary(null);
            }}
            loading={itinerariesLoading}
            error={itinerariesError}
            onRetry={reloadSelectedTripItineraries}
            userRole={role}
          />
        </div>
      )}

      {/* Controlled Trip Edit Modal */}
      {editingTrip && (
        <TripEditModal
          key={`trip-${editingTrip.tripId || editingTrip.id}`}
          isOpen={Boolean(editingTrip)}
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onSave={handleTripUpdated}
        />
      )}

      {/* Controlled Trip Cancellation Modal with Reason */}
      {cancellingTrip && (
        <TripCancelModal
          isOpen={Boolean(cancellingTrip)}
          trip={cancellingTrip}
          onClose={() => {
            setCancellingTrip(null);
            setCancelTripError(null);
          }}
          onConfirm={handleConfirmCancelTrip}
          isCancelling={isCancellingTrip}
          error={cancelTripError}
        />
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage('')}
      />
    </div>
  );
}
