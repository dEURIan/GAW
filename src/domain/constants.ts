/**
 * Davao City (Region XI) wage rules, geographic bounds, gig categories, and freemium tier configuration.
 */

export const DAVAO_DAILY_MIN_WAGE_PHP = 508;
export const STANDARD_WORKDAY_HOURS = 8;
export const DAVAO_HOURLY_MIN_WAGE_PHP =
  DAVAO_DAILY_MIN_WAGE_PHP / STANDARD_WORKDAY_HOURS;

export const DAVAO_CENTER = {
  lat: 7.0707,
  lng: 125.6087,
} as const;

export const DAVAO_BOUNDS = {
  minLat: 6.85,
  maxLat: 7.6,
  minLng: 125.2,
  maxLng: 125.75,
} as const;

export const GIG_CATEGORIES = [
  'cleaning',
  'delivery',
  'construction',
  'tutoring',
  'errands',
  'caregiving',
  'agri_harvest',
  'event_staff',
  'other',
] as const;

export type GigCategory = (typeof GIG_CATEGORIES)[number];
export type UrgencyLevel = 'standard' | 'urgent';
export type SubscriptionTier = 'FREE' | 'PRO';
export type UserRole = 'employer' | 'employee';
export type GigStatus = 'OPEN' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export const CATEGORY_HOURLY_MULTIPLIERS: Record<GigCategory, number> = {
  cleaning: 1.15,
  errands: 1.1,
  agri_harvest: 1.1,
  delivery: 1.2,
  event_staff: 1.2,
  caregiving: 1.3,
  construction: 1.45,
  tutoring: 1.5,
  other: 1.15,
};

export const TIER_CONFIG = {
  FREE: {
    maxActiveOpenGigs: 3,
    maxSavedOrActiveEmployeeGigs: 5,
    employerFeeRate: 0.05,
    employeeFeeRate: 0.05,
    monthlyPricePhpEmployer: 0,
    monthlyPricePhpEmployee: 0,
  },
  PRO: {
    maxActiveOpenGigs: Infinity,
    maxSavedOrActiveEmployeeGigs: Infinity,
    employerFeeRate: 0.02,
    employeeFeeRate: 0.0,
    monthlyPricePhpEmployer: 299,
    monthlyPricePhpEmployee: 99,
  },
} as const;
