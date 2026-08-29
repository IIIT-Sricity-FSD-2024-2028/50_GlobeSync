import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

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
}
