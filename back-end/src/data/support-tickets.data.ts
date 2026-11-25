export interface TicketReply {
  replyId: number;
  ticketId: number;
  senderRole: string;
  senderId?: number;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface TicketInternalNote {
  noteId: number;
  authorId: number;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface SupportTicket {
  ticketId: number;
  caseId: number;
  travelerId?: number;
  agencyId?: number;
  guideId?: number;
  tripId?: number;
  bookingId?: number;
  description: string;
  issueType: string;
  careId: number;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  created: string;
  replies?: TicketReply[];
  internalNotes?: TicketInternalNote[];
  slaDeadline?: string;
  slaMinutesRemaining?: number;
  isSlaBreached?: boolean;
  slaStatus?: 'OK' | 'CRITICAL' | 'BREACHED';
}

export const supportTickets: SupportTicket[] = [];
