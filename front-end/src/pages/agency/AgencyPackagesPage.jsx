import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { packagesApi, agenciesApi } from '../../services/api';
import AgencyResellModal from '../../components/agency/AgencyResellModal';

export default function AgencyPackagesPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [agencyProfile, setAgencyProfile] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('All');
  const [durationFilter, setDurationFilter] = useState('All'); // 'All' | 'short' (1-3) | 'medium' (4-7) | 'long' (8+)
  const [maxPrice, setMaxPrice] = useState(300000);

  // Modal & Toast
  const [resellPackage, setResellPackage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadPackagesAndAgency = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [pkgsData, agencyData] = await Promise.all([
        packagesApi.getAll({ signal }),
        agenciesApi.getById(agencyId, { signal }).catch(() => null),
      ]);

      if (!signal?.aborted) {
        if (Array.isArray(pkgsData)) {
          setPackages(pkgsData);
        }
        if (agencyData) {
          setAgencyProfile(agencyData);
        }
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Failed to load packages:', err);
        setError(err.message || 'Failed to load tour packages catalog.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadPackagesAndAgency(controller.signal);
    return () => controller.abort();
  }, [agencyId]);

  const commissionRate = useMemo(() => {
    if (agencyProfile?.commissionRate !== undefined && agencyProfile?.commissionRate !== null) {
      return Number(agencyProfile.commissionRate);
    }
    if (user?.commissionRate !== undefined && user?.commissionRate !== null) {
      return Number(user.commissionRate);
    }
    return 10.0;
  }, [agencyProfile, user]);

  const destinations = useMemo(() => {
    const set = new Set();
    packages.forEach((p) => {
      const dest = p.destinations || p.destination;
      if (dest) {
        // Handle comma-separated destinations like 'Tokyo, Kyoto'
        dest.split(',').forEach((d) => set.add(d.trim()));
      }
    });
    return ['All', ...Array.from(set)];
  }, [packages]);

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      const pDest = (p.destinations || p.destination || '').toLowerCase();
      const pTitle = (p.name || p.title || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();
      const pHighlights = (p.highlights || '').toLowerCase();
      const price = Number(p.budget ?? p.price ?? 0);
      const dur = Number(p.duration) || 5;

      // 1. Destination
      if (selectedDestination !== 'All') {
        const destLower = selectedDestination.toLowerCase();
        if (!pDest.includes(destLower)) return false;
      }

      // 2. Duration Filter
      if (durationFilter === 'short' && dur > 3) return false;
      if (durationFilter === 'medium' && (dur < 4 || dur > 7)) return false;
      if (durationFilter === 'long' && dur < 8) return false;

      // 3. Price Filter
      if (price > maxPrice) return false;

      // 4. Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesTitle = pTitle.includes(query);
        const matchesDest = pDest.includes(query);
        const matchesDesc = pDesc.includes(query);
        const matchesHighlights = pHighlights.includes(query);
        if (!matchesTitle && !matchesDest && !matchesDesc && !matchesHighlights) return false;
      }

      return true;
    });
  }, [packages, selectedDestination, durationFilter, maxPrice, searchTerm]);

  const handleResellSuccess = (createdTrip, commissionEarned) => {
    showToast(`B2B Resell successful! Trip #${createdTrip.tripId} created. Earned ₹${commissionEarned.toLocaleString('en-IN')} commission! ✓`);
    setTimeout(() => {
      navigate('/agency/trips');
    }, 1500);
  };

  return (
    <div className="agency-packages-page" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
            color: '#fff',
            padding: '14px 22px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            zIndex: 9999,
            fontWeight: 700,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)',
          border: '1px solid #ccfbf1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Curated Tour Packages & B2B Resell Catalog 📦
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Browse verified wholesale packages, view transparent partner commission rates, and resell directly to offline client passengers.
          </p>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #99f6e4',
            borderRadius: '24px',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 2px 8px rgba(13,148,136,0.1)',
          }}
        >
          <span style={{ fontSize: '13px', color: '#0f766e', fontWeight: 600 }}>Your Reseller Tier:</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#0d9488' }}>{commissionRate}%</span>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 2-Column Layout: Sidebar Filters + Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Filter Sidebar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            position: 'sticky',
            top: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              🔍 Catalog Filters
            </h3>
            {(searchTerm || selectedDestination !== 'All' || durationFilter !== 'All' || maxPrice < 300000) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDestination('All');
                  setDurationFilter('All');
                  setMaxPrice(300000);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Search Input */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Search Keywords
            </label>
            <input
              type="text"
              placeholder="e.g. Paris, Alps, Tokyo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Destination Dropdown */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Destination Region
            </label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                background: '#fff',
              }}
            >
              {destinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Filter */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Trip Duration
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { id: 'All', label: 'All Durations' },
                { id: 'short', label: 'Short (1–3 Days)' },
                { id: 'medium', label: 'Standard (4–7 Days)' },
                { id: 'long', label: 'Extended (8+ Days)' },
              ].map((df) => (
                <label
                  key={df.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: durationFilter === df.id ? '#0f766e' : '#475569',
                    fontWeight: durationFilter === df.id ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="durationFilter"
                    checked={durationFilter === df.id}
                    onChange={() => setDurationFilter(df.id)}
                    style={{ accentColor: '#0d9488' }}
                  />
                  {df.label}
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Slider */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                Max Retail Budget
              </label>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0d9488' }}>
                ₹{maxPrice.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min="10000"
              max="300000"
              step="5000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0d9488', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Main Content: Package Cards */}
        <div>
          {/* Header Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
              Showing <strong>{filteredPackages.length}</strong> available wholesale package{filteredPackages.length === 1 ? '' : 's'}
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              Loading package catalog...
            </div>
          ) : filteredPackages.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '60px',
                textAlign: 'center',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>📦</div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                No Packages Found
              </h4>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                Try adjusting your price range, duration, or search keywords.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
              {filteredPackages.map((pkg) => {
                const pkgId = pkg.packageId || pkg.id;
                const pkgTitle = pkg.name || pkg.title || 'Curated Holiday Tour';
                const pkgDest = pkg.destinations || pkg.destination || 'Global Tour';
                const price = Number(pkg.budget ?? pkg.price ?? 0);
                const commission = Math.round(price * (commissionRate / 100));
                const durationText = pkg.duration ? `${pkg.duration} Days` : 'Flexible';

                return (
                  <div
                    key={pkgId}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    <div>
                      {/* Destination & Duration Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase' }}>
                          📍 {pkgDest}
                        </span>
                        <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '8px', fontWeight: 600 }}>
                          {durationText}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', lineHeight: '1.3' }}>
                        {pkgTitle}
                      </h3>

                      <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 12px 0', maxHeight: '60px', overflow: 'hidden' }}>
                        {pkg.description || 'Full-featured holiday tour with verified accommodation, transit, and curated sight-seeing.'}
                      </p>

                      {pkg.highlights && (
                        <div style={{ fontSize: '11px', color: '#0f766e', background: '#f0fdfa', padding: '4px 8px', borderRadius: '6px', marginBottom: '14px' }}>
                          ✨ {pkg.highlights}
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                      {/* Price & Commission Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Retail Price</span>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                            ₹{price.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Agency Commission Badge */}
                        <div
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            textAlign: 'right',
                          }}
                        >
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', display: 'block' }}>
                            Earn {commissionRate}% per booking
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#15803d' }}>
                            +₹{commission.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Resell to Client Button */}
                      <button
                        type="button"
                        onClick={() => setResellPackage(pkg)}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 700,
                          padding: '11px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(13,148,136,0.25)',
                        }}
                      >
                        🛒 Resell to Client →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resell Modal */}
      {resellPackage && (
        <AgencyResellModal
          isOpen={Boolean(resellPackage)}
          pkg={resellPackage}
          agencyId={agencyId}
          commissionRate={commissionRate}
          onClose={() => setResellPackage(null)}
          onSuccess={handleResellSuccess}
        />
      )}
    </div>
  );
}
