# NUSANTARA

> **Bahasa Pemrograman 100% Bahasa Indonesia untuk Komputasi Modern, Terbuka, dan Berkelanjutan.**

[![Status](https://img.shields.io/badge/status-fase_24:_ci%2Fcd_&_automated_release-blue.svg)](ROADMAP.md)
[![Versi](https://img.shields.io/badge/versi-v0.24.0-emerald.svg)](PERUBAHAN.md)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-passing-brightgreen.svg)](.github/workflows/ci.yml)
[![Lisensi](https://img.shields.io/badge/lisensi-Apache_2.0-blue.svg)](LISENSI)
[![Tata Bahasa](https://img.shields.io/badge/grammar-EBNF_ISO--14977-purple.svg)](dokumentasi/GRAMMAR-EBNF.md)
[![Testing](https://img.shields.io/badge/testing-20_suites_lulus_100%25-green.svg)](pengujian/README.md)
[![Build](https://img.shields.io/badge/build-cross--platform_dist-teal.svg)](docs/referensi/build-system.md)

---

## 1. Tentang NUSANTARA

**NUSANTARA** adalah bahasa pemrograman serba guna (*general-purpose programming language*) yang dirancang dari nol menggunakan 100% tata bahasa, istilah teknis, dan leksikon Bahasa Indonesia.

NUSANTARA bukan sekadar penerjemah sintaksis bahasa asing, melainkan ikhtiar mandiri dalam rekayasa perangkat lunak untuk menghadirkan kedaulatan teknologi, kejelasan berpikir logis bagi masyarakat Indonesia, serta fondasi komputasi yang dapat berevolusi hingga ke tingkat sistem operasi (**NusantaraOS**).

- **Ekstensi Berkas Resmi:** `.nusantara`
- **Lisensi:** [Apache License 2.0](LISENSI)
- **Status Saat Ini:** **Phase 24: CI/CD, Automated Release & GitHub Workflow NUSANTARA (Milestone v0.24.0).**
- **Dokumentasi CI/CD:** [docs/referensi/ci-cd.md](docs/referensi/ci-cd.md) & [docs/pengembang/github-workflows.md](docs/pengembang/github-workflows.md)
- **Dokumentasi Build System:** [docs/referensi/build-system.md](docs/referensi/build-system.md) & [docs/pengembang/build.md](docs/pengembang/build.md)
- **Dokumentasi Distribusi:** [docs/referensi/distribution.md](docs/referensi/distribution.md)
- **Dokumentasi Paket & Registri:** [docs/referensi/package.md](docs/referensi/package.md) & [docs/referensi/registry.md](docs/referensi/registry.md)
- **Dokumentasi Testing:** [docs/referensi/testing.md](docs/referensi/testing.md)
- **Dokumentasi Language Server:** [docs/referensi/language-server.md](docs/referensi/language-server.md)
- **Tata Bahasa Formal:** [GRAMMAR-EBNF.md](dokumentasi/GRAMMAR-EBNF.md)

---

## 2. Instalasi (Installation)

### 2.1 Menggunakan Paket Biner Rilis Resmi
Unduh paket distribusi untuk sistem operasi Anda dari folder `dist/` atau halaman rilis resmi:

- **Windows (x64)**: `nusantara-v0.24.0-windows-x64.zip`
- **Linux (x64)**: `nusantara-v0.24.0-linux-x64.tar.gz` atau `.zip`
- **macOS (Intel x64)**: `nusantara-v0.24.0-macos-x64.tar.gz`
- **macOS (Apple Silicon ARM64)**: `nusantara-v0.24.0-macos-arm64.tar.gz`

#### Langkah Pemasangan:
```bash
# 1. Ekstrak arsip (contoh Linux/macOS)
tar -xzf nusantara-v0.24.0-linux-x64.tar.gz
cd nusantara-v0.24.0-linux-x64

# 2. Jalankan installer otomatis (atau salin direktori bin ke PATH)
./install.sh

# 3. Verifikasi instalasi di terminal baru
nusantara --versi
```

Pada Windows:
1. Ekstrak berkas `nusantara-v0.24.0-windows-x64.zip`.
2. Klik ganda `install.bat` atau tambahkan folder `bin` ke variabel lingkungan `PATH`.
3. Buka PowerShell / Command Prompt dan jalankan `nusantara --versi`.

---

## 3. Memulai Cepat (Quick Start)

Buat berkas program baru bernama `halo.nusantara`:

```nusantara
program HaloDunia
mulai
    pesan : teks = "Selamat datang di Bahasa Pemrograman NUSANTARA!"
    tampilkan(pesan)

    angka_a : bilangan = 10
    angka_b : bilangan = 32
    total : bilangan = angka_a + angka_b
    tampilkan("Hasil penjumlahan 10 + 32 =", total)
selesai
```

Jalankan program melalui CLI:
```bash
nusantara jalankan halo.nusantara
```

Periksa sintaksis kode dan sistem tipe tanpa eksekusi:
```bash
nusantara cek halo.nusantara
```

Format kode sesuai standar tata letak resmi:
```bash
nusantara format halo.nusantara --tulis
```

---

## 4. Platform yang Didukung (Supported Platforms)

Bahasa NUSANTARA v0.23.0 mendukung secara resmi:
- **Windows x64** (Windows 10, Windows 11, Windows Server)
- **Linux x64** (Ubuntu, Debian, Fedora, Arch Linux, Alpine)
- **macOS x64** (macOS 12+ Intel)
- **macOS ARM64** (macOS 12+ Apple Silicon M1/M2/M3/M4)

---

## 5. Membangun dari Sumber (Build From Source)

### Kebutuhan Awal
- Node.js versi 18+ (disarankan Node.js 22 LTS)
- npm versi 9+

### Langkah Kompilasi:
```bash
# 1. Pasang seluruh dependensi proyek
npm install

# 2. Jalankan rangkaian pengujian mutu pra-rilis
npm test

# 3. Bangun paket rilis distribusi resmi
npm run test:build

# 4. Bangun artefak rilis melalui CLI resmi
npx tsx src/index.ts bangun --mode release
```

Hasil artefak kompilasi akan tersedia pada direktori `dist/` lengkap dengan berkas `dist/SHA256SUMS` dan `dist/release-manifest.json`.

---

## 6. Artefak Rilis & Verifikasi Integritas (Release Artifacts & Checksum)

Setiap rilis resmi diverifikasi menggunakan hash kriptografis SHA-256 untuk menjamin integritas biner:

```bash
# Linux
sha256sum -c dist/SHA256SUMS

# macOS
shasum -a 256 -c dist/SHA256SUMS

# Windows PowerShell
Get-FileHash -Algorithm SHA256 dist\nusantara-v0.23.0-windows-x64.zip
```

---

## 7. Pemecahan Masalah (Troubleshooting)

- **Perintah `nusantara` tidak ditemukan setelah instalasi:**
  Pastikan direktori `bin/` dari lokasi instalasi telah ditambahkan ke variabel lingkungan `PATH` sistem Anda.
- **Peringatan Keamanan macOS (Gatekeeper - unsigned binary):**
  Jika macOS memblokir eksekusi biner yang belum ditandatangani sertifikat pengembang berbayar Apple, jalankan perintah berikut di Terminal:
  ```bash
  xattr -dr com.apple.quarantine "$HOME/.nusantara"
  ```
- **Pustaka Standar (`std`) tidak ditemukan:**
  Secara otomatis NUSANTARA mencari folder `std` di direktori induk peluncur. Anda dapat menetapkan lokasi manual via variabel lingkungan `NUSANTARA_STDLIB=/jalur/ke/std`.

---

## 8. Saluran Pipa Kompilasi & Arsitektur

```text
Source Code (.nusantara)
         │
         ▼
 ┌───────────────┐
 │     Lexer     │  <-- [PHASE 6 (v0.6.0)]
 └───────────────┘
         │
         ▼
   TokenStream
         │
         ▼
 ┌───────────────┐
 │    Parser     │  <-- [PHASE 7 (v0.7.0)]
 └───────────────┘
         │
         ▼
 Pohon AST & Type Checker <-- [PHASE 8-14]
         │
         ▼
 Modul & Pustaka Standar  <-- [PHASE 15 & 17]
         │
         ▼
 Testing & Quality Gate   <-- [PHASE 21 (v0.21.0)]
         │
         ▼
 Package & Local Registry <-- [PHASE 22 (v0.22.0)]
         │
         ▼
 Build & Distribution     <-- [PHASE 23 (v0.23.0)]
         │
         ▼
 Artefak Rilis Resmi (dist/*.zip, dist/*.tar.gz)
```

---

## 9. Lisensi

Proyek Bahasa Pemrograman NUSANTARA dilindungi di bawah [Apache License 2.0](LISENSI).
Hak Cipta (c) 2026 Komunitas Bahasa Pemrograman NUSANTARA.
