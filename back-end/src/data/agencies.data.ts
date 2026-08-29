export interface Agency {
  agencyId: number;
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  password?: string;
  status: 'pending' | 'approved' | 'rejected';
  commissionRate?: number;
  createdAt: string;
}

export const agencies: Agency[] = [
  {
    agencyId: 1,
    businessName: 'Horizon Travel Partners',
    contactEmail: 'ops@horizontravel.com',
    contactPhone: '9876543210',
    password: 'horizon123',
    status: 'approved',
    commissionRate: 10,
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    agencyId: 2,
    businessName: 'Wanderlust Resellers',
    contactEmail: 'bookings@wanderlust.in',
    contactPhone: '9123456780',
    password: 'wander123',
    status: 'approved',
    commissionRate: 8,
    createdAt: '2024-02-20T10:30:00Z',
  },
  {
    agencyId: 3,
    businessName: 'NextStop Adventures',
    contactEmail: 'hello@nextstop.travel',
    contactPhone: '9988776655',
    password: 'nextstop123',
    status: 'pending',
    createdAt: '2024-03-05T09:15:00Z',
  },
];
