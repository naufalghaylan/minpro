# animeku.id Backend

![Express](https://img.shields.io/badge/Express-5.2.1-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.6.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql&logoColor=white)

> API dan logika server untuk animeku.id, tempat semua data event, autentikasi, pemesanan tiket, organizer dashboard, dan proses pendukung dijalankan.

Backend animeku.id bertugas sebagai mesin utama di balik aplikasi. Di sinilah request dari frontend diproses, data divalidasi, autentikasi dijalankan, transaksi dikelola, event disimpan, dan fitur-fitur operasional seperti upload file, pengiriman email, cron job, serta kontrol role dijalankan.

Project ini menggunakan **Express + TypeScript + Prisma** dengan pendekatan modular: route hanya menjadi pintu masuk, controller menangani request, service memproses logika bisnis, repository menangani akses data, dan validation menjaga payload tetap aman.

---

## ✨ Quick Glance

| Item | Detail |
| --- | --- |
| Framework | Express + TypeScript |
| Database ORM | Prisma |
| Runtime DB adapter | `@prisma/adapter-pg` |
| Auth | JWT |
| Validation | Zod |
| Upload file | Multer + Cloudinary |
| Email | Nodemailer |
| Cron | `node-cron` |

---

## 🧭 Cara Kerja Backend

Alur kerja backend animeku.id secara garis besar seperti ini:

1. Aplikasi dimulai dari [index.ts](../index.ts) dan memuat environment variable dari `dotenv`.
2. Express dibuat sebagai server utama, lalu dipasangi middleware seperti `cors`, `express.json()`, dan static file untuk folder upload.
3. Koneksi database dijalankan lewat Prisma dengan adapter PostgreSQL.
4. Route untuk auth dan organizer dashboard didaftarkan dari folder `src/routes/`.
5. Request yang butuh perlindungan akan melewati `authMiddleware` dan `roleGuard`.
6. Data yang masuk divalidasi, lalu diproses oleh controller, service, dan repository sesuai tanggung jawab masing-masing.
7. Beberapa proses tambahan seperti expiry reward atau coupon dapat dijalankan otomatis lewat cron job.

Backend ini dibuat supaya setiap fitur punya lapisan yang jelas, sehingga alur bisnis tetap terjaga dan mudah dikembangkan.

---

## 🗂️ Arsitektur Folder

- [src/configs/](src/configs/) berisi konfigurasi penting seperti Prisma dan Cloudinary.
- [src/controllers/](src/controllers/) berisi handler yang menerima request dan menyusun response.
- [src/cron/](src/cron/) berisi pekerjaan terjadwal seperti proses expiry.
- [src/errors/](src/errors/) berisi class error dan pola error aplikasi.
- [src/middlewares/](src/middlewares/) berisi middleware seperti auth dan role guard.
- [src/repositories/](src/repositories/) berisi akses data ke database.
- [src/routes/](src/routes/) berisi definisi endpoint.
- [src/services/](src/services/) berisi logika bisnis utama.
- [src/templates/](src/templates/) berisi template email atau output generatif lain.
- [src/types/](src/types/) berisi tipe TypeScript yang dipakai lintas modul.
- [src/utils/](src/utils/) berisi helper umum.
- [src/validations/](src/validations/) berisi schema validasi input.

---

## 🧩 Fitur Utama Backend

### Autentikasi dan role

Backend mengelola login, proteksi route, dan role pengguna melalui JWT serta middleware authorization. Akses untuk customer dan organizer dipisahkan agar setiap halaman di frontend hanya menerima data yang sesuai.

### Event management

Backend menyediakan data event, detail event, pembuatan event baru, dan logika harga akhir termasuk diskon. Endpoint event juga menghitung status event seperti upcoming, ongoing, atau ended.

### Transaction flow

Backend menangani proses transaksi dan verifikasi, termasuk alur yang dipakai di halaman checkout dan halaman verifikasi transaksi.

### Organizer dashboard

Organizer mendapatkan endpoint khusus untuk mengelola event dan voucher, serta melihat data yang dibutuhkan untuk dashboard operasional.

### Upload dan media

Backend mendukung upload file melalui Multer dan menyimpan aset yang diperlukan untuk event atau profil pengguna.

### Email dan automation

Backend juga menyiapkan email template dan job otomatis untuk kebutuhan reminder, reset password, atau proses yang berbasis waktu.

---

## 🧱 Endpoint Yang Penting

Beberapa endpoint utama yang menjadi pusat alur aplikasi antara lain:

- `GET /` untuk cek server dan koneksi database.
- `GET /events` untuk mengambil daftar event.
- `GET /events/:id` untuk mengambil detail event.
- `POST /events` untuk membuat event baru oleh organizer.
- Endpoint auth untuk login, register, forgot password, dan reset password.
- Endpoint organizer dashboard untuk data transaksi, event, dan voucher.

Detail lengkap tiap endpoint bisa dilihat di dokumentasi pada folder [docs/](docs/).

---

## 🛠️ Teknologi Yang Dipakai

- `Express` untuk server HTTP.
- `TypeScript` untuk tipe yang lebih aman.
- `Prisma` untuk akses database.
- `PostgreSQL` sebagai database utama.
- `JWT` untuk autentikasi.
- `Zod` untuk validasi input.
- `Multer` untuk upload file.
- `Cloudinary` untuk penyimpanan media.
- `Nodemailer` untuk email.
- `node-cron` untuk tugas terjadwal.

---

## ▶️ Scripts

- `npm run dev` untuk menjalankan backend dalam mode development.
- `npm run build` untuk kompilasi TypeScript.
- `npm run start` untuk menjalankan hasil build.

---

## 📝 Catatan Penting

- Backend menggunakan Prisma v7 dengan `@prisma/adapter-pg`.
- Database connection mengandalkan `DATABASE_URL`.
- Folder `uploads/` dipakai untuk file sementara atau aset upload yang disajikan secara statik.
- Dokumentasi teknis tambahan tersedia di [docs/](docs/).

Untuk gambaran umum project, lihat [../README.md](../README.md). Untuk frontend, lihat [../frontend/README.md](../frontend/README.md).
