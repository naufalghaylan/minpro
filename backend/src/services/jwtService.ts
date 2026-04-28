
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { JwtAccessPayload } from '../types/auth';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not set. Please add it to your environment variables.');
  }

  return secret;
};

export const generateAccessToken = (
  payload: JwtAccessPayload,
  expiresIn: SignOptions['expiresIn'] = '15m',
) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const generateRefreshToken = (
  payload: JwtAccessPayload,
  expiresIn: SignOptions['expiresIn'] = '7d',
) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const verifyAccessToken = (token: string): JwtAccessPayload => {
  const decoded = jwt.verify(token, getJwtSecret());

  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid access token payload');
  }

  return decoded as JwtAccessPayload;
};

export const verifyRefreshToken = (token: string): JwtAccessPayload => {
  const decoded = jwt.verify(token, getJwtSecret());

  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid refresh token payload');
  }

  return decoded as JwtAccessPayload;
};
