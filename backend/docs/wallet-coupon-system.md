# Wallet & Coupon System Documentation

Dokumentasi sistem wallet & coupon: data model, lifecycle, dan cara kerjanya.

---

## 1. Wallet

### 1.1 Data Model

```prisma
model wallets {
  id        String   @id @default(uuid())
  userId    String   @unique
  balance   Int      @default(0)           // dalam IDR
  expiresAt DateTime?                      // kapan wallet expired
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  users     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 1.2 Field Explanation

| Field | Type | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `userId` | String | Foreign key ke user (one-to-one) |
| `balance` | Int | Saldo dalam IDR (default 0, tidak boleh negatif) |
| `expiresAt` | DateTime | Tanggal expired wallet. Null jika balance = 0 |
| `createdAt` | DateTime | Waktu wallet dibuat (saat user register) |
| `updatedAt` | DateTime | Terakhir diupdate |

### 1.3 Lifecycle

**Wallet Created:**
- Dibuat otomatis saat user register dengan `balance = 0`
- Jika user register via referral dan referrer valid:
  - `balance = 10000` IDR (referral reward)
  - `expiresAt = now + 3 months`

**Wallet Updated:**
- Balance berkurang saat digunakan dalam transaksi
- Balance bertambah dari refund atau grant manual
- Setiap kali balance berubah → `expiresAt` di-reset ke `now + 3 months`

**Wallet Expiration:**
- Saat `expiresAt <= NOW()` dan `balance > 0`:
  - Cron job daily (23:59 UTC) reset `balance = 0`
  - `expiresAt` tetap disimpan sebagai record
- Di app layer: selalu validasi `expiresAt > NOW()` sebelum pakai

**Wallet Lifecycle Diagram:**
```
[User Register]
    ↓
[Wallet created: balance=0]
    ↓
[If referral valid: balance=10000, expiresAt=now+3mo]
    ↓
[Transaction deduction: balance -= amount, expiresAt=now+3mo]
    ↓
[Expired: balance=0 (via cron daily)]
```

---

## 2. Coupon

### 2.1 Data Model

```prisma
model coupons {
  id        String       @id @default(uuid())
  userId    String
  code      String?      @unique @db.VarChar(50)
  source    CouponSource
  amount    Int                              // dalam IDR
  usedAt    DateTime?                        // kapan dipakai / expired
  expiresAt DateTime                         // hard deadline
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  users     User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("coupons")
}

enum CouponSource {
  REFERRAL_SIGNUP    // dari referral signup reward
  EVENT_PROMOTION    // dari event promotion campaign
  ORDER_REFUND       // dari refund atas order
  MANUAL_GRANT       // grant manual oleh admin/organizer
}
```

### 2.2 Field Explanation

| Field | Type | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `userId` | String | Foreign key ke user (many-to-one) |
| `code` | String | Unique coupon code (e.g., "REF_abc123", "REFUND_xyz789") |
| `source` | Enum | Asal coupon (tracking purpose) |
| `amount` | Int | Nominal diskon dalam IDR |
| `usedAt` | DateTime | Kapan coupon used/expired. Null jika belum dipakai. Set ke NOW() jika digunakan atau saat expired |
| `expiresAt` | DateTime | Hard deadline coupon |
| `createdAt` | DateTime | Dibuat kapan |
| `updatedAt` | DateTime | Terakhir diupdate |

### 2.3 Validity Check

**Coupon Valid jika:**
```sql
usedAt IS NULL AND expiresAt > NOW()
```

**Coupon Invalid jika:**
```sql
usedAt IS NOT NULL OR expiresAt <= NOW()
```

### 2.4 Lifecycle

**Coupon Created:**
- Saat user register via referral: 1 coupon dengan `source=REFERRAL_SIGNUP`, `expiresAt=now+3mo`
- Saat refund order: coupon baru dengan `source=ORDER_REFUND`, `expiresAt=now+3mo`
- Saat admin grant manual: coupon dengan `source=MANUAL_GRANT`, `expiresAt=now+3mo`
- Saat event promotion campaign: coupon dengan `source=EVENT_PROMOTION`, `expiresAt=campaign_end_date`

**Coupon Used:**
- User apply coupon di transaksi → `usedAt` di-set ke NOW()
- Coupon **tidak bisa dipakai lagi** after ini

**Coupon Expired:**
- Jika `expiresAt <= NOW()` dan `usedAt IS NULL`:
  - Cron job daily (23:59 UTC) set `usedAt = NOW()`
  - Coupon marked as inactive (tidak bisa dipakai)
- Di app layer: selalu validasi `expiresAt > NOW()` sebelum pakai

**Coupon Lifecycle Diagram:**
```
[Coupon Created]
    ↓
[usedAt = null, expiresAt = now+3mo]
    ↓
[User applies coupon in transaction]
    ↓
[usedAt = NOW() → coupon dapat't be used again]
    OR
[Expired: usedAt = NOW() (via cron daily)]
```

---

## 3. Expiration Mechanism

### 3.1 Cron Job

**File:** `src/cron/rewardExpirationCron.ts`

**Schedule:** Every day at 23:59 UTC (11:59 PM UTC)

**Tasks:**
```sql
-- Task 1: Reset wallet balance if expired
UPDATE wallets
SET balance = 0
WHERE balance > 0 AND expiresAt <= NOW();

-- Task 2: Mark coupon as used if expired
UPDATE coupons
SET usedAt = NOW()
WHERE usedAt IS NULL AND expiresAt <= NOW();
```

### 3.2 Application Layer Validation

Jangan andalkan cron job untuk real-time check. Always validate di app code:

**Wallet Valid:**
```
balance > 0 AND (expiresAt IS NULL OR expiresAt > NOW())
```

**Coupon Valid:**
```
usedAt IS NULL AND expiresAt > NOW()
```

### 3.3 Expiration Duration

- **Default:** 3 bulan dari saat dikreditkan
- Dihitung saat wallet/coupon dibuat atau saat penambahan balance/coupon baru
- Format: `expiresAt = dayjs().add(3, 'months').toDate()`

---

## 4. Constraints & Rules

### Wallet Constraints

✅ **Wallet CAN be used when:**
- `balance > 0`
- `expiresAt IS NULL OR expiresAt > NOW()`

❌ **Wallet CANNOT be used when:**
- `balance = 0`
- `expiresAt <= NOW()` (expired)

📌 **Deduction Rules:**
- Hanya boleh kurangi hingga `balance` yang ada (tidak boleh minus)
- Jika request kurangi > balance, hanya kurangi sebesar balance
- Setiap kurangi balance → reset `expiresAt = now + 3 months`

### Coupon Constraints

✅ **Coupon CAN be used when:**
- `usedAt IS NULL` (belum pernah dipakai)
- `expiresAt > NOW()` (belum expired)

❌ **Coupon CANNOT be used when:**
- `usedAt IS NOT NULL` (sudah pernah dipakai)
- `expiresAt <= NOW()` (expired)

📌 **Usage Rules:**
- Saat dipakai → `usedAt` di-set ke NOW() (immediately marked used)
- Tidak bisa partial (harus full nominal)
- Tidak bisa reuse

---

## 5. Common Operations

### Get User Wallet
```sql
SELECT * FROM wallets 
WHERE userId = ?
AND (expiresAt IS NULL OR expiresAt > NOW())
```

**Note:** Jika expiresAt <= NOW(), treat sebagai expired (balance = 0).

### Get User Active Coupons
```sql
SELECT * FROM coupons
WHERE userId = ?
AND usedAt IS NULL
AND expiresAt > NOW()
```

### Get User All Coupons
```sql
SELECT * FROM coupons
WHERE userId = ?
ORDER BY createdAt DESC
```

### Update Wallet Balance
```typescript
// Saat deduction:
UPDATE wallets
SET balance = balance - deductionAmount,
    expiresAt = NOW() + INTERVAL '3 months'
WHERE userId = ? AND balance >= deductionAmount;

// Saat refund/grant:
UPDATE wallets
SET balance = balance + refundAmount,
    expiresAt = NOW() + INTERVAL '3 months'
WHERE userId = ?;
```

### Mark Coupon Used
```typescript
UPDATE coupons
SET usedAt = NOW()
WHERE id = ? AND usedAt IS NULL AND expiresAt > NOW();
```

### Expire Wallet (Cron)
```typescript
UPDATE wallets
SET balance = 0
WHERE balance > 0 AND expiresAt <= NOW();
```

### Expire Coupon (Cron)
```typescript
UPDATE coupons
SET usedAt = NOW()
WHERE usedAt IS NULL AND expiresAt <= NOW();
```

---

## 6. Referral Integration

**Saat user register dengan referral code:**

1. **Validator checks:** Referrer exists & not self-referral
2. **Wallet creation:** 
   - New user: `balance = 10000`, `expiresAt = now + 3mo`
3. **Coupon creation:**
   - New user: `source = REFERRAL_SIGNUP`, `amount = 0` (or follow business logic)
   - Referrer: wallet balance += 10000, `expiresAt = now + 3mo`

---

## 7. Refund Integration

**Saat transaksi di-reject/refund:**

1. **Wallet Restoration:**
   - User wallet: `balance += appliedWalletAmount`
   - Reset: `expiresAt = now + 3mo`

2. **Coupon Restoration:**
   - Original coupon: tetap marked `usedAt = NOW()` (tidak di-revert)
   - New refund coupon created: `source = ORDER_REFUND`, `amount = appliedCouponAmount`, `expiresAt = now + 3mo`

**Why separate coupon?** Untuk audit trail dan tracking refund coupons vs original coupons.

---

## 8. Best Practices

✅ **DO:**
- Always validate expiration in app layer (don't just trust DB)
- Reset `expiresAt = now + 3mo` setiap kali balance changed
- Use transaction (BEGIN/COMMIT) untuk multi-step updates
- Lock rows saat deduction (FOR UPDATE) untuk prevent race condition
- Create separate refund coupon saat refund (jangan revert original)
- Log semua wallet/coupon mutations untuk audit

❌ **DON'T:**
- Tidak boleh modify `referralCode` atau referrer after registration
- Tidak boleh trust cron job saja untuk real-time expiration check
- Tidak boleh deduct wallet sampai minus
- Tidak boleh reuse coupon after `usedAt` di-set
- Tidak boleh modify original coupon saat refund (buat yang baru)

---

## 9. Data Relationships

```
User (1)
  ↓
  ├─ wallet (1:1)
  └─ coupons (1:many)

users:
  - id (PK)
  - name
  - email
  - role
  - ...

wallets:
  - id (PK)
  - userId (FK, UNIQUE)
  - balance
  - expiresAt

coupons:
  - id (PK)
  - userId (FK)
  - code (UNIQUE)
  - source
  - amount
  - usedAt
  - expiresAt
```

---

## 10. Related Files

- **Prisma Schema:** `backend/prisma/schema.prisma` (models: `wallets`, `coupons`, `users`)
- **Cron Job:** `backend/src/cron/rewardExpirationCron.ts` (daily expiration scheduler)
- **Full Guide:** `backend/docs/wallet-coupon-guide.md`

---

End of documentation. ✨
