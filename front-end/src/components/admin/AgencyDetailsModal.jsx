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
export default function AgencyDetailsModal({ isOpen, agency, onClose }) {
  if (!isOpen || !agency) return null;

  const commissionDisplay =
    agency.commissionRate != null ? `${agency.commissionRate}%` : 'Platform Default';

  const formattedDate = agency.createdAt
    ? new Date(agency.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const detailsEntries = [
    ['Agency ID', agency.agencyId],
    ['Business Name', agency.businessName],
    ['Contact Email', agency.contactEmail],
    ['Contact Phone', agency.contactPhone],
    ['Approval Status', <StatusBadge key="status" status={agency.status} />],
    ['Commission Rate', commissionDisplay],
    ['Registration Date', formattedDate],
  ];

  return (
    <AdminDialog
      title={`Agency Profile: ${agency.businessName}`}
      onClose={onClose}
      busy={false}
    >
      <Details entries={detailsEntries} />
    </AdminDialog>
  );
}
