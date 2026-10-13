import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '../../context/SessionContext';
import { guidesApi } from '../../services/api';
import GuideProfileForm from '../../components/guide/GuideProfileForm';
import './guide.css';

/**
 * GuideProfilePage
 * Route: /guide/profile
 *
 * Data flow:
 * 1. On mount: GET /guides/:guideId  → sets `profile` state
 * 2. Renders read-only view by default; "Edit Profile" button switches to form mode
 * 3. GuideProfileForm gathers changes and calls handleSave(payload)
 * 4. handleSave: PUT /guides/:guideId with payload
 *    - On success: calls SessionContext.updateUser with safe public fields
 *      (name, email, contact, languages, experience, pricePerTrip)
 *      Password is NEVER written to session data
 *    - On failure: saves error text into saveError state; form stays open
 * 5. Cancel resets form fields to last loaded profile (no PUT called)
 *
 * Ownership:
 *   RolesGuard enforces PUT /guides/:id is only allowed when
 *   x-user-id matches the :id param for role=guide
 */
export default function GuideProfilePage() {
  const { user, updateUser } = useSession();
  const guideId = user?.guideId ?? user?.id;

  // ── Data state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ── Edit mode state ─────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const abortRef = useRef(null);

  // ── Load guide profile ──────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    if (!guideId) {
      setIsLoading(false);
      setLoadError('No active guide session. Please log in again.');
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await guidesApi.getById(guideId, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setProfile(data);
    } catch (err) {
      if (err.isCancelled || controller.signal.aborted) return;
      setLoadError(err.message || 'Failed to load profile. Please try again.');
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [guideId]);

  useEffect(() => {
    loadProfile();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadProfile]);

  // ── Save handler — called by GuideProfileForm with a validated payload ──
  async function handleSave(payload) {
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      const updated = await guidesApi.update(guideId, payload);

      // Update local profile display with the response
      setProfile(updated);

      // Sync safe public fields into SessionContext.
      // Password is intentionally excluded — never stored in session.
      const sessionFields = {
        name:         updated.name,
        email:        updated.email,
        contact:      updated.contact,
        languages:    updated.languages,
        experience:   updated.experience,
        pricePerTrip: updated.pricePerTrip,
      };
      updateUser(sessionFields);

      setSaveSuccess(true);
      setIsEditing(false);
    } catch (err) {
      if (err.isCancelled) return;
      setSaveError(err.message || 'Save failed. Check your input or permissions.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Cancel: revert form to last loaded profile ──────────────────────────
  function handleCancel() {
    setSaveError(null);
    setIsEditing(false);
  }

  // ── Refresh: reload from backend ────────────────────────────────────────
  function handleRefresh() {
    setSaveSuccess(false);
    loadProfile();
  }

  // ── Read-only field formatters ──────────────────────────────────────────
  function formatExperience(val) {
    if (val === undefined || val === null) return 'Not specified';
    return `${val} year${val === 1 ? '' : 's'}`;
  }

  function formatPrice(val) {
    if (val === undefined || val === null) return 'Not set';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  }

  function formatRating(val) {
    const n = Number(val);
    if (val === undefined || val === null || Number.isNaN(n)) return 'Not rated yet';
    return `★ ${n.toFixed(1)} / 5.0`;
  }

  function formatLanguages(langs) {
    if (Array.isArray(langs) && langs.length > 0) return langs.join(', ');
    return 'None listed';
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="guide-container">

      {/* Header */}
      <div className="guide-welcome-card">
        <div>
          <h1 className="guide-welcome-title">👤 My Profile</h1>
          <p className="guide-welcome-subtitle">
            View and update your personal and professional information.
          </p>
        </div>
        <div className="guide-header-actions">
          <button
            type="button"
            className="guide-refresh-btn"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Reload profile from backend"
          >
            <span>🔄</span>
            <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Success banner */}
      {saveSuccess && (
        <div className="guide-profile-success-banner" role="status">
          ✅ Profile updated successfully.
        </div>
      )}

      {/* Load error */}
      {loadError && (
        <div className="guide-error-banner">
          <div className="guide-error-text">
            <span>⚠️</span>
            <span>{loadError}</span>
          </div>
          <button type="button" className="guide-retry-btn" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && !loadError && (
        <div className="guide-state-card">
          <div className="guide-spinner" />
          <div className="guide-state-label">Loading profile…</div>
        </div>
      )}

      {/* Main content — shown when profile is loaded */}
      {!isLoading && profile && (
        <div className="guide-profile-page-body">

          {/* ── Read-only view ──────────────────────────────────────── */}
          {!isEditing && (
            <div className="guide-profile-view-card">
              {/* Card header row */}
              <div className="guide-profile-view-header">
                <div className="guide-profile-view-avatar" aria-hidden="true">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="guide-profile-view-identity">
                  <h2 className="guide-profile-view-name">{profile.name}</h2>
                  <span className="guide-profile-view-meta">
                    Guide #{guideId} &nbsp;·&nbsp; {formatRating(profile.rating)}
                  </span>
                </div>
                <button
                  type="button"
                  className="guide-profile-edit-btn"
                  onClick={() => { setSaveSuccess(false); setIsEditing(true); }}
                >
                  ✏️ Edit Profile
                </button>
              </div>

              {/* Read-only detail grid */}
              <div className="guide-profile-detail-grid">
                <ProfileField label="Email"            value={profile.email || '—'} />
                <ProfileField label="Contact"          value={profile.contact || '—'} />
                <ProfileField label="Experience"       value={formatExperience(profile.experience)} />
                <ProfileField label="Price per Trip"   value={formatPrice(profile.pricePerTrip)} />
                <ProfileField label="Languages Spoken" value={formatLanguages(profile.languages)} wide />
              </div>

              {/* Read-only note about admin-managed fields */}
              <p className="guide-profile-admin-note">
                ℹ️ Rating is managed by your administrator and cannot be changed here.
              </p>
            </div>
          )}

          {/* ── Edit form ───────────────────────────────────────────── */}
          {isEditing && (
            <div className="guide-profile-form-card">
              <h2 className="guide-profile-form-title">Edit Profile</h2>
              <GuideProfileForm
                profile={profile}
                onSave={handleSave}
                isSaving={isSaving}
                saveError={saveError}
                onCancel={handleCancel}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Small presentational helper for read-only field rows */
function ProfileField({ label, value, wide = false }) {
  return (
    <div className={`guide-profile-field-box${wide ? ' wide' : ''}`}>
      <span className="guide-profile-field-label">{label}</span>
      <span className="guide-profile-field-value">{value}</span>
    </div>
  );
}
