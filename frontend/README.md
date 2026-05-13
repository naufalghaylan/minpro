# animeku.id Frontend

![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=000000)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.0.1-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2.2-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)

> Antarmuka utama animeku.id untuk menjelajahi event, masuk ke akun, memesan tiket, dan mengelola aktivitas pengguna serta organizer.

Frontend animeku.id dibangun untuk menjadi wajah utama aplikasi. Di sinilah user melihat daftar event, membuka detail acara, melakukan login atau registrasi, memesan tiket, melihat tiket yang sudah dibeli, mengakses halaman profil, sampai menjalankan alur khusus untuk organizer dan admin.

Project ini menggunakan **React + TypeScript + Vite** sebagai fondasi, dengan routing, state management, validasi form, animasi, dan komunikasi API yang disusun supaya alur pengalaman pengguna tetap cepat dan terstruktur.

---

## ✨ Quick Glance

| Item | Detail |
| --- | --- |
| Framework | React + TypeScript + Vite |
| Routing | React Router DOM |
| State | Zustand |
| API | Axios |
| Form & validation | React Hook Form + Zod |
| UI motion | Framer Motion |
| Styling | Tailwind CSS |

---

## 🧭 Cara Kerja Frontend

Secara sederhana, frontend bekerja lewat alur berikut:

1. Aplikasi dimulai dari [src/main.tsx](src/main.tsx), lalu membungkus seluruh app dengan `BrowserRouter`.
2. Saat aplikasi pertama kali terbuka, komponen `AuthBootstrap` dijalankan untuk menyiapkan status autentikasi pengguna.
3. Setelah itu, [src/App.tsx](src/App.tsx) mengatur seluruh route aplikasi, mulai dari halaman publik sampai halaman yang perlu akses khusus.
4. Saat user berpindah halaman, `framer-motion` memberi transisi supaya perpindahan terasa lebih halus.
5. Komponen halaman mengambil data dari API lewat `axios`, lalu menampilkan hasilnya dalam bentuk kartu, detail event, form, tabel, atau dashboard.
6. Status user, role, dan data penting lain disimpan melalui `Zustand` agar mudah dipakai lintas halaman.

Frontend ini dibangun bukan hanya untuk menampilkan data, tetapi juga untuk menjaga alur user tetap mulus dari melihat event sampai menyelesaikan proses pemesanan.

---

## 👥 Alur Penggunaan

### Untuk customer

- User membuka halaman utama dan melihat event yang tersedia.
- User masuk ke halaman detail event untuk membaca informasi lengkap.
- User login atau registrasi jika belum punya akun.
- User lanjut ke halaman order dan checkout.
- Setelah transaksi selesai, user bisa membuka tiket miliknya di halaman riwayat tiket.

### Untuk organizer

- Organizer login menggunakan role yang sesuai.
- Organizer bisa masuk ke area khusus seperti membuat event, melihat dashboard, dan mengelola voucher.
- Route tertentu dilindungi oleh `RequireAuth` dan `RequireRole` supaya hanya role yang benar yang bisa masuk.

### Untuk admin / verifikator

- Tersedia halaman khusus untuk verifikasi transaksi.
- Akses halaman ini dipisahkan dari user biasa agar alur operasional tetap aman dan jelas.

---

## 🗂️ Struktur Folder

- [src/main.tsx](src/main.tsx) menjadi entry point aplikasi.
- [src/App.tsx](src/App.tsx) berisi definisi route utama.
- [src/api.ts](src/api.ts) dipakai sebagai lapisan komunikasi ke backend.
- [src/components/](src/components/) berisi komponen umum seperti bootstrap auth, guard, navbar, dan elemen reusable lain.
- [src/pages/](src/pages/) berisi halaman-halaman utama aplikasi.
- [src/store/](src/store/) menyimpan state global dengan Zustand.
- [src/hooks/](src/hooks/) berisi custom hook untuk kebutuhan yang bisa dipakai ulang.
- [src/types/](src/types/) menyimpan definisi tipe TypeScript.
- [src/utils/](src/utils/) berisi helper kecil yang dipakai lintas fitur.

---

## 🧩 Route Utama

Frontend ini memakai routing untuk memisahkan pengalaman pengguna berdasarkan kebutuhan halaman. Beberapa route penting yang sudah disiapkan antara lain:

- `/` untuk beranda.
- `/events` untuk daftar event.
- `/order/:eventId` untuk memesan event tertentu.
- `/login` dan `/register` untuk autentikasi.
- `/checkout` untuk proses pembayaran user.
- `/profile` untuk halaman akun pengguna.
- `/myticket` dan `/ticketdetail/:id` untuk tiket milik user.
- `/organizer` dan `/organizer/dashboard` untuk organizer.
- `/vouchers` dan `/createevent` untuk fitur khusus organizer.
- `/verify` untuk halaman verifikasi transaksi.

Route yang sensitif dijaga oleh `RequireAuth` dan `RequireRole` agar akses tetap sesuai peran pengguna.

---

## 🛠️ Teknologi Yang Dipakai

Frontend ini menggunakan beberapa teknologi inti berikut:

- `React` untuk membangun UI berbasis komponen.
- `TypeScript` untuk menjaga tipe data lebih aman dan konsisten.
- `Vite` untuk development server dan build yang cepat.
- `React Router DOM` untuk navigasi antar halaman.
- `Zustand` untuk state management yang ringan dan mudah dipakai.
- `Axios` untuk request ke backend.
- `React Hook Form` dan `Zod` untuk form dan validasi.
- `Framer Motion` untuk animasi dan transisi halaman.
- `Tailwind CSS` untuk styling cepat dan konsisten.

---

## ▶️ Scripts

- `npm run dev` untuk menjalankan frontend di mode development.
- `npm run build` untuk build production.
- `npm run lint` untuk mengecek kualitas kode.
- `npm run preview` untuk melihat hasil build secara lokal.

---

## 📝 Catatan Penting

- Frontend ini terhubung ke backend animeku.id sebagai sumber data utama.
- Status autentikasi dan role dipakai untuk menentukan halaman mana yang bisa diakses user.
- Struktur project dibuat agar halaman publik, halaman customer, dan halaman organizer tetap terpisah dengan jelas.

Untuk gambaran umum project, lihat README root di [../README.md](../README.md). Detail backend didokumentasikan terpisah di folder `backend/`.
