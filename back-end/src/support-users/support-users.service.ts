import { Injectable, NotFoundException } from '@nestjs/common';
import { supportUsers, SupportUser } from '../data';
import { UpdateSupportUserDto } from './dto';

/** Public safe shape — password is always stripped before returning. */
export type SupportUserProfile = Omit<SupportUser, 'password'>;

@Injectable()
export class SupportUsersService {
  /**
   * Strip password from a SupportUser record before returning it to callers.
   * Never mutates the stored record — auth.service.ts needs the password
   * for staff login.
   */
  private sanitize(user: SupportUser): SupportUserProfile {
    const { password: _omitted, ...safe } = user;
    return safe;
  }

  /**
   * Retrieve a single support-user profile by careId.
   * Returns 404 when the record does not exist.
   * Never returns the password field.
   */
  findOne(id: number): SupportUserProfile {
    const user = supportUsers.find((u) => u.careId === id);
    if (!user) {
      throw new NotFoundException(`Support user with careId ${id} not found`);
    }
    return this.sanitize(user);
  }

  /**
   * Update name, contact, and/or email of a support-user profile.
   * Role and password are immutable through this endpoint.
   * Returns the updated profile without the password field.
   * Returns 404 when the record does not exist.
   */
  update(id: number, dto: UpdateSupportUserDto): SupportUserProfile {
    const index = supportUsers.findIndex((u) => u.careId === id);
    if (index === -1) {
      throw new NotFoundException(`Support user with careId ${id} not found`);
    }

    const existing = supportUsers[index];
    const updated: SupportUser = {
      ...existing,
      ...(dto.name    !== undefined && { name:    dto.name }),
      ...(dto.contact !== undefined && { contact: dto.contact }),
      ...(dto.email   !== undefined && { email:   dto.email }),
      // password and role are intentionally excluded from the update path
    };

    supportUsers[index] = updated;
    return this.sanitize(updated);
  }
}
