import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTravelerPackages } from '../../store/travelerPackages/travelerPackages-actions';
import PackageFilter from '../../components/packages/PackageFilter';
import PackageList from '../../components/packages/PackageList';
import Modal from '../../components/common/Modal';
import { resolvePackageImage } from '../../components/packages/PackageCard';

export default function TravelerPackagesPage() {
  // 1. Router / Dispatch
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 2. Redux Selectors
  const { packages } = useSelector((state) => state.travelerPackages);

  // 3. Local UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('ALL');
  const [maxBudget, setMaxBudget] = useState(250000);
  const [sortBy, setSortBy] = useState('RECOMMENDED');
  const [selectedPackage, setSelectedPackage] = useState(null);

  // 4. Data Fetching
  useEffect(() => {
    dispatch(fetchTravelerPackages());
  }, [dispatch]);

  // 5. CALCULATE filtered list DURING RENDERING (No duplicate state or sync effects)
  const filteredPackages = packages
    .filter((pkg) => {
      // Match search term against name, destinations, and highlights
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        pkg.name?.toLowerCase().includes(query) ||
        pkg.destinations?.toLowerCase().includes(query) ||
        pkg.highlights?.toLowerCase().includes(query);

      // Match duration category
      let matchesDuration = true;
      if (selectedDuration === 'SHORT') {
        matchesDuration = pkg.duration <= 4;
      } else if (selectedDuration === 'MEDIUM') {
        matchesDuration = pkg.duration >= 5 && pkg.duration <= 7;
      } else if (selectedDuration === 'LONG') {
        matchesDuration = pkg.duration >= 8;
      }

      // Match budget limit
      const matchesBudget = !maxBudget || pkg.budget <= maxBudget;

      return matchesSearch && matchesDuration && matchesBudget;
    })
    .sort((a, b) => {
      if (sortBy === 'PRICE_ASC') return a.budget - b.budget;
      if (sortBy === 'PRICE_DESC') return b.budget - a.budget;
      if (sortBy === 'DURATION') return a.duration - b.duration;
      return a.packageId - b.packageId;
    });

  // Callback handlers for child communication
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDuration('ALL');
    setMaxBudget(250000);
    setSortBy('RECOMMENDED');
  };

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
  };

  const handlePlanTrip = (pkg) => {
    navigate(`/traveler/plan?packageId=${pkg.packageId}`);
  };

  return (
    <div className="traveler-packages-page">
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
          Browse Tour Packages 📦
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Explore curated itineraries with certified guides, transparent budgets, and customizable activities.
        </p>
      </div>

      {/* Controlled Filter Bar Component */}
      <PackageFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedDuration={selectedDuration}
        onDurationChange={setSelectedDuration}
        maxBudget={maxBudget}
        onBudgetChange={setMaxBudget}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onReset={handleResetFilters}
        totalCount={filteredPackages.length}
      />

      {/* PackageList Presentation Component */}
      <PackageList
        packages={filteredPackages}
        onSelectPackage={handleSelectPackage}
        onPlanTrip={handlePlanTrip}
        onRetry={() => dispatch(fetchTravelerPackages())}
        onClearFilters={handleResetFilters}
      />

      {/* Detailed Package Modal */}
      {selectedPackage && (
        <Modal
          isOpen={Boolean(selectedPackage)}
          title={selectedPackage.name}
          onClose={() => setSelectedPackage(null)}
        >
          <div>
            <div
              style={{
                height: '180px',
                backgroundImage: `url(${resolvePackageImage(selectedPackage.image)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '12px',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600 }}>Destination</span>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>📍 {selectedPackage.destinations}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600 }}>Duration</span>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>⏱ {selectedPackage.duration} Days</div>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '16px' }}>
              {selectedPackage.description}
            </p>

            <div
              style={{
                background: '#fdf2f8',
                border: '1px solid #fbcfe8',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '20px',
                fontSize: '13px',
              }}
            >
              <strong style={{ fontSize: '14px', color: '#831843' }}>✨ What's included</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#500724', lineHeight: '1.7', fontSize: '14px' }}>
                {String(selectedPackage.highlights || '')
                  .split(/[,;\n]/)
                  .map((h) => h.trim())
                  .filter(Boolean)
                  .map((h) => (
                    <li key={h}>{h}</li>
                  ))}
              </ul>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-light)',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: '#4b5563', fontWeight: 600 }}>Estimated Price</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>
                  ₹{Number(selectedPackage.budget || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handlePlanTrip(selectedPackage);
                  setSelectedPackage(null);
                }}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: '14px' }}
              >
                Plan Itinerary with This Package →
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
