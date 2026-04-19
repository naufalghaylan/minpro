import type { Request, Response } from 'express';
import { AppError } from '../errors/app.error';
import {
  changeUserPassword,
  getCurrentUserById,
  getUserWalletAndCoupons,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetUserPassword,
  updateUserProfile,
  updateUserProfileImage,
} from '../services/authService';
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

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await updateUserProfile(req.user.id, req.body);
    return res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateProfilePicture = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Profile image file is required.' });
    }

    const user = await updateUserProfileImage(req.user.id, req.file);
    return res.status(200).json({ message: 'Profile picture updated successfully', user });
  } catch (error) {
    return handleError(res, error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await changeUserPassword(req.user.id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const result = await requestPasswordReset(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const result = await resetUserPassword(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getWalletAndCoupons = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await getUserWalletAndCoupons(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};
