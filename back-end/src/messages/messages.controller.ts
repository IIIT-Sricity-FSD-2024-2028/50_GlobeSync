import { Controller, Get, Post, Query, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all messages', description: 'Admin-only: returns every message in the system.' })
  @ApiResponse({ status: 200, description: 'List of all messages' })
  findAll() { return this.messagesService.findAll(); }

  @Get('user/:userType/:userId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get all messages for a user', description: 'Returns all messages where the user is sender or receiver.' })
  @ApiParam({ name: 'userType', enum: ['traveler', 'guide', 'support'] })
  @ApiParam({ name: 'userId', type: Number })
  @ApiResponse({ status: 200, description: 'User messages' })
  findByUser(
    @Param('userType') userType: string,
    @Param('userId', ParseIntPipe) userId: number,
  ) { return this.messagesService.findByUser(userType, userId); }

  @Get('conversation')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get conversation between two users', description: 'Returns bidirectional messages between sender and receiver.' })
  @ApiQuery({ name: 'senderType', enum: ['traveler', 'guide', 'support'], example: 'traveler' })
  @ApiQuery({ name: 'senderId', type: Number, example: 1 })
  @ApiQuery({ name: 'receiverType', enum: ['traveler', 'guide', 'support'], example: 'guide' })
  @ApiQuery({ name: 'receiverId', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Conversation messages' })
  findConversation(
    @Query('senderType') senderType: string,
    @Query('senderId', ParseIntPipe) senderId: number,
    @Query('receiverType') receiverType: string,
    @Query('receiverId', ParseIntPipe) receiverId: number,
  ) {
    return this.messagesService.findConversation(senderType, senderId, receiverType, receiverId);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.TRAVELER, Role.GUIDE, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateMessageDto) { return this.messagesService.create(dto); }
}
