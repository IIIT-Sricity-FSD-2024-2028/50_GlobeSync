export interface RevenueConfig {
  config_id: number;
  key_name: string;
  value_number: number | null;
  value_string: string | null;
  description: string;
}

export const revenueConfig: RevenueConfig[] = [
  {
    config_id: 1,
    key_name: 'DEFAULT_BOOKING_COMMISSION',
    value_number: 10,
    value_string: null,
    description: 'Default percentage commission on regular bookings',
  },
  {
    config_id: 2,
    key_name: 'DEFAULT_AGENCY_COMMISSION',
    value_number: 8,
    value_string: null,
    description: 'Default percentage commission on agency bookings',
  },
  {
    config_id: 3,
    key_name: 'DEFAULT_GUIDE_COMMISSION',
    value_number: 15,
    value_string: null,
    description: 'Default percentage commission on guide services',
  },
  {
    config_id: 4,
    key_name: 'DEFAULT_PROVIDER_COMMISSION',
    value_number: 8,
    value_string: null,
    description: 'Default percentage commission on external provider services',
  },
];
