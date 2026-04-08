import type { Request } from 'express';
import type { RoleType } from '@prisma/client';

export type UserRole = RoleType;

export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
}

export interface JwtAccessPayload {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}