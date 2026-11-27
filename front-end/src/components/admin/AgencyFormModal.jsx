import React, { useState, useEffect } from 'react';
import { AdminDialog, Field, SelectField, FormActions, agencyStatuses } from './AdminUI';

/**
 * Initial empty state for a new agency creation form.
 */
const INITIAL_FORM_STATE = {
  businessName: '',
  contactEmail: '',
  contactPhone: '',
  password: '',
  status: 'approved',
  commissionRate: '',
};

/**
 * Basic RFC 5322-compliant email format check for user-friendly client feedback.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Standard international/domestic phone format check.
 */
const PHONE_REGEX = /^[+0-9\s\-()]{7,20}$/;

/**
 * AgencyFormModal
 *
 * Educational, fully controlled modal dialog for creating or updating travel partner agencies.
 *
 * Pedagogical Architecture:
 * 1. Mode Distinction (Create vs. Edit):
 *    - In Create mode, the administrator defines credentials (initial password), initial
 *      approval status, and optional negotiated commission rate.
 *    - In Edit mode, credentials and commission rate are intentionally separated to respect
 *      security boundaries and dedicated financial approval workflows.
 * 2. Controlled State & Reset:
 *    - Uses a `useEffect` keyed on the `agency` prop to synchronize form state whenever
 *      the modal is opened or the target agency changes.
 * 3. Client-Side Field Validation:
 *    - Validates inputs before dispatching API requests, rendering actionable error
 *      messages directly under the problematic input field.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is visible
 * @param {Object|null} props.agency - Target agency record (null when creating new)
 * @param {boolean} props.busy - True while API mutation is in-flight
 * @param {string|null} props.dialogError - Error message from backend response
 * @param {Function} props.onClose - Dismiss modal callback
 * @param {Function} props.onSave - Callback receiving sanitized payload { businessName, contactEmail, contactPhone, [password], [status], [commissionRate] }
 */
export default function AgencyFormModal({
  isOpen,
  agency,
  busy,
  dialogError,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(agency && agency.agencyId);

  // Form field state
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Field-level validation error tracking
  const [fieldErrors, setFieldErrors] = useState({});

  // Reset or populate form state whenever modal opens or active agency changes
  useEffect(() => {
    if (isOpen) {
      if (agency && agency.agencyId) {
        setFormData({
          businessName: agency.businessName || '',
          contactEmail: agency.contactEmail || '',
          contactPhone: agency.contactPhone || '',
          password: '',
          status: agency.status || 'approved',
          commissionRate: agency.commissionRate != null ? String(agency.commissionRate) : '',
        });
      } else {
        setFormData(INITIAL_FORM_STATE);
      }
      setFieldErrors({});
    }
  }, [isOpen, agency]);

  if (!isOpen) return null;

  /**
   * Universal change handler for controlled inputs.
   * Clears the field error for the active field on user interaction.
   */
  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  /**
   * Validates form fields according to GlobeSync domain rules.
   * Returns true if all fields are valid, false otherwise.
   */
  const validateForm = () => {
    const errors = {};

    // 1. Business Name validation: Required, min 3 characters
    const trimmedName = formData.businessName.trim();
    if (!trimmedName) {
      errors.businessName = 'Business name is required.';
    } else if (trimmedName.length < 3) {
      errors.businessName = 'Business name must be at least 3 characters long.';
    }

    // 2. Contact Email validation: Required, valid email format
    const trimmedEmail = formData.contactEmail.trim();
    if (!trimmedEmail) {
      errors.contactEmail = 'Contact email is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.contactEmail = 'Please provide a valid email address (e.g., agency@example.com).';
    }

    // 3. Contact Phone validation: Required, valid phone pattern
    const trimmedPhone = formData.contactPhone.trim();
    if (!trimmedPhone) {
      errors.contactPhone = 'Contact phone number is required.';
    } else if (!PHONE_REGEX.test(trimmedPhone)) {
      errors.contactPhone = 'Please provide a valid phone number (7-20 digits).';
    }

    // 4. Initial Password validation (Create mode only): Required, min 6 characters
    if (!isEditing) {
      if (!formData.password) {
        errors.password = 'Initial login password is required.';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters long.';
      }

      // 5. Commission Rate validation (Optional, but if given, must be 1.0% - 1.5%)
      if (formData.commissionRate !== '') {
        const rate = Number(formData.commissionRate);
        if (Number.isNaN(rate) || rate < 1.0 || rate > 1.5) {
          errors.commissionRate = 'Commission rate must be between 1.0% and 1.5%.';
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Submission handler: validates client-side, prepares sanitized payload,
   * and invokes the onSave coordinator callback.
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      businessName: formData.businessName.trim(),
      contactEmail: formData.contactEmail.trim(),
      contactPhone: formData.contactPhone.trim(),
    };

    if (!isEditing) {
      payload.password = formData.password;
      payload.status = formData.status;
      if (formData.commissionRate !== '') {
        payload.commissionRate = Number(formData.commissionRate);
      }
    }

    onSave(payload);
  };

  return (
    <AdminDialog
      title={isEditing ? `Edit Agency: ${agency.businessName}` : 'Register New Agency'}
      onClose={onClose}
      busy={busy}
      error={dialogError}
    >
      <form onSubmit={handleSubmit} noValidate>
        <Field
          id="agency-businessName"
          label="Business Name"
          name="businessName"
          value={formData.businessName}
          onChange={handleFieldChange}
          placeholder="e.g. Alpine Adventures Ltd."
          required
          disabled={busy}
          error={fieldErrors.businessName}
          helperText="Official registered business or agency title."
        />

        <Field
          id="agency-contactEmail"
          label="Contact Email"
          name="contactEmail"
          type="email"
          value={formData.contactEmail}
          onChange={handleFieldChange}
          placeholder="e.g. contact@alpineadventures.com"
          required
          disabled={busy}
          error={fieldErrors.contactEmail}
          helperText="Used for booking notifications and partner login."
        />

        <Field
          id="agency-contactPhone"
          label="Contact Phone"
          name="contactPhone"
          type="tel"
          value={formData.contactPhone}
          onChange={handleFieldChange}
          placeholder="e.g. +91 98765 43210"
          required
          disabled={busy}
          error={fieldErrors.contactPhone}
          helperText="Primary phone contact for operational dispatch."
        />

        {!isEditing && (
          <>
            <Field
              id="agency-password"
              label="Initial Password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleFieldChange}
              placeholder="Minimum 6 characters"
              required
              disabled={busy}
              error={fieldErrors.password}
              helperText="Agency will use this password to sign into the Partner Portal."
            />

            <SelectField
              id="agency-status"
              label="Initial Status"
              name="status"
              values={agencyStatuses}
              value={formData.status}
              onChange={handleFieldChange}
              disabled={busy}
              helperText="Only 'approved' agencies can immediately sign in."
            />

            <Field
              id="agency-commissionRate"
              label="Commission Rate (%)"
              name="commissionRate"
              type="number"
              min="1.0"
              max="1.5"
              step="0.01"
              value={formData.commissionRate}
              onChange={handleFieldChange}
              placeholder="1.0 to 1.5"
              disabled={busy}
              error={fieldErrors.commissionRate}
              helperText="Partner commission share (allowed range: 1.0% to 1.5%). Leave empty for default."
            />
          </>
        )}

        <FormActions
          busy={busy}
          onCancel={onClose}
          submitLabel={isEditing ? 'Save Changes' : 'Create Agency'}
        />
      </form>
    </AdminDialog>
  );
}
