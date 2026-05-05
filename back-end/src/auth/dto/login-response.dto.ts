import { ApiProperty } from '@nestjs/swagger';

/**
 * Successful login response schema for Swagger docs.
 */
export class LoginResponseDto {
  @ApiProperty({ example: 'Login successful' })
  message: string;

  @ApiProperty({
    example: 'traveler',
    enum: ['traveler', 'admin', 'superuser', 'guide', 'support'],
  })
  role: string;

  @ApiProperty({
    description: 'User object (shape depends on role)',
    example: {
      travelerId: 1,
      name: 'Arjun Mehta',
      email: 'Arjun@gmail.com',
      phone: '9876543210',
      gender: 'Male',
      age: 28,
    },
  })
  user: Record<string, any>;
}
