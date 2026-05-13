# animeku.id

![Live Site](https://img.shields.io/badge/Live%20Site-minpro--umber.vercel.app-111827?style=for-the-badge&logo=vercel&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-Vercel-0F172A?style=for-the-badge&logo=vercel&logoColor=white)
![Backend](https://img.shields.io/badge/Backend-Render-2B2D42?style=for-the-badge&logo=render&logoColor=white)
![Database](https://img.shields.io/badge/Database-Supabase-005B41?style=for-the-badge&logo=supabase&logoColor=white)

> Platform ticketing event untuk menemukan, memilih, dan memesan berbagai acara dengan cepat, mudah, dan nyaman.

animeku.id adalah website pemesanan tiket event yang dirancang untuk jadi pusat pengalaman terbaik dalam menjelajahi berbagai acara. Dari konser yang penuh energi, seminar yang membuka wawasan, workshop yang interaktif, sampai event komunitas yang seru, animeku.id membantu user menemukan acara yang tepat dan mengamankan tiketnya dengan cepat, mudah, dan tanpa ribet.

Di balik pengalaman itu, animeku.id dibangun sebagai aplikasi monorepo dengan dua bagian utama: `frontend/` dan `backend/`. Pendekatan ini menjaga pengembangan antarmuka pengguna, API, dan logika server tetap terstruktur, rapi, dan siap berkembang menjadi platform yang solid.

README ini berisi gambaran umum project, deployment, dan pintu masuk ke dokumentasi teknis di masing-masing folder.

---

## ✨ Quick Glance

| Item | Detail |
| --- | --- |
| Nama project | animeku.id |
| Fokus utama | Website ticketing untuk event dan acara |
| Struktur repo | Monorepo dengan frontend dan backend |
| Dokumentasi detail | Dipisahkan ke README masing-masing folder |
| Status live | Deploy aktif di Vercel |

---

## 🚀 Deployment

Project animeku.id sudah live dan bisa diakses melalui:

- Live site: [minpro-umber.vercel.app](https://minpro-umber.vercel.app/)

Arsitektur deployment yang digunakan:

- Backend dijalankan di Render.
- Frontend dijalankan di Vercel.
- Database menggunakan Supabase.

Untuk menjaga backend dan database tetap aktif serta mengurangi risiko cold start, sistem cron job melakukan ping ke backend dan database setiap 15 menit.

---

## 📌 Gambaran Umum

Project ini dibangun agar pengembangan frontend dan backend bisa dipisahkan dengan jelas, tetapi tetap berada dalam satu repository. Dengan struktur seperti ini, dokumentasi dan pemeliharaan project juga lebih rapi karena setiap layer punya penjelasan yang spesifik.

> README root ini adalah pintu masuk utama project. Detail teknis dipindahkan ke dokumentasi di masing-masing folder agar lebih fokus dan mudah dibaca.

---

## 🗂️ Struktur Repository

- `frontend/` berisi aplikasi antarmuka pengguna.
- `backend/` berisi API, logika server, dan koneksi ke database.
- README detail untuk frontend ada di [frontend/README.md](frontend/README.md).
- README detail untuk backend ada di [backend/README.md](backend/README.md).

---

## 📚 Dokumentasi Lanjutan

Untuk informasi yang lebih teknis, silakan lihat README di masing-masing folder:

- Frontend: [frontend/README.md](frontend/README.md)
- Backend: [backend/README.md](backend/README.md)

README root ini sengaja dibuat sebagai pengantar project yang ringkas, rapi, dan mudah dipindai di GitHub.
