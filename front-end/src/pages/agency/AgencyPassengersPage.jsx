import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { passengersApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import PassengerModal from '../../components/agency/PassengerModal';

/**
 * AgencyPassengersPage
 * 
 * Manages the offline client passenger roster owned exclusively by this agency.
 * Enforces agency ownership scoping and provides full CRUD capabilities.
 */
export default function AgencyPassengersPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadPassengers = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await passengersApi.getByAgency(agencyId, { signal });
      if (!signal?.aborted && Array.isArray(data)) {
        setPassengers(data);
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
      loadPassengers(controller.signal);
    }
    return () => controller.abort();
  }, [agencyId]);

  const handleCreateOrUpdate = async (payload, passId) => {
    if (passId) {
      // Update
      await passengersApi.update(passId, payload);
      showToast(`Passenger #${passId} updated! ✓`);
    } else {
      // Create
      await passengersApi.create(payload);
      showToast('New passenger added to agency roster! ✓');
    }
    await loadPassengers();
  };

  const handleDelete = async (passId) => {
    if (!window.confirm(`Are you sure you want to remove passenger #${passId} from your agency roster?`)) {
      return;
    }
    setDeletingId(passId);
    try {
      await passengersApi.delete(passId);
      showToast(`Passenger #${passId} removed! ✓`);
      await loadPassengers();
    } catch (err) {
      console.error('Delete passenger error:', err);
      showToast(`Delete failed: ${err.message || 'Cannot delete passenger'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPassengers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return passengers;
    return passengers.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        String(p.passId).includes(search) ||
        p.gender.toLowerCase().includes(search) ||
        String(p.age).includes(search)
    );
  }, [passengers, searchTerm]);

  // Demographic stats
  const totalPassengers = passengers.length;
  const maleCount = passengers.filter((p) => p.gender?.toLowerCase() === 'male').length;
  const femaleCount = passengers.filter((p) => p.gender?.toLowerCase() === 'female').length;

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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Client Passenger Roster 👥
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Registered offline clients and travelers managed by <strong>{user?.businessName || 'Agency'}</strong> (Agency #{agencyId}).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingPassenger(null);
            setIsModalOpen(true);
          }}
          className="btn btn-primary"
          style={{
            background: 'linear-gradient(135deg, #19b6a6 0%, #0ea5e9 100%)',
            border: 'none',
            fontWeight: 700,
            padding: '10px 18px',
          }}
        >
          + Add Client Passenger
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard
          label="Total Passengers"
          value={loading ? '...' : totalPassengers}
          icon="👥"
          subtitle="Agency roster count"
          color="#19b6a6"
        />
        <SummaryCard
          label="Male Passengers"
          value={loading ? '...' : maleCount}
          icon="👨"
          subtitle="Verified clients"
          color="#3b82f6"
        />
        <SummaryCard
          label="Female Passengers"
          value={loading ? '...' : femaleCount}
          icon="👩"
          subtitle="Verified clients"
          color="#ec4899"
        />
        <SummaryCard
          label="Agency Ownership"
          value={`Agency #${agencyId}`}
          icon="🛡️"
          subtitle="Self-scoped & guarded"
          color="#10b981"
        />
      </div>

      {/* Main Roster Table */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
        {/* Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '16px',
          }}
        >
          <div style={{ minWidth: '260px', flex: '1 1 260px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search passengers by name, ID, gender..."
              className="form-control"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Showing <strong>{filteredPassengers.length}</strong> of {totalPassengers} passengers
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
            Loading passenger roster...
          </div>
        ) : filteredPassengers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>👥</div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              No passengers in roster
            </h4>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Add client passengers to start booking tour packages and earning commissions.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingPassenger(null);
                setIsModalOpen(true);
              }}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '14px', background: '#19b6a6', border: 'none' }}
            >
              + Add First Passenger
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Pass ID</th>
                  <th style={{ padding: '10px 12px' }}>Passenger Name</th>
                  <th style={{ padding: '10px 12px' }}>Age</th>
                  <th style={{ padding: '10px 12px' }}>Gender</th>
                  <th style={{ padding: '10px 12px' }}>Agency Scoping</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPassengers.map((p) => (
                  <tr key={p.passId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: 800, color: '#19b6a6' }}>
                      PAX#{p.passId}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                      {p.age} yrs
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: p.gender === 'Female' ? '#fdf2f8' : '#eff6ff',
                          color: p.gender === 'Female' ? '#db2777' : '#2563eb',
                        }}
                      >
                        {p.gender}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--muted)', fontSize: '12px' }}>
                      Agency #{p.agencyId}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/agency/book-package?passengerId=${p.passId}`)}
                          className="btn btn-sm"
                          style={{
                            background: '#f0fdfc',
                            color: '#0f766e',
                            border: '1px solid #99f6e4',
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          Book Tour
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPassenger(p);
                            setIsModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === p.passId}
                          onClick={() => handleDelete(p.passId)}
                          className="btn btn-sm"
                          style={{
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            padding: '4px 8px',
                            fontSize: '12px',
                          }}
                        >
                          {deletingId === p.passId ? '...' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Passenger Modal */}
      <PassengerModal
        isOpen={isModalOpen}
        passenger={editingPassenger}
        agencyId={agencyId}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
      />
    </div>
  );
}
