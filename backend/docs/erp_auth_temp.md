## ERP (Entity Relationship & Process) - Autentikasi

### 1. Alur Register
- Endpoint: POST /register (authRoutes)
  - Middleware: validateBody(registerSchema)
  - Controller: register (authController)
    - Service: registerUser (authService)
      - Cek email & username unik (prisma.user.findUnique)
      - Hash password (passwordService)
      - Simpan user baru (prisma.user.create)
    - Return: user (tanpa password)

### 2. Alur Login
- Endpoint: POST /login (authRoutes)
  - Middleware: validateBody(loginSchema)
  - Controller: login (authController)
    - Service: loginUser (authService)
      - Cari user by email/username (prisma.user.findFirst)
      - Cek password (passwordService)
      - Generate JWT (jwtService)
    - Return: accessToken, user

### 3. Alur GetMe (Profile)
- Endpoint: GET /me (authRoutes)
  - Middleware: authMiddleware (verifikasi JWT, inject req.user)
  - Controller: getMe (authController)
    - Service: getCurrentUserById (authService)
      - prisma.user.findUnique
    - Return: user

### 4. Role Guard (Contoh: /organizer-dashboard)
- Endpoint: GET /organizer-dashboard
  - Middleware: authMiddleware -> roleGuard([EVENT_ORGANIZER])
  - Jika role tidak sesuai: 403 Forbidden

### 5. Relasi Database (Prisma)
- User (role: CUSTOMER/EVENT_ORGANIZER)
  - Relasi: events (sebagai organizer), orders (sebagai customer), wallets
- events: eventOrganizerId -> User.id
- orders: customerId -> User.id, eventId -> events.id
- wallets: userId -> User.id

### 6. Dependensi Kode
- authController <-> authService <-> prisma, passwordService, jwtService
- authMiddleware <-> jwtService
- roleGuard <-> req.user (inject dari authMiddleware)
- Validasi: zod (authValidation)

### 7. Error Handling
- Semua error custom: AppError
- Error 401: Unauthorized (token salah/tidak ada, login gagal)
- Error 403: Forbidden (role tidak sesuai)
- Error 409: Data sudah ada (email/username)
- Error 404: User tidak ditemukan

---
_File ini hanya sementara untuk penjelasan alur dan relasi kode autentikasi._