import React from 'react';
import { AdminDialog, Details } from './AdminUI';
import StatusBadge from '../common/StatusBadge';

/**
 * AgencyDetailsModal
 *
 * Controlled modal dialog displaying read-only comprehensive profile
 * information for a selected travel agency.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is visible
 * @param {Object|null} props.agency - Selected agency data
 * @param {Function} props.onClose - Modal dismiss callback
 */
export default function AgencyDetailsModal({ isOpen, agency, onClose, onReviewStatus = null }) {
  if (!isOpen || !agency) return null;

  const commissionDisplay =
    agency.commissionRate != null ? `${agency.commissionRate}%` : 'Platform Default (1.5%)';

  const formattedDate = agency.createdAt
    ? new Date(agency.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const detailsEntries = [
    ['Agency ID', `#${agency.agencyId}`],
    ['Business Name', agency.businessName],
    ['Contact Person', agency.contactPerson || 'Not provided'],
    ['Contact Email', agency.contactEmail],
    ['Contact Phone', agency.contactPhone],
    ['License / GSTIN', agency.licenseGstin || 'Not provided'],
    ['Office Address', agency.officeAddress || 'Not provided'],
    ['Payout Bank / UPI', agency.payoutBankUpi || 'Not provided'],
    ['Approval Status', <StatusBadge key="status" status={agency.status} />],
    ['Commission Rate', commissionDisplay],
    ['Registration Date', formattedDate],
  ];

  if (agency.approvedAt) {
    detailsEntries.push([
      'Approved At',
      new Date(agency.approvedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    ]);
  }
  if (agency.statusReason) {
    detailsEntries.push(['Decision Reason', agency.statusReason]);
  }
  if (agency.suspensionReason) {
    detailsEntries.push(['Suspension Reason', agency.suspensionReason]);
  }

  return (
    <AdminDialog
      title={`Agency Application & Profile: ${agency.businessName}`}
      onClose={onClose}
      busy={false}
    >
      <Details entries={detailsEntries} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
        {onReviewStatus && agency.status === 'pending' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onClose();
              onReviewStatus(agency);
            }}
          >
            Approve / Reject Application
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </AdminDialog>
  );
}
