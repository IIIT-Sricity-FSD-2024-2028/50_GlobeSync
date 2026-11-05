import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePassengerDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 30 })
  @IsNotEmpty()
  @IsNumber()
  age: number;

  @ApiProperty({ example: 'Female' })
  @IsNotEmpty()
  @IsString()
  gender: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  travelerId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  agencyId?: number;

  @ApiPropertyOptional({ example: 'jane.doe@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '1995-05-15' })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiPropertyOptional({ example: 'Passport' })
  @IsOptional()
  @IsString()
  idType?: string;

  @ApiPropertyOptional({ example: 'Z1234567' })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiPropertyOptional({ example: 'Vegetarian meal, wheelchair assistance requested' })
  @IsOptional()
  @IsString()
  specialNotes?: string;
}
