# Spesifikasi Paket Distribusi Desktop & Verifikasi Integritas (Phase 23)

## Struktur Paket Resmi

```text
<app>-<versi>-<target>/
├── bin/
│   └── <app>[.exe]      (Biner native ELF64/PE32+/Mach-O atau launcher CLI)
├── lib/                 (Shared library bila diperlukan; RPATH $ORIGIN / @executable_path)
├── config/              (Konfigurasi opsional)
├── resources/           (Aset aplikasi opsional)
├── install.sh / .ps1    (Skrip instalasi resmi + cek SHA-256 + rollback upgrade)
├── uninstall.sh / .ps1  (Skrip pencopotan bersih)
├── manifest.json        (Metadata paket: targetTriple, packageKind, linkingMode, executableSha256)
├── SHA256SUMS           (Checksum seluruh berkas internal paket)
├── LISENSI.txt          (Apache-2.0)
└── BACA-SAYA.txt
```

## Format Arsip & Keamanan

- **Windows**: `.zip` (PKZIP + CRC-32 standar melalui `ZipBuilder`).
- **Linux & macOS**: `.tar.gz` (POSIX USTAR + permission bit `0o755`/`0o644` + `node:zlib` GZIP level 9) dan `.zip`.
- **Reproducible Build**: Secara default menetapkan `mtime = 0`, pengurutan entri alfabetis, dan timestamp manifest tetap (`1970-01-01T00:00:00.000Z`). Gunakan `--no-reproducible` untuk memakai stempel waktu saat ini.
- **Anti-Path Traversal**: `ArchiveBuilder` menolak jalur absolut (`/`, `C:\`), segmen `..`, serta entri symlink/hardlink ketika mengekstrak arsip.

## Klasifikasi Jujur `packageKind`

1. `native`: Paket berisi executable native hasil kompilasi LLVM + linking Clang/LLD (`BinaryInspector.inspectStrict` wajib lulus).
2. `script-launcher`: Paket peluncur CLI/runtime Node.js (digunakan ketika `--source` / `--native` tidak diberikan atau pada lingkungan validasi CI tanpa sumber `.nusantara` target).
