# Frontend Documentation - Feature 2 Organizer Dashboard

Dokumen ini menjelaskan implementasi organizer dashboard pada frontend, termasuk contract API yang dipakai page saat ini, state yang masih hidup di satu file, dan peta refactor supaya page besar bisa dipecah tanpa kehilangan perilaku.

## 1. Tujuan dan Scope

Tujuan implementasi:
- Memberikan dashboard khusus organizer untuk mengelola event, transaksi, statistik, attendee, dan rating/review.
- Menjaga frontend tetap konsisten dengan contract API backend dan auth guard yang sudah ada.
- Menjadi baseline yang aman untuk refactor bertahap ke beberapa komponen dan modul yang lebih kecil.

Scope requirement yang dicakup:
- Dashboard access untuk role organizer.
- Overview KPI dashboard.
- Manage events dengan modal edit.
- Transaction management dengan payment proof, accept, reject, dan countdown keputusan.
- Statistics visualization untuk `year`, `month`, dan `day`.
- Attendee list per event.
- Ratings tab untuk melihat ulasan organizer.

Catatan penting:
- Email notifikasi dan rollback bisnis untuk reject transaksi tetap terjadi di backend.
- Frontend hanya memicu action, menampilkan status hasil, dan melakukan refetch data yang terdampak.

## 2. Ringkasan Arsitektur Frontend

Stack yang dipakai:
- React + TypeScript + React Router.
- Zustand untuk auth state.
- Axios untuk HTTP client.
- React Hook Form + Zod untuk validasi form edit event.
- Recharts untuk visualisasi statistik.

Pola integrasi data:
- Endpoint organizer dashboard dibungkus dalam module API typed.
- `OrganizerDashboardPage` saat ini masih menjadi satu container besar dengan tab internal.
- Action penting memakai loading, success, dan error state yang terpisah.

## 3. File yang Terlibat

### File utama
- `src/pages/OrganizerDashboardPage/OrganizerDashboardPage.tsx`
  - Container utama dashboard organizer.
  - Menyimpan state overview, events, transactions, statistics, attendees, dan ratings.
  - Mengelola tab switching, modal edit event, filter query, dan refresh data.

### File pendukung yang harus tetap sinkron saat refactor
- `src/api/organizer-dashboard.ts`
  - API helper typed untuk overview, events, transactions, statistics, attendees, dan update event.

- `src/types/organizer-dashboard.ts`
  - Type contract untuk semua data dashboard.

- `src/components/RequireRole.tsx`
  - Guard role untuk membatasi akses dashboard organizer.

- `src/components/navbar.tsx`
  - Entry point navigasi ke dashboard organizer.

- `src/App.tsx`
  - Routing dashboard organizer dan proteksi akses.

## 4. Route dan Proteksi Akses

Route baru:
- `/organizer/dashboard`

Proteksi yang dipakai:
1. `RequireAuth`
   - Wajib login dan token tersedia.
2. `RequireRole allow={["EVENT_ORGANIZER"]}`
   - Hanya role organizer yang bisa mengakses dashboard.

Jika role tidak sesuai:
- User diarahkan ke halaman utama atau halaman yang sudah ditentukan guard aplikasi.

## 5. Endpoint API yang Dipakai Halaman Ini

Endpoint yang sudah dipakai oleh page saat ini:
1. `GET /organizer/dashboard/overview`
2. `GET /organizer/dashboard/events`
3. `PATCH /organizer/dashboard/events/:eventId`
4. `GET /organizer/dashboard/transactions`
5. `POST /organizer/dashboard/transactions/:transactionId/accept`
6. `POST /organizer/dashboard/transactions/:transactionId/reject`
7. `GET /organizer/dashboard/statistics`
8. `GET /organizer/dashboard/events/:eventId/attendees`
9. `GET /api/ratings/organizer` atau fallback `GET /ratings/organizer`

Catatan untuk ratings:
- Page saat ini mencoba dua endpoint karena contract backend belum dipastikan stabil di frontend.
- Jika backend sudah memfinalkan satu path, fallback ini sebaiknya dihapus saat refactor.

Filter dan query yang digunakan:
- Transactions:
  - `status`
  - `eventId`
  - `page`
  - `limit`
- Statistics:
  - `groupBy` (`year`, `month`, `day`)
  - `year` untuk mode `month` dan `day`
  - `month` untuk mode `day`

## 6. Detail Implementasi Saat Ini

### 6.1 Overview Tab

Data yang ditampilkan:
- Total event.
- Pending payment verifications.
- Completed transactions.
- Total tickets sold.
- Total revenue dalam IDR.

Perilaku:
- Skeleton tampil saat fetch pertama.
- Tersedia tombol refresh manual yang memanggil ulang overview, events, transactions, statistics, dan attendees.

### 6.2 Manage Events Tab

Fitur:
- List event milik organizer.
- Menampilkan ringkasan event per kartu.
- Edit event lewat modal form.

Field form edit event:
- `name`, `description`
- `price`, `totalSeats`
- `eventDate`, `startTime`, `endTime`
- `location`, `city`
- `discountType`, `discountValue`, `discountStart`, `discountEnd`

Validasi:
- React Hook Form + Zod.
- Nama event minimal 3 karakter.
- Harga dan total seats harus angka.
- `totalSeats` minimal 1.
- Saat `discountType` bukan `NONE`, nilai diskon dan rentang tanggal diskon wajib ada.

Catatan business rule:
- Kalau update event melanggar rule backend, frontend hanya menampilkan pesan error backend.
- UI tidak mencoba mengakali constraint seat atau diskon.

### 6.3 Transactions Tab

Fitur utama:
- List transaksi organizer.
- Filter status dan event.
- Pagination.
- Preview payment proof image.
- Accept atau reject untuk transaksi dengan status `PAID`.
- Catatan reason opsional.

Perilaku action:
- Accept memanggil endpoint accept dan menampilkan pesan sukses.
- Reject memanggil endpoint reject dan menampilkan pesan sukses yang menjelaskan rollback dilakukan backend.
- Setelah action sukses, page refetch overview, transaksi, dan attendee list.

Countdown keputusan:
- UI menghitung sisa waktu keputusan 48 jam dari `paidAt`.
- Countdown di-update setiap detik selama page aktif.

### 6.4 Statistics Tab

Fitur:
- Pilih agregasi `year`, `month`, atau `day`.
- Input tahun dan bulan mengikuti mode yang dipilih.
- Render chart batang dengan Recharts.

Series yang ditampilkan:
- `transactionCount`
- `ticketsSold`
- `revenue`

Perilaku:
- Data kosong menampilkan empty state.
- Saat mode `year` dan `month`, series yang hilang diisi nol agar axis tetap stabil.
- Revenue diformat ke IDR pada tooltip.

### 6.5 Attendee List Tab

Fitur:
- Pilih event organizer.
- Load daftar attendee event.

Data yang ditampilkan:
- Nama customer.
- Email customer.
- Qty ticket.
- Total dibayar.
- Tanggal pembelian.

### 6.6 Ratings Tab

Fitur:
- Menampilkan daftar rating/review organizer.
- Menampilkan rata-rata rating.
- Menampilkan nama user, nama event, tanggal review, rating bintang, dan komentar.

Catatan implementasi:
- Karena contract endpoint ratings belum dimasukkan ke module API typed, tab ini masih memakai request langsung dari page.
- Ini kandidat utama untuk dipindahkan ke module terpisah saat refactor.

## 7. State Management dan Helper Lokal yang Perlu Dipertahankan

State utama di page saat ini:
- `activeTab`
- `overview`, `events`, `transactions`, `statistics`, `attendees`, `ratings`
- loading state per modul
- filter transaksi dan statistik
- selected event untuk attendee/statistics
- `decisionReasonById`
- `transactionActionLoadingId`
- `globalMessage`
- state animasi page/tab

Helper lokal yang dipakai page:
- Format IDR.
- Format tanggal dan jam.
- Konversi `datetime-local` ke ISO.
- Parsing error Axios.
- Countdown 48 jam untuk transaksi `PAID`.

Implikasi refactor:
- Helper format dan error handling sebaiknya dipindah ke utility shared.
- State tab-specific sebaiknya dipisah dari orchestration state agar page utama lebih ringan.

## 8. Peta Refactor yang Disarankan

Bagian ini sengaja ditambahkan supaya pemecahan file bisa dilakukan tanpa mengubah perilaku bisnis.

### 8.1 Urutan refactor yang aman

1. Pisahkan helper murni dulu.
2. Pindahkan type dan constant ke file tersendiri.
3. Pecah tiap tab menjadi komponen presentasional.
4. Baru pisahkan data-fetching logic ke hook per tab.
5. Terakhir, ubah page utama menjadi orchestration layer tipis.

### 8.2 Kandidat file baru

- `src/pages/OrganizerDashboardPage/constants.ts`
  - Tab definition, status filter, dan default query.

- `src/pages/OrganizerDashboardPage/utils.ts`
  - `formatIdr`, `formatDateTime`, `toDateTimeLocal`, `getErrorMessage`, `getDecisionCountdown`.

- `src/pages/OrganizerDashboardPage/types.ts`
  - `DashboardTab`, `StatsQuery`, `EditEventFormValues`, dan local `RatingItem` bila masih dibutuhkan.

- `src/pages/OrganizerDashboardPage/hooks/useOrganizerDashboardData.ts`
  - Fetch overview, events, transactions, statistics, attendees.

- `src/pages/OrganizerDashboardPage/hooks/useOrganizerRatings.ts`
  - Fetch ratings dan hitung average.

- `src/pages/OrganizerDashboardPage/components/OverviewTab.tsx`
- `src/pages/OrganizerDashboardPage/components/EventsTab.tsx`
- `src/pages/OrganizerDashboardPage/components/TransactionsTab.tsx`
- `src/pages/OrganizerDashboardPage/components/StatisticsTab.tsx`
- `src/pages/OrganizerDashboardPage/components/AttendeesTab.tsx`
- `src/pages/OrganizerDashboardPage/components/RatingsTab.tsx`
  - Masing-masing bertanggung jawab pada render tab dan interaksi lokalnya.

- `src/pages/OrganizerDashboardPage/components/EditEventModal.tsx`
  - Form edit event dan validasi modal.

### 8.3 Pembagian tanggung jawab yang diharapkan

- Page utama:
  - Mengelola tab aktif.
  - Menjembatani refresh antar tab.
  - Menyimpan state global kecil seperti `globalMessage`.

- Komponen tab:
  - Hanya fokus ke UI dan callback props.
  - Tidak memegang knowledge lintas tab yang tidak diperlukan.

- Hook data:
  - Mengisolasi side effect fetch dan refetch.
  - Mengembalikan loading, data, dan action yang jelas.

### 8.4 Batas refactor yang sebaiknya tidak dipecah bersamaan

- Jangan memecah statistik dan overview bersamaan dengan transisi animasi kalau belum ada regression test UI.
- Jangan memindahkan accept/reject transaksi ke hook baru sebelum contract error handling sudah diuji.
- Jangan ubah shape payload update event tanpa sinkronisasi dengan API module dan backend docs.

## 9. Checklist QA Manual (Frontend)

### Access dan role
- [ ] Login sebagai organizer bisa akses `/organizer/dashboard`.
- [ ] Login sebagai customer tidak bisa akses dashboard organizer.

### Overview
- [ ] Metric muncul sesuai data backend.
- [ ] Tombol refresh bekerja.

### Manage events
- [ ] Daftar event tampil.
- [ ] Edit event sukses mengubah data.
- [ ] Validasi form menolak input tidak valid.
- [ ] Error backend tampil jika melanggar business rule.

### Transactions
- [ ] Filter status bekerja.
- [ ] Filter event bekerja.
- [ ] Pagination bekerja.
- [ ] Payment proof dapat dilihat.
- [ ] Accept mengubah status transaksi.
- [ ] Reject mengubah status transaksi.
- [ ] Pesan sukses reject menyebut rollback oleh backend.
- [ ] Countdown keputusan tampil untuk transaksi `PAID`.

### Statistics
- [ ] Group by year menampilkan chart.
- [ ] Group by month dengan year menampilkan chart.
- [ ] Group by day dengan year+month menampilkan chart.
- [ ] Empty state muncul saat data kosong.

### Attendees
- [ ] Pilih event lalu attendee list tampil.
- [ ] Data nama, email, qty, total, tanggal valid.

### Ratings
- [ ] Ratings tab tampil.
- [ ] Average rating tampil.
- [ ] List rating menampilkan user, event, rating, dan komentar.

## 10. Batasan Saat Ini dan Saran Lanjutan

Batasan saat ini:
- Dashboard masih berupa satu file page besar.
- Ratings masih memakai fallback endpoint langsung dari page.
- Chart sudah fungsional tetapi belum ada export report.
- Belum ada code splitting per tab.

Saran lanjutan:
1. Pecah dashboard menjadi komponen dan hook per tab.
2. Pindahkan helper format dan error handling ke utility shared.
3. Finalisasi contract ratings ke API module typed.
4. Tambah export CSV untuk transaksi dan attendee.
5. Jika dibutuhkan, migrasi fetching ke React Query supaya caching dan refetch lebih terstruktur.

## 11. Kesimpulan

Implementasi frontend saat ini sudah mencakup requirement utama organizer dashboard dan cukup jelas untuk dipecah. Dengan tambahan peta refactor di atas, pemecahan file bisa dilakukan bertahap tanpa mengubah contract UI dan perilaku bisnis yang sudah berjalan.
