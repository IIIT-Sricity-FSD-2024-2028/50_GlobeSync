import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePolicyDto {
  @ApiPropertyOptional({ description: 'Lead time before departure in hours', minimum: 0, default: 24 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  leadTimeHours?: number;

  @ApiPropertyOptional({ description: 'Cutoff hours for Tier 1 cancellation (default 72h)', minimum: 0, default: 72 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tier1CutoffHours?: number;

  @ApiPropertyOptional({ description: 'Cutoff hours for Tier 2 cancellation (default 12h)', minimum: 0, default: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tier2CutoffHours?: number;

  @ApiPropertyOptional({ description: 'Default cancellation penalty % (0-100)', minimum: 0, maximum: 100, default: 35 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultCancellationPenaltyPercent?: number;

  @ApiPropertyOptional({ description: 'Protected Tier 1 refund % (0-100)', minimum: 0, maximum: 100, default: 90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  protectedTier1RefundPercent?: number;

  @ApiPropertyOptional({ description: 'Protected Tier 2 refund % (0-100)', minimum: 0, maximum: 100, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  protectedTier2RefundPercent?: number;

  @ApiPropertyOptional({ description: 'Emergency override threshold in minor units requiring Admin approval', minimum: 0, default: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  emergencyOverrideThresholdMinor?: number;
}
