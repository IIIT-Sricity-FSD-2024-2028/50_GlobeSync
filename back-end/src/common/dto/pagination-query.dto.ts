import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min } from 'class-validator';

/**
 * Reusable pagination query DTO for list endpoints.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Number of items per page', default: 10, minimum: 1 })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Number of items to skip', default: 0, minimum: 0 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
