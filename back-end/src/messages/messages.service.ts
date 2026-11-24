import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { messages, Message } from '../data';
import { CreateMessageDto, ConversationQueryDto } from './dto';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { testDb } from '../database/test-database';

@Injectable()
export class MessagesService {
  constructor(
    @Optional() private readonly realtimeService?: RealtimeService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  findAll(): Message[] {
    return messages;
  }

  /**
   * Get all messages where user is sender or receiver.
   */
  findByUser(userType: string, userId: number): Message[] {
    return messages.filter(
      (m) =>
        (m.sender === userType && m.senderId === userId) ||
        (m.receiver === userType && m.receiverId === userId),
    );
  }

  /**
   * Get conversation between two users or within a booking/ticket room with pagination.
   */
  findConversation(query: ConversationQueryDto): { messages: Message[]; total: number } {
    let filtered: Message[] = [];

    if (query.bookingId) {
      filtered = messages.filter((m) => m.bookingId === query.bookingId);
    } else if (query.ticketId) {
      filtered = messages.filter((m) => m.ticketId === query.ticketId);
    } else if (query.sender && query.senderId && query.receiver && query.receiverId) {
      const sType = query.sender;
      const sId = query.senderId;
      const rType = query.receiver;
      const rId = query.receiverId;

      filtered = messages.filter(
        (m) =>
          (m.sender === sType && m.senderId === sId && m.receiver === rType && m.receiverId === rId) ||
          (m.sender === rType && m.senderId === rId && m.receiver === sType && m.receiverId === sId),
      );
    } else {
      filtered = [...messages];
    }

    const total = filtered.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;

    const paged = filtered.slice(offset, offset + limit);
    return { messages: paged, total };
  }

  /**
   * Legacy method signature for backward compatibility
   */
  findConversationLegacy(
    senderType: string,
    senderId: number,
    receiverType: string,
    receiverId: number,
  ): Message[] {
    return this.findConversation({
      sender: senderType,
      senderId,
      receiver: receiverType,
      receiverId,
    }).messages;
  }

  create(dto: CreateMessageDto): Message {
    const maxId = messages.length > 0 ? Math.max(...messages.map((m) => m.messageId)) : 0;
    const nowIso = new Date().toISOString();

    const item: Message = {
      messageId: maxId + 1,
      sender: dto.sender,
      senderId: dto.senderId,
      receiver: dto.receiver,
      receiverId: dto.receiverId,
      content: dto.content,
      timestamp: nowIso,
      bookingId: dto.bookingId,
      ticketId: dto.ticketId,
      status: 'sent',
      deliveredAt: nowIso,
    };

    messages.push(item);
    if (!testDb.messages) testDb.messages = [];
    testDb.messages.push(item);

    // Emit realtime events
    if (this.realtimeService) {
      // Emit to booking room if applicable
      if (item.bookingId) {
        this.realtimeService.emitToBooking(item.bookingId, 'message.created', item);
      }
      // Emit to ticket room if applicable
      if (item.ticketId) {
        this.realtimeService.emitToTicket(item.ticketId, 'message.created', item);
      }
      // Emit directly to receiver user room
      this.realtimeService.emitToUser(item.receiverId, 'message.created', item, item.receiver);
    }

    // Persist a notification for receiver
    if (this.notificationsService) {
      this.notificationsService.createNotification(
        item.receiverId,
        `New message from ${item.sender}`,
        item.content.length > 60 ? `${item.content.slice(0, 60)}...` : item.content,
        { role: item.receiver,
          type: 'chat_message',
          metadata: { messageId: item.messageId, senderId: item.senderId },
        },
      ).catch(() => {});
    }

    return item;
  }

  /**
   * Mark message as read, update receipt timestamp, and emit read_receipt to sender.
   */
  markAsRead(messageId: number, readerId: number): Message {
    const item = messages.find((m) => m.messageId === messageId);
    if (!item) {
      throw new NotFoundException(`Message #${messageId} not found`);
    }

    item.status = 'read';
    item.readAt = new Date().toISOString();

    if (this.realtimeService) {
      // Notify sender that their message was read
      this.realtimeService.emitToUser(item.senderId, 'message.read_receipt', {
        messageId: item.messageId,
        readerId,
        readAt: item.readAt,
      }, item.sender);

      // Broadcast receipt in booking room if applicable
      if (item.bookingId) {
        this.realtimeService.emitToBooking(item.bookingId, 'message.read_receipt', {
          messageId: item.messageId,
          readerId,
          readAt: item.readAt,
        });
      }
    }

    return item;
  }
}
