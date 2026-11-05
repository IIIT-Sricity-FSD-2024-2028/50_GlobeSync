export interface Agency {
  agencyId: number;
  businessName: string;
  contactPerson?: string;
  contactEmail: string;
  contactPhone: string;
  password?: string;
  status: 'pending' | 'approved' | 'rejected';
  commissionRate?: number;
  licenseGstin?: string;
  officeAddress?: string;
  payoutBankUpi?: string;
  createdAt: string;
}

export const agencies: Agency[] = [
  {
    agencyId: 1,
    businessName: 'Horizon Travel Partners',
    contactPerson: 'Rajesh Mehra',
    contactEmail: 'ops@horizontravel.com',
    contactPhone: '9876543210',
    password: 'horizon123',
    status: 'approved',
    commissionRate: 1.5,
    licenseGstin: '07AAAAA0000A1Z5',
    officeAddress: 'Suite 402, Connaught Place, New Delhi, 110001',
    payoutBankUpi: 'horizon@hdfcbank',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    agencyId: 2,
    businessName: 'Wanderlust Resellers',
    contactPerson: 'Priya Kapoor',
    contactEmail: 'bookings@wanderlust.in',
    contactPhone: '9123456780',
    password: 'wander123',
    status: 'approved',
    commissionRate: 1.2,
    licenseGstin: '27BBBBB1111B2Z6',
    officeAddress: 'Bandra West, Mumbai, 400050',
    payoutBankUpi: 'wanderlust@icici',
    createdAt: '2024-02-20T10:30:00Z',
  },
  {
    agencyId: 3,
    businessName: 'NextStop Adventures',
    contactPerson: 'Amit Sinha',
    contactEmail: 'hello@nextstop.travel',
    contactPhone: '9988776655',
    password: 'nextstop123',
    status: 'pending',
    createdAt: '2024-03-05T09:15:00Z',
  },
];
