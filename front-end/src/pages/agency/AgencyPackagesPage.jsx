import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { packagesApi } from '../../services/api';

/**
 * AgencyPackagesPage
 * 
 * Catalog browser for travel agency partners.
 * Displays wholesale/retail packages with live commission calculations per tour.
 */
export default function AgencyPackagesPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const commissionRate = Number(user?.commissionRate ?? 1.5);

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('All');

  useEffect(() => {
    let isMounted = true;
    const fetchPackages = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await packagesApi.getAll();
        if (isMounted && Array.isArray(data)) {
          setPackages(data);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load packages:', err);
          setError(err.message || 'Failed to load tour packages catalog.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPackages();
    return () => {
      isMounted = false;
    };
  }, []);

  const destinations = useMemo(() => {
    const set = new Set();
    packages.forEach((p) => {
      if (p.destination) set.add(p.destination);
    });
    return ['All', ...Array.from(set)];
  }, [packages]);

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      const matchesDest =
        selectedDestination === 'All' ||
        (p.destination || '').toLowerCase() === selectedDestination.toLowerCase();

      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        (p.title || '').toLowerCase().includes(search) ||
        (p.destination || '').toLowerCase().includes(search) ||
        (p.description || '').toLowerCase().includes(search);

      return matchesDest && matchesSearch;
    });
  }, [packages, selectedDestination, searchTerm]);

  return (
    <div>
      {/* Top Welcome */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfc 100%)',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Tour Packages Catalog 📦
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Browse curated itineraries and book directly for your offline client passengers.
          </p>
        </div>

        <div
          style={{
            padding: '8px 16px',
            background: '#ecfdf5',
            borderRadius: '20px',
            border: '1px solid #a7f3d0',
            fontSize: '13px',
            color: '#065f46',
            fontWeight: 700,
          }}
        >
          Reseller Commission: <strong>{commissionRate}%</strong>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filters Bar */}
      <div
        className="card"
        style={{
          padding: '18px 24px',
          borderRadius: '16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ minWidth: '260px', flex: '1 1 260px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Search packages by title, destination, highlights..."
            className="form-control"
            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Destination:</span>
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            className="form-control"
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            {destinations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
          Loading tour packages...
        </div>
      ) : filteredPackages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '42px', marginBottom: '8px' }}>📦</div>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            No packages match your search
          </h4>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Try resetting your destination or search keyword.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredPackages.map((pkg) => {
            const pkgId = pkg.packageId || pkg.id;
            const price = Number(pkg.price) || 0;
            const commission = price * (commissionRate / 100);

            return (
              <div
                key={pkgId}
                className="card"
                style={{
                  borderRadius: '16px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#19b6a6', textTransform: 'uppercase' }}>
                      📍 {pkg.destination || 'Global Tour'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', background: '#f1f5f9', padding: '2px 8px', borderRadius: '8px' }}>
                      {pkg.duration ? `${pkg.duration} Days` : 'Flexible Duration'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.3' }}>
                    {pkg.title}
                  </h3>

                  <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '16px', maxHeight: '60px', overflow: 'hidden' }}>
                    {pkg.description || 'Full-featured package with transportation, guided sight-seeing, and premium lodging.'}
                  </p>
                </div>

                <div style={{ paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Retail Price</span>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ${price.toLocaleString()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#059669', textTransform: 'uppercase' }}>Your Margin ({commissionRate}%)</span>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>
                        +${commission.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/agency/book-package?packageId=${pkgId}`)}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #19b6a6 0%, #0ea5e9 100%)',
                      border: 'none',
                      fontWeight: 700,
                      padding: '10px',
                      fontSize: '13px',
                    }}
                  >
                    🛒 Book for Client Passenger →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
