export interface Passenger {
  passId: number;
  travelerId?: number;
  agencyId?: number;
  name: string;
  age: number;
  gender: string;
  email?: string;
  phone?: string;
  dob?: string;
  idType?: string;
  idNumber?: string;
  specialNotes?: string;
}

export const passengers: Passenger[] = [
  { passId: 1, travelerId: 1, name: 'Sita Mehta', age: 25, gender: 'Female' },
  { passId: 2, travelerId: 1, name: 'Rohan Mehta', age: 5, gender: 'Male' },
  { passId: 3, agencyId: 1, name: 'Vikram Sharma', age: 34, gender: 'Male', email: 'vikram.s@example.com', phone: '+91 98765 43210', dob: '1990-04-15', idType: 'Passport', idNumber: 'Z8765432', specialNotes: 'Vegetarian meals only' },
  { passId: 4, agencyId: 1, name: 'Ananya Sharma', age: 31, gender: 'Female', email: 'ananya.s@example.com', phone: '+91 98765 43211', dob: '1993-08-22', idType: 'Passport', idNumber: 'Z8765433', specialNotes: 'Window seat preferred' },
  { passId: 5, agencyId: 1, name: 'Kabir Sharma', age: 6, gender: 'Male', email: 'vikram.s@example.com', phone: '+91 98765 43210', dob: '2018-11-10', idType: 'Aadhaar', idNumber: '****-****-4591', specialNotes: 'Child meal' },
];
