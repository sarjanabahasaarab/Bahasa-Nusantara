# Laporan Sertifikasi Teknis — Phase 23 (Build System & Desktop Distribution)

- **Proyek:** NUSANTARA Programming Language (`v0.50.0`)
- **Repositori / Branch:** `https://github.com/sarjanabahasaarab/Bahasa-Nusantara.git` / `main`
- **Status Workspace:** Baseline `v0.50.0` (container lokal tanpa direktori `.git` / untracked workspace)
- **Waktu Audit Lokal:** `2026-11-17`
- **Host / OS / Arsitektur:** Linux `4.19.0` (gVisor) `x86_64`, Node.js `v22.23.2`, npm `10.9.8`
- **Versi Toolchain Lokal:**
  - Terpasang: `gcc (Debian 12.2.0-14+deb12u1)`, `g++ 12.2.0`, GNU Binutils (`readelf`, `objdump`, `ldd`, `ld`, `strip`, `ar`, `nm`), `tar 1.34`, `unzip`, `sha256sum 9.1`
  - Tidak Terpasang: `clang`, `lld`, `ld.lld`, `llc`, `llvm-as`, `aarch64-linux-gnu-gcc`, `x86_64-w64-mingw32-gcc`, `pwsh` / `powershell.exe`, Windows SDK, macOS Xcode SDK

## 1. Perintah Verifikasi & Hasil Aktual

| Perintah | Exit Code | Ringkasan Hasil Aktual |
| :--- | :---: | :--- |
| `npm run lint` (`tsc --noEmit`) | `0` | Typecheck TypeScript bersih tanpa galat |
| `npm run test:build-v23` | `0` | **46 LULUS**, `0` GAGAL, **3 BELUM DIVERIFIKASI** (`3.2`, `5.3`, `5.4`) dari total `49` |
| `npm run test:llvm-v44` | `0` | **17 LULUS**, `0` GAGAL, **1 SKIPPED** (`8.1` eksekusi native butuh `clang`/`llc`) dari total `18` |
| `npm run test:linker-v45` | `0` | **21 LULUS**, `0` GAGAL, **1 SKIPPED** (`10.1` linking native butuh `clang`/`lld`) dari total `22` |
| `npm run test:cicd` | `0` | **25 LULUS**, `0` GAGAL |
| `npx tsx scripts/phase23-certify.ts local-snapshot --bundle-dir /tmp/nusa-p23-snapshot` | `0` (`--allow-incomplete`) | Gate Sertifikasi Lokal: **`PARTIAL`** (`PASS=0`, `NOT_VERIFIED=6`, `FAIL=0`, `MISSING=0`, `CORRUPT=0`) |

## 2. Perbaikan & Penguatan Implementasi yang Diselesaikan
1. **`BinaryInspector` (`src/compiler/executable/binary-inspector.ts`)**:
   - Menambahkan parser tabel section header ELF64 native dalam JavaScript (`e_shoff`, `e_shentsize`, `e_shnum`, `e_shstrndx` -> `.shstrtab`) + validasi batas file section header table.
   - Menggunakan `readelf -d --wide` & `readelf --dyn-syms --wide` pada ELF nyata dan parser PE Export Directory (`extractPEExports`) pada PE32+.
   - Menghapus seluruh fallback simbol/library sintetis (`printf`/`malloc`/`libc.so.6`/`ExitProcess`/`KERNEL32.dll`/`libSystem.B.dylib`) ketika tabel biner kosong.
2. **`DependencyInspector` (`src/compiler/linker/dependency-inspector.ts`)**:
   - Memeriksa segmen `DYNAMIC`/`INTERP` via `readelf -l` untuk biner cross-arch statically linked dan hanya mengizinkan daftar library default saat `!inspectedFromDisk`.
3. **`TargetTripleManager` & `NativeBuildPipeline` (`src/compiler/llvm/target-triple.ts`, `src/build/native-pipeline.ts`, `src/build/types.ts`)**:
   - Menambahkan metadata `abi` (`gnu`, `msvc`, `darwin-macho`), `defaultCpu`, dan `cpuFlags` pada ke-6 target serta dukungan profil `mode: 'debug' | 'release'`.
4. **Laporan Target & Kompilator (`scripts/phase23-certify.ts`)**:
   - Menyimpan `TARGET_REPORT-<target>.json` dan `COMPILER_REPORT-<target>.json` pada direktori laporan CI (`NUSANTARA_BUILD_REPORT_DIR`).
5. **Dokumentasi (`docs/phase-23/`) & Uji Regresi Baru**:
   - Membuat 8 dokumen lengkap di `docs/phase-23/` dan menambah uji `7.27` serta `7.28` pada `uji_build_distribusi_fase23.ts`.

## 3. Kondisi & Kendala yang Terverifikasi Jujur (`BELUM DIVERIFIKASI`)
- **Test `3.2` (`test:build-v23`) & `8.1`/`10.1` (`test:llvm-v44`, `test:linker-v45`)**: Memerlukan `clang` & `lld` untuk kompilasi objek + tautan biner mesin nyata.
- **Test `5.3` & `5.4` (`test:build-v23`)**: Memerlukan `pwsh` / Windows PowerShell dan compiler PE32+ Windows.
- **Sertifikasi 6 Target (`CERTIFIED`)**: Memerlukan eksekusi job matriks multi-OS pada `.github/workflows/ci.yml` (`windows-latest`, `windows-11-arm`, `ubuntu-latest`, `ubuntu-24.04-arm`, `macos-latest`).

## 4. Klasifikasi Status Akhir Phase 23
- **Status Lokal (Container Linux x86_64 tanpa Clang/PowerShell):** **`PARTIAL`** *(Keterbatasan toolchain lokal tetap berlaku; hasil lokal tidak disamakan dengan validasi runner CI.)*
- **Status CI lintas platform (23 November 2026):** **`PASS`** untuk keenam target native, berdasarkan evidence GitHub Actions dan agregasi sertifikasi Phase 23. Rincian bukti CI terbaru dicatat pada bagian 5.


## 5. Pembaruan Evidence GitHub Actions — 23 November 2026

**Hasil matriks native enam target:** `PASS=6/6`, `NOT_VERIFIED=0`, `FAIL=0`, `MISSING=0`, `CORRUPT=0`. Gerbang Phase 23 melaporkan `unitTestStatus=PASS`, `nativeVerificationStatus=PASS`, dan `status=PASS`.

Validasi ini berasal dari workflow PR #49 yang memperbaiki runner macOS x86_64. PR tersebut kemudian tercatat telah masuk ke `main` pada merge commit `31beb4c1bd68659441e87f98b937840c84d2c213`.

**Bukti khusus macOS x86_64** dari artifact `phase23-evidence-macos-x86_64`:
- Runner workflow: `macos-15-intel`.
- `hostArchitecture=x86_64`, `isCross=false`.
- `executionMode=native`, `emulator.used=false`.
- Binary format `Mach-O`, arsitektur `x86_64`.
- Native execution sentinel `NUSANTARA_NATIVE_CI_OK` cocok dan exit code `0`.
- Install, upgrade, tamper rejection, dan uninstall distribusi semuanya `PASS`.

**Pemisahan status:** hasil CI enam target ini tidak mengubah status lokal container Linux dan tidak otomatis menyatakan Phase 36–42 selesai. Sertifikasi keseluruhan tetap mengikuti laporan gerbang terpusat; kebutuhan display fisik, perangkat mobile fisik, signing iOS, dan integrasi SDK toko tetap harus dibuktikan secara terpisah.
