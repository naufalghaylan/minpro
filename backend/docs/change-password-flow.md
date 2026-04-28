# Backend Change Password Flow

Dokumen ini menjelaskan alur backend untuk fitur change password pada user yang sedang login.

## Scope

- Berlaku untuk `Customer` dan `Event Organizer`.
- Hanya bisa dipakai oleh user yang sudah ter-autentikasi.
- Fitur ini berbeda dari forgot/reset password.

## Endpoint

- `PATCH /auth/change-password`

## Auth

- Wajib mengirim header:

```http
Authorization: Bearer <accessToken>
```

- Token diverifikasi lewat `authMiddleware`.
- Setelah token valid, `req.user.id` dipakai untuk menentukan user yang sedang login.

## Request Body

```json
{
  "currentPassword": "password-lama",
  "newPassword": "password-baru"
}
```

## Validation

- `currentPassword` wajib diisi.
- `newPassword` minimal 8 karakter.
- Validasi dilakukan dengan Zod di `changePasswordSchema`.

## Alur Backend

1. Request masuk ke `authRoutes`.
2. `authMiddleware` memverifikasi JWT.
3. `validateBody(changePasswordSchema)` memastikan payload valid.
4. Controller `changePassword` mengambil `req.user.id`.
5. Service `changeUserPassword` mencari user di database.
6. Password lama dibandingkan dengan bcrypt.
7. Jika password lama salah, request ditolak.
8. Jika password baru sama dengan password lama, request ditolak.
9. Password baru di-hash dengan bcrypt.
10. Password disimpan ke database.
11. Response sukses dikembalikan ke client.

## Response Success

```json
{
  "message": "Password updated successfully"
}
```

## Error Response

### Unauthorized

```json
{
  "message": "Unauthorized"
}
```

### Validation Failed

```json
{
  "message": "Validation failed",
  "errors": {
    "currentPassword": ["Current password is required"]
  }
}
```

### Current Password Wrong

```json
{
  "message": "Current password is incorrect"
}
```

### New Password Same as Old

```json
{
  "message": "New password must be different from current password"
}
```

## Files Involved

- `src/routes/authRoutes.ts`
- `src/controllers/authController.ts`
- `src/services/authService.ts`
- `src/validations/authValidation.ts`
- `src/middlewares/authMiddleware.ts`

## Catatan Implementasi

- Password tidak pernah disimpan plain text.
- Update password dilakukan untuk user yang sedang login, bukan berdasarkan ID dari client.
- Flow forgot/reset password memakai alur terpisah.