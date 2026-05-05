/**
 * Saved passengers seed data
 * Source: front-end/JS/mockData.js → DB.savedPassengers
 *
 * Relationships:
 *   - travelerId → travelers.travelerId
 */
export interface SavedPassenger {
  passId: number;
  travelerId: number;
  name: string;
  age: number;
  gender: string;
}

export const savedPassengers: SavedPassenger[] = [
  { passId: 1, travelerId: 1, name: 'Sita Mehta', age: 25, gender: 'Female' },
  { passId: 2, travelerId: 1, name: 'Rohan Mehta', age: 5, gender: 'Male' },
];
