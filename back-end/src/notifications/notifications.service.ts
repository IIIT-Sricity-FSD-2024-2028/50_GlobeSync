import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { testDb } from '../database/test-database';

export interface NotificationRecord {
  id: number;
  user_id: number;
  /** recipient role; profile ids are only unique within a role */
  user_role?: string;
  title: string;
  body: string;
  is_read: boolean;
  type?: string;
  link?: string;
  metadata?: any;
  created_at: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private memoryNotifications: NotificationRecord[] = [];
  private nextId = 1;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  /**
   * Create and store a notification, and immediately emit `notification.created`
   * to the recipient's private WebSocket room.
   *
   * Recipients are addressed by (role, profile id) because profile ids are only
   * unique within a role. Notifications live in the same in-memory store as the
   * bookings and trips they describe (the Prisma `notifications` table keys on the
   * login account id and cannot hold role-specific profile ids).
   */
  async createNotification(
    userId: number,
    title: string,
    body: string,
    options: { role: string; type?: string; link?: string; metadata?: any },
  ): Promise<NotificationRecord> {
    const role = String(options.role).toLowerCase();
    const item: NotificationRecord = {
      id: this.nextId++,
      user_id: userId,
      user_role: role,
      title,
      body,
      is_read: false,
      type: options.type,
      link: options.link,
      metadata: options.metadata,
      created_at: new Date(),
    };

    this.store().push(item);

    this.realtimeService.emitToUser(
      userId,
      'notification.created',
      { notification: item, unreadCount: await this.getUnreadCount(userId, role) },
      role,
    );

    this.logger.log(`Created notification #${item.id} for ${role} ${userId}: "${title}"`);
    return item;
  }

  private store(): NotificationRecord[] {
    if (!(testDb as any).notifications) (testDb as any).notifications = this.memoryNotifications;
    return (testDb as any).notifications;
  }

  private belongsTo(n: NotificationRecord, userId: number, role?: string): boolean {
    if (n.user_id !== userId) return false;
    return !role || n.user_role === String(role).toLowerCase();
  }

  /**
   * Get notifications for a user, optionally filtered with a `since` cursor
   * for reconnect synchronization.
   */
  async getNotifications(
    userId: number,
    since?: string,
    role?: string,
  ): Promise<{ notifications: NotificationRecord[]; unreadCount: number }> {
    const sinceDate = since ? new Date(since) : null;
    const list = this.store()
      .filter((n) => this.belongsTo(n, userId, role))
      .filter((n) => !sinceDate || isNaN(sinceDate.getTime()) || new Date(n.created_at) > sinceDate)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);
    return { notifications: list, unreadCount: await this.getUnreadCount(userId, role) };
  }

  /**
   * Get total unread count for user across all their notifications.
   */
  async getUnreadCount(userId: number, role?: string): Promise<number> {
    return this.store().filter((n) => this.belongsTo(n, userId, role) && !n.is_read).length;
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id: number, userId: number, role?: string): Promise<{ success: boolean; unreadCount: number }> {
    const item = this.store().find((n) => n.id === id && this.belongsTo(n, userId, role));
    if (!item) {
      throw new NotFoundException(`Notification with ID ${id} not found for this user`);
    }
    item.is_read = true;
    return { success: true, unreadCount: await this.getUnreadCount(userId, role) };
  }

  /**
   * Mark all unread notifications as read for a user.
   */
  async markAllAsRead(userId: number, role?: string): Promise<{ success: boolean; unreadCount: number }> {
    this.store().forEach((n) => {
      if (this.belongsTo(n, userId, role)) n.is_read = true;
    });
    return { success: true, unreadCount: 0 };
  }

  /**
   * Clear test notifications
   */
  clear() {
    this.memoryNotifications = [];
    (testDb as any).notifications = this.memoryNotifications;
    this.nextId = 1;
  }
}
