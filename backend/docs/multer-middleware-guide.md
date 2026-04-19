# Multer Middleware Guide

Dokumen ini menjelaskan cara membuat middleware Multer per fitur supaya mudah dipahami dan tidak bercampur antar use case.

## Tujuan

Multer dipakai untuk:

- menerima file upload dari request multipart/form-data
- memvalidasi mime type dan ukuran file
- menyimpan file sementara di memory
- menyiapkan file buffer untuk dikirim ke Cloudinary

## Prinsip Struktur

Untuk project ini, disarankan satu file middleware per fitur.

Contoh:

- profileImageUpload.ts untuk foto profil
- paymentImageUpload.ts untuk bukti pembayaran

Jangan gabungkan semua flow upload ke satu middleware besar kalau tim masih baru, karena itu bikin kode sulit dibaca.

## File Terkait Saat Ini

- src/middlewares/profileImageUpload.ts
- src/controllers/authController.ts
- src/routes/authRoutes.ts

## Pola Dasar Middleware

Struktur umum middleware upload:

1. Buat multer instance.
2. Pakai memoryStorage.
3. Set limits file size.
4. Set fileFilter untuk validasi mime type.
5. Jalankan single(fieldName).
6. Tangani error Multer dan AppError.

## Contoh Pola profileImageUpload

```ts
import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { AppError } from '../errors/app.error';

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);

    if (!allowed.has(file.mimetype)) {
      cb(new AppError(400, 'Invalid file type. Allowed types: JPG, PNG, WEBP.'));
      return;
    }

    cb(null, true);
  },
});

export const profileImageUpload = (req: Request, res: Response, next: NextFunction) => {
  uploader.single('profileImage')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'Profile image is too large. Maximum size is 2MB.' });
      return;
    }

    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    res.status(400).json({ message: 'Failed to process profile image upload.' });
  });
};
```

## Kenapa Memory Storage

Memory storage dipakai karena:

- file langsung diproses sebagai buffer
- cocok untuk upload ke Cloudinary
- tidak menyimpan file sementara di disk server

## Aturan Validasi yang Disarankan

- batasi mime type hanya image/jpeg, image/png, image/webp
- batasi size sesuai kebutuhan fitur
- pakai nama field yang spesifik, misalnya profileImage atau paymentImage

## Jika Mau Membuat paymentImageUpload.ts

Cukup ikuti pola yang sama:

- ubah nama file menjadi paymentImageUpload.ts
- ubah fieldName menjadi paymentImage
- sesuaikan mime type dan size
- sesuaikan pesan error

Contoh file name yang jelas:

- profileImageUpload.ts
- paymentImageUpload.ts

## Best Practice

- Jangan pakai satu middleware upload untuk semua fitur kalau payload dan rules-nya berbeda.
- Tetap pisahkan middleware per domain fitur.
- Simpan logic upload file ke Cloudinary di service, bukan di middleware.
- Middleware fokus ke validasi dan penerimaan file saja.

## Ringkasan

Pola yang paling mudah dipahami tim newbie:

- middleware spesifik per fitur
- service Cloudinary untuk upload buffer
- controller untuk orchestration
- service bisnis untuk simpan URL ke database
