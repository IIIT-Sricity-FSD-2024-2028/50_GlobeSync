import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class VerifyGuideDto {
  @ApiProperty({ example: 450000, description: 'Admin-set rate in minor units (e.g. 450000 = ₹4,500.00)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  adminSetRateMinor: number;

  @ApiProperty({ example: 6, description: 'Verified years of guiding experience' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  verifiedExperienceYears: number;

  @ApiProperty({ example: 'https://storage.globesync.com/proofs/devansh-license.pdf', description: 'Uploaded credential verification document URL' })
  @IsNotEmpty()
  @IsString()
  proofUrl: string;

  @ApiPropertyOptional({ example: 'Ministry of Tourism license and first-aid certification confirmed' })
  @IsOptional()
  @IsString()
  verificationNotes?: string;
}
