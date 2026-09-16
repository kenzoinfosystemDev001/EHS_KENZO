import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must contain at least 8 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
