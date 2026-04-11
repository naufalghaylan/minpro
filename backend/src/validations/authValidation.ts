import { RoleType } from '@prisma/client';
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(100, 'Username is too long'),
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  bio: z.string().trim().max(500, 'Bio must be at most 500 characters').optional(),
  role: z.enum([RoleType.CUSTOMER, RoleType.EVENT_ORGANIZER]).optional().default(RoleType.CUSTOMER),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;