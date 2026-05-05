import { Injectable, NotFoundException } from '@nestjs/common';
import { supportTickets, SupportTicket } from '../data';
import { CreateTicketDto } from './dto';

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

  create(dto: CreateTicketDto): SupportTicket {
    const maxTicketId = supportTickets.length > 0
      ? Math.max(...supportTickets.map((t) => t.ticketId))
      : 100;
    const maxCaseId = supportTickets.length > 0
      ? Math.max(...supportTickets.map((t) => t.caseId))
      : 0;
    const item: SupportTicket = {
      ticketId: maxTicketId + 1,
      caseId: maxCaseId + 1,
      travelerId: dto.travelerId,
      description: dto.description,
      issueType: dto.issueType,
      careId: dto.careId || 1,
      priority: (dto.priority as SupportTicket['priority']) || 'Medium',
      status: (dto.status as SupportTicket['status']) || 'Open',
      created: new Date().toISOString(),
    };
    supportTickets.push(item);
    return item;
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
