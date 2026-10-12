import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

/**
 * Shared layout for public-facing pages (Landing, About, Contact)
 */
export default function PublicLayout() {
  return (
    <div className="public-layout-wrapper">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
