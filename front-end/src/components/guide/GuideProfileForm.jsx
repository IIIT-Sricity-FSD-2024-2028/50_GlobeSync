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
  const [experience, setExperience]   = useState('');
  const [pricePerTrip, setPricePerTrip] = useState('');
  // Languages are shown as a comma-separated string for easy editing.
  const [languagesRaw, setLanguagesRaw] = useState('');
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
    setExperience(profile.experience !== undefined && profile.experience !== null
      ? String(profile.experience) : '');
    setPricePerTrip(profile.pricePerTrip !== undefined && profile.pricePerTrip !== null
      ? String(profile.pricePerTrip) : '');
    const langs = Array.isArray(profile.languages)
      ? profile.languages.join(', ')
      : (typeof profile.languages === 'string' ? profile.languages : '');
    setLanguagesRaw(langs);
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

    const expNum = parseFloat(experience);
    if (experience.trim() !== '' && (Number.isNaN(expNum) || expNum < 0)) {
      errors.experience = 'Experience must be a number ≥ 0.';
    }

    const priceNum = parseFloat(pricePerTrip);
    if (pricePerTrip.trim() !== '' && (Number.isNaN(priceNum) || priceNum < 0)) {
      errors.pricePerTrip = 'Price per trip must be a number ≥ 0.';
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

    // Construct only the fields the DTO accepts for guide self-edit.
    // rating and adminId are intentionally excluded.
    const payload = {
      name: name.trim(),
      email: email.trim(),
      contact: contact.trim(),
      languages,
    };

    if (experience.trim() !== '') {
      payload.experience = Number(experience);
    }

    if (pricePerTrip.trim() !== '') {
      payload.pricePerTrip = Number(pricePerTrip);
    }

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

        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-experience">
            Years of Experience
          </label>
          <input
            id="gp-experience"
            type="number"
            className={`guide-profile-input${validationErrors.experience ? ' invalid' : ''}`}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            disabled={isSaving}
            min="0"
            step="1"
          />
          <FieldError name="experience" />
        </div>

        <div className="guide-profile-field">
          <label className="guide-profile-label" htmlFor="gp-price">
            Price per Trip (₹)
          </label>
          <input
            id="gp-price"
            type="number"
            className={`guide-profile-input${validationErrors.pricePerTrip ? ' invalid' : ''}`}
            value={pricePerTrip}
            onChange={(e) => setPricePerTrip(e.target.value)}
            disabled={isSaving}
            min="0"
            step="1"
          />
          <FieldError name="pricePerTrip" />
          <span className="guide-profile-hint">
            This is your fee per individual trip, not a daily rate.
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
