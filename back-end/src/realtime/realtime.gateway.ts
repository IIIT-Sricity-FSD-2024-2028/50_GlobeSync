import { userRoom } from './user-room';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { testDb } from '../database/test-database';
import { bookings } from '../data/bookings.data';
import { trips } from '../data/trips.data';
import { supportTickets } from '../data/support-tickets.data';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
  name?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Authenticate socket connection via JWT in auth handshake or headers.
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Socket connection rejected: No token provided (${client.id})`);
        client.emit('unauthorized', { message: 'Authentication token required' });
        client.disconnect(true);
        return;
      }

      const secret = process.env.JWT_ACCESS_SECRET ?? 'gs-access-secret-change-in-prod';
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });

      if (!payload || !payload.sub) {
        throw new WsException('Invalid token payload');
      }

      const user: AuthenticatedUser = {
        id: Number((payload as any).pid ?? payload.sub),
        email: payload.email,
        role: String(payload.role).toLowerCase(),
      };

      // Attach user to socket data
      client.data.user = user;

      // Automatically join the user's private personal room
      const privateRoom = userRoom(user.role, user.id);
      client.join(privateRoom);

      // Also join role room for broadcast announcements
      client.join(`role:${user.role}`);

      this.logger.log(`Socket ${client.id} authenticated as user ${user.id} (${user.role}) and joined ${privateRoom}`);
      client.emit('authenticated', { user });
    } catch (err: any) {
      this.logger.warn(`Socket authentication failed for ${client.id}: ${err.message}`);
      client.emit('unauthorized', { message: 'Invalid or expired token', error: err.message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (user) {
      this.logger.log(`Socket disconnected: user ${user.id} (${client.id})`);
    } else {
      this.logger.log(`Socket disconnected: unauthenticated (${client.id})`);
    }
  }

  /**
   * Extract JWT token from handshake auth, query, headers, or cookies
   */
  private extractToken(client: Socket): string | null {
    if (client.handshake?.auth?.token) {
      return String(client.handshake.auth.token).replace(/^Bearer\s+/i, '');
    }

    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader) {
      return String(authHeader).replace(/^Bearer\s+/i, '');
    }

    if (client.handshake?.query?.token) {
      return String(client.handshake.query.token);
    }

    const cookieHeader = client.handshake?.headers?.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/access_token=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    }

    return null;
  }

  // ─── ROOM SUBSCRIPTIONS & SECURITY CHECKS ────────────────────────────────

  /**
   * Generic room join with strict personal user-room isolation.
   * A user CANNOT join another user's personal room!
   */
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    const user: AuthenticatedUser = client.data?.user;
    if (!user) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const room = data?.room;
    if (!room) {
      client.emit('error', { message: 'Room name required' });
      return;
    }

    // Security check: cannot join another user's personal room
    if (room.startsWith('user:')) {
      const targetUserId = room.split(':').pop();
      if (room !== userRoom(user.role, user.id)) {
        client.emit('error', { message: `Forbidden: Cannot join private room of user ${targetUserId}` });
        return;
      }
    }

    client.join(room);
    client.emit('joined_room', { room });
  }

  /**
   * Join booking room with participant authorization check:
   * Only the traveler, assigned guide, agency, or support/admin/superuser can join.
   */
  @SubscribeMessage('join_booking')
  handleJoinBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: number },
  ) {
    const user: AuthenticatedUser = client.data?.user;
    if (!user) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const bookingId = Number(data?.bookingId);
    if (!bookingId) {
      client.emit('error', { message: 'Valid bookingId required' });
      return;
    }

    const isAuthorized = this.isBookingParticipant(user, bookingId);
    if (!isAuthorized) {
      client.emit('error', {
        message: `Forbidden: User ${user.id} is not an authorized participant of booking #${bookingId}`,
      });
      return;
    }

    const room = `booking:${bookingId}`;
    client.join(room);
    client.emit('joined_booking', { bookingId, room });
  }

  @SubscribeMessage('leave_booking')
  handleLeaveBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: number },
  ) {
    const bookingId = Number(data?.bookingId);
    if (bookingId) {
      client.leave(`booking:${bookingId}`);
      client.emit('left_booking', { bookingId });
    }
  }

  /**
   * Join support ticket room with participant authorization check:
   * Only the ticket creator (traveler or agency), assigned support, or admin/superuser can join.
   */
  @SubscribeMessage('join_ticket')
  handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: number },
  ) {
    const user: AuthenticatedUser = client.data?.user;
    if (!user) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const ticketId = Number(data?.ticketId);
    if (!ticketId) {
      client.emit('error', { message: 'Valid ticketId required' });
      return;
    }

    const isAuthorized = this.isTicketParticipant(user, ticketId);
    if (!isAuthorized) {
      client.emit('error', {
        message: `Forbidden: User ${user.id} is not an authorized participant of ticket #${ticketId}`,
      });
      return;
    }

    const room = `ticket:${ticketId}`;
    client.join(room);
    client.emit('joined_ticket', { ticketId, room });
  }

  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: number },
  ) {
    const ticketId = Number(data?.ticketId);
    if (ticketId) {
      client.leave(`ticket:${ticketId}`);
      client.emit('left_ticket', { ticketId });
    }
  }

  /**
   * Realtime typing indicator for chat:
   * Broadcasts to booking or ticket room, excluding the sender.
   */
  @SubscribeMessage('chat.typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId?: number; ticketId?: number; isTyping: boolean },
  ) {
    const user: AuthenticatedUser = client.data?.user;
    if (!user) return;

    const payload = {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      isTyping: !!data.isTyping,
      bookingId: data.bookingId,
      ticketId: data.ticketId,
    };

    if (data.bookingId) {
      client.to(`booking:${data.bookingId}`).emit('chat.typing', payload);
    } else if (data.ticketId) {
      client.to(`ticket:${data.ticketId}`).emit('chat.typing', payload);
    }
  }

  // ─── AUTHORIZATION HELPERS ────────────────────────────────────────────────

  private isBookingParticipant(user: AuthenticatedUser, bookingId: number): boolean {
    // Admins, Superusers, and Support can view all bookings
    if (['admin', 'superuser', 'support'].includes(user.role)) {
      return true;
    }

    // Check testDb first
    const testBooking = testDb.bookings.find((b: any) => b.id === bookingId || b.bookingId === bookingId);
    if (testBooking) {
      if (user.role === 'traveler' && testBooking.travelerId === user.id) return true;
      if (user.role === 'guide' && testBooking.guideId === user.id) return true;
      if (user.role === 'agency' && testBooking.agencyId === user.id) return true;
    }

    // Check data array
    const dataBooking = bookings.find((b: any) => b.bookingId === bookingId || b.id === bookingId);
    if (dataBooking) {
      if (user.role === 'traveler' && dataBooking.travelerId === user.id) return true;
      if (user.role === 'guide' && dataBooking.guideId === user.id) return true;
      if (user.role === 'agency' && (dataBooking as any).agencyId === user.id) return true;
      // Also check associated trip
      if (dataBooking.tripId) {
        const trip = trips.find((t: any) => t.tripId === dataBooking.tripId);
        if (trip) {
          if (user.role === 'traveler' && trip.travelerId === user.id) return true;
          if (user.role === 'guide' && trip.guideId === user.id) return true;
          if (user.role === 'agency' && trip.agencyId === user.id) return true;
        }
      }
    }

    return false;
  }

  private isTicketParticipant(user: AuthenticatedUser, ticketId: number): boolean {
    // Admins, Superusers, and Support can view all tickets
    if (['admin', 'superuser', 'support'].includes(user.role)) {
      return true;
    }

    // Check testDb
    const testTicket = testDb.supportTickets.find((t: any) => t.ticketId === ticketId || t.id === ticketId);
    if (testTicket) {
      if (user.role === 'traveler' && testTicket.travelerId === user.id) return true;
      if (user.role === 'agency' && testTicket.agencyId === user.id) return true;
      if (user.role === 'support' && testTicket.careId === user.id) return true;
    }

    // Check support tickets data
    const ticket = supportTickets.find((t: any) => t.ticketId === ticketId);
    if (ticket) {
      if (user.role === 'traveler' && ticket.travelerId === user.id) return true;
      if (user.role === 'agency' && ticket.agencyId === user.id) return true;
      if (user.role === 'support' && ticket.careId === user.id) return true;
    }

    return false;
  }
}
