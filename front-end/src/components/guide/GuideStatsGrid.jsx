import React from 'react';
import { Link } from 'react-router-dom';

/**
 * GuideStatsGrid Component
 * Displays the 4 primary assignment metrics returned by dashboardApi.getGuide(guideId):
 * - assignedTripsCount
 * - completedTripsCount
 * - pendingRequests
 * - messagesCount
 */
export default function GuideStatsGrid({ stats = {} }) {
  const {
    assignedTripsCount = 0,
    completedTripsCount = 0,
    pendingRequests = 0,
    messagesCount = 0,
  } = stats;

  const statItems = [
    {
      key: 'assigned',
      label: 'Assigned Trips',
      value: assignedTripsCount,
      icon: '🗺️',
      colorClass: 'guide-stat-icon-assigned',
      path: '/guide/travelers',
      description: 'Active tours assigned to you',
    },
    {
      key: 'completed',
      label: 'Completed Trips',
      value: completedTripsCount,
      icon: '✅',
      colorClass: 'guide-stat-icon-completed',
      path: '/guide/completed-trips',
      description: 'Past tours successfully guided',
    },
    {
      key: 'pending',
      label: 'Pending Requests',
      value: pendingRequests,
      icon: '📥',
      colorClass: 'guide-stat-icon-pending',
      path: '/guide/requests',
      description: 'Requests awaiting confirmation',
    },
    {
      key: 'messages',
      label: 'Messages',
      value: messagesCount,
      icon: '💬',
      colorClass: 'guide-stat-icon-messages',
      path: '/guide/messages',
      description: 'Total traveler coordination messages',
    },
  ];

  return (
    <div className="guide-stats-grid">
      {statItems.map((item) => (
        <Link
          key={item.key}
          to={item.path}
          className="guide-stat-card"
          title={`Click to view ${item.label}`}
        >
          <div className="guide-stat-info">
            <span className="guide-stat-label">{item.label}</span>
            <span className="guide-stat-value">{item.value}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {item.description}
            </span>
          </div>
          <div className={`guide-stat-icon-wrapper ${item.colorClass}`}>
            <span>{item.icon}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
