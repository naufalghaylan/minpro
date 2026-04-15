# Frontend Profile Edit Flow

Dokumen ini menjelaskan perubahan frontend untuk fitur profile edit, change password, forgot/reset password entry point, dan navigasi dari navbar ke halaman profil.

## Ringkasan File yang Berubah

Ada 7 file utama yang berubah.

### 1. `src/api/auth.ts`

Fungsi file ini adalah pusat API auth frontend.

Yang ditambahkan:
- Type `AuthUser`, `UpdateProfileRequest`, `UpdateProfileResponse`, `ChangePasswordRequest`, `ChangePasswordResponse`, `MeResponse`.
- Helper API `getMe`, `updateProfile`, `changePassword`.
- Helper yang sudah ada tetap dipakai untuk `forgotPassword` dan `resetPassword`.

Data/API yang dipakai:
- `GET /auth/me` untuk mengambil data user login saat bootstrap.
- `PATCH /auth/profile` untuk simpan perubahan nama, username, dan bio.
- `PATCH /auth/change-password` untuk ganti password user login.
- `POST /auth/forgot-password` untuk request link reset.
- `POST /auth/reset-password` untuk reset password dari token.

Cara jalan:
- Semua request dikirim lewat instance `api` yang memakai Axios.
- Token dibaca dari `localStorage` dan dimasukkan otomatis oleh interceptor di `src/api/index.ts`.

### 2. `src/store/auth.ts`

File ini menyimpan state auth global dengan Zustand.

Yang diubah:
- Menambah field `username`, `bio`, dan `referralCode` pada tipe `User`.
- Menambah field `hydrated` untuk menandai state persist sudah selesai dibaca dari storage.
- Menambah method `setHydrated`.

Data/API yang dipakai:
- Data user berasal dari response login atau `/auth/me`.
- Token disimpan di state dan juga dipakai oleh interceptor Axios lewat `localStorage`.

Cara jalan:
- Setelah login sukses atau bootstrap sukses, `setAuth(user, token)` dipanggil.
- Saat app selesai membaca storage, `hydrated` di-set `true` supaya guard bisa jalan dengan benar.

### 3. `src/components/AuthBootstrap.tsx`

Komponen ini menjalankan bootstrap auth saat app pertama kali dibuka.

Yang diubah:
- Menggunakan `setAuth` yang baru.
- Menandai state `hydrated` setelah proses cek token selesai.

Data/API yang dipakai:
- `accessToken` dari `localStorage`.
- `GET /auth/me` untuk validasi token dan ambil user terbaru.

Cara jalan:
1. Saat app mount, komponen membaca `accessToken` dari `localStorage`.
2. Kalau token ada, komponen request ke `/auth/me`.
3. Kalau sukses, user disimpan ke Zustand.
4. Kalau gagal, token dihapus dari `localStorage`.
5. Setelah proses selesai, `hydrated` di-set `true`.

### 4. `src/components/RequireAuth.tsx`

Komponen baru ini adalah guard untuk route profil.

Fungsi:
- Menahan halaman sampai auth state selesai di-hydrate.
- Mengarahkan user ke `/login` kalau belum login.

Data/API yang dipakai:
- Data dari Zustand: `user`, `token`, dan `hydrated`.

Cara jalan:
1. Kalau `hydrated` masih `false`, tampil skeleton loading.
2. Kalau `user` atau `token` kosong, redirect ke `/login`.
3. Kalau valid, render halaman anaknya.

### 5. `src/pages/profile.tsx`

Ini halaman utama untuk edit profil.

Yang dibuat:
- Placeholder avatar/skeleton avatar.
- Form edit profil teks: nama, username, bio.
- Form ubah password.
- Link ke forgot password.

Data/API yang dipakai:
- Data user saat ini diambil dari Zustand `useAuthStore`.
- Simpan perubahan profil ke `PATCH /auth/profile`.
- Simpan perubahan password ke `PATCH /auth/change-password`.
- Validation error dari backend dibaca dari response Axios dan dipetakan ke field form.

Cara jalan:
1. Page membaca user login dari Zustand.
2. Nama, username, dan bio diisi sebagai default form.
3. Saat submit profile, data dikirim ke backend.
4. Kalau sukses, response `user` dipakai untuk update Zustand supaya navbar dan page lain ikut sinkron.
5. Saat submit password, page mengirim `currentPassword` dan `newPassword`.
6. Kalau user ingin reset password karena lupa password lama, page mengarahkan ke `/forgot-password`.

### 6. `src/components/navbar.tsx`

Navbar hanya diubah di bagian menu profile.

Yang diubah:
- Link `Profile` diarahkan ke `/profile`.
- Menu ditutup saat link profile diklik.

Data/API yang dipakai:
- State login dari Zustand (`user`).

Cara jalan:
- Jika user login, navbar menampilkan dropdown menu.
- Klik `Profile` membawa user ke halaman profile edit.

### 7. `src/App.tsx`

File routing utama aplikasi.

Yang diubah:
- Menambahkan route `/profile`.
- Membungkus route `/profile` dengan `RequireAuth`.
- Menambahkan route `/forgot-password` dan `/reset-password` ke router utama jika belum ada di versi sebelumnya.

Cara jalan:
- Router menentukan halaman mana yang dibuka berdasarkan URL.
- Route `/profile` hanya bisa dibuka kalau user login.

## Sumber Data dan Alur Eksekusi

### Sumber data utama

- `localStorage` untuk menyimpan `accessToken`.
- Zustand store untuk state user aktif.
- Backend auth API untuk data user terbaru, update profil, ganti password, forgot password, dan reset password.

### Alur saat app dibuka

1. `main.tsx` render `AuthBootstrap` dan `App`.
2. `AuthBootstrap` membaca token dari `localStorage`.
3. Kalau token ada, frontend memanggil `GET /auth/me`.
4. Hasil response disimpan ke Zustand lewat `setAuth`.
5. `RequireAuth` menunggu `hydrated` sebelum memutuskan redirect.

### Alur saat user klik Profile di navbar

1. User membuka dropdown navbar.
2. Klik menu `Profile`.
3. React Router pindah ke `/profile`.
4. `RequireAuth` memastikan user valid.
5. `ProfilePage` menampilkan data user dan form edit.

### Alur saat user simpan perubahan profil

1. User mengubah nama, username, atau bio.
2. Form melakukan validasi dengan Zod.
3. Frontend mengirim `PATCH /auth/profile`.
4. Axios interceptor otomatis menambahkan header `Authorization: Bearer <token>`.
5. Kalau sukses, response `user` dipakai untuk update Zustand.
6. Navbar dan halaman lain akan langsung melihat data yang sudah baru.

### Alur saat user ganti password

1. User isi password lama dan password baru.
2. Frontend validasi field dan konfirmasi password.
3. Frontend mengirim `PATCH /auth/change-password`.
4. Backend memverifikasi password lama dan menyimpan password baru.
5. Frontend menampilkan status sukses atau error dari response backend.

### Alur forgot/reset password

1. Jika user lupa password lama, klik link `Buka reset password`.
2. Frontend pindah ke `/forgot-password` untuk request reset link.
3. Backend mengirim email reset link.
4. Link membawa token ke `/reset-password?token=...`.
5. Halaman reset password mengirim token dan password baru ke backend.

## Catatan Implementasi

- Upload foto profil belum diaktifkan, jadi saat ini hanya ada placeholder avatar.
- Halaman profil aman untuk role `CUSTOMER` dan `EVENT_ORGANIZER` selama token valid.
- Update profil dilakukan parsial, tapi UI saat ini mengirim nilai form yang sedang diisi.
- Error backend dibaca dari struktur `message` dan `errors` supaya pesan per field bisa tampil.
