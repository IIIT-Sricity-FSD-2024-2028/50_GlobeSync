import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for traveler login request.
 */
export class TravelerLoginDto {
  @ApiProperty({
    description: 'Traveler email address',
    example: 'Arjun@gmail.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'Traveler password',
    example: 'traveler123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
