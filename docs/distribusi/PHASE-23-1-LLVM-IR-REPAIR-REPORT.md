# Laporan Audit & Perbaikan Phase 23.1 — LLVM IR String Symbol Repair & Six-Target Native Build Validation

**Proyek:** NUSANTARA Programming Language & NUSANTARA OS (`v0.50.0` pada cabang `main`)  
**Cakupan:** Phase 23 (`v0.23.0`) & Phase 44 LLVM Backend (`src/compiler/llvm/`, `src/compiler/linker/`, `src/build/`)  
**Tanggal Laporan:** 13 November 2026  
**Referensi Kegagalan Awal:** GitHub Actions commit `782bdd9c2acbb0d3fe78391293c52741a85a5fc2` pada pengujian Phase 23 Test `3.2` (Ubuntu & macOS ARM64)

---

## 1. Ringkasan Eksekutif & Status Kejujuran Teknis

Kegagalan CI pada commit `782bdd9c2acbb0d3fe78391293c52741a85a5fc2`:

```text
error: use of undefined value '@.str._v5'
call void @nusantara_cetak_teks_inline(ptr @.str._v5)
```

telah diaudit hingga ke akar masalah pada konversi `NIRConstantString` -> `LLVMInstructionEmitter` -> `LLVMIRGenerator`. Sumber kegagalan bukan pada `clang` ataupun OS runner, melainkan cacat desain penamaan simbol string global, penyandian UTF-8 literal string, duplikasi nama register SSA lokal, penomoran atribut fungsi tak terdefinisi (`#0`), dan kurangnya validasi statis simbol string sebelum memanggil `clang`.

**Status Jujur Lingkungan Saat Ini:**
- **Lokal (Container Debian Linux x86_64, Node.js `v22.23.2`):** Seluruh modul TypeScript, generasi LLVM IR, validasi statis simbol global + panjang `[N x i8]`, pengujian 11 skenario string literal, dan seluruh suite `npm test` + `test:cicd` + `test:llvm-v44` + `test:build-v23` lulus tanpa galat kompilasi maupun kegagalan logika.
- **Batasan Container Lokal:** Perkakas `clang`, `llc`, `lld`, `llvm-as`, dan `qemu-aarch64-static` tidak terpasang pada container lokal saat ini (`TOOLCHAIN_TIDAK_TERSEDIA`). Oleh karena itu, eksekusi nyata `clang`/`llvm-as`/linker pada ke-6 target desktop tetap berstatus **BELUM DIVERIFIKASI (menunggu runner GitHub Actions)** setelah perbaikan ini di-push/dijalankan di CI.
- **Status Phase 23:** Tetap **`🟠 SELESAI SEBAGIAN`** hingga seluruh target desktop memiliki bukti kompilasi dan eksekusi nyata yang terverifikasi.

---

## 2. Akar Masalah Teknis (*Root Cause Analysis*)

Penelusuran penuh alur `.nusantara -> Lexer -> Parser/AST -> ASTToNIRLowering -> NIRModule -> LLVMIRGenerator -> LLVMInstructionEmitter -> ObjectGenerator -> LinkerManager` menemukan 6 cacat terstruktur:

1. **Mismatch Penamaan Simbol String (`LLVMIRGenerator` vs `LLVMInstructionEmitter`) — Penyebab Langsung `@.str._v5`:**
   - `NIRConstant` mewarisi `NIRValue(type, undefined)`, sehingga setiap `NIRConstantString` memperoleh `id` internal berbentuk `%v<counter>` (misalnya `%v5`).
   - Sebelum perbaikan, `LLVMIRGenerator.collectStringLiterals()` mendeklarasikan global secara sekuensial sebagai `@.str.0`, `@.str.1`, dst., **tetapi** `LLVMInstructionEmitter.formatValue()` menformat operand `NIRConstantString` menjadi `@.str.${val.id.replace('%', '_')}` (`@.str._v5`).
   - Akibatnya, instruksi `call void @nusantara_cetak_teks_inline(ptr @.str._v5)` selalu menunjuk ke simbol yang tidak pernah dideklarasikan di header modul LLVM IR.

2. **Pemindaian String Tidak Lengkap & Ketiadaan *String Interning*:**
   - `collectStringLiterals` sebelumnya hanya memindai `inst.operands` dan mengabaikan `bb.phiNodes`, `bb.terminator`, `mod.globals`, `inst.args`, dan elemen bersarang `NIRConstantArray`.
   - Literal yang identik menghasilkan deklarasi global ganda tanpa *deduplication/interning*.

3. **Ketidakcocokan Panjang Byte UTF-8 vs UTF-16 (`escapeLLVMString`):**
   - `llvm-ir-generator.ts` sebelumnya menghitung ukuran array `[Buffer.byteLength(str, 'utf-8') + 1 x i8]` sementara fungsi *escaping* mengiterasi indeks UTF-16 `str.charCodeAt(i)`. Untuk karakter non-ASCII / Unicode / emoji Bahasa Indonesia, jumlah byte yang diemisikan di dalam `c"...\00"` dapat berbeda dari ukuran tipe `[N x i8]` dan ditolak oleh `clang`/`llvm-as`.

4. **Referensi Attribute Group `#0` Tak Terdefinisi:**
   - Emisi fungsi sebelumnya menulis `define ... @utama() #0 {` tanpa ada deklarasi `attributes #0 = { ... }` dalam modul LLVM IR.

5. **Duplikasi Nama Register SSA Lokal (`ast-to-nir.ts` & `LLVMInstructionEmitter`):**
   - `ast-to-nir.ts` berulang kali memakai nama register statis seperti `'cetak.bil'`, `'cetak.teks'`, `'add'`, `'call'` untuk beberapa instruksi dalam satu fungsi yang sama. Karena `NIRValue` menyimpan `this.id = '%' + name` tanpa indeks pembeda, pemanggilan `tampilkan(...)` lebih dari sekali menghasilkan dua definisi `%cetak.bil` dalam fungsi yang sama.

6. **Pengembalian `null` pada Fungsi Non-Void + Flag `-s` pada Windows + PIC ELF:**
   - `ASTToNIRLowering.lowerFunction()` mengembalikan `NIRConstants.null(fn.returnType)` (menghasilkan `ret i64 null`) jika fungsi primitif non-void tidak berakhir dengan `kembalikan`.
   - `DynamicLinker` & `StaticLinker` mengirimkan flag `-s` pada Windows (`link.exe` / `lld-link`), padahal `-s` hanya standar POSIX GNU `ld` Linux.
   - `ObjectGenerator` belum menyertakan `-relocation-model=pic` / `-fPIC` pada target ELF, berisiko memicu galat relokasi PIE pada `ubuntu-latest`.

---

## 3. Perbandingan LLVM IR Sebelum vs Sesudah Perbaikan

Untuk program uji `UjiNativePhase23`:

```nusantara
program UjiNativePhase23
mulai
  hasil : bilangan = 20 + 22
  tampilkan("NUSANTARA_NATIVE_CI_OK")
  tampilkan("Pengujian LLVM IR berhasil")
  tampilkan("Bahasa Indonesia")
  tampilkan(hasil)
selesai
```

### Sebelum Perbaikan (Gagal di Clang / LLVM):
```llvm
@.str.0 = private unnamed_addr constant [23 x i8] c"NUSANTARA_NATIVE_CI_OK\00", align 1
@.str.1 = private unnamed_addr constant [27 x i8] c"Pengujian LLVM IR berhasil\00", align 1
@.str.2 = private unnamed_addr constant [17 x i8] c"Bahasa Indonesia\00", align 1

define i32 @utama() #0 {
entry:
  ...
  call void @nusantara_cetak_teks(ptr @.str._v5)  ; ERROR: use of undefined value '@.str._v5'
  call void @nusantara_cetak_teks(ptr @.str._v6)  ; ERROR: use of undefined value '@.str._v6'
  call void @nusantara_cetak_teks(ptr @.str._v7)  ; ERROR: use of undefined value '@.str._v7'
  ...
}
```

### Sesudah Perbaikan (Output Aktual Terverifikasi dari `AOTCompiler`):
```llvm
; ModuleID = 'UjiNativePhase23'
source_filename = "UjiNativePhase23.nusantara"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-unknown-linux-gnu"

@.str.0 = private unnamed_addr constant [23 x i8] c"NUSANTARA_NATIVE_CI_OK\00", align 1
@.str.1 = private unnamed_addr constant [27 x i8] c"Pengujian LLVM IR berhasil\00", align 1
@.str.2 = private unnamed_addr constant [17 x i8] c"Bahasa Indonesia\00", align 1

; Deklarasi Runtime Nusantara & Libc Eksternal
declare i32 @printf(ptr, ...)
declare ptr @malloc(i64)
declare void @free(ptr)
declare void @exit(i32)
declare i64 @nusantara_cetak_bilangan(i64)
declare i64 @nusantara_cetak_bilangan_inline(i64)
declare void @nusantara_cetak_desimal(double)
declare void @nusantara_cetak_desimal_inline(double)
declare void @nusantara_cetak_logika(i1)
declare void @nusantara_cetak_teks(ptr)
declare void @nusantara_cetak_teks_inline(ptr)
declare void @nusantara_cetak_baris()

define i32 @utama() {
entry:
  %hasil.addr = alloca i64, align 8
  store i64 42, ptr %hasil.addr, align 8
  call void @nusantara_cetak_teks(ptr @.str.0)
  call void @nusantara_cetak_teks(ptr @.str.1)
  call void @nusantara_cetak_teks(ptr @.str.2)
  %v13 = load i64, ptr %hasil.addr, align 8
  %cetak.bil = call i64 @nusantara_cetak_bilangan(i64 %v13)
  ret i32 0
}
```

---

## 4. Ringkasan Perubahan Kode Sumber

| Berkas | Perbaikan Utama |
|---|---|
| `src/compiler/llvm/llvm-instruction-emitter.ts` | Mengganti format `@.str._v*` dengan `stringSymbolResolver` tersentralisasi (+ fallback `standaloneStringMap`), serta menambahkan deduplikasi nama register SSA & label blok per fungsi (`beginFunction` / `endFunction`). |
| `src/compiler/llvm/llvm-ir-generator.ts` | Mengintegrasikan *string interning registry* satu pintu (`resolveStringSymbol`), mengemisi badan fungsi sebelum merender deklarasi `@.str.N`, menyandikan byte UTF-8 menggunakan `TextEncoder`, memindai seluruh lokasi NIR (termasuk `phi`, `terminator`, `globals`, `NIRConstantArray`), dan menghapus `#0` tak terdefinisi. |
| `src/compiler/llvm/llvm-validator.ts` | Menambahkan pemeriksaan statis ketat: penolakan eksplisit `@.str._v<N>`, verifikasi seluruh referensi `@.str.*` terdeklarasi, validasi panjang byte `[N x i8] c"..."`, dan verifikasi attribute group `#N`. |
| `src/compiler/llvm/object-generator.ts` | Menambahkan `--relocation-model=pic` (pada `llc`) dan `-fPIC` (pada `clang -c`) untuk target POSIX (`linux`/`darwin`). |
| `src/compiler/nir/lowering/ast-to-nir.ts` | Memperbaiki nilai pengembalian default fungsi non-void agar memakai konstanta bertipe nol (`0`, `0.0`, `false`) alih-alih `null`. |
| `src/compiler/linker/{static-linker,dynamic-linker,linker-manager,dependency-inspector}.ts` | Menambahkan dukungan `crossCompilerCommand` (`aarch64-linux-gnu-gcc`), membatasi flag `-s` hanya untuk Linux ELF, dan menambahkan fallback `readelf -d` di `DependencyInspector` untuk biner ELF cross-arch. |
| `src/build/{types,native-pipeline}.ts` | Menyimpan `<appName>.ll` konsisten, meneruskan `crossCompilerCommand`, menambahkan dukungan eksekusi user-mode `qemu-aarch64-static` untuk `linux-arm64` beserta status eksplisit `executionMode` (`native` / `qemu-user` / `not-executed`). |

---

## 5. Cakupan Pengujian yang Ditambahkan

1. **`pengujian/build/uji_build_distribusi_fase23.ts` (`npm run test:build-v23`):**
   - **Grup 1B (`1B.1`):** Mengaudit 11 skenario literal string melalui `AOTCompiler` + `LLVMValidator` (tunggal, banyak argumen, duplikat *interning*, argumen fungsi, percabangan `jika`, perulangan `selama`/`untuk`, string kosong `""`, escape & tanda kutip, Unicode UTF-8 Bahasa Indonesia, ekspresi multi-`tampilkan`, serta rantai panggilan fungsi bersarang).
   - **Test `3.2`:** Diperbarui untuk membangun & mengeksekusi `UjiNativePhase23` beserta penegakan wajib `NUSANTARA_REQUIRE_CLANG=1` pada CI (gagal keras bila `clang` hilang di CI, tidak pernah disenyapkan sebagai `SKIPPED`).
2. **`pengujian/llvm/uji_llvm_fase44.ts` (`npm run test:llvm-v44`):**
   - **Kelompok 9 (`9.1`–`9.3`):** Verifikasi konsistensi simbol `@.str.*`, deduplikasi string identik, penolakan negatif `@.str._v5` dan ketidakcocokan `[N x i8]`, serta literal string pada node `phi` & `ret` UTF-8.

---

## 6. Hasil Verifikasi Lokal Aktual

Dijalankan pada container **Linux x86_64 (`Node.js v22.23.2`, `npm 10.9.8`)**:

| Perintah Uji | Hasil Aktual | Catatan Transparan |
|---|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS (exit 0)** | 0 error tipe TypeScript |
| `npm run test:build-v23` | **16 LULUS, 0 GAGAL, 1 BELUM DIVERIFIKASI** | Grup 1B (11 skenario LLVM IR string) LULUS; Test 3.2 `BELUM DIVERIFIKASI` karena `clang` tidak terpasang lokal |
| `NUSANTARA_REQUIRE_CLANG=1 npm run test:build-v23` | **PASS (exit 1 sesuai desain)** | Membuktikan mode CI gagal keras ketika `clang` tidak ada |
| `npm run test:llvm-v44` | **17 LULUS, 0 GAGAL, 1 SKIPPED** | Kelompok 9 (9.1–9.3) LULUS; 8.1 `SKIPPED` karena `clang`/`llc` belum terpasang |
| `npm run test:cicd` | **21 LULUS, 0 GAGAL** | Seluruh validasi `.github/workflows/ci.yml` & `release.yml` LULUS |
| `npm test` (46 suite) | **1.463 pemeriksaan (167 fondasi + 1.292 TS lulus, 0 gagal, 3 skipped LLVM/Linker/Actor, 1 belum diverifikasi build-v23)** | Tidak ada regresi pada Phase 1–50 |

---

## 7. Matriks Validasi 6 Target Desktop (`.github/workflows/ci.yml`)

Pipeline `build-matrix-validation` pada `.github/workflows/ci.yml` telah disiapkan mencakup seluruh 6 target desktop resmi:

| Target | Triple | Runner CI | Mekanisme Build & Verifikasi di CI | Status Verifikasi Saat Ini |
|---|---|---|---|---|
| `linux-x86_64` | `x86_64-unknown-linux-gnu` | `ubuntu-latest` | `clang`/`lld`/`llvm` (`NUSANTARA_REQUIRE_CLANG=1`) + eksekusi native | **MENUNGGU RUN GITHUB ACTIONS** (Lokal tanpa `clang`: `BELUM DIVERIFIKASI`) |
| `linux-arm64` | `aarch64-unknown-linux-gnu` | `ubuntu-latest` | `llc` + `aarch64-linux-gnu-gcc` + `qemu-aarch64-static` (`executionMode: qemu-user`) + `readelf` | **MENUNGGU RUN GITHUB ACTIONS** |
| `windows-x86_64` | `x86_64-pc-windows-msvc` | `windows-latest` | `clang` (Chocolatey LLVM) + MSVC CRT + PE32+ + eksekusi native | **MENUNGGU RUN GITHUB ACTIONS** |
| `windows-arm64` | `aarch64-pc-windows-msvc` | `windows-latest` | Deteksi jujur MSVC `lib/arm64`; jika belum tersedia di runner publik, dilaporkan eksplisit `NOT_VERIFIED` (`CROSS_SDK_TIDAK_TERSEDIA`) | **NOT_VERIFIED / MENUNGGU SDK ARM64** |
| `macos-x86_64` | `x86_64-apple-darwin` | `macos-latest` | Apple Clang + `MacOSX.sdk` (`-target x86_64-apple-darwin`), inspeksi ketat Mach-O `x86_64` | **MENUNGGU RUN GITHUB ACTIONS** |
| `macos-arm64` | `arm64-apple-darwin` | `macos-latest` | Apple Clang + `MacOSX.sdk` (`NUSANTARA_REQUIRE_CLANG=1`), Mach-O `arm64` + eksekusi native | **MENUNGGU RUN GITHUB ACTIONS** |

---

## 8. Penegasan Kepatuhan & Langkah Berikutnya

- Tidak ada penonaktifan Test `3.2`, tidak ada `SKIPPED` palsu ketika `NUSANTARA_REQUIRE_CLANG=1`, dan tidak ada biner shell/script palsu.
- Langkah berikutnya adalah menjalankan pipeline GitHub Actions pada commit berikutnya (setelah pengguna menyetujui commit/push) untuk mengumpulkan log `clang`, `llvm-as`, dan eksekusi biner nyata di runner Ubuntu, Windows, dan macOS.
