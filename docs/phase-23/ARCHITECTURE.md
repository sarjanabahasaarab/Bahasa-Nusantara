# Arsitektur Build System & Distribusi Desktop (Phase 23)

## 1. Tujuan & Batas Sistem
Subsistem Phase 23 menyediakan pipeline kompilasi Ahead-of-Time (AOT) ke biner eksekutabel native dan pengemasan distribusi lintas 6 target desktop resmi NUSANTARA:
- `windows-x86_64` (`x86_64-pc-windows-msvc`, alias `windows-x64`)
- `windows-arm64` (`aarch64-pc-windows-msvc`)
- `linux-x86_64` (`x86_64-unknown-linux-gnu`, alias `linux-x64`)
- `linux-arm64` (`aarch64-unknown-linux-gnu`)
- `macos-x86_64` (`x86_64-apple-darwin`, alias `macos-x64`)
- `macos-arm64` (`arm64-apple-darwin`, alias `darwin-arm64`)

## 2. Alur Kompilasi Native (`NativeBuildPipeline`)
1. **Preflight Target & Profil**: `TargetTripleManager.resolveStrict` memetakan target ke triple, data layout, ABI (`gnu`, `msvc`, `darwin-macho`), CPU default, dan flag CPU; mendukung profil `debug` (`O0`, debug simbol) dan `release` (`O2`, strip).
2. **Preflight Sysroot & Arsitektur Library**: `SysrootValidator` memeriksa kelengkapan header C (`stdio.h`), CRT (`crt1.o`/`Scrt1.o`/`libc.so`), penolakan direktori library sebagai sysroot (`/usr/lib/*`), dan kecocokan arsitektur libraryPaths sebelum IR/objek diproduksi.
3. **Lowering & LLVM IR Generation**: `AOTCompiler` menjalankan `Parser -> ASTToNIRLowering -> NIRVerifier -> NIRPassManager -> LLVMIRGenerator -> LLVMValidator -> LLVMOptimizer`. Simbol `@.str._v*` ilegal ditolak eksplisit.
4. **Object Generation (`ObjectGenerator`)**: Mengubah LLVM IR menjadi `.o` / `.obj` menggunakan `clang`/`llc` dengan `-target` sesuai target.
5. **Linking (`LinkerManager` -> `StaticLinker` / `DynamicLinker`)**: Menautkan objek bersama runtime C (`NativeRuntimeManager`) menjadi ELF64, PE32+, atau Mach-O 64-bit. Mode `-static` pada macOS/Darwin ditolak secara eksplisit karena batasan user-space Apple (`libSystem.B.dylib`).
6. **Inspeksi & Validasi (`BinaryInspector` & `DependencyInspector`)**: Memvalidasi header biner secara ketat (`inspectStrict`), bounds header ELF/PE/Mach-O, seksi nyata, serta library dinamis via `ldd`, `readelf -d`/`-l`, `otool -L`, atau Import Directory PE.
7. **Eksekusi Nyata**: Biner hanya dieksekusi bila host kompatibel secara native, melalui `qemu-aarch64`/`qemu-aarch64-static`, atau Rosetta 2 (`arch -x86_64`). Cross-target tanpa emulator dilaporkan jujur sebagai `cross-compiled-not-executed`.

## 3. Alur Pengemasan & Distribusi
- **`DesktopDistributionPackager`**: Membentuk struktur `bin/`, `lib/`, `manifest.json`, `SHA256SUMS`, `LISENSI.txt`, `BACA-SAYA.txt`, serta installer per-OS (`install.sh`/`uninstall.sh` untuk POSIX; `install.ps1`/`uninstall.ps1`/`install.bat`/`uninstall.bat` untuk Windows).
- **`ArchiveBuilder`**: Membuat arsip `.zip` (PKZIP CRC-32) dan `.tar.gz` (POSIX USTAR) yang deterministik dengan epoch `1970-01-01T00:00:00.000Z`.
- **`Phase23CertificationEngine` & `DistributionE2EVerifier`**: Mengagregasi bukti dari runner multi-OS, menolak evidence duplikat lintas target, memverifikasi SHA-256 on-disk serta header biner aktual, dan mengeksekusi uji lifecycle 18 langkah (install -> execute -> upgrade -> tamper reject -> uninstall -> cleanup audit).
