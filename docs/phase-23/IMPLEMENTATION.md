# Implementasi Teknis Phase 23 — Build System & Desktop Distribution

## 1. Modul Utama
| Berkas | Tanggung Jawab |
| :--- | :--- |
| `src/build/types.ts` | Definisi tipe target kanonik, kapabilitas, hasil build native, manifest distribusi, dan skema sertifikasi v2.0. |
| `src/build/target-matrix.ts` | Deteksi kemampuan host/cross SDK, GCC cross compiler, QEMU user-mode, MSVC/WinSDK, dan Xcode SDK. |
| `src/build/native-pipeline.ts` | Orkestrasi preflight -> AOT/LLVM IR -> Object -> Linker -> `BinaryInspector` -> `DependencyInspector` -> Eksekusi host/emulator. |
| `src/build/archive-builder.ts` | Implementasi pure Node.js PKZIP + CRC-32, POSIX USTAR `.tar.gz` (>100 byte prefix split), SHA-256, anti-traversal, anti-symlink, dan proteksi archive bomb. |
| `src/build/installers.ts` | Generator installer atomik POSIX (`sh`) dan Windows PowerShell (`System.Security.Cryptography.SHA256`, `UTF8Encoding($false)` tanpa BOM) beserta mekanisme rollback saat gagal. |
| `src/build/distribution-packager.ts` | Pengemas mode `native` maupun `script-launcher` ke direktori, manifest bebas BOM, `SHA256SUMS`, `.zip`, dan `.tar.gz`. |
| `src/build/distribution-verifier.ts` | Verifikator end-to-end 18 tahap mulai dari sumber `.nusantara` hingga uji instalasi/upgrade/penolakan tamper/uninstall sandbox. |
| `src/build/certification.ts` | Engine agregasi sertifikasi 6 target dengan deteksi rahasia, anti-duplikasi evidence, validasi sentinel eksekusi, dan audit hash/header biner aktual. |
| `src/compiler/llvm/target-triple.ts` | Pemetaan target triple, data layout LLVM, ABI (`gnu`/`msvc`/`darwin-macho`), CPU default, dan flag CPU. |
| `src/compiler/executable/binary-inspector.ts` | Parser biner ELF64 (natively + `readelf`), PE32+ COFF (sections, imports, exports), dan Mach-O 64-bit (`LC_SEGMENT_64`, `LC_LOAD_DYLIB`). |
| `src/compiler/linker/dependency-inspector.ts` | Pemeriksaan library dinamis nyata pada disk tanpa fallback sintetis palsu. |
| `scripts/phase23-certify.ts` | Skrip CLI untuk runner matrix CI (`generate`, `verify-dist`, `aggregate`, `local-snapshot`) plus output `TARGET_REPORT-*.json` & `COMPILER_REPORT-*.json`. |

## 2. Profil Build & Perbaikan Phase 23
- **Profil `debug` vs `release`**: `NativeBuildOptions.mode` mengonfigurasi `optLevel` (`O0` vs `O2`), `debug` (`-g`), dan `strip` (`-s` untuk Linux ELF) secara konsisten.
- **Inspeksi Biner Tanpa Stub Palsu**: `BinaryInspector` tidak lagi mengisi `importedSymbols`, `exportedSymbols`, atau `dynamicLibraries` sintetis (`printf`/`libc.so.6`/`KERNEL32.dll`) ketika tabel biner kosong; ELF64 divalidasi bounds section header (`e_shoff`/`e_shnum`) secara native.
- **Installer Windows Bebas BOM**: `install.ps1` menggunakan `[System.Text.UTF8Encoding]::new($false)` agar file receipt JSON tidak rusak oleh UTF-8 BOM PowerShell 5.1.
