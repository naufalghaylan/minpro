import { useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { forgotPassword, type ValidationErrors } from '../api/auth';

const forgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

type ErrorResponse = {
  message?: string;
  errors?: ValidationErrors;
};

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await forgotPassword(data);
      setSuccessMessage(response.message || 'Reset link sent successfully');
    } catch (err: unknown) {
      if (axios.isAxiosError<ErrorResponse>(err)) {
        const backendMessage = err.response?.data?.message;
        const backendErrors = err.response?.data?.errors;

        if (backendErrors?.email?.[0]) {
          setError('email', { message: backendErrors.email[0] });
        }

        setErrorMessage(backendMessage || 'Gagal mengirim link reset password.');
      } else {
        setErrorMessage('Gagal mengirim link reset password.');
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
            <Link to="/login" className="text-blue-600 hover:underline text-sm font-medium">
              Kembali ke login
            </Link>
          </div>

          <h1 className="text-xl font-bold text-gray-800 mb-2">Lupa Password</h1>
          <p className="text-sm text-gray-500 mb-6">
            Masukkan email akun kamu. Kami akan kirim link untuk reset password.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <input
                type="email"
                className={`w-full rounded-lg border focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
                {...register('email')}
                disabled={loading}
                autoComplete="email"
                placeholder="Email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
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
              className="w-full py-3 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition text-base"
              disabled={loading}
            >
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
