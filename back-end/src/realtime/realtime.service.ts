import { userRoom } from './user-room';
import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  /**
   * Emit an event directly to a specific user's private room.
   * Profile ids are only unique within a role (traveler 1 and guide 1 are different
   * people), so the room is scoped by role: `user:<role>:<profileId>`.
   */
  emitToUser(userId: number, event: string, data: any, role: string): void {
    const room = userRoom(role, userId);
    this.logger.debug(`Emitting ${event} to ${room}`);
    if (this.gateway?.server) {
      this.gateway.server.to(room).emit(event, {
        ...data,
        _timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Emit an event to all participants subscribed to a booking room.
   */
  emitToBooking(bookingId: number, event: string, data: any): void {
    const room = `booking:${bookingId}`;
    this.logger.debug(`Emitting ${event} to ${room}`);
    if (this.gateway?.server) {
      this.gateway.server.to(room).emit(event, {
        ...data,
        bookingId,
        _timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Emit an event to all participants subscribed to a support ticket room.
   */
  emitToTicket(ticketId: number, event: string, data: any): void {
    const room = `ticket:${ticketId}`;
    this.logger.debug(`Emitting ${event} to ${room}`);
    if (this.gateway?.server) {
      this.gateway.server.to(room).emit(event, {
        ...data,
        ticketId,
        _timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Emit an event to all connected users with a given role (e.g. 'guide', 'agency').
   */
  emitToRole(role: string, event: string, data: any): void {
    const room = `role:${role.toLowerCase()}`;
    this.logger.debug(`Emitting ${event} to ${room}`);
    if (this.gateway?.server) {
      this.gateway.server.to(room).emit(event, {
        ...data,
        _timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Broadcast an event to all connected sockets.
   */
  emitToAll(event: string, data: any): void {
    if (this.gateway?.server) {
      this.gateway.server.emit(event, {
        ...data,
        _timestamp: new Date().toISOString(),
      });
    }
  }
}
