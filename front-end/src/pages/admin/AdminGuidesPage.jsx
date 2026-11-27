import React, { useState, useMemo, useEffect } from 'react';
import { guidesApi, approvalsApi } from '../../services/api';
import { useReduxAdminData } from '../../store/hooks';
import {
  AdminPage,
  AdminTable,
  Filters,
  AdminDialog,
  Field,
  FormActions,
  Details,
  matches,
  money,
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
  const resource = useReduxAdminData('guides');

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [viewingGuide, setViewingGuide] = useState(null);
  const [verifyingGuide, setVerifyingGuide] = useState(null);
  const [deactivatingGuide, setDeactivatingGuide] = useState(null);
  const [deactivationReason, setDeactivationReason] = useState('');

  // Guide Verification form state
  const [verifyProofUrl, setVerifyProofUrl] = useState('');
  const [verifyExpYears, setVerifyExpYears] = useState('3');
  const [verifyRateMinor, setVerifyRateMinor] = useState('250000');

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
    const action = isEdit ? 'update' : 'create';
    const actionPayload = isEdit ? [editingGuide.guideId, payload] : payload;

    resource.run(
      action, actionPayload,
      isEdit ? `Guide ${payload.name} updated.` : `Guide ${payload.name} registered successfully.`,
      () => handleCloseForm()
    );
  };

  const handleOpenVerify = (guide) => {
    setVerifyingGuide(guide);
    setVerifyProofUrl(guide.proofUrl || '');
    setVerifyExpYears(guide.verifiedExperienceYears != null ? String(guide.verifiedExperienceYears) : String(guide.experience || '3'));
    setVerifyRateMinor(guide.adminSetRateMinor != null ? String(guide.adminSetRateMinor) : String((guide.pricePerTrip || 2500) * 100));
  };

  const handleCloseVerify = () => {
    setVerifyingGuide(null);
  };

  const handleConfirmVerify = () => {
    if (!verifyingGuide) return;
    const exp = parseInt(verifyExpYears, 10);
    const rateMinor = parseInt(verifyRateMinor, 10);

    resource.run(
      'update', [verifyingGuide.guideId, {
          verificationStatus: 'VERIFIED',
          proofUrl: verifyProofUrl.trim(),
          verifiedExperienceYears: Number.isNaN(exp) ? 0 : exp,
          adminSetRateMinor: Number.isNaN(rateMinor) ? 0 : rateMinor,
        }],
      `Guide ${verifyingGuide.name} verified successfully.`,
      () => handleCloseVerify()
    );
  };

  const handleOpenDeactivate = (guide) => {
    setDeactivatingGuide(guide);
    setDeactivationReason('');
  };

  const handleCloseDeactivate = () => {
    setDeactivatingGuide(null);
    setDeactivationReason('');
  };

  const handleConfirmDeactivateRequest = () => {
    if (!deactivatingGuide || !deactivationReason.trim()) return;

    resource.run(
      'createApproval', {
          type: 'GUIDE_DEACTIVATION',
          entityType: 'guide',
          entityId: deactivatingGuide.guideId,
          proposedValues: {
            status: 'DEACTIVATED',
            deactivationReason: deactivationReason.trim(),
          },
          reason: `Permanent guide deactivation requested by Admin: ${deactivationReason.trim()}`,
        },
      `Submitted deactivation approval request for ${deactivatingGuide.name} to Super Admin.`,
      () => handleCloseDeactivate()
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
      label: 'Status',
      render: (g) => {
        const isVer = g.verificationStatus === 'VERIFIED';
        return (
          <span
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: isVer ? '#dcfce7' : '#fef3c7',
              color: isVer ? '#166534' : '#92400e',
            }}
          >
            {g.verificationStatus || 'UNVERIFIED'}
          </span>
        );
      },
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
            onClick={() => handleOpenVerify(g)}
            disabled={resource.busy}
            title="Verify credentials and set locked rate"
          >
            Verify
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
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenDeactivate(g)}
            disabled={resource.busy}
            title="Request permanent deactivation via Super Admin"
            style={{ color: '#dc2626' }}
          >
            Deactivate
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

      {/* Guide Credentials Verification Dialog (Category A / B) */}
      {verifyingGuide && (
        <AdminDialog
          title={`Verify Guide Credentials: ${verifyingGuide.name}`}
          onClose={handleCloseVerify}
          busy={resource.busy}
          error={resource.error}
        >
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Inspect and verify the official credentials of the tour guide. Verification locks the daily rate and accredited experience years.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmVerify();
            }}
          >
            <Field
              id="verify-proof-url"
              label="Credential / License Verification URL"
              type="url"
              value={verifyProofUrl}
              onChange={(e) => setVerifyProofUrl(e.target.value)}
              placeholder="https://tourism.gov.in/guides/license-789"
              disabled={resource.busy}
              helperText="Official license or badge verification link."
            />
            <Field
              id="verify-exp-years"
              label="Accredited Experience (Years)"
              type="number"
              min="0"
              max="50"
              value={verifyExpYears}
              onChange={(e) => setVerifyExpYears(e.target.value)}
              disabled={resource.busy}
              helperText="Verified experience level across industry expeditions."
            />
            <Field
              id="verify-rate-minor"
              label="Admin Locked Daily Rate (Cents / Minor Units)"
              type="number"
              min="10000"
              step="1000"
              value={verifyRateMinor}
              onChange={(e) => setVerifyRateMinor(e.target.value)}
              disabled={resource.busy}
              helperText="e.g. 250000 minor units = INR 2,500 daily fee."
            />
            <FormActions
              busy={resource.busy}
              onCancel={handleCloseVerify}
              submitLabel="Confirm & Lock Verification"
            />
          </form>
        </AdminDialog>
      )}

      {/* Deactivation Approval Request Dialog (Category C) */}
      {deactivatingGuide && (
        <AdminDialog
          title={`Request Guide Deactivation: ${deactivatingGuide.name}`}
          onClose={handleCloseDeactivate}
          busy={resource.busy}
          error={resource.error}
        >
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Permanent guide deactivation impacts scheduled traveler trips and requires Super Admin prior approval (Category C Governance).
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmDeactivateRequest();
            }}
          >
            <Field
              id="guide-deactivation-reason"
              label="Reason for Deactivation Request (Required)"
              type="text"
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              placeholder="e.g. Multiple traveler complaints, license revocation"
              disabled={resource.busy}
              helperText="Rationale will be reviewed by Super Admin with impact analysis."
            />
            <FormActions
              busy={resource.busy}
              onCancel={handleCloseDeactivate}
              submitLabel="Submit Request to Super Admin"
            />
          </form>
        </AdminDialog>
      )}
    </AdminPage>
  );
}
