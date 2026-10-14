export interface PlatformRules {
  autoConfirm: boolean;
  allowCancel: boolean;
  bookingLimit: number;
  cancelCutoffHours: number;
  refundDeductionPct: number;
  stripeGateway: boolean;
  paypalGateway: boolean;
  razorpayGateway: boolean;
  emailNotifications: boolean;
  smsAlerts: boolean;
}

export interface PaymentMethodConfig {
  id: string;
  type: 'platform' | 'gateway';
  methodKey: string;
  displayName: string;
  status: 'Active' | 'Inactive';
  icon: string;
  description: string;
  maskedKey: string | null;
}

export interface SystemIntegration {
  id: number;
  name: string;
  icon: string;
  category: 'payment' | 'travel' | 'maps' | 'comm' | 'data' | 'core';
  status: 'Active' | 'Inactive';
  desc: string;
  key: string;
  usage: number;
  limit: number;
  lastTested: string;
  env: string;
  latency: string;
  isDemo: boolean;
}

export interface SystemAuditLog {
  id: number;
  text: string;
  author: string;
  time: string;
  color?: string;
  category: 'rules' | 'payment' | 'integration' | 'users';
  timestamp: string;
}

export const platformRules: PlatformRules = {
  autoConfirm: true,
  allowCancel: true,
  bookingLimit: 500000,
  cancelCutoffHours: 48,
  refundDeductionPct: 10,
  stripeGateway: false,
  paypalGateway: false,
  razorpayGateway: false,
  emailNotifications: true,
  smsAlerts: false,
};

export const paymentMethods: PaymentMethodConfig[] = [
  // Platform native payment methods (matching CreatePaymentDto: 'Card' | 'UPI' | 'Cash')
  {
    id: 'pm-card',
    type: 'platform',
    methodKey: 'Card',
    displayName: 'Credit / Debit Card',
    status: 'Active',
    icon: '💳',
    description: 'Direct Visa, Mastercard, RuPay & Amex card payments',
    maskedKey: null,
  },
  {
    id: 'pm-upi',
    type: 'platform',
    methodKey: 'UPI',
    displayName: 'UPI & Instant Pay',
    status: 'Active',
    icon: '📱',
    description: 'Instant UPI QR codes, VPA handles & mobile apps',
    maskedKey: null,
  },
  {
    id: 'pm-cash',
    type: 'platform',
    methodKey: 'Cash',
    displayName: 'Cash / Manual Settlement',
    status: 'Active',
    icon: '💵',
    description: 'Offline agent collection and on-arrival guide payment',
    maskedKey: null,
  },
  // Gateway simulations (clearly labeled demo / unsupported integration)
  {
    id: 'gw-stripe',
    type: 'gateway',
    methodKey: 'Stripe',
    displayName: 'Stripe Gateway (Demo Mode)',
    status: 'Inactive',
    icon: '🌐',
    description: 'Demonstration connector (no live external gateway credentials configured)',
    maskedKey: 'pk_demo_••••••••4892',
  },
  {
    id: 'gw-paypal',
    type: 'gateway',
    methodKey: 'PayPal',
    displayName: 'PayPal Express (Demo Mode)',
    status: 'Inactive',
    icon: '🅿️',
    description: 'Demonstration connector (no live external gateway credentials configured)',
    maskedKey: 'client_demo_••••3810',
  },
  {
    id: 'gw-razorpay',
    type: 'gateway',
    methodKey: 'Razorpay',
    displayName: 'Razorpay Gateway (Demo Mode)',
    status: 'Inactive',
    icon: '⚡',
    description: 'Demonstration connector (no live external gateway credentials configured)',
    maskedKey: 'rzp_demo_••••9124',
  },
];

export const systemIntegrations: SystemIntegration[] = [
  {
    id: 1,
    name: 'Amadeus',
    icon: '✈️',
    category: 'travel',
    status: 'Inactive',
    desc: 'Flight search and airline pricing demonstration connector',
    key: 'ama_demo_839201...',
    usage: 0,
    limit: 250000,
    lastTested: 'Demonstration Sandbox',
    env: 'Sandbox (Demo)',
    latency: 'Unavailable (Demo)',
    isDemo: true,
  },
  {
    id: 2,
    name: 'Skyscanner',
    icon: '🔍',
    category: 'travel',
    status: 'Inactive',
    desc: 'Flight comparison and route aggregator demonstration connector',
    key: 'sky_demo_991823...',
    usage: 0,
    limit: 100000,
    lastTested: 'Demonstration Sandbox',
    env: 'Sandbox (Demo)',
    latency: 'Unavailable (Demo)',
    isDemo: true,
  },
  {
    id: 3,
    name: 'Booking.com',
    icon: '🏨',
    category: 'travel',
    status: 'Inactive',
    desc: 'Hotel reservations and partner catalog demonstration connector',
    key: 'bk_demo_001928...',
    usage: 0,
    limit: 150000,
    lastTested: 'Demonstration Sandbox',
    env: 'Sandbox (Demo)',
    latency: 'Unavailable (Demo)',
    isDemo: true,
  },
  {
    id: 4,
    name: 'Airbnb Experiences',
    icon: '🏡',
    category: 'travel',
    status: 'Inactive',
    desc: 'Boutique stay listings and local culinary experiences demonstration connector',
    key: 'air_demo_xxx...',
    usage: 0,
    limit: 50000,
    lastTested: 'Demonstration Sandbox',
    env: 'Sandbox (Demo)',
    latency: 'Unavailable (Demo)',
    isDemo: true,
  },
  {
    id: 5,
    name: 'Stripe Gateway',
    icon: '💳',
    category: 'payment',
    status: 'Inactive',
    desc: 'Credit/debit card processing simulation connector',
    key: 'sk_demo_948291...',
    usage: 0,
    limit: 500000,
    lastTested: 'Demonstration Sandbox',
    env: 'Sandbox (Demo)',
    latency: 'Unavailable (Demo)',
    isDemo: true,
  },
  {
    id: 6,
    name: 'PayPal International',
    icon: '🅿️',
    category: 'payment',
    status: 'Inactive',
    desc: 'Cross-border digital wallet and currency conversion simulation connector',
    key: 'pp_demo_109283...',
    usage: 0,
    limit: 200000,
    lastTested: 'Demonstration Sandbox',
    env: 'Sandbox (Demo)',
    latency: 'Unavailable (Demo)',
    isDemo: true,
  },
  {
    id: 7,
    name: 'Google Maps Platform',
    icon: '📍',
    category: 'maps',
    status: 'Inactive',
    desc: 'Interactive itinerary mapping simulation connector',
    key: 'AIzaSy_demo_839...',
    usage: 0,
    limit: 1000000,
    lastTested: 'Demonstration Sandbox',
    env: 'Sandbox (Demo)',
    latency: 'Unavailable (Demo)',
    isDemo: true,
  },
  {
    id: 8,
    name: 'Twilio SMS',
    icon: '💬',
    category: 'comm',
    status: 'Inactive',
    desc: 'Transactional SMS notifications simulation connector',
    key: 'AC_demo_938201...',
    usage: 0,
    limit: 50000,
    lastTested: 'Demonstration Sandbox',
    env: 'Sandbox (Demo)',
    latency: 'Unavailable (Demo)',
    isDemo: true,
  },
  {
    id: 9,
    name: 'SendGrid Mailer',
    icon: '📧',
    category: 'comm',
    status: 'Inactive',
    desc: 'System emails and trip PDF tickets simulation connector',
    key: 'SG_demo_938201...',
    usage: 0,
    limit: 100000,
    lastTested: 'Demonstration Sandbox',
    env: 'Sandbox (Demo)',
    latency: 'Unavailable (Demo)',
    isDemo: true,
  },
  {
    id: 10,
    name: 'OpenWeather API',
    icon: '🌤',
    category: 'data',
    status: 'Inactive',
    desc: 'Destination forecast advisory simulation connector',
    key: 'ow_demo_738192...',
    usage: 0,
    limit: 60000,
    lastTested: 'Demonstration Sandbox',
    env: 'Sandbox (Demo)',
    latency: 'Unavailable (Demo)',
    isDemo: true,
  },
  {
    id: 11,
    name: 'GlobeSync Core REST Engine',
    icon: '🚀',
    category: 'core',
    status: 'Active',
    desc: 'Local NestJS REST engine powering trips, bookings, payments, and users',
    key: 'internal_core_active',
    usage: 2450,
    limit: 10000000,
    lastTested: 'Live In-Process',
    env: 'Production / Local',
    latency: 'Active (< 20ms)',
    isDemo: false,
  },
];

export const systemAuditLogs: SystemAuditLog[] = [
  {
    id: 1,
    text: 'Platform initialized with default rules: ceiling ₹5,00,000, cancellation cutoff 48h, autoConfirm enabled',
    author: 'Super User',
    time: 'Baseline Setup',
    color: '#10b981',
    category: 'rules',
    timestamp: new Date().toISOString(),
  },
  {
    id: 2,
    text: 'Native platform checkout channels verified: Card, UPI, and Cash enabled',
    author: 'Super User',
    time: 'Baseline Setup',
    color: '#6366f1',
    category: 'payment',
    timestamp: new Date().toISOString(),
  },
  {
    id: 3,
    text: 'External third-party integration connectors initialized in demonstration mode',
    author: 'Super User',
    time: 'Baseline Setup',
    color: '#f59e0b',
    category: 'integration',
    timestamp: new Date().toISOString(),
  },
];
