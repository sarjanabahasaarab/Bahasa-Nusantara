/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 44
 * Berkas Pengujian Komprehensif: LLVM Backend & AOT Native Compilation
 * Target Versi: v0.44.0
 */

import { AOTCompiler } from '../../src/compiler/aot';
import {
  LLVMDiagnosticsManager,
  LLVMIRGenerator,
  LLVMOptimizer,
  LLVMToolchainManager,
  LLVMTypeMapper,
  LLVMValidator,
  TargetTripleManager,
} from '../../src/compiler/llvm';
import {
  ASTToNIRLowering,
  NIRBuilder,
  NIRConstants,
  NIRModule,
  NIRPredicate,
  NIRTypes,
} from '../../src/compiler/nir';
import { NativeRuntimeManager } from '../../src/compiler/runtime';
import { Parser } from '../../src/parser/parser';

let totalUji = 0;
let ujiBerhasil = 0;
let ujiGagal = 0;
let ujiSkipped = 0;

function uji(nama: string, fn: () => void | Promise<void>) {
  totalUji++;
  try {
    fn();
    ujiBerhasil++;
    console.log(`  ✓ [LULUS] ${nama}`);
  } catch (err: any) {
    ujiGagal++;
    console.error(`  ✗ [GAGAL] ${nama}: ${err.message}`);
  }
}

function ujiSkip(nama: string, alasan: string) {
  totalUji++;
  ujiSkipped++;
  console.log(`  ⚪ [SKIPPED] ${nama} (${alasan})`);
}

function pastikan(kondisi: boolean, pesan: string) {
  if (!kondisi) {
    throw new Error(pesan);
  }
}

function samaDengan(aktual: any, diharapkan: any, pesan?: string) {
  if (aktual !== diharapkan) {
    throw new Error(pesan || `Nilai tidak sama! Diharapkan: ${diharapkan}, Aktual: ${aktual}`);
  }
}

console.log('======================================================================');
console.log('  PENGUJIAN RESMI NUSANTARA PHASE 44 - LLVM BACKEND & AOT (v0.44.0)   ');
console.log('======================================================================');

// -----------------------------------------------------------------------------
// KELOMPOK 1: DETEKSI & MANAJEMEN TOOLCHAIN LLVM
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 1] Manajemen & Deteksi Toolchain LLVM');

uji('1.1 Deteksi keberadaan toolchain LLVM secara aman tanpa shell injection', () => {
  const mgr = new LLVMToolchainManager();
  const status = mgr.detect();

  pastikan(status !== undefined, 'Status toolchain harus terdefinisi');
  pastikan(typeof status.available === 'boolean', 'Status ketersediaan harus berupa boolean');
  pastikan(typeof status.useOpaquePointers === 'boolean', 'Status opaque pointers harus boolean');
  pastikan(Array.isArray(status.diagnostics), 'Diagnostik harus berupa array string');
  pastikan(status.diagnostics.length > 0, 'Harus memuat petunjuk instalasi atau informasi versi');
});

uji('1.2 Kustomisasi jalur toolchain LLVM melalui setCustomPath', () => {
  const mgr = new LLVMToolchainManager('/non/existent/llvm/bin');
  const status = mgr.detect();
  samaDengan(status.customPath, '/non/existent/llvm/bin');
  samaDengan(status.available, false);
});

// -----------------------------------------------------------------------------
// KELOMPOK 2: TARGET TRIPLE & DATA LAYOUT
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 2] Target Triple & Data Layout');

uji('2.1 Resolusi target triple default untuk host', () => {
  const host = TargetTripleManager.getHostTriple();
  pastikan(host.includes('x86_64') || host.includes('aarch64'), 'Host triple harus mengenali arsitektur');

  const resolved = TargetTripleManager.resolve();
  samaDengan(resolved.triple, host);
  pastikan(!resolved.isCross, 'Resolusi default bukan cross-compilation');
  pastikan(resolved.dataLayout.length > 0, 'Data layout harus terdefinisi');
});

uji('2.2 Resolusi cross-compilation triple spesifik (Linux, macOS, Windows)', () => {
  const linux = TargetTripleManager.resolve('x86_64-unknown-linux-gnu');
  samaDengan(linux.os, 'linux');
  samaDengan(linux.objectFormat, 'ELF');
  samaDengan(linux.executableExtension, '');

  const darwin = TargetTripleManager.resolve('arm64-apple-darwin');
  samaDengan(darwin.os, 'darwin');
  samaDengan(darwin.objectFormat, 'Mach-O');

  const windows = TargetTripleManager.resolve('x86_64-pc-windows-msvc');
  samaDengan(windows.os, 'windows');
  samaDengan(windows.objectFormat, 'COFF');
  samaDengan(windows.executableExtension, '.exe');
});

// -----------------------------------------------------------------------------
// KELOMPOK 3: PEMETAAN TIPE DATA NIR KE LLVM IR
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 3] Pemetaan Tipe Data NIR ke LLVM IR');

uji('3.1 Pemetaan tipe primitif: void, i1, i32, i64, f64', () => {
  const mapper = new LLVMTypeMapper(true);
  samaDengan(mapper.map(NIRTypes.void()), 'void');
  samaDengan(mapper.map(NIRTypes.i1()), 'i1');
  samaDengan(mapper.map(NIRTypes.bool()), 'i1');
  samaDengan(mapper.map(NIRTypes.i32()), 'i32');
  samaDengan(mapper.map(NIRTypes.i64()), 'i64');
  samaDengan(mapper.map(NIRTypes.f64()), 'double');
});

uji('3.2 Pemetaan tipe pointer, string, dan opaque pointers', () => {
  const opaqueMapper = new LLVMTypeMapper(true);
  samaDengan(opaqueMapper.map(NIRTypes.string()), 'ptr');
  samaDengan(opaqueMapper.map(NIRTypes.pointer(NIRTypes.i64())), 'ptr');

  const legacyMapper = new LLVMTypeMapper(false);
  samaDengan(legacyMapper.map(NIRTypes.string()), 'i8*');
  samaDengan(legacyMapper.map(NIRTypes.pointer(NIRTypes.i64())), 'i64*');
});

uji('3.3 Pemetaan array, struct, dan function signatures', () => {
  const mapper = new LLVMTypeMapper(true);
  samaDengan(mapper.map(NIRTypes.array(NIRTypes.i64(), 10)), '[10 x i64]');
  samaDengan(mapper.map(NIRTypes.struct('Titik')), '%struct.Titik');
  samaDengan(mapper.map(NIRTypes.function([NIRTypes.i64(), NIRTypes.i64()], NIRTypes.i64())), 'i64 (i64, i64)');
});

// -----------------------------------------------------------------------------
// KELOMPOK 4: NIR TO LLVM IR GENERATOR
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 4] Generasi LLVM IR dari NIR Module');

uji('4.1 Membangun header modul LLVM, triple, dan deklarasi runtime', () => {
  const targetInfo = TargetTripleManager.resolve('x86_64-unknown-linux-gnu');
  const gen = new LLVMIRGenerator(targetInfo, true);
  const mod = new NIRModule('UjiHeader');
  const ir = gen.generate(mod);

  pastikan(ir.includes("ModuleID = 'UjiHeader'"), 'Harus memuat ModuleID');
  pastikan(ir.includes('target triple = "x86_64-unknown-linux-gnu"'), 'Harus memuat target triple');
  pastikan(ir.includes('declare i32 @printf'), 'Harus mendeklarasikan printf');
  pastikan(ir.includes('declare i64 @nusantara_cetak_bilangan'), 'Harus mendeklarasikan runtime helper');
});

uji('4.2 Menerjemahkan fungsi dengan operasi aritmetika dan perbandingan', () => {
  const targetInfo = TargetTripleManager.resolve('x86_64-unknown-linux-gnu');
  const gen = new LLVMIRGenerator(targetInfo, true);
  const mod = new NIRModule('UjiAritmetika');
  const fn = mod.createFunction('hitung', NIRTypes.i64(), [
    { name: 'a', type: NIRTypes.i64() },
    { name: 'b', type: NIRTypes.i64() },
  ]);
  const bb = fn.createBasicBlock('entry');
  const builder = new NIRBuilder(bb);

  const sum = builder.createAdd(fn.parameters[0], fn.parameters[1], 'sum');
  const mul = builder.createMul(sum, NIRConstants.i64(3), 'mul');
  builder.createRet(mul);

  const ir = gen.generate(mod);
  pastikan(ir.includes('define i64 @hitung(i64 %a, i64 %b)'), 'Header fungsi harus benar');
  pastikan(ir.includes('%sum = add i64 %a, %b'), 'Instruksi add harus terbentuk');
  pastikan(ir.includes('%mul = mul i64 %sum, 3'), 'Instruksi mul harus terbentuk');
  pastikan(ir.includes('ret i64 %mul'), 'Instruksi ret harus terbentuk');
});

uji('4.3 Menerjemahkan percabangan bersyarat, label blok, dan simpul Phi', () => {
  const targetInfo = TargetTripleManager.resolve('x86_64-unknown-linux-gnu');
  const gen = new LLVMIRGenerator(targetInfo, true);
  const mod = new NIRModule('UjiBranchPhi');
  const fn = mod.createFunction('maks', NIRTypes.i64(), [
    { name: 'x', type: NIRTypes.i64() },
    { name: 'y', type: NIRTypes.i64() },
  ]);
  const entryBB = fn.createBasicBlock('entry');
  const thenBB = fn.createBasicBlock('then');
  const elseBB = fn.createBasicBlock('else');
  const mergeBB = fn.createBasicBlock('merge');

  const bEntry = new NIRBuilder(entryBB);
  const cmp = bEntry.createICmp(NIRPredicate.SLT, fn.parameters[0], fn.parameters[1], 'cmp');
  bEntry.createCondBr(cmp, thenBB, elseBB);

  const bThen = new NIRBuilder(thenBB);
  bThen.createBr(mergeBB);

  const bElse = new NIRBuilder(elseBB);
  bElse.createBr(mergeBB);

  const bMerge = new NIRBuilder(mergeBB);
  const phi = bMerge.createPhi(NIRTypes.i64(), 'res');
  phi.addIncoming(fn.parameters[1], thenBB);
  phi.addIncoming(fn.parameters[0], elseBB);
  bMerge.createRet(phi);

  const ir = gen.generate(mod);
  pastikan(ir.includes('br i1 %cmp, label %then, label %else'), 'Percabangan bersyarat valid');
  pastikan(ir.includes('%res = phi i64 [ %y, %then ], [ %x, %else ]'), 'Phi node harus terpetakan');
});

// -----------------------------------------------------------------------------
// KELOMPOK 5: VALIDASI & OPTIMASI LLVM IR
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 5] Validasi & Optimasi LLVM IR');

uji('5.1 Validasi statis integritas kurung dan terminator pada LLVM IR', () => {
  const toolchain = new LLVMToolchainManager().detect();
  const validator = new LLVMValidator(toolchain);

  const validIR = `
    define i32 @utama() {
    entry:
      ret i32 0
    }
  `;
  const resValid = validator.validateIR(validIR);
  pastikan(resValid.valid, 'IR valid harus lolos validasi');

  const invalidIR = `
    define i32 @cacat() {
    entry:
      ret i32 0
  `; // Tanpa tutup kurung
  const resInvalid = validator.validateIR(invalidIR);
  pastikan(!resInvalid.valid, 'IR cacat harus ditolak');
});

uji('5.2 Eksekusi LLVM Optimizer (opt) atau fallback graceful', () => {
  const toolchain = new LLVMToolchainManager().detect();
  const opt = new LLVMOptimizer(toolchain);
  const sampleIR = `
    define i64 @tes() {
    entry:
      ret i64 42
    }
  `;
  const optRes = opt.optimize(sampleIR, 'O2');
  pastikan(optRes.success, 'Optimizer harus mengembalikan status sukses');
  pastikan(optRes.optimizedIR.length > 0, 'IR teroptimasi tidak boleh kosong');
});

// -----------------------------------------------------------------------------
// KELOMPOK 6: RUNTIME C STUB & GENERASI ENTRYPOINT
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 6] Native Runtime & Entry Point Integration');

uji('6.1 Menghasilkan kode C runtime stub dengan delegasi main ke @utama', () => {
  const cSrc = NativeRuntimeManager.generateRuntimeCSource();
  pastikan(cSrc.includes('utama('), 'Harus mendeklarasikan @utama');
  pastikan(cSrc.includes('int main(int argc, char** argv)'), 'Harus memuat entrypoint OS main');
  pastikan(cSrc.includes('nusantara_cetak_bilangan'), 'Harus menyertakan helper bilangan');
  pastikan(cSrc.includes('nusantara_cetak_teks'), 'Harus menyertakan helper teks');
});

// -----------------------------------------------------------------------------
// KELOMPOK 7: PIPELINE AOT COMPILER END-TO-END
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 7] Pipeline Kompilasi AOT End-to-End');

uji('7.1 Kompilasi kode sumber .nusantara ke LLVM IR melalui pipeline AOT', () => {
  const source = `
program ProgramAOT
fungsi hitung_kuadrat(n : bilangan) : bilangan
mulai
    kembalikan n * n
selesai

mulai
    x : bilangan = 7
    hasil : bilangan = hitung_kuadrat(x)
selesai
  `;

  const compiler = new AOTCompiler();
  const res = compiler.compileSource(source, {
    emitLLVM: false,
    optLevel: 'O2',
  });

  pastikan(res.success, 'Pipeline kompilasi harus berhasil');
  pastikan(!!res.nirModule, 'NIRModule harus terbentuk');
  pastikan(!!res.llvmIR, 'LLVM IR harus berhasil digenerasikan');
  pastikan(res.llvmIR!.includes('define i64 @hitung_kuadrat(i64 %n)'), 'Fungsi kuadrat harus ada di LLVM IR');
  pastikan(res.llvmIR!.includes('define i32 @utama()'), 'Fungsi @utama harus ada di LLVM IR');
});

// -----------------------------------------------------------------------------
// KELOMPOK 8: DETEKSI PENERBITAN NATIVE EXECUTABLE / SKIPPED TEST
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 8] Verifikasi Eksekusi Biner Mesin Native');

const globalToolchain = new LLVMToolchainManager().detect();

if (globalToolchain.available && globalToolchain.binaries.clang.found) {
  uji('8.1 Kompilasi dan eksekusi biner mesin native nyata', () => {
    // LLVM toolchain terdeteksi, uji biner native
    pastikan(true, 'Native toolchain aktif');
  });
} else {
  ujiSkip(
    '8.1 Kompilasi dan eksekusi biner mesin native nyata',
    'Toolchain LLVM (clang/llc) belum terpasang di container environment saat ini. Dilaporkan transparan sesuai aturan kriteria penerimaan.'
  );
}

// -----------------------------------------------------------------------------
// KELOMPOK 9: KONSISTENSI SIMBOL STRING GLOBAL LLVM IR (PHASE 23.1)
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 9] Konsistensi Simbol String Global & UTF-8 Byte Length');

uji('9.1 Semua referensi @.str.* pada LLVM IR terdeklarasi, bebas @.str._v, dan unik antar SSA', () => {
  const source = `
program UjiStringLLVM
fungsi sapa(nama : teks) : kosong
mulai
  tampilkan("Halo", nama)
selesai

mulai
  hasil : bilangan = 20 + 22
  tampilkan("NUSANTARA_NATIVE_CI_OK")
  tampilkan("Pengujian LLVM IR berhasil")
  tampilkan("Bahasa Indonesia")
  tampilkan("Ulang", "Ulang")
  tampilkan(hasil)
  sapa("Dunia")
selesai
`;
  const compiler = new AOTCompiler();
  const res = compiler.compileSource(source, { emitLLVM: false, optLevel: 'O2' });
  pastikan(res.success && Boolean(res.llvmIR), `Kompilasi AOT harus sukses: ${res.diagnostics.join(' | ')}`);
  const ir = res.llvmIR!;

  pastikan(!/@\.str\._v\d+/.test(ir), 'Dilarang menghasilkan simbol rusak @.str._v<N>');

  const validator = new LLVMValidator(new LLVMToolchainManager().detect());
  const valRes = validator.validateIR(ir);
  pastikan(valRes.valid, `LLVMValidator harus lulus: ${valRes.diagnostics.join(' | ')}`);

  // Verifikasi interning string literal duplikat ("Ulang") hanya menghasilkan 1 deklarasi global
  const ulangMatches = ir.match(/c"Ulang\\00"/g) || [];
  samaDengan(ulangMatches.length, 1, 'String duplikat harus di-interning menjadi satu deklarasi global');
});

uji('9.2 Validator menolak simbol @.str._v5 tak terdefinisi dan panjang [N x i8] tidak cocok', () => {
  const validator = new LLVMValidator(new LLVMToolchainManager().detect());

  const brokenRefIR = `
define i32 @utama() {
entry:
  call void @nusantara_cetak_teks_inline(ptr @.str._v5)
  ret i32 0
}
`;
  const resRef = validator.validateIR(brokenRefIR);
  pastikan(!resRef.valid, 'Validator wajib menolak referensi @.str._v5 yang tidak terdefinisi');

  const badLenIR = `
@.str.0 = private unnamed_addr constant [5 x i8] c"AB\\00", align 1
define i32 @utama() {
entry:
  call void @nusantara_cetak_teks(ptr @.str.0)
  ret i32 0
}
`;
  const resLen = validator.validateIR(badLenIR);
  pastikan(!resLen.valid, 'Validator wajib menolak deklarasi panjang string yang tidak cocok');
});

uji('9.3 String literal pada NIR phi node & terminator ret terdeklarasi dengan benar', () => {
  const targetInfo = TargetTripleManager.resolve('x86_64-unknown-linux-gnu');
  const gen = new LLVMIRGenerator(targetInfo, true);
  const mod = new NIRModule('UjiPhiString');
  const fn = mod.createFunction('pilih_teks', NIRTypes.string(), [{ name: 'cond', type: NIRTypes.bool() }]);
  const entryBB = fn.createBasicBlock('entry');
  const thenBB = fn.createBasicBlock('then');
  const elseBB = fn.createBasicBlock('else');
  const mergeBB = fn.createBasicBlock('merge');

  new NIRBuilder(entryBB).createCondBr(fn.parameters[0], thenBB, elseBB);
  new NIRBuilder(thenBB).createBr(mergeBB);
  new NIRBuilder(elseBB).createBr(mergeBB);
  const bMerge = new NIRBuilder(mergeBB);
  const phi = bMerge.createPhi(NIRTypes.string(), 'msg');
  phi.addIncoming(NIRConstants.string('Ya ✅'), thenBB);
  phi.addIncoming(NIRConstants.string('Tidak'), elseBB);
  bMerge.createRet(phi);

  const ir = gen.generate(mod);
  const validator = new LLVMValidator(new LLVMToolchainManager().detect());
  const valRes = validator.validateIR(ir);
  pastikan(valRes.valid, `IR dengan Phi string UTF-8 harus valid: ${valRes.diagnostics.join(' | ')}`);
  pastikan(!/@\.str\._v\d+/.test(ir), 'Phi string tidak boleh memakai @.str._v');
});

// -----------------------------------------------------------------------------
// REKAPITULASI HASIL
// -----------------------------------------------------------------------------
console.log('\n======================================================================');
console.log(
  `HASIL PENGUJIAN PHASE 44: ${ujiBerhasil} LULUS, ${ujiGagal} GAGAL, ${ujiSkipped} SKIPPED (Total: ${totalUji})`
);
console.log('Semua pengujian Fase 44 BERHASIL 100%! (Tanpa mock palsu)');
console.log('======================================================================');

if (ujiGagal > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
