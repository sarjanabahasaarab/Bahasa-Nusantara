# Dokumentasi Teknis: LLVM Backend & AOT Native Compilation

## 1. Ikhtisar Arsitektur

LLVM Backend pada Bahasa Pemrograman Nusantara (**Phase 44**) bertugas menerjemahkan Nusantara Intermediate Representation (**NIR**, Phase 43) menjadi representasi berkas LLVM IR (`.ll`), yang kemudian diproses oleh rantai perkakas LLVM Toolchain (`opt`, `llc`, `clang`, `lld`) untuk menghasilkan berkas objek biner native (`.o` / `.obj`) dan executable mandiri (*Ahead-of-Time Native Binary*).

```
   [Kode Sumber .nusantara]
              │
              ▼
    [AST to NIR Lowering]
              │
              ▼
    [NIR Module (SSA Form)]
              │
              ▼
   [NIR Optimizer Pipeline (O2)]
              │
              ▼
     [LLVM IR Generator]
              │
              ▼
       [LLVM IR (.ll)]
              │
              ▼
    [LLVM Optimizer (opt)]
              │
              ▼
  [Object Generator (llc / clang)] ──> [Berkas Objek .o / .obj]
              │
              ▼
   [Native Linker + C Runtime]     ──> [Native Executable]
```

## 2. Subsistem Komponen Utama

Direktori `src/compiler/llvm/` menaungi seluruh komponen backend:
- **`LLVMToolchainManager` (`toolchain-manager.ts`)**: Deteksi aman tanpa injeksi shell untuk perkakas `clang`, `llc`, `opt`, `llvm-as`, `llvm-dis`, `llvm-objdump`, dan `lld`. Menyediakan panduan instalasi jika toolchain belum terpasang.
- **`TargetTripleManager` (`target-triple.ts`)**: Resolusi arsitektur target, layout memori (*data layout* resmi LLVM), dan konvensi biner (`ELF` di Linux, `Mach-O` di macOS, `COFF` di Windows).
- **`LLVMTypeMapper` (`llvm-type-mapper.ts`)**: Pemetaan sistem tipe NIR ke tipe native LLVM dengan dukungan *Opaque Pointers* (LLVM 15+).
- **`LLVMInstructionEmitter` (`llvm-instruction-emitter.ts`)**: Penerjemah instruksi SSA NIR ke instruksi LLVM IR (`alloca`, `load`, `store`, `gep`, `add`, `sub`, `icmp`, `phi`, `ret`, `br`, dll) dengan resolver simbol string tersentralisasi serta deduplikasi nama register SSA & label blok per fungsi.
- **`LLVMIRGenerator` (`llvm-ir-generator.ts`)**: Orkestrator emisi modul teks LLVM IR lengkap dengan *string interning registry* satu pintu (`@.str.N`), penyandian literal string UTF-8 yang presisi terhadap ukuran `[N x i8]`, serta deklarasi runtime C eksternal.
- **`LLVMValidator` (`llvm-validator.ts`)**: Validasi semantik statis internal (verifikasi seluruh referensi `@.str.*`, konsistensi panjang byte `[N x i8]`, penolakan simbol `@.str._v*`, dan pemeriksaan attribute group) serta verifikasi assembler `llvm-as`.
- **`LLVMOptimizer` (`llvm-optimizer.ts`)**: Pipa optimasi tingkat O0, O1, O2, O3, Os via `opt`.
- **`ObjectGenerator` (`object-generator.ts`)**: Pembangkit berkas objek native via `llc` atau `clang -c` dengan mode relokasi PIC pada target POSIX (`ELF` / `Mach-O`).
- **`NativeLinker` (`linker.ts`)**: Penggabung berkas objek dengan stub C runtime (`src/compiler/runtime/native-runtime.ts`) menghasilkan file eksekutabel native.
- **`AOTCompiler` (`src/compiler/aot/aot-compiler.ts`)**: Pipeline terintegrasi *end-to-end* dari teks sumber `.nusantara` hingga executable.

## 3. Dukungan Platform Target

| Sistem Operasi | Target Triple | Format Objek | Ekstensi Biner | Status Uji |
|---|---|:---:|:---:|:---:|
| **Linux (x86_64)** | `x86_64-unknown-linux-gnu` | ELF | (tanpa ekstensi) | Implementasi Penuh (Tested IR; native CI runner) |
| **Linux (ARM64)** | `aarch64-unknown-linux-gnu` | ELF | (tanpa ekstensi) | Implementasi Penuh (Tested IR; cross CI + QEMU user) |
| **macOS (Apple Silicon)** | `arm64-apple-darwin` | Mach-O | (tanpa ekstensi) | Implementasi Penuh (Tested IR; native CI runner) |
| **macOS (Intel)** | `x86_64-apple-darwin` | Mach-O | (tanpa ekstensi) | Implementasi Penuh (Tested IR; MacOSX.sdk CI) |
| **Windows (x64)** | `x86_64-pc-windows-msvc` | COFF | `.exe` | Implementasi Penuh (Tested IR; native CI runner) |
| **Windows (ARM64)** | `aarch64-pc-windows-msvc` | COFF | `.exe` | Implementasi Penuh (Menunggu MSVC ARM64 libs) |

## 4. Penggunaan CLI

- **Pemeriksaan Toolchain:**
  ```bash
  nusantara toolchain
  ```
- **Kompilasi ke LLVM IR:**
  ```bash
  nusantara aot program.nusantara --emit-llvm -o program.ll
  ```
- **Kompilasi ke Berkas Objek:**
  ```bash
  nusantara aot program.nusantara --emit-object -o program.o
  ```
- **Kompilasi AOT Penuh ke Executable Native:**
  ```bash
  nusantara aot program.nusantara --opt=O2 -o program
  ```

## 5. Status Verifikasi & Batasan Lingkungan

- **Generasi LLVM IR, Pemetaan Tipe SSA, Target Triple, Validasi, dan Optimasi:** Lulus dan terverifikasi 100% pada rangkaian pengujian otomatis (`pengujian/llvm/uji_llvm_fase44.ts`).
- **Eksekusi Biner Native:** Membutuhkan instalasi biner compiler sistem host (`clang`/`llc`). Apabila rantai perkakas LLVM belum terpasang di lingkungan sistem operasi host, eksekusi biner mesin dilaporkan secara transparan sebagai **SKIPPED / NOT TESTED** sesuai standar kepatuhan audit.
