import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() travelerId?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() agencyId?: number;
  @ApiPropertyOptional({ example: 21 }) @IsOptional() @IsInt() tripId?: number;
  @ApiPropertyOptional({ example: 101 }) @IsOptional() @IsInt() bookingId?: number;
  @ApiProperty({ example: 'Booking issue' }) @IsNotEmpty() @IsString() issueType: string;
  @ApiProperty({ example: 'My booking shows wrong dates.' }) @IsNotEmpty() @IsString() description: string;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() careId?: number;
  @ApiPropertyOptional({ example: 'Urgent', enum: ['Urgent', 'High', 'Medium', 'Low'] })
  @IsOptional() @IsString() @IsIn(['Urgent', 'High', 'Medium', 'Low']) priority?: string;
  @ApiPropertyOptional({ example: 'Open', enum: ['Open', 'In Progress', 'Resolved', 'Closed'] })
  @IsOptional() @IsString() @IsIn(['Open', 'In Progress', 'Resolved', 'Closed']) status?: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ example: 'Resolved', enum: ['Open', 'In Progress', 'Resolved', 'Closed'] })
  @IsNotEmpty() @IsString() @IsIn(['Open', 'In Progress', 'Resolved', 'Closed']) status: string;
}

export class CreateTicketReplyDto {
  @ApiProperty({ example: 'Thank you for following up. We are waiting on confirmation.' })
  @IsNotEmpty() @IsString()
  message: string;

  @ApiPropertyOptional({ example: 'Horizon Travel Partners' })
  @IsOptional() @IsString()
  senderName?: string;
}

export class AssignTicketDto {
  @ApiProperty({ example: 1, description: 'Support agent careId to assign this ticket to' })
  @IsNotEmpty()
  @IsInt()
  careId: number;
}

export class CreateInternalNoteDto {
  @ApiProperty({ example: 'Checked gateway ledger; transaction confirmed by provider.' })
  @IsNotEmpty()
  @IsString()
  note: string;
}

export class AdjudicateRefundDto {
  @ApiProperty({ example: 101, description: 'Target booking ID for policy adjudication' })
  @IsNotEmpty()
  @IsInt()
  bookingId: number;

  @ApiProperty({ example: 'Medical emergency with certified hospital report' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: false, description: 'True if invoking PolicyService emergency override' })
  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;
}
