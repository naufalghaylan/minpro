# FE Quick Reference - Auth API

Dokumen singkat ini dibuat untuk tim frontend agar cepat mapping endpoint, payload, dan handling response.

## Base URL

- Local: `http://localhost:3000`

## Endpoint Matrix

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | No | Register user baru |
| POST | `/auth/login` | No | Login dan ambil access token |
| GET | `/auth/me` | Yes | Ambil data user aktif |
| GET | `/auth/organizer-dashboard` | Yes + Role | Contoh route khusus organizer |
| GET | `/users` | No | List user untuk kebutuhan frontend |

## Request Bodies

### Register

```json
{
  "name": "Budi Santoso",
  "username": "budi123",
  "email": "budi@example.com",
  "password": "password123",
  "bio": "Saya suka event",
  "role": "CUSTOMER"
}
```

Rules:
- `role` boleh kosong, default `CUSTOMER`.
- `email` dan `username` harus unik.
- `password` minimal 8 karakter.

### Login

```json
{
  "emailOrUsername": "budi123",
  "password": "password123"
}
```

Rules:
- Field `emailOrUsername` bisa diisi email atau username.

## Response Shapes

### Success Register

```json
{
  "message": "Register success",
  "user": {
    "id": "uuid",
    "name": "Budi Santoso",
    "username": "budi123",
    "email": "budi@example.com",
    "role": "CUSTOMER",
    "createdAt": "2026-04-08T10:00:00.000Z",
    "updatedAt": "2026-04-08T10:00:00.000Z",
    "deletedAt": null
  }
}
```

### Success Login

```json
{
  "message": "Login success",
  "accessToken": "jwt-token-here",
  "user": {
    "id": "uuid",
    "name": "Budi Santoso",
    "username": "budi123",
    "email": "budi@example.com",
    "role": "CUSTOMER",
    "createdAt": "2026-04-08T10:00:00.000Z",
    "updatedAt": "2026-04-08T10:00:00.000Z",
    "deletedAt": null
  }
}
```

### Validation Error

```json
{
  "message": "Validation failed",
  "errors": {
    "email": ["Format email tidak valid"]
  }
}
```

### Auth Error

```json
{
  "message": "Email/username atau password salah"
}
```

## Frontend Client Pattern

### Helper request

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}
```

### Login usage

```ts
const result = await apiRequest('/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    emailOrUsername,
    password,
  }),
});

localStorage.setItem('accessToken', result.accessToken);
```

### Protected request usage

```ts
const accessToken = localStorage.getItem('accessToken');

const me = await apiRequest('/auth/me', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

## Error Handling Guidelines

- `400`: tampilkan error validasi per field.
- `401`: redirect ke login atau tampilkan session expired.
- `403`: tampilkan unauthorized page atau toast access denied.
- `500`: tampilkan pesan gagal umum.

## Data That Frontend Can Rely On

- Response user tidak mengandung password.
- Token login dikirim di field `accessToken`.
- Route protected wajib pakai header `Authorization: Bearer <token>`.
- Role organizer divalidasi di backend.

## Related Backend Files

- JWT service: `src/services/jwtService.ts`
- Auth business logic: `src/services/authService.ts`
- Request validation: `src/middlewares/validateRequest.ts`
- JWT middleware: `src/middlewares/authMiddleware.ts`
- Role guard: `src/middlewares/roleGuard.ts`
- Auth routes: `src/routes/authRoutes.ts`
