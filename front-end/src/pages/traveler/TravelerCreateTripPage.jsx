import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { packagesApi, guidesApi, tripsApi, bookingsApi, apiPost } from '../../services/api';
import TripForm from '../../components/trips/TripForm';
import TripCreationSuccessView from '../../components/trips/TripCreationSuccessView';
import TripSubmissionRecoveryBanner from '../../components/trips/TripSubmissionRecoveryBanner';
import { calculateTripCosts } from '../../components/trips/tripCalculations';
import {
  getBookingDateBounds,
  calculatePackageEndDate,
  validateTripDateRange,
  getMaxCustomEndDate,
  addDaysYmd,
} from '../../config/tripDatePolicy';

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
    origin: 'New Delhi, India',
    destination: '',
    currentLocation: 'New Delhi, India',
    startDate: '',
    endDate: '',
    numPersons: 1,
    transportType: 'Flight',
    tripType: 'round',
    // Nothing is pre-selected: the live summary fills in as the traveler picks each item.
    transportName: '',
    transportPrice: 0,
    hotelName: '',
    hotelPrice: 0,
    guideId: null,
    guideName: '',
    guidePrice: 0,
    includeCancellationProtection: false,
    passengersList: [{ name: '', age: '', gender: 'Male' }],
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

  // 6. Resume a saved draft trip (My Trips -> "Continue booking"): /traveler/plan?resumeTripId=ID
  const resumeTripId = searchParams.get('resumeTripId');
  const [resumeTrip, setResumeTrip] = useState(null);

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

  // F11: Refresh date-based guide availability whenever trip dates change
  useEffect(() => {
    if (!formData.startDate || !formData.endDate || formData.endDate < formData.startDate) {
      return undefined;
    }
    const controller = new AbortController();
    guidesApi
      .getAvailable(formData.startDate, formData.endDate, {
        signal: controller.signal,
        excludeTripId: resumeTrip?.tripId,
      })
      .then((list) => {
        if (!Array.isArray(list)) return;
        setGuides(list);
        if (formData.guideId) {
          const chosen = list.find((g) => Number(g.guideId) === Number(formData.guideId));
          if (chosen && chosen.isAvailableForDates === false) {
            setFormData((prev) => ({ ...prev, guideId: null, guideName: '', guidePrice: 0 }));
            setGuidesWarning(
              chosen.conflictReason ||
                `Previously selected guide is unavailable for ${formData.startDate} → ${formData.endDate}. Please choose another available guide or proceed self-guided.`,
            );
          }
        }
      })
      .catch((err) => {
        if (!err.isCancelled) {
          console.warn('[CreateTripPage] Could not refresh date-based guide availability:', err);
        }
      });
    return () => controller.abort();
  }, [formData.startDate, formData.endDate, resumeTrip?.tripId]);

  // Restore form values if recovering a previously interrupted submission
  useEffect(() => {
    if (submissionProgress.savedFormData && !formData.destination) {
      setFormData(submissionProgress.savedFormData);
    }
  }, []);

  useEffect(() => {
    if (!resumeTripId) return undefined;
    let cancelled = false;
    tripsApi
      .getById(Number(resumeTripId))
      .then((t) => {
        if (cancelled || !t) return;
        setResumeTrip(t);
        // A fresh resume must not reuse an older half-finished submission.
        clearSubmissionProgress();
        const plan = t.draftPlan || {};
        setFormData((prev) => ({
          ...prev,
          ...plan,
          origin: t.origin || plan.origin || prev.origin,
          destination: t.destination || plan.destination || '',
          startDate: String(t.startDate || plan.startDate || '').slice(0, 10),
          endDate: String(t.endDate || plan.endDate || '').slice(0, 10),
          guideId: t.guideId ?? plan.guideId ?? null,
        }));
        setCurrentStep(6);
      })
      .catch((err) => {
        if (!cancelled) setSubmitError(err.message || 'Could not load the saved trip.');
      });
    return () => {
      cancelled = true;
    };
  }, [resumeTripId]);

  const guideResponseExpired = Boolean(
    resumeTrip?.guideStatus === 'Pending' &&
      resumeTrip?.guideResponseDueAt &&
      Date.now() > Date.parse(resumeTrip.guideResponseDueAt)
  );
  // The guide already said yes for this trip (and the traveler kept the same guide).
  const guideAccepted = Boolean(
    resumeTrip &&
      resumeTrip.guideStatus === 'Accepted' &&
      formData.guideId != null &&
      Number(formData.guideId) === Number(resumeTrip.guideId)
  );

  // Pure function calculation: Derived line items and total during render
  const costData = calculateTripCosts({ ...formData, guideAccepted });

  // Field change handler enforcing selection consistency
  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // 1. Consistency: Switching mode to 'custom' MUST clear packageId
      if (field === 'mode' && value === 'custom') {
        updated.packageId = null;
      }

      // T06 & F03: Automatic end date recalculation for pre-planned packages when start date changes
      if (field === 'startDate') {
        if (updated.mode === 'package' && updated.packageId && value) {
          const pkg = packages.find((p) => String(p.packageId) === String(updated.packageId));
          if (pkg) {
            const recalculated = calculatePackageEndDate(value, pkg.duration || 5);
            if (recalculated) updated.endDate = recalculated;
          }
        } else if (updated.mode !== 'package' && value && updated.endDate) {
          const maxEnd = getMaxCustomEndDate(value);
          if (updated.endDate < value || updated.endDate > maxEnd) {
            updated.endDate = '';
          }
        }
      }

      // T03: Dynamically sync passengersList array when numPersons changes
      if (field === 'numPersons') {
        const count = Math.max(1, Math.min(20, parseInt(value) || 1));
        const currentList = Array.isArray(prev.passengersList) ? [...prev.passengersList] : [];
        if (currentList.length < count) {
          while (currentList.length < count) {
            currentList.push({ name: '', age: '', gender: 'Male' });
          }
        } else if (currentList.length > count) {
          currentList.length = count;
        }
        updated.passengersList = currentList;
      }

      // 2. Consistency: Changing transport mode, origin, or destination updates carrier and route price
      if (field === 'transportType' || field === 'origin' || field === 'currentLocation' || field === 'destination') {
        // Route or mode changed: clear the chosen carrier so its old price is not counted.
        // The traveler picks a carrier again in the Transport step.
        updated.transportName = '';
        updated.transportPrice = 0;
      }

      // 3. Consistency: Changing destination clears the chosen hotel (it belonged to the old city).
      if (field === 'destination' && prev.hotelName && value !== prev.destination) {
        updated.hotelName = '';
        updated.hotelPrice = 0;
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
    const { minStartDate } = getBookingDateBounds();
    const startYmd = addDaysYmd(minStartDate, 6); // 1 week ahead
    const durationDays = Number(pkg.duration) || 5;
    const endYmd = calculatePackageEndDate(startYmd, durationDays);

    setFormData((prev) => ({
      ...prev,
      mode: 'package',
      packageId: pkg.packageId,
      packagePrice: Number(pkg.budget) || 0,
      destination: pkg.destinations ? pkg.destinations.split(',')[0].trim() : pkg.name,
      startDate: startYmd,
      endDate: endYmd,
      // No hotel upgrade pre-selected: package includes base accommodation
      hotelName: '',
      hotelPrice: 0,
      transportName: '',
      transportPrice: 0,
    }));

    setCurrentStep(1); // Advance to dates step
  };

  const handleCarrierSelect = (carrierName, carrierPrice) => {
    setFormData((prev) => ({ ...prev, transportName: carrierName, transportPrice: carrierPrice }));
    if (errors.transportName) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.transportName;
        return next;
      });
    }
  };

  const handleHotelSelect = (hotelName, hotelPrice) => {
    setFormData((prev) => ({ ...prev, hotelName, hotelPrice }));
    if (errors.hotelName) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.hotelName;
        return next;
      });
    }
  };

  const handleGuideSelect = (guideId, guideName, guidePrice) => {
    setFormData((prev) => ({ ...prev, guideId, guideName, guidePrice }));
  };

  // Step-level validation before proceeding to next wizard tab
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      const selectedPkg = formData.mode === 'package'
        ? packages.find((p) => String(p.packageId) === String(formData.packageId))
        : null;
      const dateErrs = validateTripDateRange({
        startDate: formData.startDate,
        endDate: formData.endDate,
        isPackage: formData.mode === 'package',
        packageDurationDays: selectedPkg?.duration ?? null,
      });
      Object.assign(newErrors, dateErrs);

      const persons = Number(formData.numPersons);
      if (!formData.numPersons || isNaN(persons) || persons < 1 || !Number.isInteger(persons)) {
        newErrors.numPersons = 'Traveler count must be a positive integer (at least 1).';
      }
    }

    if (step === 2) {
      const originVal = (formData.origin || formData.currentLocation || '').trim();
      if (!originVal) {
        newErrors.origin = 'Departure / starting city is required.';
      }
      if (!formData.destination || !formData.destination.trim()) {
        newErrors.destination = 'Primary destination is required.';
      }
    }

    if (step === 3 && formData.mode !== 'package') {
      if (!formData.transportName || Number(formData.transportPrice) <= 0) {
        newErrors.transportName = 'Please select a transportation operator for your journey before continuing.';
      }
    }

    if (step === 4 && formData.mode !== 'package') {
      const isSameDay = Boolean(formData.startDate && formData.endDate && formData.startDate === formData.endDate);
      if (!isSameDay && (!formData.hotelName || Number(formData.hotelPrice) <= 0)) {
        newErrors.hotelName = 'Accommodation is mandatory for overnight trips. Please select a verified stay tier.';
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

    const originVal = (formData.origin || formData.currentLocation || '').trim();
    if (!originVal) {
      newErrors.origin = 'Departure / starting city is required.';
    }
    if (!formData.destination || !formData.destination.trim()) {
      newErrors.destination = 'Destination is required.';
    }
    const selectedPkg = formData.mode === 'package'
      ? packages.find((p) => String(p.packageId) === String(formData.packageId))
      : null;
    const dateErrs = validateTripDateRange({
      startDate: formData.startDate,
      endDate: formData.endDate,
      isPackage: formData.mode === 'package',
      packageDurationDays: selectedPkg?.duration ?? null,
    });
    Object.assign(newErrors, dateErrs);

    const persons = Number(formData.numPersons);
    if (!formData.numPersons || isNaN(persons) || persons < 1 || !Number.isInteger(persons)) {
      newErrors.numPersons = 'At least 1 traveler is required.';
    }

    if (formData.mode !== 'package') {
      const isSameDay = Boolean(formData.startDate && formData.endDate && formData.startDate === formData.endDate);
      if (!formData.transportName || Number(formData.transportPrice) <= 0) {
        newErrors.transportName = 'Transportation selection is mandatory for customized trips.';
      }
      if (!isSameDay && (!formData.hotelName || Number(formData.hotelPrice) <= 0)) {
        newErrors.hotelName = 'Accommodation selection is mandatory for overnight trips.';
      }
    }

    setErrors(newErrors);

    if (newErrors.startDate || newErrors.endDate || newErrors.numPersons) {
      setCurrentStep(1);
      return false;
    }
    if (newErrors.origin || newErrors.destination) {
      setCurrentStep(2);
      return false;
    }
    if (newErrors.transportName) {
      setCurrentStep(3);
      return false;
    }
    if (newErrors.hotelName) {
      setCurrentStep(4);
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
      // 0. A chosen guide must accept first: save the plan as a draft and send the request (no bookings yet).
      if (formData.guideId && !guideAccepted) {
        await sendGuideRequest(travelerId);
        return;
      }

      // Local copy of the saved progress for this run (state updates are not visible until the next render).
      const progress = { ...submissionProgress };

      // 0b. Resuming a saved draft: reuse its trip record instead of creating a new one.
      if (resumeTrip && !progress.tripId) {
        if (!validateForm()) return;
        const resumed = await tripsApi.update(resumeTrip.tripId, {
          origin: (formData.origin || formData.currentLocation || 'New Delhi, India').trim(),
          destination: formData.destination.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          budget: Math.round(costData.totalBudget),
          ...(formData.guideId ? {} : resumeTrip.guideId != null ? { guideId: null } : {}),
          status: 'Pending',
        });
        updateSubmissionProgress({
          tripId: resumed.tripId,
          origin: resumed.origin,
          destination: resumed.destination,
          budget: resumed.budget,
          tripStatus: resumed.status || 'Pending',
          startDate: resumed.startDate,
          endDate: resumed.endDate,
          savedFormData: formData,
          // The guide already knows about this trip (they accepted it).
          guideNotification: { completed: true, error: null },
        });
        Object.assign(progress, {
          tripId: resumed.tripId,
          destination: resumed.destination,
          budget: resumed.budget,
          tripStatus: resumed.status || 'Pending',
          startDate: resumed.startDate,
          endDate: resumed.endDate,
          guideNotification: { completed: true, error: null },
        });
      }

      // 1. Create or retain the primary Trip record immediately
      let activeTripId = progress.tripId;
      let activeTripDestination = progress.destination || formData.destination;
      let activeTripBudget = progress.budget || Math.round(costData.totalBudget);
      let activeTripStatus = progress.tripStatus || 'Pending';
      let activeStartDate = progress.startDate || formData.startDate;
      let activeEndDate = progress.endDate || formData.endDate;

      if (!activeTripId) {
        if (!validateForm()) {
          setIsSubmitting(false);
          return;
        }

        const tripPayload = {
          origin: (formData.origin || formData.currentLocation || 'New Delhi, India').trim(),
          destination: formData.destination.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          budget: Math.round(costData.totalBudget),
          travelerId: travelerId,
          travelersCount: Number(formData.numPersons) || 1,
          status: 'Pending',
          transportDetails: {
            transportType: formData.transportType,
            carrier: formData.transportName || (formData.mode === 'package' ? 'Package Included' : ''),
            carrierPrice: Number(formData.transportPrice) || 0,
            tripType: formData.tripType,
            lodgingTier: formData.hotelName || (formData.mode === 'package' ? 'Package Included' : ''),
            lodgingPrice: Number(formData.hotelPrice) || 0,
            packageIncluded: formData.mode === 'package',
          },
        };

        if (formData.guideId) {
          tripPayload.guideId = Number(formData.guideId);
        }

        if (formData.mode === 'package' && formData.packageId) {
          tripPayload.packageId = Number(formData.packageId);
        }

        // T03: Persist all individual passenger forms associated with this trip and traveler
        if (Array.isArray(formData.passengersList) && formData.passengersList.length > 0) {
          try {
            const savedPassengerIds = [];
            for (const p of formData.passengersList) {
              if (p.name && p.name.trim()) {
                const res = await apiPost('/passengers', {
                  name: p.name.trim(),
                  age: Number(p.age) || 25,
                  gender: p.gender || 'Male',
                  travelerId: travelerId,
                  specialNotes: `Trip to ${formData.destination}`,
                });
                if (res && res.passId) savedPassengerIds.push(res.passId);
              }
            }
            if (savedPassengerIds.length > 0) {
              tripPayload.passengerIds = savedPassengerIds;
            }
          } catch (passErr) {
            console.warn('[TravelerCreateTripPage] Could not register passengers:', passErr);
          }
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
          origin: created.origin || formData.origin || formData.currentLocation,
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
      if (requiresTransport && !progress.transportBooking?.completed) {
        try {
          const tb = await bookingsApi.create({
            bookingDate: new Date().toISOString().split('T')[0],
            tripId: activeTripId,
            travelerId: travelerId,
            service: formData.transportName,
            type: formData.transportType === 'Flight' ? 'Flight' : 'Transport',
            amount: Math.round(costData.transportCost),
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
      if (requiresHotel && !progress.hotelBooking?.completed) {
        try {
          const hb = await bookingsApi.create({
            bookingDate: new Date().toISOString().split('T')[0],
            tripId: activeTripId,
            travelerId: travelerId,
            service: formData.hotelName,
            type: 'Hotel',
            amount: Math.round(costData.hotelCost),
            status: 'Pending',
            cancellationProtectionSelected: Boolean(formData.includeCancellationProtection),
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

      // 3b. For preplanned packages using included transit & stay, persist a Package booking record
      if (formData.mode === 'package' && costData.packageCost > 0 && !requiresTransport && !requiresHotel && !progress.packageBooking?.completed) {
        const pkgObj = packages.find((p) => String(p.packageId) === String(formData.packageId));
        try {
          const pb = await bookingsApi.create({
            bookingDate: new Date().toISOString().split('T')[0],
            tripId: activeTripId,
            travelerId: travelerId,
            service: `${pkgObj?.name || 'Tour Package'} (${activeTripDestination})`,
            type: 'Package',
            amount: Math.round(costData.packageCost),
            status: 'Pending',
            cancellationProtectionSelected: Boolean(formData.includeCancellationProtection),
          });
          updateSubmissionProgress({
            packageBooking: { completed: true, bookingId: pb.bookingId || pb.id, error: null },
          });
        } catch (pkgErr) {
          updateSubmissionProgress({
            packageBooking: { completed: false, bookingId: null, error: pkgErr.message },
          });
          throw new Error(
            `Trip #${activeTripId} is saved, but booking the tour package failed: ${pkgErr.message}. You can retry without recreating the trip.`
          );
        }
      }

      // 4. Track Guide Notification (handled independently from booking failure)
      if (formData.guideId && !guideAccepted && !progress.guideNotification?.completed) {
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

  // Saves the trip as a draft (status Planning) with the full plan, and sends the request to the guide.
  // Bookings and payment open only after the guide accepts (within 3 hours).
  const sendGuideRequest = async (travelerId) => {
    if (!validateForm()) return;
    const sameGuide = resumeTrip && Number(formData.guideId) === Number(resumeTrip.guideId);
    if (sameGuide && (resumeTrip.guideStatus === 'Declined' || guideResponseExpired)) {
      throw new Error(
        resumeTrip.guideStatus === 'Declined'
          ? 'This guide declined your request. Please choose another guide, or remove the guide to continue without one.'
          : 'This guide did not reply within 3 hours. Please choose another guide, or remove the guide to continue without one.'
      );
    }
    const plan = { ...formData };
    const base = {
      origin: (formData.origin || formData.currentLocation || 'New Delhi, India').trim(),
      destination: formData.destination.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      budget: Math.round(costData.totalBudget),
      draftPlan: plan,
    };
    let trip;
    if (resumeTrip) {
      trip = await tripsApi.update(resumeTrip.tripId, sameGuide ? base : { ...base, guideId: Number(formData.guideId) });
    } else {
      trip = await tripsApi.create({
        ...base,
        travelerId,
        status: 'Planning',
        guideId: Number(formData.guideId),
        ...(formData.mode === 'package' && formData.packageId ? { packageId: Number(formData.packageId) } : {}),
      });
    }
    if (!sameGuide) {
      try {
        await apiPost('/messages', {
          sender: 'traveler',
          senderId: travelerId,
          receiver: 'guide',
          receiverId: Number(formData.guideId),
          content: `Hi! Please accept or decline my trip request #${trip.tripId} to ${trip.destination} (${trip.startDate} to ${trip.endDate}) within 3 hours. Thank you!`,
        });
      } catch (msgErr) {
        // The request itself is on the trip (guide sees it in Requests); the chat message is only a courtesy.
        console.warn('[CreateTripPage] Guide message failed:', msgErr);
      }
    }
    clearSubmissionProgress();
    setCreatedTrip({
      tripId: trip.tripId,
      destination: trip.destination,
      budget: trip.budget,
      status: trip.status || 'Planning',
      startDate: trip.startDate,
      endDate: trip.endDate,
      awaitingGuide: true,
      guideName: formData.guideName,
      guideResponseDueAt: trip.guideResponseDueAt,
    });
  };

  // Save itinerary wizard as draft (status: 'Planning') without generating bookings
  const handleSaveDraft = async () => {
    if (isSubmitting) return;

    const travelerId = Number(user?.travelerId || user?.id);
    if (!travelerId) {
      setSubmitError('Unable to identify traveler ID from session. Please log in again.');
      return;
    }

    if (!formData.destination?.trim()) {
      setSubmitError('Please specify a destination before saving as draft.');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const tripPayload = {
        origin: (formData.origin || formData.currentLocation || 'New Delhi, India').trim(),
        destination: formData.destination.trim(),
        startDate: formData.startDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        endDate: formData.endDate || new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
        budget: Math.round(costData.totalBudget) || 10000,
        travelerId: travelerId,
        status: 'Planning',
        draftPlan: { ...formData },
      };

      if (formData.guideId) {
        tripPayload.guideId = Number(formData.guideId);
      }

      if (formData.mode === 'package' && formData.packageId) {
        tripPayload.packageId = Number(formData.packageId);
      }

      let created;
      if (resumeTrip) {
        // Update the existing draft instead of creating a second trip.
        const { travelerId: _t, status: _s, ...changes } = tripPayload;
        if (Number(changes.guideId) === Number(resumeTrip.guideId)) delete changes.guideId;
        created = await tripsApi.update(resumeTrip.tripId, changes);
      } else {
        created = await tripsApi.create(tripPayload);
      }
      if (!created || (!created.tripId && !created.id)) {
        throw new Error('Draft trip was created but backend did not return an identifier.');
      }

      const activeTripId = created.tripId || created.id;

      setCreatedTrip({
        tripId: activeTripId,
        destination: created.destination,
        budget: created.budget,
        status: 'Planning',
        startDate: created.startDate,
        endDate: created.endDate,
        isDraft: true,
      });
      clearSubmissionProgress();
    } catch (err) {
      console.error('[CreateTripPage] Save draft error:', err);
      setSubmitError(err.message || 'Failed to save draft trip to backend.');
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
      transportName: '',
      transportPrice: 0,
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

      {resumeTrip && (
        <div
          className="feedback-banner"
          style={{
            background: guideAccepted ? '#ecfdf5' : '#fffbeb',
            border: `1px solid ${guideAccepted ? '#a7f3d0' : '#fde68a'}`,
            color: guideAccepted ? '#065f46' : '#92400e',
          }}
        >
          <span>
            {guideAccepted
              ? `✅ Your guide accepted trip #${resumeTrip.tripId}. Review the plan and press "Create & Save Trip" to book and pay.`
              : resumeTrip.guideStatus === 'Declined'
                ? `❌ The guide declined trip #${resumeTrip.tripId}. Choose another guide in the Guide step, or remove the guide to continue without one.`
                : guideResponseExpired
                  ? `⌛ The guide did not reply within 3 hours for trip #${resumeTrip.tripId}. Choose another guide, or continue without one.`
                  : resumeTrip.guideId != null && resumeTrip.guideStatus === 'Pending'
                    ? `⏳ Waiting for the guide to reply on trip #${resumeTrip.tripId} (within 3 hours). You can still change your plan and save it.`
                    : `📝 Continuing your saved draft trip #${resumeTrip.tripId}.`}
          </span>
        </div>
      )}

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
        onSaveDraft={handleSaveDraft}
        guideAccepted={guideAccepted}
      />
    </div>
  );
}
