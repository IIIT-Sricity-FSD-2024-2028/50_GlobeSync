import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-top-grid">
        <div className="footer-brand">
          <div className="footer-brand-title">🌐 GlobeSync</div>
          <p>
            The modern, unified platform for seamless travel itinerary planning,
            guide coordination, and comprehensive hospitality management.
          </p>
        </div>

        <div className="footer-col">
          <h4 style={{ color: '#fff', marginBottom: '12px' }}>Portals</h4>
          <ul style={{ listStyle: 'none', lineHeight: '2' }}>
            <li><Link to="/login/traveler">Traveler Portal</Link></li>
            <li><Link to="/login/staff?role=guide">Guide Portal</Link></li>
            <li><Link to="/login/agency">Agency Portal</Link></li>
            <li><Link to="/login/staff?role=admin">Admin Portal</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 style={{ color: '#fff', marginBottom: '12px' }}>Company</h4>
          <ul style={{ listStyle: 'none', lineHeight: '2' }}>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Support & Contact</Link></li>
            <li><a href="#destinations">Destinations</a></li>
            <li><a href="#features">Features</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 style={{ color: '#fff', marginBottom: '12px' }}>Contact</h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8' }}>
            📍 IIIT Sri City Campus, India<br />
            📧 support@globesync.io<br />
            📞 +91 800-GLOBE-SYNC
          </p>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <span>© {new Date().getFullYear()} GlobeSync. Built for College Evaluation.</span>
        <span>All systems operational • NestJS + React</span>
      </div>
    </footer>
  );
}
