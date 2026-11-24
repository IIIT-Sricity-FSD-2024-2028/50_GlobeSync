import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto, ConversationQueryDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all messages', description: 'Admin-only: returns every message in the system.' })
  @ApiResponse({ status: 200, description: 'List of all messages' })
  findAll() {
    return this.messagesService.findAll();
  }

  @Get('user/:userType/:userId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.SUPPORT, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get all messages for a user', description: 'Returns all messages where the user is sender or receiver.' })
  @ApiParam({ name: 'userType', enum: ['traveler', 'guide', 'support', 'agency'] })
  @ApiParam({ name: 'userId', type: Number })
  @ApiResponse({ status: 200, description: 'User messages' })
  findByUser(
    @Param('userType') userType: string,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.messagesService.findByUser(userType, userId);
  }

  @Get('conversation')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.SUPPORT, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get conversation between two users or room with pagination' })
  @ApiResponse({ status: 200, description: 'Conversation messages and total count' })
  findConversation(@Query() query: ConversationQueryDto) {
    return this.messagesService.findConversation(query);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.TRAVELER, Role.GUIDE, Role.SUPPORT, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateMessageDto) {
    return this.messagesService.create(dto);
  }

  @Patch(':id/read')
  @Roles(Role.SUPERUSER, Role.TRAVELER, Role.GUIDE, Role.SUPPORT, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Mark message as read and generate read receipt' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const readerId = Number(user?.id || user?.userId || 0);
    return this.messagesService.markAsRead(id, readerId);
  }
}
