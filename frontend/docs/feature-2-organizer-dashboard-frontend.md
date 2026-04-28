# Frontend Documentation - Feature 2 Organizer Dashboard

Dokumen ini menjelaskan implementasi organizer dashboard frontend setelah refactor modular selesai, termasuk pembagian file, alur data, transisi antar-tab, dan catatan stabilitas loading.

## 1. Tujuan dan Scope

Tujuan implementasi:
- Menyediakan dashboard organizer untuk mengelola event, transaksi, statistik, attendee, dan rating.
- Menjaga integrasi frontend tetap sesuai kontrak API backend.
- Menjaga codebase mudah dirawat dengan arsitektur modular (hook + komponen per tab).

Scope yang dicakup:
- Dashboard access untuk role organizer.
- Overview KPI dashboard.
- Manage events + modal edit event.
- Transaction management (proof, accept/reject, countdown keputusan).
- Statistics visualization (`year`, `month`, `day`).
- Attendee list per event.
- Ratings tab organizer.

## 2. Ringkasan Arsitektur

Stack:
- React + TypeScript + React Router.
- Zustand (auth state).
- Axios (HTTP client).
- React Hook Form + Zod (form edit event).
- Recharts (grafik statistik).

Pola integrasi:
- Endpoint organizer dashboard tetap berada di module API typed (`src/api/organizer-dashboard.ts`).
- State data dipusatkan ke custom hook `useOrganizerDashboardData`.
- UI dipisah ke komponen per tab + komponen modal.
- Page utama menjadi orchestration layer: state lintas-tab, callback action, dan transisi tab.

## 3. Struktur File Saat Ini

### Page Orchestrator
- `src/pages/OrganizerDashboardPage/OrganizerDashboardPage.tsx`
  - Mengelola active tab, filter utama, action decision transaksi, refresh global, dan transisi tab.

### Hook Data
- `src/pages/OrganizerDashboardPage/hooks/useOrganizerDashboardData.ts`
  - Mengelola fetch overview, events, transactions, statistics, attendees, ratings.
  - Menyimpan loading state per domain data.
  - Menggunakan mounted guard untuk mencegah update state saat unmount (anti memory leak warning).

### Komponen Presentasional
- `src/pages/OrganizerDashboardPage/components/OverviewTab.tsx`
- `src/pages/OrganizerDashboardPage/components/EventsTab.tsx`
- `src/pages/OrganizerDashboardPage/components/TransactionsTab.tsx`
- `src/pages/OrganizerDashboardPage/components/StatisticsTab.tsx`
- `src/pages/OrganizerDashboardPage/components/AttendeesTab.tsx`
- `src/pages/OrganizerDashboardPage/components/RatingsTab.tsx`
- `src/pages/OrganizerDashboardPage/components/EditEventModal.tsx`

### Shared Helper Lokal Halaman
- `src/pages/OrganizerDashboardPage/constants.ts`
- `src/pages/OrganizerDashboardPage/types.ts`
- `src/pages/OrganizerDashboardPage/schema.ts`
- `src/pages/OrganizerDashboardPage/utils.ts`

## 4. Route dan Proteksi Akses

Route:
- `/organizer/dashboard`

Proteksi:
1. `RequireAuth`
2. `RequireRole allow={["EVENT_ORGANIZER"]}`

## 5. Endpoint API yang Dipakai

Endpoint:
1. `GET /organizer/dashboard/overview`
2. `GET /organizer/dashboard/events`
3. `PATCH /organizer/dashboard/events/:eventId`
4. `GET /organizer/dashboard/transactions`
5. `POST /organizer/dashboard/transactions/:transactionId/accept`
6. `POST /organizer/dashboard/transactions/:transactionId/reject`
7. `GET /organizer/dashboard/statistics`
8. `GET /organizer/dashboard/events/:eventId/attendees`
9. `GET /api/ratings/organizer` dengan fallback `GET /ratings/organizer`

Filter/query:
- Transactions: `status`, `eventId`, `page`, `limit`.
- Statistics: `groupBy`, `year` (month/day mode), `month` (day mode), `eventId`.

## 6. Detail Implementasi

### 6.1 Overview
- Menampilkan KPI utama organizer.
- Mendukung loading state data + skeleton transisi tab.

### 6.2 Manage Events
- List event organizer.
- Edit event via modal terpisah (`EditEventModal`).
- Validasi form pakai Zod + React Hook Form.

### 6.3 Transactions
- Filter status/event, pagination, dan preview payment proof.
- Accept/reject transaksi `PAID` + catatan opsional.
- Countdown keputusan 48 jam dari `paidAt`.

### 6.4 Statistics
- Group by `year/month/day`.
- Render 3 series (`revenue`, `ticketsSold`, `transactionCount`).
- Series kosong untuk month/year di-normalisasi agar axis stabil.

### 6.5 Attendees
- Select event lalu load attendee list.
- Menampilkan nama, email, qty, total dibayar, tanggal pembelian.

### 6.6 Ratings
- Menampilkan daftar review dan average rating organizer.
- Data ratings masih memakai endpoint fallback untuk kompatibilitas kontrak backend yang belum final.

## 7. Transisi Tab, Skeleton, dan Stagger

Saat pindah tab, UI memakai tiga lapis transisi:
1. `isTabSkeletonVisible`: skeleton transisi ditampilkan singkat untuk perpindahan antar-tab.
2. `isTabContentVisible`: konten tab fade/blur in-out agar perpindahan tidak kasar.
3. `shouldStaggerTabContent`: item dalam tab muncul dengan stagger delay (`dashboard-stagger-0` s/d `dashboard-stagger-5`).

Catatan:
- Skeleton transisi tab berbeda dengan loading data API.
- Jika data API belum siap, komponen tab tetap menampilkan loading state domain masing-masing.

## 8. Stabilitas dan Perbaikan Bug

Perbaikan yang sudah diterapkan:
- Memory leak warning: hook data menahan update state ketika komponen sudah unmount.
- Infinite loading/skeleton stuck: mounted guard disesuaikan agar aman pada siklus mount/unmount React Strict Mode.
- Flicker transisi: state transisi tab diatur agar skeleton hanya muncul saat pindah tab, bukan karena refresh data biasa.

## 9. Checklist QA Manual

### Access
- [ ] Organizer bisa akses `/organizer/dashboard`.
- [ ] Non-organizer tidak bisa akses route dashboard organizer.

### Data dan Action
- [ ] Overview KPI tampil sesuai data backend.
- [ ] Edit event berhasil dan validasi bekerja.
- [ ] Accept/reject transaksi bekerja dan message sesuai.
- [ ] Statistics chart tampil sesuai filter.
- [ ] Attendee list tampil sesuai event terpilih.
- [ ] Ratings tab menampilkan data dan average rating.

### UX Transisi
- [ ] Pindah tab menampilkan skeleton transisi singkat.
- [ ] Konten tab baru muncul dengan stagger halus.
- [ ] Tidak ada flicker agresif saat tab switch cepat.

### Stabilitas
- [ ] Tidak ada warning update state after unmount di console.
- [ ] Loading tidak stuck pada skeleton saat data berhasil diambil.

## 10. Batasan Saat Ini dan Saran Lanjutan

Batasan saat ini:
- Ratings masih pakai fallback endpoint sementara.
- Belum ada export CSV/report.
- Belum ada code splitting route-level per tab dashboard.

Saran lanjutan:
1. Finalisasi endpoint ratings ke satu kontrak tetap dan pindahkan ke API typed module.
2. Tambahkan request cancellation (`AbortController`) untuk fetch yang cepat berganti filter/tab.
3. Tambahkan test komponen untuk tiap tab (render + interaction).
4. Pertimbangkan React Query bila butuh cache/refetch policy lebih terstruktur.

## 11. Kesimpulan

Refactor organizer dashboard frontend sudah selesai ke arsitektur modular. Perilaku bisnis tetap sama, namun maintainability meningkat, pemisahan tanggung jawab lebih jelas, dan UX perpindahan tab sudah ditingkatkan dengan skeleton + stagger transition.
