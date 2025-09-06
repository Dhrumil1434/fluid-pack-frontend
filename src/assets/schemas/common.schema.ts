import { z } from 'zod';

// Common field schemas
export const emailSchema = z.string().email('Invalid email format');
export const phoneSchema = z
  .string()
  .regex(/^[0-9]{10,15}$/, 'Phone number must be 10-15 digits');
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters');
export const nameSchema = z
  .string()
  .min(1, 'This field is required')
  .max(150, 'Maximum length is 150 characters');

// Common API response wrapper
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z
    .object({
      statusCode: z.number().int(),
      data: dataSchema,
      message: z.string(),
      success: z.boolean(),
    })
    .strict();

// Common error response schema
export const apiErrorSchema = z.object({
  success: z.literal(false),
  action: z.string().optional(),
  errorCode: z.string(),
  message: z.string(),
  errors: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
    })
  ),
  data: z
    .array(
      z.object({
        expectedField: z.string(),
        description: z.string(),
      })
    )
    .nullable(),
  statusCode: z.number().optional(),
});

// Common pagination schemas
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const paginationResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
  currentPage: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

// Common filter schemas
export const baseFilterSchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  isActive: z
    .preprocess(val => {
      if (typeof val === 'string') return val === 'true';
      return val;
    }, z.boolean())
    .optional(),
});

// Common date schemas
export const dateSchema = z.date().or(z.string().datetime());
export const dateRangeSchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
});

// Common ID schemas
export const idSchema = z.coerce.number().int().positive();
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Common file schemas
export const fileSchema = z.object({
  name: z.string(),
  size: z.number().positive(),
  type: z.string(),
  url: z.string().url().optional(),
});

// Common status schemas
export const statusSchema = z.enum([
  'active',
  'inactive',
  'pending',
  'approved',
  'rejected',
]);
export const booleanStringSchema = z.preprocess(val => {
  if (typeof val === 'string') return val === 'true';
  return val;
}, z.boolean());

// Export types
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationResponse = z.infer<typeof paginationResponseSchema>;
export type BaseFilter = z.infer<typeof baseFilterSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type FileData = z.infer<typeof fileSchema>;
export type Status = z.infer<typeof statusSchema>;
