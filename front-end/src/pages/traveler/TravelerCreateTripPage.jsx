import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { packagesApi, guidesApi, tripsApi, bookingsApi, apiPost } from '../../services/api';
import TripForm from '../../components/trips/TripForm';
import TripCreationSuccessView from '../../components/trips/TripCreationSuccessView';
import TripSubmissionRecoveryBanner from '../../components/trips/TripSubmissionRecoveryBanner';
import { calculateTripCosts, getDefaultCarrier } from '../../components/trips/tripCalculations';

/**
 * TravelerCreateTripPage: Multi-step itinerary builder with selection consistency and reliable submission.
 * 
 * State Ownership:
 * - currentStep: Wizard step (0 = Mode/Package, 1 = Dates, 2 = Destination, 3 = Transit, 4 = Stay, 5 = Guide, 6 = Summary)
 * - formData: Controlled state of all trip planning fields
 * - packages, guides: Remote catalog data loaded on mount
 * - submissionProgress: Session-persisted state tracking multi-step backend commitments
 * - createdTrip: Success confirmation state
 */
export default function TravelerCreateTripPage() {
  const { user } = useSession();
  const [searchParams] = useSearchParams();

  // 1. Wizard Step State
  const [currentStep, setCurrentStep] = useState(0);

  // 2. Main Form State
  const [formData, setFormData] = useState({
    mode: 'custom', // 'custom' | 'package'
    packageId: null,
    destination: '',
    currentLocation: '',
    startDate: '',
    endDate: '',
    numPersons: 1,
    transportType: 'Flight',
    tripType: 'round',
    transportName: 'SkyHigh Airlines',
    transportPrice: 14500,
    hotelName: '',
    hotelPrice: 0,
    guideId: null,
    guideName: '',
    guidePrice: 0,
    includeCancellationProtection: false,
  });

  // 3. Validation Errors State
  const [errors, setErrors] = useState({});

  // 4. Remote Catalog Data
  const [packages, setPackages] = useState([]);
  const [guides, setGuides] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [guidesWarning, setGuidesWarning] = useState(null);

  // 5. Submission Progress & Persistent Session Recovery
  const [submissionProgress, setSubmissionProgress] = useState(() => {
    try {
      const saved = sessionStorage.getItem('globesync_pending_trip_submission');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      tripId: null,
      destination: '',
      tripStatus: 'Pending',
      budget: 0,
      startDate: '',
      endDate: '',
      savedFormData: null,
      transportBooking: { completed: false, bookingId: null, error: null },
      hotelBooking: { completed: false, bookingId: null, error: null },
      guideNotification: { completed: false, error: null },
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [createdTrip, setCreatedTrip] = useState(null);

  // Helper: Persists submission progress to sessionStorage
  const updateSubmissionProgress = (patch) => {
    setSubmissionProgress((prev) => {
      const updated = {
        ...prev,
        ...patch,
        savedFormData: patch.savedFormData || prev.savedFormData,
        transportBooking: { ...prev.transportBooking, ...(patch.transportBooking || {}) },
        hotelBooking: { ...prev.hotelBooking, ...(patch.hotelBooking || {}) },
        guideNotification: { ...prev.guideNotification, ...(patch.guideNotification || {}) },
      };
      try {
        sessionStorage.setItem('globesync_pending_trip_submission', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearSubmissionProgress = () => {
    setSubmissionProgress({
      tripId: null,
      destination: '',
      tripStatus: 'Pending',
      budget: 0,
      startDate: '',
      endDate: '',
      savedFormData: null,
      transportBooking: { completed: false, bookingId: null, error: null },
      hotelBooking: { completed: false, bookingId: null, error: null },
      guideNotification: { completed: false, error: null },
    });
    try {
      sessionStorage.removeItem('globesync_pending_trip_submission');
    } catch {}
  };

  // Load packages and guides with AbortController cleanup and honest error handling
  const loadCatalog = async (signal) => {
    setLoadingData(true);
    setCatalogError(null);
    setGuidesWarning(null);

    try {
      const [pkgsResult, guidesResult] = await Promise.allSettled([
        packagesApi.getAll({ signal }),
        guidesApi.getAll({ signal }),
      ]);

      if (signal?.aborted) return;

      // 1. Process Packages (Required for package mode)
      if (pkgsResult.status === 'fulfilled') {
        const pkgs = Array.isArray(pkgsResult.value) ? pkgsResult.value : [];
        setPackages(pkgs);

        // Pre-populate package if specified in URL query
        const paramPkgId = searchParams.get('packageId');
        if (paramPkgId) {
          const matched = pkgs.find((p) => String(p.packageId) === String(paramPkgId));
          if (matched) {
            handleSelectPackage(matched);
          }
        }
      } else if (!pkgsResult.reason?.isCancelled) {
        setCatalogError(pkgsResult.reason?.message || 'Failed to connect to package catalog service.');
      }

      // 2. Process Guides (Optional: planning can continue without a guide)
      if (guidesResult.status === 'fulfilled') {
        setGuides(Array.isArray(guidesResult.value) ? guidesResult.value : []);
        setGuidesWarning(null);
      } else if (!guidesResult.reason?.isCancelled) {
        setGuides([]);
        if (pkgsResult.status === 'fulfilled') {
          setGuidesWarning(
            'Certified tour guide directory is temporarily unavailable. You can still plan your trip without a guide assignment.'
          );
        }
      }
    } catch (err) {
      if (!err.isCancelled && !signal?.aborted) {
        console.error('[CreateTripPage] Catalog fetch error:', err);
        setCatalogError(err.message || 'Failed to connect to catalog services.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingData(false);
      }
    }
  };

  const retryGuides = async () => {
    try {
      const data = await guidesApi.getAll();
      setGuides(Array.isArray(data) ? data : []);
      setGuidesWarning(null);
    } catch (err) {
      console.warn('[CreateTripPage] Retry guides failed:', err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal);

    return () => {
      controller.abort();
    };
  }, [searchParams]);

  // Restore form values if recovering a previously interrupted submission
  useEffect(() => {
    if (submissionProgress.savedFormData && !formData.destination) {
      setFormData(submissionProgress.savedFormData);
    }
  }, []);

  // Pure function calculation: Derived line items and total during render
  const costData = calculateTripCosts(formData);

  // Field change handler enforcing selection consistency
  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // 1. Consistency: Switching mode to 'custom' MUST clear packageId
      if (field === 'mode' && value === 'custom') {
        updated.packageId = null;
      }

      // 2. Consistency: Changing transport mode MUST update carrier and price for the new mode
      if (field === 'transportType') {
        const defaultCarrier = getDefaultCarrier(value);
        updated.transportName = defaultCarrier.name;
        updated.transportPrice = defaultCarrier.price;
      }

      // 3. Consistency: Changing destination adapts or resets hotel
      if (field === 'destination' && prev.hotelName) {
        const oldCity = prev.destination ? prev.destination.split(',')[0].trim() : '';
        const newCity = value ? value.split(',')[0].trim() : '';
        if (oldCity && newCity && prev.hotelName.includes(oldCity)) {
          updated.hotelName = prev.hotelName.replace(oldCity, newCity);
        } else {
          updated.hotelName = '';
          updated.hotelPrice = 0;
        }
      }

      return updated;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Pre-fill fields when selecting a pre-planned package
  const handleSelectPackage = (pkg) => {
    const today = new Date();
    const start = new Date(today.getTime() + 7 * 86400000);
    const durationDays = pkg.duration || 5;
    const end = new Date(start.getTime() + durationDays * 86400000);

    setFormData((prev) => ({
      ...prev,
      mode: 'package',
      packageId: pkg.packageId,
      destination: pkg.destinations ? pkg.destinations.split(',')[0].trim() : pkg.name,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      hotelName: `Grand ${pkg.destinations || 'Resort'} Hotel`,
      hotelPrice: Math.round((pkg.budget * 0.4) / durationDays),
    }));

    setCurrentStep(1); // Advance to dates step
  };

  const handleCarrierSelect = (carrierName, carrierPrice) => {
    setFormData((prev) => ({ ...prev, transportName: carrierName, transportPrice: carrierPrice }));
  };

  const handleHotelSelect = (hotelName, hotelPrice) => {
    setFormData((prev) => ({ ...prev, hotelName, hotelPrice }));
  };

  const handleGuideSelect = (guideId, guideName, guidePrice) => {
    setFormData((prev) => ({ ...prev, guideId, guideName, guidePrice }));
  };

  // Step-level validation before proceeding to next wizard tab
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.startDate) {
        newErrors.startDate = 'Start date is required.';
      } else if (isNaN(new Date(formData.startDate).getTime())) {
        newErrors.startDate = 'Please enter a valid start date.';
      }

      if (!formData.endDate) {
        newErrors.endDate = 'End date is required.';
      } else if (isNaN(new Date(formData.endDate).getTime())) {
        newErrors.endDate = 'Please enter a valid end date.';
      } else if (formData.startDate && formData.endDate <= formData.startDate) {
        newErrors.endDate = 'End date must be strictly after start date.';
      }

      const persons = Number(formData.numPersons);
      if (!formData.numPersons || isNaN(persons) || persons < 1 || !Number.isInteger(persons)) {
        newErrors.numPersons = 'Traveler count must be a positive integer (at least 1).';
      }
    }

    if (step === 2) {
      if (!formData.destination || !formData.destination.trim()) {
        newErrors.destination = 'Primary destination is required.';
      }
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleStepAdvance = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 6));
    }
  };

  // Complete validation before final backend submission
  const validateForm = () => {
    const newErrors = {};

    if (!formData.destination || !formData.destination.trim()) {
      newErrors.destination = 'Destination is required.';
    }
    if (!formData.startDate || isNaN(new Date(formData.startDate).getTime())) {
      newErrors.startDate = 'Please enter a valid start date.';
    }
    if (!formData.endDate || isNaN(new Date(formData.endDate).getTime())) {
      newErrors.endDate = 'Please enter a valid end date.';
    } else if (formData.startDate && formData.endDate <= formData.startDate) {
      newErrors.endDate = 'End date must be strictly after start date.';
    }

    const persons = Number(formData.numPersons);
    if (!formData.numPersons || isNaN(persons) || persons < 1 || !Number.isInteger(persons)) {
      newErrors.numPersons = 'At least 1 traveler is required.';
    }

    setErrors(newErrors);

    if (newErrors.startDate || newErrors.endDate || newErrors.numPersons) {
      setCurrentStep(1);
      return false;
    }
    if (newErrors.destination) {
      setCurrentStep(2);
      return false;
    }

    return true;
  };

  // Multi-step submit handler with step tracking and recovery
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    const travelerId = Number(user?.travelerId || user?.id);
    if (!travelerId) {
      setSubmitError('Unable to identify traveler ID from session. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create or retain the primary Trip record immediately
      let activeTripId = submissionProgress.tripId;
      let activeTripDestination = submissionProgress.destination || formData.destination;
      let activeTripBudget = submissionProgress.budget || Math.round(costData.totalBudget);
      let activeTripStatus = submissionProgress.tripStatus || 'Pending';
      let activeStartDate = submissionProgress.startDate || formData.startDate;
      let activeEndDate = submissionProgress.endDate || formData.endDate;

      if (!activeTripId) {
        if (!validateForm()) {
          setIsSubmitting(false);
          return;
        }

        const tripPayload = {
          destination: formData.destination.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          budget: Math.round(costData.totalBudget),
          travelerId: travelerId,
          status: 'Pending',
        };

        if (formData.guideId) {
          tripPayload.guideId = Number(formData.guideId);
        }

        if (formData.mode === 'package' && formData.packageId) {
          tripPayload.packageId = Number(formData.packageId);
        }

        const created = await tripsApi.create(tripPayload);
        if (!created || (!created.tripId && !created.id)) {
          throw new Error('Trip record was created but backend did not return an identifier.');
        }

        activeTripId = created.tripId || created.id;
        activeTripDestination = created.destination;
        activeTripBudget = created.budget;
        activeTripStatus = created.status || 'Pending';
        activeStartDate = created.startDate;
        activeEndDate = created.endDate;

        updateSubmissionProgress({
          tripId: activeTripId,
          destination: activeTripDestination,
          budget: activeTripBudget,
          tripStatus: activeTripStatus,
          startDate: activeStartDate,
          endDate: activeEndDate,
          savedFormData: formData,
        });
      }

      // 2. Track & Create Transport Booking (skipped if already completed)
      const requiresTransport = Boolean(formData.transportName && costData.transportCost > 0);
      if (requiresTransport && !submissionProgress.transportBooking?.completed) {
        try {
          const tb = await bookingsApi.create({
            bookingDate: new Date().toISOString().split('T')[0],
            tripId: activeTripId,
            travelerId: travelerId,
            service: formData.transportName,
            type: formData.transportType === 'Flight' ? 'Flight' : 'Transport',
            amount: Math.round(costData.totalTransportBooking),
            status: 'Pending',
            insuranceSelected: true,
            transportMode: formData.transportType,
            cancellationProtectionSelected: Boolean(formData.includeCancellationProtection),
          });
          updateSubmissionProgress({
            transportBooking: { completed: true, bookingId: tb.bookingId || tb.id, error: null },
          });
        } catch (bookingErr) {
          updateSubmissionProgress({
            transportBooking: { completed: false, bookingId: null, error: bookingErr.message },
          });
          throw new Error(
            `Trip #${activeTripId} is saved, but booking transport (${formData.transportName}) failed: ${bookingErr.message}. You can retry without recreating the trip.`
          );
        }
      }

      // 3. Track & Create Hotel Booking (skipped if already completed)
      const requiresHotel = Boolean(formData.hotelName && costData.hotelCost > 0);
      if (requiresHotel && !submissionProgress.hotelBooking?.completed) {
        try {
          const hb = await bookingsApi.create({
            bookingDate: new Date().toISOString().split('T')[0],
            tripId: activeTripId,
            travelerId: travelerId,
            service: formData.hotelName,
            type: 'Hotel',
            amount: Math.round(costData.hotelCost),
            status: 'Pending',
          });
          updateSubmissionProgress({
            hotelBooking: { completed: true, bookingId: hb.bookingId || hb.id, error: null },
          });
        } catch (hotelErr) {
          updateSubmissionProgress({
            hotelBooking: { completed: false, bookingId: null, error: hotelErr.message },
          });
          throw new Error(
            `Trip #${activeTripId} is saved, but booking hotel (${formData.hotelName}) failed: ${hotelErr.message}. You can retry without recreating the trip.`
          );
        }
      }

      // 4. Track Guide Notification (handled independently from booking failure)
      if (formData.guideId && !submissionProgress.guideNotification?.completed) {
        try {
          await apiPost('/messages', {
            sender: 'traveler',
            senderId: travelerId,
            receiver: 'guide',
            receiverId: Number(formData.guideId),
            content: `Hi! I have assigned you as the guide for my trip to ${activeTripDestination} (${activeStartDate} to ${activeEndDate}). Looking forward to traveling with you!`,
          });
          updateSubmissionProgress({
            guideNotification: { completed: true, error: null },
          });
        } catch (msgErr) {
          console.warn('[CreateTripPage] Guide notification message failed:', msgErr);
          updateSubmissionProgress({
            guideNotification: { completed: false, error: msgErr.message || 'Guide messaging service unavailable' },
          });
        }
      }

      // Transition to success confirmation view
      setCreatedTrip({
        tripId: activeTripId,
        destination: activeTripDestination,
        budget: activeTripBudget,
        status: activeTripStatus,
        startDate: activeStartDate,
        endDate: activeEndDate,
      });
      setSubmitError(null);
    } catch (err) {
      console.error('[CreateTripPage] Submission error:', err);
      setSubmitError(err.message || 'Failed to submit trip to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryGuideNotification = async () => {
    const guideId = Number(formData.guideId || submissionProgress.savedFormData?.guideId);
    const travelerId = Number(user?.travelerId || user?.id);
    if (!guideId || !travelerId) return;

    try {
      await apiPost('/messages', {
        sender: 'traveler',
        senderId: travelerId,
        receiver: 'guide',
        receiverId: guideId,
        content: `Hi! I have assigned you as the guide for my trip to ${submissionProgress.destination || formData.destination}. Looking forward to traveling with you!`,
      });
      updateSubmissionProgress({ guideNotification: { completed: true, error: null } });
    } catch (msgErr) {
      updateSubmissionProgress({
        guideNotification: { completed: false, error: msgErr.message || 'Notification service unavailable' },
      });
    }
  };

  const handlePlanAnotherTrip = () => {
    clearSubmissionProgress();
    setCreatedTrip(null);
    setCurrentStep(0);
    const defaultCarrier = getDefaultCarrier('Flight');
    setFormData({
      mode: 'custom',
      packageId: null,
      destination: '',
      currentLocation: '',
      startDate: '',
      endDate: '',
      numPersons: 1,
      transportType: 'Flight',
      tripType: 'round',
      transportName: defaultCarrier.name,
      transportPrice: defaultCarrier.price,
      hotelName: '',
      hotelPrice: 0,
      guideId: null,
      guideName: '',
      guidePrice: 0,
      includeCancellationProtection: false,
    });
  };

  // SUCCESS CONFIRMATION VIEW
  if (createdTrip) {
    return (
      <TripCreationSuccessView
        createdTrip={createdTrip}
        submissionProgress={submissionProgress}
        formData={formData}
        onRetryGuideNotification={handleRetryGuideNotification}
        onPlanAnotherTrip={handlePlanAnotherTrip}
        onClearSubmission={clearSubmissionProgress}
      />
    );
  }

  // LOADING VIEW
  if (loadingData) {
    return (
      <div className="state-box">
        <div className="state-box-icon">🧭</div>
        <h3 className="state-box-title">Loading Travel Planning Services...</h3>
        <p className="state-box-text">Connecting to backend catalog for tour packages and certified guides...</p>
      </div>
    );
  }

  // CATALOG ERROR VIEW
  if (catalogError) {
    return (
      <div
        className="card"
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #fee2e2',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', marginBottom: '8px' }}>
          Unable to Load Travel Catalog
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 16px' }}>
          {catalogError}
        </p>
        <button
          type="button"
          onClick={() => loadCatalog()}
          className="btn btn-primary"
          style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 700 }}
        >
          Retry Connection ↺
        </button>
      </div>
    );
  }

  // STANDARD FORM VIEW
  return (
    <div className="traveler-create-trip-page">
      {/* Optional Guides Directory Warning */}
      {guidesWarning && (
        <div className="feedback-banner warning">
          <span>⚠️ {guidesWarning}</span>
          <button
            type="button"
            onClick={retryGuides}
            style={{
              background: 'none',
              border: 'none',
              color: '#b45309',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline',
            }}
          >
            Retry Guides ↺
          </button>
        </div>
      )}

      {/* Page Title */}
      <div style={{ marginBottom: '24px' }}>
        <h2 className="traveler-page-header-title">Create New Travel Itinerary 🗺</h2>
        <p className="traveler-page-header-subtitle">
          Plan your custom journey or configure a package with transparent pricing, transit, and verified guides.
        </p>
      </div>

      {/* Recovery Banner for Retained Submissions */}
      <TripSubmissionRecoveryBanner
        submissionProgress={submissionProgress}
        isSubmitting={isSubmitting}
        onRetry={handleSubmit}
        onDiscard={clearSubmissionProgress}
      />

      {/* Backend Submission Error Banner */}
      {submitError && (
        <div className="feedback-banner error">
          <span>⚠️ {submitError}</span>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="feedback-banner-close"
          >
            ✕
          </button>
        </div>
      )}

      {/* Trip Wizard Form */}
      <TripForm
        currentStep={currentStep}
        formData={formData}
        errors={errors}
        packages={packages}
        guides={guides}
        loadingGuides={loadingData}
        costData={costData}
        isSubmitting={isSubmitting}
        onStepChange={setCurrentStep}
        onStepAdvance={handleStepAdvance}
        onInputChange={handleInputChange}
        onSelectPackage={handleSelectPackage}
        onCarrierSelect={handleCarrierSelect}
        onHotelSelect={handleHotelSelect}
        onGuideSelect={handleGuideSelect}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
