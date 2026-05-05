import { Injectable } from '@nestjs/common';
import { messages, Message } from '../data';
import { CreateMessageDto } from './dto';

@Injectable()
export class MessagesService {
  findAll(): Message[] { return messages; }

  /**
   * Get all messages where user is sender or receiver.
   */
  findByUser(userType: string, userId: number): Message[] {
    return messages.filter((m) =>
      (m.sender === userType && m.senderId === userId) ||
      (m.receiver === userType && m.receiverId === userId),
    );
  }

  /**
   * Get conversation between two users.
   * Returns messages where (sender→receiver) OR (receiver→sender) match.
   */
  findConversation(
    senderType: string, senderId: number,
    receiverType: string, receiverId: number,
  ): Message[] {
    return messages.filter((m) =>
      (m.sender === senderType && m.senderId === senderId &&
       m.receiver === receiverType && m.receiverId === receiverId) ||
      (m.sender === receiverType && m.senderId === receiverId &&
       m.receiver === senderType && m.receiverId === senderId),
    );
  }

  create(dto: CreateMessageDto): Message {
    const maxId = messages.length > 0 ? Math.max(...messages.map((m) => m.messageId)) : 0;
    const item: Message = {
      messageId: maxId + 1,
      sender: dto.sender as Message['sender'],
      senderId: dto.senderId,
      receiver: dto.receiver as Message['receiver'],
      receiverId: dto.receiverId,
      content: dto.content,
      timestamp: new Date().toISOString(),
    };
    messages.push(item);
    return item;
  }
}
