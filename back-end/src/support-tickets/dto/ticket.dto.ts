import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsInt() travelerId: number;
  @ApiProperty({ example: 'Booking issue' }) @IsNotEmpty() @IsString() issueType: string;
  @ApiProperty({ example: 'My booking shows wrong dates.' }) @IsNotEmpty() @IsString() description: string;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() careId?: number;
  @ApiPropertyOptional({ example: 'High', enum: ['High', 'Medium', 'Low'] })
  @IsOptional() @IsString() @IsIn(['High', 'Medium', 'Low']) priority?: string;
  @ApiPropertyOptional({ example: 'Open', enum: ['Open', 'In Progress', 'Resolved', 'Closed'] })
  @IsOptional() @IsString() @IsIn(['Open', 'In Progress', 'Resolved', 'Closed']) status?: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ example: 'Resolved', enum: ['Open', 'In Progress', 'Resolved', 'Closed'] })
  @IsNotEmpty() @IsString() @IsIn(['Open', 'In Progress', 'Resolved', 'Closed']) status: string;
}
