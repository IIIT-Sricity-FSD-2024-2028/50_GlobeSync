import React, { useState, useEffect } from 'react';
import PassengerSelector from './PassengerSelector';
import AgencyTransportStep from './AgencyTransportStep';
import AgencyItineraryBuilder from './AgencyItineraryBuilder';
import { tripsApi, agencyApi } from '../../services/api';

export default function AgencyEditTripModal({
  isOpen,
  trip,
  agencyId,
  commissionRate = 1.5,
  onClose,
  onSuccess,
  showToast,
}) {
  if (!isOpen || !trip) return null;

  const [activeTab, setActiveTab] = useState('basics'); // 'basics' | 'transit' | 'itinerary'
  const [title, setTitle] = useState(trip.title || '');
  const [destination, setDestination] = useState(trip.destination || '');
  const [origin, setOrigin] = useState(trip.origin || 'New Delhi, India');
  const [startDate, setStartDate] = useState(trip.startDate || '');
  const [endDate, setEndDate] = useState(trip.endDate || '');
  const [budget, setBudget] = useState(String(trip.budget || ''));
  const [category, setCategory] = useState(trip.category || 'Family Vacation');
  const [notes, setNotes] = useState(trip.notes || '');

  // Passenger list
  const [selectedPassengerIds, setSelectedPassengerIds] = useState(
    trip.passengerIds || (trip.passengers ? trip.passengers.map((p) => p.passId) : [])
  );

  // Transport details
  const [transportType, setTransportType] = useState(trip.transportDetails?.transportType || 'Flight');
  const [carrier, setCarrier] = useState(trip.transportDetails?.carrier || '');
  const [carrierPrice, setCarrierPrice] = useState(trip.transportDetails?.carrierPrice || 7800);
  const [lodgingTier, setLodgingTier] = useState(trip.transportDetails?.lodgingTier || 'Deluxe');
  const [lodgingPrice, setLodgingPrice] = useState(trip.transportDetails?.lodgingPrice || 27500);

  // Itinerary & Guide
  const [itineraryDays, setItineraryDays] = useState(trip.itineraryDays || []);
  const [guideRequested, setGuideRequested] = useState(Boolean(trip.guideId));
  const [selectedGuideId, setSelectedGuideId] = useState(trip.guideId ? String(trip.guideId) : '');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const stayDays = (() => {
    if (!startDate || !endDate) return 1;
    const diff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  })();

  const handleSave = async (e) => {
    e.preventDefault();
    if (!destination.trim()) {
      setSaveError('Destination cannot be empty');
      return;
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setSaveError('End date cannot precede start date');
      return;
    }
    const bNum = parseFloat(budget);
    if (!budget || isNaN(bNum) || bNum < 0) {
      setSaveError('Please enter a valid budget amount');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        title: title.trim() || undefined,
        destination: destination.trim(),
        origin: origin.trim() || undefined,
        startDate,
        endDate,
        budget: bNum,
        category,
        notes: notes.trim() || undefined,
        passengerIds: selectedPassengerIds,
        travelersCount: Math.max(1, selectedPassengerIds.length),
        guideId: guideRequested && selectedGuideId ? Number(selectedGuideId) : null,
        transportDetails: {
          transportType,
          carrier,
          carrierPrice,
          lodgingTier,
          lodgingPrice,
        },
        itineraryDays,
      };

      // Try agencyApi.updateTrip, fallback to tripsApi.patch / update
      let updated;
      try {
        updated = await agencyApi.updateTrip(trip.tripId, payload);
      } catch {
        updated = await tripsApi.patch(trip.tripId, payload);
      }

      if (showToast) {
        showToast(`Trip #${trip.tripId} updated successfully! Ledger recalculated. ✓`);
      }
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      console.error('Update trip failed:', err);
      setSaveError(err.message || 'Failed to update trip details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Edit Client Trip #{trip.tripId}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Modify itinerary schedule, transit options, client passengers, and recalculated budget.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px', background: '#f8fafc' }}>
          {[
            { id: 'basics', label: '1. Basics & Passengers' },
            { id: 'transit', label: '2. Transit & Lodging' },
            { id: 'itinerary', label: '3. Daily Schedule & Guide' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #0d9488' : '2px solid transparent',
                fontWeight: activeTab === tab.id ? 800 : 600,
                color: activeTab === tab.id ? '#0d9488' : '#64748b',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {saveError && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              ⚠️ {saveError}
            </div>
          )}

          {activeTab === 'basics' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Trip Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Destination *
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Departure City
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Budget (₹) *
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Passenger Selector */}
              <PassengerSelector
                agencyId={agencyId}
                selectedPassengerIds={selectedPassengerIds}
                onSelectPassengers={(ids) => setSelectedPassengerIds(ids)}
                onChange={(ids) => setSelectedPassengerIds(ids)}
              />
            </div>
          )}

          {activeTab === 'transit' && (
            <AgencyTransportStep
              origin={origin}
              destination={destination}
              transportType={transportType}
              carrier={carrier}
              carrierPrice={carrierPrice}
              lodgingTier={lodgingTier}
              passengerCount={selectedPassengerIds.length}
              stayDays={stayDays}
              onChange={(patch) => {
                if (patch.transportType !== undefined) setTransportType(patch.transportType);
                if (patch.carrier !== undefined) setCarrier(patch.carrier);
                if (patch.carrierPrice !== undefined) setCarrierPrice(patch.carrierPrice);
                if (patch.lodgingTier !== undefined) setLodgingTier(patch.lodgingTier);
                if (patch.lodgingPrice !== undefined) setLodgingPrice(patch.lodgingPrice);
              }}
            />
          )}

          {activeTab === 'itinerary' && (
            <AgencyItineraryBuilder
              startDate={startDate}
              endDate={endDate}
              itineraryDays={itineraryDays}
              onDaysChange={(newDays) => setItineraryDays(newDays)}
              guideRequested={guideRequested}
              onGuideRequestToggle={(val) => setGuideRequested(val)}
              selectedGuideId={selectedGuideId}
              onGuideChange={(id) => setSelectedGuideId(id)}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#0d9488',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

