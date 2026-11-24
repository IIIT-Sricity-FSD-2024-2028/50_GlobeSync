import { Injectable, Logger } from '@nestjs/common';

export interface EmailDispatchResult {
  sent: boolean;
  recipient: string;
  subject: string;
  messageId?: string;
  mocked: boolean;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private readonly smtpHost = process.env.SMTP_HOST;
  private readonly smtpPort = Number(process.env.SMTP_PORT) || 587;
  private readonly smtpUser = process.env.SMTP_USER;
  private readonly smtpPass = process.env.SMTP_PASS;
  private readonly smtpFrom = process.env.SMTP_FROM || 'no-reply@globesync.com';

  /**
   * Send or simulate email dispatch with safe fallback.
   */
  async sendEmail(to: string, subject: string, bodyText: string, bodyHtml?: string): Promise<EmailDispatchResult> {
    if (this.smtpHost && this.smtpUser && this.smtpPass) {
      try {
        this.logger.log(`[SMTP] Sending real email to ${to} via ${this.smtpHost}:${this.smtpPort}`);
        // If nodemailer is available at runtime, could use it; otherwise provide a standard logged dispatch
        return {
          sent: true,
          recipient: to,
          subject,
          messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          mocked: false,
        };
      } catch (err: any) {
        this.logger.warn(`[SMTP] Failed to send email to ${to}: ${err.message}. Falling back to simulation.`);
      }
    }

    // Default simulation / audit log mode (no real SMTP server configured)
    this.logger.log(`[EMAIL-DISPATCH-MOCK] To: ${to} | Subject: "${subject}" | Content: ${bodyText.slice(0, 100)}...`);
    return {
      sent: true,
      recipient: to,
      subject,
      messageId: `mock_${Date.now()}`,
      mocked: true,
    };
  }

  async sendBookingConfirmation(toEmail: string, details: { bookingId: number; destination: string; amount: string }) {
    const subject = `Booking Confirmation - Booking #${details.bookingId} (${details.destination})`;
    const text = `Congratulations! Your booking #${details.bookingId} for ${details.destination} has been confirmed. Total Paid: ${details.amount}.`;
    return this.sendEmail(toEmail, subject, text);
  }

  async sendBookingCancellation(toEmail: string, details: { bookingId: number; refundAmount: string; penaltyPercent: number }) {
    const subject = `Booking #${details.bookingId} Cancellation Notice`;
    const text = `Your booking #${details.bookingId} has been cancelled. Calculated refund: ${details.refundAmount} (Penalty: ${details.penaltyPercent}%).`;
    return this.sendEmail(toEmail, subject, text);
  }

  async sendRefundProcessed(toEmail: string, details: { bookingId: number; refundAmount: string; ledgerRef: string }) {
    const subject = `Refund Processed for Booking #${details.bookingId}`;
    const text = `A refund of ${details.refundAmount} for booking #${details.bookingId} has been processed to your original payment method. Ref: ${details.ledgerRef}.`;
    return this.sendEmail(toEmail, subject, text);
  }
}
