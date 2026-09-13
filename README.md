# Pixelift Lite — Free Background Remover, Photo Editor, dan Admin Dashboard

> Aplikasi web modern untuk menghapus background foto otomatis berbasis AI, mengedit pencahayaan & warna foto (Lightroom Lite), serta dashboard operasional administratif terlengkap.

---

## Fitur Utama

### 1. User Application (`apps/web` — Port 5173)
- **AI Background Removal**: Menghapus background foto secara instan dengan adapter model terbuka (`RMBG-1.4`, `U2Net`), serta `MockBackgroundRemovalService` yang bekerja 100% lokal dan offline tanpa API berbayar.
- **Manual Refinement Brush**: Kuas *Eraser* dan *Restore* dengan pengaturan ukuran (*Brush Size*) dan kelembutan tepi (*Softness*) untuk memperbaiki helai rambut atau detail kompleks.
- **Penggantian Background**:
  - Transparan (pola papan catur checkerboard)
  - Warna solid (White, Black, Light Gray, Blue, Green, Violet, Beige + custom color picker)
  - Gradien studio modern
  - Custom background (*My Photo*)
  - Efek blur latar belakang
- **Photo Editor Light (Lightroom-Lite)**:
  - **Panel Basic**: Exposure, Brightness, Contrast, Highlights, Shadows, Whites, Blacks
  - **Panel Color**: Temperature, Tint, Saturation, Vibrance, Hue
  - **Panel Detail**: Sharpness, Clarity, Blur, Grain, Vignette
  - **Panel Transform**: Crop, Rotate 90°, Flip Horizontal, Flip Vertical, Rasio Aspek (Original, 1:1, 4:5, 3:4, 9:16, 16:9)
  - **Preset Filters**: Natural, Bright, Warm, Cool, Film, Mono, Vintage, High Contrast
- **Before & After Comparison**: Slider perbandingan visual, hold-to-view original, zoom in/out/fit, dan pan.
- **Export Tanpa Watermark**: Format PNG, JPG, dan WEBP dengan slider kualitas dan pilihan resolusi (Original, Medium, Small).
- **Penyimpanan Project Lokal**: Riwayat project disimpan di peramban menggunakan **IndexedDB** dengan fitur cari, duplikasi, buka kembali, dan hapus.
- **Membership Simulasi**: Pilihan paket Free (10/hari), Pro ($12/bln), dan Unlimited ($29/bln) dengan simulasi checkout & invoice instan.

### 2. Admin Experience (`apps/admin` — Port 5174)
- **Overview Dashboard**:
  - Kartu statistik tren real-time: Total Users (10,450, +4%), Total Projects (250K, +3%), Images Processed (1M, +40%), BG Removals (900K, +10%), Failed Reports (150, -2%), Revenue Simulation (150K, +8%), Pending Tickets (5), Pending Reports (12).
  - Grafik interaktif **Recharts**:
    - **User Growth Chart**: Line chart perbandingan pengguna baru vs aktif dengan filter waktu (7d, 30d, 90d, 1y).
    - **Image Processing Chart**: Area chart proses berhasil vs gagal.
    - **Export Formats Chart**: Donut chart distribusi format PNG, JPG, WEBP.
    - **Revenue Simulation Chart**: Grafik pendapatan simulasi per bulan.
- **Users Management CRUD**: Pencarian, filter role/status/membership, bulk suspend/activate/delete, pagination, dan export data ke CSV.
- **Process Queue Monitor**: Pantau antrean background removal (Queued, Processing, Completed, Failed) dengan log error dan tombol *Retry*.
- **Presets & Filter CRUD**: Kelola preset warna latar belakang dan preset filter foto.
- **Support Tickets & Live Chat Modal**: Tangani tiket kendala dengan antarmuka chat langsung, catatan internal admin, dan status resolusi.
- **Laporan Kendala**: Tinjau laporan bug atau ketidakakuratan segmentasi AI dari pengguna.
- **Audit Logs**: Rekaman jejak audit tidak dapat diubah (*immutable*) atas seluruh aktivitas administratif.
- **Pusat Notifikasi**: Broadcast pesan dan pengumuman untuk semua pengguna, pengguna Free, atau pengguna Pro.
- **Pengaturan Aplikasi**: Konfigurasi umum, batas upload file, threshold AI, durasi session JWT, dan mode pemeliharaan.

---

## Akun Demo

| Peran | Email | Kata Sandi | Akses |
|---|---|---|---|
| **Super Admin** | `admin@pixellift.test` | `Demo123!` | Dashboard Admin Lengkap |
| **Demo User** | `user@pixellift.test` | `Demo123!` | Aplikasi Web Pengguna |

---

## Struktur Monorepo

```
fixlite-web/
├── apps/
│   ├── web/            # Aplikasi Frontend Pengguna (Vite + React + Canvas)
│   ├── admin/          # Dashboard Admin (Vite + React + Recharts)
│   └── api/            # Backend REST API (Express + TypeScript + SQLite)
├── packages/
│   ├── types/          # Tipe data & DTO TypeScript bersama
│   ├── ui/             # Komponen UI bersama (Logo PL+, Theme Toggle)
│   ├── config/         # Konfigurasi Tailwind & tema bersama
│   └── services/       # AI Adapter (Mock AI, RMBG-1.4, U2Net)
└── package.json        # Root npm workspaces
```

---

## Cara Menjalankan Aplikasi

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Server Backend API
```bash
npm run dev:api
```
Backend berjalan di: `http://localhost:3001` (SQLite otomatis terinisialisasi dan di-seed dengan data realistis).

### 3. Menjalankan Aplikasi Web Pengguna
```bash
npm run dev:web
```
Aplikasi terbuka di: `http://localhost:5173`

### 4. Menjalankan Dashboard Admin
```bash
npm run dev:admin
```
Dashboard admin terbuka di: `http://localhost:5174`

---

## Pengujian & Verifikasi Kualitas

Seluruh suite pengujian otomatis telah disiapkan dan lulus:

```bash
# Menjalankan pengujian integrasi Vitest
npm run test

# Memeriksa TypeScript type safety di semua workspace
npm run typecheck

# Membangun bundle produksi untuk web, admin, dan API
npm run build
```
