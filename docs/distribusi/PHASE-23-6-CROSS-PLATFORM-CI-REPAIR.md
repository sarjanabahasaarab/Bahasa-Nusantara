# Phase 23.6 — Perbaikan Dependensi Native Lintas Platform, Toolchain QEMU & Validasi Distribusi CI

**Proyek:** NUSANTARA Programming Language & NUSANTARA OS  
**Target Milestone:** `v0.23.6` (Integrasi CI pada basis `v0.50.0`)  
**Status Phase 23:** 🟠 **SELESAI SEBAGIAN** *(Menunggu eksekusi GitHub Actions 6 target `windows-x86_64`, `windows-arm64`, `linux-x86_64`, `linux-arm64`, `macos-x86_64`, `macos-arm64` mencapai `CERTIFIED (6/6 PASS)`)*

---

## 1. Akar Masalah yang Diaudit & Diperbaiki (Run `43676599077`)

### 1.1 `Validasi Pembuatan Distribusi Target (linux-x86_64)` Gagal (`statusAkhir = FAIL`)
- **Akar Masalah:** `nusantara.toml` pada root repositori masih mencantumkan `versi = "0.49.0"`, sementara Single Source of Truth `VERSI_NUSANTARA` pada `src/konstanta/versi.ts` bernilai `"0.50.0"`. Saat `MesinCI` dijalankan terhadap `PembacaBerkasNode`, tahap `konsistensi-versi` gagal dan mengembalikan `statusAkhir = 'FAIL'` tanpa mencetak `daftarError` dan `diagnostikDistribusi`.
- **Perbaikan:**
  1. Menyelaraskan `nusantara.toml` (`versi = "0.50.0"`) dengan `VERSI_NUSANTARA`.
  2. Memperluas `MesinCI` (`src/cicd/mesinCI.ts` & `src/cicd/types.ts`) agar menormalkan alias warisan (`windows-x64`, `linux-x64`, `macos-x64`) dan target kanonik (`windows-x86_64`, `windows-arm64`, `linux-x86_64`, `linux-arm64`, `macos-x86_64`, `macos-arm64`), serta mengisi field terstruktur `daftarError` dan `diagnostikDistribusi`.
  3. Menambahkan subperintah `verify-dist` pada `scripts/phase23-certify.ts` yang memvalidasi siklus distribusi nyata end-to-end (kompilasi native AOT -> `BinaryInspector.inspectStrict` -> `DesktopDistributionPackager` -> validasi `manifest.json` tanpa BOM UTF-8 & `SHA256SUMS` -> ekstraksi arsip `.tar.gz`/`.zip` -> sandbox install -> eksekusi executable terpasang & validasi sentinel -> sandbox uninstall).

### 1.2 Kegagalan Binding Native Rolldown, Tailwind Oxide, LightningCSS & TypeScript 7 di Windows & macOS
- **Akar Masalah:** `package-lock.json` sebelumnya dihasilkan saat `node_modules` Linux x64 aktif sehingga hanya menyertakan entri Linux x64 (`@rolldown/binding-linux-x64-gnu`, `@tailwindcss/oxide-linux-x64-gnu`, dll. tanpa `resolved`/`integrity`) dan kehilangan seluruh `optionalDependencies` untuk Windows (`win32-x64-msvc`, `win32-arm64-msvc`), macOS (`darwin-arm64`, `darwin-x64`), serta Linux ARM64 (`linux-arm64-gnu`). Akibatnya `npm ci` pada Windows & macOS gagal saat `npm run build` (`vite build`).
- **Perbaikan:**
  1. Meregenerasi `package-lock.json` dari `package.json` pada direktori bersih (`npm install --package-lock-only --no-audit --ignore-scripts`) dan memverifikasinya dengan `npm ci` sehingga seluruh 273 entri paket—termasuk seluruh binding native Windows, macOS Intel/Apple Silicon, Linux x64/ARM64—memiliki `resolved` URL dan hash `integrity` SRI yang sah.
  2. Menambahkan langkah verifikasi eksplisit di `.github/workflows/ci.yml` yang mencatat `node -v`, `npm -v`, serta memvalidasi keberadaan paket `@rolldown/binding-*` dan `@tailwindcss/oxide-*` native sesuai OS/arsitektur runner tanpa fallback WASM palsu.

### 1.3 Kegagalan Instalasi `qemu-user-static` pada Runner `ubuntu-latest` (`linux-arm64`)
- **Akar Masalah:** Pada Ubuntu 24.04/26.04, `qemu-user-static` diperlakukan sebagai virtual/transitional package sehingga `sudo apt-get install -y ... qemu-user-static` gagal sebelum tahap kompilasi ARM64 dimulai.
- **Perbaikan:**
  1. Memeriksa `HOST_ARCH=$(uname -m)` pada `.github/workflows/ci.yml`: apabila host sudah `aarch64`/`arm64`, menjalankan native tanpa QEMU; apabila `x86_64`, memeriksa ketersediaan paket nyata melalui `apt-cache policy` dan `apt-cache show` pada kandidat `qemu-user`, `qemu-user-static`, `qemu-user-binfmt`, dan `qemu-user-binfmt-hwe`.
  2. Memvalidasi ketersediaan biner `qemu-aarch64-static` atau `qemu-aarch64` serta mencetak versi compiler, emulator, dan status `binfmt_misc`.

### 1.4 Penguatan Gerbang Sertifikasi & Kejujuran Mode Eksekusi (`src/build/certification.ts`)
- Menolak bukti `PASS` yang tidak konsisten pada `Phase23CertificationEngine.aggregateEvidence`: mismatch `triple`, klaim `sdk.available=false`, maupun klaim `execution.mode === 'native'` untuk target `isCross=true` atau `macos-x86_64` pada Apple Silicon (wajib `rosetta2` jika dijalankan lewat Rosetta 2).

---

## 2. Daftar Pengujian Baru (Phase 23.6)

| Berkas Uji | ID Uji | Cakupan |
|---|---|---|
| `pengujian/cicd/uji_cicd_workflow.ts` | `5.3` | Verifikasi `.github/workflows/ci.yml` mendeteksi QEMU via `apt-cache policy`, memeriksa native binding, dan menjalankan `verify-dist`. |
| `pengujian/cicd/uji_cicd_workflow.ts` | `6.3` | Verifikasi `MesinCI` terhadap `nusantara.toml` nyata di disk & 6 target kanonik beserta `daftarError` dan `diagnostikDistribusi`. |
| `pengujian/build/uji_build_distribusi_fase23.ts` | `7.9` | Penolakan klaim mode eksekusi `native` tidak jujur pada target cross / Rosetta. |
| `pengujian/build/uji_build_distribusi_fase23.ts` | `7.10` | Audit `package-lock.json` memuat seluruh binding native Win32/Darwin/Linux (`@rolldown/binding-*`, `@tailwindcss/oxide-*`, `lightningcss-*`, `@typescript/typescript-*`) dengan `resolved` + `integrity`. |
| `pengujian/build/uji_build_distribusi_fase23.ts` | `7.11` | Siklus E2E arsip distribusi: package `.tar.gz` -> ekstraksi -> verifikasi `SHA256SUMS`. |
