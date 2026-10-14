import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { subscriptionsApi, promotionsApi, packagesApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';

/**
 * AgencySubscriptionPage
 * 
 * Manages the agency partner's platform subscription tier and package promotions.
 */
export default function AgencySubscriptionPage() {
  const { user } = useSession();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [plans, setPlans] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Promote package modal
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoPackageId, setPromoPackageId] = useState('');
  const [promoType, setPromoType] = useState('HOMEPAGE');
  const [promoPrice, setPromoPrice] = useState(500);
  const [submittingPromo, setSubmittingPromo] = useState(false);
  const [promoError, setPromoError] = useState(null);
  const [promoSuccess, setPromoSuccess] = useState(false);

  // Subscribing state
  const [subscribingPlanId, setSubscribingPlanId] = useState(null);
  const [subError, setSubError] = useState(null);
  const [subSuccess, setSubSuccess] = useState(false);

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, subRes, promoRes, pkgRes] = await Promise.all([
        subscriptionsApi.getPlans({ signal }).catch(() => []),
        subscriptionsApi.getAgencySubscription(agencyId, { signal }).catch(() => ({ status: 'NONE' })),
        promotionsApi.getAll({ signal }).catch(() => []),
        packagesApi.getAll({ signal }).catch(() => []),
      ]);

      if (!signal?.aborted) {
        setPlans(Array.isArray(plansRes) ? plansRes : []);
        setActiveSub(subRes && subRes.status !== 'NONE' ? subRes : null);
        setPromotions(Array.isArray(promoRes) ? promoRes : []);
        setPackages(Array.isArray(pkgRes) ? pkgRes : []);
        if (Array.isArray(pkgRes) && pkgRes.length > 0) {
          setPromoPackageId(String(pkgRes[0].packageId || pkgRes[0].package_id));
        }
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Failed to load agency subscription/promotions:', err);
        setError(err.message || 'Failed to load subscription data.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (agencyId) {
      loadData(controller.signal);
    }
    return () => controller.abort();
  }, [agencyId]);

  const handleSubscribe = async (plan) => {
    setSubError(null);
    setSubSuccess(false);
    setSubscribingPlanId(plan.plan_id || plan.planId);

    try {
      const paymentRef = `SUB-${Date.now().toString().slice(-6)}`;
      const res = await subscriptionsApi.subscribe({
        agencyId,
        planId: plan.plan_id || plan.planId,
        paymentRef,
      });

      setActiveSub(res);
      setSubSuccess(`Successfully subscribed to ${plan.name} tier!`);
    } catch (err) {
      console.error('Subscription failed:', err);
      setSubError(err.message || 'Failed to update subscription.');
    } finally {
      setSubscribingPlanId(null);
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    setPromoError(null);
    setPromoSuccess(false);

    if (!promoPackageId) {
      setPromoError('Please select a package to feature.');
      return;
    }

    setSubmittingPromo(true);
    try {
      const paymentRef = `PROMO-${Date.now().toString().slice(-6)}`;
      await promotionsApi.create({
        agencyId,
        packageId: Number(promoPackageId),
        type: promoType,
        price: Number(promoPrice),
        paymentRef,
      });

      setPromoSuccess(true);
      setShowPromoModal(false);
      // Refresh promos
      const refreshed = await promotionsApi.getAll();
      setPromotions(Array.isArray(refreshed) ? refreshed : []);
    } catch (err) {
      console.error('Promotion creation failed:', err);
      setPromoError(err.message || 'Failed to launch promotion.');
    } finally {
      setSubmittingPromo(false);
    }
  };

  // Filter agency's own promotions
  const myPromotions = useMemo(() => {
    return promotions.filter((p) => Number(p.agency_id || p.agencyId) === agencyId);
  }, [promotions, agencyId]);

  return (
    <div className="agency-subscription-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            Partner Subscriptions & Promotions
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Elevate your agency quota, feature client travel packages, and manage platform tiers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowPromoModal(true);
            setPromoError(null);
            setPromoSuccess(false);
          }}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(13,148,136,0.25)',
          }}
        >
          ⭐ Feature a Package
        </button>
      </div>

      {subSuccess && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px 16px', color: '#166534', fontWeight: 600, marginBottom: '20px' }}>
          ✓ {subSuccess}
        </div>
      )}

      {subError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', color: '#b91c1c', fontWeight: 600, marginBottom: '20px' }}>
          ⚠️ {subError}
        </div>
      )}

      {/* Active Subscription Banner */}
      <div
        style={{
          background: activeSub ? 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)' : '#f8fafc',
          border: activeSub ? '1.5px solid #86efac' : '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: activeSub ? '#166534' : '#334155', margin: 0 }}>
              {activeSub ? `Active Tier: Plan #${activeSub.plan_id || activeSub.planId}` : 'Standard Reseller Tier (No Active Plan)'}
            </h2>
            {activeSub && (
              <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                {activeSub.status}
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: '#475569', fontSize: '14px', maxWidth: '600px' }}>
            {activeSub
              ? `Subscribed on ${activeSub.start_date || activeSub.startDate || 'Current term'} via corporate invoice ref ${activeSub.payment_ref || activeSub.paymentRef}. Your agency enjoys elevated passenger quotas.`
              : 'Upgrade to a Premium Agency Subscription to unlock priority guide assignments and discounted promotional listings.'}
          </p>
        </div>

        {activeSub && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Billing Cycle</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Annual Reseller License</div>
          </div>
        )}
      </div>

      {/* Subscription Plans Grid */}
      <div style={{ marginBottom: '36px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
          Available Subscription Tiers
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Loading subscription tiers...
          </div>
        ) : plans.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
            No subscription plans configured in backend.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {plans.map((p) => {
              const isCurrent = activeSub && (activeSub.plan_id === p.plan_id || activeSub.planId === p.plan_id);
              const isSubscribing = subscribingPlanId === p.plan_id;

              return (
                <div
                  key={p.plan_id || p.planId}
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    border: isCurrent ? '2px solid #0d9488' : '1px solid #e2e8f0',
                    padding: '24px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                        {p.name}
                      </h4>
                      {isCurrent && (
                        <span style={{ background: '#f0fdfa', color: '#0d9488', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', border: '1px solid #99f6e4' }}>
                          CURRENT
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#0d9488', marginBottom: '12px' }}>
                      ₹{Number(p.price || 0).toLocaleString('en-IN')}
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}> / year</span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
                      {p.description || 'Full partner portal access, passenger management, and priority tour guide booking.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSubscribe(p)}
                    disabled={isCurrent || isSubscribing}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: isCurrent ? '1px solid #cbd5e1' : 'none',
                      background: isCurrent ? '#f1f5f9' : '#0d9488',
                      color: isCurrent ? '#64748b' : '#fff',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: isCurrent || isSubscribing ? 'default' : 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {isCurrent ? 'Current Plan' : isSubscribing ? 'Activating...' : `Activate ${p.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Featured Promotions Section */}
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          overflow: 'hidden',
          marginBottom: '28px',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Your Featured Package Promotions ({myPromotions.length})
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Packages highlighted on the traveler homepage and search result tops.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            style={{ border: 'none', background: 'transparent', color: '#0d9488', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            ↻ Refresh
          </button>
        </div>

        {myPromotions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: '#64748b' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📣</div>
            <p style={{ margin: 0, fontSize: '14px' }}>
              No promotions active. Click "Feature a Package" above to promote your tours.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Promo ID
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Package
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Placement
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Fee Paid
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {myPromotions.map((p) => {
                  const pkg = packages.find((pkg) => pkg.packageId === (p.package_id || p.packageId));
                  return (
                    <tr key={p.promo_id || p.promoId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0f172a' }}>
                        #{p.promo_id || p.promoId}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#334155' }}>
                        {pkg?.name || `Package #${p.package_id || p.packageId}`}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', fontSize: '12px', fontWeight: 600 }}>
                          {p.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0d9488' }}>
                        ₹{Number(p.price || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 600 }}>
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feature Package Modal */}
      {showPromoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
              Feature a Tour Package
            </h2>

            {promoError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>
                {promoError}
              </div>
            )}

            <form onSubmit={handleCreatePromo}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Select Package *
                </label>
                <select
                  value={promoPackageId}
                  onChange={(e) => setPromoPackageId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                >
                  {packages.map((pkg) => (
                    <option key={pkg.packageId} value={pkg.packageId}>
                      {pkg.name} — ₹{Number(pkg.price || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Placement Type *
                </label>
                <select
                  value={promoType}
                  onChange={(e) => {
                    setPromoType(e.target.value);
                    setPromoPrice(e.target.value === 'HOMEPAGE' ? 500 : 250);
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                >
                  <option value="HOMEPAGE">Homepage Spotlight (₹500)</option>
                  <option value="SEARCH_RESULT">Search Results Top Banner (₹250)</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
                Simulated Promotion Fee: <strong>₹{promoPrice}</strong>. Recorded on agency corporate ledger.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPromo}
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: submittingPromo ? 'not-allowed' : 'pointer' }}
                >
                  {submittingPromo ? 'Activating...' : 'Confirm Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
