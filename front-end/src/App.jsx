import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from './context/SessionContext';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import LandingPage from './pages/public/LandingPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import RoleSelectPage from './pages/public/RoleSelectPage';
import LoginPage from './pages/public/LoginPage';
import TravelerSignupPage from './pages/public/TravelerSignupPage';
import UnauthorizedPage from './pages/public/UnauthorizedPage';
import TravelerDashboardPage from './pages/traveler/TravelerDashboardPage';
import GuideDashboardPage from './pages/guide/GuideDashboardPage';
import GuideRequestsPage from './pages/guide/GuideRequestsPage';
import GuideTravelersPage from './pages/guide/GuideTravelersPage';
import GuideCompletedTripsPage from './pages/guide/GuideCompletedTripsPage';
import GuideMessagesPage from './pages/guide/GuideMessagesPage';
import GuideProfilePage from './pages/guide/GuideProfilePage';
import SupportDashboardPage from './pages/support/SupportDashboardPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import SuperDashboardPage from './pages/super/SuperDashboardPage';
import AgencyDashboardPage from './pages/agency/AgencyDashboardPage';
import TravelerPackagesPage from './pages/traveler/TravelerPackagesPage';
import TravelerTripsPage from './pages/traveler/TravelerTripsPage';
import TravelerCreateTripPage from './pages/traveler/TravelerCreateTripPage';
import TravelerBookingsPage from './pages/traveler/TravelerBookingsPage';
import TravelerExpensesPage from './pages/traveler/TravelerExpensesPage';
import TravelerProfilePage from './pages/traveler/TravelerProfilePage';
import TravelerSupportPage from './pages/traveler/TravelerSupportPage';
import TravelerMessagesPage from './pages/traveler/TravelerMessagesPage';
import ProtectedRoute from './components/common/ProtectedRoute';

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Pages with Top Navbar and Footer */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/portal-select" element={<RoleSelectPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/traveler" element={<LoginPage initialRole="traveler" />} />
            <Route path="/login/staff" element={<LoginPage initialRole="admin" />} />
            <Route path="/login/agency" element={<LoginPage initialRole="agency" />} />
            <Route path="/login/superuser" element={<LoginPage initialRole="superuser" />} />
            <Route path="/signup/traveler" element={<TravelerSignupPage />} />
            <Route path="/register" element={<TravelerSignupPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Route>

          {/* Protected Actor Portals with Sidebar and Dashboard Layout */}
          <Route element={<DashboardLayout />}>
            <Route
              path="/traveler/dashboard"
              element={
                <ProtectedRoute allowedRoles={['traveler', 'superuser']}>
                  <TravelerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/packages"
              element={
                <ProtectedRoute allowedRoles={['traveler', 'superuser']}>
                  <TravelerPackagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/plan"
              element={
                <ProtectedRoute allowedRoles={['traveler', 'superuser']}>
                  <TravelerCreateTripPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/create-itinerary"
              element={
                <ProtectedRoute allowedRoles={['traveler', 'superuser']}>
                  <TravelerCreateTripPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/trips"
              element={
                <ProtectedRoute allowedRoles={['traveler', 'superuser']}>
                  <TravelerTripsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/bookings"
              element={
                <ProtectedRoute allowedRoles={['traveler', 'superuser']}>
                  <TravelerBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/expenses"
              element={
                <ProtectedRoute allowedRoles={['traveler', 'superuser']}>
                  <TravelerExpensesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/profile"
              element={
                <ProtectedRoute allowedRoles={['traveler', 'superuser']}>
                  <TravelerProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/support"
              element={
                <ProtectedRoute allowedRoles={['traveler', 'superuser']}>
                  <TravelerSupportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/messages"
              element={
                <ProtectedRoute allowedRoles={['traveler', 'superuser']}>
                  <TravelerMessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guide/dashboard"
              element={
                <ProtectedRoute allowedRoles={['guide', 'superuser']}>
                  <GuideDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guide/requests"
              element={
                <ProtectedRoute allowedRoles={['guide', 'superuser']}>
                  <GuideRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guide/travelers"
              element={
                <ProtectedRoute allowedRoles={['guide', 'superuser']}>
                  <GuideTravelersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guide/completed-trips"
              element={
                <ProtectedRoute allowedRoles={['guide', 'superuser']}>
                  <GuideCompletedTripsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guide/messages"
              element={
                <ProtectedRoute allowedRoles={['guide', 'superuser']}>
                  <GuideMessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guide/profile"
              element={
                <ProtectedRoute allowedRoles={['guide', 'superuser']}>
                  <GuideProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/support/dashboard"
              element={
                <ProtectedRoute allowedRoles={['support', 'superuser']}>
                  <SupportDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin', 'superuser']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            {/* Superuser Dashboard: Strictly superuser (Admin is unauthorized) */}
            <Route
              path="/super/dashboard"
              element={
                <ProtectedRoute allowedRoles={['superuser']}>
                  <SuperDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agency/dashboard"
              element={
                <ProtectedRoute allowedRoles={['agency', 'superuser']}>
                  <AgencyDashboardPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 Catch-All */}
          <Route
            path="*"
            element={
              <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                <h2>404 — Page Not Found</h2>
                <p style={{ color: 'var(--muted)', marginTop: '8px' }}>
                  The requested route does not exist.
                </p>
                <a href="/" style={{ color: 'var(--primary)', marginTop: '16px', display: 'inline-block' }}>
                  ← Return to Home
                </a>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
