import React from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // 🔥 tambah navigate
import { z } from 'zod';

import api from '../api';
import { useAuthStore } from '../store/auth'; // 🔥 pastikan path benar

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email atau username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate(); // 🔥 pakai ini

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const successMessage =
    (location.state as { message?: string } | null)?.message ?? null;

  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', data);

      // 🔥 sesuaikan dengan response backend kamu
      const user = res.data.user;
      const token = res.data.token || res.data.accessToken;

      // 🔥 simpan ke zustand (dan localStorage otomatis dari store)
      setAuth(user, token);

      // 🔥 redirect clean
      navigate('/');

    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(
          err.response?.data?.message ||
          'Login gagal, silakan cek data Anda.'
        );
      } else {
        setError('Login gagal, silakan cek data Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-blue-300/40 via-white/60 to-yellow-200/60 blur-2xl" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-xl shadow-xl p-8 flex flex-col items-center border border-gray-100">
          
          {/* Back */}
          <div className="w-full flex justify-start mb-2">
            <Link to="/" className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-1">
              ← Beranda
            </Link>
          </div>

          <h2 className="text-xl font-bold mb-6 text-gray-800 text-center">
            Masuk ke Akun
          </h2>

          {successMessage && (
            <div className="mb-4 w-full text-green-700 text-center text-sm bg-green-50 p-2 rounded">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="w-full">
            
            {/* EMAIL */}
            <div className="mb-5">
              <input
                type="text"
                placeholder="Email atau username"
                className={`w-full p-3 rounded border ${
                  errors.emailOrUsername ? 'border-red-400' : 'border-gray-300'
                }`}
                {...register('emailOrUsername')}
                disabled={loading}
              />
              {errors.emailOrUsername && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.emailOrUsername.message}
                </p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="mb-5">
              <input
                type="password"
                placeholder="Password"
                className={`w-full p-3 rounded border ${
                  errors.password ? 'border-red-400' : 'border-gray-300'
                }`}
                {...register('password')}
                disabled={loading}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* ERROR */}
            {error && (
              <div className="text-red-600 mb-3 text-center text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              className="w-full py-3 rounded bg-blue-600 text-white font-bold hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Login'}
            </button>
          </form>

          <div className="mt-4 text-sm">
            Belum punya akun?{' '}
            <Link to="/register" className="text-blue-600 font-semibold">
              Daftar
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}