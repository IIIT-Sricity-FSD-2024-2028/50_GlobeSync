/**
 * Travel guides seed data
 * Source: front-end/JS/mockData.js → DB.travelGuides
 *
 * Relationships:
 *   - adminId → admins.adminId (assigned admin)
 */
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
  password: string;
  role: 'guide';
}

export const guides: Guide[] = [
  { guideId: 1, name: 'Devansh', languages: ['English', 'Hindi', 'French'], experience: 5, rating: 4.8, pricePerTrip: 5500, contact: '9876501234', adminId: 1, email: 'Devansh@gmail.com', password: 'guide123', role: 'guide' },
  { guideId: 2, name: 'Mateo', languages: ['English', 'Japanese', 'Hindi'], experience: 8, rating: 4.5, pricePerTrip: 8500, contact: '9876509876', adminId: 1, email: 'Mateo@gmail.com', password: 'guide123', role: 'guide' },
  { guideId: 3, name: 'Elena', languages: ['English', 'Spanish', 'Hindi'], experience: 3, rating: 4.2, pricePerTrip: 5000, contact: '9871234567', adminId: 2, email: 'Elena@gmail.com', password: 'guide123', role: 'guide' },
  { guideId: 4, name: 'Kael', languages: ['English', 'German', 'Hindi'], experience: 12, rating: 4.9, pricePerTrip: 12000, contact: '9812345678', adminId: 2, email: 'Kael@gmail.com', password: 'guide123', role: 'guide' },
  { guideId: 5, name: 'Omar', languages: ['English', 'Hindi'], experience: 15, rating: 5.0, pricePerTrip: 15000, contact: '9900112233', adminId: 3, email: 'Omar@gmail.com', password: 'guide123', role: 'guide' },
];
