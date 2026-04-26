# Organizer Dashboard Backend API Docs

Dokumentasi lengkap endpoint backend untuk Event Management Dashboard (Feature Requirement):
- Dashboard access organizer
- Statistik by year/month/day
- Transaction management (accept/reject + payment proof visibility)
- Email notification saat accept/reject
- Attendee list per event

Dokumen ini juga mencatat perubahan terkait checkout yang dibutuhkan agar rollback reject akurat (wallet/coupon/voucher/seats).

## Base URL dan Auth

- Base URL local: `http://localhost:3000`
- Semua endpoint organizer dashboard butuh JWT access token dan role `EVENT_ORGANIZER`.
- Header wajib:

```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

## Route Group

Semua endpoint organizer dashboard berada di prefix:

- `/organizer/dashboard`

Mount route di server:

- `app.use('/organizer/dashboard', organizerDashboardRoutes)`

## Ringkasan Endpoint Organizer

1. `GET /organizer/dashboard/overview`
2. `GET /organizer/dashboard/events`
3. `PATCH /organizer/dashboard/events/:eventId`
4. `GET /organizer/dashboard/transactions`
5. `POST /organizer/dashboard/transactions/:transactionId/accept`
6. `POST /organizer/dashboard/transactions/:transactionId/reject`
7. `GET /organizer/dashboard/statistics`
8. `GET /organizer/dashboard/events/:eventId/attendees`

---

## 1) Dashboard Overview

### GET `/organizer/dashboard/overview`

Tujuan:
- Ambil metrik ringkas dashboard organizer.

Response `200`:

```json
{
  "message": "Dashboard overview fetched successfully",
  "data": {
    "totalEvents": 12,
    "pendingPaymentVerifications": 3,
    "completedTransactions": 25,
    "totalTicketsSold": 140,
    "totalRevenue": 42000000
  }
}
```

Keterangan:
- `pendingPaymentVerifications` dihitung dari transaksi status `PAID` untuk event milik organizer.
- `completedTransactions` dihitung dari transaksi status `DONE`.
- `totalRevenue` dalam IDR.

---

## 2) List Event Milik Organizer

### GET `/organizer/dashboard/events`

Tujuan:
- Menampilkan daftar event milik organizer untuk dikelola.

Response `200`:

```json
{
  "message": "Organizer events fetched successfully",
  "data": [
    {
      "id": "event-uuid",
      "name": "Anime Fest 2026",
      "price": 250000,
      "totalSeats": 500,
      "availableSeats": 320,
      "event_images": [
        {
          "id": "img-uuid",
          "eventId": "event-uuid",
          "url": "1712000000000-banner.jpg"
        }
      ],
      "_count": {
        "orders": 180
      }
    }
  ]
}
```

---

## 3) Edit Event Organizer

### PATCH `/organizer/dashboard/events/:eventId`

Tujuan:
- Mengedit data event milik organizer.

Validasi body:
- `name?: string`
- `description?: string | null`
- `price?: number` (integer, `>= 0`)
- `totalSeats?: number` (integer, `>= 1`)
- `eventDate?: string(datetime) | null`
- `startTime?: string | null`
- `endTime?: string | null`
- `location?: string | null`
- `city?: string | null`
- `discountType?: "PERCENT" | "FIXED" | null`
- `discountValue?: number | null`
- `discountStart?: string(datetime) | null`
- `discountEnd?: string(datetime) | null`

Contoh request:

```json
{
  "name": "Anime Fest 2026 Updated",
  "price": 275000,
  "totalSeats": 650,
  "city": "Jakarta",
  "discountType": "PERCENT",
  "discountValue": 10,
  "discountStart": "2026-05-01T00:00:00.000Z",
  "discountEnd": "2026-05-10T23:59:59.000Z"
}
```

Response `200`:

```json
{
  "message": "Event updated successfully",
  "data": {
    "id": "event-uuid",
    "name": "Anime Fest 2026 Updated",
    "price": 275000,
    "totalSeats": 650,
    "availableSeats": 470
  }
}
```

Rule penting:
- Organizer hanya bisa update event miliknya.
- `totalSeats` tidak boleh lebih kecil dari kursi yang sudah ter-book.

Error umum:
- `400` jika `totalSeats` < reserved seats
- `404` jika event bukan milik organizer atau tidak ditemukan

---

## 4) Transaction List + Payment Proof

### GET `/organizer/dashboard/transactions`

Tujuan:
- Menampilkan transaksi untuk event organizer, termasuk info user, event, dan payment proof.

Query params:
- `status` (optional): `PENDING | REJECTED | CANCELLED | EXPIRED | DONE | PAID`
- `eventId` (optional): UUID event
- `page` (optional, default `1`)
- `limit` (optional, default `20`, max `100`)

Contoh:

```http
GET /organizer/dashboard/transactions?status=PAID&page=1&limit=10
```

Response `200`:

```json
{
  "message": "Organizer transactions fetched successfully",
  "data": [
    {
      "id": "trx-uuid",
      "status": "PAID",
      "totalAmount": 500000,
      "paymentProof": "1712333333333-proof.jpg",
      "paymentProofUrl": "http://localhost:3000/uploads/1712333333333-proof.jpg",
      "user": {
        "id": "user-uuid",
        "name": "Customer A",
        "email": "customer@example.com"
      },
      "order": {
        "quantity": 2,
        "event": {
          "id": "event-uuid",
          "name": "Anime Fest 2026",
          "city": "Jakarta",
          "eventDate": "2026-06-01T09:00:00.000Z"
        }
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## 5) Accept Transaction

### POST `/organizer/dashboard/transactions/:transactionId/accept`

Tujuan:
- Organizer menerima bukti pembayaran (`PAID` -> `DONE`).

Request body (optional):

```json
{
  "reason": "Pembayaran valid"
}
```

Response `200`:

```json
{
  "message": "Transaction accepted successfully",
  "data": {
    "id": "trx-uuid",
    "status": "DONE",
    "decisionNote": "Pembayaran valid",
    "decisionAt": "2026-04-20T10:00:00.000Z"
  }
}
```

Business behavior:
- Hanya transaksi status `PAID` yang bisa diproses.
- Transaction harus terkait event milik organizer.
- Kirim email notifikasi ke customer (status accepted).

---

## 6) Reject Transaction + Rollback

### POST `/organizer/dashboard/transactions/:transactionId/reject`

Tujuan:
- Organizer menolak pembayaran (`PAID` -> `REJECTED`) dan rollback resource bisnis.

Request body (optional, recommended):

```json
{
  "reason": "Bukti pembayaran tidak valid"
}
```

Response `200`:

```json
{
  "message": "Transaction rejected successfully",
  "data": {
    "id": "trx-uuid",
    "status": "REJECTED",
    "decisionNote": "Bukti pembayaran tidak valid",
    "decisionAt": "2026-04-20T10:05:00.000Z"
  }
}
```

Rollback behavior (dalam SQL transaction):
1. Restore seats event (`availableSeats += order.quantity`)
2. Return wallet points sesuai `walletAmountUsed`
3. Re-activate coupon yang dipakai (`couponCodeUsed`) dengan `usedAt = null`
4. Decrement voucher usage (`voucherCodeUsed`) bila sebelumnya terpakai
5. Reset expiry reward yang dikembalikan ke `now + 3 months`
6. Kirim email notifikasi ke customer (status rejected)

Rule penting:
- Hanya transaksi status `PAID` bisa di-accept/reject.
- Organizer tidak bisa memproses transaksi milik event organizer lain.

---

## 7) Statistics Visualization Data

### GET `/organizer/dashboard/statistics`

Tujuan:
- Menyediakan dataset statistik untuk chart/report by `year`, `month`, atau `day`.

Query params:
- `groupBy`: `year | month | day` (default `month`)
- `year`: wajib jika `groupBy=month` atau `groupBy=day`
- `month`: wajib jika `groupBy=day`

Contoh request:

```http
GET /organizer/dashboard/statistics?groupBy=year
GET /organizer/dashboard/statistics?groupBy=month&year=2026
GET /organizer/dashboard/statistics?groupBy=day&year=2026&month=4
```

Response `200`:

```json
{
  "message": "Organizer statistics fetched successfully",
  "data": {
    "groupBy": "month",
    "year": 2026,
    "month": null,
    "series": [
      {
        "bucket": 1,
        "transactionCount": 5,
        "ticketsSold": 22,
        "revenue": 7200000
      },
      {
        "bucket": 2,
        "transactionCount": 8,
        "ticketsSold": 30,
        "revenue": 9800000
      }
    ]
  }
}
```

Keterangan:
- `bucket` berarti:
  - tahun jika groupBy=year
  - bulan (1..12) jika groupBy=month
  - hari (1..31) jika groupBy=day
- Hanya menghitung transaksi `DONE`.

---

## 8) Attendee List per Event

### GET `/organizer/dashboard/events/:eventId/attendees`

Tujuan:
- Menampilkan attendee untuk event tertentu milik organizer.

Response `200`:

```json
{
  "message": "Attendee list fetched successfully",
  "data": [
    {
      "transactionId": "trx-uuid",
      "customerId": "user-uuid",
      "customerName": "Customer A",
      "customerEmail": "customer@example.com",
      "ticketQuantity": 2,
      "totalPricePaid": 500000,
      "purchasedAt": "2026-04-18T09:20:00.000Z"
    }
  ]
}
```

Keterangan:
- Data attendee diambil dari order dengan transaksi status `DONE`.
- Event harus milik organizer yang login.

---

## Error Responses Umum

### 401 Unauthorized

```json
{
  "message": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "message": "Forbidden. You do not have permission to access this resource."
}
```

### 404 Not Found

```json
{
  "message": "Event not found or not owned by organizer"
}
```

atau

```json
{
  "message": "Transaction not found"
}
```

### 400 Validation/Business Rule Error

```json
{
  "message": "Only PAID transactions can be accepted or rejected"
}
```

atau format zod middleware:

```json
{
  "message": "Validation failed",
  "errors": {
    "year": ["year is required when groupBy=month"]
  }
}
```

---

## Email Notification (Accept/Reject)

Saat organizer memproses transaksi accept/reject, backend mengirim email ke customer menggunakan Nodemailer + Handlebars template.

Template:
- `src/templates/emails/transaction-status.hbs`

Subject:
- Accept: `Pembayaran kamu sudah diterima`
- Reject: `Pembayaran kamu ditolak`

Data yang dikirim ke template:
- `name`
- `eventName`
- `transactionId`
- `totalAmount`
- `status` (`ACCEPTED` / `REJECTED`)
- `reason` (opsional)
- `supportEmail`

---

## Update Endpoint Existing Terkait Dashboard Requirement

Selain endpoint baru di `/organizer/dashboard`, ada update behavior endpoint existing:

1. `POST /checkout`
- Sekarang mendukung input tambahan: `couponCode`, `walletAmount`.
- Menyimpan metadata transaksi untuk rollback reject:
  - `walletAmountUsed`
  - `couponCodeUsed`
  - `couponDiscountUsed`
  - `voucherCodeUsed`
  - `voucherDiscountUsed`

2. `GET /admin/transactions`
- Filter transaksi `PAID` kini dibatasi ke event milik organizer yang login.

3. `POST /admin/transactions/:id/approve`
4. `POST /admin/transactions/:id/reject`
- Kini menggunakan service decision yang sama dengan organizer dashboard (ownership check + rollback + email), agar konsisten.

---

## Contoh cURL

### Overview

```bash
curl -X GET "http://localhost:3000/organizer/dashboard/overview" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Transactions PAID page 1

```bash
curl -X GET "http://localhost:3000/organizer/dashboard/transactions?status=PAID&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Accept Transaction

```bash
curl -X POST "http://localhost:3000/organizer/dashboard/transactions/TRX_ID/accept" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Pembayaran valid"
  }'
```

### Reject Transaction

```bash
curl -X POST "http://localhost:3000/organizer/dashboard/transactions/TRX_ID/reject" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Bukti pembayaran tidak valid"
  }'
```

### Statistics by day

```bash
curl -X GET "http://localhost:3000/organizer/dashboard/statistics?groupBy=day&year=2026&month=4" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Attendee list

```bash
curl -X GET "http://localhost:3000/organizer/dashboard/events/EVENT_ID/attendees" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Checklist Requirement Coverage

- Dashboard Access: done
- Statistics Visualization data (year/month/day): done
- Transaction Management (view payment proof, accept, reject): done
- Notification email accept/reject: done
- Reject rollback: seats + wallet/points + coupon + voucher: done
- Attendee list (name, quantity, total price): done
