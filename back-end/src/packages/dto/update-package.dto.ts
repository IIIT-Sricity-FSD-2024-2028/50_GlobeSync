import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePackageDto {
  @ApiPropertyOptional({ example: 'Maldives Paradise', description: 'Package name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Maldives', description: 'Destination(s)' })
  @IsOptional()
  @IsString()
  destinations?: string;

  @ApiPropertyOptional({ example: 185000, description: 'Package budget/price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ example: 7, description: 'Duration in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ example: 'Updated description.', description: 'Package description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Snorkeling, Sunset Cruise', description: 'Trip highlights' })
  @IsOptional()
  @IsString()
  highlights?: string;

  @ApiPropertyOptional({ example: '../static/destinations/maldives.png', description: 'Image path' })
  @IsOptional()
  @IsString()
  image?: string;
}
