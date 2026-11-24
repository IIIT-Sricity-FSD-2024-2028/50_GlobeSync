import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMessageDto {
  @ApiProperty({ example: 'traveler', enum: ['traveler', 'guide', 'support', 'agency'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['traveler', 'guide', 'support', 'agency'])
  sender: 'traveler' | 'guide' | 'support' | 'agency';

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsInt()
  senderId: number;

  @ApiProperty({ example: 'guide', enum: ['traveler', 'guide', 'support', 'agency'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['traveler', 'guide', 'support', 'agency'])
  receiver: 'traveler' | 'guide' | 'support' | 'agency';

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsInt()
  receiverId: number;

  @ApiProperty({ example: 'Hello! I have a question about my trip.' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  bookingId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  ticketId?: number;
}

export class ConversationQueryDto {
  @ApiPropertyOptional({ example: 'traveler' })
  @IsOptional()
  @IsString()
  sender?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  senderId?: number;

  @ApiPropertyOptional({ example: 'guide' })
  @IsOptional()
  @IsString()
  receiver?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  receiverId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bookingId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ticketId?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
