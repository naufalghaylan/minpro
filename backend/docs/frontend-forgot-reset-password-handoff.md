# FE Handoff Quick Reference - Forgot And Reset Password

Dokumen ini dibuat untuk membantu implementasi frontend nanti.

## Base URL

- Local: http://localhost:3000

## Endpoint Matrix

| Method | Endpoint | Auth | Kegunaan |
| --- | --- | --- | --- |
| POST | /auth/forgot-password | No | Request link reset password via email |
| POST | /auth/reset-password | No | Set password baru dari token reset |

## 1) Forgot Password

### Request Payload

```json
{
  "email": "user@example.com"
}
```

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

### Validation Error Response (400)

```json
{
  "message": "Validation failed",
  "errors": {
    "email": ["Invalid email format"]
  }
}
```

## 2) Reset Password

### Request Payload

```json
{
  "token": "token-dari-query-param",
  "newPassword": "PasswordBaru123"
}
```

Sumber token di FE:
- Ambil dari query URL reset page.
- Contoh URL: /reset-password?token=xxxxxxxx

### Success Response

```json
{
  "message": "Password reset successfully"
}
```

### Error Response - Token Invalid Or Expired (400)

```json
{
  "message": "Reset token is invalid or expired"
}
```

### Error Response - Password Sama Dengan Lama (400)

```json
{
  "message": "New password must be different from current password"
}
```

### Validation Error Response (400)

```json
{
  "message": "Validation failed",
  "errors": {
    "newPassword": ["New password must be at least 8 characters"]
  }
}
```

## FE Flow Recommendation

1. Forgot page:
- User input email.
- Submit ke POST /auth/forgot-password.
- Jika `200`, tampilkan pesan sukses pengiriman reset link.
- Jika `404`, tampilkan pesan email tidak terdaftar.

2. Reset page:
- Ambil token dari query string.
- User input password baru.
- Submit ke POST /auth/reset-password dengan token + newPassword.
- Jika sukses, redirect ke login.

3. Error handling:
- Jika 400 validation, tampilkan field error.
- Jika token invalid/expired, tampilkan CTA untuk request forgot password lagi.

## FE Checklist (Nanti Saat Implementasi)

- Form forgot password (email).
- Form reset password (new password).
- Read token dari query param.
- Loading state saat submit.
- Disable submit button saat request berjalan.
- Error message per skenario.
- Success toast/message dan redirect ke login.

## Related Backend Files

- src/routes/authRoutes.ts
- src/controllers/authController.ts
- src/services/authService.ts
- src/validations/authValidation.ts
- src/services/emailService.ts