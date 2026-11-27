import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class UpdateTravelerDto {
  @ApiPropertyOptional({ example: 'Priya Sharma', description: 'Full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'priya@gmail.com', description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiPropertyOptional({ example: 'newpassword', description: 'New password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Female', description: 'Gender' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 26, description: 'Age', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  age?: number;
}
