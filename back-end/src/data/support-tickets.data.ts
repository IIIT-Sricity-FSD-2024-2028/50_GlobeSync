export interface TicketReply {
  replyId: number;
  ticketId: number;
  senderRole: string; // 'agency' | 'support' | 'traveler' | 'admin'
  senderId?: number;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  ticketId: number;
  caseId: number;
  travelerId?: number;
  agencyId?: number;
  tripId?: number;
  description: string;
  issueType: string;
  careId: number;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  created: string;
  replies?: TicketReply[];
}

export const supportTickets: SupportTicket[] = [
  { ticketId: 101, caseId: 1, travelerId: 1, description: 'Customer booked Hotel Lumiere for 6 nights but confirmation shows only 5 nights.', issueType: 'Hotel booking mismatch', careId: 1, priority: 'High', status: 'Open', created: '2026-03-29T10:00:00' },
  { ticketId: 102, caseId: 2, travelerId: 2, description: 'Flight cancelled, requesting refund.', issueType: 'Flight cancellation refund', careId: 1, priority: 'Medium', status: 'In Progress', created: '2026-03-29T07:00:00' },
  { ticketId: 103, caseId: 3, travelerId: 3, description: 'Payment deducted but not reflecting in bookings.', issueType: 'Payment not reflecting', careId: 2, priority: 'High', status: 'Open', created: '2026-03-28T10:00:00' },
  { ticketId: 104, caseId: 4, travelerId: 4, description: 'Desert Safari booking shows wrong date.', issueType: 'Booking date correction', careId: 1, priority: 'Medium', status: 'In Progress', created: '2026-03-30T09:00:00' },
  {
    ticketId: 105,
    caseId: 5,
    agencyId: 1,
    tripId: 21,
    description: 'Inquiry regarding hotel vouchers and airport transfer dispatch for Swiss Alps tour.',
    issueType: 'Booking Discrepancy',
    careId: 1,
    priority: 'Medium',
    status: 'In Progress',
    created: '2026-07-02T11:20:00',
    replies: [
      {
        replyId: 1,
        ticketId: 105,
        senderRole: 'agency',
        senderId: 1,
        senderName: 'Horizon Travel Partners',
        message: 'Could you please confirm if the voucher for Hotel Alpenrose in Geneva has been dispatched?',
        createdAt: '2026-07-02T11:20:00Z',
      },
      {
        replyId: 2,
        ticketId: 105,
        senderRole: 'support',
        senderId: 1,
        senderName: 'GlobeSync Support Desk',
        message: 'Hello Horizon Travel, the voucher has been generated and dispatched to the hotel partner. Transfer details will arrive within 24 hours.',
        createdAt: '2026-07-02T13:45:00Z',
      },
    ],
  },
];
