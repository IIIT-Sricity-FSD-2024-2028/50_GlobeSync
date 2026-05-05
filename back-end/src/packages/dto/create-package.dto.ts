import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePackageDto {
  @ApiProperty({ example: 'Maldives Paradise', description: 'Package name' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Maldives', description: 'Destination(s)' })
  @IsNotEmpty({ message: 'Destinations is required' })
  @IsString()
  destinations: string;

  @ApiProperty({ example: 185000, description: 'Package budget/price' })
  @IsNotEmpty({ message: 'Budget is required' })
  @IsNumber()
  @Min(0)
  budget: number;

  @ApiProperty({ example: 7, description: 'Duration in days' })
  @IsNotEmpty({ message: 'Duration is required' })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiPropertyOptional({ example: 'Crystal clear waters and luxury overwater villas.', description: 'Package description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Snorkeling, Sunset Cruise, Spa', description: 'Trip highlights' })
  @IsOptional()
  @IsString()
  highlights?: string;

  @ApiPropertyOptional({ example: '../static/destinations/maldives.png', description: 'Image path' })
  @IsOptional()
  @IsString()
  image?: string;
}
