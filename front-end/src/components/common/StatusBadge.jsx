import React from 'react';

export default function StatusBadge({ status = 'Pending' }) {
  const getBadgeClass = () => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'active':
      case 'completed':
      case 'approved':
      case 'resolved':
        return 'badge-success';
      case 'pending':
      case 'in progress':
        return 'badge-warning';
      case 'open':
        return 'badge-info';
      case 'cancelled':
      case 'rejected':
      case 'closed':
        return 'badge-danger';
      default:
        return 'badge-gray';
    }
  };

  return (
    <span className={`badge ${getBadgeClass()}`}>
      ● {status}
    </span>
  );
}
