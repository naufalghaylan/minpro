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
  const setUser = useAuthStore((s) => s.setUser);
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        setUser(res.data.user, token);
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
      });
  }, [setUser]);
  return null;
}