// Komponen ini digunakan untuk melakukan bootstrap autentikasi global di frontend.
// Saat aplikasi pertama kali dijalankan (atau di-refresh),
// komponen ini akan membaca accessToken dari localStorage,
// lalu memanggil endpoint /auth/me untuk mengambil data user dari backend.
// Jika token valid, user dan token akan disimpan ke global state (zustand),
// sehingga navbar dan seluruh aplikasi bisa langsung tahu status login user.
// Jika token tidak valid, token akan dihapus dari localStorage.

import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import api from '../api';

export default function AuthBootstrap() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    const fetchMe = async () => {
      if (!token && !refreshToken) {
        setHydrated(true);
        return;
      }

      try {
        if (!token && refreshToken) {
          const refreshResponse = await api.post('/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', refreshResponse.data.accessToken);
          setAccessToken(refreshResponse.data.accessToken);
        }

        const response = await api.get('/auth/me');
        const currentToken = localStorage.getItem('accessToken');

        if (currentToken) {
          setAuth(response.data.user, currentToken);
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setHydrated(true);
      }
    };

    void fetchMe();
  }, [setAuth, setHydrated]);
  return null;
}