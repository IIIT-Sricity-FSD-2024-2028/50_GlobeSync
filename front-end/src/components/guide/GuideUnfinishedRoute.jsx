import React from 'react';
import { Link } from 'react-router-dom';

/**
 * GuideUnfinishedRoute Component
 * Explicitly marks upcoming / unfinished guide routes with their planned specifications.
 * Fulfills the requirement: "Keep unfinished routes explicitly identified until implemented."
 */
export default function GuideUnfinishedRoute({
  title,
  icon = '🚧',
  description,
  plannedFeatures = [],
  apiEndpoints = [],
}) {
  return (
    <div className="guide-unfinished-wrapper">
      <div className="guide-unfinished-card">
        <div className="guide-unfinished-icon">{icon}</div>
        <div className="guide-unfinished-tag">Upcoming Stage — Unfinished Route</div>
        <h2 className="guide-unfinished-title">{title}</h2>
        <p className="guide-unfinished-desc">{description}</p>

        {(plannedFeatures.length > 0 || apiEndpoints.length > 0) && (
          <div className="guide-unfinished-specs">
            {plannedFeatures.length > 0 && (
              <div style={{ marginBottom: apiEndpoints.length > 0 ? '16px' : '0' }}>
                <h4>Planned Features (Next Stage):</h4>
                <ul>
                  {plannedFeatures.map((feat, idx) => (
                    <li key={idx}>{feat}</li>
                  ))}
                </ul>
              </div>
            )}

            {apiEndpoints.length > 0 && (
              <div>
                <h4>Contract Endpoints:</h4>
                <ul>
                  {apiEndpoints.map((ep, idx) => (
                    <li key={idx} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {ep}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="guide-unfinished-actions">
          <Link to="/guide/dashboard" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            ← Back to Guide Dashboard
          </Link>
          <Link to="/guide/profile" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Guide Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
