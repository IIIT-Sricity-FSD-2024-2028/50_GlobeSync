import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { passengersApi, tripsApi, agencyApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import PassengerModal from '../../components/agency/PassengerModal';

export default function AgencyPassengersPage() {
  const { user } = useSession();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [passengers, setPassengers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState(null);
  const [deletingPassenger, setDeletingPassenger] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Masked ID toggle set (by passId)
  const [unmaskedIds, setUnmaskedIds] = useState(new Set());

  // Non-blocking Toast state
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [passData, tripsData] = await Promise.all([
        passengersApi.getByAgency(agencyId, { signal }),
        tripsApi.getByAgency(agencyId, { signal }).catch(() => []),
      ]);

      if (!signal?.aborted) {
        setPassengers(Array.isArray(passData) ? passData : []);
        setTrips(Array.isArray(tripsData) ? tripsData : []);
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Failed to load agency passengers:', err);
        setError(err.message || 'Failed to load passengers roster from backend.');
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

  // Count trips booked for each passenger
  const tripCountByPassenger = useMemo(() => {
    const counts = new Map();
    trips.forEach((t) => {
      const pIds = t.passengerIds || [];
      pIds.forEach((pId) => {
        const id = Number(pId);
        counts.set(id, (counts.get(id) || 0) + 1);
      });
    });
    return counts;
  }, [trips]);

  const handleCreateOrUpdate = async (payload, passId) => {
    if (passId) {
      await passengersApi.update(passId, payload);
      showToast(`Passenger #${passId} updated successfully! ✓`);
    } else {
      await passengersApi.create(payload);
      showToast('New passenger saved to your agency roster! ✓');
    }
    await loadData();
  };

  const handleConfirmDelete = async () => {
    if (!deletingPassenger) return;
    const targetId = Number(deletingPassenger.passId || deletingPassenger.id);
    setDeleting(true);
    try {
      await passengersApi.delete(targetId);
      showToast(`Passenger #${targetId} removed from roster. ✓`);
      setDeletingPassenger(null);
      await loadData();
    } catch (err) {
      console.error('Delete passenger error:', err);
      showToast(`Delete failed: ${err.message || 'Cannot delete passenger'}`);
    } finally {
      setDeleting(false);
    }
  };

  const toggleMask = (passId) => {
    const id = Number(passId);
    setUnmaskedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maskDocNumber = (num, passId) => {
    if (!num) return '—';
    const id = Number(passId);
    if (unmaskedIds.has(id)) return num;
    if (num.length <= 4) return '****';
    return `${num.slice(0, 2)}****${num.slice(-2)}`;
  };

  const filteredPassengers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return passengers;
    return passengers.filter((p) => {
      const pid = Number(p.passId || p.id);
      return (
        p.name.toLowerCase().includes(search) ||
        String(pid).includes(search) ||
        (p.email || '').toLowerCase().includes(search) ||
        (p.phone || '').includes(search) ||
        (p.idNumber || '').toLowerCase().includes(search) ||
        (p.gender || '').toLowerCase().includes(search)
      );
    });
  }, [passengers, searchTerm]);

  return (
    <div className="agency-passengers-page" style={{ maxWidth: '1280px', margin: '0 auto' }}>
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
            Client Passenger Roster 👥
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Maintain customer identity details, masked document numbers, and dietary notes for offline travelers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingPassenger(null);
            setIsModalOpen(true);
          }}
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
          + Add New Passenger
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard
          title="Total Passengers in Roster"
          value={String(passengers.length)}
          subtitle="Saved client records"
          icon="👥"
        />
        <SummaryCard
          title="Active on Booked Trips"
          value={String(Array.from(tripCountByPassenger.values()).filter((c) => c > 0).length)}
          subtitle="Passengers with live itineraries"
          icon="📍"
        />
        <SummaryCard
          title="Adult Travelers"
          value={String(passengers.filter((p) => p.age >= 18).length)}
          subtitle="Age 18 and above"
          icon="🧑"
        />
        <SummaryCard
          title="Minor / Child Travelers"
          value={String(passengers.filter((p) => p.age < 18).length)}
          subtitle="Age under 18"
          icon="🧒"
        />
      </div>

      {/* Search Bar */}
      <div
        style={{
          padding: '14px 20px',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 300px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Search passengers by name, phone, email, or document number..."
            style={{
              width: '100%',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />
        </div>
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Passenger Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Loading passengers from backend...
        </div>
      ) : filteredPassengers.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '60px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '42px', marginBottom: '10px' }}>👥</div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
            No Passengers Found
          </h4>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px 0' }}>
            {passengers.length === 0
              ? 'Your agency passenger roster is currently empty.'
              : 'No passengers match your search keyword.'}
          </p>
          {passengers.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setEditingPassenger(null);
                setIsModalOpen(true);
              }}
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
              Add First Passenger →
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>
                <th style={{ padding: '14px 18px' }}>Passenger Name & Contact</th>
                <th style={{ padding: '14px 18px' }}>Age & Gender</th>
                <th style={{ padding: '14px 18px' }}>ID / Passport</th>
                <th style={{ padding: '14px 18px' }}>Special / Dietary Notes</th>
                <th style={{ padding: '14px 18px' }}>Booked Trips</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPassengers.map((p) => {
                const passId = Number(p.passId || p.id);
                const tripCount = tripCountByPassenger.get(passId) || 0;
                return (
                  <tr key={passId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {p.phone || 'No phone'} {p.email ? `· ${p.email}` : ''}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', color: '#334155' }}>
                      <div>{p.age} years old</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {p.gender} {p.dob ? `(DOB: ${p.dob})` : ''}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {p.idType || 'ID'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                        <span>{maskDocNumber(p.idNumber, passId)}</span>
                        {p.idNumber && (
                          <button
                            type="button"
                            onClick={() => toggleMask(passId)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '12px',
                            }}
                            title={unmaskedIds.has(passId) ? 'Mask Number' : 'Reveal Number'}
                          >
                            {unmaskedIds.has(passId) ? '🔒' : '👁️'}
                          </button>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', color: '#475569', maxWidth: '240px' }}>
                      {p.specialNotes ? (
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                          {p.specialNotes}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>None specified</span>
                      )}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          background: tripCount > 0 ? '#ecfdf5' : '#f1f5f9',
                          color: tripCount > 0 ? '#065f46' : '#64748b',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {tripCount} {tripCount === 1 ? 'Trip' : 'Trips'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPassenger(p);
                            setIsModalOpen(true);
                          }}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingPassenger(p)}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            color: '#991b1b',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create Passenger Modal */}
      {isModalOpen && (
        <PassengerModal
          isOpen={isModalOpen}
          passenger={editingPassenger}
          agencyId={agencyId}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPassenger(null);
          }}
          onSubmit={handleCreateOrUpdate}
        />
      )}

      {/* Delete Confirmation Modal (Clean React modal without window.confirm) */}
      {deletingPassenger && (
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
              maxWidth: '440px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                  Delete Passenger?
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {deletingPassenger.name} (#{deletingPassenger.passId || deletingPassenger.id})
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Are you sure you want to permanently remove <strong>{deletingPassenger.name}</strong> from your agency roster?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingPassenger(null)}
                disabled={deleting}
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
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
