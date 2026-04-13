# Dokumentasi Global State Login & Registrasi (Zustand)

## Tujuan
Agar seluruh komponen di frontend dapat mengetahui status login user (siapa, role, token) secara real-time dan konsisten, tanpa perlu prop drilling atau manual fetch ulang.

## Struktur
- Global state dikelola dengan Zustand di `src/store/auth.ts`.
- Data yang disimpan: user (id, name, email, username, role), accessToken.
- State ini otomatis diisi saat login, registrasi, dan saat reload (jika ada token di localStorage).


## Alur Penggunaan

1. **Login**
   - Setelah login sukses, panggil `setUser(user, token)` dari zustand.
   - Contoh (lihat di `src/pages/login.tsx`):
     ```ts
     import { useAuthStore } from '../store/auth';
     // ...
     const setUser = useAuthStore((s) => s.setUser);
     // ...
     setUser(res.data.user, res.data.accessToken);
     ```

2. **Registrasi**
   - Setelah registrasi sukses (endpoint /auth/register), backend biasanya langsung mengembalikan user dan token.
   - Panggil juga `setUser(user, token)` agar user langsung login setelah daftar.
   - Contoh (lihat di `src/pages/register.tsx`):
     ```ts
     setUser(res.data.user, res.data.accessToken);
     ```

3. **Bootstrap State (Auto Login)**
   - Komponen `AuthBootstrap` (lihat di `src/components/AuthBootstrap.tsx`) akan otomatis membaca token dari localStorage saat aplikasi dijalankan, lalu fetch user ke backend `/auth/me`.
   - Jika token valid, state akan otomatis terisi.
   - Tidak perlu dipanggil manual, cukup pastikan <AuthBootstrap /> dirender di `main.tsx`.

4. **Mengakses State di Komponen Lain**
   - Import dan gunakan hook:
     ```ts
     import { useAuthStore } from '../store/auth';
     const user = useAuthStore((s) => s.user);
     const logout = useAuthStore((s) => s.logout);
     ```
   - Contoh di navbar: tampilkan menu sesuai status login dan role user.

5. **Logout**
   - Panggil `logout()` dari zustand, lalu redirect jika perlu.
   - Jangan lupa hapus token dari localStorage jika perlu.


## Catatan
- Semua komponen yang memakai `useAuthStore` akan otomatis re-render jika state berubah.
- Token tetap perlu dikirim manual di header Authorization jika fetch API lain yang butuh autentikasi.
- Jika ingin menambah field user, cukup update tipe di `src/store/auth.ts`.
- Untuk membedakan role (CUSTOMER/EVENT_ORGANIZER), cukup cek `user.role` di state.

---

**Referensi kode:**
- Global state: `src/store/auth.ts`
- Bootstrap: `src/components/AuthBootstrap.tsx`
- Contoh penggunaan: `src/pages/login.tsx`, `src/pages/register.tsx`, `src/components/navbar.tsx`
