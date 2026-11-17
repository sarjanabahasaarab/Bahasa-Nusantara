/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 43
 * Berkas Pengujian Komprehensif: Nusantara Intermediate Representation (NIR)
 * Target Versi: v0.43.0
 */

import {
  ASTToNIRLowering,
  CFGCleanupPass,
  ConstantFoldingPass,
  ControlFlowGraph,
  DeadCodeEliminationPass,
  DominatorTree,
  NIRAllocaInst,
  NIRBasicBlock,
  NIRBinaryInst,
  NIRBuilder,
  NIRCastKind,
  NIRConstants,
  NIRConstantInt,
  NIRDeserializer,
  NIRFormatter,
  NIRFunction,
  NIRICmpInst,
  NIRInstruction,
  NIRLoadInst,
  NIRModule,
  NIROpcode,
  NIRPassManager,
  NIRPhiInst,
  NIRPredicate,
  NIRSerializer,
  NIRStoreInst,
  NIRTypeKind,
  NIRTypes,
  NIRValue,
  NIRVerifier,
  PhiHelper,
  SimplificationPass,
  SSAConverter,
  SSAVerifier,
} from '../../src/compiler/nir';
import { Lexer } from '../../src/lexer/lexer';
import { Parser } from '../../src/parser/parser';
import { PemeriksaTipe } from '../../src/tipe/pemeriksaTipe';
import { PembacaBerkasMemori, PemuatModul, ResolverModul } from '../../src/modul';
import { NusantaraCLI } from '../../src/paket/cli';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';

let totalUji = 0;
let ujiBerhasil = 0;
let ujiGagal = 0;

function uji(nama: string, fn: () => void | Promise<void>) {
  totalUji++;
  try {
    const hasil = fn();
    if (hasil instanceof Promise) {
      hasil
        .then(() => {
          ujiBerhasil++;
          console.log(`  ✓ [LULUS] ${nama}`);
        })
        .catch((err) => {
          ujiGagal++;
          console.error(`  ✗ [GAGAL] ${nama}: ${err.message}`);
        });
    } else {
      ujiBerhasil++;
      console.log(`  ✓ [LULUS] ${nama}`);
    }
  } catch (err: any) {
    ujiGagal++;
    console.error(`  ✗ [GAGAL] ${nama}: ${err.message}`);
  }
}

function samaDengan(aktual: any, ekspektasi: any, pesan?: string) {
  if (aktual !== ekspektasi) {
    throw new Error(pesan || `Ekspektasi '${ekspektasi}', tetapi mendapatkan '${aktual}'`);
  }
}

function pastikan(kondisi: boolean, pesan: string) {
  if (!kondisi) {
    throw new Error(pesan);
  }
}

console.log('======================================================================');
console.log('  PENGUJIAN RESMI NUSANTARA PHASE 43 - NIR ENGINE (v0.43.0)');
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// KELOMPOK 1: SISTEM TIPE NIR (NIR TYPE SYSTEM)
// -----------------------------------------------------------------------------
console.log('[KELOMPOK 1] Sistem Tipe Data NIR (Type System)');

uji('1.1 Membuat tipe primitif: void, boolean, integer, float, string', () => {
  const tVoid = NIRTypes.void();
  const tBool = NIRTypes.i1();
  const tInt32 = NIRTypes.i32();
  const tInt64 = NIRTypes.i64();
  const tFloat = NIRTypes.f64();
  const tStr = NIRTypes.string();

  pastikan(tVoid.isVoid(), 'Tipe void harus terdeteksi void');
  pastikan(tBool.isBoolean(), 'Tipe i1 harus terdeteksi boolean');
  pastikan(tInt32.isInteger(), 'Tipe i32 harus terdeteksi integer');
  pastikan(tInt64.isInteger(), 'Tipe i64 harus terdeteksi integer');
  pastikan(tFloat.isFloat(), 'Tipe f64 harus terdeteksi float');
  pastikan(tInt64.isNumeric() && tFloat.isNumeric(), 'Integer dan float harus numerik');
  samaDengan(tStr.kind, NIRTypeKind.STRING, 'Tipe string harus benar');
});

uji('1.2 Membuat tipe komposit: pointer, array, function, dan struct', () => {
  const tPtr = NIRTypes.pointer(NIRTypes.i64());
  const tArr = NIRTypes.array(NIRTypes.f64(), 10);
  const tFn = NIRTypes.function([NIRTypes.i64(), NIRTypes.i64()], NIRTypes.i64());
  const tStruct = NIRTypes.struct('Pengguna');

  pastikan(tPtr.isPointer(), 'Harus berupa pointer');
  samaDengan(tPtr.toString(), 'i64*', 'String representasi pointer');
  pastikan(tArr.isArray(), 'Harus berupa array');
  samaDengan(tArr.toString(), '[10 x f64]', 'String representasi array');
  pastikan(tFn.isFunction(), 'Harus berupa function');
  samaDengan(tFn.toString(), '(i64, i64) -> i64', 'String representasi fungsi');
  pastikan(tStruct.isStruct(), 'Harus berupa struct');
  samaDengan(tStruct.toString(), '%struct.Pengguna', 'String representasi struct');
});

uji('1.3 Konversi dari NamaTipe Nusantara ke NIRType', () => {
  samaDengan(NIRTypes.dariNamaTipe('bilangan').kind, NIRTypeKind.INT64);
  samaDengan(NIRTypes.dariNamaTipe('desimal').kind, NIRTypeKind.FLOAT64);
  samaDengan(NIRTypes.dariNamaTipe('logika').kind, NIRTypeKind.BOOLEAN);
  samaDengan(NIRTypes.dariNamaTipe('teks').kind, NIRTypeKind.STRING);
  samaDengan(NIRTypes.dariNamaTipe('kosong').kind, NIRTypeKind.VOID);
});

// -----------------------------------------------------------------------------
// KELOMPOK 2: STRUKTUR MODUL, FUNGSI, DAN BASIC BLOCK
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 2] Struktur Modul, Fungsi, dan BasicBlock NIR');

uji('2.1 Membuat NIRModule, menetapkan target triple dan data layout', () => {
  const mod = new NIRModule('ModulUji');
  samaDengan(mod.name, 'ModulUji');
  pastikan(mod.targetTriple.length > 0, 'Target triple harus ada');
  pastikan(mod.dataLayout.length > 0, 'Data layout harus ada');
});

uji('2.2 Membuat NIRFunction dengan parameter dan tipe kembalian', () => {
  const mod = new NIRModule('ModulFungsi');
  const fn = mod.createFunction('tambah', NIRTypes.i64(), [
    { name: 'a', type: NIRTypes.i64() },
    { name: 'b', type: NIRTypes.i64() },
  ]);

  samaDengan(fn.name, 'tambah');
  samaDengan(fn.parameters.length, 2);
  samaDengan(fn.parameters[0].id, '%a');
  samaDengan(fn.parameters[1].id, '%b');
  samaDengan(fn.returnType.kind, NIRTypeKind.INT64);
  pastikan(mod.hasFunction('tambah'), 'Modul harus memiliki fungsi tambah');
});

uji('2.3 Membuat BasicBlock, menghubungkan instruksi dan terminator', () => {
  const mod = new NIRModule('ModulBlok');
  const fn = mod.createFunction('tes', NIRTypes.void(), []);
  const bbEntry = fn.createBasicBlock('entry');

  samaDengan(fn.basicBlocks.length, 1);
  samaDengan(fn.getEntryBlock(), bbEntry);
  pastikan(bbEntry.isEntryBlock(), 'Harus terdeteksi sebagai entry block');
});

// -----------------------------------------------------------------------------
// KELOMPOK 3: KUMPULAN INSTRUKSI & BUILDER (INSTRUCTION SET & BUILDER)
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 3] Kumpulan Instruksi NIR & Builder');

uji('3.1 Membangun instruksi aritmetika menggunakan NIRBuilder', () => {
  const mod = new NIRModule('ModulAritmetika');
  const fn = mod.createFunction('hitung', NIRTypes.i64(), [
    { name: 'x', type: NIRTypes.i64() },
    { name: 'y', type: NIRTypes.i64() },
  ]);
  const bb = fn.createBasicBlock('entry');
  const builder = new NIRBuilder(bb);

  const add = builder.createAdd(fn.parameters[0], fn.parameters[1], 'sum');
  const mul = builder.createMul(add, NIRConstants.i64(2), 'prod');
  const ret = builder.createRet(mul);

  samaDengan(add.opcode, NIROpcode.ADD);
  samaDengan(mul.opcode, NIROpcode.MUL);
  samaDengan(ret.opcode, NIROpcode.RET);
  samaDengan(bb.instructions.length, 2);
  samaDengan(bb.terminator, ret);
});

uji('3.2 Membangun instruksi perbandingan (ICmp & FCmp) dan logika', () => {
  const mod = new NIRModule('ModulCmp');
  const fn = mod.createFunction('bandingkan', NIRTypes.i1(), [
    { name: 'a', type: NIRTypes.i64() },
    { name: 'b', type: NIRTypes.i64() },
  ]);
  const bb = fn.createBasicBlock('entry');
  const builder = new NIRBuilder(bb);

  const cmp = builder.createICmp(NIRPredicate.SLT, fn.parameters[0], fn.parameters[1], 'is_less');
  const notCmp = builder.createXor(cmp, NIRConstants.bool(true), 'is_ge');
  builder.createRet(notCmp);

  samaDengan(cmp.predicate, NIRPredicate.SLT);
  samaDengan(notCmp.opcode, NIROpcode.XOR);
});

uji('3.3 Membangun instruksi memori: alloca, store, load, dan gep', () => {
  const mod = new NIRModule('ModulMemori');
  const fn = mod.createFunction('memori', NIRTypes.i64(), []);
  const bb = fn.createBasicBlock('entry');
  const builder = new NIRBuilder(bb);

  const alloca = builder.createAlloca(NIRTypes.i64(), 'slot');
  builder.createStore(NIRConstants.i64(42), alloca);
  const load = builder.createLoad(alloca, 'val');
  builder.createRet(load);

  pastikan(alloca.isMemoryAccess(), 'Alloca harus terdeteksi sebagai akses memori');
  samaDengan(load.opcode, NIROpcode.LOAD);
});

// -----------------------------------------------------------------------------
// KELOMPOK 4: CONTROL FLOW GRAPH (CFG) & ANALISIS DOMINATOR
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 4] Control Flow Graph (CFG) & Analisis Dominator');

uji('4.1 Membentuk CFG dengan percabangan kondisional dan blok gabungan', () => {
  const mod = new NIRModule('ModulCFG');
  const fn = mod.createFunction('cabang', NIRTypes.i64(), [{ name: 'flag', type: NIRTypes.i1() }]);

  const bbEntry = fn.createBasicBlock('entry');
  const bbThen = fn.createBasicBlock('then');
  const bbElse = fn.createBasicBlock('else');
  const bbMerge = fn.createBasicBlock('merge');

  const bEntry = new NIRBuilder(bbEntry);
  bEntry.createCondBr(fn.parameters[0], bbThen, bbElse);

  const bThen = new NIRBuilder(bbThen);
  bThen.createBr(bbMerge);

  const bElse = new NIRBuilder(bbElse);
  bElse.createBr(bbMerge);

  const bMerge = new NIRBuilder(bbMerge);
  bMerge.createRet(NIRConstants.i64(100));

  fn.rebuildCFG();
  const cfg = new ControlFlowGraph(fn);
  const valRes = cfg.validate();

  pastikan(valRes.valid, `CFG harus valid: ${valRes.errors.join(', ')}`);
  samaDengan(bbEntry.successors.length, 2, 'Entry harus memiliki 2 successor');
  samaDengan(bbMerge.predecessors.length, 2, 'Merge harus memiliki 2 predecessor');
});

uji('4.2 Menghitung Dominator Tree dan Dominance Frontier', () => {
  const mod = new NIRModule('ModulDom');
  const fn = mod.createFunction('dom', NIRTypes.void(), [{ name: 'cond', type: NIRTypes.i1() }]);

  const entry = fn.createBasicBlock('entry');
  const b1 = fn.createBasicBlock('b1');
  const b2 = fn.createBasicBlock('b2');
  const merge = fn.createBasicBlock('merge');

  new NIRBuilder(entry).createCondBr(fn.parameters[0], b1, b2);
  new NIRBuilder(b1).createBr(merge);
  new NIRBuilder(b2).createBr(merge);
  new NIRBuilder(merge).createRetVoid();

  fn.rebuildCFG();
  const cfg = new ControlFlowGraph(fn);
  const domTree = new DominatorTree(cfg);

  pastikan(domTree.dominates(entry, merge), 'Entry harus mendominasi merge');
  pastikan(!domTree.dominates(b1, merge), 'b1 tidak boleh mendominasi merge');
  pastikan(!domTree.dominates(b2, merge), 'b2 tidak boleh mendominasi merge');

  const df1 = domTree.getDominanceFrontier(b1);
  pastikan(df1.has(merge), 'Merge harus berada di dominance frontier b1');
});

// -----------------------------------------------------------------------------
// KELOMPOK 5: BENTUK SSA & KONVERSI SSA (MEM2REG)
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 5] Bentuk SSA & Konversi SSA (Mem2Reg)');

uji('5.1 Membangun dan menyederhanakan instruksi Phi SSA', () => {
  const fn = new NIRFunction('uji_phi', NIRTypes.i64(), []);
  const bb1 = fn.createBasicBlock('bb1');
  const bb2 = fn.createBasicBlock('bb2');
  const bbJoin = fn.createBasicBlock('join');

  bbJoin.predecessors = [bb1, bb2];
  const phi = PhiHelper.createPhiNode(bbJoin, NIRTypes.i64(), 'val.phi');
  phi.addIncoming(NIRConstants.i64(10), bb1);
  phi.addIncoming(NIRConstants.i64(20), bb2);

  pastikan(PhiHelper.isComplete(phi, bbJoin), 'Phi node harus lengkap untuk semua predecessor');
  samaDengan(phi.incoming.length, 2);
});

uji('5.2 Menjalankan SSAConverter (Mem2Reg) untuk mempromosikan alloca lokal', () => {
  const mod = new NIRModule('ModulSSA');
  const fn = mod.createFunction('hitung_ssa', NIRTypes.i64(), [{ name: 'flag', type: NIRTypes.i1() }]);

  const entry = fn.createBasicBlock('entry');
  const bThen = fn.createBasicBlock('then');
  const bElse = fn.createBasicBlock('else');
  const merge = fn.createBasicBlock('merge');

  // Entry: alokasi x
  const bEntry = new NIRBuilder(entry);
  const xAlloca = bEntry.createAlloca(NIRTypes.i64(), 'x');
  bEntry.createCondBr(fn.parameters[0], bThen, bElse);

  // Then: x = 10
  const bT = new NIRBuilder(bThen);
  bT.createStore(NIRConstants.i64(10), xAlloca);
  bT.createBr(merge);

  // Else: x = 20
  const bE = new NIRBuilder(bElse);
  bE.createStore(NIRConstants.i64(20), xAlloca);
  bE.createBr(merge);

  // Merge: kembalikan load x
  const bM = new NIRBuilder(merge);
  const loadX = bM.createLoad(xAlloca, 'res');
  bM.createRet(loadX);

  fn.rebuildCFG();

  // Jalankan konversi Mem2Reg
  const converter = new SSAConverter(fn);
  const converted = converter.run();

  pastikan(converted, 'Konversi SSA harus sukses');
  pastikan(merge.phiNodes.length > 0, 'Blok merge harus memiliki Phi node hasil konversi SSA');

  // Verifikasi bentuk SSA
  const ssaVerif = new SSAVerifier(fn);
  const ssaRes = ssaVerif.verify();
  pastikan(ssaRes.valid, `SSA Verifier harus valid: ${ssaRes.errors.join(', ')}`);
});

// -----------------------------------------------------------------------------
// KELOMPOK 6: AST TO NIR LOWERING
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 6] AST to NIR Lowering (Konversi Bahasa Nusantara ke NIR)');

uji('6.1 Menurunkan program sederhana dengan aritmetika ke NIR', () => {
  const kode = `
program HitungSederhana
mulai
    a : bilangan = 15
    b : bilangan = 25
    c : bilangan = a + b * 2
selesai
  `;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const lowering = new ASTToNIRLowering('HitungSederhana');
  const nirMod = lowering.lower(ast);

  pastikan(nirMod.hasFunction('utama'), 'Modul NIR harus memiliki fungsi utama');
  const fnUtama = nirMod.getFunction('utama')!;
  pastikan(fnUtama.basicBlocks.length >= 1, 'Fungsi utama harus memiliki basic block');

  const verifRes = NIRVerifier.verifyModule(nirMod);
  pastikan(verifRes.valid, `Modul hasil lowering harus valid: ${verifRes.errors.join(', ')}`);
});

uji('6.2 Menurunkan percabangan jika-maka-selain ke NIR CFG', () => {
  const kode = `
program UjiPercabangan
mulai
    x : bilangan = 10
    hasil : bilangan = 0
    jika x > 5 maka
        hasil = 100
    selain
        hasil = 200
    akhir
selesai
  `;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const lowering = new ASTToNIRLowering('UjiPercabangan');
  const nirMod = lowering.lower(ast);
  const fn = nirMod.getFunction('utama')!;

  pastikan(fn.basicBlocks.length >= 4, 'Percabangan harus menghasilkan minimal 4 basic block');
  const verif = NIRVerifier.verifyModule(nirMod);
  pastikan(verif.valid, `Modul percabangan harus valid: ${verif.errors.join(', ')}`);
});

uji('6.3 Menurunkan perulangan selama dan untuk ke NIR CFG', () => {
  const kode = `
program UjiPerulangan
mulai
    total : bilangan = 0
    i : bilangan = 1
    selama i <= 5 lakukan
        total = total + i
        i = i + 1
    selesai
selesai
  `;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const lowering = new ASTToNIRLowering('UjiPerulangan');
  const nirMod = lowering.lower(ast);

  const verif = NIRVerifier.verifyModule(nirMod);
  pastikan(verif.valid, `Modul perulangan harus valid: ${verif.errors.join(', ')}`);
});

uji('6.4 Menurunkan deklarasi fungsi terpisah dan pemanggilan rekursif ke NIR', () => {
  const kode = `
program UjiFungsi
fungsi faktorial(n : bilangan) : bilangan
mulai
    jika n <= 1 maka
        kembalikan 1
    akhir
    kembalikan n * faktorial(n - 1)
selesai

mulai
    hasil : bilangan = faktorial(5)
selesai
  `;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const lowering = new ASTToNIRLowering('UjiFungsi');
  const nirMod = lowering.lower(ast);

  pastikan(nirMod.hasFunction('faktorial'), 'Fungsi faktorial harus ada di NIR');
  const fnFak = nirMod.getFunction('faktorial')!;
  samaDengan(fnFak.parameters.length, 1);
  samaDengan(fnFak.returnType.kind, NIRTypeKind.INT64);

  const verif = NIRVerifier.verifyModule(nirMod);
  pastikan(verif.valid, `Modul fungsi harus valid: ${verif.errors.join(', ')}`);
});

// -----------------------------------------------------------------------------
// KELOMPOK 7: NIR VERIFIER & DETEKSI KESALAHAN
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 7] NIR Verifier & Deteksi Kesalahan Semantik IR');

uji('7.1 Verifier mendeteksi blok yang tidak memiliki terminator', () => {
  const mod = new NIRModule('ModulCacat');
  const fn = mod.createFunction('cacat', NIRTypes.void(), []);
  fn.createBasicBlock('entry'); // Tanpa terminator

  const res = NIRVerifier.verifyModule(mod);
  pastikan(!res.valid, 'Verifier harus menolak blok tanpa terminator');
  pastikan(res.errors.some((e) => e.includes('terminator')), 'Pesan galat harus menyebutkan terminator');
});

uji('7.2 Verifier mendeteksi ketidakcocokan tipe operand pada instruksi biner', () => {
  const mod = new NIRModule('ModulTipeSalah');
  const fn = mod.createFunction('tipe_salah', NIRTypes.i64(), []);
  const bb = fn.createBasicBlock('entry');
  const builder = new NIRBuilder(bb);

  // Coba tambahkan i64 dengan f64
  builder.createAdd(NIRConstants.i64(10), NIRConstants.float(3.14), 'bad_add');
  builder.createRet(NIRConstants.i64(0));

  const res = NIRVerifier.verifyModule(mod);
  pastikan(!res.valid, 'Verifier harus menolak operasi biner dengan tipe operand berbeda');
});

// -----------------------------------------------------------------------------
// KELOMPOK 8: SERIALISASI & DESERIALISASI JSON
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 8] Serialisasi & Deserialisasi JSON (Round-Trip)');

uji('8.1 Serialisasi NIRModule ke JSON string dan deserialisasi kembali', () => {
  const mod = new NIRModule('ModulSerde');
  const fn = mod.createFunction('tambah', NIRTypes.i64(), [
    { name: 'a', type: NIRTypes.i64() },
    { name: 'b', type: NIRTypes.i64() },
  ]);
  const bb = fn.createBasicBlock('entry');
  const builder = new NIRBuilder(bb);
  const res = builder.createAdd(fn.parameters[0], fn.parameters[1], 'sum');
  builder.createRet(res);

  // Serialisasi ke JSON
  const jsonStr = NIRSerializer.toJSONString(mod, true);
  pastikan(jsonStr.includes('nusantara-nir-v1'), 'Format JSON harus memuat skema resmi');

  // Deserialisasi kembali
  const modReconstructed = NIRDeserializer.fromJSONString(jsonStr);
  samaDengan(modReconstructed.name, 'ModulSerde');
  pastikan(modReconstructed.hasFunction('tambah'), 'Fungsi tambah harus terpulihkan');

  const fnRecon = modReconstructed.getFunction('tambah')!;
  samaDengan(fnRecon.parameters.length, 2);
  samaDengan(fnRecon.basicBlocks.length, 1);

  // Verifikasi modul hasil rekonstruksi
  const verif = NIRVerifier.verifyModule(modReconstructed);
  pastikan(verif.valid, `Modul hasil rekonstruksi harus valid: ${verif.errors.join(', ')}`);
});

// -----------------------------------------------------------------------------
// KELOMPOK 9: NIR OPTIMIZER (PIPELINE & PASSES)
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 9] NIR Optimizer (Constant Folding, Simplification & DCE)');

uji('9.1 Constant Folding Pass melipat operasi konstanta saat kompilasi', () => {
  const mod = new NIRModule('ModulFold');
  const fn = mod.createFunction('fold_test', NIRTypes.i64(), []);
  const bb = fn.createBasicBlock('entry');
  const builder = new NIRBuilder(bb);

  // 10 + 20 -> 30
  const c1 = builder.createAdd(NIRConstants.i64(10), NIRConstants.i64(20), 'c1');
  // c1 * 2 -> 60
  const c2 = builder.createMul(c1, NIRConstants.i64(2), 'c2');
  builder.createRet(c2);

  const foldPass = new ConstantFoldingPass();
  const modified = foldPass.runOnFunction(fn);
  pastikan(modified, 'Constant folding harus memodifikasi fungsi');

  // Periksa terminator sekarang mengembalikan konstanta 60
  const term = bb.terminator as any;
  pastikan(term.returnValue instanceof NIRConstantInt, 'Return value harus berupa konstanta');
  samaDengan(BigInt((term.returnValue as NIRConstantInt).value), 60n);
});

uji('9.2 Algebraic Simplification Pass menyederhanakan identitas aljabar', () => {
  const mod = new NIRModule('ModulAljabar');
  const fn = mod.createFunction('aljabar', NIRTypes.i64(), [{ name: 'x', type: NIRTypes.i64() }]);
  const bb = fn.createBasicBlock('entry');
  const builder = new NIRBuilder(bb);

  // x + 0 -> x
  const s1 = builder.createAdd(fn.parameters[0], NIRConstants.i64(0), 's1');
  // s1 * 1 -> s1
  const s2 = builder.createMul(s1, NIRConstants.i64(1), 's2');
  builder.createRet(s2);

  const simpPass = new SimplificationPass();
  const modified = simpPass.runOnFunction(fn);
  pastikan(modified, 'Penyederhanaan aljabar harus memodifikasi fungsi');
});

uji('9.3 Dead Code Elimination (DCE) menghapus instruksi yang tidak terpakai', () => {
  const mod = new NIRModule('ModulDCE');
  const fn = mod.createFunction('dce_test', NIRTypes.i64(), [{ name: 'val', type: NIRTypes.i64() }]);
  const bb = fn.createBasicBlock('entry');
  const builder = new NIRBuilder(bb);

  // Instruksi mati yang tidak digunakan
  builder.createAdd(fn.parameters[0], NIRConstants.i64(999), 'dead1');
  builder.createMul(fn.parameters[0], NIRConstants.i64(888), 'dead2');

  // Instruksi yang digunakan
  const live = builder.createAdd(fn.parameters[0], NIRConstants.i64(1), 'live');
  builder.createRet(live);

  samaDengan(bb.instructions.length, 3, 'Awalnya harus ada 3 instruksi');

  const dcePass = new DeadCodeEliminationPass();
  dcePass.runOnFunction(fn);

  samaDengan(bb.instructions.length, 1, 'Setelah DCE hanya boleh tersisa 1 instruksi yang hidup');
  samaDengan(bb.instructions[0].id, '%live');
});

uji('9.4 Menjalankan Pipeline Lengkap NIRPassManager (O2)', () => {
  const mod = new NIRModule('ModulPipeline');
  const fn = mod.createFunction('optimasi_penuh', NIRTypes.i64(), [{ name: 'x', type: NIRTypes.i64() }]);
  const bb = fn.createBasicBlock('entry');
  const builder = new NIRBuilder(bb);

  const c = builder.createAdd(NIRConstants.i64(5), NIRConstants.i64(5), 'ten'); // -> 10
  const d = builder.createMul(c, NIRConstants.i64(0), 'zero'); // -> 0
  const res = builder.createAdd(fn.parameters[0], d, 'res'); // -> x + 0 -> x
  builder.createRet(res);

  const pm = NIRPassManager.createO2Pipeline();
  pm.run(mod);

  const term = bb.terminator as any;
  samaDengan(term.returnValue, fn.parameters[0], 'Pipeline harus mengoptimalkan seluruh rantai menjadi %x');
});

uji('9.5 Semantic Preservation: Hasil Evaluasi Semantik Sebelum dan Sesudah Optimasi Konsisten', () => {
  // Menguji bahwa optimasi mempertahankan semantik fungsional program:
  // 1. Aritmetika konstan (10 + 20) * 2 - 15 = 45
  // 2. Dead code yang tidak mempengaruhi hasil akhir
  // 3. Simbol aljabar x * 1 + 0 = x
  const modAsli = new NIRModule('ModulSemantikAsli');
  const fnAsli = modAsli.createFunction('hitung', NIRTypes.i64(), [{ name: 'val', type: NIRTypes.i64() }]);
  const bbAsli = fnAsli.createBasicBlock('entry');
  const bAsli = new NIRBuilder(bbAsli);

  // Perhitungan nyata
  const k1 = bAsli.createAdd(NIRConstants.i64(10), NIRConstants.i64(20), 'k1'); // 30
  const k2 = bAsli.createMul(k1, NIRConstants.i64(2), 'k2'); // 60
  const k3 = bAsli.createSub(k2, NIRConstants.i64(15), 'k3'); // 45
  // Ekspresi aljabar dengan parameter
  const a1 = bAsli.createMul(fnAsli.parameters[0], NIRConstants.i64(1), 'a1'); // val * 1 -> val
  const a2 = bAsli.createAdd(a1, NIRConstants.i64(0), 'a2'); // val + 0 -> val
  // Gabungkan
  const total = bAsli.createAdd(a2, k3, 'total'); // val + 45
  // Instruksi mati yang tidak mempengaruhi total
  bAsli.createMul(total, NIRConstants.i64(9999), 'deadInst');
  bAsli.createRet(total);

  // Evaluasi manual nilai asli untuk val = 10 -> harus menghasilkan 55
  const hitungManual = (val: bigint) => {
    const k_1 = 10n + 20n;
    const k_2 = k_1 * 2n;
    const k_3 = k_2 - 15n;
    const a_1 = val * 1n;
    const a_2 = a_1 + 0n;
    return a_2 + k_3;
  };
  const hasilExpected = hitungManual(10n); // 55n

  // Sekarang jalankan optimasi O2 pada salinan modul yang identik
  const pm = NIRPassManager.createO2Pipeline();
  pm.run(modAsli);

  // Verifikasi struktur setelah optimasi
  // total = add %val, 45
  // ret %total
  const retTerm = bbAsli.terminator as any;
  pastikan(retTerm.returnValue instanceof NIRInstruction, 'Terminator harus mengembalikan instruksi hasil');
  const retInst = retTerm.returnValue as NIRBinaryInst;
  samaDengan(retInst.opcode, NIROpcode.ADD, 'Instruksi hasil harus berupa operasi penjumlahan');
  
  // Salah satu operand adalah parameter %val, yang lainnya adalah konstanta 45
  const ops = [retInst.lhs, retInst.rhs];
  const hasParam = ops.includes(fnAsli.parameters[0]);
  const constOp = ops.find((op) => op instanceof NIRConstantInt) as NIRConstantInt;
  
  pastikan(hasParam, 'Operand harus memuat parameter %val');
  pastikan(!!constOp, 'Operand harus memuat konstanta yang telah dilipat');
  samaDengan(BigInt(constOp.value), 45n, 'Konstanta terlipat harus bernilai 45n');

  // Nilai semantik untuk input 10: 10 + 45 = 55 (preservasi 100%)
  const hasilOptimasi = 10n + BigInt(constOp.value);
  samaDengan(hasilOptimasi, hasilExpected, 'Hasil semantik setelah optimasi harus identik dengan nilai asli (55)');
});

// -----------------------------------------------------------------------------
// KELOMPOK 10: INTEGRASI CLI & REGRESI KOMPILER LAMA
// -----------------------------------------------------------------------------
console.log('\n[KELOMPOK 10] Integrasi CLI & Regresi Kompiler Lama');

uji('10.1 Perintah CLI "nusantara nir" menghasilkan output NIR tekstual', () => {
  const memori = new PembacaBerkasMemori();
  memori.tulis(
    '/uji_cli.nusantara',
    `
program HaloNIR
mulai
    angka : bilangan = 42
    tampilkan("Hasil:", angka)
selesai
    `
  );

  let outputLog = '';
  const cli = new NusantaraCLI({
    pembaca: memori,
    direktoriProyek: '/',
    penulisLog: (m: string) => {
      outputLog += m + '\n';
    },
  });

  const exitCode = cli.jalankan(['nir', '/uji_cli.nusantara']);
  samaDengan(exitCode, 0, 'CLI nir harus keluar dengan kode 0');
  pastikan(outputLog.includes('define i32 @utama'), 'Output harus memuat fungsi @utama');
  pastikan(outputLog.includes('target datalayout'), 'Output harus memuat metadata target');
});

uji('10.2 Perintah CLI "nusantara nir --verify" memverifikasi integritas NIR', () => {
  const memori = new PembacaBerkasMemori();
  memori.tulis(
    '/uji_verif.nusantara',
    `
program VerifCLI
mulai
    x : bilangan = 100
selesai
    `
  );

  let outputLog = '';
  const cli = new NusantaraCLI({
    pembaca: memori,
    direktoriProyek: '/',
    penulisLog: (m: string) => {
      outputLog += m + '\n';
    },
  });

  const exitCode = cli.jalankan(['nir', '--verify', '/uji_verif.nusantara']);
  samaDengan(exitCode, 0, 'CLI nir --verify harus keluar dengan kode 0');
  pastikan(outputLog.includes('LULUS 100%'), 'Output harus mengonfirmasi verifikasi lulus');
});

uji('10.3 Perintah CLI "nusantara nir --json" mengekspor skema JSON valid', () => {
  const memori = new PembacaBerkasMemori();
  memori.tulis(
    '/uji_json.nusantara',
    `
program JsonCLI
mulai
    y : bilangan = 50
selesai
    `
  );

  let outputLog = '';
  const cli = new NusantaraCLI({
    pembaca: memori,
    direktoriProyek: '/',
    penulisLog: (m: string) => {
      outputLog += m + '\n';
    },
  });

  const exitCode = cli.jalankan(['nir', '--json', '/uji_json.nusantara']);
  samaDengan(exitCode, 0, 'CLI nir --json harus keluar dengan kode 0');
  const parsed = JSON.parse(outputLog);
  samaDengan(parsed.schema, 'nusantara-nir-v1');
  pastikan(!!parsed.functions.utama, 'Fungsi utama harus ada dalam JSON');
});

uji('10.4 Uji Regresi: Interpreter dan Pipeline Eksekusi Lama Tetap Berfungsi 100%', () => {
  const memori = new PembacaBerkasMemori();
  memori.tulis(
    '/regresi.nusantara',
    `
program RegresiLama
fungsi tambah(x : bilangan, y : bilangan) : bilangan
mulai
    kembalikan x + y
selesai

mulai
    hasil : bilangan = tambah(15, 27)
    tampilkan("TOTAL:", hasil)
selesai
    `
  );

  const penulis = new PenulisOutputBuffer();

  const resolver = new ResolverModul(memori, { direktoriAkarProyek: '/' });
  const pemuat = new PemuatModul(resolver, memori, {});
  const interpreter = new Interpreter(penulis, {
    pembacaBerkas: memori,
    pemuatModul: pemuat,
    resolverModul: resolver,
    direktoriBasis: '/',
  });

  const parser = new Parser(memori.baca('/regresi.nusantara'));
  const ast = parser.parse();
  interpreter.interpretasikan(ast, '/');

  const bufferLog = penulis.ambilOutput();
  pastikan(bufferLog.includes('TOTAL: 42'), 'Interpreter lama harus tetap menghasilkan output yang tepat');
});

uji('10.5 Teks NIR memancarkan konstanta literal (ret i32 0, string) tanpa register menggantung & round-trip JSON', () => {
  const kode = `
program UjiKonstantaNIR
mulai
    tampilkan("Halo NIR")
selesai
`;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const lowering = new ASTToNIRLowering('UjiKonstanta');
  const nirMod = lowering.lower(ast);

  const text = NIRFormatter.formatText(nirMod);
  pastikan(text.includes('ret i32 0'), `Fungsi utama harus berakhir dengan 'ret i32 0', ditemukan:\n${text}`);
  pastikan(text.includes('"Halo NIR"'), `Teks NIR harus memuat konstanta string "Halo NIR", ditemukan:\n${text}`);
  pastikan(!/ret i32 %v\d+/.test(text), `Teks NIR tidak boleh menyisakan register konstanta menggantung:\n${text}`);

  const jsonStr = NIRSerializer.toJSONString(nirMod);
  const restored = NIRDeserializer.fromJSONString(jsonStr);
  const restoredText = NIRFormatter.formatText(restored);
  pastikan(restoredText.includes('ret i32 0'), 'Konstanta ret i32 0 harus bertahan setelah deserialisasi JSON');
});

// -----------------------------------------------------------------------------
// REKAPITULASI HASIL
// -----------------------------------------------------------------------------
console.log('\n======================================================================');
console.log(`HASIL PENGUJIAN PHASE 43: ${ujiBerhasil} LULUS, ${ujiGagal} GAGAL (Total: ${totalUji})`);
if (ujiGagal === 0) {
  console.log('Semua pengujian Fase 43 BERHASIL 100%!');
}
console.log('======================================================================');

if (ujiGagal > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
