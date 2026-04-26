import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { CouponSource, Prisma, RoleType } from '@prisma/client';
import voucherCodeGenerator from 'voucher-code-generator';
import { AppError } from '../errors/app.error';
import { prisma } from '../configs/prisma';
import { comparePassword, hashPassword } from './passwordService';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from './jwtService';
import { sendResetPasswordEmail } from './emailService';
import { uploadProfileImageToCloudinary } from './cloudinaryService';
import type { ChangePasswordInput, ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput, UpdateProfileInput } from '../validations/authValidation';
import type { LogoutInput, RefreshTokenInput } from '../validations/authValidation';

const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_MAX_ATTEMPTS = 10;
const REFERRAL_REWARD_POINTS = 10000;
const REFERRAL_COUPON_DISCOUNT_PERCENT = 10;
const REWARD_EXPIRATION_MONTHS = 3;
const REFERRAL_CODE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const COUPON_CODE_LENGTH = 10;
const COUPON_CODE_MAX_ATTEMPTS = 10;
const RESET_TOKEN_BYTES = 32;
const RESET_PASSWORD_TOKEN_EXPIRATION_MINUTES = 15;
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;

const getExpirationDateFromNow = (months: number) => {
  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + months);
  return expirationDate;
};

const getResetTokenExpirationDate = () => {
  return new Date(Date.now() + RESET_PASSWORD_TOKEN_EXPIRATION_MINUTES * 60 * 1000);
};

const hashToken = (token: string) => {
  return createHash('sha256').update(token).digest('hex');
};

const getRefreshTokenExpirationDate = () => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + REFRESH_TOKEN_EXPIRATION_DAYS);
  return expirationDate;
};

const createResetToken = () => {
  return randomBytes(RESET_TOKEN_BYTES).toString('hex');
};

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

const generateCouponCode = () => {
  return voucherCodeGenerator.generate({
    length: COUPON_CODE_LENGTH,
    count: 1,
    charset: REFERRAL_CODE_CHARSET,
    prefix: 'REF',
  })[0];
};

const createUniqueCouponCode = async (tx: Prisma.TransactionClient) => {
  for (let attempt = 0; attempt < COUPON_CODE_MAX_ATTEMPTS; attempt += 1) {
    const code = generateCouponCode();
    const existingCoupon = await tx.coupons.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existingCoupon) {
      return code;
    }
  }

  throw new AppError(500, 'Failed to generate unique coupon code');
};

const sanitizeUser = (user: {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string | null;
  profileImageUrl: string | null;
  role: RoleType;
  referralCode: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) => {
  const { id, name, username, email, bio, profileImageUrl, role, referralCode, createdAt, updatedAt, deletedAt } = user;

  return {
    id,
    name,
    username,
    email,
    bio,
    profileImageUrl,
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
      const rewardExpiresAt = getExpirationDateFromNow(REWARD_EXPIRATION_MONTHS);

      // 1. Tambah point ke referrer
      await tx.wallets.upsert({
        where: { userId: referredBy },
        create: {
          id: randomUUID(),
          userId: referredBy,
          balance: REFERRAL_REWARD_POINTS,
          expiresAt: rewardExpiresAt,
        },
        update: {
          balance: {
            increment: REFERRAL_REWARD_POINTS,
          },
          expiresAt: rewardExpiresAt,
          usedAt: null,
        },
      });

      // 2. Beri coupon ke user baru
      const existingCoupon = await tx.coupons.findFirst({
        where: { userId: createdUser.id },
        select: { id: true },
      });

      if (!existingCoupon) {
        const couponCode = await createUniqueCouponCode(tx);

        await tx.coupons.create({
          data: {
            id: randomUUID(),
            userId: createdUser.id,
            code: couponCode,
            source: CouponSource.REFERRAL_SIGNUP,
            amount: REFERRAL_COUPON_DISCOUNT_PERCENT,
            expiresAt: rewardExpiresAt,
          },
        });
      }
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

  const refreshToken = generateRefreshToken({
    id: user.id,
    role: user.role,
    email: user.email,
    username: user.username,
    name: user.name,
  });

  await prisma.refresh_tokens.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshTokenExpirationDate(),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
};

export const refreshAccessToken = async (input: RefreshTokenInput) => {
  const decoded = verifyRefreshToken(input.refreshToken);
  const tokenHash = hashToken(input.refreshToken);

  const tokenRecord = await prisma.refresh_tokens.findFirst({
    where: {
      tokenHash,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });

  if (!tokenRecord || tokenRecord.user.id !== decoded.id) {
    throw new AppError(401, 'Refresh token is invalid or expired');
  }

  const accessToken = generateAccessToken({
    id: tokenRecord.user.id,
    role: tokenRecord.user.role,
    email: tokenRecord.user.email,
    username: tokenRecord.user.username,
    name: tokenRecord.user.name,
  });

  return {
    accessToken,
  };
};

export const logoutUser = async (input: LogoutInput) => {
  const tokenHash = hashToken(input.refreshToken);

  await prisma.refresh_tokens.deleteMany({
    where: {
      tokenHash,
    },
  });

  return {
    message: 'Logout success',
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

export const updateUserProfile = async (userId: string, input: UpdateProfileInput) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (input.username && input.username !== user.username) {
    const existingUsername = await prisma.user.findUnique({
      where: { username: input.username },
      select: { id: true },
    });

    if (existingUsername) {
      throw new AppError(409, 'Username already registered');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name ?? undefined,
      username: input.username ?? undefined,
      bio: input.bio === undefined ? undefined : input.bio,
    },
  });

  return sanitizeUser(updatedUser);
};

export const updateUserProfileImage = async (userId: string, profileImageFile: Express.Multer.File) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const uploadResult = await uploadProfileImageToCloudinary(profileImageFile.buffer, user.id, user.username);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      profileImageUrl: uploadResult.secureUrl,
    },
  });

  return sanitizeUser(updatedUser);
};

export const changeUserPassword = async (userId: string, input: ChangePasswordInput) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const isCurrentPasswordValid = await comparePassword(input.currentPassword, user.password);

  if (!isCurrentPasswordValid) {
    throw new AppError(400, 'Current password is incorrect');
  }

  const isSamePassword = await comparePassword(input.newPassword, user.password);

  if (isSamePassword) {
    throw new AppError(400, 'New password must be different from current password');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: await hashPassword(input.newPassword),
    },
  });

  return { message: 'Password updated successfully' };
};

export const requestPasswordReset = async (input: ForgotPasswordInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    throw new AppError(404, 'Email is not registered');
  }

  const resetToken = createResetToken();
  const resetTokenHash = hashToken(resetToken);
  const resetTokenExpiresAt = getResetTokenExpirationDate();
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  await prisma.$transaction(async (tx: any) => {
    await tx.$executeRaw`
      DELETE FROM "password_reset_tokens"
      WHERE "user_id" = ${user.id}
    `;

    await tx.$executeRaw`
      INSERT INTO "password_reset_tokens" ("id", "user_id", "token_hash", "expires_at")
      VALUES (${randomUUID()}, ${user.id}, ${resetTokenHash}, ${resetTokenExpiresAt})
    `;
  });

  await sendResetPasswordEmail({
    emailTo: user.email,
    name: user.name,
    resetLink,
  });

  return { message: 'Reset link sent successfully' };
};

export const resetUserPassword = async (input: ResetPasswordInput) => {
  const tokenHash = hashToken(input.token);
  const result = await prisma.$transaction(async (tx: any) => {
    const tokenRows = await tx.$queryRaw<Array<{ id: string; userId: string; password: string }>>`
      SELECT prt."id", prt."user_id" AS "userId", u."password"
      FROM "password_reset_tokens" prt
      INNER JOIN "users" u ON u."id" = prt."user_id"
      WHERE prt."token_hash" = ${tokenHash}
        AND prt."expires_at" > ${new Date()}
        AND prt."used_at" IS NULL
      LIMIT 1
    `;

    const tokenRecord = tokenRows[0];

    if (!tokenRecord) {
      throw new AppError(400, 'Reset token is invalid or expired');
    }

    const isSamePassword = await comparePassword(input.newPassword, tokenRecord.password);

    if (isSamePassword) {
      throw new AppError(400, 'New password must be different from current password');
    }

    const consumedRows = await tx.$executeRaw`
      UPDATE "password_reset_tokens"
      SET "used_at" = ${new Date()}
      WHERE "id" = ${tokenRecord.id}
        AND "used_at" IS NULL
    `;

    if (consumedRows === 0) {
      throw new AppError(400, 'Reset token is invalid or expired');
    }

    await tx.user.update({
      where: { id: tokenRecord.userId },
      data: {
        password: await hashPassword(input.newPassword),
      },
    });

    return { message: 'Password reset successfully' };
  });

  return result;
};

export const getUserWalletAndCoupons = async (userId: string) => {
  const wallet = await prisma.wallets.findUnique({
    where: { userId },
  });

  const coupons = await prisma.coupons.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    wallet: wallet ?? null,
    coupons,
  };
};