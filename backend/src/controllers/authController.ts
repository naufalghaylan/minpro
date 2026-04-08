import type { Request, Response } from 'express';
import { AppError } from '../errors/app.error';
import { getCurrentUserById, loginUser, registerUser } from '../services/authService';
import type { AuthRequest } from '../types/auth';

const handleError = (res: Response, error: unknown) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  return res.status(500).json({ message: 'Internal server error' });
};

export const register = async (req: Request, res: Response) => {
  try {
    const user = await registerUser(req.body);
    return res.status(201).json({ message: 'Register success', user });
  } catch (error) {
    return handleError(res, error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await loginUser(req.body);
    return res.status(200).json({
      message: 'Login success',
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await getCurrentUserById(req.user.id);
    return res.status(200).json({ user });
  } catch (error) {
    return handleError(res, error);
  }
};
