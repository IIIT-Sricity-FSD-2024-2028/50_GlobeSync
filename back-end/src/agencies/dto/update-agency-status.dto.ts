import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class UpdateAgencyStatusDto {
  @ApiProperty({ example: 'approved', enum: ['pending', 'approved', 'rejected', 'suspended'] })
  @IsIn(['pending', 'approved', 'rejected', 'suspended'])
  status: 'pending' | 'approved' | 'rejected' | 'suspended';

  @ApiPropertyOptional({ example: 1.5, description: 'Commission rate percentage (1.0 to 1.5), typically required when approving' })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(1.5)
  commissionRate?: number;

  @ApiPropertyOptional({ example: 'Verified business licenses and tax registrations', description: 'Admin reason for approval, rejection, or suspension' })
  @IsOptional()
  @IsString()
  reason?: string;
}
