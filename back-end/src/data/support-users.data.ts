/**
 * Customer care / support users seed data
 * Source: front-end/JS/mockData.js → DB.customerCare
 */
export interface SupportUser {
  careId: number;
  name: string;
  contact: string;
  email: string;
  password: string;
  role: 'support';
}

export const supportUsers: SupportUser[] = [
  { careId: 1, name: 'Aisha Khan', contact: '9001122334', email: 'Aisha.johnson@gmail.com', password: 'support123', role: 'support' },
  { careId: 2, name: 'Farhan Ali', contact: '9445566778', email: 'Farhan.teja@gmail.com', password: 'support123', role: 'support' },
];
