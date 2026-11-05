import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { supportTickets, SupportTicket, TicketReply } from '../data';
import { CreateTicketDto, CreateTicketReplyDto } from './dto';

@Injectable()
export class SupportTicketsService {
  findAll(): SupportTicket[] { return supportTickets; }

  findOne(id: number): SupportTicket {
    const t = supportTickets.find((t) => t.ticketId === id);
    if (!t) throw new NotFoundException(`Support ticket with ID ${id} not found`);
    return t;
  }

  findByTraveler(travelerId: number): SupportTicket[] {
    return supportTickets.filter((t) => t.travelerId === travelerId);
  }

  findByAgency(agencyId: number): SupportTicket[] {
    return supportTickets.filter((t) => t.agencyId === agencyId);
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
        senderId: dto.agencyId || dto.travelerId,
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
      description: dto.description,
      issueType: dto.issueType,
      careId: dto.careId || 1,
      priority: (dto.priority as SupportTicket['priority']) || 'Medium',
      status: (dto.status as SupportTicket['status']) || 'Open',
      created: new Date().toISOString(),
      replies: initialReplies,
    };
    supportTickets.push(item);
    return item;
  }

  addReply(
    ticketId: number,
    senderRole: string,
    senderId: number,
    dto: CreateTicketReplyDto,
  ): TicketReply {
    const ticket = this.findOne(ticketId);
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
      senderName: dto.senderName || (senderRole === 'support' ? 'Customer Support Specialist' : 'Agency Partner'),
      message: dto.message,
      createdAt: new Date().toISOString(),
    };

    ticket.replies.push(newReply);
    return newReply;
  }

  updateStatus(id: number, status: string): SupportTicket {
    const idx = supportTickets.findIndex((t) => t.ticketId === id);
    if (idx === -1) throw new NotFoundException(`Support ticket with ID ${id} not found`);
    supportTickets[idx] = { ...supportTickets[idx], status: status as SupportTicket['status'] };
    return supportTickets[idx];
  }

  remove(id: number): { message: string } {
    const idx = supportTickets.findIndex((t) => t.ticketId === id);
    if (idx === -1) throw new NotFoundException(`Support ticket with ID ${id} not found`);
    supportTickets.splice(idx, 1);
    return { message: `Support ticket with ID ${id} deleted successfully` };
  }
}
