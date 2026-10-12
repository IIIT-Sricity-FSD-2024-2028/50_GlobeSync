import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { travelersApi, passengersApi } from '../../services/api';
import ProfileForm from '../../components/profile/ProfileForm';
import PassengerList from '../../components/passengers/PassengerList';
import PassengerFormModal from '../../components/passengers/PassengerFormModal';

/**
 * TravelerProfilePage: Traveler profile management and saved co-traveler passenger master list.
 *
 * Responsibilities:
 * - Loads traveler profile via GET /travelers/:id
 * - Loads saved co-travelers via GET /passengers/traveler/:travelerId
 * - Updates profile and password via PUT /travelers/:id
 * - Synchronizes active session user information (name, email) immediately via updateUser()
 * - Full CRUD for saved passengers (POST /passengers, PATCH /passengers/:id, DELETE /passengers/:id)
 * - Zero reliance on legacy browser mockData or localStorage as source of truth
 */
export default function TravelerProfilePage() {
  const { user, updateUser } = useSession();

  const [traveler, setTraveler] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Passenger Modal State
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState(null);

  // Action Notification State
  const [actionMessage, setActionMessage] = useState(null);

  // Secondary Warning State for optional passenger list
  const [passengersWarning, setPassengersWarning] = useState(null);

  const travelerId = Number(user?.travelerId || user?.traveler_id || user?.id);

  const loadData = async (signal) => {
    if (!travelerId) {
      setLoading(false);
      setError('No authenticated traveler ID found. Please log in.');
      return;
    }

    setLoading(true);
    setError(null);
    setPassengersWarning(null);

    try {
      // Parallel loading: Traveler profile is required; passenger list is secondary
      const [travelerRes, passengersRes] = await Promise.allSettled([
        travelersApi.getById(travelerId, { signal }),
        passengersApi.getByTraveler(travelerId, { signal }),
      ]);

      if (signal?.aborted) return;

      // 1. Required: Traveler Profile
      if (travelerRes.status === 'fulfilled') {
        setTraveler(travelerRes.value);
      } else if (!travelerRes.reason?.isCancelled) {
        console.error('[TravelerProfilePage] Failed to load traveler profile:', travelerRes.reason);
        setError(travelerRes.reason?.message || 'Failed to load profile records from backend.');
      }

      // 2. Secondary: Saved Co-Travelers Master List
      if (passengersRes.status === 'fulfilled') {
        setPassengers(Array.isArray(passengersRes.value) ? passengersRes.value : []);
      } else if (!passengersRes.reason?.isCancelled) {
        console.warn('[TravelerProfilePage] Failed to load passengers:', passengersRes.reason);
        setPassengers([]);
        setPassengersWarning(
          passengersRes.reason?.message || 'Saved co-traveler records are temporarily unavailable.'
        );
      }
    } catch (err) {
      if (!err.isCancelled && !signal?.aborted) {
        console.error('[TravelerProfilePage] Failed to load profile data:', err);
        setError(err.message || 'Failed to load profile records from backend.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  // Dedicated retry for secondary passenger list
  const retryPassengers = async () => {
    try {
      setPassengersWarning(null);
      const data = await passengersApi.getByTraveler(travelerId);
      setPassengers(Array.isArray(data) ? data : []);
    } catch (err) {
      setPassengersWarning(err.message || 'Could not reach co-traveler service.');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [travelerId]);

  // Handler: Profile saved successfully
  const handleProfileSaved = (updatedTraveler) => {
    setTraveler(updatedTraveler);

    // Update session so header, sidebar, and hero banner update immediately
    if (updateUser) {
      updateUser({
        name: updatedTraveler.name,
        email: updatedTraveler.email,
        phone: updatedTraveler.phone,
        gender: updatedTraveler.gender,
        age: updatedTraveler.age,
      });
    }

    setActionMessage('Profile details updated successfully! Active session synchronized.');
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Handler: Passenger saved successfully (create or update)
  const handlePassengerSaved = (savedPassenger, isEdit) => {
    if (isEdit) {
      // Immutable update: Replace matching passenger in array
      setPassengers((prev) =>
        prev.map((p) => (p.passId === savedPassenger.passId ? savedPassenger : p))
      );
      setActionMessage(`Passenger "${savedPassenger.name}" updated successfully.`);
    } else {
      // Immutable update: Append new passenger to array
      setPassengers((prev) => [...prev, savedPassenger]);
      setActionMessage(`Passenger "${savedPassenger.name}" added to Master List.`);
    }

    setTimeout(() => setActionMessage(null), 4000);
  };

  // Handler: Delete saved passenger with confirmation
  const handleDeletePassenger = async (passenger) => {
    const confirmDelete = window.confirm(
      `Remove "${passenger.name}" (PASS #${passenger.passId}) from your saved passenger list?`
    );
    if (!confirmDelete) return;

    try {
      // Calls DELETE /passengers/:id (verified permitted for Traveler owner)
      await passengersApi.delete(passenger.passId);

      // Immutable state update
      setPassengers((prev) => prev.filter((p) => p.passId !== passenger.passId));
      setActionMessage(`Passenger "${passenger.name}" removed from Master List.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('[TravelerProfilePage] Delete passenger failed:', err);
      alert(`Could not delete passenger: ${err.message}`);
    }
  };

  return (
    <div className="traveler-profile-page">
      {/* Hero Profile Banner */}
      <div
        style={{
          background: 'var(--gradient, linear-gradient(135deg, #E8467C 0%, #F5A623 100%))',
          borderRadius: '20px',
          padding: '36px 32px',
          color: '#fff',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
          boxShadow: '0 10px 25px rgba(232, 70, 124, 0.25)',
        }}
      >
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.25)',
            border: '3px solid rgba(255, 255, 255, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            fontWeight: 800,
            backdropFilter: 'blur(8px)',
            flexShrink: 0,
          }}
        >
          {traveler?.name ? traveler.name[0].toUpperCase() : '👤'}
        </div>

        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>
              {traveler?.name || user?.name || 'Traveler'}
            </h2>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              TL00{travelerId}
            </span>
          </div>

          <p style={{ opacity: 0.9, fontSize: '14px', marginTop: '4px' }}>
            {traveler?.email || user?.email || 'traveler@globesync.com'}
          </p>

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>
              🧭 Traveler Account
            </span>
            <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>
              👥 {passengers.length} Saved Co-Travelers
            </span>
          </div>
        </div>
      </div>

      {/* Action Notification */}
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

      {/* Loading State */}
      {loading && (
        <div className="state-box">
          <div className="state-box-icon">👤</div>
          <h3 className="state-box-title">Loading your traveler profile records...</h3>
          <p className="state-box-text">Fetching account information from the backend...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
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
          <h4 style={{ fontSize: '17px', fontWeight: 800 }}>Failed to load profile</h4>
          <p style={{ fontSize: '14px', margin: '8px 0 16px' }}>{error}</p>
          <button type="button" onClick={() => loadData()} className="btn btn-primary">
            Retry Connection ↺
          </button>
        </div>
      )}

      {/* Two Column Layout: Profile Form & Saved Passengers */}
      {!loading && !error && traveler && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
            gap: '28px',
            alignItems: 'start',
          }}
        >
          {/* Personal Information & Password Form */}
          <ProfileForm
            traveler={traveler}
            onSaveSuccess={handleProfileSaved}
          />

          {/* Saved Passengers Master List Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {passengersWarning && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '12px',
                  color: '#92400e',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div>
                  <strong>⚠️ Notice:</strong> {passengersWarning}
                </div>
                <button
                  type="button"
                  onClick={retryPassengers}
                  className="btn btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    background: '#fff',
                    color: '#92400e',
                    border: '1px solid #fcd34d',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Retry Passengers ↺
                </button>
              </div>
            )}

            <PassengerList
              passengers={passengers}
              onEdit={(passenger) => {
                setEditingPassenger(passenger);
                setIsPassengerModalOpen(true);
              }}
              onDelete={handleDeletePassenger}
              onAddNew={() => {
                setEditingPassenger(null);
                setIsPassengerModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Controlled Passenger Add/Edit Modal */}
      <PassengerFormModal
        isOpen={isPassengerModalOpen}
        editingPassenger={editingPassenger}
        travelerId={travelerId}
        onSave={handlePassengerSaved}
        onClose={() => {
          setIsPassengerModalOpen(false);
          setEditingPassenger(null);
        }}
      />
    </div>
  );
}
