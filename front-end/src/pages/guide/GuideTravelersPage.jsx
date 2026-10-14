import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { tripsApi, travelersApi, agenciesApi, bookingsApi, itinerariesApi, messagesApi } from '../../services/api';
import GuideTravelerRoster from '../../components/guide/GuideTravelerRoster';
import GuideTravelerProfile from '../../components/guide/GuideTravelerProfile';
import GuideActivityModal from '../../components/guide/GuideActivityModal';
import GuideSuggestItineraryModal from '../../components/guide/GuideSuggestItineraryModal';
import { getAgencyDisplayName, getTravelerDisplayName } from '../../components/guide/guideStateHelpers';
import './guide.css';

/**
 * GuideTravelersPage
 * Route: /guide/travelers
 * 
 * Features:
 * - Derives visible roster from trips assigned to current guide
 * - Handles travelers with multiple trips without dropping any
 * - Clearly distinguishes agency contacts from individual travelers
 * - Handles missing related records gracefully with safe fallbacks and warnings
 * - Uses permitted scoped GET /bookings/guide/:guideId without forbidden global GET /bookings calls
 * - Loads and manages daily itineraries for selected trip with controlled forms
 * - Resets form states when changing trip or activity
 * - Preserves backend deletion restrictions
 * - Distinguishes itinerary suggestions (messages) from saved itinerary modifications
 * - Supports starting tour (Confirmed -> Active) and completing tour (Active -> Completed)
 */
export default function GuideTravelersPage() {
  const { user } = useSession();
  const guideId = user?.guideId ?? user?.id;

  // Primary data state
  const [contacts, setContacts] = useState([]);
  const [scopedBookings, setScopedBookings] = useState([]);
  const [selectedContactKey, setSelectedContactKey] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);

  // Itinerary state for active trip
  const [itineraries, setItineraries] = useState([]);
  const [isLoadingItineraries, setIsLoadingItineraries] = useState(false);

  // UI / Async action states
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [secondaryWarnings, setSecondaryWarnings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'warning' | 'error', text: string }
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingActivity, setIsUpdatingActivity] = useState(false);

  // Modal states
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityModalMode, setActivityModalMode] = useState('create'); // 'create' | 'edit'
  const [editingActivity, setEditingActivity] = useState(null);
  const [isActivitySubmitting, setIsActivitySubmitting] = useState(false);

  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [isSuggestSubmitting, setIsSuggestSubmitting] = useState(false);

  // 1. Fetch Guide Trips, Travelers, Agencies, and Scoped Bookings
  const fetchPageData = async (signal) => {
    if (!guideId) {
      setIsLoadingPage(false);
      setPageError('No active guide ID found in current session.');
      return;
    }

    setIsLoadingPage(true);
    setPageError(null);
    setSecondaryWarnings([]);

    try {
      const warnings = [];

      const [tripsData, travelersData, agenciesData, bookingsData] = await Promise.all([
        tripsApi.getByGuide(guideId, { signal }),
        travelersApi.getAll({ signal }).catch((err) => {
          if (err.isCancelled || signal?.aborted) throw err;
          console.warn('[GuideTravelersPage] Could not fetch travelers:', err);
          warnings.push('Traveler directory could not be reached; traveler client names are displayed with fallback IDs.');
          return [];
        }),
        agenciesApi.getLookup({ signal }).catch((err) => {
          if (err.isCancelled || signal?.aborted) throw err;
          console.warn('[GuideTravelersPage] Could not fetch agencies:', err);
          warnings.push('Agency directory could not be reached; partner agency business names are displayed with fallback IDs.');
          return [];
        }),
        bookingsApi.getByGuide(guideId, { signal }).catch((err) => {
          if (err.isCancelled || signal?.aborted) throw err;
          console.warn('[GuideTravelersPage] Could not fetch scoped bookings:', err);
          warnings.push('Scoped booking accommodations could not be retrieved.');
          return [];
        }),
      ]);

      setSecondaryWarnings(warnings);

      const rawTrips = Array.isArray(tripsData) ? tripsData : [];
      const travelersList = Array.isArray(travelersData) ? travelersData : (travelersData?.value || []);
      const agenciesList = Array.isArray(agenciesData) ? agenciesData : (agenciesData?.value || []);
      const bookingsList = Array.isArray(bookingsData) ? bookingsData : [];

      setScopedBookings(bookingsList);

      // Build lookup maps
      const travelerMap = new Map();
      travelersList.forEach((t) => {
        const id = t.travelerId ?? t.id;
        if (id) travelerMap.set(Number(id), t);
      });

      const agencyMap = new Map();
      agenciesList.forEach((a) => {
        const id = a.agencyId ?? a.id;
        if (id) agencyMap.set(Number(id), a);
      });

      // Group trips by Contact (Traveler or Agency)
      // This guarantees travelers with MULTIPLE trips are preserved together without losing any
      const contactsMap = new Map();

      rawTrips.forEach((trip) => {
        if (trip.agencyId) {
          const key = `agy-${trip.agencyId}`;
          if (!contactsMap.has(key)) {
            const agency = agencyMap.get(Number(trip.agencyId));
            contactsMap.set(key, {
              key,
              type: 'agency',
              contactId: Number(trip.agencyId),
              name: getAgencyDisplayName(agency, trip.agencyId),
              email: agency?.email || agency?.contactEmail || 'N/A',
              phone: agency?.phone || agency?.contactPhone || 'N/A',
              trips: [],
            });
          }
          contactsMap.get(key).trips.push(trip);
        } else if (trip.travelerId) {
          const key = `trv-${trip.travelerId}`;
          if (!contactsMap.has(key)) {
            const traveler = travelerMap.get(Number(trip.travelerId));
            contactsMap.set(key, {
              key,
              type: 'traveler',
              contactId: Number(trip.travelerId),
              name: getTravelerDisplayName(traveler, trip.travelerId),
              email: traveler?.email || 'N/A',
              phone: traveler?.phone || 'N/A',
              gender: traveler?.gender,
              age: traveler?.age,
              trips: [],
            });
          }
          contactsMap.get(key).trips.push(trip);
        } else {
          // Graceful fallback for trips with missing contact records
          const key = `trip-${trip.tripId}`;
          if (!contactsMap.has(key)) {
            contactsMap.set(key, {
              key,
              type: 'traveler',
              contactId: 0,
              name: `Client for ${trip.destination}`,
              email: 'N/A',
              phone: 'N/A',
              trips: [],
            });
          }
          contactsMap.get(key).trips.push(trip);
        }
      });

      const derivedContacts = Array.from(contactsMap.values());
      setContacts(derivedContacts);

      // Auto-select contact & trip if none selected or previous selection no longer exists
      if (derivedContacts.length > 0) {
        setSelectedContactKey((prev) => {
          if (prev && derivedContacts.some((c) => c.key === prev)) return prev;
          return derivedContacts[0].key;
        });
      }
    } catch (err) {
      if (err.isCancelled) return;
      console.error('[GuideTravelersPage] Failed to fetch data:', err);
      setPageError(err.message || 'Failed to load assigned travelers.');
    } finally {
      setIsLoadingPage(false);
    }
  };

  // Mount effect
  useEffect(() => {
    const controller = new AbortController();
    fetchPageData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [guideId]);

  // Active contact lookup
  const currentContact = contacts.find((c) => c.key === selectedContactKey) || contacts[0] || null;

  // Sync selected trip when contact changes or when selectedTripId is unset
  useEffect(() => {
    if (currentContact && currentContact.trips.length > 0) {
      const tripExists = currentContact.trips.some((t) => t.tripId === selectedTripId);
      if (!tripExists) {
        setSelectedTripId(currentContact.trips[0].tripId);
      }
    } else {
      setSelectedTripId(null);
    }

    // Reset modals whenever contact changes
    setActivityModalOpen(false);
    setEditingActivity(null);
    setSuggestModalOpen(false);
  }, [selectedContactKey, currentContact]);

  // Active trip lookup
  const currentTrip = currentContact?.trips.find((t) => t.tripId === selectedTripId) || currentContact?.trips[0] || null;

  // 2. Fetch Itineraries for Selected Trip
  useEffect(() => {
    if (!currentTrip?.tripId) {
      setItineraries([]);
      return;
    }

    const controller = new AbortController();
    setIsLoadingItineraries(true);

    itinerariesApi
      .getByTrip(currentTrip.tripId, { signal: controller.signal })
      .then((data) => {
        setItineraries(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err.isCancelled) return;
        console.warn(`[GuideTravelersPage] Could not load itineraries for trip ${currentTrip.tripId}:`, err);
        setItineraries([]);
      })
      .finally(() => {
        setIsLoadingItineraries(false);
      });

    return () => {
      controller.abort();
    };
  }, [currentTrip?.tripId]);

  // Trip Selection Handler
  const handleSelectTrip = (trip) => {
    setSelectedTripId(trip.tripId);
    // Reset forms and modals when switching trip
    setActivityModalOpen(false);
    setEditingActivity(null);
    setSuggestModalOpen(false);
  };

  // Contact Selection Handler
  const handleSelectContact = (contactKey) => {
    setSelectedContactKey(contactKey);
    // Reset forms and modals when switching contact
    setActivityModalOpen(false);
    setEditingActivity(null);
    setSuggestModalOpen(false);
  };

  // Start Tour (Confirmed -> Active)
  const handleStartTrip = async (tripId) => {
    setIsUpdatingStatus(true);
    setFeedback(null);
    try {
      await tripsApi.updateStatus(tripId, 'Active');
      // Update state locally
      setContacts((prev) =>
        prev.map((c) => ({
          ...c,
          trips: c.trips.map((t) => (t.tripId === tripId ? { ...t, status: 'Active' } : t)),
        }))
      );
      setFeedback({
        type: 'success',
        text: `Trip #${tripId} has officially started! Status updated to Active.`,
      });
    } catch (err) {
      console.error('[GuideTravelersPage] Failed to start trip:', err);
      setFeedback({
        type: 'error',
        text: err.message || `Failed to start Trip #${tripId}.`,
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Complete Tour (Active -> Completed)
  const handleCompleteTrip = async (tripId) => {
    const confirm = window.confirm(
      `Are you sure you want to mark Trip #${tripId} as Completed?\n\nThis will finalize the tour and archive it into your Completed Trips history.`
    );
    if (!confirm) return;

    setIsUpdatingStatus(true);
    setFeedback(null);
    try {
      await tripsApi.updateStatus(tripId, 'Completed');
      // Update state locally
      setContacts((prev) =>
        prev.map((c) => ({
          ...c,
          trips: c.trips.map((t) => (t.tripId === tripId ? { ...t, status: 'Completed' } : t)),
        }))
      );
      setFeedback({
        type: 'success',
        text: `Trip #${tripId} marked as Completed! Tour has been recorded in your history.`,
      });
    } catch (err) {
      console.error('[GuideTravelersPage] Failed to complete trip:', err);
      setFeedback({
        type: 'error',
        text: err.message || `Failed to mark Trip #${tripId} as completed.`,
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Open Add Activity Modal
  const handleOpenAddActivity = () => {
    setActivityModalMode('create');
    setEditingActivity(null);
    setActivityModalOpen(true);
  };

  // Open Edit Activity Modal
  const handleOpenEditActivity = (activity) => {
    setActivityModalMode('edit');
    setEditingActivity(activity);
    setActivityModalOpen(true);
  };

  // Save Activity (Create or Edit)
  const handleSaveActivity = async (payload) => {
    setIsActivitySubmitting(true);
    try {
      if (activityModalMode === 'edit' && editingActivity) {
        const updated = await itinerariesApi.update(editingActivity.itineraryId, payload);
        setItineraries((prev) =>
          prev.map((i) => (i.itineraryId === editingActivity.itineraryId ? updated : i))
        );
        setFeedback({
          type: 'success',
          text: `Itinerary activity "${updated.activity}" updated successfully.`,
        });
      } else {
        const created = await itinerariesApi.create(payload);
        setItineraries((prev) => [...prev, created]);
        setFeedback({
          type: 'success',
          text: `New activity "${created.activity}" added to Day ${created.dayNumber}.`,
        });
      }
      setActivityModalOpen(false);
      setEditingActivity(null);
    } catch (err) {
      console.error('[GuideTravelersPage] Failed to save activity:', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to save itinerary activity.',
      });
    } finally {
      setIsActivitySubmitting(false);
    }
  };

  // Update Activity Status Progression (Pending -> Confirmed -> Completed)
  const handleUpdateActivityStatus = async (activityId, nextStatus) => {
    setIsUpdatingActivity(true);
    try {
      const updated = await itinerariesApi.update(activityId, { activityStatus: nextStatus });
      setItineraries((prev) =>
        prev.map((i) => (i.itineraryId === activityId ? { ...i, activityStatus: nextStatus } : i))
      );
      setFeedback({
        type: 'success',
        text: `Activity marked as ${nextStatus}.`,
      });
    } catch (err) {
      console.error('[GuideTravelersPage] Failed to update activity status:', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to update activity status.',
      });
    } finally {
      setIsUpdatingActivity(false);
    }
  };

  // Send Itinerary Suggestion as Message
  const handleSendSuggestion = async (suggestionData) => {
    if (!currentTrip || !currentContact) return;
    setIsSuggestSubmitting(true);

    const receiverType = currentContact.type === 'agency' ? 'agency' : 'traveler';
    const receiverId = currentContact.contactId;

    const messageContent = `[Itinerary Proposal for ${currentTrip.destination} - Trip #${currentTrip.tripId}]\nDay: ${suggestionData.dayNumber} (${suggestionData.time || 'Flexible'})\nCategory: ${suggestionData.activityType}\nDetails: ${suggestionData.notes}\nEstimated Cost: ₹${suggestionData.estimatedCost.toLocaleString('en-IN')}`;

    try {
      await messagesApi.create({
        sender: 'guide',
        senderId: Number(guideId),
        receiver: receiverType,
        receiverId: Number(receiverId),
        content: messageContent,
      });

      setSuggestModalOpen(false);
      setFeedback({
        type: 'success',
        text: `Itinerary suggestion dispatched to ${currentContact.name}! This proposal was sent as a message and does not modify the confirmed itinerary until agreed upon.`,
      });
    } catch (err) {
      console.error('[GuideTravelersPage] Failed to send itinerary suggestion:', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to dispatch itinerary suggestion.',
      });
    } finally {
      setIsSuggestSubmitting(false);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    const controller = new AbortController();
    fetchPageData(controller.signal);
  };

  return (
    <div className="guide-container">
      {/* Top Banner */}
      <div className="guide-welcome-card">
        <div>
          <h2 className="guide-welcome-title">
            👥 Assigned Clients & Itineraries
          </h2>
          <p className="guide-welcome-subtitle">
            Manage your travelers, oversee active tour accommodations, track daily itineraries, and coordinate schedules.
          </p>
        </div>

        <div className="guide-header-actions">
          <button
            type="button"
            onClick={handleRefresh}
            className="guide-refresh-btn"
            disabled={isLoadingPage}
            title="Refresh assigned client roster from backend"
          >
            <span>🔄</span>
            <span>{isLoadingPage ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background:
              feedback.type === 'success'
                ? '#ecfdf5'
                : feedback.type === 'warning'
                ? '#fffbeb'
                : '#fef2f2',
            color:
              feedback.type === 'success'
                ? '#065f46'
                : feedback.type === 'warning'
                ? '#92400e'
                : '#991b1b',
            border: `1px solid ${
              feedback.type === 'success'
                ? '#a7f3d0'
                : feedback.type === 'warning'
                ? '#fde68a'
                : '#fecaca'
            }`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{feedback.type === 'success' ? '✓' : feedback.type === 'warning' ? '⚠️' : '✕'}</span>
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              color: 'inherit',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Error Banner */}
      {pageError && (
        <div className="guide-error-banner">
          <div className="guide-error-text">
            <span>⚠️</span>
            <span>{pageError}</span>
          </div>
          <button type="button" onClick={handleRefresh} className="guide-retry-btn">
            Retry Connection
          </button>
        </div>
      )}

      {/* Secondary Data Warnings Banner */}
      {secondaryWarnings.length > 0 && (
        <div
          role="alert"
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 500,
            background: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fde68a',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '16px',
          }}
        >
          {secondaryWarnings.map((warning, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Roster on Left (1 col), Profile & Itinerary on Right (2 col) */}
      {isLoadingPage && !pageError ? (
        <div className="guide-state-card">
          <div className="guide-spinner" />
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Loading assigned clients and tours...
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Deriving roster from trips assigned to your guide account
          </div>
        </div>
      ) : (
        <div className="guide-travelers-layout-grid">
          {/* Left Roster Column */}
          <div className="guide-travelers-left-col">
            <GuideTravelerRoster
              contacts={contacts}
              selectedContactKey={currentContact?.key}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectContact={handleSelectContact}
            />
          </div>

          {/* Right Detail & Itinerary Column */}
          <div className="guide-travelers-right-col">
            <GuideTravelerProfile
              contact={currentContact}
              selectedTrip={currentTrip}
              itineraries={itineraries}
              bookings={scopedBookings}
              isLoadingItineraries={isLoadingItineraries}
              isUpdatingStatus={isUpdatingStatus}
              isUpdatingActivity={isUpdatingActivity}
              onSelectTrip={handleSelectTrip}
              onStartTrip={handleStartTrip}
              onCompleteTrip={handleCompleteTrip}
              onOpenAddActivity={handleOpenAddActivity}
              onOpenEditActivity={handleOpenEditActivity}
              onUpdateActivityStatus={handleUpdateActivityStatus}
              onOpenSuggestModal={() => setSuggestModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Controlled Itinerary Activity Modal (Add / Edit) */}
      <GuideActivityModal
        isOpen={activityModalOpen}
        mode={activityModalMode}
        initialData={editingActivity}
        tripId={currentTrip?.tripId}
        defaultCity={currentTrip?.destination ? currentTrip.destination.split(',')[0] : ''}
        isSubmitting={isActivitySubmitting}
        onSave={handleSaveActivity}
        onClose={() => {
          setActivityModalOpen(false);
          setEditingActivity(null);
        }}
      />

      {/* Controlled Suggest Itinerary Modal (Message Proposal) */}
      <GuideSuggestItineraryModal
        isOpen={suggestModalOpen}
        trip={currentTrip}
        contact={currentContact}
        isSubmitting={isSuggestSubmitting}
        onSend={handleSendSuggestion}
        onClose={() => setSuggestModalOpen(false)}
      />
    </div>
  );
}
