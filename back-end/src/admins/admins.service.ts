import { Injectable, NotFoundException } from '@nestjs/common';
import { admins, Admin } from '../data';
import { UpdateAdminDto } from './dto';

/** Public safe shape — password is always stripped before returning. */
export type AdminProfile = Omit<Admin, 'password'>;

@Injectable()
export class AdminsService {
  /**
   * Strip password from an Admin record before returning it to callers.
   * Never mutates the stored record — auth.service.ts needs the password
   * for staff login.
   */
  private sanitize(admin: Admin): AdminProfile {
    const { password: _omitted, ...safe } = admin;
    return safe;
  }

  /**
   * Retrieve a single admin/superuser profile by adminId.
   * Returns 404 when the record does not exist.
   * Never returns the password field.
   */
  findOne(id: number): AdminProfile {
    const admin = admins.find((a) => a.adminId === id);
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }
    return this.sanitize(admin);
  }

  /**
   * Update name and/or email of an admin/superuser profile.
   * Role is immutable. Password updates are not permitted through this endpoint.
   * Returns the updated profile without the password field.
   * Returns 404 when the record does not exist.
   */
  update(id: number, dto: UpdateAdminDto): AdminProfile {
    const index = admins.findIndex((a) => a.adminId === id);
    if (index === -1) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    const existing = admins[index];
    const updated: Admin = {
      ...existing,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      // password and role are intentionally excluded from the update path
    };

    admins[index] = updated;
    return this.sanitize(updated);
  }
}
