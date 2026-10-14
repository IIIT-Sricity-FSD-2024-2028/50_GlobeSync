import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import { useSession } from '../context/SessionContext';

// Central configuration of role-specific navigation menus
const ROLE_MENU_CONFIG = {
  traveler: [
    { label: 'Dashboard', path: '/traveler/dashboard', icon: '📊' },
    { label: 'Browse Packages', path: '/traveler/packages', icon: '📦' },
    { label: 'Plan Itinerary', path: '/traveler/plan', icon: '🗺' },
    { label: 'My Trips', path: '/traveler/trips', icon: '📍' },
    { label: 'Bookings', path: '/traveler/bookings', icon: '🎫' },
    { label: 'Expenses', path: '/traveler/expenses', icon: '💳' },
    { label: 'My Profile', path: '/traveler/profile', icon: '👤' },
    { label: 'Messages', path: '/traveler/messages', icon: '💬' },
    { label: 'Support', path: '/traveler/support', icon: '🎧' },
  ],
  guide: [
    { label: 'Dashboard', path: '/guide/dashboard', icon: '📊' },
    { label: 'Trip Requests', path: '/guide/requests', icon: '📥' },
    { label: 'Assigned Travelers', path: '/guide/travelers', icon: '👥' },
    { label: 'Completed Trips', path: '/guide/completed-trips', icon: '✅' },
    { label: 'Messages', path: '/guide/messages', icon: '💬' },
    { label: 'Profile', path: '/guide/profile', icon: '👤' },
  ],
  support: [
    { label: 'Dashboard', path: '/support/dashboard', icon: '📊' },
    { label: 'Tickets Queue', path: '/support/tickets', icon: '🎫' },
    { label: 'Refund Requests', path: '/support/refunds', icon: '💰' },
    { label: 'Messages', path: '/support/messages', icon: '💬' },
    { label: 'Profile', path: '/support/profile', icon: '👤' },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { label: 'Bookings', path: '/admin/bookings', icon: '🎫' },
    { label: 'Trips Oversight', path: '/admin/trips', icon: '📍' },
    { label: 'Packages', path: '/admin/packages', icon: '📦' },
    { label: 'Agencies', path: '/admin/agencies', icon: '🏢' },
    { label: 'Guides', path: '/admin/guides', icon: '🧭' },
    { label: 'Reviews', path: '/admin/reviews', icon: '⭐' },
    { label: 'Reports', path: '/admin/reports', icon: '📈' },
    { label: 'Profile', path: '/admin/profile', icon: '👤' },
  ],
  superuser: [
    { label: 'Dashboard', path: '/super/dashboard', icon: '📊' },
    { label: 'Revenue & Margins', path: '/super/revenue', icon: '💰' },
    { label: 'User Directory', path: '/super/users', icon: '👥' },
    { label: 'Agencies', path: '/super/agencies', icon: '🏢' },
    { label: 'Payment Methods', path: '/super/payment-methods', icon: '💳' },
    { label: 'Rules Config', path: '/super/rules-config', icon: '⚙️' },
    { label: 'API Management', path: '/super/api-management', icon: '🔌' },
    { label: 'System Reports', path: '/super/reports', icon: '📈' },
    { label: 'Profile', path: '/super/profile', icon: '👤' },
  ],
  agency: [
    { label: 'Dashboard', path: '/agency/dashboard', icon: '📊' },
    { label: 'Browse Packages', path: '/agency/packages', icon: '📦' },
    { label: 'Create Itinerary', path: '/agency/create-itinerary', icon: '🗺️' },
    { label: 'Client Bookings', path: '/agency/bookings', icon: '🎫' },
    { label: 'Passenger Roster', path: '/agency/passengers', icon: '👥' },
    { label: 'Trip Expenses', path: '/agency/expenses', icon: '🧾' },
    { label: 'Commission Ledger', path: '/agency/commission', icon: '💰' },
    { label: 'Payments', path: '/agency/payments', icon: '💳' },
    { label: 'Subscriptions', path: '/agency/subscription', icon: '⭐' },
    { label: 'Messages', path: '/agency/messages', icon: '💬' },
    { label: 'Agency Profile', path: '/agency/profile', icon: '🏢' },
    { label: 'Support Desk', path: '/agency/support', icon: '🎧' },
  ],
};

export default function DashboardLayout() {
  const { role } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Extract menu items based on authenticated role
  const currentMenuItems = ROLE_MENU_CONFIG[role] || [];

  return (
    <div className="layout" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-soft, #fcfade)' }}>
      {/* Sidebar with menu items passed as props */}
      <Sidebar
        menuItems={currentMenuItems}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className="main-layout-container"
        style={{
          marginLeft: 'var(--sidebar-width, 250px)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0, // Prevents flex child overflow
          transition: 'margin-left 0.3s ease',
        }}
      >
        {/* Shared Dashboard Header */}
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Dynamic Outlet for role pages */}
        <main style={{ flex: 1, padding: '24px 32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
