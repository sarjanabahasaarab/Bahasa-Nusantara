# Panduan Build Native NUSANTARA (Phase 23)

Dokumen ini menjelaskan cara membangun berkas sumber `.nusantara` menjadi biner eksekutabel native (`ELF64`, `PE32+`, `Mach-O 64`) menggunakan pipeline `NativeBuildPipeline` (`src/build/native-pipeline.ts`).

## 1. Alur Kompilasi Native End-to-End

1. **Lexer & Parser & NIR (`src/compiler/nir/`)**: Mengubah kode `.nusantara` menjadi Nusantara Intermediate Representation (SSA) terverifikasi.
2. **LLVM Backend (`src/compiler/llvm/`)**: Menurunkan NIR ke LLVM IR (`.ll`) dengan pemetaan fungsi cetak (`nusantara_cetak_*`), pengembalian `i32` pada `utama`, dan menghasilkan berkas objek (`.o` / `.obj`) via `llc`/`clang`.
3. **Native Runtime (`src/compiler/runtime/native-runtime.ts`)**: Menautkan runtime C portabel dengan `<inttypes.h>` (`PRId64`) dan utilitas pencetakan konsol/memori.
4. **Linker (`src/compiler/linker/`)**: Mendukung mode `--static` (`StaticLinker`), `--dynamic` (`DynamicLinker` dengan `$ORIGIN` / `@executable_path` RPATH), atau `--auto`.
5. **Inspeksi Ketat (`BinaryInspector.inspectStrict` & `DependencyInspector`)**: Memvalidasi magic byte, arsitektur, segmen/header biner nyata di disk, dan dependensi pustaka dinamis (`ldd` / `otool -L` / PE import table). Berkas skrip teks (`#!` atau `@echo`) secara tegas ditolak pada mode native.

## 2. Perintah CLI

```bash
# Bangun & verifikasi eksekusi native di host saat ini
nusantara bangun --source contoh/01_halo.nusantara --native --verifikasi --mode release --out dist

# Bangun dengan mode linking eksplisit
nusantara bangun --source app.nusantara --native --dynamic --target linux-x86_64 --out dist
nusantara bangun --source app.nusantara --native --static --target linux-x86_64 --out dist
```

## 3. Prasyarat Toolchain Host

- **Linux (`x86_64` / `arm64`)**: `clang`, `lld`, `llvm` (`sudo apt install clang lld llvm`)
- **macOS (`x86_64` / `arm64`)**: Xcode Command Line Tools (`xcode-select --install`) atau Homebrew `llvm`
- **Windows (`x86_64` / `arm64`)**: LLVM for Windows (`winget install LLVM.LLVM` / `choco install llvm`) + Windows SDK

Jika compiler atau linker tidak tersedia di host, CLI dan `NativeBuildPipeline` akan berhenti dengan exit code non-nol (`TOOLCHAIN_TIDAK_TERSEDIA`) tanpa menghasilkan biner palsu.
