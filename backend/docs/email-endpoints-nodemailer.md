# Flow Dan Endpoint Email (Nodemailer + Mailtrap)

Dokumen ini menjelaskan flow backend dan endpoint untuk pemanggilan email reset password menggunakan Nodemailer dengan SMTP Mailtrap (sering ditulis mailtemp/mailtrap).

## Tujuan

- Menstandarkan cara backend mengirim email reset password.
- Menjadi referensi frontend/QA untuk memanggil endpoint dan mengetes email.
- Menjelaskan konfigurasi environment Mailtrap yang wajib ada.

## Base URL

- Local backend: `http://localhost:3000`
- Route group auth: `/auth`

## Endpoint Matrix

| Method | Endpoint | Auth | Mengirim Email | Kegunaan |
| --- | --- | --- | --- | --- |
| POST | /auth/forgot-password | Public | Ya | Generate reset token + kirim reset link ke email user |
| POST | /auth/reset-password | Public | Tidak | Konsumsi token dari email dan set password baru |

## Alur End-To-End

1. Client memanggil `POST /auth/forgot-password` dengan email terdaftar.
2. Backend validasi payload menggunakan Zod (`forgotPasswordSchema`).
3. Backend generate token random (plaintext), hash token (`sha256`), set expiry 15 menit.
4. Backend menyimpan hash token ke tabel `password_reset_tokens` dan hapus token lama user.
5. Backend membuat reset link: `${FRONTEND_URL}/reset-password?token=<plaintextToken>`.
6. Backend memanggil service email (`sendResetPasswordEmail`) untuk kirim email via Nodemailer.
7. User klik link di email, frontend mengambil token query param.
8. Frontend memanggil `POST /auth/reset-password` dengan `token` + `newPassword`.
9. Backend hash token, verifikasi token valid, belum dipakai, dan belum expired.
10. Backend update password user (bcrypt hash), lalu tandai token `used_at` supaya single use.

## Detail Endpoint

### 1) Forgot Password (Trigger Email)

Endpoint:
- `POST /auth/forgot-password`

Request body:

```json
{
  "email": "user@example.com"
}
```

Response sukses `200`:

```json
{
  "message": "Reset link sent successfully"
}
```

Error `404` (email tidak terdaftar):

```json
{
  "message": "Email is not registered"
}
```

Validation error `400`:

```json
{
  "message": "Validation failed",
  "errors": {
    "email": ["Invalid email format"]
  }
}
```

### 2) Reset Password (Use Token Dari Email)

Endpoint:
- `POST /auth/reset-password`

Request body:

```json
{
  "token": "plaintext-token-dari-email",
  "newPassword": "PasswordBaru123"
}
```

Response sukses `200`:

```json
{
  "message": "Password reset successfully"
}
```

Error `400` (token invalid/expired/terpakai):

```json
{
  "message": "Reset token is invalid or expired"
}
```

Error `400` (password baru sama dengan password lama):

```json
{
  "message": "New password must be different from current password"
}
```

Validation error `400`:

```json
{
  "message": "Validation failed",
  "errors": {
    "newPassword": ["New password must be at least 8 characters"]
  }
}
```

## Konfigurasi Nodemailer Dan Mailtrap (Mailtemp)

Lokasi service:
- `src/services/emailService.ts`

Environment variable:

```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=<mailtrap-username>
MAIL_PASS=<mailtrap-password>
MAIL_FROM=Event Platform <no-reply@eventplatform.local>
FRONTEND_URL=http://localhost:5173
```

Catatan penting:
- `MAIL_USER` dan `MAIL_PASS` wajib ada. Jika tidak ada, backend akan throw error saat boot.
- `MAIL_HOST` default ke `sandbox.smtp.mailtrap.io`.
- `MAIL_PORT` default ke `2525`.

## Template Email

File template:
- `src/templates/emails/reset-password.hbs`

Context yang dikirim ke template:
- `name`
- `resetLink`
- `supportEmail`

Subject email:
- `Reset password Event Platform`

## Contoh Pemanggilan Endpoint

### cURL: request forgot password

```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### cURL: reset password dari link email

```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token-dari-url-email",
    "newPassword": "PasswordBaru123"
  }'
```

## Cara Testing Manual Di Mailtrap

1. Jalankan backend dengan env `MAIL_*` valid.
2. Hit endpoint forgot password.
3. Buka inbox Mailtrap sandbox, cari email subject `Reset password Event Platform`.
4. Pastikan link mengarah ke `${FRONTEND_URL}/reset-password?token=...`.
5. Copy token dari URL, panggil endpoint reset password.
6. Verifikasi response sukses dan token tidak bisa dipakai ulang.

## Mapping Kode Backend

- Routes: `src/routes/authRoutes.ts`
- Controller: `src/controllers/authController.ts`
- Service auth reset: `src/services/authService.ts`
- Service email: `src/services/emailService.ts`
- Validation: `src/validations/authValidation.ts`
- Table token reset: `password_reset_tokens` (lihat Prisma schema dan migration)

## Security Notes

- Token reset disimpan sebagai hash (`sha256`), bukan plaintext.
- Masa aktif token 15 menit.
- Token single use (`used_at` diisi setelah dipakai).
- Password baru selalu di-hash (bcrypt) sebelum update.
