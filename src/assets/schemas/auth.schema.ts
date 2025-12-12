import { z } from 'zod';

// Login request schema for Fluid Pack backend
export const userLoginSchemaDto = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// User data schema for login response (matches actual Fluid Pack backend response)
export const loginUserDataSchema = z.object({
  _id: z.string(),
  username: z.string(),
  email: z.string().email(),
  role: z.string(), // Backend returns ObjectId as string, not populated object
});

// Tokens schema (both access and refresh tokens for frontend)
export const loginTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

// Login response schema (matches Fluid Pack backend)
export const loginResponseSchema = z.object({
  user: loginUserDataSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

// Refresh token response schema (only access token in response)
export const refreshTokenResponseSchema = z.object({
  accessToken: z.string(),
});

// API Response schemas - Updated to match actual Fluid Pack backend response
export const loginApiResponseSchema = z
  .object({
    message: z.string(),
    user: loginUserDataSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .strict();

export const refreshTokenApiResponseSchema = z
  .object({
    statusCode: z.number().int(),
    data: refreshTokenResponseSchema,
    message: z.string(),
    success: z.boolean(),
  })
  .strict();

export const logoutApiResponseSchema = z
  .object({
    statusCode: z.number().int(),
    data: z.null(),
    message: z.string(),
    success: z.boolean(),
  })
  .strict();

// Infer the TypeScript types
export type UserLoginDto = z.infer<typeof userLoginSchemaDto>;
export type LoginUserData = z.infer<typeof loginUserDataSchema>;
export type LoginTokens = z.infer<typeof loginTokensSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;
export type LoginApiResponse = z.infer<typeof loginApiResponseSchema>;
