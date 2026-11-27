export interface Message {
  messageId: number;
  sender: 'traveler' | 'guide' | 'support' | 'agency';
  senderId: number;
  receiver: 'traveler' | 'guide' | 'support' | 'agency';
  receiverId: number;
  content: string;
  timestamp: string;
  bookingId?: number;
  ticketId?: number;
  status?: 'sent' | 'delivered' | 'read';
  deliveredAt?: string;
  readAt?: string;
}

export const messages: Message[] = [];
