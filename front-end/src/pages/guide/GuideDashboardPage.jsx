import React from 'react';
import { useSession } from '../../context/SessionContext';

export default function GuideDashboardPage() {
  const { user } = useSession();

  return (
    <div>
      <div className="card" style={{ padding: '28px', borderRadius: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
          Welcome, Guide {user?.name || ''}! 🧭
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Manage your assigned tours, review pending trip requests, and coordinate with travelers.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Guide ID</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>#{user?.guideId || user?.id}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Rating</div>
          <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#f59e0b' }}>★ {user?.rating || 4.8} / 5.0</div>
        </div>
        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Daily Rate</div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px', color: 'var(--primary)' }}>₹{user?.pricePerTrip?.toLocaleString('en-IN') || '5,500'}</div>
        </div>
      </div>
    </div>
  );
}
