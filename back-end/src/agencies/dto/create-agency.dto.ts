import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateAgencyDto {
  @ApiProperty({ example: 'Elite Travel Partners' })
  @IsNotEmpty()
  @IsString()
  businessName: string;

  @ApiProperty({ example: 'contact@elitetravel.com' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  contactPhone: string;

  @ApiProperty({ example: 'securepassword123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 1.5, description: 'Requested commission rate (1.0 to 1.5)' })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(1.5)
  commissionRate?: number;
}
