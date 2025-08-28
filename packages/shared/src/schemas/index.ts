import { z } from 'zod';

export const LocationSchema = z.object({
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

export const CargoDetailsSchema = z.object({
  weight: z.number().positive(),
  weightUnit: z.enum(['lbs', 'kg']),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    unit: z.enum(['ft', 'm']),
  }).optional(),
  commodity: z.string(),
  hazmat: z.boolean(),
  temperature: z.object({
    min: z.number(),
    max: z.number(),
    unit: z.enum(['F', 'C']),
  }).optional(),
  specialInstructions: z.string().optional(),
});

export const CreateOpportunitySchema = z.object({
  origin: LocationSchema,
  destination: LocationSchema,
  cargoDetails: CargoDetailsSchema,
  equipment: z.array(z.enum(['dry_van', 'reefer', 'flatbed', 'step_deck', 'rgn', 'power_only'])),
  pickupDate: z.string().datetime(),
  deliveryDate: z.string().datetime(),
  minimumRate: z.number().positive().optional(),
  buyNowRate: z.number().positive().optional(),
  visibilityRules: z.array(z.object({
    type: z.enum(['include', 'exclude']),
    field: z.enum(['carrierId', 'rating', 'region']),
    operator: z.enum(['equals', 'greater_than', 'less_than', 'in', 'not_in']),
    value: z.any(),
  })).optional(),
});

export const UpdateOpportunitySchema = CreateOpportunitySchema.partial();

export const PlaceBidSchema = z.object({
  amount: z.number().positive(),
  notes: z.string().optional(),
});

export const LockPriceSchema = z.object({
  duration: z.enum(['24h', '48h']),
});

export const SendMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  attachmentIds: z.array(z.string()).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
  tenantId: z.string().optional(),
});

export const OpportunityFiltersSchema = z.object({
  status: z.array(z.enum(['draft', 'active', 'pending', 'awarded', 'completed', 'cancelled'])).optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  equipment: z.array(z.enum(['dry_van', 'reefer', 'flatbed', 'step_deck', 'rgn', 'power_only'])).optional(),
  pickupDateFrom: z.string().datetime().optional(),
  pickupDateTo: z.string().datetime().optional(),
  minRate: z.number().optional(),
  maxRate: z.number().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateOpportunityInput = z.infer<typeof CreateOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof UpdateOpportunitySchema>;
export type PlaceBidInput = z.infer<typeof PlaceBidSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;