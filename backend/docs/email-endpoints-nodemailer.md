# Email Endpoints (Nodemailer)

Dokumen ini merangkum endpoint yang terkait pengiriman email via Nodemailer di backend.

## Base URL

- Local: `http://localhost:3000`
- Route group: `/auth`

## Endpoint Matrix

| Method | Endpoint | Auth | Trigger Email | Kegunaan |
| --- | --- | --- | --- | --- |
| POST | /auth/forgot-password | No | Yes | Kirim reset password link ke email user |
| POST | /auth/reset-password | No | No | Set password baru menggunakan token dari email |

## 1) Forgot Password (Trigger Email)

Endpoint:
- `POST /auth/forgot-password`

Request body:

```json
{
  "email": "user@example.com"
}
```

Validasi:
- `email` wajib format email valid.

Success response `200`:

```json
{
  "message": "Reset link sent successfully"
}
```

Error response `404` (email tidak terdaftar):

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

Catatan:
- Endpoint ini yang memanggil service Nodemailer (`sendResetPasswordEmail`).
- Link reset diarahkan ke frontend URL:
  - `${FRONTEND_URL}/reset-password?token=<plaintextToken>`
  - Default `FRONTEND_URL`: `http://localhost:5173`

## 2) Reset Password (Consume Token Dari Email)

Endpoint:
- `POST /auth/reset-password`

Request body:

```json
{
  "token": "token-dari-email",
  "newPassword": "PasswordBaru123"
}
```

Success response `200`:

```json
{
  "message": "Password reset successfully"
}
```

Error response `400` (token invalid/expired):

```json
{
  "message": "Reset token is invalid or expired"
}
```

Error response `400` (password sama dengan password lama):

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

## Nodemailer Setup (Yang Dipakai Endpoint)

Service file:
- `src/services/emailService.ts`

SMTP env yang dipakai:
- `MAIL_HOST` (default: `sandbox.smtp.mailtrap.io`)
- `MAIL_PORT` (default: `2525`)
- `MAIL_USER` (required)
- `MAIL_PASS` (required)
- `MAIL_FROM` (default: `Event Platform <no-reply@eventplatform.local>`)

Template email:
- `src/templates/emails/reset-password.hbs`

Template context:
- `name`
- `resetLink`
- `supportEmail`

Subject email:
- `Reset password Event Platform`

## cURL Examples

### Request forgot password (kirim email)

```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### Reset password dari token email

```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token-dari-url-email",
    "newPassword": "PasswordBaru123"
  }'
```

## Ringkas Endpoint Email

- `POST /auth/forgot-password` -> kirim email reset password via Nodemailer
- `POST /auth/reset-password` -> gunakan token dari email untuk ganti password
