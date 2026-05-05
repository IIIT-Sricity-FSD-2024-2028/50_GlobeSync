import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for staff login request.
 * Staff includes: admin, superuser, guide, support.
 */
export class StaffLoginDto {
  @ApiProperty({
    description: 'Staff email address',
    example: 'admin@ticp.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'Staff password',
    example: 'admin123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
