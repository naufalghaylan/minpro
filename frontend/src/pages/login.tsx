import React from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation } from 'react-router-dom';
import { z } from 'zod';

import api from '../api';
import { useAuthStore } from '../store/auth';



const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email atau username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const location = useLocation();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const successMessage = (location.state as { message?: string } | null)?.message ?? null;
  const setUser = useAuthStore((s) => s.setUser);
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
      setUser(res.data.user, res.data.accessToken);
      localStorage.setItem('accessToken', res.data.accessToken);
      // opsional: localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = '/';
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Login gagal, silakan cek data Anda.');
      } else {
        setError('Login gagal, silakan cek data Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Blur gradient background ala tiket.com */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-blue-300/40 via-white/60 to-yellow-200/60 blur-2xl" />
      </div>
      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-xl shadow-xl p-8 flex flex-col items-center border border-gray-100">
          {/* Link kembali ke home */}
          <div className="w-full flex justify-start mb-2">
            <Link to="/" className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="inline-block align-middle"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Beranda
            </Link>
          </div>
          <h2 className="text-xl font-bold mb-6 text-gray-800 text-center tracking-tight">Masuk ke Akun</h2>
          {successMessage && <div className="mb-4 w-full text-green-700 text-center text-sm font-medium bg-green-50 rounded p-2 border border-green-200">{successMessage}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="w-full">
            <div className="mb-5">
              <input
                type="text"
                className={`w-full rounded-lg border focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base ${errors.emailOrUsername ? 'border-red-400' : 'border-gray-300'}`}
                {...register('emailOrUsername')}
                disabled={loading}
                autoComplete="username"
                placeholder="Email atau username"
              />
              {errors.emailOrUsername && (
                <p className="text-red-500 text-xs mt-1">{errors.emailOrUsername.message}</p>
              )}
            </div>
            <div className="mb-5">
              <input
                type="password"
                className={`w-full rounded-lg border focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
                {...register('password')}
                disabled={loading}
                autoComplete="current-password"
                placeholder="Password"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>
            {error && <div className="text-red-600 mb-3 text-center text-sm font-medium bg-red-50 rounded p-2 border border-red-200">{error}</div>}
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition text-base mt-2"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Login'}
            </button>
          </form>
          <div className="mt-6 text-center text-gray-400 text-xs">
            Dengan login, Anda menyetujui <a href="#" className="underline hover:text-blue-600">Kebijakan Privasi</a> dan <a href="#" className="underline hover:text-blue-600">Syarat & Ketentuan</a>.
          </div>
          <div className="mt-2 text-center text-gray-500 text-xs">
            Belum punya akun?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">Daftar sekarang</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
