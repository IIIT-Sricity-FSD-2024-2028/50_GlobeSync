import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class UpdateGuideDto {
  @ApiPropertyOptional({ example: 'Sophia', description: 'Guide name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'sophia@gmail.com', description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiPropertyOptional({ example: 'newpassword', description: 'New password' })
  @IsOptional()
  @IsString()
  password?: string;

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

  @ApiPropertyOptional({ example: 'Passionate local guide...', description: 'Guide bio and introduction' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: ['Heritage Walks', 'Food Tours'], description: 'Tour specialties', type: [String] })
  @IsOptional()
  @IsArray()
  specialties?: string[];

  @ApiPropertyOptional({ example: 'available', description: 'Availability status' })
  @IsOptional()
  @IsString()
  availability?: 'available' | 'on_tour' | 'away';

  @ApiPropertyOptional({ example: 250000, description: 'Admin verified daily rate in minor currency units (cents)' })
  @IsOptional()
  @IsNumber()
  adminSetRateMinor?: number;

  @ApiPropertyOptional({ example: 5, description: 'Admin verified experience years' })
  @IsOptional()
  @IsNumber()
  verifiedExperienceYears?: number;

  @ApiPropertyOptional({ example: 'VERIFIED', enum: ['VERIFIED', 'UNVERIFIED', 'PENDING'] })
  @IsOptional()
  @IsString()
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED' | 'PENDING';

  @ApiPropertyOptional({ example: 'https://credentials.gov.in/verify/12345', description: 'Government or license proof URL' })
  @IsOptional()
  @IsString()
  proofUrl?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE', 'DEACTIVATED'] })
  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'DEACTIVATED';
}
