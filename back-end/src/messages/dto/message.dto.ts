import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ example: 'traveler', enum: ['traveler', 'guide', 'support'] })
  @IsNotEmpty() @IsString() @IsIn(['traveler', 'guide', 'support']) sender: string;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsInt() senderId: number;
  @ApiProperty({ example: 'guide', enum: ['traveler', 'guide', 'support'] })
  @IsNotEmpty() @IsString() @IsIn(['traveler', 'guide', 'support']) receiver: string;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsInt() receiverId: number;
  @ApiProperty({ example: 'Hello! I have a question about my trip.' })
  @IsNotEmpty() @IsString() content: string;
}

export class ConversationQueryDto {
  sender: string;
  senderId: number;
  receiver: string;
  receiverId: number;
}
