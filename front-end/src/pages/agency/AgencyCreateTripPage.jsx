import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import AgencyCreateTripWizard from '../../components/agency/AgencyCreateTripWizard';
import Toast from '../../components/common/Toast';

/**
 * AgencyCreateTripPage
 * 
 * Dedicated full-page route (/agency/create-trip) for the 4-step controlled
 * agency client trip creation wizard.
 */
export default function AgencyCreateTripPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);
  const commissionRate = Number(user?.commissionRate ?? 10.0);

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSuccess = (createdTrip) => {
    showToast(`Client Trip #${createdTrip.tripId} created successfully! Redirecting...`);
    setTimeout(() => {
      navigate('/agency/trips');
    }, 1500);
  };

  const handleCancel = () => {
    navigate('/agency/trips');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Breadcrumb / Top Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              color: '#0d9488',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0 0 6px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Back to Client Trips
          </button>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Create New Client Journey ✈️
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Build custom client itineraries, assign roster passengers, configure transit, and record platform commissions.
          </p>
        </div>

        <div
          style={{
            background: '#f0fdfa',
            border: '1px solid #99f6e4',
            borderRadius: '20px',
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#0f766e', fontWeight: 600 }}>Commission Tier:</span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0d9488' }}>{commissionRate}%</span>
        </div>
      </div>

      {/* Main 4-Step Wizard */}
      <AgencyCreateTripWizard
        agencyId={agencyId}
        commissionRate={commissionRate}
        showToast={showToast}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}

