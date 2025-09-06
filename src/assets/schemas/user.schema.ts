import { z } from 'zod';

// User registration schema
export const userRegistrationSchemaDto = z.object({
  userName: z.string().min(3, 'User name must be at least 3 characters'),
  profilePicture: z.string().url('Profile picture must be a valid URL'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phoneNumber: z
    .string()
    .regex(/^[0-9]{10,15}$/, 'Phone number must be 10-15 digits'),
  email: z.string().email('Email must be a valid email address'),
  userType: z.number().int().positive('User type must be selected'),
  is_active: z.boolean().default(false).optional(),
  email_verified: z.boolean().default(false).optional(),
  phone_verified: z.boolean().default(false).optional(),
  admin_approved: z.boolean().default(false).optional(),
});

// User registration response schema
export const userRegistrationResponseSchema = z.object({
  userId: z.number().positive(),
  userName: z.string(),
  profilePicture: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phoneNumber: z.string(),
  email: z.string(),
  userType: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    description: z.string().optional(),
  }),
  is_active: z.boolean(),
  email_verified: z.boolean(),
  phone_verified: z.boolean(),
  admin_approved: z.boolean(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

// Pagination meta schema
export const paginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
  currentPage: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

// Paginated user registration response schema
export const paginatedUserRegistrationResponseSchema = z
  .object({
    statusCode: z.number().int(),
    data: z.object({
      items: z.array(userRegistrationResponseSchema),
      meta: paginationMetaSchema,
    }),
    message: z.string(),
    success: z.boolean(),
  })
  .strict();

// User registration filters schema
export const userRegistrationFilterSchema = z
  .object({
    userId: z.string().optional(),
    userType: z.string().optional(),
    is_active: z
      .preprocess(val => {
        if (typeof val === 'string') return val === 'true';
        return val;
      }, z.boolean())
      .optional(),
    email_verified: z
      .preprocess(val => {
        if (typeof val === 'string') return val === 'true';
        return val;
      }, z.boolean())
      .optional(),
    phone_verified: z
      .preprocess(val => {
        if (typeof val === 'string') return val === 'true';
        return val;
      }, z.boolean())
      .optional(),
    admin_approved: z
      .preprocess(val => {
        if (typeof val === 'string') return val === 'true';
        return val;
      }, z.boolean())
      .optional(),
  })
  .strict();

// Infer TypeScript types
export type UserRegistrationDto = z.infer<typeof userRegistrationSchemaDto>;
export type UserRegistrationResponse = z.infer<
  typeof userRegistrationResponseSchema
>;
export type PaginatedUserRegistrationResponse = z.infer<
  typeof paginatedUserRegistrationResponseSchema
>;
export type UserRegistrationFilters = z.infer<
  typeof userRegistrationFilterSchema
>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
