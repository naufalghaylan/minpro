# Frontend Handoff - Authentication & Authorization

Dokumen ini menjelaskan kontrak API auth yang bisa langsung dipakai tim frontend untuk integrasi login, register, dan route yang diproteksi JWT.

## Base URL

- Local development: `http://localhost:3000`
- Route group: `/auth`

## Authentication Flow

### 1. Register

Endpoint:
- `POST /auth/register`

Middleware:
- `validateBody(registerSchema)`

Request body:
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

Notes:
- `role` opsional.
- Jika tidak dikirim, default ke `CUSTOMER`.
- `username` dan `email` harus unik.
- Password akan di-hash sebelum disimpan.

Success response `201`:
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

Error response `400`:
```json
{
  "message": "Validation failed",
  "errors": {
    "email": ["Format email tidak valid"]
  }
}
```

Error response `409`:
```json
{
  "message": "Email already registered"
}
```

### 2. Login

Endpoint:
- `POST /auth/login`

Middleware:
- `validateBody(loginSchema)`

Request body:
```json
{
  "emailOrUsername": "budi123",
  "password": "password123"
}
```

Aturan:
- Frontend boleh kirim email atau username ke field `emailOrUsername`.
- Password diverifikasi dengan bcrypt hash.
- JWT access token dibuat dengan expired default 15 menit.

Success response `200`:
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

Error response `401`:
```json
{
  "message": "Email/username atau password salah"
}
```

## Protected Routes

### 3. Get Current User

Endpoint:
- `GET /auth/me`

Middleware:
- `authMiddleware`

Header wajib:
```http
Authorization: Bearer <accessToken>
```

Success response `200`:
```json
{
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

Error response `401` jika token kosong atau invalid:
```json
{
  "message": "Unauthorized. Bearer token is required."
}
```

atau:
```json
{
  "message": "Invalid or expired token."
}
```

### 4. Role Protected Example

Endpoint:
- `GET /auth/organizer-dashboard`

Middleware:
- `authMiddleware`
- `roleGuard([EVENT_ORGANIZER])`

Akses:
- Hanya role `EVENT_ORGANIZER` yang boleh akses.

Success response `200`:
```json
{
  "message": "Welcome organizer dashboard"
}
```

Error response `403`:
```json
{
  "message": "Forbidden. You do not have permission to access this resource."
}
```

## Public Utility Endpoint

### 5. List Users

Endpoint:
- `GET /users`

Tujuan:
- Dipertahankan untuk kebutuhan frontend, misalnya debugging, table list, atau integrasi data awal.
- Response tidak mengandung password karena memakai `select` field aman.

Success response `200`:
```json
[
  {
    "id": "uuid",
    "name": "Budi Santoso",
    "username": "budi123",
    "email": "budi@example.com",
    "bio": "Saya suka event",
    "role": "CUSTOMER",
    "createdAt": "2026-04-08T10:00:00.000Z",
    "updatedAt": "2026-04-08T10:00:00.000Z",
    "deletedAt": null
  }
]
```

## Frontend Integration Notes

### Token Storage
- Simpan `accessToken` setelah login.
- Saat request ke endpoint protected, kirim header:
```http
Authorization: Bearer <accessToken>
```

### Recommended Client Behavior
- Jika response `401`, arahkan user ke login.
- Jika response `403`, tampilkan halaman unauthorized atau pesan akses ditolak.
- Jika response `400`, tampilkan error validasi per field.

### Suggested API Mapping
- Register page -> `POST /auth/register`
- Login page -> `POST /auth/login`
- Profile/header user state -> `GET /auth/me`
- Organizer dashboard guard -> `GET /auth/organizer-dashboard`
- User list/debug table -> `GET /users`

## Backend Implementation Reference
- JWT generation and verification: `src/services/jwtService.ts`
- Register/login business logic: `src/services/authService.ts`
- Request validation: `src/middlewares/validateRequest.ts`
- JWT protection: `src/middlewares/authMiddleware.ts`
- Role protection: `src/middlewares/roleGuard.ts`
- Auth routes: `src/routes/authRoutes.ts`
