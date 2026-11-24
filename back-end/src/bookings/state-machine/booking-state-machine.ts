import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingStatus } from './booking-status.enum';

export class BookingStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
    [BookingStatus.DRAFT]: [BookingStatus.HELD, BookingStatus.CANCELLED],
    [BookingStatus.HELD]: [BookingStatus.PAID, BookingStatus.EXPIRED, BookingStatus.CANCELLED],
    [BookingStatus.PAID]: [BookingStatus.CONFIRMED, BookingStatus.REFUNDED],
    [BookingStatus.CONFIRMED]: [
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
      BookingStatus.REFUNDED,
    ],
    [BookingStatus.COMPLETED]: [],
    [BookingStatus.CANCELLED]: [BookingStatus.REFUNDED],
    [BookingStatus.EXPIRED]: [],
    [BookingStatus.REFUNDED]: [],
  };

  /**
   * Normalize input status strings (e.g., 'Pending', 'Confirmed') to BookingStatus enum.
   */
  static normalizeStatus(status: string): BookingStatus {
    const upper = String(status).toUpperCase();
    switch (upper) {
      case 'DRAFT':
        return BookingStatus.DRAFT;
      case 'HELD':
      case 'PENDING':
        return BookingStatus.HELD;
      case 'PAID':
        return BookingStatus.PAID;
      case 'CONFIRMED':
        return BookingStatus.CONFIRMED;
      case 'COMPLETED':
        return BookingStatus.COMPLETED;
      case 'CANCELLED':
      case 'CANCELED':
        return BookingStatus.CANCELLED;
      case 'EXPIRED':
        return BookingStatus.EXPIRED;
      case 'REFUNDED':
        return BookingStatus.REFUNDED;
      default:
        throw new BadRequestException(`Unrecognized booking status: '${status}'`);
    }
  }

  /**
   * Determine whether a transition from current status to target status is legal.
   */
  static canTransition(current: string, target: string): boolean {
    const from = this.normalizeStatus(current);
    const to = this.normalizeStatus(target);

    // Idempotent transition to the same status is always valid
    if (from === to) return true;

    const allowed = this.ALLOWED_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  /**
   * Enforce valid status transition. Throws ConflictException if illegal.
   */
  static assertValidTransition(current: string, target: string): BookingStatus {
    const from = this.normalizeStatus(current);
    const to = this.normalizeStatus(target);

    if (from === to) {
      return to;
    }

    const allowed = this.ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new ConflictException(
        `Illegal booking status transition from '${from}' to '${to}'. Allowed transitions from '${from}': [${allowed.join(', ') || 'none (terminal state)'}].`,
      );
    }

    return to;
  }
}
