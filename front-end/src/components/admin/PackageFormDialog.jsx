import React, { useState, useEffect } from 'react';
import { AdminDialog, Field, FormActions } from './AdminUI';

/**
 * PackageFormDialog
 *
 * Controlled modal form for creating or editing travel packages.
 *
 * Responsibilities:
 * - Owns draft input values and field-level validation errors.
 * - Explains validation constraints beyond basic HTML required/min checks:
 *   1. Name: Requires a meaningful title (min 3 characters, not only whitespace).
 *   2. Destinations: Travel packages must target at least one named destination.
 *   3. Budget: Must be a strictly positive number (packages cannot be ₹0 or negative).
 *   4. Duration: Must be a positive integer representing full travel days (min 1 day).
 * - Implements immutable state updates with clear callback names.
 * - Displays API-level mutation errors directly inside the active dialog.
 */

const BLANK_FORM = {
  name: '',
  destinations: '',
  budget: '',
  duration: '',
  description: '',
  highlights: '',
  image: '',
};

export default function PackageFormDialog({
  isOpen,
  packageData = null,
  isBusy = false,
  error = null,
  onClose,
  onSubmit,
}) {
  const isEditing = Boolean(packageData && packageData.packageId);

  // Controlled form values state
  const [values, setValues] = useState(BLANK_FORM);

  // Field-level validation error messages: { [field]: string }
  const [fieldErrors, setFieldErrors] = useState({});

  // Reset form values whenever modal opens or packageData changes
  useEffect(() => {
    if (isOpen) {
      if (packageData) {
        setValues({
          name: packageData.name || '',
          destinations: packageData.destinations || '',
          budget: packageData.budget != null ? String(packageData.budget) : '',
          duration: packageData.duration != null ? String(packageData.duration) : '',
          description: packageData.description || '',
          highlights: packageData.highlights || '',
          image: packageData.image || '',
        });
      } else {
        setValues(BLANK_FORM);
      }
      setFieldErrors({});
    }
  }, [isOpen, packageData]);

  if (!isOpen) return null;

  /**
   * Field validation rule definitions.
   * Explains why each constraint exists in the business domain.
   */
  const validate = () => {
    const errors = {};

    // 1. Package Name
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      errors.name = 'Package name is required.';
    } else if (trimmedName.length < 3) {
      errors.name = 'Package name must be at least 3 characters long.';
    }

    // 2. Destinations
    const trimmedDestinations = values.destinations.trim();
    if (!trimmedDestinations) {
      errors.destinations = 'Please specify at least one destination.';
    }

    // 3. Budget (Positive Number)
    const numericBudget = Number(values.budget);
    if (!values.budget && values.budget !== 0) {
      errors.budget = 'Budget amount is required.';
    } else if (Number.isNaN(numericBudget) || numericBudget <= 0) {
      errors.budget = 'Budget must be a positive number greater than ₹0.';
    }

    // 4. Duration (Integer >= 1 day)
    const numericDuration = Number(values.duration);
    if (!values.duration && values.duration !== 0) {
      errors.duration = 'Tour duration is required.';
    } else if (Number.isNaN(numericDuration) || !Number.isInteger(numericDuration) || numericDuration < 1) {
      errors.duration = 'Duration must be a whole number of days (at least 1 day).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Immutable field change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field-level error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // Form submit coordinator
  const handleSubmit = (e) => {
    e.preventDefault();

    const isValid = validate();
    if (!isValid) return;

    // Prepare clean typed payload for API
    const payload = {
      name: values.name.trim(),
      destinations: values.destinations.trim(),
      budget: Number(values.budget),
      duration: Number(values.duration),
      description: values.description.trim(),
      highlights: values.highlights.trim(),
      image: values.image.trim(),
    };

    onSubmit(payload);
  };

  const dialogTitle = isEditing
    ? `Edit Package: ${packageData.name || `#${packageData.packageId}`}`
    : 'Create New Tour Package';

  return (
    <AdminDialog
      title={dialogTitle}
      onClose={onClose}
      busy={isBusy}
      error={error}
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* Package Title */}
        <Field
          label="Package Title"
          name="name"
          placeholder="e.g. Himalayan Adventure"
          value={values.name}
          onChange={handleInputChange}
          error={fieldErrors.name}
          helperText="A descriptive public title shown on the traveler catalog."
          required
          disabled={isBusy}
        />

        {/* Destinations */}
        <Field
          label="Destinations"
          name="destinations"
          placeholder="e.g. Manali, Rohtang, Solang"
          value={values.destinations}
          onChange={handleInputChange}
          error={fieldErrors.destinations}
          helperText="Comma-separated cities, landmarks, or regions included."
          required
          disabled={isBusy}
        />

        {/* Budget */}
        <Field
          label="Estimated Budget (INR)"
          name="budget"
          type="number"
          min="1"
          step="0.01"
          placeholder="e.g. 25000"
          value={values.budget}
          onChange={handleInputChange}
          error={fieldErrors.budget}
          helperText="Base total estimated cost per traveler in Indian Rupees."
          required
          disabled={isBusy}
        />

        {/* Duration */}
        <Field
          label="Duration (Total Days)"
          name="duration"
          type="number"
          min="1"
          step="1"
          placeholder="e.g. 5"
          value={values.duration}
          onChange={handleInputChange}
          error={fieldErrors.duration}
          helperText="Number of full itinerary days for this travel plan."
          required
          disabled={isBusy}
        />

        {/* Description */}
        <div className="admin-field-group">
          <label htmlFor="package-description" className="admin-field-label">
            Package Overview & Description
          </label>
          <textarea
            id="package-description"
            name="description"
            rows="3"
            placeholder="Detailed description of activities and accommodations..."
            value={values.description}
            onChange={handleInputChange}
            disabled={isBusy}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {/* Highlights */}
        <Field
          label="Key Highlights"
          name="highlights"
          placeholder="e.g. Campfire, Paragliding, Trekking"
          value={values.highlights}
          onChange={handleInputChange}
          helperText="Brief comma-separated promotional highlights."
          disabled={isBusy}
        />

        {/* Image Path */}
        <Field
          label="Cover Image Path or URL"
          name="image"
          placeholder="e.g. /destinations/manali.jpg or full URL"
          value={values.image}
          onChange={handleInputChange}
          helperText="Relative path within assets or full HTTPS image URL."
          disabled={isBusy}
        />

        <FormActions
          busy={isBusy}
          submitLabel={isEditing ? 'Save Changes' : 'Create Package'}
          onCancel={onClose}
        />
      </form>
    </AdminDialog>
  );
}
