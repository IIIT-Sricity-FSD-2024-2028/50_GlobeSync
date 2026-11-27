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
  passengerCategory?: string;
  specialNotes?: string;
}

export const passengers: Passenger[] = [];
