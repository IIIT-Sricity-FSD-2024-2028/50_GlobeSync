export interface Passenger {
  passId: number;
  travelerId?: number;
  agencyId?: number;
  name: string;
  age: number;
  gender: string;
}

export const passengers: Passenger[] = [
  { passId: 1, travelerId: 1, name: 'Sita Mehta', age: 25, gender: 'Female' },
  { passId: 2, travelerId: 1, name: 'Rohan Mehta', age: 5, gender: 'Male' },
];
