import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user with optional since cursor for reconnect' })
  @ApiQuery({ name: 'since', required: false, description: 'ISO date string cursor for fetching missed notifications' })
  @ApiResponse({ status: 200, description: 'Notifications list and unread count' })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('since') since?: string,
  ) {
    const userId = Number(user.id || user.userId || user.sub);
    return this.notificationsService.getNotifications(userId, since, user.role);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = Number(user.id || user.userId || user.sub);
    return this.notificationsService.markAsRead(id, userId, user.role);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all unread notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: any) {
    const userId = Number(user.id || user.userId || user.sub);
    return this.notificationsService.markAllAsRead(userId, user.role);
  }
}
