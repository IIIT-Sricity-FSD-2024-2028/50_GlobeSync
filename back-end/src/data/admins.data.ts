/**
 * Administrators seed data
 * Source: front-end/JS/mockData.js → DB.administrators
 */
export interface Admin {
  adminId: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'superuser';
}

export const admins: Admin[] = [
  { adminId: 1, name: 'Super Admin', email: 'superadmin@ticp.com', password: 'super123', role: 'superuser' },
  { adminId: 2, name: 'Manoj Gupta', email: 'admin@ticp.com', password: 'admin123', role: 'admin' },
  { adminId: 3, name: 'Sanjay Reddy', email: 'sanjay@gmail.com', password: 'sanjay123', role: 'admin' },
];
