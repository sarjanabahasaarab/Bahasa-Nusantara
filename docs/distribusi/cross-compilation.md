# Panduan Cross-Compilation 6 Target Desktop (Phase 23)

NUSANTARA mendukung pemetaan target resmi berikut melalui `TargetMatrixManager` (`src/build/target-matrix.ts`) dan `TargetTripleManager`:

| Target Kanonikal | Alias | LLVM Triple | Format Biner | Runner CI Direkomendasikan |
| :--- | :--- | :--- | :--- | :--- |
| `windows-x86_64` | `windows-x64` | `x86_64-pc-windows-msvc` | PE32+ (`.exe`) | `windows-latest` |
| `windows-arm64` | `windows-aarch64` | `aarch64-pc-windows-msvc` | PE32+ (`.exe`) | `windows-11-arm` / Windows SDK ARM64 |
| `linux-x86_64` | `linux-x64` | `x86_64-unknown-linux-gnu` | ELF64 | `ubuntu-latest` |
| `linux-arm64` | `linux-aarch64` | `aarch64-unknown-linux-gnu` | ELF64 | `ubuntu-24.04-arm` / `aarch64-linux-gnu` |
| `macos-x86_64` | `macos-x64` | `x86_64-apple-darwin` | Mach-O 64-bit | `macos-13` / macOS Universal SDK |
| `macos-arm64` | `macos-aarch64` | `arm64-apple-darwin` | Mach-O 64-bit | `macos-latest` |

## Validasi Sysroot & Cross-SDK

Compiler Clang saja tidak cukup untuk cross-linking antar OS tanpa pustaka sistem (*sysroot* / *C runtime*) milik OS tujuan. `TargetMatrixManager.inspectTargetCapability()` memeriksa keberadaan komponen tersebut secara jujur sebelum linking:

- **Linux ARM64 di host Linux x86_64**: Memeriksa `aarch64-linux-gnu-gcc`, `/usr/aarch64-linux-gnu`, atau variabel lingkungan `NUSANTARA_SYSROOT_LINUX_ARM64`. Penautan otomatis memakai `aarch64-linux-gnu-gcc`, inspeksi dependensi memakai `readelf -d`, dan verifikasi eksekusi mendukung `qemu-aarch64-static` dengan status transparan `executionMode: 'qemu-user'`.
- **Windows di host non-Windows / ARM64 di runner x64**: Memeriksa `x86_64-w64-mingw32-gcc` / `aarch64-w64-mingw32-gcc`, `VCToolsInstallDir/lib/arm64`, atau `NUSANTARA_SYSROOT_WINDOWS_X64` / `NUSANTARA_SYSROOT_WINDOWS_ARM64`. Jika pustaka ARM64 MSVC tidak terpasang pada runner `windows-latest`, target `windows-arm64` dilaporkan jujur sebagai `NOT_VERIFIED`.
- **macOS (`x86_64` <-> `arm64`)**: Pada host Darwin, Apple Clang mendukung cross-compile arsitektur dengan `-isysroot` dari `xcrun --show-sdk-path`. Pada host non-Darwin memerlukan `OSXCROSS_ROOT` / `NUSANTARA_SYSROOT_MACOS`.

Bila cross-SDK tidak tersedia, pipeline mengembalikan status `CROSS_SDK_TIDAK_TERSEDIA` dengan rincian kebutuhan yang belum terpasang. Lihat [Laporan Perbaikan Phase 23.1](PHASE-23-1-LLVM-IR-REPAIR-REPORT.md).
