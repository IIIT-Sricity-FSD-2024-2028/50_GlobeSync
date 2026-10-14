import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { tripsApi, guidesApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';

/**
 * AgencyItineraryPage
 * 
 * Custom Trip and Itinerary planner for agency partners.
 * Allows agencies to create custom trip itineraries for clients and assign tour guides.
 */
export default function AgencyItineraryPage() {
  const { user } = useSession();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [trips, setTrips] = useState([]);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedGuideId, setSelectedGuideId] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [tripsRes, guidesRes] = await Promise.allSettled([
        tripsApi.getByAgency(agencyId, { signal }),
        guidesApi.getAll({ signal }),
      ]);

      if (signal?.aborted) return;

      if (tripsRes.status === 'fulfilled' && Array.isArray(tripsRes.value)) {
        setTrips(tripsRes.value);
      }
      if (guidesRes.status === 'fulfilled' && Array.isArray(guidesRes.value)) {
        setGuides(guidesRes.value);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(err.message || 'Failed to load itineraries.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (agencyId) {
      loadData(controller.signal);
    }
    return () => controller.abort();
  }, [agencyId]);

  const validate = () => {
    const errs = {};
    if (!destination.trim()) errs.destination = 'Destination is required';
    if (!startDate) errs.startDate = 'Start date is required';
    if (!endDate) errs.endDate = 'End date is required';
    else if (startDate && new Date(endDate) < new Date(startDate)) {
      errs.endDate = 'End date cannot precede start date';
    }
    const bNum = parseFloat(budget);
    if (!budget || isNaN(bNum) || bNum <= 0) {
      errs.budget = 'Please enter a valid budget amount';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        agencyId,
        destination: destination.trim(),
        startDate,
        endDate,
        budget: parseFloat(budget),
        guideId: selectedGuideId ? Number(selectedGuideId) : undefined,
        status: 'Confirmed',
      };

      await tripsApi.create(payload);
      showToast('Custom itinerary successfully planned! ✓');
      // Reset form
      setDestination('');
      setStartDate('');
      setEndDate('');
      setBudget('');
      setSelectedGuideId('');
      setFormErrors({});
      await loadData();
    } catch (err) {
      console.error('Failed to create trip:', err);
      setSubmitError(err.message || 'Failed to create trip. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#19b6a6',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontWeight: 700,
            fontSize: '14px',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfc 100%)',
          border: '1px solid var(--border)',
        }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Custom Trip & Itinerary Planner 🗺️
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Plan bespoke client itineraries, set custom travel budgets, and coordinate guide assignments.
        </p>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Grid: Form on Left, List on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '24px', alignItems: 'start' }}>
        {/* Creator Form */}
        <div className="card" style={{ padding: '28px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px' }}>
            Plan Custom Trip for Client
          </h3>

          {submitError && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              ⚠️ {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Destination *
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Switzerland Alps & Geneva"
                className="form-control"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: formErrors.destination ? '1px solid #ef4444' : '1px solid #cbd5e1', fontSize: '14px' }}
              />
              {formErrors.destination && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {formErrors.destination}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: formErrors.startDate ? '1px solid #ef4444' : '1px solid #cbd5e1', fontSize: '14px' }}
                />
                {formErrors.startDate && (
                  <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {formErrors.startDate}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: formErrors.endDate ? '1px solid #ef4444' : '1px solid #cbd5e1', fontSize: '14px' }}
                />
                {formErrors.endDate && (
                  <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {formErrors.endDate}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Budget ($) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. 5000"
                  className="form-control"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: formErrors.budget ? '1px solid #ef4444' : '1px solid #cbd5e1', fontSize: '14px' }}
                />
                {formErrors.budget && (
                  <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {formErrors.budget}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Assign Tour Guide
                </label>
                <select
                  value={selectedGuideId}
                  onChange={(e) => setSelectedGuideId(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  <option value="">-- No Guide / Self-Guided --</option>
                  {guides.map((g) => (
                    <option key={g.guideId || g.id} value={g.guideId || g.id}>
                      {g.name} (${g.pricePerTrip || 1500}/trip)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #19b6a6 0%, #0ea5e9 100%)',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                borderRadius: '10px',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Creating Itinerary...' : 'Save Custom Itinerary ✓'}
            </button>
          </form>
        </div>

        {/* Existing Planned Trips List */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Agency Custom Trips ({trips.length})
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
              Loading planned trips...
            </div>
          ) : trips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🗺️</div>
              <p>No custom trips planned yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trips.map((t) => {
                const assignedGuide = guides.find((g) => (g.guideId || g.id) === t.guideId);

                return (
                  <div
                    key={t.tripId}
                    style={{
                      padding: '14px 16px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#19b6a6' }}>#{t.tripId}</span>
                        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                          {t.destination}
                        </span>
                        <StatusBadge status={t.status || 'Confirmed'} />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                        📅 {t.startDate} to {t.endDate} · Budget: ${t.budget}
                      </div>
                      {assignedGuide && (
                        <div style={{ fontSize: '12px', color: '#0f766e', marginTop: '2px' }}>
                          🧭 Guide: <strong>{assignedGuide.name}</strong> ({t.guideStatus || 'Pending Acceptance'})
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                        Agency #{agencyId}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
