import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class CreateTravelerDto {
  @ApiProperty({ example: 'Priya Sharma', description: 'Full name of the traveler' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'priya@gmail.com', description: 'Email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'traveler123', description: 'Account password' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Female', description: 'Gender' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 26, description: 'Age', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  age?: number;
}
