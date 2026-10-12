import React from 'react';
import { Link } from 'react-router-dom';

export default function RoleSelectPage() {
  const roles = [
    {
      id: 'traveler',
      title: 'Traveler',
      icon: '🧭',
      desc: 'Explore destinations and manage your personal trips',
      features: [
        'Create custom itineraries',
        'Book transport & accommodation',
        'Connect with local guides',
        'Track expenses & bookings',
      ],
      btnText: 'Login as Traveler',
      btnClass: 'btn-traveler',
      btnBg: 'var(--gradient)',
      link: '/login/traveler',
      iconBg: '#fff0f5',
      iconColor: '#E8467C',
    },
    {
      id: 'guide',
      title: 'Guide',
      icon: '🗺️',
      desc: 'Manage itineraries and assist travelers during tours',
      features: [
        'Manage assigned travelers',
        'Real-time booking updates',
        'Track trip progress',
        'Automated payouts',
      ],
      btnText: 'Login as Guide',
      btnClass: 'btn-guide',
      btnBg: '#f28c5e',
      link: '/login/staff?role=guide',
      iconBg: '#fff5ef',
      iconColor: '#f28c5e',
    },
    {
      id: 'support',
      title: 'Support Staff',
      icon: '🎧',
      desc: 'Assist customers, manage inquiries, and resolve issues',
      features: [
        'Manage support tickets',
        'Process refund requests',
        'Customer communication',
        'Priority escalations',
      ],
      btnText: 'Login as Support',
      btnClass: 'btn-support',
      btnBg: 'linear-gradient(135deg, #f5a623 0%, #ffd359 100%)',
      btnTextColor: '#78350f',
      link: '/login/staff?role=support',
      iconBg: '#fffaf0',
      iconColor: '#f5a623',
    },
    {
      id: 'agency',
      title: 'Agency Partner',
      icon: '🏢',
      desc: 'Resell travel packages directly to offline clients',
      features: [
        'Manage offline passengers',
        'Book at retail price',
        'Track commission earned',
        'B2B reseller dashboard',
      ],
      btnText: 'Login as Agency',
      btnClass: 'btn-agency',
      btnBg: 'linear-gradient(135deg, #19b6a6 0%, #0ea5e9 100%)',
      link: '/login/agency',
      iconBg: '#f0fdfc',
      iconColor: '#19b6a6',
    },
    {
      id: 'admin',
      title: 'Administrator',
      icon: '🛡️',
      desc: 'Platform operations, package management, and trip audits',
      features: [
        'Package catalog CRUD',
        'Master booking inspection',
        'Trip oversight & status changes',
        'Review moderation',
      ],
      btnText: 'Admin Login →',
      btnClass: 'btn-admin',
      btnBorder: '1px solid #fbcfe8',
      btnTextColor: '#d946ef',
      btnBg: 'transparent',
      link: '/login/staff?role=admin',
      iconBg: '#fdf2f8',
      iconColor: '#d946ef',
    },
    {
      id: 'super',
      title: 'Super User',
      icon: '🔱',
      tag: '🛡️ Tier-1 · Restricted',
      desc: 'Full system control, monetization, and root permissions',
      features: [
        'Manage all accounts & roles',
        'Revenue & margin analytics',
        'Agency approvals & rates',
        'System audit & governance',
      ],
      btnText: '🔱 Super User Portal →',
      btnClass: 'btn-super',
      btnBg: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      link: '/login/superuser',
      iconBg: '#f0f0ff',
      iconColor: '#6366f1',
      isSpecial: true,
    },
  ];

  return (
    <div style={{ background: '#FDFBEA', minHeight: '90vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '1020px', margin: '0 auto', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '38px',
            fontWeight: 800,
            marginBottom: '10px',
            background: 'var(--gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Welcome to GlobeSync
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', marginBottom: '48px', fontWeight: 500 }}>
          Select your role to access your personalized workspace
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '24px',
            textAlign: 'left',
          }}
        >
          {roles.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{
                background: r.isSpecial ? 'linear-gradient(145deg, #faf9ff, #f5f3ff)' : '#fff',
                borderRadius: '20px',
                padding: '36px 28px',
                border: r.isSpecial ? '1.5px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(0, 0, 0, 0.04)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: r.iconBg,
                  color: r.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  marginBottom: '16px',
                }}
              >
                {r.icon}
              </div>

              {r.tag && (
                <div
                  style={{
                    background: '#f0f0ff',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: '20px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#6366f1',
                    marginBottom: '8px',
                  }}
                >
                  {r.tag}
                </div>
              )}

              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: r.iconColor }}>
                {r.title}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px', lineHeight: '1.5' }}>
                {r.desc}
              </p>

              <ul style={{ listStyle: 'none', marginBottom: '28px', width: '100%', flex: 1, padding: 0 }}>
                {r.features.map((feat) => (
                  <li
                    key={feat}
                    style={{
                      fontSize: '12px',
                      color: 'var(--muted)',
                      padding: '4px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>•</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={r.link}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  width: '100%',
                  background: r.btnBg,
                  color: r.btnTextColor || '#fff',
                  border: r.btnBorder || 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  textDecoration: 'none',
                  transition: 'opacity 0.2s',
                }}
              >
                {r.btnText}
              </Link>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '48px', fontSize: '14px', color: 'var(--muted)' }}>
          Don't have an account?{' '}
          <Link to="/signup/traveler" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
            Sign up as Traveler
          </Link>
          {' • '}
          <Link to="/signup/agency" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
            Register as Agency
          </Link>
        </div>
      </div>
    </div>
  );
}
