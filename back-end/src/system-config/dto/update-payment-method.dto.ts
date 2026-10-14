import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional({ example: 'Credit / Debit Card' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Active', enum: ['Active', 'Inactive'] })
  @IsOptional()
  @IsString()
  @IsIn(['Active', 'Inactive'])
  status?: 'Active' | 'Inactive';

  @ApiPropertyOptional({ example: 'pk_live_••••••••1234' })
  @IsOptional()
  @IsString()
  maskedKey?: string;
}
