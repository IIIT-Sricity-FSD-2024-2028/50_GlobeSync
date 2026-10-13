import React from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../services/api';
import { AdminPage, Metrics, money, useAdminData } from '../../components/admin/AdminUI';

export default function AdminDashboardPage() {
  const resource = useAdminData(dashboardApi.getAdmin);
  const d = resource.data;
  return <AdminPage title="Admin Dashboard" resource={resource}>
    {d && <><Metrics items={[
      ['Trips', d.totalTrips, '/admin/trips'],
      ['Bookings', d.totalBookings, '/admin/bookings'],
      ['Packages', d.totalPackages, '/admin/packages'],
      ['Guides', d.totalGuides], ['Travelers', d.totalTravelers],
      ['Pending bookings', d.pendingBookings, '/admin/bookings'],
      ['Completed trips', d.completedTrips, '/admin/trips'],
      ['Paid payment total', money(d.revenueEstimate), '/admin/reports'],
    ]} /><h2>Operations</h2><div className="admin-actions">
      <Link className="btn btn-secondary" to="/admin/bookings">Review bookings</Link>
      <Link className="btn btn-secondary" to="/admin/agencies">Agency approvals</Link>
      <Link className="btn btn-secondary" to="/admin/reviews">Moderate reviews</Link>
    </div></>}
  </AdminPage>;
}
