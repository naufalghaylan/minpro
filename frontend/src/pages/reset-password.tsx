import { useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { resetPassword, type ValidationErrors } from '../api/auth';

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Password dan konfirmasi password harus sama',
    path: ['confirmPassword'],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

type ErrorResponse = {
  message?: string;
  errors?: ValidationErrors;
};

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() || '';

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!token) {
      setErrorMessage('Token reset tidak ditemukan. Minta link reset baru.');
      setLoading(false);
      return;
    }

    try {
      const response = await resetPassword({
        token,
        newPassword: data.newPassword,
      });
      setSuccessMessage(response.message || 'Password reset successfully');

      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: 'Password berhasil direset. Silakan login dengan password baru.' },
        });
      }, 1200);
    } catch (err: unknown) {
      if (axios.isAxiosError<ErrorResponse>(err)) {
        const backendMessage = err.response?.data?.message;
        const backendErrors = err.response?.data?.errors;

        if (backendErrors?.newPassword?.[0]) {
          setError('newPassword', { message: backendErrors.newPassword[0] });
        }

        setErrorMessage(backendMessage || 'Gagal reset password.');
      } else {
        setErrorMessage('Gagal reset password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-linear-to-br from-blue-300/40 via-white/60 to-yellow-200/60 blur-2xl" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
          <div className="mb-4">
            <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm font-medium">
              Minta link reset baru
            </Link>
          </div>

          <h1 className="text-xl font-bold text-gray-800 mb-2">Reset Password</h1>
          <p className="text-sm text-gray-500 mb-6">
            Masukkan password baru untuk akun kamu.
          </p>

          {!token && (
            <div className="mb-4 text-amber-700 text-sm font-medium bg-amber-50 rounded p-2 border border-amber-200">
              Token reset tidak valid. Silakan request link reset ulang.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <input
                type="password"
                className={`w-full rounded-lg border focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base ${errors.newPassword ? 'border-red-400' : 'border-gray-300'}`}
                {...register('newPassword')}
                disabled={loading || !token}
                autoComplete="new-password"
                placeholder="Password baru"
              />
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <input
                type="password"
                className={`w-full rounded-lg border focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
                {...register('confirmPassword')}
                disabled={loading || !token}
                autoComplete="new-password"
                placeholder="Konfirmasi password baru"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {errorMessage && (
              <div className="text-red-600 text-sm font-medium bg-red-50 rounded p-2 border border-red-200">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="text-green-700 text-sm font-medium bg-green-50 rounded p-2 border border-green-200">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition text-base disabled:bg-blue-300 disabled:cursor-not-allowed"
              disabled={loading || !token}
            >
              {loading ? 'Memproses...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
