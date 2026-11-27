/**
 * Administrators seed data — Core actors only
 */
export interface Admin {
  adminId: number;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'superuser';
  status?: 'active' | 'deactivated';
}

export const admins: Admin[] = [
  { adminId: 1, name: 'Super Admin', email: 'superadmin@ticp.com', password: 'super123', role: 'superuser', status: 'active' },
  { adminId: 2, name: 'Manoj Gupta', email: 'admin@ticp.com', password: 'admin123', role: 'admin', status: 'active' },
];
