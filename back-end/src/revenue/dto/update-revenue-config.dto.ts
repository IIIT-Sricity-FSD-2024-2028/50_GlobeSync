import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

/**
 * DTO for updating revenue configuration values.
 *
 * Validation bounds per config key:
 *   DEFAULT_BOOKING_COMMISSION:  0–100  (percentage)
 *   DEFAULT_AGENCY_COMMISSION:   0–100  (percentage)
 *   DEFAULT_GUIDE_COMMISSION:    0–100  (percentage)
 *   DEFAULT_PROVIDER_COMMISSION: 0–100  (percentage)
 *
 * The DTO enforces the universal 0–100 range. Key-specific bounds
 * are further validated in the service layer.
 */
export class UpdateRevenueConfigDto {
  @ApiProperty({
    example: 10,
    description: 'Numeric value for the config setting. Must be a number between 0 and 100 (percentage).',
  })
  @IsNotEmpty({ message: 'value is required' })
  @IsNumber({}, { message: 'value must be a number' })
  @Min(0, { message: 'value must be at least 0' })
  @Max(100, { message: 'value must be at most 100' })
  value: number;
}
