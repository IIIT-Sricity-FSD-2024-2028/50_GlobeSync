import React, { useState, useEffect } from 'react';

/**
 * GuideProfileForm
 * A controlled form for editing a guide's own profile.
 *
 * Responsibilities:
 * - Initialises field values from the `profile` prop whenever it changes.
 * - Validates required fields and numeric ranges before submitting.
 * - Converts the languages textarea into a trimmed, de-duped string array.
 * - Omits password from the payload when the field is left blank.
 * - Never exposes rating or adminId as self-editable fields.
 * - Delegates the actual API call to the `onSave` callback; this component
 *   only manages form state, validation, and the data shape sent upward.
 *
 * Props:
 *   profile  : object  — current guide data from the API
 *   onSave   : (payload) => Promise<void>  — called with validated payload
 *   isSaving : bool    — true while parent is awaiting the PUT request
 *   saveError: string|null — error text from parent (network / 403 etc.)
 *   onCancel : () => void  — resets form to current profile values
 */
export default function GuideProfileForm({ profile, onSave, isSaving, saveError, onCancel }) {
  // ── Form field state ────────────────────────────────────────────────────
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [contact, setContact]         = useState('');
  // Languages are shown as a comma-separated string for easy editing.
  const [languagesRaw, setLanguagesRaw] = useState('');
  // Professional bio & specialties (real app guide features)
  const [bio, setBio]                 = useState('');
  const [specialtiesRaw, setSpecialtiesRaw] = useState('');
  const [availability, setAvailability] = useState('available');
  // Password fields — only sent when the guide types a new value.
  const [newPassword, setNewPassword]   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validation errors per field
  const [validationErrors, setValidationErrors] = useState({});

  // ── Seed form from profile prop ─────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    setName(profile.name || '');
    setEmail(profile.email || '');
    setContact(profile.contact || '');
    const langs = Array.isArray(profile.languages)
      ? profile.languages.join(', ')
      : (typeof profile.languages === 'string' ? profile.languages : '');
    setLanguagesRaw(langs);
    setBio(profile.bio || '');
    const specs = Array.isArray(profile.specialties)
      ? profile.specialties.join(', ')
      : (typeof profile.specialties === 'string' ? profile.specialties : '');
    setSpecialtiesRaw(specs);
    setAvailability(profile.availability || 'available');
    setNewPassword('');
    setConfirmPassword('');
    setValidationErrors({});
  }, [profile]);

  // ── Validation ──────────────────────────────────────────────────────────
  function validate() {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Name is required.';
    }

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (newPassword && newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters.';
    }

    if (newPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  }

  // ── Submit handler ──────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();

    const errors = validate();
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Build a clean array of languages: trim each, filter blank entries.
    const languages = languagesRaw
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    // Build clean array of specialties
    const specialties = specialtiesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Real App Contract:
    // Price per trip, experience, rating and adminId are fixed/verified by Admin and NOT self-editable by guide.
    const payload = {
      name: name.trim(),
      email: email.trim(),
      contact: contact.trim(),
      languages,
      bio: bio.trim(),
      specialties,
      availability,
    };

    // Only include password when the guide typed something new.
    if (newPassword) {
      payload.password = newPassword;
    }

    onSave(payload);
  }

  // ── Cancel resets to current profile ───────────────────────────────────
  function handleCancel() {
    setValidationErrors({});
    setNewPassword('');
    setConfirmPassword('');
    onCancel();
  }

  // ── Helper: field error display ─────────────────────────────────────────
  function FieldError({ name: fieldName }) {
    return validationErrors[fieldName]
      ? <span className="guide-profile-field-error">{validationErrors[fieldName]}</span>
      : null;
  }

  return (
    <form className="guide-profile-form" onSubmit={handleSubmit} noValidate>
      {/* Save error from parent (network / 403) */}
      {saveError && (
        <div className="guide-profile-save-error" role="alert">
          ⚠️ {saveError}
        </div>
      )}

      {/* ── Personal Information ─────────────────────────────────────── */}
      <fieldset className="guide-profile-fieldset">
        <legend className="guide-profile-legend">Personal Information</legend>

        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-name">
            Full Name <span className="guide-profile-required">*</span>
          </label>
          <input
            id="gp-name"
            type="text"
            className={`guide-profile-input${validationErrors.name ? ' invalid' : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
            maxLength={80}
          />
          <FieldError name="name" />
        </div>

        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-email">
            Email <span className="guide-profile-required">*</span>
          </label>
          <input
            id="gp-email"
            type="email"
            className={`guide-profile-input${validationErrors.email ? ' invalid' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSaving}
            maxLength={120}
          />
          <FieldError name="email" />
        </div>

        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-contact">
            Contact Number
          </label>
          <input
            id="gp-contact"
            type="tel"
            className="guide-profile-input"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            disabled={isSaving}
            maxLength={20}
          />
        </div>
      </fieldset>

      {/* ── Professional Information ─────────────────────────────────── */}
      <fieldset className="guide-profile-fieldset">
        <legend className="guide-profile-legend">Professional Information</legend>

        {/* Real App Parity: Certified Experience is Verified by Platform Admin (Read-Only for Guide) */}
        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-experience">
            Years of Experience <span style={{ color: '#15803d', fontWeight: 700, fontSize: '11px', marginLeft: '6px' }}>🛡️ Verified Credential</span>
          </label>
          <div
            style={{
              padding: '10px 14px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{profile?.experience != null ? `${profile.experience} years of verified tour experience` : 'Not specified'}</span>
            <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              ✓ Admin Authenticated
            </span>
          </div>
          <span className="guide-profile-hint">
            ℹ️ In production platforms, guide experience is authenticated by administrators during KYC. Contact admin to submit updated certifications.
          </span>
        </div>

        {/* Professional Bio / Introduction */}
        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-bio">
            Professional Bio & Tour Style
          </label>
          <textarea
            id="gp-bio"
            rows={3}
            className="guide-profile-input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={isSaving}
            placeholder="Tell travelers about yourself, your local knowledge, and what makes your tours unique..."
            maxLength={500}
            style={{ resize: 'vertical' }}
          />
          <span className="guide-profile-hint">
            Visible to travelers when browsing guides and reviewing tour offers.
          </span>
        </div>

        {/* Tour Specialties */}
        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-specialties">
            Tour Specialties & Focus Areas
          </label>
          <input
            id="gp-specialties"
            type="text"
            className="guide-profile-input"
            value={specialtiesRaw}
            onChange={(e) => setSpecialtiesRaw(e.target.value)}
            disabled={isSaving}
            placeholder="e.g. Heritage Walks, Culinary Tours, Architecture, Nature Photography"
          />
          <span className="guide-profile-hint">
            Separate specialties with commas.
          </span>
        </div>

        {/* Working Availability Status */}
        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-availability">
            Availability Status
          </label>
          <select
            id="gp-availability"
            className="guide-profile-input"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            disabled={isSaving}
          >
            <option value="available">🟢 Available for New Tours</option>
            <option value="on_tour">🔵 Currently on Tour</option>
            <option value="away">⚪ Away / On Leave</option>
          </select>
          <span className="guide-profile-hint">
            Signals whether you are actively accepting new tour assignments.
          </span>
        </div>

        {/* Price per Trip: Fixed Contract Rate (Admin-Managed) */}
        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-price">
            Contracted Price per Trip (₹) <span style={{ color: '#0369a1', fontWeight: 700, fontSize: '11px', marginLeft: '6px' }}>🔒 Contracted Platform Rate</span>
          </label>
          <div
            style={{
              padding: '10px 14px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {profile?.pricePerTrip != null
                ? `₹${Number(profile.pricePerTrip).toLocaleString('en-IN')} per trip`
                : 'Not set'}
            </span>
            <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              Fixed by Admin
            </span>
          </div>
          <span className="guide-profile-hint">
            ℹ️ Your tour guide compensation rate is contractually set by GlobeSync Administrators and cannot be modified by the guide. Contact your administrator to request a contract rate update.
          </span>
        </div>

        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-languages">
            Languages Spoken
          </label>
          <input
            id="gp-languages"
            type="text"
            className="guide-profile-input"
            value={languagesRaw}
            onChange={(e) => setLanguagesRaw(e.target.value)}
            disabled={isSaving}
            placeholder="e.g. English, Hindi, French"
          />
          <span className="guide-profile-hint">
            Separate languages with commas. Blank entries are removed automatically.
          </span>
        </div>
      </fieldset>

      {/* ── Security ─────────────────────────────────────────────────── */}
      <fieldset className="guide-profile-fieldset">
        <legend className="guide-profile-legend">Change Password</legend>
        <p className="guide-profile-hint guide-profile-hint-block">
          Leave blank to keep your current password. Password is never stored in your session.
        </p>

        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-newpwd">
            New Password
          </label>
          <input
            id="gp-newpwd"
            type="password"
            className={`guide-profile-input${validationErrors.newPassword ? ' invalid' : ''}`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isSaving}
            autoComplete="new-password"
          />
          <FieldError name="newPassword" />
        </div>

        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-confirmpwd">
            Confirm New Password
          </label>
          <input
            id="gp-confirmpwd"
            type="password"
            className={`guide-profile-input${validationErrors.confirmPassword ? ' invalid' : ''}`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSaving}
            autoComplete="new-password"
          />
          <FieldError name="confirmPassword" />
        </div>
      </fieldset>

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="guide-profile-actions">
        <button
          type="button"
          className="guide-profile-cancel-btn"
          onClick={handleCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="guide-profile-save-btn"
          disabled={isSaving}
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
