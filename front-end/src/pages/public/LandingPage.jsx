import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/landing.css';

export default function LandingPage() {
  const navigate = useNavigate();

  // Controlled form state for quick package search
  const [searchDestination, setSearchDestination] = useState('');
  const [searchType, setSearchType] = useState('All');
  const [searchDuration, setSearchDuration] = useState('All');

  // Named event handler for search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // For now, redirect to login or signup so the user can begin planning
    navigate('/signup/traveler');
  };

  // Popular destinations showcase data
  const destinations = [
    { name: 'Tokyo, Japan', price: '₹1,20,000', rating: '★ 4.9', img: '/destinations/tokyo.png' },
    { name: 'Paris, France', price: '₹1,45,000', rating: '★ 4.8', img: '/destinations/paris.png' },
    { name: 'Bali, Indonesia', price: '₹65,000', rating: '★ 4.9', img: '/destinations/bali.png' },
    { name: 'Swiss Alps', price: '₹1,80,000', rating: '★ 5.0', img: '/destinations/swiss_alps.png' },
    { name: 'Dubai, UAE', price: '₹85,000', rating: '★ 4.7', img: '/destinations/dubai.png' },
    { name: 'New York, USA', price: '₹1,60,000', rating: '★ 4.8', img: '/destinations/new_york.png' },
  ];

  // Core platform features
  const features = [
    {
      icon: '🗺️',
      title: 'Smart Itineraries',
      desc: 'Build dynamic day-by-day travel timelines with scheduled activities, locations, and notes.',
    },
    {
      icon: '🧭',
      title: 'Verified Guides',
      desc: 'Collaborate directly with certified local guides for authentic, safe travel experiences.',
    },
    {
      icon: '💬',
      title: 'Live Coordination',
      desc: 'Stay aligned with real-time direct messaging between travelers, guides, and agencies.',
    },
    {
      icon: '💳',
      title: 'Expense Tracking',
      desc: 'Keep track of stay, food, transport, and activity spending with full clarity.',
    },
    {
      icon: '🛡️',
      title: 'Dedicated Support',
      desc: 'Prompt customer care ticketing and refund processing when plans need adjustment.',
    },
    {
      icon: '🏢',
      title: 'Agency Resellers',
      desc: 'B2B portal allowing partner travel agencies to book trips and monitor commissions.',
    },
  ];

  // Role portal links
  const roles = [
    {
      name: 'Traveler Portal',
      icon: '🎒',
      desc: 'Plan custom itineraries, book packages, track expenses, and chat with your assigned guide.',
      link: '/login/traveler',
    },
    {
      name: 'Guide Portal',
      icon: '🧭',
      desc: 'Review incoming tour requests, manage assigned itineraries, and assist active travelers.',
      link: '/login/staff?role=guide',
    },
    {
      name: 'Agency Portal',
      icon: '🏢',
      desc: 'Manage offline client rosters, book tour packages in bulk, and track commission earnings.',
      link: '/login/agency',
    },
    {
      name: 'Support Portal',
      icon: '🎧',
      desc: 'Resolve traveler inquiries, address support tickets, and review refund requests.',
      link: '/login/staff?role=support',
    },
    {
      name: 'Admin Portal',
      icon: '📊',
      desc: 'Oversee packages, manage platform trips, audit reviews, and review performance reports.',
      link: '/login/staff?role=admin',
    },
    {
      name: 'Superuser Portal',
      icon: '👑',
      desc: 'System-wide governance: manage all accounts, revenue margins, and system configurations.',
      link: '/login/superuser',
    },
  ];

  return (
    <div className="landing-page-root">
      {/* HERO BANNER */}
      <section className="hero-banner">
        <div className="hero-inner">
          <div className="hero-pill">
            <span>✨</span> Next-Gen Travel Planning & Coordination
          </div>
          <h1 className="hero-headline">
            Explore the World with Complete Confidence
          </h1>
          <p className="hero-subtext">
            GlobeSync connects travelers, local guides, support staff, and agencies
            on a unified platform designed for unforgettable, stress-free journeys.
          </p>
          <div className="hero-actions">
            <Link to="/signup/traveler" className="btn-hero-primary">
              Start Planning Free →
            </Link>
            <a href="#destinations" className="btn-hero-secondary">
              Browse Packages
            </a>
          </div>
        </div>
      </section>

      {/* QUICK SEARCH WIDGET */}
      <section className="search-wrapper">
        <div className="search-box">
          <h3>🔍 Find Your Ideal Travel Package</h3>
          <form onSubmit={handleSearchSubmit} className="search-row">
            <div className="search-col">
              <label>Destination</label>
              <input
                type="text"
                placeholder="Where to? (e.g. Paris, Tokyo, Bali)"
                value={searchDestination}
                onChange={(e) => setSearchDestination(e.target.value)}
              />
            </div>
            <div className="search-col">
              <label>Experience</label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="Adventure">Adventure</option>
                <option value="Cultural">Cultural</option>
                <option value="Relaxation">Relaxation</option>
              </select>
            </div>
            <div className="search-col">
              <label>Duration</label>
              <select
                value={searchDuration}
                onChange={(e) => setSearchDuration(e.target.value)}
              >
                <option value="All">Any Duration</option>
                <option value="3-5">3 - 5 Days</option>
                <option value="6-10">6 - 10 Days</option>
                <option value="10+">10+ Days</option>
              </select>
            </div>
            <div className="search-col">
              <button type="submit" className="btn-search-action">
                Search Trips
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="stats-strip">
        <div className="stat-box">
          <div className="stat-value">2,500+</div>
          <div className="stat-label">Trips Planned</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">150+</div>
          <div className="stat-label">Verified Guides</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">98.5%</div>
          <div className="stat-label">Satisfaction Rate</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">45+</div>
          <div className="stat-label">Destinations Worldwide</div>
        </div>
      </section>

      {/* CORE FEATURES */}
      <section id="features" className="features-section">
        <div className="section-head">
          <span className="pill-tag">Why GlobeSync</span>
          <h2 className="section-title-large">Everything You Need In One Place</h2>
          <p className="section-subtitle-muted">
            From itinerary drafting to guided tour execution and post-trip accounting,
            GlobeSync coordinates every detail.
          </p>
        </div>

        <div className="features-grid-cards">
          {features.map((item) => (
            <div key={item.title} className="feature-box">
              <div className="feature-badge-icon">{item.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                {item.title}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* POPULAR DESTINATIONS */}
      <section id="destinations" className="destinations-section">
        <div className="section-head">
          <span className="pill-tag">Featured Destinations</span>
          <h2 className="section-title-large">Top Curated Packages</h2>
          <p className="section-subtitle-muted">
            Hand-picked itineraries designed by domain travel experts and verified by local guides.
          </p>
        </div>

        <div className="destinations-cards-grid">
          {destinations.map((dest) => (
            <div key={dest.name} className="destination-item-card">
              <div
                className="destination-image-header"
                style={{ backgroundImage: `url(${dest.img})` }}
              >
                <span className="dest-badge-rating">{dest.rating}</span>
                <div className="dest-meta">
                  <div className="dest-title-text">{dest.name}</div>
                </div>
              </div>
              <div className="destination-body-footer">
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Starting from</span>
                  <div className="dest-price-tag">{dest.price}</div>
                </div>
                <Link to="/signup/traveler" className="btn-nav-login" style={{ padding: '6px 14px', fontSize: '13px' }}>
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ROLE PORTALS SECTION */}
      <section id="roles" className="features-section">
        <div className="section-head">
          <span className="pill-tag">Role-Based Access</span>
          <h2 className="section-title-large">Designed for Every Travel Stakeholder</h2>
          <p className="section-subtitle-muted">
            GlobeSync provides dedicated workspaces tailored to each participant's workflow.
          </p>
        </div>

        <div className="roles-grid-showcase">
          {roles.map((r) => (
            <div key={r.name} className="role-card-item">
              <div className="role-icon-box">{r.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                {r.name}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                {r.desc}
              </p>
              <Link to={r.link} className="btn-portal-action">
                Enter {r.name.replace(' Portal', '')} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{ background: 'var(--gradient)', padding: '70px 60px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '14px' }}>
          Ready to Start Your Next Journey?
        </h2>
        <p style={{ fontSize: '16px', maxWidth: '600px', margin: '0 auto 28px', color: 'rgba(255,255,255,0.9)' }}>
          Join thousands of travelers, certified guides, and agencies synchronizing their trips with GlobeSync.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Link
            to="/signup/traveler"
            className="btn-hero-primary"
            style={{ padding: '12px 28px' }}
          >
            Create Traveler Account
          </Link>
          <Link
            to="/login"
            className="btn-hero-secondary"
            style={{ padding: '12px 28px' }}
          >
            Role Login Gateway
          </Link>
        </div>
      </section>
    </div>
  );
}
