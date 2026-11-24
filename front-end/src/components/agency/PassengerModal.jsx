import React, { useState, useEffect, useMemo } from 'react';

/**
 * Supported ID Types and validation metadata
 */
export const ID_CONFIG = {
  Passport: {
    placeholder: 'e.g. A1234567 (6-12 alphanumeric)',
    hint: 'Format: 6–12 alphanumeric characters',
    validate: (val) => /^[A-Z0-9]{6,12}$/i.test(val.trim()),
    errorMsg: 'Please enter a valid Passport number (6–12 alphanumeric characters)',
  },
  Aadhaar: {
    placeholder: 'e.g. 1234 5678 9012 (12 digits)',
    hint: 'Format: exactly 12 numeric digits (spaces optional)',
    validate: (val) => /^\d{12}$/.test(val.replace(/\s+/g, '')),
    errorMsg: 'Please enter a valid 12-digit Aadhaar number',
  },
  'Driving License': {
    placeholder: 'e.g. DL-1420110012345',
    hint: 'Format: standard Driving License (e.g. DL-1420110012345)',
    validate: (val) => /^[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4}[-\s]?\d{7}$/i.test(val.trim()),
    errorMsg: 'Please enter a valid Driving License number (e.g. DL-1420110012345)',
  },
  'PAN Card': {
    placeholder: 'e.g. ABCDE1234F',
    hint: 'Format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)',
    validate: (val) => /^[A-Z]{5}\d{4}[A-Z]$/i.test(val.trim()),
    errorMsg: 'Please enter a valid PAN Card number (e.g. ABCDE1234F)',
  },
  'Voter ID': {
    placeholder: 'e.g. ABC1234567',
    hint: 'Format: 3 letters followed by 7 digits (e.g. ABC1234567)',
    validate: (val) => /^[A-Z]{3}\d{7}$/i.test(val.trim()),
    errorMsg: 'Please enter a valid Voter ID number (e.g. ABC1234567)',
  },
};

/**
 * Calculate dynamic min and max DOB strings (YYYY-MM-DD) based on category
 */
export function getDobLimits(category) {
  const today = new Date();
  const format = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = format(today);

  if (category === 'Adult') {
    // 12 to 120 years old
    const minD = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    const maxD = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate());
    return { min: format(minD), max: format(maxD) };
  }
  if (category === 'Child') {
    // 2 to 11 years old (< 12)
    const minD = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate() + 1);
    const maxD = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
    return { min: format(minD), max: format(maxD) };
  }
  if (category === 'Infant') {
    // 0 to < 2 years old
    const minD = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate() + 1);
    return { min: format(minD), max: todayStr };
  }
  return { min: '', max: todayStr };
}

/**
 * Calculate exact integer age in years from DOB string
 */
export function calculateAge(dobString) {
  if (!dobString) return '';
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

/**
 * PassengerModal
 * 
 * Controlled modal for adding and updating agency-owned passengers with full profile attributes.
 */
export default function PassengerModal({
  isOpen,
  passenger = null,
  agencyId,
  onClose,
  onSubmit,
}) {
  const isEdit = Boolean(passenger);

  const [formData, setFormData] = useState({
    name: '',
    passengerCategory: 'Adult',
    age: '',
    dob: '',
    gender: 'Male',
    email: '',
    phone: '',
    idType: 'Passport',
    idNumber: '',
    specialNotes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (passenger) {
      const cat =
        passenger.passengerCategory ||
        (passenger.age !== undefined && passenger.age !== null
          ? passenger.age < 2
            ? 'Infant'
            : passenger.age < 12
            ? 'Child'
            : 'Adult'
          : 'Adult');

      setFormData({
        name: passenger.name || '',
        passengerCategory: cat,
        age: passenger.age !== undefined && passenger.age !== null ? String(passenger.age) : '',
        dob: passenger.dob || '',
        gender: passenger.gender || 'Male',
        email: passenger.email || '',
        phone: passenger.phone || '',
        idType: passenger.idType && ID_CONFIG[passenger.idType] ? passenger.idType : 'Passport',
        idNumber: passenger.idNumber || '',
        specialNotes: passenger.specialNotes || '',
      });
    } else {
      setFormData({
        name: '',
        passengerCategory: 'Adult',
        age: '',
        dob: '',
        gender: 'Male',
        email: '',
        phone: '',
        idType: 'Passport',
        idNumber: '',
        specialNotes: '',
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [passenger, isOpen]);

  const dobLimits = useMemo(() => {
    return getDobLimits(formData.passengerCategory);
  }, [formData.passengerCategory]);

  const currentIdConfig = ID_CONFIG[formData.idType] || ID_CONFIG.Passport;

  if (!isOpen) return null;

  // Handle category change: validate existing dob or recalculate
  const handleCategoryChange = (newCat) => {
    const limits = getDobLimits(newCat);
    let nextErrors = { ...errors };
    delete nextErrors.dob;
    delete nextErrors.age;

    // Check if current dob satisfies new category
    if (formData.dob) {
      const calcAge = calculateAge(formData.dob);
      let matches = false;
      if (newCat === 'Adult' && calcAge >= 12 && calcAge <= 120) matches = true;
      else if (newCat === 'Child' && calcAge >= 2 && calcAge <= 11) matches = true;
      else if (newCat === 'Infant' && calcAge >= 0 && calcAge < 2) matches = true;

      if (!matches) {
        nextErrors.dob = `Selected DOB (age ${calcAge}) does not match category ${newCat}. Please update DOB.`;
      }
    }
    setErrors(nextErrors);
    setFormData((prev) => ({ ...prev, passengerCategory: newCat }));
  };

  // Handle DOB change: auto-calculate age and validate category match
  const handleDobChange = (newDob) => {
    const nextErrors = { ...errors };
    delete nextErrors.dob;
    delete nextErrors.age;

    if (!newDob) {
      setFormData((prev) => ({ ...prev, dob: '', age: '' }));
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (newDob > todayStr) {
      nextErrors.dob = 'Date of birth cannot be in the future.';
      setFormData((prev) => ({ ...prev, dob: newDob, age: '' }));
      setErrors(nextErrors);
      return;
    }

    const calcAge = calculateAge(newDob);
    const cat = formData.passengerCategory;

    if (cat === 'Adult' && (calcAge < 12 || calcAge > 120)) {
      nextErrors.dob = `Adult age must be 12–120 years (DOB indicates ${calcAge} yrs). Please adjust DOB or change category.`;
    } else if (cat === 'Child' && (calcAge < 2 || calcAge > 11)) {
      nextErrors.dob = `Child age must be 2–11 years (DOB indicates ${calcAge} yrs). Please adjust DOB or change category.`;
    } else if (cat === 'Infant' && (calcAge < 0 || calcAge >= 2)) {
      nextErrors.dob = `Infant age must be 0 to < 2 years (DOB indicates ${calcAge} yrs). Please adjust DOB or change category.`;
    }

    setErrors(nextErrors);
    setFormData((prev) => ({ ...prev, dob: newDob, age: String(calcAge) }));
  };

  // Handle ID type change: re-validate ID number if present
  const handleIdTypeChange = (newType) => {
    const nextErrors = { ...errors };
    delete nextErrors.idNumber;

    if (formData.idNumber.trim()) {
      const cfg = ID_CONFIG[newType] || ID_CONFIG.Passport;
      if (!cfg.validate(formData.idNumber)) {
        nextErrors.idNumber = cfg.errorMsg;
      }
    }
    setErrors(nextErrors);
    setFormData((prev) => ({ ...prev, idType: newType }));
  };

  // Validate entire form before submit
  const validate = () => {
    const errs = {};

    // 1. Name
    if (!formData.name.trim()) {
      errs.name = 'Passenger full name is required';
    }

    // 2. DOB (required)
    if (!formData.dob) {
      errs.dob = 'Date of birth is required';
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      if (formData.dob > todayStr) {
        errs.dob = 'Date of birth cannot be in the future';
      }
    }

    // 3. Age & Category match
    const ageNum = parseInt(formData.age, 10);
    if (formData.age === '' || isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      errs.age = 'Please enter a valid age (0–120)';
    } else {
      const cat = formData.passengerCategory;
      if (cat === 'Adult' && (ageNum < 12 || ageNum > 120)) {
        errs.age = 'Adult passenger must be between 12 and 120 years old';
      } else if (cat === 'Child' && (ageNum < 2 || ageNum > 11)) {
        errs.age = 'Child passenger must be between 2 and 11 years old';
      } else if (cat === 'Infant' && (ageNum < 0 || ageNum >= 2)) {
        errs.age = 'Infant passenger must be between 0 and < 2 years old';
      }
    }

    // 4. Gender
    if (!formData.gender) {
      errs.gender = 'Gender is required';
    }

    // 5. Phone (optional, but validated if provided: 10-15 digits, optional +)
    if (formData.phone && formData.phone.trim()) {
      const cleanPhone = formData.phone.trim().replace(/[\s-]/g, '');
      if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
        errs.phone = 'Please enter a valid phone number (10–15 digits, optional +)';
      }
    }

    // 6. Email (optional, but validated if provided)
    if (formData.email && formData.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errs.email = 'Please enter a valid email address';
      }
    }

    // 7. ID Number (optional, but validated against idType if provided)
    if (formData.idNumber && formData.idNumber.trim()) {
      const cfg = ID_CONFIG[formData.idType] || ID_CONFIG.Passport;
      if (!cfg.validate(formData.idNumber)) {
        errs.idNumber = cfg.errorMsg;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        passengerCategory: formData.passengerCategory,
        age: parseInt(formData.age, 10),
        dob: formData.dob || undefined,
        gender: formData.gender,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        idType: formData.idType,
        idNumber: formData.idNumber.trim() || undefined,
        specialNotes: formData.specialNotes.trim() || undefined,
        agencyId: Number(agencyId),
      };

      await onSubmit(payload, passenger?.passId || passenger?.id);
      onClose();
    } catch (err) {
      console.error('Passenger submit error:', err);
      setSubmitError(err.message || 'Failed to save passenger details. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '580px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflowX: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              {isEdit ? `Edit Passenger #${passenger.passId || passenger.id}` : 'Add Passenger to Agency Roster'}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Save client traveler identity with category validation for rapid itinerary booking.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
          {submitError && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              ⚠️ {submitError}
            </div>
          )}

          {/* Full Name */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Vikram Sharma"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: errors.name ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
            {errors.name && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.name}</span>}
          </div>

          {/* Category, DOB, Age, Gender */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr 0.9fr 1fr', gap: '10px', marginBottom: '14px' }}>
            {/* Passenger Category */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Category *
              </label>
              <select
                value={formData.passengerCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <option value="Adult">Adult (12+ yrs)</option>
                <option value="Child">Child (2–11 yrs)</option>
                <option value="Infant">Infant (0–&lt;2 yrs)</option>
              </select>
            </div>

            {/* Date of Birth (Required) */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Date of Birth *
              </label>
              <input
                type="date"
                min={dobLimits.min}
                max={dobLimits.max}
                value={formData.dob}
                onChange={(e) => handleDobChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: errors.dob ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Age (Auto-calculated, allows 0 for Infant) */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Age *
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="0-120"
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: errors.age ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#f8fafc',
                }}
              />
            </div>

            {/* Gender */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Gender *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* DOB & Age Error messages */}
          {(errors.dob || errors.age) && (
            <div style={{ marginBottom: '14px', marginTop: '-6px' }}>
              {errors.dob && <span style={{ color: '#ef4444', fontSize: '11px', display: 'block' }}>⚠️ {errors.dob}</span>}
              {errors.age && !errors.dob && <span style={{ color: '#ef4444', fontSize: '11px', display: 'block' }}>⚠️ {errors.age}</span>}
            </div>
          )}

          {/* Phone and Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.phone ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
              {errors.phone && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.phone}</span>}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="passenger@example.com"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.email ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
              {errors.email && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.email}</span>}
            </div>
          </div>

          {/* ID Type and ID Number (Supported ID types only, no National ID) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                ID / Document Type
              </label>
              <select
                value={formData.idType}
                onChange={(e) => handleIdTypeChange(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <option value="Passport">Passport</option>
                <option value="Aadhaar">Aadhaar</option>
                <option value="Driving License">Driving License</option>
                <option value="PAN Card">PAN Card</option>
                <option value="Voter ID">Voter ID</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                ID Number
              </label>
              <input
                type="text"
                value={formData.idNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  const nextErrors = { ...errors };
                  delete nextErrors.idNumber;
                  setErrors(nextErrors);
                  setFormData({ ...formData, idNumber: val });
                }}
                placeholder={currentIdConfig.placeholder}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.idNumber ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                {currentIdConfig.hint}
              </span>
              {errors.idNumber && (
                <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                  {errors.idNumber}
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Dietary, Accessibility & Special Notes
            </label>
            <textarea
              rows="2"
              value={formData.specialNotes}
              onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
              placeholder="e.g. Vegetarian meal, wheelchair assistance, aisle seat preference"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#0d9488',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Saving...' : isEdit ? '✓ Update Passenger' : '✓ Add Passenger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
