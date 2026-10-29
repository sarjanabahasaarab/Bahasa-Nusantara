# Katalog Template Proyek NUSANTARA

Dokumentasi Resmi Bahasa Pemrograman NUSANTARA  
Target Versi: `v0.33.0` (Phase 33)

---

## Ringkasan Template Resmi

CLI NUSANTARA menyediakan 6 template terverifikasi yang langsung siap digunakan (`status: siap`):

| ID | Nama | Kategori | Min. Versi | Keterangan Singkat |
|---|---|---|---|---|
| `basic` | Aplikasi Dasar | `aplikasi` | `v0.1.0` | Program awal untuk pengguna baru |
| `library` | Pustaka Terpakai Ulang | `pustaka` | `v0.15.0` | Modul pustaka fungsi untuk ekosistem paket |
| `web` | Aplikasi Web Dinamis | `layanan` | `v0.30.0` | Website dinamis dengan Web Framework & aset statis |
| `api` | Layanan REST API | `layanan` | `v0.30.0` | REST API berformat JSON & endpoint kesehatan |
| `database` | Basis Data & ORM | `aplikasi` | `v0.32.0` | Terintegrasi SQLite, ORM Query Builder, & Migrasi |
| `console` | Alat Konsol / CLI Tool | `alat` | `v0.27.0` | Alat baris perintah dengan pengolahan argumen |

---

## 1. Template `basic` (Aplikasi Dasar)

- **Tujuan**: Proyek pertama bagi pengguna baru untuk memahami sintaks `.nusantara`.
- **Persyaratan**: Runtime interpreter bawaan.
- **Struktur Berkas**:
  ```
  nama-proyek/
  ├── .gitignore
  ├── README.md
  ├── nusantara.toml
  ├── nusantara-project.json
  └── src/
      └── utama.nusantara
  ```
- **Entry Point**: `src/utama.nusantara`
- **Cara Menjalankan**:
  ```bash
  nusantara jalankan src/utama.nusantara
  ```

---

## 2. Template `library` (Pustaka Terpakai Ulang)

- **Tujuan**: Membangun package modular untuk diekspor ke ekosistem NUSANTARA.
- **Persyaratan**: Sistem modul & resolver modul.
- **Struktur Berkas**:
  ```
  nama-proyek/
  ├── .gitignore
  ├── README.md
  ├── nusantara.toml
  ├── nusantara-project.json
  ├── contoh/
  │   └── pemakaian.nusantara
  └── src/
      └── lib.nusantara
  ```
- **Entry Point**: `src/lib.nusantara`
- **Cara Menjalankan Contoh**:
  ```bash
  nusantara jalankan contoh/pemakaian.nusantara
  ```

---

## 3. Template `web` (Aplikasi Web Dinamis)

- **Tujuan**: Membangun website responsif dengan perutean (routing), penanganan halaman HTML, dan berkas statis CSS.
- **Persyaratan**: Modul standar `web` (Fase 30).
- **Struktur Berkas**:
  ```
  nama-proyek/
  ├── .gitignore
  ├── README.md
  ├── nusantara.toml
  ├── nusantara-project.json
  ├── publik/
  │   └── aset/
  │       └── gaya.css
  └── src/
      └── utama.nusantara
  ```
- **Entry Point**: `src/utama.nusantara`
- **Cara Menjalankan**:
  ```bash
  nusantara layani src/utama.nusantara --port 3000
  ```

---

## 4. Template `api` (Layanan REST API)

- **Tujuan**: Membangun layanan microservice API dengan output JSON terstruktur.
- **Persyaratan**: Modul standar `web` dan serializer JSON.
- **Struktur Berkas**:
  ```
  nama-proyek/
  ├── .gitignore
  ├── README.md
  ├── nusantara.toml
  ├── nusantara-project.json
  └── src/
      └── utama.nusantara
  ```
- **Fitur Bawaan**: Endpoint `/api/kesehatan` dan `/api/v1/item`.
- **Cara Menjalankan**:
  ```bash
  nusantara layani src/utama.nusantara --port 8080
  ```

---

## 5. Template `database` (Basis Data & ORM)

- **Tujuan**: Aplikasi data transaksional dengan SQLite, model data, query builder berparameter, dan migrasi skema.
- **Persyaratan**: Modul `basisdata` (Fase 29) & `orm` (Fase 32).
- **Struktur Berkas**:
  ```
  nama-proyek/
  ├── .gitignore
  ├── README.md
  ├── nusantara.toml
  ├── nusantara-project.json
  ├── migrasi/
  │   └── 001_buat_tabel_barang.ts
  └── src/
      └── utama.nusantara
  ```
- **Fitur Bawaan**: QueryBuilder aman dari SQL Injection, berkas DDL migrasi bertahap, dan manipulasi data.
- **Cara Menjalankan**:
  ```bash
  nusantara db status
  nusantara db migrasi
  nusantara jalankan src/utama.nusantara
  ```

---

## 6. Template `console` (Alat Konsol / CLI Tool)

- **Tujuan**: Membangun perkakas CLI interaktif untuk terminal.
- **Persyaratan**: Modul `sistem` (Fase 27).
- **Struktur Berkas**:
  ```
  nama-proyek/
  ├── .gitignore
  ├── README.md
  ├── nusantara.toml
  ├── nusantara-project.json
  └── src/
      └── utama.nusantara
  ```
- **Cara Menjalankan**:
  ```bash
  nusantara jalankan src/utama.nusantara
  ```
