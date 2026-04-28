import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import {
  changePassword,
  deleteProfilePicture,
  updateProfile,
  updateProfilePicture,
  getWalletAndCoupons,
  type ValidationErrors,
  type Wallet,
  type Coupon,
} from '../api/auth';
import { useAuthStore } from '../store/auth';

const profileSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama terlalu panjang'),
  bio: z.string().max(500, 'Bio maksimal 500 karakter').optional().or(z.literal('')),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password lama wajib diisi'),
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Password dan konfirmasi password harus sama',
    path: ['confirmPassword'],
  });

type ProfileInput = z.infer<typeof profileSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

type ErrorResponse = {
  message?: string;
  errors?: ValidationErrors;
};

const MAX_PROFILE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const avatarLabel = (name?: string | null) => {
  if (!name) {
    return 'U';
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  const sizeInKb = size / 1024;

  if (sizeInKb < 1024) {
    return `${sizeInKb.toFixed(1)} KB`;
  }

  return `${(sizeInKb / 1024).toFixed(1)} MB`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const isExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

const isUsed = (usedAt: string | null): boolean => {
  return usedAt !== null;
};

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profilePictureMessage, setProfilePictureMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profilePictureError, setProfilePictureError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingProfilePicture, setSavingProfilePicture] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [walletAndCouponsLoading, setWalletAndCouponsLoading] = useState(true);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedProfileImage, setSelectedProfileImage] = useState<File | null>(null);
  const [selectedProfileImagePreview, setSelectedProfileImagePreview] = useState<string | null>(null);
  const [isChangeProfilePictureMode, setIsChangeProfilePictureMode] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);

  const profileDefaults = useMemo<ProfileInput>(
    () => ({
      name: user?.name ?? '',
      bio: user?.bio ?? '',
    }),
    [user],
  );

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    setError: setProfileFieldError,
    formState: { errors: profileErrors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults,
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    setError: setPasswordFieldError,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    resetProfile(profileDefaults);
  }, [profileDefaults, resetProfile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsPageVisible(true);
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!selectedProfileImage) {
      setSelectedProfileImagePreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedProfileImage);
    setSelectedProfileImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedProfileImage]);

  // Fetch wallet and coupons on mount
  useEffect(() => {
    const fetchWalletAndCoupons = async () => {
      try {
        setWalletAndCouponsLoading(true);
        const data = await getWalletAndCoupons();
        setWallet(data.wallet);
        setCoupons(data.coupons);
      } catch (err) {
        console.error('Failed to fetch wallet and coupons:', err);
        setWallet(null);
        setCoupons([]);
      } finally {
        setWalletAndCouponsLoading(false);
      }
    };

    fetchWalletAndCoupons();
  }, []);

  const onSubmitProfile = async (data: ProfileInput) => {
    setSavingProfile(true);
    setProfileError(null);
    setProfileMessage(null);

    try {

      const response = await updateProfile({
        name: data.name.trim(),
        bio: data.bio ? data.bio.trim() : null,
      });

      if (token) {
        setAuth(
          {
            ...response.user,
            referredBy: user?.referredBy ?? null,
          },
          token,
        );
      }

      setProfileMessage(response.message || 'Profil berhasil diperbarui.');
      resetProfile({
        name: response.user.name,
        bio: response.user.bio ?? '',
      });
    } catch (err: unknown) {
      if (axios.isAxiosError<ErrorResponse>(err)) {
        const backendMessage = err.response?.data?.message;
        const backendErrors = err.response?.data?.errors;


        if (backendErrors?.name?.[0]) {
          setProfileFieldError('name', { message: backendErrors.name[0] });
        }
        if (backendErrors?.bio?.[0]) {
          setProfileFieldError('bio', { message: backendErrors.bio[0] });
        }

        setProfileError(backendMessage || 'Gagal memperbarui profil.');
      } else {
        setProfileError('Gagal memperbarui profil.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const onProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setProfilePictureError(null);
    setProfilePictureMessage(null);

    if (!file) {
      setSelectedProfileImage(null);
      return;
    }

    if (!ACCEPTED_PROFILE_IMAGE_TYPES.includes(file.type)) {
      setSelectedProfileImage(null);
      event.target.value = '';
      setProfilePictureError('Format file harus JPG, PNG, atau WEBP.');
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      setSelectedProfileImage(null);
      event.target.value = '';
      setProfilePictureError('Ukuran foto maksimal 2MB.');
      return;
    }

    setSelectedProfileImage(file);
  };

  const handleProfileImageUpload = async () => {
    if (!selectedProfileImage) {
      setProfilePictureError('Pilih foto profil terlebih dahulu.');
      return;
    }

    setSavingProfilePicture(true);
    setProfilePictureError(null);
    setProfilePictureMessage(null);

    try {
      const response = await updateProfilePicture(selectedProfileImage);

      if (token) {
        setAuth(
          {
            ...response.user,
            referredBy: user?.referredBy ?? null,
          },
          token,
        );
      }

      setProfilePictureMessage(response.message || 'Foto profil berhasil diperbarui.');
      handleUploadSuccess();
    } catch (err: unknown) {
      if (axios.isAxiosError<ErrorResponse>(err)) {
        setProfilePictureError(err.response?.data?.message || 'Gagal memperbarui foto profil.');
      } else {
        setProfilePictureError('Gagal memperbarui foto profil.');
      }
    } finally {
      setSavingProfilePicture(false);
    }
  };

  const clearSelectedProfileImage = () => {
    setSelectedProfileImage(null);
    setProfilePictureError(null);
    setProfilePictureMessage(null);
    setIsChangeProfilePictureMode(false);
    if (profileImageInputRef.current) {
      profileImageInputRef.current.value = '';
    }
  };

  const handleUploadSuccess = () => {
    setSelectedProfileImage(null);
    setIsChangeProfilePictureMode(false);
    if (profileImageInputRef.current) {
      profileImageInputRef.current.value = '';
    }
  };

  const handleDeleteProfileImage = async () => {
    if (!user?.profileImageUrl) {
      setProfilePictureError('tidak ada foto profil');
      return;
    }

    const confirmed = window.confirm('Hapus foto profil ini?');

    if (!confirmed) {
      return;
    }

    setSavingProfilePicture(true);
    setProfilePictureError(null);
    setProfilePictureMessage(null);

    try {
      const response = await deleteProfilePicture();

      if (token) {
        setAuth(
          {
            ...response.user,
            referredBy: user?.referredBy ?? null,
          },
          token,
        );
      }

      setProfilePictureMessage(response.message || 'Foto profil berhasil dihapus.');
      setSelectedProfileImage(null);
      setIsChangeProfilePictureMode(false);
      if (profileImageInputRef.current) {
        profileImageInputRef.current.value = '';
      }
    } catch (err: unknown) {
      if (axios.isAxiosError<ErrorResponse>(err)) {
        setProfilePictureError(err.response?.data?.message || 'Gagal menghapus foto profil.');
      } else {
        setProfilePictureError('Gagal menghapus foto profil.');
      }
    } finally {
      setSavingProfilePicture(false);
    }
  };

  const displayProfileImage = selectedProfileImagePreview ?? user?.profileImageUrl ?? null;

  const onSubmitPassword = async (data: ChangePasswordInput) => {
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordMessage(null);

    try {
      const response = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      // Setelah password berhasil diubah, logout dan redirect ke homepage
      setPasswordMessage(response.message || 'Password berhasil diperbarui.');
      resetPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: unknown) {
      if (axios.isAxiosError<ErrorResponse>(err)) {
        const backendMessage = err.response?.data?.message;
        const backendErrors = err.response?.data?.errors;

        if (backendErrors?.currentPassword?.[0]) {
          setPasswordFieldError('currentPassword', { message: backendErrors.currentPassword[0] });
        }

        if (backendErrors?.newPassword?.[0]) {
          setPasswordFieldError('newPassword', { message: backendErrors.newPassword[0] });
        }

        setPasswordError(backendMessage || 'Gagal memperbarui password.');
      } else {
        setPasswordError('Gagal memperbarui password.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const revealSectionClass = isPageVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0';
  const walletSkeletonRows = [0, 1];
  const couponSkeletonRows = [0, 1, 2];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Blur gradient background ala tiket.com */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-linear-to-br from-blue-300/40 via-white/60 to-yellow-200/60 blur-2xl" />
      </div>
      <div className="w-full max-w-6xl z-10 mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8">
        <div
          className={`mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-all duration-700 delay-75 sm:p-6 sm:flex-row sm:items-center sm:justify-between ${revealSectionClass}`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Account Center</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">Profil Saya</h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              Kelola data profil, ubah password, dan masuk ke alur reset password jika lupa akses.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm shrink-0"
          >
            Kembali ke beranda
          </Link>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4 sm:space-y-6">
            <section
              className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-700 delay-150 hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${revealSectionClass}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-full bg-linear-to-br from-slate-100 via-blue-50 to-amber-100 p-1 shadow-inner">
                  {displayProfileImage ? (
                    <img
                      src={displayProfileImage}
                      alt={user?.name ? `Foto profil ${user.name}` : 'Foto profil'}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-xl sm:text-2xl font-bold text-slate-500">
                      {avatarLabel(user?.name)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Avatar</p>
                  <h2 className="mt-1 truncate text-base sm:text-lg font-bold text-slate-900">{user?.name ?? 'User'}</h2>
                  <p className="truncate text-xs sm:text-sm text-slate-500">{user?.email ?? '-'}</p>
                </div>
              </div>

              <div className="mt-4 sm:mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                {!user?.profileImageUrl && !isChangeProfilePictureMode ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-800">Upload foto profil</p>
                        <p className="mt-1 text-xs sm:text-sm text-slate-600">
                          JPG, PNG, atau WEBP dengan ukuran maksimal 2MB.
                        </p>
                      </div>
                    </div>

                    <label className="block">
                      <span className="sr-only">Pilih foto profil</span>
                      <input
                        ref={profileImageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={onProfileImageChange}
                        disabled={savingProfilePicture}
                        className="block w-full text-xs sm:text-sm text-slate-600 file:mr-2 sm:file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-3 sm:file:px-4 file:py-2 file:text-xs sm:file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </label>

                    {selectedProfileImage && (
                      <>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-600">
                          <p className="font-semibold text-slate-900 truncate">{selectedProfileImage.name}</p>
                          <p className="mt-1">{formatFileSize(selectedProfileImage.size)}</p>
                        </div>

                        <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={handleProfileImageUpload}
                            disabled={savingProfilePicture}
                            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-blue-600 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                          >
                            {savingProfilePicture ? 'Mengunggah...' : 'Upload foto profil'}
                          </button>
                          <button
                            type="button"
                            onClick={clearSelectedProfileImage}
                            disabled={savingProfilePicture}
                            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                          >
                            Batal
                          </button>
                        </div>
                      </>
                    )}

                    <div className="min-h-5 text-xs sm:text-sm">
                      {profilePictureError && <p className="font-medium text-red-600">{profilePictureError}</p>}
                      {profilePictureMessage && <p className="font-medium text-emerald-600">{profilePictureMessage}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {user?.profileImageUrl && !isChangeProfilePictureMode && (
                      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => setIsChangeProfilePictureMode(true)}
                          disabled={savingProfilePicture}
                          className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                        >
                          Ganti Foto Profil
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteProfileImage}
                          disabled={savingProfilePicture}
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-rose-600 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                        >
                          {savingProfilePicture ? 'Memproses...' : 'Hapus Foto Profil'}
                        </button>
                      </div>
                    )}

                    {isChangeProfilePictureMode && (
                      <>
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-800">Ganti foto profil</p>
                            <p className="mt-1 text-xs sm:text-sm text-slate-600">
                              JPG, PNG, atau WEBP dengan ukuran maksimal 2MB.
                            </p>
                          </div>
                        </div>

                        <label className="block">
                          <span className="sr-only">Pilih foto profil baru</span>
                          <input
                            ref={profileImageInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={onProfileImageChange}
                            disabled={savingProfilePicture}
                            className="block w-full text-xs sm:text-sm text-slate-600 file:mr-2 sm:file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-3 sm:file:px-4 file:py-2 file:text-xs sm:file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </label>

                        {selectedProfileImage && (
                          <>
                            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-600">
                              <p className="font-semibold text-slate-900 truncate">{selectedProfileImage.name}</p>
                              <p className="mt-1">{formatFileSize(selectedProfileImage.size)}</p>
                            </div>

                            <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row">
                              <button
                                type="button"
                                onClick={handleProfileImageUpload}
                                disabled={savingProfilePicture}
                                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-blue-600 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                              >
                                {savingProfilePicture ? 'Mengunggah...' : 'Ganti Foto'}
                              </button>
                              <button
                                type="button"
                                onClick={clearSelectedProfileImage}
                                disabled={savingProfilePicture}
                                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                              >
                                Batal
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    <div className="min-h-5 text-xs sm:text-sm">
                      {profilePictureError && <p className="font-medium text-red-600">{profilePictureError}</p>}
                      {profilePictureMessage && <p className="font-medium text-emerald-600">{profilePictureMessage}</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 sm:mt-5 grid gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 sm:px-4 py-2 sm:py-3">
                  <span>Role</span>
                  <span className="font-semibold text-slate-900 text-right">{user?.role ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 sm:px-4 py-2 sm:py-3">
                  <span>Referral code</span>
                  <span className="font-semibold text-slate-900 text-right truncate ml-2">{user?.referralCode ?? '-'}</span>
                </div>
              </div>
            </section>

            <section
              className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-700 delay-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${revealSectionClass}`}
            >
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Reset Akses</p>
              <h3 className="mt-2 text-base sm:text-lg font-bold text-slate-900">Lupa password?</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                Jika kamu tidak ingat password lama, pakai alur forgot/reset password terpisah.
              </p>
              <Link
                to="/forgot-password"
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              >
                Buka reset password
              </Link>
            </section>
          </aside>

          <main className="space-y-4 sm:space-y-6">
            <section
              className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-700 delay-300 hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${revealSectionClass}`}
            >
              <div className="mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Edit Profil</p>
                <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">Informasi Akun</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600">Perubahan tersimpan ke akun yang sedang login.</p>
              </div>

              <form onSubmit={handleProfileSubmit(onSubmitProfile)} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Nama lengkap</label>
                  <input
                    type="text"
                    className={`w-full rounded-2xl border px-3 sm:px-4 py-2 sm:py-3 text-slate-900 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${profileErrors.name ? 'border-red-400' : 'border-slate-200'}`}
                    {...registerProfile('name')}
                    disabled={savingProfile}
                    placeholder="Nama lengkap"
                  />
                  {profileErrors.name && <p className="mt-1 text-xs text-red-500">{profileErrors.name.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Bio</label>
                  <textarea
                    rows={4}
                    className={`w-full resize-none rounded-2xl border px-3 sm:px-4 py-2 sm:py-3 text-slate-900 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${profileErrors.bio ? 'border-red-400' : 'border-slate-200'}`}
                    {...registerProfile('bio')}
                    disabled={savingProfile}
                    placeholder="Tulis bio singkat"
                  />
                  {profileErrors.bio && <p className="mt-1 text-xs text-red-500">{profileErrors.bio.message}</p>}
                </div>

                <div className="sm:col-span-2 flex flex-col gap-2 sm:gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-h-5 text-sm">
                    {profileError && <p className="font-medium text-red-600">{profileError}</p>}
                    {profileMessage && <p className="font-medium text-emerald-600">{profileMessage}</p>}
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Menyimpan...' : 'Simpan perubahan'}
                  </button>
                </div>
              </form>
            </section>

            <section
              className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-700 delay-360 hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${revealSectionClass}`}
            >
              <div className="mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Keamanan</p>
                <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">Ubah Password</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600">
                  Gunakan password baru yang berbeda dari password saat ini.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit(onSubmitPassword)} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Password lama</label>
                  <input
                    type="password"
                    className={`w-full rounded-2xl border px-3 sm:px-4 py-2 sm:py-3 text-slate-900 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${passwordErrors.currentPassword ? 'border-red-400' : 'border-slate-200'}`}
                    {...registerPassword('currentPassword')}
                    disabled={savingPassword}
                    autoComplete="current-password"
                    placeholder="Masukkan password lama"
                  />
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-xs text-red-500">{passwordErrors.currentPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Password baru</label>
                  <input
                    type="password"
                    className={`w-full rounded-2xl border px-3 sm:px-4 py-2 sm:py-3 text-slate-900 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${passwordErrors.newPassword ? 'border-red-400' : 'border-slate-200'}`}
                    {...registerPassword('newPassword')}
                    disabled={savingPassword}
                    autoComplete="new-password"
                    placeholder="Password baru"
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-xs text-red-500">{passwordErrors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Konfirmasi password</label>
                  <input
                    type="password"
                    className={`w-full rounded-2xl border px-3 sm:px-4 py-2 sm:py-3 text-slate-900 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${passwordErrors.confirmPassword ? 'border-red-400' : 'border-slate-200'}`}
                    {...registerPassword('confirmPassword')}
                    disabled={savingPassword}
                    autoComplete="new-password"
                    placeholder="Ulangi password baru"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2 flex flex-col gap-2 sm:gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-h-5 text-sm">
                    {passwordError && <p className="font-medium text-red-600">{passwordError}</p>}
                    {passwordMessage && <p className="font-medium text-emerald-600">{passwordMessage}</p>}
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    disabled={savingPassword}
                  >
                    {savingPassword ? 'Menyimpan...' : 'Ubah password'}
                  </button>
                </div>
              </form>
            </section>

            {/* Wallet Section */}
            <section
              className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-700 delay-440 hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${revealSectionClass}`}
            >
              <div className="mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Wallet</p>
                <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">Saldo Wallet</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600">
                  Lihat saldo wallet Anda dan tanggal kadaluarsa.
                </p>
              </div>

              {walletAndCouponsLoading ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="animate-pulse">
                    <div className="grid grid-cols-4 gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-4 sm:py-4">
                      <div className="h-3 rounded bg-slate-200" />
                      <div className="h-3 rounded bg-slate-200" />
                      <div className="h-3 rounded bg-slate-200" />
                      <div className="h-3 rounded bg-slate-200" />
                    </div>

                    {walletSkeletonRows.map((rowIndex) => (
                      <div key={`wallet-skeleton-${rowIndex}`} className="grid grid-cols-4 gap-3 px-3 py-3 sm:px-4 sm:py-4">
                        <div className="h-4 rounded bg-slate-200" />
                        <div className="h-4 rounded bg-slate-200" />
                        <div className="h-4 rounded bg-slate-200" />
                        <div className="h-4 rounded bg-slate-200" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : wallet ? (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-700">Saldo</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-700">Status</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-700">Kadaluarsa</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-700">Digunakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-slate-900">{formatCurrency(wallet.balance)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3">
                          {isUsed(wallet.usedAt) ? (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 sm:px-3 py-1 text-xs font-semibold text-slate-700">
                              Digunakan
                            </span>
                          ) : isExpired(wallet.expiresAt) ? (
                            <span className="inline-flex rounded-full bg-red-100 px-2 sm:px-3 py-1 text-xs font-semibold text-red-700">
                              Kadaluarsa
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 sm:px-3 py-1 text-xs font-semibold text-emerald-700">
                              Aktif
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-slate-600">{formatDate(wallet.expiresAt)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-slate-600">{wallet.usedAt ? formatDate(wallet.usedAt) : '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 sm:p-6 text-center">
                  <p className="text-xs sm:text-sm text-slate-600">Wallet tidak ditemukan</p>
                </div>
              )}
            </section>

            {/* Coupons Section */}
            <section
              className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-700 delay-520 hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${revealSectionClass}`}
            >
              <div className="mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Coupons</p>
                <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">Daftar Kupon Saya</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600">
                  Lihat semua kupon yang Anda miliki dan status penggunaannya.
                </p>
              </div>

              {walletAndCouponsLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  {couponSkeletonRows.map((rowIndex) => (
                    <div key={`coupon-skeleton-${rowIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 animate-pulse">
                        <div>
                          <div className="h-3 w-14 rounded bg-slate-200" />
                          <div className="mt-2 h-4 w-24 rounded bg-slate-300" />
                        </div>
                        <div>
                          <div className="h-3 w-16 rounded bg-slate-200" />
                          <div className="mt-2 h-4 w-12 rounded bg-slate-300" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <div className="h-3 w-20 rounded bg-slate-200" />
                          <div className="mt-2 h-4 w-28 rounded bg-slate-300" />
                        </div>
                        <div className="col-span-2 sm:col-span-1 sm:flex sm:items-end sm:justify-end">
                          <div className="h-7 w-24 rounded-full bg-slate-300" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : coupons.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {coupons.map((coupon) => (
                    <div key={coupon.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 hover:bg-slate-100 transition">
                      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
                        <div className="col-span-1">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Kode</p>
                          <p className="mt-1 font-mono text-xs sm:text-sm font-semibold text-slate-900 truncate">{coupon.code}</p>
                        </div>
                        <div className="col-span-1">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Nominal</p>
                          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-900">{coupon.amount}%</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Kadaluarsa</p>
                          <p className="mt-1 text-xs sm:text-sm text-slate-600">{formatDate(coupon.expiresAt)}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1 flex flex-col items-start sm:items-end gap-1 sm:gap-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Status</p>
                          {isUsed(coupon.usedAt) ? (
                            <span className="inline-flex rounded-full bg-slate-300 px-2 sm:px-3 py-1 text-xs font-semibold text-slate-700">
                              Digunakan
                            </span>
                          ) : isExpired(coupon.expiresAt) ? (
                            <span className="inline-flex rounded-full bg-red-100 px-2 sm:px-3 py-1 text-xs font-semibold text-red-700">
                              Kadaluarsa
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 sm:px-3 py-1 text-xs font-semibold text-emerald-700">
                              Tersedia
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 sm:p-6 text-center">
                  <p className="text-xs sm:text-sm text-slate-600">Kupon tidak ditemukan</p>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}