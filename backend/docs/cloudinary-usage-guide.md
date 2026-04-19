# Cloudinary Usage Guide

Dokumen ini menjelaskan cara memakai Cloudinary di backend project ini untuk upload image dari buffer file yang sudah diterima oleh Multer.

## Tujuan

Cloudinary dipakai untuk:

- menyimpan file gambar di cloud storage
- menghasilkan URL publik yang bisa disimpan ke database
- mengoptimalkan image sebelum dipakai frontend

## File Terkait

- src/configs/cloudinary.ts
- src/services/cloudinaryService.ts
- src/controllers/authController.ts
- src/services/authService.ts

## Environment Variables

Pastikan env berikut sudah tersedia:

```env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

Jika salah satu belum diisi, aplikasi akan error saat startup karena Cloudinary config wajib.

## Cara Kerja

Flow upload image ke Cloudinary di project ini:

1. Request upload file masuk ke endpoint multipart/form-data.
2. File diproses Multer dan disimpan sementara di memory.
3. Controller menerima req.file.
4. Service memanggil helper upload ke Cloudinary.
5. Cloudinary mengembalikan secure URL.
6. URL disimpan ke database.

## Helper Utama

Helper utama ada di:

- src/services/cloudinaryService.ts

Fungsi yang tersedia:

- uploadProfileImageToCloudinary(fileBuffer, userId, username)
- uploadPaymentProofToCloudinary(fileBuffer)

Keduanya memakai internal helper buffer upload yang sama.

## Contoh Pemakaian

### 1) Upload profile image

```ts
import { uploadProfileImageToCloudinary } from '../services/cloudinaryService';

const result = await uploadProfileImageToCloudinary(req.file.buffer, user.id, user.username);
console.log(result.secureUrl);
```

### 2) Upload payment proof

```ts
import { uploadPaymentProofToCloudinary } from '../services/cloudinaryService';

const result = await uploadPaymentProofToCloudinary(req.file.buffer);
console.log(result.secureUrl);
```

## Transformasi Image

Cloudinary upload helper saat ini memakai transformasi default:

- resource_type: image
- folder: minpro/profile-picture/<userId> untuk profile image
- public_id dibuat dari username yang sudah disanitasi + timestamp + unique suffix
- crop limit
- quality auto
- fetch_format auto

Tujuan transformasi:

- mengecilkan ukuran file
- menjaga kualitas cukup baik
- menyesuaikan format output terbaik untuk browser

## Best Practice

- Jangan upload file langsung dari controller ke Cloudinary; simpan logic upload di service.
- Jangan hardcode credential Cloudinary di source code.
- Selalu simpan secure_url ke database, bukan path lokal.
- Untuk fitur baru, buat wrapper function sendiri jika transformasinya berbeda.
- Kalau butuh folder per user, kirim folder dinamis dari service, misalnya minpro/profile-picture/<userId>.

## Error Handling

Kalau Cloudinary gagal upload:

- service akan melempar error
- controller akan mengembalikan response 500 atau error handler yang sesuai

## Ringkasan Implementasi Saat Ini

- Profile picture memakai uploadProfileImageToCloudinary(fileBuffer, userId, username).
- Payment proof memakai uploadPaymentProofToCloudinary(fileBuffer).
- Keduanya berbagi core logic upload buffer ke Cloudinary.
