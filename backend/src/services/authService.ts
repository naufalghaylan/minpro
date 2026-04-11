import { RoleType } from '@prisma/client';
import { AppError } from '../errors/app.error';
import { prisma } from '../configs/prisma';
import { comparePassword, hashPassword } from './passwordService';
import { generateAccessToken } from './jwtService';
import type { LoginInput, RegisterInput } from '../validations/authValidation';

const sanitizeUser = (user: {
  id: string;
  name: string;
  username: string;
  email: string;
  role: RoleType;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) => {
  const { id, name, username, email, role, createdAt, updatedAt, deletedAt } = user;

  return {
    id,
    name,
    username,
    email,
    role,
    createdAt,
    updatedAt,
    deletedAt,
  };
};

export const registerUser = async (input: RegisterInput) => {
  const { name, username, email, password, bio, role } = input;

  const [emailExists, usernameExists] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username } }),
  ]);

  if (emailExists) {
    throw new AppError(409, 'Email already registered');
  }

  if (usernameExists) {
    throw new AppError(409, 'Username already registered');
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      username,
      email,
      password: hashedPassword,
      bio,
      role: role ?? RoleType.CUSTOMER,
    },
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