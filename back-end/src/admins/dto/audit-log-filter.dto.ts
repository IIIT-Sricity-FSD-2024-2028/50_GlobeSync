import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class AuditLogFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'rules', description: 'Filter by category (rules, users, payment, integration, security)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Manoj', description: 'Filter by author name' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Start date filter (ISO or YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'End date filter (ISO or YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
