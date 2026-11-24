/**
 * Travelers seed data — Core actors only
 */
export interface Traveler {
  travelerId: number;
  name: string;
  phone: string;
  email: string;
  gender: string;
  age: number;
  password?: string;
}

export const travelers: Traveler[] = [
  { travelerId: 1, name: 'Arjun Mehta', phone: '9876543210', email: 'Arjun@gmail.com', gender: 'Male', age: 28, password: 'traveler123' },
];
