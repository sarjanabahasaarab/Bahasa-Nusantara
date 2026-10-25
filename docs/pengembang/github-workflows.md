# Panduan Pengembang: Alur Kerja GitHub Actions & Release NUSANTARA

Target Milestone: **Phase 24 (`v0.24.0`)**

Dokumen ini ditujukan bagi pengembang dan kontributor Bahasa Pemrograman NUSANTARA untuk memahami alur kerja pengujian otomatis, pull request checks, debugging kegagalan CI, dan prosedur rilis resmi.

---

## 1. Siklus Kontribusi & Pull Request Checks

Setiap kali Anda membuat Pull Request (PR) ke branch `main`:
1. **GitHub Actions CI** akan otomatis terpicu (`.github/workflows/ci.yml`).
2. Tiga status pemeriksaan wajib (*Required Status Checks*) harus lulus:
   - `NUSANTARA / Pemeriksaan Statis` (Lint & Typecheck TypeScript)
   - `NUSANTARA / Pengujian Otomatis (ubuntu-latest, windows-latest, macos-latest)`
   - `NUSANTARA / Gerbang Kualitas (Quality Gate)`
   - `NUSANTARA / Validasi Build (Multi-OS Matrix)`
3. Jika terdapat satu tahapan yang gagal, PR **tidak boleh digabungkan** sampai masalah diperbaiki.

---

## 2. Menjalankan Verifikasi CI Sebelum Mengajukan PR

Sebelum mengirimkan branch Anda ke remote Git, jalankan verifikasi lokal:

```bash
# 1. Jalankan linting tipe data
npm run lint

# 2. Jalankan seluruh rangkaian test (Phase 1–24)
npm test

# 3. Jalankan alur CI terpadu lokal
npm run quality-gate
# atau menggunakan CLI NUSANTARA:
npx tsx src/index.ts ci
```

Jika seluruh perintah di atas mengembalikan exit code 0, kode Anda aman untuk diajukan ke repositori.

---

## 3. Menangani Kegagalan Alur Kerja (Troubleshooting)

### A. Kegagalan Lint / Pemeriksaan Statis
- **Penyebab**: Terdapat kesalahan tipe data TypeScript atau import yang hilang.
- **Solusi**: Jalankan `npm run lint` untuk melihat baris dan berkas penyebab kesalahan.

### B. Kegagalan Pengujian Otomatis
- **Penyebab**: Terdapat assertion atau penegasan yang gagal di salah satu file test.
- **Solusi**: Jalankan spesifik test yang gagal, misalnya `npm run test:cicd` atau `npm run test:build`.

### C. Kegagalan Validasi Alur Kerja (YAML)
- **Penyebab**: Terdapat struktur YAML yang keliru, pelanggaran *least privilege*, atau rahasia yang di-hardcode.
- **Solusi**: Jalankan `npx tsx src/index.ts ci periksa-workflow` untuk memeriksa kedua berkas alur kerja.

---

## 4. Prosedur Rilis Resmi (Release Workflow)

Rilis resmi dipicu secara manual oleh Release Manager menggunakan fitur **GitHub Actions Workflow Dispatch**:

1. Masuk ke tab **Actions** di repositori GitHub.
2. Pilih alur kerja **NUSANTARA Automated Release & Distribution**.
3. Klik tombol **Run workflow**.
4. Isi parameter:
   - **Versi**: Masukkan versi rilis target (misal: `0.24.0`).
   - **confirm_release**: Centang atau set ke `true` (Persetujuan eksplisit wajib).
   - **Tipe Rilis**: Pilih `release`, `draft`, atau `prerelease`.
   - **dry_run**: Pilih `false` untuk publikasi resmi atau `true` untuk uji coba.
5. Tekan tombol hijau **Run workflow**.

Jika seluruh tahapan validasi lulus, artefak biner lintas platform, `SHA256SUMS`, dan `release-manifest.json` akan otomatis dipublikasikan ke halaman GitHub Releases.
