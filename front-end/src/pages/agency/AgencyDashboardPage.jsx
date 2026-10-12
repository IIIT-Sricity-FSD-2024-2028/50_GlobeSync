import React from 'react';
import { useSession } from '../../context/SessionContext';

export default function AgencyDashboardPage() {
  const { user } = useSession();

  return (
    <div>
      <div className="card" style={{ padding: '28px', borderRadius: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
          {user?.businessName || 'Agency'} Partner Portal 🏢
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Manage your client passenger roster, book tour packages on their behalf, and track earned commissions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Agency ID</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>#{user?.agencyId || user?.id}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Commission Rate</div>
          <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--primary)' }}>{user?.commissionRate || 1.5}%</div>
        </div>
        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Account Status</div>
          <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '6px', color: '#10b981' }}>Approved Partner</div>
        </div>
      </div>
    </div>
  );
}
