# Frontend Handoff - Profile Edit Endpoint

Dokumen ini khusus untuk integrasi endpoint edit profil.
Scope saat ini: update data profil teks saja (tanpa upload foto profil).

## Base URL

- Local development: `http://localhost:3000`
- Route group: `/auth`

## Endpoint

- Method: `PATCH`
- Path: `/auth/profile`
- Auth: `Required (Bearer JWT)`
- Roles: `CUSTOMER` dan `EVENT_ORGANIZER` sama-sama bisa akses (asal token valid)

## Header Wajib

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

## Request Body

Semua field bersifat opsional. Kirim hanya field yang mau diubah.

```json
{
  "name": "Budi Santoso Updated",
  "username": "budi_baru",
  "bio": "Saya suka event musik"
}
```

### Rules Validasi

- `name`: string, minimal 1 karakter, maksimal 255 karakter.
- `username`: string, minimal 3 karakter, maksimal 100 karakter, harus unik.
- `bio`: string maksimal 500 karakter, boleh `null` untuk mengosongkan bio.

## Success Response

Status: `200 OK`

```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "name": "Budi Santoso Updated",
    "username": "budi_baru",
    "email": "budi@example.com",
    "bio": "Saya suka event musik",
    "role": "CUSTOMER",
    "referralCode": "ABCD1234",
    "createdAt": "2026-04-15T08:30:00.000Z",
    "updatedAt": "2026-04-15T09:00:00.000Z",
    "deletedAt": null
  }
}
```

## Error Responses

### 1. Token tidak ada / invalid
Status: `401 Unauthorized`

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

### 2. Validasi body gagal
Status: `400 Bad Request`

```json
{
  "message": "Validation failed",
  "errors": {
    "username": ["Username must be at least 3 characters"]
  }
}
```

### 3. Username sudah dipakai user lain
Status: `409 Conflict`

```json
{
  "message": "Username already registered"
}
```

### 4. User tidak ditemukan
Status: `404 Not Found`

```json
{
  "message": "User not found"
}
```

## Frontend Integration Notes

- Simpan `accessToken` dari login, lalu kirim ke header Authorization saat update profile.
- Untuk update parsial, FE cukup kirim field yang berubah saja.
- Untuk reset bio dari FE, kirim `"bio": null`.
- Setelah sukses update profile, disarankan sinkronkan global auth state dari field `user` pada response.

## Example FE Request (fetch)

```ts
const accessToken = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:3000/auth/profile', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    name: 'Budi Santoso Updated',
    username: 'budi_baru',
    bio: 'Saya suka event musik',
  }),
});

const data = await response.json();
if (!response.ok) throw data;
```

## Current Limitation

- Update profile picture belum diimplementasikan di backend endpoint ini.
- Jika FE butuh upload foto profil nanti, akan ditambahkan endpoint terpisah (Multer + Cloudinary).

## Related Backend Files

- Route: `src/routes/authRoutes.ts`
- Controller: `src/controllers/authController.ts`
- Service: `src/services/authService.ts`
- Validation: `src/validations/authValidation.ts`
- Auth middleware: `src/middlewares/authMiddleware.ts`
