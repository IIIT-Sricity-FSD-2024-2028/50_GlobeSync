import React from 'react';
import { useSession } from '../../context/SessionContext';

export default function AdminDashboardPage() {
  const { user, role } = useSession();

  return (
    <div>
      <div className="card" style={{ padding: '28px', borderRadius: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
          Admin Operations Dashboard 📊
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Welcome, {user?.name || 'Administrator'} ({role}). Operational management for bookings, packages, and trips.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Admin ID</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>#{user?.adminId || user?.id}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Role Scope</div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '6px', color: '#6366f1' }}>Operational Admin</div>
        </div>
        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Email</div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{user?.email}</div>
        </div>
      </div>
    </div>
  );
}
