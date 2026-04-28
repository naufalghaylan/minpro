import { RoleType } from '@prisma/client';
import { z } from 'zod';

const optionalReferralCode = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}, z.string().min(1, 'Referral code is invalid').max(50, 'Referral code is too long').optional());

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(100, 'Username is too long'),
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  bio: z.string().trim().max(500, 'Bio must be at most 500 characters').optional(),
  role: z.enum([RoleType.CUSTOMER, RoleType.EVENT_ORGANIZER]).optional().default(RoleType.CUSTOMER),
  referralCode: optionalReferralCode,
});

export const loginSchema = z.object({
  emailOrUsername: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255, 'Name is too long').optional(),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(100, 'Username is too long').optional(),
  bio: z.string().trim().max(500, 'Bio must be at most 500 characters').nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;