import React, { useState, useEffect } from 'react';
import { passengersApi, agencyApi } from '../../services/api';
import { ID_CONFIG, getDobLimits, calculateAge } from './PassengerModal';

/**
 * PassengerSelector
 * 
 * Embeddable component for selecting multiple passengers from the agency's saved roster
 * or adding a new passenger inline with backend persistence.
 * Supports both onSelectPassengers and onChange callback props.
 */
export default function PassengerSelector({
  agencyId,
  selectedPassengerIds = [],
  onSelectPassengers,
  onChange,
}) {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inline Add Passenger Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Adult');
  const [newDob, setNewDob] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('Male');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newIdType, setNewIdType] = useState('Passport');
  const [newIdNumber, setNewIdNumber] = useState('');
  const [newSpecialNotes, setNewSpecialNotes] = useState('');
  const [addError, setAddError] = useState(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const notifyChange = (updatedList) => {
    if (typeof onSelectPassengers === 'function') {
      onSelectPassengers(updatedList);
    }
    if (typeof onChange === 'function') {
      onChange(updatedList);
    }
  };

  const loadRoster = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      let data;
      try {
        data = await agencyApi.getPassengers({ signal });
      } catch {
        data = await passengersApi.getByAgency(agencyId, { signal });
      }
      if (!signal?.aborted && Array.isArray(data)) {
        setPassengers(data);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(err.message || 'Failed to load passengers roster');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (agencyId) {
      loadRoster(controller.signal);
    }
    return () => controller.abort();
  }, [agencyId]);

  const togglePassenger = (passId) => {
    const id = Number(passId);
    const currentList = Array.isArray(selectedPassengerIds) ? selectedPassengerIds.map(Number) : [];
    let updated;
    if (currentList.includes(id)) {
      updated = currentList.filter((pId) => pId !== id);
    } else {
      updated = [...currentList, id];
    }
    notifyChange(updated);
  };

  const inlineDobLimits = getDobLimits(newCategory);
  const currentIdConfig = ID_CONFIG[newIdType] || ID_CONFIG.Passport;

  const handleDobChange = (dobVal) => {
    setNewDob(dobVal);
    if (!dobVal) {
      setNewAge('');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (dobVal > todayStr) {
      setAddError('Date of birth cannot be in the future.');
      setNewAge('');
      return;
    }
    const calcAge = calculateAge(dobVal);
    setNewAge(String(calcAge));

    if (newCategory === 'Adult' && (calcAge < 12 || calcAge > 120)) {
      setAddError(`Adult age must be 12–120 years (DOB indicates ${calcAge} yrs). Please adjust DOB or category.`);
    } else if (newCategory === 'Child' && (calcAge < 2 || calcAge > 11)) {
      setAddError(`Child age must be 2–11 years (DOB indicates ${calcAge} yrs). Please adjust DOB or category.`);
    } else if (newCategory === 'Infant' && (calcAge < 0 || calcAge >= 2)) {
      setAddError(`Infant age must be 0 to < 2 years (DOB indicates ${calcAge} yrs). Please adjust DOB or category.`);
    } else {
      setAddError(null);
    }
  };

  const handleCategoryChange = (catVal) => {
    setNewCategory(catVal);
    if (newDob) {
      const calcAge = calculateAge(newDob);
      if (catVal === 'Adult' && (calcAge < 12 || calcAge > 120)) {
        setAddError(`Adult age must be 12–120 years (DOB indicates ${calcAge} yrs). Please adjust DOB or category.`);
      } else if (catVal === 'Child' && (calcAge < 2 || calcAge > 11)) {
        setAddError(`Child age must be 2–11 years (DOB indicates ${calcAge} yrs). Please adjust DOB or category.`);
      } else if (catVal === 'Infant' && (calcAge < 0 || calcAge >= 2)) {
        setAddError(`Infant age must be 0 to < 2 years (DOB indicates ${calcAge} yrs). Please adjust DOB or category.`);
      } else {
        setAddError(null);
      }
    }
  };

  const handleInlineAdd = async (e) => {
    e.preventDefault();
    setAddError(null);

    // 1. Name
    if (!newName.trim()) {
      setAddError('Passenger full name is required');
      return;
    }

    // 2. DOB
    if (!newDob) {
      setAddError('Date of birth is required');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (newDob > todayStr) {
      setAddError('Date of birth cannot be in the future');
      return;
    }

    // 3. Age & Category (allow age = 0 for infants)
    const ageNum = parseInt(newAge, 10);
    if (newAge === '' || isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      setAddError('Please enter a valid age (0–120)');
      return;
    }
    if (newCategory === 'Adult' && (ageNum < 12 || ageNum > 120)) {
      setAddError('Adult passenger must be between 12 and 120 years old');
      return;
    }
    if (newCategory === 'Child' && (ageNum < 2 || ageNum > 11)) {
      setAddError('Child passenger must be between 2 and 11 years old');
      return;
    }
    if (newCategory === 'Infant' && (ageNum < 0 || ageNum >= 2)) {
      setAddError('Infant passenger must be between 0 and < 2 years old');
      return;
    }

    // 4. Phone (10-15 digits, optional +)
    if (newPhone && newPhone.trim()) {
      const cleanPhone = newPhone.trim().replace(/[\s-]/g, '');
      if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
        setAddError('Please enter a valid phone number (10–15 digits, optional +)');
        return;
      }
    }

    // 5. Email
    if (newEmail && newEmail.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
        setAddError('Please enter a valid email address');
        return;
      }
    }

    // 6. ID Number
    if (newIdNumber && newIdNumber.trim()) {
      const cfg = ID_CONFIG[newIdType] || ID_CONFIG.Passport;
      if (!cfg.validate(newIdNumber)) {
        setAddError(cfg.errorMsg);
        return;
      }
    }

    setSubmittingAdd(true);

    try {
      const payload = {
        agencyId: Number(agencyId),
        name: newName.trim(),
        passengerCategory: newCategory,
        age: ageNum,
        dob: newDob || undefined,
        gender: newGender,
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
        idType: newIdType,
        idNumber: newIdNumber.trim() || undefined,
        specialNotes: newSpecialNotes.trim() || undefined,
      };

      const created = await passengersApi.create(payload);
      const newPassId = Number(created.passId || created.id);

      // Add to list and automatically select
      setPassengers((prev) => [...prev, created]);
      if (newPassId) {
        const currentList = Array.isArray(selectedPassengerIds) ? selectedPassengerIds.map(Number) : [];
        notifyChange([...currentList, newPassId]);
      }

      // Reset inline form
      setNewName('');
      setNewCategory('Adult');
      setNewDob('');
      setNewAge('');
      setNewGender('Male');
      setNewEmail('');
      setNewPhone('');
      setNewIdType('Passport');
      setNewIdNumber('');
      setNewSpecialNotes('');
      setIsAdding(false);
    } catch (err) {
      setAddError(err.message || 'Failed to add passenger');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const selectedCount = Array.isArray(selectedPassengerIds) ? selectedPassengerIds.length : 0;
  const currentList = Array.isArray(selectedPassengerIds) ? selectedPassengerIds.map(Number) : [];

  return (
    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Client Passengers ({selectedCount} Selected) *
        </label>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          style={{
            background: isAdding ? '#fee2e2' : '#f0fdf4',
            color: isAdding ? '#991b1b' : '#166534',
            border: `1px solid ${isAdding ? '#fca5a5' : '#86efac'}`,
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {isAdding ? '✕ Cancel' : '+ Add Passenger to Roster'}
        </button>
      </div>

      {/* Inline Add Passenger Form */}
      {isAdding && (
        <div
          style={{
            padding: '16px',
            background: '#f8fafc',
            border: '1.5px dashed #0d9488',
            borderRadius: '10px',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0d9488', marginBottom: '12px' }}>
            Quickly Register New Client Passenger
          </div>

          {addError && (
            <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>
              ⚠️ {addError}
            </div>
          )}

          <form onSubmit={handleInlineAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '10px', marginBottom: '10px' }}>
              {/* Full Name */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sen"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              {/* Passenger Category */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  Category *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                >
                  <option value="Adult">Adult (12+ yrs)</option>
                  <option value="Child">Child (2–11 yrs)</option>
                  <option value="Infant">Infant (0–&lt;2 yrs)</option>
                </select>
              </div>

              {/* Date of Birth (Required) */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  Date of Birth *
                </label>
                <input
                  type="date"
                  min={inlineDobLimits.min}
                  max={inlineDobLimits.max}
                  value={newDob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                />
              </div>

              {/* Age (Auto-calculated, allows 0 for Infant) */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  Age *
                </label>
                <input
                  type="number"
                  placeholder="0-120"
                  min="0"
                  max="120"
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f1f5f9' }}
                />
              </div>

              {/* Gender */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  Gender
                </label>
                <select
                  value={newGender}
                  onChange={(e) => setNewGender(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 00000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              {/* ID Type (No National ID) */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  ID / Document Type
                </label>
                <select
                  value={newIdType}
                  onChange={(e) => setNewIdType(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                >
                  <option value="Passport">Passport</option>
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="Driving License">Driving License</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>

              {/* ID Number with dynamic placeholder */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  ID Number
                </label>
                <input
                  type="text"
                  placeholder={currentIdConfig.placeholder}
                  value={newIdNumber}
                  onChange={(e) => setNewIdNumber(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  {currentIdConfig.hint}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                Dietary / Special Needs Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Vegan meal, wheelchair assistance..."
                value={newSpecialNotes}
                onChange={(e) => setNewSpecialNotes(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAdd}
                style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: '#0d9488', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: submittingAdd ? 'not-allowed' : 'pointer' }}
              >
                {submittingAdd ? 'Saving...' : 'Save & Select Passenger'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Passengers Selection Grid */}
      {loading ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
          Loading agency passenger roster...
        </div>
      ) : error ? (
        <div style={{ padding: '10px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '12px' }}>
          ⚠️ {error}
        </div>
      ) : passengers.length === 0 ? (
        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
          No passengers in agency roster yet. Click "+ Add Passenger to Roster" above to add your first passenger.
        </div>
      ) : (
        <div
          style={{
            maxHeight: '240px',
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
            gap: '8px',
            background: '#fff',
          }}
        >
          {passengers.map((p) => {
            const passId = Number(p.passId || p.id);
            const isSelected = currentList.includes(passId);
            const cat =
              p.passengerCategory ||
              (p.age !== undefined && p.age !== null
                ? p.age < 2
                  ? 'Infant'
                  : p.age < 12
                  ? 'Child'
                  : 'Adult'
                : 'Adult');

            return (
              <div
                key={passId}
                onClick={() => togglePassenger(passId)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #0d9488' : '1px solid #cbd5e1',
                  background: isSelected ? '#f0fdfa' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => togglePassenger(passId)}
                  style={{ accentColor: '#0d9488', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </span>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: cat === 'Adult' ? '#eff6ff' : cat === 'Child' ? '#fef3c7' : '#fdf2f8',
                        color: cat === 'Adult' ? '#1d4ed8' : cat === 'Child' ? '#b45309' : '#be185d',
                        border: `1px solid ${cat === 'Adult' ? '#bfdbfe' : cat === 'Child' ? '#fde68a' : '#fbcfe8'}`,
                      }}
                    >
                      {cat}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {p.age} yrs · {p.gender} {p.idType ? `· ${p.idType}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
