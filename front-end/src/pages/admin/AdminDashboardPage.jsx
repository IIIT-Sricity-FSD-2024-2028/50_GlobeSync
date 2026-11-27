import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminDashboard } from '../../store/admin-dashboard/admin-dashboard-actions';
import { AdminPage, Metrics, money } from '../../components/admin/AdminUI';

export default function AdminDashboardPage() {
  const dispatch = useDispatch();
  const d = useSelector((state) => state.adminDashboard.metrics);
  const loading = useSelector((state) => state.adminDashboard.loading);
  const error = useSelector((state) => state.adminDashboard.error);

  useEffect(() => {
    dispatch(fetchAdminDashboard());
  }, [dispatch]);

  const resource = {
    loading,
    busy: loading,
    load: () => dispatch(fetchAdminDashboard()),
    error,
    data: d,
  };

  return (
    <AdminPage title="Admin Dashboard" resource={resource}>
      {d && (
        <>
          <Metrics
            items={[
              ['Trips', d.totalTrips, '/admin/trips'],
              ['Bookings', d.totalBookings, '/admin/bookings'],
              ['Packages', d.totalPackages, '/admin/packages'],
              ['Guides', d.totalGuides],
              ['Travelers', d.totalTravelers],
              ['Pending bookings', d.pendingBookings, '/admin/bookings'],
              ['Completed trips', d.completedTrips, '/admin/trips'],
              ['Paid payment total', money(d.revenueEstimate), '/admin/reports'],
            ]}
          />
          <h2>Operations</h2>
          <div className="admin-actions">
            <Link className="btn btn-secondary" to="/admin/bookings">
              Review bookings
            </Link>
            <Link className="btn btn-secondary" to="/admin/agencies">
              Agency approvals
            </Link>
            <Link className="btn btn-secondary" to="/admin/reviews">
              Moderate reviews
            </Link>
          </div>
        </>
      )}
    </AdminPage>
  );
}
