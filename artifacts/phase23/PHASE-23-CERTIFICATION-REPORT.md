# Laporan Sertifikasi 6 Target Desktop NUSANTARA (Phase 23)

- **Status Keseluruhan:** `PARTIAL` (exitCode=1)
- **Ringkasan:** PASS=0/6 | NOT_VERIFIED=6 | FAIL=0 | MISSING=0 | CORRUPT=0

| Target | Triple | Status | Host OS/Arch | Compiler / Linker | Format / Arch | Mode Eksekusi | Distribusi | Keterangan |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| `windows-x86_64` | `x86_64-pc-windows-msvc` | **NOT_VERIFIED** | linux/x86_64 | none / none | - | not-executed | NOT_RUN | Target 'windows-x86_64' belum dapat diverifikasi pada host ini: MSVC CRT (libcmt.lib/msvcrt.lib) & Windows SDK (kernel32.lib/ucrt.lib) tidak tersedia di host non-Windows. |
| `windows-arm64` | `aarch64-pc-windows-msvc` | **NOT_VERIFIED** | linux/x86_64 | none / none | - | not-executed | NOT_RUN | Target 'windows-arm64' belum dapat diverifikasi pada host ini: MSVC CRT (libcmt.lib/msvcrt.lib) & Windows SDK (kernel32.lib/ucrt.lib) tidak tersedia di host non-Windows. |
| `linux-x86_64` | `x86_64-unknown-linux-gnu` | **NOT_VERIFIED** | linux/x86_64 | none / none | - | not-executed | NOT_RUN | Target 'linux-x86_64' belum dapat diverifikasi pada host ini: clang (driver compiler + linker C runtime) tidak ditemukan di PATH. |
| `linux-arm64` | `aarch64-unknown-linux-gnu` | **NOT_VERIFIED** | linux/x86_64 | none / aarch64-linux-gnu-gcc | - | not-executed | NOT_RUN | Target 'linux-arm64' belum dapat diverifikasi pada host ini: llvm / clang (objek generator) tidak tersedia.; libc6-dev-arm64-cross (/usr/aarch64-linux-gnu) tidak ditemukan. |
| `macos-x86_64` | `x86_64-apple-darwin` | **NOT_VERIFIED** | linux/x86_64 | none / none | - | not-executed | NOT_RUN | Target 'macos-x86_64' belum dapat diverifikasi pada host ini: clang tidak tersedia; Apple MacOSX.sdk / OSXCross sysroot (wajib runner macos-latest/macos-13) |
| `macos-arm64` | `arm64-apple-darwin` | **NOT_VERIFIED** | linux/x86_64 | none / none | - | not-executed | NOT_RUN | Target 'macos-arm64' belum dapat diverifikasi pada host ini: clang tidak tersedia; Apple MacOSX.sdk / OSXCross sysroot (wajib runner macos-latest/macos-13) |

## Temuan Audit
- **[WARNING][TARGET_NOT_VERIFIED]** `windows-x86_64`: Target 'windows-x86_64' belum dapat diverifikasi pada host ini: MSVC CRT (libcmt.lib/msvcrt.lib) & Windows SDK (kernel32.lib/ucrt.lib) tidak tersedia di host non-Windows.
- **[WARNING][TARGET_NOT_VERIFIED]** `windows-arm64`: Target 'windows-arm64' belum dapat diverifikasi pada host ini: MSVC CRT (libcmt.lib/msvcrt.lib) & Windows SDK (kernel32.lib/ucrt.lib) tidak tersedia di host non-Windows.
- **[WARNING][TARGET_NOT_VERIFIED]** `linux-x86_64`: Target 'linux-x86_64' belum dapat diverifikasi pada host ini: clang (driver compiler + linker C runtime) tidak ditemukan di PATH.
- **[WARNING][TARGET_NOT_VERIFIED]** `linux-arm64`: Target 'linux-arm64' belum dapat diverifikasi pada host ini: llvm / clang (objek generator) tidak tersedia.; libc6-dev-arm64-cross (/usr/aarch64-linux-gnu) tidak ditemukan.
- **[WARNING][TARGET_NOT_VERIFIED]** `macos-x86_64`: Target 'macos-x86_64' belum dapat diverifikasi pada host ini: clang tidak tersedia; Apple MacOSX.sdk / OSXCross sysroot (wajib runner macos-latest/macos-13)
- **[WARNING][TARGET_NOT_VERIFIED]** `macos-arm64`: Target 'macos-arm64' belum dapat diverifikasi pada host ini: clang tidak tersedia; Apple MacOSX.sdk / OSXCross sysroot (wajib runner macos-latest/macos-13)
