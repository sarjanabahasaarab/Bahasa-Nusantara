# Laporan Sertifikasi Desktop 6 Target — Phase 23 (NUSANTARA)

- **Status Keseluruhan:** `PARTIAL` — PARTIAL (BELUM LENGKAP)
- **Total Target Wajib:** 6
- **Ringkasan Hitungan:** PASS=0, NOT_VERIFIED=6, FAIL=0, MISSING=0, CORRUPT=0
- **Waktu Agregasi:** 2026-11-15T01:28:53.032Z

## Matriks Sertifikasi Enam Target

| Target | Triple | Host | Compiler / Linker | Format / Arch | SHA-256 Executable | Mode Eksekusi | Status | Keterangan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `windows-x86_64` | `x86_64-pc-windows-msvc` | linux/x64 | none / none | N/A | - | `cross-compiled-not-executed` | **NOT_VERIFIED** | Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.; Cross-SDK Windows (x86_64) belum tersedia di host x86_64-unknown-linux-gnu (pasang MinGW-w64/llvm-mingw atau MSVC + Windows SDK ARM64 di runner Windows/windows-11-arm). |
| `windows-arm64` | `aarch64-pc-windows-msvc` | linux/x64 | none / none | N/A | - | `cross-compiled-not-executed` | **NOT_VERIFIED** | Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.; Cross-SDK Windows (aarch64) belum tersedia di host x86_64-unknown-linux-gnu (pasang MinGW-w64/llvm-mingw atau MSVC + Windows SDK ARM64 di runner Windows/windows-11-arm). |
| `linux-x86_64` | `x86_64-unknown-linux-gnu` | linux/x64 | none / none | N/A | - | `not-executed` | **NOT_VERIFIED** | Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH. |
| `linux-arm64` | `aarch64-unknown-linux-gnu` | linux/x64 | none / none | N/A | - | `cross-compiled-not-executed` | **NOT_VERIFIED** | Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.; Cross-SDK Linux ARM64 belum tersedia (pasang gcc-aarch64-linux-gnu / sysroot arm64 atau setel NUSANTARA_SYSROOT_LINUX_ARM64). |
| `macos-x86_64` | `x86_64-apple-darwin` | linux/x64 | none / none | N/A | - | `cross-compiled-not-executed` | **NOT_VERIFIED** | Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.; Cross-compile ke macOS (x86_64) dari x86_64-unknown-linux-gnu membutuhkan OSXCross/Apple SDK atau runner macos-15-intel / macos-13 (atau macos-latest + Rosetta 2). |
| `macos-arm64` | `arm64-apple-darwin` | linux/x64 | none / none | N/A | - | `cross-compiled-not-executed` | **NOT_VERIFIED** | Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.; Cross-compile ke macOS (aarch64) dari x86_64-unknown-linux-gnu membutuhkan OSXCross/Apple SDK atau runner macos-latest. |

## Temuan Audit & Integritas

- **[WARNING / TARGET_NOT_VERIFIED]** `windows-x86_64`: Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.; Cross-SDK Windows (x86_64) belum tersedia di host x86_64-unknown-linux-gnu (pasang MinGW-w64/llvm-mingw atau MSVC + Windows SDK ARM64 di runner Windows/windows-11-arm).
- **[WARNING / TARGET_NOT_VERIFIED]** `windows-arm64`: Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.; Cross-SDK Windows (aarch64) belum tersedia di host x86_64-unknown-linux-gnu (pasang MinGW-w64/llvm-mingw atau MSVC + Windows SDK ARM64 di runner Windows/windows-11-arm).
- **[WARNING / TARGET_NOT_VERIFIED]** `linux-x86_64`: Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.
- **[WARNING / TARGET_NOT_VERIFIED]** `linux-arm64`: Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.; Cross-SDK Linux ARM64 belum tersedia (pasang gcc-aarch64-linux-gnu / sysroot arm64 atau setel NUSANTARA_SYSROOT_LINUX_ARM64).
- **[WARNING / TARGET_NOT_VERIFIED]** `macos-x86_64`: Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.; Cross-compile ke macOS (x86_64) dari x86_64-unknown-linux-gnu membutuhkan OSXCross/Apple SDK atau runner macos-15-intel / macos-13 (atau macos-latest + Rosetta 2).
- **[WARNING / TARGET_NOT_VERIFIED]** `macos-arm64`: Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.; Cross-compile ke macOS (aarch64) dari x86_64-unknown-linux-gnu membutuhkan OSXCross/Apple SDK atau runner macos-latest.

---
Gerbang sertifikasi Phase 23 belum berstatus CERTIFIED; Phase 23 tetap berstatus SELESAI SEBAGIAN hingga seluruh 6 target berstatus PASS.
