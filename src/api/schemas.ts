import { z } from 'zod';
import { GIG_CATEGORIES } from '../domain/constants.js';

export const CreateUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.enum(['employer', 'employee']),
  tier: z.enum(['FREE', 'PRO']).default('FREE'),
  barangay: z.string().trim().min(1).max(120),
  lat: z.number().finite(),
  lng: z.number().finite(),
});

export const UpdateSubscriptionSchema = z.object({
  tier: z.enum(['FREE', 'PRO']),
});

export const PricingEstimateRequestSchema = z.object({
  category: z.enum(GIG_CATEGORIES),
  estimatedHours: z.number().finite().positive().max(240),
  urgency: z.enum(['standard', 'urgent']).default('standard'),
  requiredSkills: z.array(z.string().trim().max(60)).max(20).default([]),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  barangay: z.string().trim().max(120).optional(),
});

export const CreateGigSchema = z.object({
  employerId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(2000),
  category: z.enum(GIG_CATEGORIES),
  estimatedHours: z.number().finite().positive().max(240),
  offeredPricePhp: z.number().finite().nonnegative(),
  urgency: z.enum(['standard', 'urgent']).default('standard'),
  requiredSkills: z.array(z.string().trim().max(60)).max(20).default([]),
  barangay: z.string().trim().min(1).max(120),
  lat: z.number().finite(),
  lng: z.number().finite(),
});

export const NearbyGigsQuerySchema = z.object({
  lat: z.coerce.number().finite(),
  lng: z.coerce.number().finite(),
  radiusKm: z.coerce.number().finite().positive().max(100).default(10),
  category: z.enum(GIG_CATEGORIES).optional(),
  minPayPhp: z.coerce.number().finite().nonnegative().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const SavedGigsQuerySchema = z.object({
  lat: z.coerce.number().finite().optional(),
  lng: z.coerce.number().finite().optional(),
});

export const SaveGigSchema = z.object({
  gigId: z.string().trim().min(1),
  note: z.string().trim().max(280).default(''),
});

export const ApplyGigSchema = z.object({
  employeeId: z.string().trim().min(1),
  message: z.string().trim().max(500).default(''),
});

export const AcceptApplicationSchema = z.object({
  employerId: z.string().trim().min(1),
  applicationId: z.string().trim().min(1),
});

export const CompleteGigSchema = z.object({
  employerId: z.string().trim().min(1),
});
