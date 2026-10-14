import React, { useState, useMemo, useEffect } from 'react';
import { guidesApi } from '../../services/api';
import {
  AdminPage,
  AdminTable,
  Filters,
  AdminDialog,
  Field,
  FormActions,
  DeleteDialog,
  Details,
  matches,
  money,
  useAdminData,
} from '../../components/admin/AdminUI';

const INITIAL_GUIDE_FORM = {
  name: '',
  email: '',
  password: '',
  contact: '',
  languages: 'English',
  experience: '2',
  pricePerTrip: '5000',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GuideFormModal
 *
 * Controlled modal dialog for creating and updating tour guides.
 */
function GuideFormModal({
  isOpen,
  guide,
  busy,
  dialogError,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(guide && guide.guideId);
  const [formData, setFormData] = useState(INITIAL_GUIDE_FORM);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (guide && guide.guideId) {
        setFormData({
          name: guide.name || '',
          email: guide.email || '',
          password: '',
          contact: guide.contact || '',
          languages: Array.isArray(guide.languages) ? guide.languages.join(', ') : 'English',
          experience: guide.experience != null ? String(guide.experience) : '0',
          pricePerTrip: guide.pricePerTrip != null ? String(guide.pricePerTrip) : '5000',
        });
      } else {
        setFormData(INITIAL_GUIDE_FORM);
      }
      setFieldErrors({});
    }
  }, [isOpen, guide]);

  if (!isOpen) return null;

  const handleChange = (e) => {
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

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Guide name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!formData.contact.trim()) {
      errors.contact = 'Contact phone number is required.';
    }

    if (!isEditing) {
      if (!formData.password) {
        errors.password = 'Initial login password is required.';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters.';
      }
    }

    const exp = Number(formData.experience);
    if (Number.isNaN(exp) || exp < 0) {
      errors.experience = 'Experience must be 0 or greater.';
    }

    const price = Number(formData.pricePerTrip);
    if (Number.isNaN(price) || price < 0) {
      errors.pricePerTrip = 'Price per trip must be 0 or greater.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const languagesList = formData.languages
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      contact: formData.contact.trim(),
      languages: languagesList.length > 0 ? languagesList : ['English'],
      experience: Number(formData.experience),
      pricePerTrip: Number(formData.pricePerTrip),
    };

    if (!isEditing) {
      payload.password = formData.password;
    } else if (formData.password) {
      payload.password = formData.password;
    }

    onSave(payload);
  };

  return (
    <AdminDialog
      title={isEditing ? `Edit Guide: ${guide.name}` : 'Register New Tour Guide'}
      onClose={onClose}
      busy={busy}
      error={dialogError}
    >
      <form onSubmit={handleSubmit} noValidate>
        <Field
          id="guide-name"
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Maya Sharma"
          required
          disabled={busy}
          error={fieldErrors.name}
        />

        <Field
          id="guide-email"
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g. maya@example.com"
          required
          disabled={busy}
          error={fieldErrors.email}
          helperText="Used for guide dispatch notifications and portal login."
        />

        <Field
          id="guide-contact"
          label="Contact Phone"
          name="contact"
          type="tel"
          value={formData.contact}
          onChange={handleChange}
          placeholder="e.g. +91 98765 43210"
          required
          disabled={busy}
          error={fieldErrors.contact}
        />

        {(!isEditing || formData.password) && (
          <Field
            id="guide-password"
            label={isEditing ? 'New Password (Optional)' : 'Initial Password'}
            name="password"
            type="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            placeholder={isEditing ? 'Leave blank to keep current' : 'Min 6 characters'}
            required={!isEditing}
            disabled={busy}
            error={fieldErrors.password}
            helperText="Guide uses this password to log into the Guide Portal."
          />
        )}

        <Field
          id="guide-languages"
          label="Languages Spoken"
          name="languages"
          value={formData.languages}
          onChange={handleChange}
          placeholder="English, Hindi, French"
          disabled={busy}
          helperText="Comma-separated list of languages."
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field
            id="guide-experience"
            label="Experience (Years)"
            name="experience"
            type="number"
            min="0"
            value={formData.experience}
            onChange={handleChange}
            disabled={busy}
            error={fieldErrors.experience}
          />

          <Field
            id="guide-pricePerTrip"
            label="Fee Per Trip (INR)"
            name="pricePerTrip"
            type="number"
            min="0"
            step="100"
            value={formData.pricePerTrip}
            onChange={handleChange}
            disabled={busy}
            error={fieldErrors.pricePerTrip}
          />
        </div>

        <FormActions
          busy={busy}
          onCancel={onClose}
          submitLabel={isEditing ? 'Save Guide Details' : 'Register Guide'}
        />
      </form>
    </AdminDialog>
  );
}

/**
 * AdminGuidesPage
 * Primary route: /admin/guides
 *
 * Provides a dedicated administrator interface for managing certified tour guides
 * using permitted backend endpoints (GET, POST, PUT, DELETE /guides).
 */
export default function AdminGuidesPage() {
  const resource = useAdminData(guidesApi.getAll);

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [deletingGuide, setDeletingGuide] = useState(null);
  const [viewingGuide, setViewingGuide] = useState(null);

  const filteredGuides = useMemo(() => {
    const raw = resource.data || [];
    return raw.filter((guide) => {
      const langs = Array.isArray(guide.languages) ? guide.languages.join(' ') : '';
      return matches(
        [guide.guideId, guide.name, guide.email, guide.contact, langs],
        searchQuery
      );
    });
  }, [resource.data, searchQuery]);

  const handleOpenCreate = () => {
    setEditingGuide(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (guide) => {
    setEditingGuide(guide);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGuide(null);
  };

  const handleSaveGuide = (payload) => {
    const isEdit = Boolean(editingGuide && editingGuide.guideId);
    const action = isEdit
      ? () => guidesApi.update(editingGuide.guideId, payload)
      : () => guidesApi.create(payload);

    resource.run(
      action,
      isEdit ? `Guide ${payload.name} updated.` : `Guide ${payload.name} registered successfully.`,
      () => handleCloseForm()
    );
  };

  const handleOpenDelete = (guide) => {
    setDeletingGuide(guide);
  };

  const handleCloseDelete = () => {
    setDeletingGuide(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingGuide) return;
    resource.run(
      () => guidesApi.delete(deletingGuide.guideId),
      `Guide ${deletingGuide.name} removed.`,
      () => handleCloseDelete()
    );
  };

  const columns = [
    {
      label: 'ID',
      render: (g) => `#${g.guideId}`,
    },
    {
      label: 'Name',
      key: 'name',
    },
    {
      label: 'Email',
      key: 'email',
    },
    {
      label: 'Phone / Contact',
      render: (g) => g.contact || '-',
    },
    {
      label: 'Languages',
      render: (g) => (Array.isArray(g.languages) ? g.languages.join(', ') : 'English'),
    },
    {
      label: 'Experience',
      render: (g) => `${g.experience || 0} yrs`,
    },
    {
      label: 'Fee / Trip',
      render: (g) => (g.pricePerTrip != null ? money(g.pricePerTrip) : '-'),
    },
    {
      label: 'Rating',
      render: (g) => (
        <span style={{ color: '#d97706', fontWeight: 600 }}>
          ★ {g.rating != null ? Number(g.rating).toFixed(1) : '5.0'}
        </span>
      ),
    },
    {
      label: 'Actions',
      render: (g) => (
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setViewingGuide(g)}
            title="Inspect guide profile"
          >
            View
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenEdit(g)}
            disabled={resource.busy}
            title="Edit contact and profile details"
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => handleOpenDelete(g)}
            disabled={resource.busy}
            title="Remove guide account"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminPage
      title="Tour Guides Directory"
      resource={resource}
      actions={
        <button
          type="button"
          className="btn btn-primary"
          disabled={resource.busy}
          onClick={handleOpenCreate}
        >
          Register Guide
        </button>
      }
    >
      {resource.data && (
        <>
          <Filters
            query={searchQuery}
            setQuery={setSearchQuery}
            statuses={[]}
          />
          <AdminTable
            rowKey="guideId"
            rows={filteredGuides}
            columns={columns}
          />
        </>
      )}

      {/* View Details Dialog */}
      {viewingGuide && (
        <AdminDialog
          title={`Guide Profile: ${viewingGuide.name}`}
          onClose={() => setViewingGuide(null)}
          busy={false}
        >
          <Details
            entries={[
              ['Guide ID', `#${viewingGuide.guideId}`],
              ['Name', viewingGuide.name],
              ['Email', viewingGuide.email],
              ['Contact', viewingGuide.contact || 'N/A'],
              [
                'Languages',
                Array.isArray(viewingGuide.languages)
                  ? viewingGuide.languages.join(', ')
                  : 'English',
              ],
              ['Experience', `${viewingGuide.experience || 0} years`],
              ['Fee Per Trip', money(viewingGuide.pricePerTrip)],
              ['Rating', `★ ${viewingGuide.rating || '5.0'}`],
            ]}
          />
        </AdminDialog>
      )}

      {/* Create / Edit Form Modal */}
      <GuideFormModal
        isOpen={isFormOpen}
        guide={editingGuide}
        busy={resource.busy}
        dialogError={resource.error}
        onClose={handleCloseForm}
        onSave={handleSaveGuide}
      />

      {/* Delete Confirmation Dialog */}
      {deletingGuide && (
        <DeleteDialog
          title={`Remove Guide ${deletingGuide.name}?`}
          warning="This action will delete the guide account. If this guide is currently assigned to active trips, the system will prevent deletion to preserve operational safety."
          busy={resource.busy}
          error={resource.error}
          onClose={handleCloseDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
    </AdminPage>
  );
}
