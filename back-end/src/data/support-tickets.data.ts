/**
 * Support tickets seed data
 * Source: front-end/JS/mockData.js → DB.supportTickets
 *
 * Relationships:
 *   - travelerId → travelers.travelerId
 *   - careId     → supportUsers.careId
 */
export interface SupportTicket {
  ticketId: number;
  caseId: number;
  travelerId: number;
  description: string;
  issueType: string;
  careId: number;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  created: string;
}

export const supportTickets: SupportTicket[] = [
  { ticketId: 101, caseId: 1, travelerId: 1, description: 'Customer booked Hotel Lumiere for 6 nights but confirmation shows only 5 nights.', issueType: 'Hotel booking mismatch', careId: 1, priority: 'High', status: 'Open', created: '2026-03-29T10:00:00' },
  { ticketId: 102, caseId: 2, travelerId: 2, description: 'Flight cancelled, requesting refund.', issueType: 'Flight cancellation refund', careId: 1, priority: 'Medium', status: 'In Progress', created: '2026-03-29T07:00:00' },
  { ticketId: 103, caseId: 3, travelerId: 3, description: 'Payment deducted but not reflecting in bookings.', issueType: 'Payment not reflecting', careId: 2, priority: 'High', status: 'Open', created: '2026-03-28T10:00:00' },
  { ticketId: 104, caseId: 4, travelerId: 4, description: 'Desert Safari booking shows wrong date.', issueType: 'Booking date correction', careId: 1, priority: 'Medium', status: 'In Progress', created: '2026-03-30T09:00:00' },
];
