import React from 'react';
import { Link } from 'react-router-dom';

/**
 * GuideQuickActions Component
 * Provides clean navigation shortcuts to all registered Guide portal workspaces.
 */
export default function GuideQuickActions() {
  const actions = [
    {
      title: 'Trip Requests',
      path: '/guide/requests',
      icon: '📥',
      description: 'Review new tour invitations, accept or decline incoming traveler requests.',
    },
    {
      title: 'Assigned Travelers',
      path: '/guide/travelers',
      icon: '👥',
      description: 'View travelers on your active itineraries and monitor day-by-day plans.',
    },
    {
      title: 'Completed Trips',
      path: '/guide/completed-trips',
      icon: '✅',
      description: 'Access tour history, past itineraries, and traveler reviews for finished tours.',
    },
    {
      title: 'Messages',
      path: '/guide/messages',
      icon: '💬',
      description: 'Coordinate in real-time with travelers, answer questions, and send itinerary notes.',
    },
    {
      title: 'Profile Settings',
      path: '/guide/profile',
      icon: '👤',
      description: 'Update your contact information, languages spoken, experience, and fee per trip.',
    },
  ];

  return (
    <div className="guide-quick-nav-section">
      <h3 className="guide-section-title">
        <span>⚡</span> Quick Navigation & Modules
      </h3>
      <div className="guide-nav-cards-grid">
        {actions.map((act) => (
          <Link key={act.path} to={act.path} className="guide-nav-card">
            <div>
              <div className="guide-nav-card-head">
                <span className="guide-nav-card-icon">{act.icon}</span>
                <span className="guide-nav-card-title">{act.title}</span>
              </div>
              <div className="guide-nav-card-desc">{act.description}</div>
            </div>
            <div className="guide-nav-card-link">
              Open Module →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
