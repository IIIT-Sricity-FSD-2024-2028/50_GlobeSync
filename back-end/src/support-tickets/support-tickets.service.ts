import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { supportTickets, SupportTicket, TicketReply, TicketInternalNote } from '../data';
import { CreateTicketDto, CreateTicketReplyDto, AssignTicketDto, CreateInternalNoteDto, AdjudicateRefundDto } from './dto';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PolicyService } from '../policy/policy.service';
import { testDb } from '../database/test-database';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';

const SLA_HOURS: Record<string, number> = {
  Urgent: 2,
  High: 6,
  Medium: 24,
  Low: 48,
};

@Injectable()
export class SupportTicketsService {
  constructor(
    @Optional() private readonly realtimeService?: RealtimeService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly policyService?: PolicyService,
  ) {}

  /**
   * Enriches a ticket with live SLA calculations.
   */
  private enrichWithSLA(ticket: SupportTicket): SupportTicket {
    const priority = ticket.priority || 'Medium';
    const hours = SLA_HOURS[priority] || 24;
    const createdTime = new Date(ticket.created || Date.now()).getTime();
    const deadlineTime = createdTime + hours * 3600 * 1000;
    const deadlineDate = new Date(deadlineTime).toISOString();
    const now = Date.now();
    const remainingMinutes = Math.round((deadlineTime - now) / 60000);
    const isClosed = ticket.status === 'Resolved' || ticket.status === 'Closed';
    const isBreached = !isClosed && now > deadlineTime;
    const slaStatus: 'OK' | 'CRITICAL' | 'BREACHED' = isBreached
      ? 'BREACHED'
      : remainingMinutes <= 60 && !isClosed
      ? 'CRITICAL'
      : 'OK';

    return {
      ...ticket,
      slaDeadline: deadlineDate,
      slaMinutesRemaining: remainingMinutes,
      isSlaBreached: isBreached,
      slaStatus,
    };
  }

  /**
   * Strips internal notes for clients (traveler / agency).
   */
  private sanitizeTicket(ticket: SupportTicket, callerRole?: string): SupportTicket {
    const enriched = this.enrichWithSLA(ticket);
    const role = callerRole?.toLowerCase();
    if (role === 'traveler' || role === 'agency') {
      const { internalNotes: _, ...safe } = enriched;
      return safe as SupportTicket;
    }
    return enriched;
  }

  findAll(callerRole?: string): SupportTicket[];
  findAll(callerRole: string | undefined, query: PaginationQueryDto): SupportTicket[] | PaginatedResult<SupportTicket>;
  findAll(callerRole?: string, query?: PaginationQueryDto): any {
    const enrichedList = supportTickets.map((t) => this.sanitizeTicket(t, callerRole));
    return paginateCollection(enrichedList, query, ['description', 'issueType']);
  }

  findOne(id: number, callerRole?: string): SupportTicket {
    const t = supportTickets.find((t) => t.ticketId === id);
    if (!t) throw new NotFoundException(`Support ticket with ID ${id} not found`);
    return this.sanitizeTicket(t, callerRole);
  }

  findByTraveler(travelerId: number): SupportTicket[];
  findByTraveler(travelerId: number, query: PaginationQueryDto): SupportTicket[] | PaginatedResult<SupportTicket>;
  findByTraveler(travelerId: number, query?: PaginationQueryDto): any {
    const list = supportTickets
      .filter((t) => t.travelerId === travelerId)
      .map((t) => this.sanitizeTicket(t, 'traveler'));
    return paginateCollection(list, query, ['description', 'issueType']);
  }

  findByAgency(agencyId: number): SupportTicket[];
  findByAgency(agencyId: number, query: PaginationQueryDto): SupportTicket[] | PaginatedResult<SupportTicket>;
  findByAgency(agencyId: number, query?: PaginationQueryDto): any {
    const list = supportTickets
      .filter((t) => t.agencyId === agencyId)
      .map((t) => this.sanitizeTicket(t, 'agency'));
    return paginateCollection(list, query, ['description', 'issueType']);
  }

  create(dto: CreateTicketDto): SupportTicket {
    if (!!dto.travelerId === !!dto.agencyId) {
      throw new BadRequestException('Exactly one of travelerId or agencyId must be provided.');
    }

    const maxTicketId = supportTickets.length > 0
      ? Math.max(...supportTickets.map((t) => t.ticketId))
      : 100;
    const maxCaseId = supportTickets.length > 0
      ? Math.max(...supportTickets.map((t) => t.caseId))
      : 0;

    const initialReplies: TicketReply[] = [
      {
        replyId: 1,
        ticketId: maxTicketId + 1,
        senderRole: dto.agencyId ? 'agency' : 'traveler',
        senderId: dto.agencyId || dto.travelerId || 1,
        senderName: dto.agencyId ? 'Agency Partner' : 'Traveler Client',
        message: dto.description,
        createdAt: new Date().toISOString(),
      },
    ];

    const item: SupportTicket = {
      ticketId: maxTicketId + 1,
      caseId: maxCaseId + 1,
      travelerId: dto.travelerId,
      agencyId: dto.agencyId,
      tripId: dto.tripId,
      bookingId: dto.bookingId,
      description: dto.description,
      issueType: dto.issueType,
      careId: dto.careId || 1,
      priority: (dto.priority as SupportTicket['priority']) || 'Medium',
      status: (dto.status as SupportTicket['status']) || 'Open',
      created: new Date().toISOString(),
      replies: initialReplies,
      internalNotes: [],
    };

    supportTickets.push(item);
    if (!testDb.supportTickets) testDb.supportTickets = [];
    testDb.supportTickets.push(item);

    const enriched = this.enrichWithSLA(item);

    // Realtime notification
    if (this.realtimeService) {
      this.realtimeService.emitToTicket(item.ticketId, 'ticket.updated', { ticket: enriched, action: 'CREATED' });
      this.realtimeService.emitToRole('support', 'ticket.updated', { ticket: enriched, action: 'CREATED' });
    }

    if (this.notificationsService) {
      this.notificationsService.createNotification(
        item.careId,
        `New Support Ticket #${item.ticketId}`,
        item.description,
        { role: 'support', type: 'ticket_created', metadata: { ticketId: item.ticketId } },
      ).catch(() => {});
    }

    return enriched;
  }

  /**
   * Assign a support ticket to an agent.
   */
  assignTicket(ticketId: number, dto: AssignTicketDto, authorName = 'Support Admin'): SupportTicket {
    const idx = supportTickets.findIndex((t) => t.ticketId === ticketId);
    if (idx === -1) throw new NotFoundException(`Support ticket with ID ${ticketId} not found`);

    supportTickets[idx].careId = dto.careId;
    if (supportTickets[idx].status === 'Open') {
      supportTickets[idx].status = 'In Progress';
    }

    const noteText = `Ticket assigned to Support Agent #${dto.careId} by ${authorName}`;
    this.addInternalNote(ticketId, 0, authorName, noteText);

    const updated = this.findOne(ticketId, 'support');
    if (this.realtimeService) {
      this.realtimeService.emitToTicket(ticketId, 'ticket.updated', { ticket: updated, action: 'ASSIGNED' });
    }
    return updated;
  }

  /**
   * Add internal note (hidden from traveler/agency).
   */
  addInternalNote(ticketId: number, authorId: number, authorName: string, text: string): TicketInternalNote {
    const ticket = supportTickets.find((t) => t.ticketId === ticketId);
    if (!ticket) throw new NotFoundException(`Support ticket with ID ${ticketId} not found`);

    if (!ticket.internalNotes) ticket.internalNotes = [];
    const maxNoteId = ticket.internalNotes.length > 0 ? Math.max(...ticket.internalNotes.map((n) => n.noteId)) : 0;

    const note: TicketInternalNote = {
      noteId: maxNoteId + 1,
      authorId,
      authorName,
      text,
      createdAt: new Date().toISOString(),
    };
    ticket.internalNotes.push(note);
    return note;
  }

  /**
   * Adjudicate refund via PolicyService only.
   */
  async adjudicateRefund(
    ticketId: number,
    dto: AdjudicateRefundDto,
    supportAgentId: number,
    supportAgentName = 'Support Specialist',
  ) {
    const ticket = this.findOne(ticketId, 'support');
    if (!this.policyService) {
      throw new BadRequestException('PolicyService is unavailable for refund adjudication.');
    }

    let adjudicationResult: any;
    if (dto.isEmergency) {
      // Emergency override flow (<12h) with audit trail
      adjudicationResult = await this.policyService.requestEmergencyOverride(
        dto.bookingId,
        {
          reason: dto.reason,
          supportAgentId,
          supportAgentName,
        },
      );
    } else {
      // Standard cancellation refund evaluation through policy engine
      adjudicationResult = await this.policyService.cancelBooking(
        dto.bookingId,
        dto.reason,
        supportAgentId,
      );
    }

    // Record internal note describing adjudication
    const noteText = `Refund adjudicated via PolicyService for Booking #${dto.bookingId}. Result: ${JSON.stringify(adjudicationResult)}`;
    this.addInternalNote(ticketId, supportAgentId, supportAgentName, noteText);

    return {
      ticketId,
      adjudicationResult,
    };
  }

  addReply(
    ticketId: number,
    senderRole: string,
    senderId: number,
    dto: CreateTicketReplyDto,
  ): TicketReply {
    const ticket = supportTickets.find((t) => t.ticketId === ticketId);
    if (!ticket) throw new NotFoundException(`Support ticket with ID ${ticketId} not found`);

    if (!ticket.replies) {
      ticket.replies = [];
    }

    const maxReplyId = ticket.replies.length > 0
      ? Math.max(...ticket.replies.map((r) => r.replyId))
      : 0;

    const newReply: TicketReply = {
      replyId: maxReplyId + 1,
      ticketId,
      senderRole,
      senderId,
      senderName: dto.senderName || (senderRole === 'support' ? 'Customer Support Specialist' : senderRole === 'traveler' ? 'Traveler Client' : 'Agency Partner'),
      message: dto.message,
      createdAt: new Date().toISOString(),
    };

    ticket.replies.push(newReply);
    if (senderRole === 'support' && ticket.status === 'Open') {
      ticket.status = 'In Progress';
    } else if (senderRole === 'traveler' && ticket.status === 'Resolved') {
      ticket.status = 'In Progress';
    }

    const enriched = this.enrichWithSLA(ticket);

    // Realtime event
    if (this.realtimeService) {
      this.realtimeService.emitToTicket(ticketId, 'ticket.updated', {
        ticketId,
        ticket: enriched,
        reply: newReply,
        action: 'REPLY_ADDED',
      });
      const recipientId = senderRole === 'support'
        ? (ticket.travelerId || ticket.agencyId)
        : ticket.careId;
      if (recipientId) {
        this.realtimeService.emitToUser(recipientId, 'ticket.updated', {
          ticketId,
          ticket: enriched,
          reply: newReply,
          action: 'REPLY_ADDED',
        }, (senderRole === 'support' ? (ticket.travelerId ? 'traveler' : 'agency') : 'support'));
      }
    }

    // Persist notification for the other participant
    if (this.notificationsService) {
      const recipientId = senderRole === 'support'
        ? (ticket.travelerId || ticket.agencyId)
        : ticket.careId;
      if (recipientId) {
        this.notificationsService.createNotification(
          recipientId,
          `New reply on Ticket #${ticketId}`,
          dto.message.slice(0, 80),
          { role: (senderRole === 'support' ? (ticket.travelerId ? 'traveler' : 'agency') : 'support'), type: 'ticket_reply', metadata: { ticketId } },
        ).catch(() => {});
      }
    }

    return newReply;
  }

  updateStatus(id: number, status: string): SupportTicket {
    const idx = supportTickets.findIndex((t) => t.ticketId === id);
    if (idx === -1) throw new NotFoundException(`Support ticket with ID ${id} not found`);
    supportTickets[idx] = { ...supportTickets[idx], status: status as SupportTicket['status'] };
    const ticket = this.enrichWithSLA(supportTickets[idx]);

    // Realtime event
    if (this.realtimeService) {
      this.realtimeService.emitToTicket(id, 'ticket.updated', { ticket, action: 'STATUS_CHANGED' });
      const creatorId = ticket.travelerId || ticket.agencyId;
      if (creatorId) {
        this.realtimeService.emitToUser(creatorId, 'ticket.updated', { ticket, action: 'STATUS_CHANGED' }, (ticket.travelerId ? 'traveler' : 'agency'));
      }
    }

    if (this.notificationsService) {
      const creatorId = ticket.travelerId || ticket.agencyId;
      if (creatorId) {
        this.notificationsService.createNotification(
          creatorId,
          `Ticket #${id} status updated`,
          `Your support ticket status has been changed to ${status}.`,
          { role: (ticket.travelerId ? 'traveler' : 'agency'), type: 'ticket_status', metadata: { ticketId: id } },
        ).catch(() => {});
      }
    }

    return ticket;
  }

  remove(id: number): { message: string } {
    const idx = supportTickets.findIndex((t) => t.ticketId === id);
    if (idx === -1) throw new NotFoundException(`Support ticket with ID ${id} not found`);
    supportTickets.splice(idx, 1);
    return { message: `Support ticket with ID ${id} deleted successfully` };
  }
}
