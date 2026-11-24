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
  },
];
