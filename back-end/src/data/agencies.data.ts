export interface Agency {
  agencyId: number;
  businessName: string;
  contactPerson?: string;
  contactEmail: string;
  contactPhone: string;
  password?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  commissionRate?: number;
  licenseGstin?: string;
  officeAddress?: string;
  payoutBankUpi?: string;
  createdAt: string;
  role?: string;
  statusReason?: string;
  approvedBy?: number;
  approvedAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
}

export const agencies: Agency[] = [
  {
    agencyId: 1,
    businessName: 'Horizon Travel Partners',
    contactPerson: 'Horizon Operations',
    contactEmail: 'ops@horizontravel.com',
    contactPhone: '9820112233',
    password: 'horizon123',
    status: 'approved',
    commissionRate: 1.5,
    licenseGstin: 'GSTIN27AABCU9603R1ZM',
    officeAddress: 'Tower B, Level 4, Bandra-Kurla Complex, Mumbai, Maharashtra 400051',
    payoutBankUpi: 'horizon@hdfcbank',
    createdAt: '2026-01-10T14:30:00.000Z',
  },
];
