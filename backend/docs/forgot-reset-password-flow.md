# Backend Forgot And Reset Password Flow

Dokumen ini menjelaskan alur backend untuk fitur forgot password dan reset password, termasuk proses pengiriman email reset link.

## Scope

- Berlaku untuk semua role user (`CUSTOMER` dan `EVENT_ORGANIZER`).
- Endpoint ini `public` (tanpa login), tetapi tetap aman dengan token hash + expiration.

## Endpoints

- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## 1) Forgot Password

### Request Body

```json
{
  "email": "user@example.com"
}
```

### Validation

- `email` wajib format email valid (`forgotPasswordSchema`).

### Backend Flow

1. Request masuk ke route `POST /auth/forgot-password`.
2. `validateBody(forgotPasswordSchema)` memvalidasi payload.
3. Controller memanggil service `requestPasswordReset`.
4. Service mencari user berdasarkan email.
5. Kalau user tidak ditemukan, backend mengembalikan error `Email is not registered` (404).
6. Kalau user ditemukan:
7. Backend membuat token random (`randomBytes`) lalu hash token (`sha256`).
8. Backend set waktu expired token (15 menit).
9. Backend menghapus token lama user di tabel `password_reset_tokens`.
10. Backend menyimpan token baru (dalam bentuk hash) ke tabel `password_reset_tokens`.
11. Backend membuat reset link berisi token plaintext untuk frontend.
12. Backend mengirim email melalui Mailtrap SMTP menggunakan Nodemailer + template Handlebars.
13. Backend mengembalikan response sukses.

### Success Response

```json
{
  "message": "Reset link sent successfully"
}
```

### Error Response - Email Not Registered (404)

```json
{
  "message": "Email is not registered"
}
```

## 2) Reset Password

### Request Body

```json
{
  "token": "plaintext-token-dari-email",
  "newPassword": "passwordBaru123"
}
```

### Validation

- `token` wajib diisi.
- `newPassword` minimal 8 karakter.

### Backend Flow

1. Request masuk ke route `POST /auth/reset-password`.
2. `validateBody(resetPasswordSchema)` memvalidasi payload.
3. Controller memanggil service `resetUserPassword`.
4. Service hash token dari request (`sha256`).
5. Service cari token record di `password_reset_tokens` berdasarkan:
6. `token_hash` cocok,
7. `expires_at` masih aktif,
8. `used_at` masih `NULL`.
9. Jika tidak ada record valid, return error `Reset token is invalid or expired`.
10. Service cek password baru tidak sama dengan password lama.
11. Service menandai token sebagai terpakai (`used_at`) agar single-use.
12. Service hash password baru dengan bcrypt.
13. Service update password user di tabel `users`.
14. Return response sukses.

### Success Response

```json
{
  "message": "Password reset successfully"
}
```

## Error Response (Contoh)

### Validation Failed

```json
{
  "message": "Validation failed",
  "errors": {
    "newPassword": ["New password must be at least 8 characters"]
  }
}
```

### Invalid Or Expired Token

```json
{
  "message": "Reset token is invalid or expired"
}
```

## Alur Pengiriman Email Reset

1. Service `requestPasswordReset` membuat `resetLink`, contoh:
2. `http://localhost:5173/reset-password?token=<plaintextToken>`
3. Service memanggil `sendResetPasswordEmail`.
4. `emailService.ts` membuat SMTP transporter dengan env:
5. `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`.
6. Template HTML dibaca dari `src/templates/emails/reset-password.hbs`.
7. Handlebars merender template dengan data:
8. `name`, `resetLink`, `supportEmail`.
9. Nodemailer mengirim email ke `emailTo` user.

## Keamanan Yang Dipakai

- Token disimpan dalam bentuk hash, bukan plaintext.
- Token punya masa berlaku (15 menit).
- Token hanya bisa dipakai sekali (`used_at`).
- Password selalu di-hash sebelum disimpan.

## Files Involved

- `src/routes/authRoutes.ts`
- `src/controllers/authController.ts`
- `src/services/authService.ts`
- `src/services/emailService.ts`
- `src/templates/emails/reset-password.hbs`
- `src/validations/authValidation.ts`
- `prisma/schema.prisma`