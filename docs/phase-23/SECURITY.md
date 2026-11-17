# Keamanan Build System & Distribusi Desktop (Phase 23)

## 1. Eksekusi Toolchain Bebas Injeksi Shell
- Seluruh pemanggilan `clang`, `llc`, `opt`, `lld`, `readelf`, `ldd`, `otool`, `sh`, `powershell.exe`, `pwsh`, dan `qemu-aarch64` menggunakan `spawnSync(..., { shell: false })` dengan daftar argumen eksplisit. Tidak ada penggabungan string ke shell OS.

## 2. Proteksi Ekstraksi Arsip (`ArchiveBuilder`)
- **Anti Path Traversal & Jalur Absolut**: `resolveSafeSubpath` menolak `..`, byte `\0`, prefiks `/`, `\`, serta drive letter Windows `C:`.
- **Anti Symlink & Hardlink**: `extractZip` menolak atribut POSIX symlink `0o120000`; `extractTarGz` menolak `typeFlag === '1' | '2'`.
- **Anti Archive Bomb**: Batas default `maxEntries=10_000`, `maxEntryBytes=256 MiB`, `maxTotalBytes=512 MiB`, `maxCompressionRatio=500x` baik sebelum maupun sesudah inflasi, disertai pengecekan CRC-32 ZIP & checksum header TAR USTAR.

## 3. Keamanan Installer & Integritas Biner
- Installer POSIX (`install.sh`) dan Windows (`install.ps1`) wajib memverifikasi seluruh entri `SHA256SUMS` sebelum menyalin berkas apa pun ke prefix tujuan.
- Jika langkah instalasi gagal setelah menyalin biner/manifest, mekanisme backup-and-restore atomik memulihkan versi sebelumnya.
- `Phase23CertificationEngine` menolak artefak yang mengandung pola token rahasia (`ghp_`, `github_pat_`, `AIza`, `sk-`, `PRIVATE KEY`), menolak duplikasi hash biner/IR/arsip antar target, dan memverifikasi kecocokan `SHA-256` serta format ELF/PE32+/Mach-O di disk.

## 4. Batasan Keamanan Terbuka
- Penandatanganan paket desktop menggunakan sertifikat code-signing sistem operasi (Authenticode `.exe`/MSIX atau Apple `codesign`/notarization) belum menjadi bagian Phase 23 saat ini; integritas distribusi dijaga via `SHA256SUMS` deterministik.
