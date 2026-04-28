import api from './index';

export type ValidationErrors = Record<string, string[]>;

export type AuthUser = {
  id: string;
  name: string;
  username?: string;
  email: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  referralCode?: string;
  role: 'CUSTOMER' | 'EVENT_ORGANIZER';
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type UpdateProfileRequest = {
  name?: string;
  username?: string;
  bio?: string | null;
};

export type UpdateProfileResponse = {
  message: string;
  user: AuthUser;
};

export type UpdateProfilePictureResponse = {
  message: string;
  user: AuthUser;
};

export type DeleteProfilePictureResponse = {
  message: string;
  user: AuthUser;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResponse = {
  message: string;
};

export type LoginRequest = {
  emailOrUsername: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type RefreshTokenResponse = {
  message: string;
  accessToken: string;
};

export type LogoutRequest = {
  refreshToken: string;
};

export type LogoutResponse = {
  message: string;
};

export type MeResponse = {
  user: AuthUser;
};

export type Wallet = {
  id: string;
  userId: string;
  balance: number;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type Coupon = {
  id: string;
  userId: string;
  code: string;
  source: string;
  amount: number;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletAndCouponsResponse = {
  wallet: Wallet | null;
  coupons: Coupon[];
};

export const forgotPassword = async (
  payload: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> => {
  const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', payload);
  return response.data;
};

export const resetPassword = async (
  payload: ResetPasswordRequest,
): Promise<ResetPasswordResponse> => {
  const response = await api.post<ResetPasswordResponse>('/auth/reset-password', payload);
  return response.data;
};

export const getMe = async (): Promise<MeResponse> => {
  const response = await api.get<MeResponse>('/auth/me');
  return response.data;
};

export const updateProfile = async (
  payload: UpdateProfileRequest,
): Promise<UpdateProfileResponse> => {
  const response = await api.patch<UpdateProfileResponse>('/auth/profile', payload);
  return response.data;
};

export const updateProfilePicture = async (
  file: File,
): Promise<UpdateProfilePictureResponse> => {
  const formData = new FormData();
  formData.append('profileImage', file);

  const response = await api.patch<UpdateProfilePictureResponse>('/auth/profile/picture', formData);

  return response.data;
};

export const deleteProfilePicture = async (): Promise<DeleteProfilePictureResponse> => {
  const response = await api.delete<DeleteProfilePictureResponse>('/auth/profile/picture');
  return response.data;
};

export const changePassword = async (
  payload: ChangePasswordRequest,
): Promise<ChangePasswordResponse> => {
  const response = await api.patch<ChangePasswordResponse>('/auth/change-password', payload);
  return response.data;
};

export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', payload);
  return response.data;
};

export const refreshToken = async (payload: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
  const response = await api.post<RefreshTokenResponse>('/auth/refresh', payload);
  return response.data;
};

export const logout = async (payload: LogoutRequest): Promise<LogoutResponse> => {
  const response = await api.post<LogoutResponse>('/auth/logout', payload);
  return response.data;
};

export const getWalletAndCoupons = async (): Promise<WalletAndCouponsResponse> => {
  const response = await api.get<WalletAndCouponsResponse>('/auth/wallet-and-coupons');
  return response.data;
};
