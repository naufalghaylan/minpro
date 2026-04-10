import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/auth';
import type { RoleType } from '@prisma/client';

export const roleGuard = (roles: RoleType[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden. You do not have permission to access this resource.' });
    }

    next();
  };
};
