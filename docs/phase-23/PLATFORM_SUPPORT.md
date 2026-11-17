# Matriks Dukungan Platform Phase 23

| Target Kanonik | Alias Warisan | Target Triple LLVM | Format Objek/Biner | ABI | CPU Default | Ekstensi Arsip Utama | Status Verifikasi Lokal (Linux x86_64 gVisor, tanpa clang/pwsh) | Runner Target CI (`.github/workflows/ci.yml`) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `linux-x86_64` | `linux-x64` | `x86_64-unknown-linux-gnu` | ELF64 | `gnu` | `x86-64` | `.tar.gz`, `.zip` | Kompilasi AOT LLVM IR & pengemasan distribusi/installer POSIX **TERUJI**; build biner Clang native `NOT_VERIFIED` (clang tidak terpasang di container lokal) | `ubuntu-latest` (clang + lld + libc6-dev) |
| `linux-arm64` | `linux-arm64` | `aarch64-unknown-linux-gnu` | ELF64 | `gnu` | `generic` | `.tar.gz`, `.zip` | Target triple, data layout, ABI/CPU, dan preflight/library mismatch **TERUJI**; eksekusi native/QEMU belum tersedia lokal (`NOT_VERIFIED`) | `ubuntu-24.04-arm` (native ARM64) |
| `windows-x86_64` | `windows-x64` | `x86_64-pc-windows-msvc` | COFF PE32+ | `msvc` | `x86-64` | `.zip` | Target, parser PE32+ header/imports/exports, arsip ZIP, dan generator `.ps1`/`.bat` **TERUJI**; sandbox PowerShell & `clang` `.exe` `NOT_VERIFIED` lokal | `windows-latest` |
| `windows-arm64` | `windows-arm64` | `aarch64-pc-windows-msvc` | COFF PE32+ | `msvc` | `generic` | `.zip` | Target, parser PE32+ ARM64, dan pengemasan ZIP **TERUJI**; eksekusi native `NOT_VERIFIED` lokal | `windows-11-arm` |
| `macos-x86_64` | `macos-x64` | `x86_64-apple-darwin` | Mach-O 64 | `darwin-macho` | `x86-64` | `.tar.gz`, `.zip` | Target, parser Mach-O 64, preflight Darwin & penolakan `-static` **TERUJI**; Apple SDK/Rosetta 2 `NOT_VERIFIED` lokal | `macos-latest` (`arch -x86_64`) |
| `macos-arm64` | `macos-arm64` | `arm64-apple-darwin` | Mach-O 64 | `darwin-macho` | `apple-m1` | `.tar.gz`, `.zip` | Target, parser Mach-O 64, preflight Darwin & penolakan `-static` **TERUJI**; eksekusi Apple Silicon `NOT_VERIFIED` lokal | `macos-latest` |
