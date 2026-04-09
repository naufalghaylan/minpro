import type { Request, Response } from 'express';
import { login } from './authController';

export const loginUser = (req: Request, res: Response) => {
  return login(req, res);
};
