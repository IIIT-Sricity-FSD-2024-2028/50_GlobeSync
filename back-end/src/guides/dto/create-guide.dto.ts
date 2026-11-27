import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateGuideDto {
  @ApiProperty({ example: 'Sophia', description: 'Guide name' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'sophia@gmail.com', description: 'Email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'guide123', description: 'Account password' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: ['English', 'Spanish'], description: 'Languages spoken', type: [String] })
  @IsOptional()
  @IsArray()
  languages?: string[];

  @ApiPropertyOptional({ example: 5, description: 'Years of experience' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experience?: number;

  @ApiPropertyOptional({ example: 4.5, description: 'Rating (0-5)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 7000, description: 'Price per trip' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerTrip?: number;

  @ApiPropertyOptional({ example: '9876543210', description: 'Contact number' })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({ example: 1, description: 'Assigned admin ID' })
  @IsOptional()
  @IsNumber()
  adminId?: number;
}
