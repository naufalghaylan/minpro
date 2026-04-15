# Wallet & Coupon API Reference

Dokumen ini khusus untuk pemanggilan API wallet dan coupon yang dibutuhkan saat integrasi transaksi.

## Base URL

- Local: `http://localhost:3000`
- Auth header: `Authorization: Bearer <JWT_TOKEN>`
- Content-Type untuk request body: `application/json`

## Wallet APIs

### 1. Get My Wallet

Endpoint:
- `GET /users/me/wallet`

Kebutuhan auth:
- JWT user login

Tujuan:
- Ambil saldo wallet aktif user yang sedang login.

Contoh response `200`:

```json
{
  "message": "Wallet fetched successfully",
  "data": {
    "id": "wallet-uuid",
    "userId": "user-uuid",
    "balance": 100000,
    "expiresAt": "2026-07-15T10:00:00.000Z",
    "createdAt": "2026-04-15T10:00:00.000Z",
    "updatedAt": "2026-04-15T10:00:00.000Z"
  }
}
```

Catatan pemakaian:
- Wallet dianggap bisa dipakai jika `balance > 0` dan `expiresAt` belum lewat.
- Nilai nominal menggunakan IDR (integer).

Error umum:
- `401` unauthorized (token tidak valid / tidak ada)
- `404` wallet tidak ditemukan

## Coupon APIs

### 2. Get My Active Coupons

Endpoint:
- `GET /users/me/coupons?status=active`

Kebutuhan auth:
- JWT user login

Tujuan:
- Ambil daftar coupon yang masih bisa dipakai (`usedAt = null` dan `expiresAt > now`).

Query params:
- `status` (opsional): `active` | `used` | `all`
- `limit` (opsional): default backend
- `offset` (opsional): default backend

Contoh response `200`:

```json
{
  "message": "Coupons fetched successfully",
  "data": [
    {
      "id": "coupon-uuid-1",
      "userId": "user-uuid",
      "code": "REF_ABC123",
      "source": "REFERRAL_SIGNUP",
      "amount": 50000,
      "usedAt": null,
      "expiresAt": "2026-07-20T10:00:00.000Z",
      "createdAt": "2026-04-20T10:00:00.000Z",
      "updatedAt": "2026-04-20T10:00:00.000Z"
    }
  ]
}
```

Catatan pemakaian:
- Gunakan `id` coupon untuk dikirim ke API transaksi.
- Jangan kirim `code` sebagai identifier utama ke endpoint transaksi jika backend mengharapkan `couponId`.

Error umum:
- `401` unauthorized

## API yang dipanggil saat checkout (hanya referensi endpoint)

Bagian ini hanya daftar endpoint yang biasanya dipanggil UI saat user checkout, tanpa flow implementasi.

### 3. Buat transaksi

Endpoint:
- `POST /transactions`

Body minimal:

```json
{
  "eventId": "event-uuid",
  "quantity": 2,
  "applyWalletAmount": 50000,
  "applyCouponId": "coupon-uuid"
}
```

Keterangan field wallet/coupon:
- `applyWalletAmount` opsional
- `applyCouponId` opsional

### 4. Verifikasi transaksi (organizer)

Endpoint:
- `POST /transactions/:id/verify`

Body:

```json
{
  "status": "APPROVED"
}
```

atau

```json
{
  "status": "REJECTED",
  "rejectionReason": "Bukti pembayaran tidak valid"
}
```

## Validasi data wallet dan coupon di client

Sebelum kirim request transaksi, client sebaiknya cek:

1. Wallet:
- `balance > 0`
- `expiresAt` belum lewat
- `applyWalletAmount >= 0`

2. Coupon:
- coupon ada di hasil `GET /users/me/coupons?status=active`
- `usedAt` masih `null`
- `expiresAt` belum lewat

## cURL cepat

### Get wallet

```bash
curl http://localhost:3000/users/me/wallet \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get active coupons

```bash
curl "http://localhost:3000/users/me/coupons?status=active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Post transaksi dengan wallet + coupon

```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "eventId": "12345678-1234-1234-1234-123456789012",
    "quantity": 2,
    "applyWalletAmount": 50000,
    "applyCouponId": "87654321-4321-4321-4321-210987654321"
  }'
```

## Ringkas endpoint

- `GET /users/me/wallet`
- `GET /users/me/coupons?status=active`
- `POST /transactions`
- `POST /transactions/:id/verify`
