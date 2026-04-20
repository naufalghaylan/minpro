# Frontend Documentation - Feature 2 Organizer Dashboard

Dokumen ini merangkum implementasi frontend yang sudah dibuat untuk requirement Event Management Dashboard dan integrasi auth yang mendukungnya.

## 1. Tujuan dan Scope

Tujuan implementasi:
- Memberikan dashboard khusus organizer untuk mengelola event, transaksi, statistik, dan attendee.
- Menjaga frontend tetap konsisten dengan kontrak API backend pada prefix `/organizer/dashboard`.
- Menyediakan route protection berbasis login dan role organizer.

Scope requirement yang sudah dicakup:
- Dashboard Access
- Statistics Visualization (year/month/day)
- Transaction Management (view payment proof, accept, reject)
- Notification Emails (via backend trigger saat accept/reject)
- Rollback awareness (seat, points/wallet, coupon, voucher saat reject)
- Attendee List (nama, email, qty ticket, total bayar)

Catatan penting:
- Pengiriman email dan rollback terjadi di backend. Frontend men-trigger endpoint decision dan menampilkan status hasil.

## 2. Ringkasan Arsitektur Frontend

Stack yang dipakai:
- React + TypeScript + React Router
- Zustand untuk auth state
- Axios untuk HTTP client
- React Hook Form + Zod untuk validasi form edit event
- Recharts untuk visualisasi statistik

Pola integrasi data:
- Semua endpoint organizer dashboard dibungkus dalam API module typed.
- Halaman dashboard memakai satu page utama berbasis tab internal.
- Semua action penting menampilkan loading, success, dan error state.

## 3. File yang Ditambahkan atau Diubah

### File baru
- `src/types/organizer-dashboard.ts`
  - Menyimpan type contract untuk overview, events, transactions, statistics, dan attendees.

- `src/api/organizer-dashboard.ts`
  - API helper typed untuk seluruh endpoint organizer dashboard.

- `src/components/RequireRole.tsx`
  - Guard role berbasis daftar role yang diperbolehkan.

- `src/pages/OrganizerDashboardPage/OrganizerDashboardPage.tsx`
  - Halaman dashboard organizer utama dengan tab:
    - Overview
    - Manage Events
    - Transactions
    - Statistics
    - Attendee List

### File existing yang diperbarui
- `src/App.tsx`
  - Menambah route dashboard organizer dan membungkus dengan `RequireAuth` + `RequireRole`.

- `src/components/navbar.tsx`
  - Menambah/menyesuaikan link organizer ke halaman dashboard baru.

- `package.json`
  - Menambah dependency `recharts`.
  - Memastikan `axios` dipin ke `1.13.6`.

## 4. Route dan Proteksi Akses

Route baru:
- `/organizer/dashboard`

Proteksi yang dipakai:
1. `RequireAuth`
   - Wajib login (user + token tersedia).
2. `RequireRole allow={["EVENT_ORGANIZER"]}`
   - Hanya role organizer yang bisa mengakses dashboard.

Jika role tidak sesuai:
- User diarahkan ke `/`.

## 5. Endpoint API yang Terintegrasi

Semua endpoint berikut sudah terintegrasi di frontend:

1. `GET /organizer/dashboard/overview`
2. `GET /organizer/dashboard/events`
3. `PATCH /organizer/dashboard/events/:eventId`
4. `GET /organizer/dashboard/transactions`
5. `POST /organizer/dashboard/transactions/:transactionId/accept`
6. `POST /organizer/dashboard/transactions/:transactionId/reject`
7. `GET /organizer/dashboard/statistics`
8. `GET /organizer/dashboard/events/:eventId/attendees`

Filter/query yang digunakan:
- Transactions:
  - `status`
  - `eventId`
  - `page`
  - `limit`
- Statistics:
  - `groupBy` (`year`, `month`, `day`)
  - `year` (required pada month/day)
  - `month` (required pada day)

## 6. Detail Implementasi per Modul

### 6.1 Overview Tab

Data yang ditampilkan:
- Total events
- Pending payment verifications
- Completed transactions
- Total tickets sold
- Total revenue (IDR)

Sumber data:
- Endpoint overview

Perilaku:
- Tampil skeleton/loading sederhana saat fetch pertama.
- Tetap bisa refresh manual melalui tombol `Refresh Data`.

### 6.2 Manage Events Tab

Fitur:
- List event milik organizer
- Menampilkan ringkas informasi event
- Edit event via modal form

Form edit event mencakup:
- name, description
- price, totalSeats
- eventDate, startTime, endTime
- location, city
- discountType, discountValue, discountStart, discountEnd

Validasi:
- Menggunakan Zod melalui React Hook Form.
- Rule penting:
  - nama event minimal 3 karakter
  - price angka valid
  - totalSeats minimal 1
  - saat discountType bukan NONE, discountValue/start/end wajib valid

Kesesuaian backend rule:
- Rule `totalSeats tidak boleh kurang dari reserved seats` diverifikasi backend.
- Frontend menampilkan pesan error backend jika gagal update.

### 6.3 Transactions Tab

Fitur utama:
- List transaksi organizer
- Filter status dan event
- Pagination
- View payment proof image
- Accept/Reject untuk transaksi status `PAID`
- Catatan reason opsional

Decision action:
- Accept memanggil endpoint accept
- Reject memanggil endpoint reject

Setelah action sukses:
- Refetch overview
- Refetch transaksi
- Refetch attendee list
- Tampilkan feedback sukses kepada user

Catatan bisnis penting di UI:
- Pada reject, UI menampilkan info bahwa rollback resource dilakukan backend (seat/wallet/coupon/voucher).

### 6.4 Statistics Tab

Fitur:
- Pilih agregasi `year`, `month`, `day`
- Input filter tahun/bulan sesuai kebutuhan query
- Render chart batang (Recharts)

Series yang ditampilkan:
- transactionCount
- ticketsSold
- revenue

Perilaku:
- Tampil empty state saat series kosong.
- Revenue diformat ke IDR pada tooltip.

### 6.5 Attendee List Tab

Fitur:
- Pilih event organizer
- Load daftar attendee event

Data yang ditampilkan:
- Nama customer
- Email customer
- Qty ticket
- Total dibayar
- Tanggal pembelian

Sumber data:
- Endpoint attendees per event

## 7. State Management dan Error Handling

State utama pada page dashboard:
- `loading` terpisah per modul (overview/events/transactions/statistics/attendees)
- `globalMessage` untuk success/error notice
- `transactionActionLoadingId` untuk disable tombol action per transaksi
- state filter query transaksi dan statistik

Error handling:
- Error Axios diparsing ke message backend jika tersedia.
- Fallback generic message jika response tidak memiliki `message`.

Format uang dan tanggal:
- Uang: `Intl.NumberFormat('id-ID', { currency: 'IDR' })`
- Tanggal: `Intl.DateTimeFormat('id-ID')`

## 8. Integrasi Auth yang Mendukung Dashboard

Agar dashboard organizer stabil, flow auth yang sudah dipakai frontend:
- Access token disimpan di localStorage
- Refresh token disimpan di localStorage
- Axios interceptor melakukan refresh otomatis saat 401 (kecuali endpoint auth tertentu)
- Auth bootstrap memulihkan sesi lewat refresh token jika access token hilang/expired
- Logout membersihkan access token dan refresh token

Dampak ke dashboard:
- Session organizer lebih stabil saat token access expire.
- Pengguna tidak langsung terlempar ke login selama refresh token valid.

## 9. Checklist QA Manual (Frontend)

### Access dan role
- [ ] Login sebagai organizer bisa akses `/organizer/dashboard`
- [ ] Login sebagai customer tidak bisa akses dashboard organizer

### Overview
- [ ] Metric muncul sesuai data backend
- [ ] Tombol refresh bekerja

### Manage events
- [ ] Daftar event tampil
- [ ] Edit event sukses mengubah data
- [ ] Validasi form menolak input tidak valid
- [ ] Error backend tampil jika melanggar business rule

### Transactions
- [ ] Filter status bekerja
- [ ] Filter event bekerja
- [ ] Pagination bekerja
- [ ] Payment proof dapat dilihat
- [ ] Accept mengubah status transaksi
- [ ] Reject mengubah status transaksi
- [ ] Pesan sukses reject menyebut rollback by backend

### Statistics
- [ ] Group by year menampilkan chart
- [ ] Group by month (dengan year) menampilkan chart
- [ ] Group by day (dengan year+month) menampilkan chart
- [ ] Empty state muncul saat data kosong

### Attendees
- [ ] Pilih event lalu attendee list tampil
- [ ] Data nama, email, qty, total, tanggal valid

## 10. Batasan Saat Ini dan Saran Lanjutan

Batasan saat ini:
- Dashboard dibuat sebagai satu halaman besar dengan tab internal.
- Chart sudah fungsional namun belum ada fitur export report.
- Build menunjukkan warning ukuran chunk besar (belum code-splitting per halaman dashboard).

Saran lanjutan:
1. Pecah dashboard menjadi lazy-loaded modules per tab agar bundle lebih kecil.
2. Tambah export CSV untuk transaksi dan attendee.
3. Tambah retry UX lebih detail pada error jaringan.
4. Jika dibutuhkan, migrasi server-state ke React Query untuk caching/refetch yang lebih terstruktur.

## 11. Kesimpulan

Implementasi frontend saat ini sudah memenuhi requirement inti Event Management Dashboard untuk organizer, selaras dengan API backend yang sudah didokumentasikan, dan siap dipakai sebagai baseline pengembangan lanjutan.
