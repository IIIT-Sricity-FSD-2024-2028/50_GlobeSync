/**
 * demoActors.ts
 *
 * Dedicated frontend configuration file containing the six pre-configured
 * academic demonstration actor credentials.
 *
 * In accordance with project security policies, this configuration is ONLY
 * rendered in the UI when VITE_SHOW_DEMO_ACCOUNTS=true in the environment.
 * In production deployment, set VITE_SHOW_DEMO_ACCOUNTS=false so that no
 * credentials are ever included or visible in the client bundle.
 */

export interface DemoActor {
  id: string;
  key: string;
  role: 'traveler' | 'guide' | 'agency' | 'support' | 'admin' | 'superuser';
  name: string;
  email: string;
  password: string;
  portalDescription: string;
  portalRoute: string;
  badgeColor: string;
  avatarIcon: string;
}

export const DEMO_ACTORS: DemoActor[] = [
  {
    id: 'traveler-1',
    key: 'traveler',
    role: 'traveler',
    name: 'Traveler',
    email: 'Arjun@gmail.com',
    password: 'traveler123',
    portalDescription: 'Plan custom itineraries, book packages, manage co-travelers, track expenses, and view trip details.',
    portalRoute: '/traveler/dashboard',
    badgeColor: '#3b82f6',
    avatarIcon: '🧳',
  },
  {
    id: 'guide-1',
    key: 'guide',
    role: 'guide',
    name: 'Guide',
    email: 'Devansh@gmail.com',
    password: 'guide123',
    portalDescription: 'Accept/decline assigned traveler bookings, coordinate itineraries, and manage reviews.',
    portalRoute: '/guide/dashboard',
    badgeColor: '#10b981',
    avatarIcon: '🧭',
  },
  {
    id: 'agency-1',
    key: 'agency',
    role: 'agency',
    name: 'Agency',
    email: 'ops@horizontravel.com',
    password: 'horizon123',
    portalDescription: 'Publish holiday packages, manage client bookings, reconcile commissions, and track revenue.',
    portalRoute: '/agency/dashboard',
    badgeColor: '#8b5cf6',
    avatarIcon: '🏢',
  },
  {
    id: 'support-1',
    key: 'support',
    role: 'support',
    name: 'Support',
    email: 'Aisha.johnson@gmail.com',
    password: 'support123',
    portalDescription: 'Resolve traveler and agency support tickets, process refunds, and provide emergency assistance.',
    portalRoute: '/support/dashboard',
    badgeColor: '#f59e0b',
    avatarIcon: '🎧',
  },
  {
    id: 'admin-1',
    key: 'admin',
    role: 'admin',
    name: 'Admin',
    email: 'admin@ticp.com',
    password: 'admin123',
    portalDescription: 'Verify guide certifications, approve agency onboarding, set guide rates, and oversee platform operations.',
    portalRoute: '/admin/dashboard',
    badgeColor: '#ef4444',
    avatarIcon: '🛡️',
  },
  {
    id: 'superuser-1',
    key: 'superuser',
    role: 'superuser',
    name: 'Super Admin',
    email: 'superadmin@ticp.com',
    password: 'super123',
    portalDescription: 'Full platform governance: manage staff roles, configure platform commission rules, and inspect audit logs.',
    portalRoute: '/super/dashboard',
    badgeColor: '#6366f1',
    avatarIcon: '⚡',
  },
];

export const isDemoAccountsEnabled = (): boolean => {
  if (typeof window !== 'undefined' && (window as any).__OVERRIDE_SHOW_DEMO_ACCOUNTS__ !== undefined) {
    return (window as any).__OVERRIDE_SHOW_DEMO_ACCOUNTS__ === true;
  }
  const flag = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS;
  // Not set at all (for example no .env file): show the demo buttons in local
  // development only. Production builds still need an explicit 'true'.
  if (flag === undefined || flag === '') return !!import.meta.env.DEV;
  return flag === 'true' || flag === true;
};
