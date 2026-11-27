export interface Guide {
  guideId: number;
  name: string;
  languages: string[];
  experience: number;
  rating: number;
  pricePerTrip: number;
  contact: string;
  adminId: number;
  email: string;
  password?: string;
  role: 'guide';
  bio?: string;
  specialties?: string[];
  availability?: 'available' | 'on_tour' | 'away';
  adminSetRateMinor?: number;
  verifiedExperienceYears?: number;
  verifiedBy?: number;
  verifiedAt?: string;
  proofUrl?: string;
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED' | 'PENDING';
  verificationNotes?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'DEACTIVATED';
  suspendedAt?: string;
  suspensionReason?: string;
  deactivatedAt?: string;
  deactivationReason?: string;
}

export const guides: Guide[] = [
  {
    guideId: 1,
    name: 'Devansh',
    email: 'Devansh@gmail.com',
    contact: '9876543211',
    rating: 4.9,
    experience: 5,
    pricePerTrip: 2500,
    languages: ['English', 'Hindi', 'French'],
    adminId: 2,
    role: 'guide',
    specialties: ['Mountain Trekking', 'Cultural Heritage', 'Photography'],
    bio: 'Senior Certified Alpine and Heritage Guide with 5+ years leading Himalayan and European expeditions.',
    adminSetRateMinor: 250000,
    verifiedExperienceYears: 5,
    verifiedBy: 2,
    verifiedAt: '2026-01-15T10:00:00.000Z',
    password: 'guide123',
    availability: 'available',
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
  },
  {
    guideId: 2,
    name: 'Aarav Patel',
    email: 'aarav.patel@globesync.local',
    contact: '9876543222',
    rating: 4.8,
    experience: 4,
    pricePerTrip: 2800,
    languages: ['English', 'Hindi', 'Japanese'],
    adminId: 2,
    role: 'guide',
    specialties: ['Tokyo City Tours', 'Historical Walks', 'Culinary Tours'],
    bio: 'Certified bilingual tour guide specializing in East Asian cultural expeditions and modern city tours.',
    adminSetRateMinor: 280000,
    verifiedExperienceYears: 4,
    verifiedBy: 2,
    verifiedAt: '2026-02-10T10:00:00.000Z',
    password: 'guide123',
    availability: 'available',
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
  },
  {
    guideId: 3,
    name: 'Elena Rostova',
    email: 'elena.rostova@globesync.local',
    contact: '9876543233',
    rating: 4.9,
    experience: 6,
    pricePerTrip: 3200,
    languages: ['English', 'Russian', 'German'],
    adminId: 2,
    role: 'guide',
    specialties: ['Adventure Trekking', 'Eco Tourism', 'Wildlife Photography'],
    bio: 'International expedition leader with 6+ years across Alpine trails and cultural heritage landmarks.',
    adminSetRateMinor: 320000,
    verifiedExperienceYears: 6,
    verifiedBy: 2,
    verifiedAt: '2026-01-20T10:00:00.000Z',
    password: 'guide123',
    availability: 'available',
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
  },
];
