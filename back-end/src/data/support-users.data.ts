/**
 * Support users seed data — Core actors only
 */
export interface SupportUser {
  careId: number;
  name: string;
  contact: string;
  email: string;
  password?: string;
  role: 'support';
  status?: 'active' | 'deactivated';
}

export const supportUsers: SupportUser[] = [
  {
    careId: 1,
    name: 'Aisha Johnson',
    contact: '9001122334',
    email: 'Aisha.johnson@gmail.com',
    password: 'support123',
    role: 'support',
    status: 'active',
  },
];
