/**
 * Expenses seed data
 * Source: front-end/JS/mockData.js → DB.expenses
 *
 * Relationships:
 *   - tripId → trips.tripId
 */
export interface Expense {
  expenseId: number;
  amount: number;
  type: 'Hotel' | 'Flight' | 'Transport' | 'Food' | 'Activity' | 'Shopping' | 'Package';
  tripId: number;
  description: string;
}

export const expenses: Expense[] = [
  { expenseId: 1, amount: 51000, type: 'Hotel', tripId: 1, description: 'Hotel Lumiere Deposit' },
  { expenseId: 2, amount: 72000, type: 'Flight', tripId: 1, description: 'Air France XY123' },
  { expenseId: 3, amount: 3800, type: 'Transport', tripId: 1, description: 'Metro Pass' },
  { expenseId: 4, amount: 7200, type: 'Food', tripId: 1, description: 'Restaurant La Belle' },
  { expenseId: 5, amount: 15700, type: 'Flight', tripId: 5, description: 'IndiGo 6E-231 DEL→GOI' },
  { expenseId: 6, amount: 27200, type: 'Hotel', tripId: 5, description: 'Taj Fort Aguada 4 nights' },
  { expenseId: 7, amount: 2400, type: 'Transport', tripId: 5, description: 'Scooter rental' },
  { expenseId: 8, amount: 3800, type: 'Activity', tripId: 5, description: 'Dudhsagar Falls tour' },
  { expenseId: 9, amount: 5500, type: 'Food', tripId: 5, description: "Fisherman's Wharf dinner" },
  { expenseId: 10, amount: 3000, type: 'Food', tripId: 5, description: 'Baga Beach shacks' },
  { expenseId: 11, amount: 1800, type: 'Shopping', tripId: 5, description: 'Anjuna Flea Market souvenirs' },
  { expenseId: 12, amount: 57800, type: 'Flight', tripId: 6, description: 'Emirates EK-508 HYD→DXB' },
  { expenseId: 13, amount: 157200, type: 'Hotel', tripId: 6, description: 'Atlantis The Palm 5 nights' },
  { expenseId: 14, amount: 8100, type: 'Activity', tripId: 6, description: 'Burj Khalifa 148th Floor' },
  { expenseId: 15, amount: 10200, type: 'Activity', tripId: 6, description: 'Desert Safari Premium' },
  { expenseId: 16, amount: 80700, type: 'Flight', tripId: 4, description: 'Delta DL-185 BOM→JFK' },
  { expenseId: 17, amount: 93500, type: 'Hotel', tripId: 4, description: 'The Roosevelt Hotel' },
  { expenseId: 18, amount: 85000, type: 'Hotel', tripId: 13, description: 'Rome Cavalieri Hotel 7 nights voucher' },
  { expenseId: 19, amount: 55000, type: 'Flight', tripId: 13, description: 'Air India AI-121 BOM→FCO group seats' },
  { expenseId: 20, amount: 15000, type: 'Transport', tripId: 13, description: 'Private Vatican & Colosseum Coach' },
  { expenseId: 21, amount: 20000, type: 'Activity', tripId: 13, description: 'Vatican Museums VIP Guided Entry' },
  { expenseId: 22, amount: 120000, type: 'Hotel', tripId: 21, description: 'Kulm Hotel St. Moritz 7 nights' },
  { expenseId: 23, amount: 65000, type: 'Flight', tripId: 21, description: 'Air France XY123 Client Flights' },
  { expenseId: 24, amount: 35000, type: 'Transport', tripId: 21, description: 'Glacier Express 1st Class Rail Pass' },
  { expenseId: 25, amount: 25000, type: 'Activity', tripId: 21, description: 'Matterhorn Alpine Guided Expedition' },
];
