import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  const values = [
    {
      icon: '🎯',
      title: 'Our Mission',
      desc: 'To provide a comprehensive platform that makes travel planning effortless, transparent, and enjoyable.',
    },
    {
      icon: '👥',
      title: 'Our Community',
      desc: 'Connecting travelers, guides, and service providers in one seamless, synchronized ecosystem.',
    },
    {
      icon: '⚡',
      title: 'Innovation',
      desc: 'Leveraging technology to create smarter, more efficient travel coordination and accounting solutions.',
    },
  ];

  const team = [
    { name: 'Koushik Chowdary', role: 'Founder & CEO', avatar: '👤' },
    { name: 'Ajith Reddy', role: 'Head of Operations', avatar: '👤' },
    { name: 'Jyotish', role: 'Lead Developer', avatar: '👤' },
    { name: 'Charan Subhash', role: 'Customer Success', avatar: '👤' },
  ];

  const milestones = [
    { year: '2024', label: 'Platform Launched' },
    { year: '2025', label: '1,000+ Users' },
    { year: '2026', label: 'Global Expansion' },
  ];

  return (
    <div className="about-page-root">
      {/* HERO BANNER */}
      <section
        style={{
          background: 'var(--gradient)',
          padding: '80px 24px',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <div style={{ maxWidth: '750px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '44px', fontWeight: 800, marginBottom: '16px' }}>
            About GlobeSync (TICP)
          </h1>
          <p style={{ fontSize: '17px', lineHeight: '1.7', opacity: 0.95 }}>
            We're on a mission to simplify travel planning and coordination for everyone,
            making dream trips accessible, transparent, and completely stress-free.
          </p>
        </div>
      </section>

      {/* CORE VALUES */}
      <section style={{ padding: '70px 24px', background: 'var(--soft)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 14px',
                background: '#ffeef5',
                color: 'var(--primary)',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '10px',
              }}
            >
              What Drives Us
            </span>
            <h2 style={{ fontSize: '32px', fontWeight: 800 }}>Core Values</h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {values.map((v) => (
              <div
                key={v.title}
                className="card"
                style={{
                  background: '#fff',
                  borderRadius: '16px',
                  padding: '36px 28px',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    background: 'var(--gradient)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    margin: '0 auto 20px',
                    color: '#fff',
                  }}
                >
                  {v.icon}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                  {v.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.7' }}>
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEET OUR TEAM */}
      <section style={{ padding: '70px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '48px' }}>
            Meet Our Team
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px',
            }}
          >
            {team.map((m) => (
              <div
                key={m.name}
                className="card"
                style={{
                  padding: '32px 20px',
                  borderRadius: '16px',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    background: 'var(--gradient)',
                    margin: '0 auto 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '34px',
                    color: '#fff',
                    opacity: 0.9,
                  }}
                >
                  {m.avatar}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
                  {m.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUR JOURNEY TIMELINE */}
      <section style={{ padding: '70px 24px', background: 'var(--soft)', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '48px' }}>
            Our Journey
          </h2>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
            {milestones.map((item) => (
              <div key={item.year} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'var(--gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '20px',
                    fontWeight: 800,
                    margin: '0 auto 14px',
                    boxShadow: '0 6px 20px rgba(232, 70, 124, 0.25)',
                  }}
                >
                  {item.year}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600 }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '56px' }}>
            <Link
              to="/signup/traveler"
              className="btn btn-primary"
              style={{ padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }}
            >
              Join GlobeSync Today →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
