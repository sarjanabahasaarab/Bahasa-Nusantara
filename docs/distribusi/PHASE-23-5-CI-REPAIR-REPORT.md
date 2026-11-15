# Laporan Audit & Perbaikan Phase 23.5 — Windows UTF-8 Manifest Repair, Native Linker Test Fix & CI Matrix Reactivation

**Proyek:** NUSANTARA Programming Language & NUSANTARA OS (`v0.50.0` pada cabang `main`)  
**Target:** Phase 23.5 (`v0.23.5`)  
**Basis Commit:** `8bd65bc4c3334c0e12673cd205b17653d2c96c1d`  
**Tanggal Laporan:** 15 November 2026  

---

## 1. Ringkasan Eksekutif & Status Kejujuran Teknis

Phase 23.5 memperbaiki dua kegagalan regresi GitHub Actions pasca Phase 23.4, memulihkan modul build Phase 23 (`src/build/`) serta suite ujinya (`pengujian/build/uji_build_distribusi_fase23.ts`), dan mengaktifkan kembali seluruh tahapan validasi matriks 6 target pada `.github/workflows/ci.yml`:

1. **Penghapusan UTF-8 BOM pada Receipt & Manifest PowerShell Windows (`src/build/installers.ts`, `pengujian/build/uji_build_distribusi_fase23.ts`):**
   - Pada Windows PowerShell 5.1 (`powershell.exe`), `Set-Content -Encoding UTF8` dan `Out-File -Encoding UTF8` menambahkan **UTF-8 Byte Order Mark (`0xEF 0xBB 0xBF`)** di awal berkas JSON, yang menyebabkan `JSON.parse()` pada Node.js gagal membaca receipt instalasi (`SyntaxError: Unexpected token ... in JSON at position 0`).
   - Diperbaiki pada sumber dengan fungsi `Write-NusantaraUtf8NoBomAtomic` menggunakan `.NET` `New-Object System.Text.UTF8Encoding($false)` dan `[System.IO.File]::WriteAllText(...)` ke berkas sementara, diikuti `Move-Item -Force` atomik.
   - Ditambahkan utilitas defensif `bacaJsonAman()` serta pengujian eksplisit **Test `5.1b`** (menguji JSON polos, JSON dengan BOM `0xEF 0xBB 0xBF`, dan penolakan JSON rusak) serta verifikasi byte-level anti-BOM di **Test `5.3`** & **Test `5.4`**.
2. **Perbaikan Pengujian Linker Native Phase 45 (`pengujian/linker/uji_linker_fase45.ts`, `src/compiler/linker/{static,dynamic}-linker.ts`, `src/compiler/llvm/toolchain-manager.ts`):**
   - **Akar Masalah `Test 10.1`:** Sebelumnya `Test 10.1` memanggil `linkerMgr.link({ objectFiles: [], outputExecutable: ..., isStatic: true })`. Pada macOS Darwin maupun target lain, menautkan **tanpa berkas objek** serta memaksakan **`-static`** (Apple tidak menyediakan `crt0.o` user-space) pasti gagal di linker native.
   - **Perbaikan:** `Test 10.1` kini mengompilasi sumber C nyata yang memanggil `nusantara_cetak_teks("NUSANTARA_PHASE45_LINKER_OK")` menjadi berkas objek nyata (`.o`/`.obj`), memvalidasi magic header objek (ELF/Mach-O/COFF), menautkannya secara dinamis (`isStatic: false`) melalui `LinkerManager`, menginspeksi biner keluaran dengan `BinaryInspector.inspectStrict`, dan mengeksekusi biner tersebut untuk memverifikasi `exitCode === 0` serta sentinel stdout `NUSANTARA_PHASE45_LINKER_OK`.
   - Ditambahkan **Test `10.2`** untuk memverifikasi kontrak penolakan keras terhadap `objectFiles: []` (`OBJ_INPUT_KOSONG`) dan penolakan `-static` pada target Darwin (`STATIC_TIDAK_DIDUKUNG_DARWIN`).
   - `StaticLinker` dan `DynamicLinker` diperkuat agar memisahkan driver Clang/cross-GCC dari binary LLD mentah, memvalidasi keberadaan & ukuran berkas objek di disk sebelum menautkan, dan menyertakan diagnostik lengkap (`exitCode`, `stdout`, `stderr`, `targetTriple`, `commandExecuted`). `LLVMToolchainManager` turut menambahkan fallback `ld64.lld` dan pembacaan `stdout || stderr`.
3. **Reaktivasi & Sinkronisasi Matriks CI 6 Target (`.github/workflows/ci.yml`):**
   - Job `build-matrix-validation` kini menjalankan `npm run test:llvm-v44`, `npm run test:linker-v45`, dan `npm run test:build-v23` berurutan dengan `NUSANTARA_REQUIRE_CLANG=1` pada keenam target (`windows-x86_64`, `windows-arm64`, `linux-x86_64`, `linux-arm64`, `macos-x86_64`, `macos-arm64`), diikuti `scripts/phase23-certify.ts generate`, pengunggahan evidence JSON per target, dan gerbang agregasi wajib `phase23-certification-gate`.
4. **Perbaikan Portabilitas POSIX `sed` pada `install.sh` (`src/build/installers.ts`) & Sintaks Grup 1B:**
   - Mengganti regex BRE non-portabel pada loop parsing `SHA256SUMS` di `install.sh` dengan `sed -e 's/^[0-9a-fA-F]*[[:space:]]*//' -e 's/^\*//'` agar identik di GNU `sed` Linux dan BSD `sed` macOS.
   - Memperbaiki kata kunci contoh uji Grup 1B `uji_build_distribusi_fase23.ts` (`tampilkan`, `jika-maka-selain-akhir`, `selama-lakukan-akhir`).

**Status Jujur Lingkungan Lokal Saat Ini:**
- Seluruh pengujian lokal dijalankan pada container **Debian Linux `x86_64` (`Node.js v22.23.2`, `npm 10.9.8`)**.
- Perkakas `clang`, `llc`, `lld`, `pwsh`, maupun runner macOS/Windows tidak terpasang pada container lokal saat ini. Karena itu:
  - Test `3.2`, `5.3`, `5.4` di `test:build-v23` tetap berstatus **`BELUM_DIVERIFIKASI`** secara jujur saat lokal (dan `NUSANTARA_REQUIRE_CLANG=1 npm run test:build-v23` keluar dengan kode `1` sesuai desain).
  - Test `8.1` (`test:llvm-v44`), `10.1` (`test:linker-v45`), dan uji clang/lld (`test:actor-v46`) tetap berstatus **`SKIPPED`** secara transparan di container lokal.
  - Snapshot lokal `npx tsx scripts/phase23-certify.ts local-snapshot --bundle-dir artifacts/phase23` melaporkan status **`PARTIAL`** (`PASS=0 | NOT_VERIFIED=6 | FAIL=0`).
  - **Status Phase 23 tetap `🟠 SELESAI SEBAGIAN`** sampai GitHub Actions menjalankan seluruh runner (`ubuntu-latest`, `windows-latest`, `macos-latest`) dan `phase23-certification-gate` menghasilkan **`CERTIFIED` (6/6 `PASS`)**.

---

## 2. Daftar Berkas yang Dibuat / Diperbaiki pada Phase 23.5

| Berkas | Perubahan Utama |
|---|---|
| `src/build/types.ts`, `archive-builder.ts`, `target-matrix.ts`, `native-pipeline.ts`, `distribution-packager.ts`, `certification.ts`, `index.ts` | Memulihkan & mengetik ulang modul sistem build Phase 23 secara utuh beserta tipe ketat TypeScript 7. |
| `src/build/installers.ts` | Menambahkan `Write-NusantaraUtf8NoBomAtomic` (`UTF8Encoding($false)` + temp file + `Move-Item`) di `install.ps1`, mempertahankan `.NET SHA256::Create()`, serta mengganti ekspresi `sed` parsing `SHA256SUMS` di `install.sh` menjadi ekspresi BRE POSIX portabel. |
| `src/compiler/linker/static-linker.ts`, `dynamic-linker.ts` | Validasi input `objectFiles` tidak kosong, terverifikasi ada di disk, & > 0 byte (`OBJ_INPUT_KOSONG`, `OBJ_TIDAK_DITEMUKAN`, `OBJ_KOSONG`); penolakan `-static` pada Darwin (`STATIC_TIDAK_DIDUKUNG_DARWIN`); pemisahan driver Clang/GCC vs binary LLD; pelaporan `exitCode`, `stdout`, `stderr`, `targetTriple`, dan `commandExecuted`. |
| `src/compiler/llvm/toolchain-manager.ts` | Penambahan fallback binary `ld64.lld` serta pembacaan versi via `(res.stdout \|\| res.stderr)`. |
| `pengujian/linker/uji_linker_fase45.ts` | Perbaikan `Test 10.1` (compile C -> `.o`/`.obj` -> cek magic -> `LinkerManager` dynamic link -> `BinaryInspector.inspectStrict` -> eksekusi + sentinel `NUSANTARA_PHASE45_LINKER_OK`) dan penambahan `Test 10.2` ( penolakan `OBJ_INPUT_KOSONG` & `STATIC_TIDAK_DIDUKUNG_DARWIN`). |
| `pengujian/build/uji_build_distribusi_fase23.ts` | Penambahan helper `bacaJsonAman()` + `Test 5.1b`, verifikasi byte anti-BOM di `5.3` & `5.4`, perbaikan sintaks `tampilkan`/`jika`/`selama` di Grup 1B (`1B.1`), serta cakupan lengkap 28 skenario Phase 23.1–23.5. |
| `.github/workflows/ci.yml` | Penambahan `npm run test:linker-v45` bersama `test:llvm-v44` & `test:build-v23` pada `build-matrix-validation` dengan `NUSANTARA_REQUIRE_CLANG=1` untuk seluruh 6 target desktop. |

---

## 3. Hasil Pengujian Terverifikasi Lokal (`Linux x86_64`, Node `v22.23.2`)

| Perintah Uji | Hasil Aktual | Catatan |
|---|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS (exit 0)** | 0 galat tipe TypeScript |
| `npm run test:build-v23` | **25 LULUS, 0 GAGAL, 3 BELUM DIVERIFIKASI (Total: 28)** | Grup 1B, `5.1b` anti-BOM, `5.2` POSIX sandbox, Grup 7 Phase 23.2 LULUS; `3.2`, `5.3`, `5.4` `BELUM DIVERIFIKASI` tanpa `clang`/`pwsh` |
| `NUSANTARA_REQUIRE_CLANG=1 npm run test:build-v23` | **FAIL sesuai desain (exit 1)** | Membuktikan mode ketat CI gagal keras apabila `clang` tidak ditemukan |
| `npm run test:linker-v45` | **21 LULUS, 0 GAGAL, 1 SKIPPED (Total: 22)** | `10.2` LULUS; `10.1` `SKIPPED` secara jujur tanpa `clang` |
| `npm run test:llvm-v44` | **17 LULUS, 0 GAGAL, 1 SKIPPED (Total: 18)** | Kelompok 9 (`@.str.*`) LULUS; `8.1` `SKIPPED` tanpa `clang` |
| `npm run test:cicd` | **21 LULUS, 0 GAGAL** | Validasi `.github/workflows/ci.yml` & `release.yml` LULUS |
| `npm test` (46 perintah uji) | **1.475 pemeriksaan** (`167` fondasi + `1.308` TS: **1.302 LULUS, 0 GAGAL, 3 SKIPPED, 3 BELUM DIVERIFIKASI**) | Seluruh Phase 1–50 bebas regresi |
| `npm run test:database-browser-v29` | **3 LULUS, 0 GAGAL** | Fallback browser terpisah tetap berjalan baik |
| `npm run build` | **PASS (exit 0)** | Bundel produksi Vite selesai bersih dalam 2,80 detik |
| `npx tsx scripts/phase23-certify.ts local-snapshot --bundle-dir artifacts/phase23` | **`PARTIAL` (`PASS=0 \| NOT_VERIFIED=6 \| FAIL=0`)** | Tercatat jujur pada `artifacts/phase23/PHASE-23-CERTIFICATION-REPORT.md` |

---

## 4. Langkah Lanjutan (Menunggu Eksekusi GitHub Actions)

Pipeline CI `.github/workflows/ci.yml` siap mengeksekusi seluruh rangkaian uji pada runner nyata `ubuntu-latest`, `windows-latest`, dan `macos-latest` setelah perubahan ini dikomit dan di-push ke repositori oleh pengelola proyek. Target yang telah lolos verifikasi nyata di runner CI nantinya dapat dievaluasi melalui artefak `phase23-certification-report` dan `PHASE-23-CERTIFICATION-REPORT.md`.
