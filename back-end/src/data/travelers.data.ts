/**
 * Travelers seed data
 * Source: front-end/JS/mockData.js → DB.travelers
 */
export interface Traveler {
  travelerId: number;
  name: string;
  phone: string;
  email: string;
  gender: string;
  age: number;
  password: string;
}

export const travelers: Traveler[] = [
  { travelerId: 1, name: 'Arjun Mehta', phone: '9876543210', email: 'Arjun@gmail.com', gender: 'Male', age: 28, password: 'traveler123' },
  { travelerId: 2, name: 'Kavya Desai', phone: '9123456789', email: 'Kavya@gmail.com', gender: 'Female', age: 25, password: 'traveler123' },
  { travelerId: 3, name: 'Rohan Varma', phone: '9988776655', email: 'Rohan@gmail.com', gender: 'Male', age: 32, password: 'traveler123' },
  { travelerId: 4, name: 'Nitin Joshi', phone: '9110587215', email: 'Nitin@gmail.com', gender: 'Male', age: 32, password: 'Nitin123' },
];
