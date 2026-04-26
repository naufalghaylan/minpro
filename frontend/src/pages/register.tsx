import React from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import api from '../api';

const registerSchema = z
  .object({
    name: z.string().min(1, 'Nama wajib diisi'),
    username: z.string().min(3, 'Username minimal 3 karakter'),
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
    role: z.enum(['CUSTOMER', 'EVENT_ORGANIZER']),
    referralCode: z.string().optional(),
    bio: z.string().max(500, 'Bio maksimal 500 karakter').optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Password dan konfirmasi password harus sama',
    path: ['confirmPassword'],
  });

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const emailInputRef = React.useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'CUSTOMER',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: data.name,
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
        referralCode: data.referralCode?.trim() || undefined,
        bio: data.bio?.trim() || undefined,
      };

      await api.post('/auth/register', payload);
      navigate('/login', {
        replace: true,
        state: { message: 'Registrasi berhasil. Silakan login dengan akun baru Anda.' },
      });
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Register gagal, silakan cek data Anda.');
      } else {
        setError('Register gagal, silakan cek data Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-blue-300/40 via-white/60 to-yellow-200/60 blur-2xl" />
      </div>

      <div className="w-full max-w-md z-10 px-4 py-10">
        <div className="bg-white rounded-xl shadow-xl p-8 flex flex-col items-center border border-gray-100">
          <h2 className="text-xl font-bold mb-2 text-gray-800 text-center tracking-tight">Buat Akun Baru</h2>
          {/* <p className="text-sm text-gray-500 text-center mb-6">
            Daftar sebagai customer atau organizer dengan tampilan yang sama seperti login.
          </p> */}

          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
            <div>
              <input
                type="text"
                className={`w-full rounded-lg border focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                {...register('name')}
                disabled={loading}
                autoComplete="name"
                placeholder="Nama lengkap"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <input
                type="text"
                className={`w-full rounded-lg border focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base ${errors.username ? 'border-red-400' : 'border-gray-300'}`}
                {...register('username')}
                disabled={loading}
                autoComplete="username"
                placeholder="Username"
              />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <input
                type="email"
                ref={emailInputRef}
                className={`w-full rounded-lg border focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
                {...register('email')}
                disabled={loading}
                autoComplete="email"
                placeholder="Email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <input
                type="password"
                className={`w-full rounded-lg border focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
                {...register('password')}
                disabled={loading}
                autoComplete="new-password"
                placeholder="Password"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <input
                type="password"
                className={`w-full rounded-lg border focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
                {...register('confirmPassword')}
                disabled={loading}
                autoComplete="new-password"
                placeholder="Konfirmasi password"
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <div>
              <select
                className={`w-full rounded-lg border focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base ${errors.role ? 'border-red-400' : 'border-gray-300'}`}
                {...register('role')}
                disabled={loading}
              >
                <option value="CUSTOMER">Customer</option>
                <option value="EVENT_ORGANIZER">Event Organizer</option>
              </select>
              {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
            </div>

            <div>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base"
                {...register('referralCode')}
                disabled={loading}
                placeholder="Referral code (opsional)"
              />
            </div>

            <div>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-gray-700 px-4 py-3 bg-gray-50 text-base resize-none"
                {...register('bio')}
                disabled={loading}
                placeholder="Bio singkat (opsional)"
              />
              {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>}
            </div>

            {error && <div className="text-red-600 text-center text-sm font-medium bg-red-50 rounded p-2 border border-red-200">{error}</div>}
            {success && <div className="text-green-700 text-center text-sm font-medium bg-green-50 rounded p-2 border border-green-200">{success}</div>}

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition text-base mt-2 disabled:opacity-70"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Daftar'}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-400 text-xs">
            Dengan mendaftar, Anda menyetujui <a href="#" className="underline hover:text-blue-600">Kebijakan Privasi</a> dan <a href="#" className="underline hover:text-blue-600">Syarat & Ketentuan</a>.
          </div>
          <div className="mt-2 text-center text-gray-500 text-xs">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Masuk sekarang</Link>
          </div>
        </div>
      </div>
    </div>
  );
}