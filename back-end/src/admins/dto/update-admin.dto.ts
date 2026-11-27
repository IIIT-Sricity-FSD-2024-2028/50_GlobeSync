import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO for updating an admin/superuser profile.
 * Only name and email may be changed through this endpoint.
 * Password changes are not permitted here; no safe password-change
 * flow exists in the system (there is no hashing, no reset token, etc.).
 * Role is immutable — it is set at record creation and cannot be self-changed.
 */
export class UpdateAdminDto {
  @ApiPropertyOptional({ example: 'Manoj Gupta', description: 'Display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'admin@ticp.com', description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;
}
