/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA INTERMEDIATE REPRESENTATION (NIR) - AST to NIR Lowering
 * Target Milestone: Phase 43 (v0.43.0)
 */

import {
  EkspresiAST,
  JenisNodeAST,
  NodeDeklarasiFungsi,
  NodeDeklarasiTetap,
  NodeDeklarasiVariabel,
  NodeEkspresiBiner,
  NodeEkspresiPengelompokan,
  NodeEkspresiUnari,
  NodeInstruksiHentikan,
  NodeInstruksiKembalikan,
  NodeInstruksiLanjutkan,
  NodeLiteral,
  NodeLiteralDaftar,
  NodePemanggilanFungsi,
  NodePengidentifikasi,
  NodePenugasan,
  NodePercabanganJika,
  NodePernyataanBlok,
  NodePernyataanEkspresi,
  NodePerulanganSelama,
  NodePerulanganUntuk,
  NodeProgram,
  PernyataanAST,
} from '../../../parser/ast';
import { NIRBasicBlock } from '../basic-block';
import { NIRBuilder } from '../builder';
import { NIRConstants } from '../constant';
import { NIRFunction } from '../function';
import { NIRCastKind, NIRPredicate } from '../instruction';
import { NIRModule } from '../module';
import { NIRType, NIRTypeKind, NIRTypes } from '../type';
import { NIRGlobal, NIRValue } from '../value';

interface LoopContext {
  breakBlock: NIRBasicBlock;
  continueBlock: NIRBasicBlock;
}

export class ASTToNIRLowering {
  private module: NIRModule;
  private builder: NIRBuilder;
  private currentFunction: NIRFunction | null = null;
  private symbolTable: Map<string, NIRValue> = new Map();
  private loopStack: LoopContext[] = [];
  private blockCounter: number = 0;

  constructor(moduleName: string = 'NusantaraProgram') {
    this.module = new NIRModule(moduleName);
    this.builder = new NIRBuilder();
  }

  public lower(ast: NodeProgram): NIRModule {
    // 1. Proses deklarasi fungsi terlebih dahulu (prototype pass)
    for (const fnDecl of ast.daftarFungsi) {
      this.declareFunction(fnDecl);
    }

    // 2. Turunkan isi setiap deklarasi fungsi
    for (const fnDecl of ast.daftarFungsi) {
      this.lowerFunction(fnDecl);
    }

    // 3. Turunkan tubuh utama program ke dalam fungsi @utama
    this.lowerMainProgram(ast);

    // 4. Bangun ulang CFG untuk seluruh fungsi dalam modul
    for (const fn of this.module.functions.values()) {
      fn.rebuildCFG();
    }

    return this.module;
  }

  private declareFunction(decl: NodeDeklarasiFungsi): NIRFunction {
    const returnType = decl.tipeKembalian
      ? NIRTypes.dariNamaTipe(decl.tipeKembalian)
      : NIRTypes.void();

    const paramTypes = decl.parameter.map((p: any) => ({
      name: p.nama,
      type: NIRTypes.dariNamaTipe(p.tipeData),
    }));

    return this.module.createFunction(decl.nama, returnType, paramTypes);
  }

  private lowerFunction(decl: NodeDeklarasiFungsi): void {
    const fn = this.module.getFunction(decl.nama)!;
    this.currentFunction = fn;
    this.symbolTable.clear();

    const entryBB = fn.createBasicBlock('entry');
    this.builder.setInsertPoint(entryBB);

    // Buat alloca untuk setiap parameter agar mutable secara lokal
    for (let i = 0; i < decl.parameter.length; i++) {
      const pDecl = decl.parameter[i];
      const pVal = fn.parameters[i];
      const alloca = this.builder.createAlloca(pVal.type, `${pDecl.nama}.addr`);
      this.builder.createStore(pVal, alloca);
      this.symbolTable.set(pDecl.nama, alloca);
    }

    // Turunkan setiap pernyataan dalam tubuh fungsi
    for (const stmt of decl.tubuh) {
      this.lowerStatement(stmt);
      if (this.builder.getInsertBlock()?.hasTerminator()) {
        break;
      }
    }

    // Pastikan blok terakhir memiliki terminator
    const currentBB = this.builder.getInsertBlock();
    if (currentBB && !currentBB.hasTerminator()) {
      if (fn.returnType.isVoid()) {
        this.builder.createRetVoid();
      } else if (fn.returnType.kind === NIRTypeKind.INT64 || fn.returnType.kind === NIRTypeKind.INT32) {
        this.builder.createRet(NIRConstants.int(0, fn.returnType));
      } else if (fn.returnType.kind === NIRTypeKind.FLOAT64) {
        this.builder.createRet(NIRConstants.float(0.0));
      } else if (fn.returnType.kind === NIRTypeKind.BOOLEAN) {
        this.builder.createRet(NIRConstants.bool(false));
      } else {
        this.builder.createRet(NIRConstants.null(fn.returnType));
      }
    }

    this.currentFunction = null;
  }

  private lowerMainProgram(ast: NodeProgram): void {
    const fn = this.module.createFunction('utama', NIRTypes.i32(), []);
    this.currentFunction = fn;
    this.symbolTable.clear();

    const entryBB = fn.createBasicBlock('entry');
    this.builder.setInsertPoint(entryBB);

    for (const stmt of ast.tubuhUtama) {
      this.lowerStatement(stmt);
      if (this.builder.getInsertBlock()?.hasTerminator()) {
        break;
      }
    }

    const currentBB = this.builder.getInsertBlock();
    if (currentBB && !currentBB.hasTerminator()) {
      this.builder.createRet(NIRConstants.i32(0));
    }

    this.currentFunction = null;
  }

  private lowerStatement(stmt: PernyataanAST): void {
    switch (stmt.jenis) {
      case JenisNodeAST.DEKLARASI_VARIABEL:
      case JenisNodeAST.DEKLARASI_TETAP:
        this.lowerVarDecl(stmt as NodeDeklarasiVariabel | NodeDeklarasiTetap);
        break;
      case JenisNodeAST.PENUGASAN:
        this.lowerAssignment(stmt as NodePenugasan);
        break;
      case JenisNodeAST.PERCABANGAN_JIKA:
        this.lowerIf(stmt as NodePercabanganJika);
        break;
      case JenisNodeAST.PERULANGAN_SELAMA:
        this.lowerWhile(stmt as NodePerulanganSelama);
        break;
      case JenisNodeAST.PERULANGAN_UNTUK:
        this.lowerFor(stmt as NodePerulanganUntuk);
        break;
      case JenisNodeAST.INSTRUKSI_KEMBALIKAN:
        this.lowerReturn(stmt as NodeInstruksiKembalikan);
        break;
      case JenisNodeAST.INSTRUKSI_HENTIKAN:
        this.lowerBreak();
        break;
      case JenisNodeAST.INSTRUKSI_LANJUTKAN:
        this.lowerContinue();
        break;
      case JenisNodeAST.PERNYATAAN_EKSPRESI:
        this.lowerExpression((stmt as NodePernyataanEkspresi).ekspresi);
        break;
      case JenisNodeAST.PERNYATAAN_BLOK:
        for (const s of (stmt as NodePernyataanBlok).daftarPernyataan) {
          this.lowerStatement(s);
          if (this.builder.getInsertBlock()?.hasTerminator()) break;
        }
        break;
      default:
        break;
    }
  }

  private lowerVarDecl(decl: NodeDeklarasiVariabel | NodeDeklarasiTetap): void {
    const varType = decl.tipeData
      ? NIRTypes.dariNamaTipe(decl.tipeData)
      : NIRTypes.any();

    const alloca = this.builder.createAlloca(varType, `${decl.nama}.addr`);
    this.symbolTable.set(decl.nama, alloca);

    if (decl.nilaiAwal) {
      const initVal = this.lowerExpression(decl.nilaiAwal);
      this.builder.createStore(initVal, alloca);
    }
  }

  private lowerAssignment(assign: NodePenugasan): void {
    const ptr = this.symbolTable.get(assign.target);
    if (!ptr) {
      // Deklarasi implisit jika belum ada di tabel simbol
      const val = this.lowerExpression(assign.nilai);
      const alloca = this.builder.createAlloca(val.type, `${assign.target}.addr`);
      this.symbolTable.set(assign.target, alloca);
      this.builder.createStore(val, alloca);
      return;
    }

    const val = this.lowerExpression(assign.nilai);
    this.builder.createStore(val, ptr);
  }

  private lowerIf(ifStmt: NodePercabanganJika): void {
    const fn = this.currentFunction!;
    const condVal = this.lowerExpression(ifStmt.kondisi);

    const bId = ++this.blockCounter;
    const thenBB = fn.createBasicBlock(`jika.maka.${bId}`);
    const elseBB = ifStmt.cabangSelain ? fn.createBasicBlock(`jika.selain.${bId}`) : null;
    const mergeBB = fn.createBasicBlock(`jika.gabung.${bId}`);

    // Percabangan kondisional
    this.builder.createCondBr(condVal, thenBB, elseBB || mergeBB);

    // Cabang Maka
    this.builder.setInsertPoint(thenBB);
    for (const s of ifStmt.cabangMaka) {
      this.lowerStatement(s);
      if (this.builder.getInsertBlock()?.hasTerminator()) break;
    }
    if (!this.builder.getInsertBlock()?.hasTerminator()) {
      this.builder.createBr(mergeBB);
    }

    // Cabang Selain (jika ada)
    if (elseBB && ifStmt.cabangSelain) {
      this.builder.setInsertPoint(elseBB);
      for (const s of ifStmt.cabangSelain) {
        this.lowerStatement(s);
        if (this.builder.getInsertBlock()?.hasTerminator()) break;
      }
      if (!this.builder.getInsertBlock()?.hasTerminator()) {
        this.builder.createBr(mergeBB);
      }
    }

    this.builder.setInsertPoint(mergeBB);
  }

  private lowerWhile(whileStmt: NodePerulanganSelama): void {
    const fn = this.currentFunction!;
    const bId = ++this.blockCounter;

    const condBB = fn.createBasicBlock(`selama.kondisi.${bId}`);
    const bodyBB = fn.createBasicBlock(`selama.tubuh.${bId}`);
    const exitBB = fn.createBasicBlock(`selama.selesai.${bId}`);

    this.builder.createBr(condBB);

    // Blok Kondisi
    this.builder.setInsertPoint(condBB);
    const condVal = this.lowerExpression(whileStmt.kondisi);
    this.builder.createCondBr(condVal, bodyBB, exitBB);

    // Blok Tubuh
    this.loopStack.push({ breakBlock: exitBB, continueBlock: condBB });
    this.builder.setInsertPoint(bodyBB);

    for (const s of whileStmt.tubuh) {
      this.lowerStatement(s);
      if (this.builder.getInsertBlock()?.hasTerminator()) break;
    }

    if (!this.builder.getInsertBlock()?.hasTerminator()) {
      this.builder.createBr(condBB);
    }

    this.loopStack.pop();
    this.builder.setInsertPoint(exitBB);
  }

  private lowerFor(forStmt: NodePerulanganUntuk): void {
    const fn = this.currentFunction!;
    const bId = ++this.blockCounter;

    const initVal = this.lowerExpression(forStmt.nilaiAwal);
    const endVal = this.lowerExpression(forStmt.nilaiAkhir);

    // Alloca untuk variabel penghitung
    const counterAlloca = this.builder.createAlloca(initVal.type, `${forStmt.variabelPenghitung}.addr`);
    this.builder.createStore(initVal, counterAlloca);
    this.symbolTable.set(forStmt.variabelPenghitung, counterAlloca);

    const condBB = fn.createBasicBlock(`untuk.kondisi.${bId}`);
    const bodyBB = fn.createBasicBlock(`untuk.tubuh.${bId}`);
    const stepBB = fn.createBasicBlock(`untuk.langkah.${bId}`);
    const exitBB = fn.createBasicBlock(`untuk.selesai.${bId}`);

    this.builder.createBr(condBB);

    // Blok Kondisi: counter <= endVal
    this.builder.setInsertPoint(condBB);
    const currentCounter = this.builder.createLoad(counterAlloca, `${forStmt.variabelPenghitung}.cur`);
    const cond = this.builder.createICmp(NIRPredicate.SLE, currentCounter, endVal, 'untuk.cmp');
    this.builder.createCondBr(cond, bodyBB, exitBB);

    // Blok Tubuh
    this.loopStack.push({ breakBlock: exitBB, continueBlock: stepBB });
    this.builder.setInsertPoint(bodyBB);

    for (const s of forStmt.tubuh) {
      this.lowerStatement(s);
      if (this.builder.getInsertBlock()?.hasTerminator()) break;
    }

    if (!this.builder.getInsertBlock()?.hasTerminator()) {
      this.builder.createBr(stepBB);
    }

    this.loopStack.pop();

    // Blok Langkah: counter = counter + 1
    this.builder.setInsertPoint(stepBB);
    const stepVal = this.builder.createLoad(counterAlloca, `${forStmt.variabelPenghitung}.step`);
    const nextVal = this.builder.createAdd(stepVal, NIRConstants.i64(1), 'untuk.inc');
    this.builder.createStore(nextVal, counterAlloca);
    this.builder.createBr(condBB);

    this.builder.setInsertPoint(exitBB);
  }

  private lowerReturn(retStmt: NodeInstruksiKembalikan): void {
    if (retStmt.nilai) {
      let val = this.lowerExpression(retStmt.nilai);
      if (
        this.currentFunction &&
        this.currentFunction.returnType.kind === NIRTypeKind.INT32 &&
        val.type.kind === NIRTypeKind.INT64
      ) {
        val = this.builder.createCast(NIRCastKind.TRUNC, val, NIRTypes.i32(), 'ret.trunc');
      }
      this.builder.createRet(val);
    } else {
      this.builder.createRetVoid();
    }
  }

  private lowerBreak(): void {
    if (this.loopStack.length === 0) {
      throw new Error('Instruksi hentikan (break) berada di luar perulangan');
    }
    const ctx = this.loopStack[this.loopStack.length - 1];
    this.builder.createBr(ctx.breakBlock);
  }

  private lowerContinue(): void {
    if (this.loopStack.length === 0) {
      throw new Error('Instruksi lanjutkan (continue) berada di luar perulangan');
    }
    const ctx = this.loopStack[this.loopStack.length - 1];
    this.builder.createBr(ctx.continueBlock);
  }

  public lowerExpression(expr: EkspresiAST): NIRValue {
    switch (expr.jenis) {
      case JenisNodeAST.LITERAL: {
        const lit = expr as NodeLiteral;
        if (lit.tipeLiteral === 'bilangan') {
          return NIRConstants.i64(Number(lit.nilaiTerurai ?? lit.nilaiMentah));
        }
        if (lit.tipeLiteral === 'desimal') {
          return NIRConstants.float(Number(lit.nilaiTerurai ?? lit.nilaiMentah));
        }
        if (lit.tipeLiteral === 'logika') {
          return NIRConstants.bool(Boolean(lit.nilaiTerurai));
        }
        if (lit.tipeLiteral === 'teks') {
          return NIRConstants.string(String(lit.nilaiTerurai ?? ''));
        }
        return NIRConstants.null();
      }

      case JenisNodeAST.PENGIDENTIFIKASI: {
        const idNode = expr as NodePengidentifikasi;
        const ptr = this.symbolTable.get(idNode.nama);
        if (ptr) {
          return this.builder.createLoad(ptr);
        }
        const global = this.module.getGlobal(idNode.nama);
        if (global) {
          return this.builder.createLoad(global);
        }
        throw new Error(`Variabel '${idNode.nama}' tidak ditemukan dalam tabel simbol NIR`);
      }

      case JenisNodeAST.EKSPRESI_BINER: {
        const bin = expr as NodeEkspresiBiner;
        const lhs = this.lowerExpression(bin.kiri);
        const rhs = this.lowerExpression(bin.kanan);
        return this.lowerBinaryOp(bin.operator, lhs, rhs);
      }

      case JenisNodeAST.EKSPRESI_UNARI: {
        const un = expr as NodeEkspresiUnari;
        const arg = this.lowerExpression(un.argumen);
        if (un.operator === '-') {
          if (arg.type.isFloat()) {
            return this.builder.createFDiv(arg, NIRConstants.float(-1.0), 'fneg');
          }
          return this.builder.createSub(NIRConstants.i64(0), arg, 'neg');
        }
        if (un.operator === 'tidak' || un.operator === '!') {
          return this.builder.createXor(arg, NIRConstants.bool(true), 'not');
        }
        return arg;
      }

      case JenisNodeAST.EKSPRESI_PENGELOMPOKAN: {
        return this.lowerExpression((expr as NodeEkspresiPengelompokan).ekspresi);
      }

      case JenisNodeAST.PEMANGGILAN_FUNGSI: {
        const call = expr as NodePemanggilanFungsi;
        const args = call.argumen.map((a: any) => this.lowerExpression(a));

        if (call.namaFungsi === 'tampilkan' || call.namaFungsi === 'cetak') {
          if (args.length === 0) {
            return this.builder.createCall('nusantara_cetak_baris', [], NIRTypes.void(), 'cetak.baris');
          }
          for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const isLast = i === args.length - 1;
            if (i > 0) {
              this.builder.createCall(
                'nusantara_cetak_teks_inline',
                [NIRConstants.string(' ')],
                NIRTypes.void(),
                'cetak.spasi'
              );
            }
            if (arg.type.kind === NIRTypeKind.STRING || arg.type.kind === NIRTypeKind.POINTER || arg.type.kind === NIRTypeKind.ANY) {
              this.builder.createCall(
                isLast ? 'nusantara_cetak_teks' : 'nusantara_cetak_teks_inline',
                [arg],
                NIRTypes.void(),
                'cetak.teks'
              );
            } else if (arg.type.kind === NIRTypeKind.FLOAT64) {
              this.builder.createCall(
                isLast ? 'nusantara_cetak_desimal' : 'nusantara_cetak_desimal_inline',
                [arg],
                NIRTypes.void(),
                'cetak.desimal'
              );
            } else if (arg.type.kind === NIRTypeKind.BOOLEAN) {
              this.builder.createCall('nusantara_cetak_logika', [arg], NIRTypes.void(), 'cetak.logika');
            } else {
              this.builder.createCall(
                isLast ? 'nusantara_cetak_bilangan' : 'nusantara_cetak_bilangan_inline',
                [arg],
                NIRTypes.i64(),
                'cetak.bil'
              );
            }
          }
          return NIRConstants.null(NIRTypes.void());
        }

        const fn = this.module.getFunction(call.namaFungsi);
        const retType = fn ? fn.returnType : NIRTypes.any();
        return this.builder.createCall(call.namaFungsi, args, retType, 'call');
      }

      case JenisNodeAST.LITERAL_DAFTAR: {
        const arr = expr as NodeLiteralDaftar;
        const elems = arr.elemen.map((e: any) => this.lowerExpression(e));
        const elemType = elems.length > 0 ? elems[0].type : NIRTypes.any();
        const arrType = NIRTypes.array(elemType, elems.length);
        const alloca = this.builder.createAlloca(arrType, 'daftar.alloc');

        for (let i = 0; i < elems.length; i++) {
          const gep = this.builder.createGEP(
            alloca,
            [NIRConstants.i64(0), NIRConstants.i64(i)],
            NIRTypes.pointer(elemType),
            `daftar.elem.${i}`
          );
          this.builder.createStore(elems[i], gep);
        }

        return alloca;
      }

      default:
        return NIRConstants.null();
    }
  }

  private lowerBinaryOp(op: string, lhs: NIRValue, rhs: NIRValue): NIRValue {
    switch (op) {
      // Aritmetika
      case '+':
        if (lhs.type.isFloat() || rhs.type.isFloat()) {
          return this.builder.createAdd(lhs, rhs, 'fadd');
        }
        return this.builder.createAdd(lhs, rhs, 'add');
      case '-':
        if (lhs.type.isFloat() || rhs.type.isFloat()) {
          return this.builder.createSub(lhs, rhs, 'fsub');
        }
        return this.builder.createSub(lhs, rhs, 'sub');
      case '*':
        if (lhs.type.isFloat() || rhs.type.isFloat()) {
          return this.builder.createMul(lhs, rhs, 'fmul');
        }
        return this.builder.createMul(lhs, rhs, 'mul');
      case '/':
        if (lhs.type.isFloat() || rhs.type.isFloat()) {
          return this.builder.createFDiv(lhs, rhs, 'fdiv');
        }
        return this.builder.createSDiv(lhs, rhs, 'sdiv');
      case '%':
        return this.builder.createSRem(lhs, rhs, 'srem');

      // Perbandingan
      case '==':
        if (lhs.type.isFloat() || rhs.type.isFloat()) {
          return this.builder.createFCmp(NIRPredicate.OEQ, lhs, rhs, 'fcmp.eq');
        }
        return this.builder.createICmp(NIRPredicate.EQ, lhs, rhs, 'icmp.eq');
      case '!=':
        if (lhs.type.isFloat() || rhs.type.isFloat()) {
          return this.builder.createFCmp(NIRPredicate.ONE, lhs, rhs, 'fcmp.ne');
        }
        return this.builder.createICmp(NIRPredicate.NE, lhs, rhs, 'icmp.ne');
      case '<':
        if (lhs.type.isFloat() || rhs.type.isFloat()) {
          return this.builder.createFCmp(NIRPredicate.OLT, lhs, rhs, 'fcmp.lt');
        }
        return this.builder.createICmp(NIRPredicate.SLT, lhs, rhs, 'icmp.slt');
      case '<=':
        if (lhs.type.isFloat() || rhs.type.isFloat()) {
          return this.builder.createFCmp(NIRPredicate.OLE, lhs, rhs, 'fcmp.le');
        }
        return this.builder.createICmp(NIRPredicate.SLE, lhs, rhs, 'icmp.sle');
      case '>':
        if (lhs.type.isFloat() || rhs.type.isFloat()) {
          return this.builder.createFCmp(NIRPredicate.OGT, lhs, rhs, 'fcmp.gt');
        }
        return this.builder.createICmp(NIRPredicate.SGT, lhs, rhs, 'icmp.sgt');
      case '>=':
        if (lhs.type.isFloat() || rhs.type.isFloat()) {
          return this.builder.createFCmp(NIRPredicate.OGE, lhs, rhs, 'fcmp.ge');
        }
        return this.builder.createICmp(NIRPredicate.SGE, lhs, rhs, 'icmp.sge');

      // Logika
      case 'dan':
      case '&&':
        return this.builder.createAnd(lhs, rhs, 'land');
      case 'atau':
      case '||':
        return this.builder.createOr(lhs, rhs, 'lor');

      default:
        return this.builder.createAdd(lhs, rhs, 'op');
    }
  }
}
