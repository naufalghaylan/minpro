# Profile Picture Upload Flow

Dokumen ini menjelaskan endpoint backend untuk upload dan update foto profil user (CUSTOMER dan EVENT_ORGANIZER), termasuk penyimpanan file ke folder Cloudinary per user.

## Base URL

- Local development: http://localhost:3000
- Route group: /auth

## Endpoint

- Method: PATCH
- Path: /auth/profile/picture
- Auth: Required (Bearer JWT)
- Content-Type: multipart/form-data
- Form field file: profileImage

## Tujuan Endpoint

- Menerima file gambar dari user.
- Validasi keamanan upload (mime type + ukuran file).
- Upload file valid ke Cloudinary.
- Simpan URL hasil Cloudinary ke kolom users.profileImageUrl.

## Nama File Saat Upload

Saat file di-upload ke Cloudinary, nama file akan otomatis diganti menjadi:

- username yang sudah disanitasi
- ditambah timestamp
- ditambah unique suffix

Contoh:

- username `budi_santoso` menjadi sesuatu seperti `budi-santoso-1713260000000-uuid`

Tujuannya supaya nama file tetap mudah dibaca, aman, dan tidak bentrok dengan file lain.

## Struktur Folder Cloudinary

Upload foto profil disimpan ke folder berikut:

- `minpro/profile-picture/{userId}`

Contoh:

- user `abc123` akan tersimpan di `minpro/profile-picture/abc123`

Tujuannya supaya setiap user punya area file yang terpisah dan rapi di Cloudinary.

## Struktur Implementasi

Untuk menjaga kode tetap mudah dipahami pemula, upload profile picture memakai file khusus per layer:

- `profileImageUpload.ts` menangani validasi file profile picture.
- `cloudinaryService.ts` menangani upload buffer ke Cloudinary.
- `authController.ts` dan `authService.ts` menangani business flow update user.

Kalau nanti ada fitur payment upload, rekan kamu bisa membuat file middleware sendiri seperti `paymentImageUpload.ts` dengan pola yang sama, tanpa harus mengubah middleware profile picture ini.

## Validasi Upload

Validasi dilakukan di middleware Multer dengan memory storage:

- Penyimpanan sementara: memory (bukan disk)
- Max file size: 2MB
- Allowed mime types:
  - image/jpeg
  - image/png
  - image/webp

Jika mime type tidak valid, request ditolak.
Jika file melebihi 2MB, request ditolak.

## Transformasi Saat Upload ke Cloudinary

Di layer service, file di-upload ke Cloudinary dengan transformasi:

- Limit ukuran dimensi maksimum 1024x1024
- Optimasi kualitas otomatis
- Optimasi format otomatis

Secara teknis, helper Cloudinary juga menerima folder dinamis dari user id, jadi path upload menjadi `minpro/profile-picture/{userId}`.

Tujuan transformasi:

- Menjaga performa loading di frontend
- Menekan ukuran file tanpa mengorbankan kualitas signifikan

## Header Wajib

Authorization: Bearer <accessToken>

Catatan:
- Content-Type multipart/form-data biasanya akan di-set otomatis oleh client saat mengirim FormData.

## Contoh Request (cURL)

```bash
curl --location --request PATCH 'http://localhost:3000/auth/profile/picture' \
--header 'Authorization: Bearer <accessToken>' \
--form 'profileImage=@"/path/to/photo.jpg"'
```

## Success Response

Status: 200 OK

```json
{
  "message": "Profile picture updated successfully",
  "user": {
    "id": "uuid",
    "name": "Budi",
    "username": "budi123",
    "email": "budi@example.com",
    "bio": "Saya suka konser",
    "profileImageUrl": "https://res.cloudinary.com/.../image/upload/...jpg",
    "role": "CUSTOMER",
    "referralCode": "ABCD1234",
    "createdAt": "2026-04-16T10:00:00.000Z",
    "updatedAt": "2026-04-16T10:10:00.000Z",
    "deletedAt": null
  }
}
```

## Error Responses

### 1) Token tidak ada / tidak valid
Status: 401 Unauthorized

```json
{
  "message": "Unauthorized. Bearer token is required."
}
```

atau

```json
{
  "message": "Invalid or expired token."
}
```

### 2) File tidak dikirim
Status: 400 Bad Request

```json
{
  "message": "Profile image file is required."
}
```

### 3) Mime type tidak didukung
Status: 400 Bad Request

```json
{
  "message": "Invalid file type. Allowed types: JPG, PNG, WEBP."
}
```

### 4) File terlalu besar
Status: 413 Payload Too Large

```json
{
  "message": "Profile image is too large. Maximum size is 2MB."
}
```

### 5) User tidak ditemukan
Status: 404 Not Found

```json
{
  "message": "User not found"
}
```

## Alur Backend Singkat

1. Request masuk ke route PATCH /auth/profile/picture.
2. authMiddleware memverifikasi access token.
3. profileImageUpload middleware memproses file + validasi mime/size.
4. Controller updateProfilePicture memvalidasi keberadaan req.file.
5. Service memanggil uploadProfileImageToCloudinary(fileBuffer, userId, username).
6. Cloudinary menyimpan file ke folder minpro/profile-picture/{userId}.
7. Cloudinary memberi nama file baru berdasarkan username + timestamp.
8. Service update users.profileImageUrl di database.
9. Response user terbaru dikembalikan ke client.

## Related Backend Files

- src/routes/authRoutes.ts
- src/controllers/authController.ts
- src/middlewares/profileImageUpload.ts
- src/services/cloudinaryService.ts
- src/services/authService.ts
- src/configs/cloudinary.ts
- prisma/schema.prisma
