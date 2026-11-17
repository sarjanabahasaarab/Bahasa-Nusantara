# Dokumentasi Pengujian Phase 23 (`TEST ARCHITECTURE & REGRESSION`)

## 1. Perintah Pengujian Resmi
- Phase 23 Build & Distribusi: `npm run test:build-v23` (`pengujian/build/uji_build_distribusi_fase23.ts`)
- Phase 44 LLVM Backend & AOT: `npm run test:llvm-v44` (`pengujian/llvm/uji_llvm_fase44.ts`)
- Phase 45 Linker & Binary Inspector: `npm run test:linker-v45` (`pengujian/linker/uji_linker_fase45.ts`)
- Phase 24 CI/CD Validator: `npm run test:cicd` (`pengujian/cicd/uji_cicd.ts`)

## 2. Cakupan Skenario Pengujian (`uji_build_distribusi_fase23.ts`)
- **Grup 1 (1.1–1.3)**: Resolusi 6 target kanonik + alias warisan, penolakan target kosong/tak dikenal, deteksi kapabilitas host jujur.
- **Grup 1B (1B.1)**: 11 skenario string literal & escape UTF-8 memastikan bebas `@.str._v*` dan panjang byte IR valid.
- **Grup 2 (2.1–2.4)**: Pembuatan & ekstraksi PKZIP (CRC-32) dan POSIX USTAR `.tar.gz` (jalur >100 byte), verifikasi tamper `SHA256SUMS`, anti-traversal/jalur absolut.
- **Grup 3 (3.1–3.3)**: `BinaryInspector.inspectStrict` menolak skrip teks, memvalidasi ELF64/PE32+/Mach-O64, uji eksekusi native (`3.2`), preflight sysroot/CRT/`/usr/lib/*`/mismatch arsitektur x86_64<->arm64 & penolakan lintas OS (`3.3`).
- **Grup 4 (4.1–4.2)**: Reproducible archive checksum identik lintas build, CLI `nusantara bangun` JSON & file output.
- **Grup 5 (5.1–5.4)**: Auditor skrip PowerShell `.NET SHA256` + `UTF8Encoding($false)` bebas BOM, pembaca `bacaJsonAman`, sandbox lifecycle POSIX `install.sh`/`uninstall.sh`, sandbox PowerShell `.cmd` (`5.3`) & `PE32+` `.exe` (`5.4`).
- **Grup 6 (6.1–6.3)**: `StandalonePackager` menolak non-biner bila `requireNativeBinary=true`, bundel installer 3 OS, CLI `nusantara info --json`.
- **Grup 7 (7.1–7.28)**: Gerbang sertifikasi 6 target (hilang, korup, `NOT_VERIFIED`, `FAIL`, `SHA256_TIDAK_COCOK`, `ARSITEKTUR_BINER_SALAH`, `EKSEKUSI_GAGAL`, anti-klaim `native` palsu, `package-lock.json` native bindings, e2e arsip, `qemu-user`, anti-duplikat evidence, anti-symlink ZIP/TAR, proteksi archive bomb, preservasi izin `0o755`, rollback atomik, uninstall bersih menjaga file user, metadata ABI/CPU 6 target, dan inspeksi biner jujur tanpa stub).

## 3. Kebijakan Integritas Hasil Uji
- Pengujian `3.2`, `5.3`, dan `5.4` melapor `BELUM DIVERIFIKASI` (bukan `PASS`) apabila `clang` atau `pwsh`/Windows belum tersedia di host container lokal. Pada CI dengan runner native (`NUSANTARA_REQUIRE_CLANG=1`), kegagalan toolchain memicu error keras.
