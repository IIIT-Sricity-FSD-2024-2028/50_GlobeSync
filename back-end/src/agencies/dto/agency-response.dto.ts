import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Safe public representation of an Agency.
 * The password field is intentionally absent.
 * Auth login (auth.service.ts) uses the raw Agency record directly
 * and strips the password separately — do not add password here.
 */
export class AgencyResponseDto {
  @ApiProperty({ example: 1 })
  agencyId: number;

  @ApiProperty({ example: 'Horizon Travel Partners' })
  businessName: string;

  @ApiProperty({ example: 'ops@horizontravel.com' })
  contactEmail: string;

  @ApiProperty({ example: '9876543210' })
  contactPhone: string;

  @ApiProperty({ example: 'approved', enum: ['pending', 'approved', 'rejected'] })
  status: 'pending' | 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 1.5 })
  commissionRate?: number;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  createdAt: string;
}
