/**
 * paymentHelpers.js
 *
 * Pure validation, formatting, and calculation helpers for PaymentModal.
 */

/**
 * Pure helper: Computes cancellation protection fee based on booking mode
 */
export function getBookingCancellationFee(booking) {
  if (!booking) return 0;
  if (booking.cancellationFee != null) return Number(booking.cancellationFee);
  if (booking.cancellation_fee != null) return Number(booking.cancellation_fee);
  const mode = booking.transportMode || booking.type || '';
  if (mode === 'Flight') return 100;
  if (mode === 'Bus') return 70;
  if (mode === 'Train') return 50;
  return 0;
}

/**
 * Pure helper: Formats 16-digit card number with space grouping
 */
export function formatCardNumber(raw) {
  const cleaned = raw.replace(/\D/g, '').slice(0, 16);
  return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
}

/**
 * Pure helper: Formats card expiry into MM/YY
 */
export function formatExpiryDate(raw) {
  const cleaned = raw.replace(/\D/g, '').slice(0, 4);
  return cleaned.length >= 2 ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}` : cleaned;
}

/**
 * Pure helper: Validates MM/YY expiry structure, month range (01-12), and expired date against current month/year.
 */
export function validateExpiryDate(rawExpiry) {
  if (!rawExpiry || typeof rawExpiry !== 'string') {
    return 'Please enter expiration date (MM/YY).';
  }
  const trimmed = rawExpiry.trim();
  if (!/^\d{2}\/\d{2}$/.test(trimmed)) {
    return 'Please enter expiration date in MM/YY format.';
  }

  const [mmStr, yyStr] = trimmed.split('/');
  const month = parseInt(mmStr, 10);
  const year2Digit = parseInt(yyStr, 10);

  if (month < 1 || month > 12) {
    return 'Expiration month must be between 01 and 12.';
  }

  const now = new Date();
  const currentYear = now.getFullYear(); // e.g. 2026
  const currentMonth = now.getMonth() + 1; // 1-12
  const fullYear = 2000 + year2Digit;

  // Card is valid through the last day of the expiry month
  if (fullYear < currentYear || (fullYear === currentYear && month < currentMonth)) {
    return `Card expired in ${mmStr}/${yyStr}. Please enter an active card.`;
  }

  if (fullYear > currentYear + 20) {
    return 'Expiration year is unreasonably far in the future.';
  }

  return null;
}

/**
 * Pure helper: Validates payment inputs based on selected payment method
 */
export function validatePaymentInputs(method, { cardNumber, expiry, cvv, upiId }) {
  const errors = {};
  if (method === 'Card') {
    const rawCard = (cardNumber || '').replace(/\D/g, '');
    if (rawCard.length !== 16) {
      errors.cardNumber = 'Card number must be exactly 16 digits.';
    }
    const expiryError = validateExpiryDate(expiry);
    if (expiryError) {
      errors.expiry = expiryError;
    }
    const rawCvv = (cvv || '').replace(/\D/g, '');
    if (rawCvv.length < 3 || rawCvv.length > 4) {
      errors.cvv = 'CVV must be 3 or 4 digits.';
    }
  } else if (method === 'UPI') {
    if (!upiId || !upiId.trim() || !upiId.includes('@')) {
      errors.upiId = 'Please enter a valid UPI ID (e.g. traveler@upi).';
    }
  }
  return errors;
}

/**
 * Explicit demo payment credentials for simulated test transactions.
 */
export const DEMO_CARD_DETAILS = {
  cardNumber: '4532 0123 4567 8910',
  expiry: '12/28',
  cvv: '123',
};
