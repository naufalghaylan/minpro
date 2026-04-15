import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { changePassword, updateProfile, getWalletAndCoupons, type ValidationErrors, type Wallet, type Coupon } from '../api/auth';
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
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [walletAndCouponsLoading, setWalletAndCouponsLoading] = useState(true);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

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
        setAuth(response.user, token);
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

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Blur gradient background ala tiket.com */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-linear-to-br from-blue-300/40 via-white/60 to-yellow-200/60 blur-2xl" />
      </div>
      <div className="w-full max-w-6xl z-10 mx-auto px-4 py-8 md:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Account Center</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Profil Saya</h1>
            <p className="mt-2 text-sm text-slate-600">
              Kelola data profil, ubah password, dan masuk ke alur reset password jika lupa akses.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Kembali ke beranda
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 rounded-full bg-linear-to-br from-slate-100 via-blue-50 to-amber-100 p-1 shadow-inner">
                  <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-2xl font-bold text-slate-500">
                    {avatarLabel(user?.name)}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Avatar</p>
                  <h2 className="mt-1 truncate text-lg font-bold text-slate-900">{user?.name ?? 'User'}</h2>
                  <p className="truncate text-sm text-slate-500">{user?.email ?? '-'}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Upload foto profil belum tersedia</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Placeholder avatar sudah tersedia. Endpoint upload gambar akan dihubungkan nanti tanpa mengubah struktur halaman ini.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Role</span>
                  <span className="font-semibold text-slate-900">{user?.role ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Referral code</span>
                  <span className="font-semibold text-slate-900">{user?.referralCode ?? '-'}</span>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Reset Akses</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">Lupa password?</h3>
              <p className="mt-2 text-sm text-slate-600">
                Jika kamu tidak ingat password lama, pakai alur forgot/reset password terpisah.
              </p>
              <Link
                to="/forgot-password"
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Buka reset password
              </Link>
            </section>
          </aside>

          <main className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Edit Profil</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Informasi Akun</h2>
                  <p className="mt-1 text-sm text-slate-600">Perubahan tersimpan ke akun yang sedang login.</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit(onSubmitProfile)} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nama lengkap</label>
                  <input
                    type="text"
                    className={`w-full rounded-2xl border px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${profileErrors.name ? 'border-red-400' : 'border-slate-200'}`}
                    {...registerProfile('name')}
                    disabled={savingProfile}
                    placeholder="Nama lengkap"
                  />
                  {profileErrors.name && <p className="mt-1 text-xs text-red-500">{profileErrors.name.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Bio</label>
                  <textarea
                    rows={4}
                    className={`w-full resize-none rounded-2xl border px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${profileErrors.bio ? 'border-red-400' : 'border-slate-200'}`}
                    {...registerProfile('bio')}
                    disabled={savingProfile}
                    placeholder="Tulis bio singkat"
                  />
                  {profileErrors.bio && <p className="mt-1 text-xs text-red-500">{profileErrors.bio.message}</p>}
                </div>

                <div className="sm:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-h-5 text-sm">
                    {profileError && <p className="font-medium text-red-600">{profileError}</p>}
                    {profileMessage && <p className="font-medium text-emerald-600">{profileMessage}</p>}
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Menyimpan...' : 'Simpan perubahan'}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Keamanan</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Ubah Password</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Gunakan password baru yang berbeda dari password saat ini.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit(onSubmitPassword)} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Password lama</label>
                  <input
                    type="password"
                    className={`w-full rounded-2xl border px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${passwordErrors.currentPassword ? 'border-red-400' : 'border-slate-200'}`}
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">Password baru</label>
                  <input
                    type="password"
                    className={`w-full rounded-2xl border px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${passwordErrors.newPassword ? 'border-red-400' : 'border-slate-200'}`}
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">Konfirmasi password</label>
                  <input
                    type="password"
                    className={`w-full rounded-2xl border px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${passwordErrors.confirmPassword ? 'border-red-400' : 'border-slate-200'}`}
                    {...registerPassword('confirmPassword')}
                    disabled={savingPassword}
                    autoComplete="new-password"
                    placeholder="Ulangi password baru"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-h-5 text-sm">
                    {passwordError && <p className="font-medium text-red-600">{passwordError}</p>}
                    {passwordMessage && <p className="font-medium text-emerald-600">{passwordMessage}</p>}
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={savingPassword}
                  >
                    {savingPassword ? 'Menyimpan...' : 'Ubah password'}
                  </button>
                </div>
              </form>
            </section>

            {/* Wallet Section */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Wallet</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Saldo Wallet</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Lihat saldo wallet Anda dan tanggal kadaluarsa.
                </p>
              </div>

              {walletAndCouponsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-48 animate-pulse rounded-lg bg-slate-200" />
                </div>
              ) : wallet ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Saldo</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Kadaluarsa</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Digunakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(wallet.balance)}</td>
                        <td className="px-4 py-3">
                          {isUsed(wallet.usedAt) ? (
                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              Digunakan
                            </span>
                          ) : isExpired(wallet.expiresAt) ? (
                            <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              Kadaluarsa
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Aktif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(wallet.expiresAt)}</td>
                        <td className="px-4 py-3 text-slate-600">{wallet.usedAt ? formatDate(wallet.usedAt) : '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-600">Wallet tidak ditemukan</p>
                </div>
              )}
            </section>

            {/* Coupons Section */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Coupons</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Daftar Kupon Saya</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Lihat semua kupon yang Anda miliki dan status penggunaannya.
                </p>
              </div>

              {walletAndCouponsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-48 animate-pulse rounded-lg bg-slate-200" />
                </div>
              ) : coupons.length > 0 ? (
                <div className="space-y-3">
                  {coupons.map((coupon) => (
                    <div key={coupon.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition">
                      <div className="grid gap-4 sm:grid-cols-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Kode</p>
                          <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{coupon.code}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Nominal</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(coupon.amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Kadaluarsa</p>
                          <p className="mt-1 text-sm text-slate-600">{formatDate(coupon.expiresAt)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Status</p>
                          {isUsed(coupon.usedAt) ? (
                            <span className="inline-flex rounded-full bg-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">
                              Digunakan
                            </span>
                          ) : isExpired(coupon.expiresAt) ? (
                            <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              Kadaluarsa
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Tersedia
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-600">Kupon tidak ditemukan</p>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}