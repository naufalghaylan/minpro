import { randomUUID } from 'node:crypto';
import { Prisma, RoleType } from '@prisma/client';
import voucherCodeGenerator from 'voucher-code-generator';
import { AppError } from '../errors/app.error';
import { prisma } from '../configs/prisma';
import { comparePassword, hashPassword } from './passwordService';
import { generateAccessToken } from './jwtService';
import type { LoginInput, RegisterInput } from '../validations/authValidation';

const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_MAX_ATTEMPTS = 10;
const REFERRAL_REWARD_POINTS = 10000;
const REFERRAL_CODE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const generateReferralCode = () => {
  return voucherCodeGenerator.generate({
    length: REFERRAL_CODE_LENGTH,
    count: 1,
    charset: REFERRAL_CODE_CHARSET,
  })[0];
};

const createUniqueReferralCode = async (tx: Prisma.TransactionClient) => {
  for (let attempt = 0; attempt < REFERRAL_CODE_MAX_ATTEMPTS; attempt += 1) {
    const referralCode = generateReferralCode();
    const existingUser = await tx.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!existingUser) {
      return referralCode;
    }
  }

  throw new AppError(500, 'Failed to generate unique referral code');
};

const sanitizeUser = (user: {
  id: string;
  name: string;
  username: string;
  email: string;
  role: RoleType;
  referralCode: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) => {
  const { id, name, username, email, role, referralCode, createdAt, updatedAt, deletedAt } = user;

  return {
    id,
    name,
    username,
    email,
    role,
    referralCode,
    createdAt,
    updatedAt,
    deletedAt,
  };
};

export const registerUser = async (input: RegisterInput) => {
  const { name, username, email, password, bio, role, referralCode: referralCodeInput } = input;
  let referredBy: string | null = null;
  const normalizedReferralCodeInput = referralCodeInput?.toUpperCase();
  const hashedPassword = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const [emailExists, usernameExists] = await Promise.all([
      tx.user.findUnique({ where: { email }, select: { id: true } }),
      tx.user.findUnique({ where: { username }, select: { id: true } }),
    ]);

    if (emailExists) {
      throw new AppError(409, 'Email already registered');
    }

    if (usernameExists) {
      throw new AppError(409, 'Username already registered');
    }

    if (normalizedReferralCodeInput) {
      const referrer = await tx.user.findUnique({
        where: { referralCode: normalizedReferralCodeInput },
        select: { id: true },
      });

      if (!referrer) {
        throw new AppError(400, 'Invalid referral code');
      }

      referredBy = referrer.id;
    }

    const referralCode = await createUniqueReferralCode(tx);
    const createdUser = await tx.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        bio,
        role: role ?? RoleType.CUSTOMER,
        referralCode,
        referredBy,
      },
    });

    if (referredBy) {
      await tx.wallets.upsert({
        where: { userId: referredBy },
        create: {
          id: randomUUID(),
          userId: referredBy,
          balance: REFERRAL_REWARD_POINTS,
        },
        update: {
          balance: {
            increment: REFERRAL_REWARD_POINTS,
          },
        },
      });
    }

    return createdUser;
  });

  return sanitizeUser(user);
};

export const loginUser = async (input: LoginInput) => {
  const { emailOrUsername, password } = input;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
  });

  if (!user) {
    throw new AppError(401, 'Incorrect email/username or password');
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new AppError(401, 'Incorrect email/username or password');
  }

  const accessToken = generateAccessToken({
    id: user.id,
    role: user.role,
    email: user.email,
    username: user.username,
    name: user.name,
  });

  return {
    accessToken,
    user: sanitizeUser(user),
  };
};

export const getCurrentUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return sanitizeUser(user);
};