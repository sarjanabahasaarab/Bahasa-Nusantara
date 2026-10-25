# Panduan Pengembang: Arsitektur Sistem Build & Distribusi (v0.23.0)

Dokumen ini ditujukan bagi kontributor internal dan arsitek bahasa NUSANTARA yang mengembangkan sistem build, kompilasi, dan distribusi.

---

## 1. Desain Arsitektur Subsistem (`src/build/`)

Modul sistem build berada di bawah `src/build/` dengan pembagian tanggung jawab yang jelas:

- **`types.ts`**: Definisi antarmuka TypeScript untuk target platform (`windows-x64`, `linux-x64`, `macos-x64`, `macos-arm64`), mode build (`debug`, `release`), artefak rilis, dan manifest.
- **`konfigurasi.ts`**: Pemuatan dan validasi konfigurasi dari tabel `[build]` di `nusantara.toml` serta CLI overrides.
- **`jalur.ts`**: Abstraksi jalur lintas platform yang tahan terhadap variasi pemisah direktori Windows (`\`) dan POSIX (`/`), pencegahan path traversal, dan mekanisme *resource discovery* pustaka standar.
- **`pengemasArsip.ts`**: Implementasi pengemasan arsip biner murni (PKZip format dan POSIX UStar TAR) tanpa ketergantungan pada utilitas shell host (`zip` atau `tar`), sehingga dapat berjalan di Node.js maupun lingkungan browser sandbox.
- **`penataRilis.ts`**: Penataan tata letak direktori distribusi per platform, pembuatan launcher wrapper, skrip installer, dan audit keamanan konten terlarang (mencegah kebocoran kredensial).
- **`mesinBuild.ts`**: Orkestrator utama pipeline: validasi konfigurasi, pemeriksaan sintaksis sumber, pengujian pra-rilis wajib, generasi artefak, kalkulasi hash SHA-256, pembuatan `release-manifest.json`, serta smoke testing.

---

## 2. Single Source of Truth Versi (`src/konstanta/versi.ts`)

Versi bahasa NUSANTARA dikelola terpusat pada `src/konstanta/versi.ts`:
```typescript
export const VERSI_NUSANTARA = '0.23.0';
export const LABEL_VERSI_NUSANTARA = 'v0.23.0';
export const FASE_TERAKHIR = 23;
export const NAMA_FASE_TERAKHIR = 'Build System & Distribution';
```
Semua komponen (CLI, stdlib `sistem`, generator artefak, registri paket, dan manifest rilis) wajib mengimpor konstanta dari berkas ini, bukan menyematkan versi secara manual di banyak berkas berbeda.

---

## 3. Menjalankan Pengujian Build Lokal

Pengembang dapat menjalankan rangkaian pengujian otomatis khusus sistem build via:
```bash
npm run test:build
```
Atau menjalankan seluruh regresi ekosistem lengkap (Phase 1–23):
```bash
npm test
```
