import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating a support-user profile.
 * Only name, contact, and email may be changed.
 * Password and role are immutable through this endpoint.
 * The careId is an immutable identifier read from the URL param.
 */
export class UpdateSupportUserDto {
  @ApiPropertyOptional({ example: 'Aisha Khan', description: 'Full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '9001122334', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({ example: 'aisha@example.com', description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;
}
