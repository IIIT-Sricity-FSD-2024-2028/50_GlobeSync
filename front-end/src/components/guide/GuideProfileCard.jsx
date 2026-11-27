import React from 'react';
import { Link } from 'react-router-dom';

/**
 * GuideProfileCard
 * Displays verified, read-only guide profile data on the dashboard.
 *
 * CONTRACT:
 * - Do not substitute invented ratings or prices when values are missing.
 * - pricePerTrip is labeled exactly as "Price per Trip", never "daily rate".
 */
export default function GuideProfileCard({ guide = {}, guideId }) {
  const displayId = guideId || guide.guideId || guide.id || '—';
  const name = guide.name || 'Verified Guide';
  const email = guide.email || '—';
  const contact = guide.contact || '—';

  const experience = guide.experience !== undefined && guide.experience !== null
    ? `${guide.experience} year${guide.experience === 1 ? '' : 's'}`
    : 'Not specified';

  // Rating: shown only when a real numeric value is present.
  const hasRating = guide.rating !== undefined && guide.rating !== null
    && !Number.isNaN(Number(guide.rating));
  const ratingText = hasRating
    ? `★ ${Number(guide.rating).toFixed(1)} / 5.0`
    : 'Not rated yet';

  // Price: labeled strictly as "Price per Trip".
  const hasPrice = guide.pricePerTrip !== undefined && guide.pricePerTrip !== null
    && !Number.isNaN(Number(guide.pricePerTrip));
  const priceText = hasPrice
    ? `₹${Number(guide.pricePerTrip).toLocaleString('en-IN')}`
    : 'Not set';

  // Languages: accept array or comma-separated string.
  const languagesList = Array.isArray(guide.languages)
    ? guide.languages
    : (typeof guide.languages === 'string' && guide.languages.trim()
        ? guide.languages.split(',').map((l) => l.trim()).filter(Boolean)
        : []);

  return (
    <div className="guide-profile-card">
      <div className="guide-profile-header">
        <div>
          <h3>
            <span>🧭</span> {name}
          </h3>
          <span className="guide-profile-card-meta">
            Verified Tour Guide • ID: #{displayId}
          </span>
        </div>
        <Link to="/guide/profile" className="btn btn-secondary guide-profile-card-link">
          View Full Profile →
        </Link>
      </div>

      <div className="guide-details-grid">
        <div className="guide-detail-box">
          <div className="guide-detail-label">Guide ID</div>
          <div className="guide-detail-value">#{displayId}</div>
        </div>

        <div className="guide-detail-box">
          <div className="guide-detail-label">Rating</div>
          <div className={`guide-detail-value${hasRating ? ' guide-rating-value' : ''}`}>
            {ratingText}
          </div>
        </div>

        <div className="guide-detail-box">
          {/* REQUIREMENT: Labeled as "Price per Trip", not a daily rate. */}
          <div className="guide-detail-label">Price per Trip</div>
          <div className={`guide-detail-value${hasPrice ? ' guide-price-value' : ''}`}>
            {priceText}
          </div>
        </div>

        <div className="guide-detail-box">
          <div className="guide-detail-label">Experience</div>
          <div className="guide-detail-value">{experience}</div>
        </div>

        <div className="guide-detail-box">
          <div className="guide-detail-label">Contact</div>
          <div className="guide-detail-value guide-detail-value-small">{contact}</div>
        </div>

        <div className="guide-detail-box">
          <div className="guide-detail-label">Email</div>
          <div className="guide-detail-value guide-detail-value-email">{email}</div>
        </div>

        <div className="guide-detail-box guide-detail-value-full-width">
          <div className="guide-detail-label">Languages Spoken</div>
          {languagesList.length > 0 ? (
            <div className="guide-languages-wrap">
              {languagesList.map((lang, idx) => (
                <span key={idx} className="guide-language-pill">
                  🗣️ {lang}
                </span>
              ))}
            </div>
          ) : (
            <div className="guide-no-languages-text">No languages listed</div>
          )}
        </div>
      </div>
    </div>
  );
}
