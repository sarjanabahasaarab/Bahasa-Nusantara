# Kriteria Penerimaan Phase 23 (Build System & Desktop Distribution)

| ID Kriteria | Deskripsi Kriteria Penerimaan | Status Terukur (Workspace Lokal) | Bukti Teknis |
| :--- | :--- | :---: | :--- |
| P23-AC1 | Resolusi tepat 6 target kanonik + alias warisan & ABI/CPU flag, serta penolakan target tidak dikenal. | **PASS** | `uji_build_distribusi_fase23.ts` test `1.1`, `1.2`, `7.27`. |
| P23-AC2 | Lowering AST -> NIR -> LLVM IR bebas simbol `@.str._v*` & escape UTF-8 akurat. | **PASS** | `uji_build_distribusi_fase23.ts` test `1B.1`; `uji_llvm_fase44.ts` `9.1–9.3`. |
| P23-AC3 | Preflight sysroot, CRT, `/usr/lib/*`, mismatch arsitektur x86_64<->arm64 tanpa output fallback palsu. | **PASS** | `uji_build_distribusi_fase23.ts` test `3.3 (A–H)`. |
| P23-AC4 | Inspeksi biner ELF64 / PE32+ / Mach-O64 jujur tanpa fabrikasi simbol/library palsu & penolakan skrip palsu. | **PASS** | `uji_build_distribusi_fase23.ts` test `3.1`, `7.28`; `uji_linker_fase45.ts` `6.1`, `6.2`. |
| P23-AC5 | Pembuatan arsip deterministik `.zip` (CRC-32) & `.tar.gz` (USTAR >100 byte), verifikasi `SHA256SUMS`, anti-traversal, anti-symlink, anti-bomb, preservasi `0o755`. | **PASS** | `uji_build_distribusi_fase23.ts` test `2.1–2.4`, `4.1`, `7.22–7.24`. |
| P23-AC6 | Installer POSIX sandbox lifecycle lengkap (install -> sentinel check -> upgrade -> tamper reject -> atomic rollback -> clean uninstall). | **PASS** | `uji_build_distribusi_fase23.ts` test `5.2`, `7.21`, `7.25`, `7.26`. |
| P23-AC7 | Generator PowerShell Windows bebas BOM (`UTF8Encoding($false)`) & `.NET SHA256`. | **PASS (Generator & Parser)** / **NOT_VERIFIED (Runtime PowerShell)** | `5.1`, `5.1b` PASS; `5.3`, `5.4` jujur `BELUM DIVERIFIKASI` karena `pwsh` dan `clang` tidak terpasang di Linux container. |
| P23-AC8 | Kompilasi & eksekusi biner native end-to-end 6 target lintas OS + sertifikasi `CERTIFIED`. | **NOT_VERIFIED (Lokal)** | `3.2` jujur `BELUM DIVERIFIKASI` tanpa `clang`; butuh runner GitHub Actions 6-target (`ubuntu-latest`, `ubuntu-24.04-arm`, `windows-latest`, `windows-11-arm`, `macos-latest`). |

**Kesimpulan Status Phase 23:** `PARTIAL` di lingkungan container lokal Linux x86_64 (karena ketiadaan `clang`, `lld`, `pwsh`, serta runner Windows/macOS/ARM64), siap diverifikasi penuh `CERTIFIED` pada pipeline CI 6-target GitHub Actions.
