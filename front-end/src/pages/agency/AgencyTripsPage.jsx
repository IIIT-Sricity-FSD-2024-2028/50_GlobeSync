import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { tripsApi, agencyApi, passengersApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import SummaryCard from '../../components/common/SummaryCard';
import AgencyCreateTripWizard from '../../components/agency/AgencyCreateTripWizard';
import AgencyEditTripModal from '../../components/agency/AgencyEditTripModal';
import AgencyCheckoutModal from '../../components/agency/AgencyCheckoutModal';
import AgencyCancelTripModal from '../../components/agency/AgencyCancelTripModal';

export default function AgencyTripsPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);
  const [agencyProfile, setAgencyProfile] = useState(null);
  const commissionRate = Number(agencyProfile?.commissionRate ?? user?.commissionRate ?? 10.0);

  const [trips, setTrips] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View state: 'list' | 'create'
  const [viewMode, setViewMode] = useState(searchParams.get('create') === 'true' ? 'create' : 'list');

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals state
  const [editingTrip, setEditingTrip] = useState(null);
  const [checkoutTrip, setCheckoutTrip] = useState(null);
  const [cancellingTrip, setCancellingTrip] = useState(null);

  // Non-blocking Toast state
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setViewMode('create');
    }
  }, [searchParams]);

  const handleToggleCreate = (mode) => {
    setViewMode(mode);
    if (mode === 'create') {
      setSearchParams({ create: 'true' });
    } else {
      setSearchParams({});
    }
  };

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [tripsData, passengersData, profData] = await Promise.all([
        tripsApi.getByAgency(agencyId, { signal }),
        passengersApi.getByAgency(agencyId, { signal }).catch(() => []),
        agencyApi.getProfile({ signal }).catch(() => null),
      ]);

      if (!signal?.aborted) {
        setTrips(Array.isArray(tripsData) ? tripsData : []);
        setPassengers(Array.isArray(passengersData) ? passengersData : []);
        if (profData) setAgencyProfile(profData);
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Failed to load agency trips:', err);
        setError(err.message || 'Failed to load trips from backend.');
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

  // Passenger map for fast lookup
  const passengerMap = useMemo(() => {
    const map = new Map();
    passengers.forEach((p) => {
      const id = Number(p.passId || p.id);
      map.set(id, p);
    });
    return map;
  }, [passengers]);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL') {
        const tStatus = (t.status || '').toUpperCase();
        if (statusFilter === 'CONFIRMED' && tStatus !== 'CONFIRMED' && tStatus !== 'ACTIVE') return false;
        if (statusFilter !== 'CONFIRMED' && tStatus !== statusFilter) return false;
      }

      // 2. Date Range Filter
      if (startDateFilter && t.startDate < startDateFilter) return false;
      if (endDateFilter && t.endDate > endDateFilter) return false;

      // 3. Search Query (destination, title, id, passenger names)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesDestination = (t.destination || '').toLowerCase().includes(query);
        const matchesTitle = (t.title || '').toLowerCase().includes(query);
        const matchesId = String(t.tripId).includes(query);

        // Check if any passenger on this trip matches query
        const matchesPassenger = (t.passengerIds || []).some((pId) => {
          const pass = passengerMap.get(Number(pId));
          return pass && pass.name.toLowerCase().includes(query);
        });

        if (!matchesDestination && !matchesTitle && !matchesId && !matchesPassenger) {
          return false;
        }
      }

      return true;
    });
  }, [trips, statusFilter, startDateFilter, endDateFilter, searchQuery, passengerMap]);

  // Counts
  const activeCount = trips.filter((t) => t.status === 'Active' || t.status === 'Confirmed').length;
  const planningCount = trips.filter((t) => t.status === 'Planning' || t.status === 'Pending').length;
  const completedCount = trips.filter((t) => t.status === 'Completed').length;
  const totalB2BRevenue = trips.reduce((sum, t) => sum + (Number(t.budget) || 0), 0);

  return (
    <div className="agency-trips-page" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
            color: '#fff',
            padding: '14px 22px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            zIndex: 9999,
            fontWeight: 700,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)',
          border: '1px solid #ccfbf1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Client Trips & Itineraries 🗺️
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Create bespoke client itineraries, coordinate transport & lodging, and oversee confirmed bookings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {viewMode === 'list' ? (
            <button
              type="button"
              onClick={() => handleToggleCreate('create')}
              style={{
                background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                padding: '11px 22px',
                borderRadius: '10px',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(13,148,136,0.3)',
              }}
            >
              + Create Client Trip (4-Step Wizard)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleToggleCreate('list')}
              style={{
                background: '#ffffff',
                color: '#0f766e',
                border: '1.5px solid #0d9488',
                fontWeight: 700,
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ← Back to Client Trips List
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* View Mode: Create Wizard */}
      {viewMode === 'create' ? (
        <AgencyCreateTripWizard
          agencyId={agencyId}
          commissionRate={commissionRate}
          showToast={showToast}
          onSuccess={() => {
            handleToggleCreate('list');
            loadData();
          }}
          onCancel={() => handleToggleCreate('list')}
        />
      ) : (
        /* View Mode: Trips List & Lifecycle Management */
        <div>
          {/* KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <SummaryCard
              title="Active & Confirmed"
              value={String(activeCount)}
              subtitle="Confirmed client trips"
              icon="📍"
            />
            <SummaryCard
              title="Planning & In-Draft"
              value={String(planningCount)}
              subtitle="Awaiting client payment"
              icon="📝"
            />
            <SummaryCard
              title="Completed Trips"
              value={String(completedCount)}
              subtitle="Settled itineraries"
              icon="✅"
            />
            <SummaryCard
              title="Gross Client Volume"
              value={`₹${totalB2BRevenue.toLocaleString()}`}
              subtitle="Total B2B trip value"
              icon="💼"
            />
          </div>

          {/* Search & Filter Bar */}
          <div
            style={{
              padding: '16px 20px',
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 280px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search by destination, title, trip ID, or passenger name..."
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Start:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>End:</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              {(searchQuery || startDateFilter || endDateFilter || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStartDateFilter('');
                    setEndDateFilter('');
                    setStatusFilter('ALL');
                  }}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              {['ALL', 'PLANNING', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => {
                const isSelected = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: isSelected ? '1px solid #0d9488' : '1px solid #cbd5e1',
                      background: isSelected ? '#0d9488' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#475569',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {st === 'ALL' ? 'All Trips' : st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trips Table / List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              Loading client trips from backend...
            </div>
          ) : filteredTrips.length === 0 ? (
            <div
              style={{
                padding: '60px',
                textAlign: 'center',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>🗺️</div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                No Client Trips Found
              </h4>
              <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '450px', margin: '0 auto 18px auto' }}>
                {trips.length === 0
                  ? 'Your agency has not created any client trips yet. Click "+ Create Client Trip" above to plan a bespoke client itinerary.'
                  : 'No trips match the active search filters. Try clearing or expanding your criteria.'}
              </p>
              {trips.length === 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('create')}
                  style={{
                    background: '#0d9488',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Plan First Client Trip →
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredTrips.map((t) => {
                const passengerList = (t.passengerIds || [])
                  .map((id) => passengerMap.get(Number(id))?.name)
                  .filter(Boolean);

                const isPayable = t.status === 'Planning' || t.status === 'Pending';
                const isCancellable = t.status !== 'Completed' && t.status !== 'Cancelled';

                return (
                  <div
                    key={t.tripId}
                    style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      padding: '18px 22px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Left Info */}
                    <div style={{ minWidth: '260px', flex: '1 1 320px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#0d9488', fontSize: '13px' }}>
                          #{t.tripId}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                          {t.title || t.destination}
                        </h4>
                        <StatusBadge status={t.status || 'Planning'} />
                      </div>

                      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                        📍 <strong>{t.destination}</strong> (From: {t.origin || 'New Delhi'}) · 📅 {t.startDate} to {t.endDate}
                      </div>

                      {passengerList.length > 0 ? (
                        <div style={{ fontSize: '12px', color: '#0f766e', marginTop: '4px' }}>
                          👥 <strong>Passengers ({t.travelersCount || passengerList.length}):</strong> {passengerList.join(', ')}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          👥 {t.travelersCount || 1} Client {t.travelersCount === 1 ? 'Passenger' : 'Passengers'}
                        </div>
                      )}

                      {t.transportDetails && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          🚆 Transit: {t.transportDetails.transportType || 'Flight'} ({t.transportDetails.carrier || 'Standard'}) · Lodging: {t.transportDetails.lodgingTier || 'Deluxe'}
                        </div>
                      )}
                    </div>

                    {/* Middle Financial Info */}
                    <div style={{ textAlign: 'right', minWidth: '160px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Gross Client Price</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                        ₹{Number(t.budget || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginTop: '2px' }}>
                        Earn: ₹{Math.round((Number(t.budget || 0) * commissionRate) / 100).toLocaleString()} ({commissionRate}%)
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* View / Edit Button */}
                      <button
                        type="button"
                        onClick={() => setEditingTrip(t)}
                        style={{
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Edit Itinerary
                      </button>

                      {/* Checkout / Pay Button (for Planning/Pending) */}
                      {isPayable && (
                        <button
                          type="button"
                          onClick={() => setCheckoutTrip(t)}
                          style={{
                            background: '#0d9488',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(13,148,136,0.25)',
                          }}
                        >
                          💳 Book & Pay
                        </button>
                      )}

                      {/* Cancel Button */}
                      {isCancellable && (
                        <button
                          type="button"
                          onClick={() => setCancellingTrip(t)}
                          style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {editingTrip && (
        <AgencyEditTripModal
          isOpen={Boolean(editingTrip)}
          trip={editingTrip}
          agencyId={agencyId}
          commissionRate={commissionRate}
          showToast={showToast}
          onClose={() => setEditingTrip(null)}
          onSuccess={() => loadData()}
        />
      )}

      {checkoutTrip && (
        <AgencyCheckoutModal
          isOpen={Boolean(checkoutTrip)}
          trip={checkoutTrip}
          agencyCommissionRate={commissionRate}
          showToast={showToast}
          onClose={() => setCheckoutTrip(null)}
          onSuccess={() => loadData()}
        />
      )}

      {cancellingTrip && (
        <AgencyCancelTripModal
          isOpen={Boolean(cancellingTrip)}
          trip={cancellingTrip}
          showToast={showToast}
          onClose={() => setCancellingTrip(null)}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}

