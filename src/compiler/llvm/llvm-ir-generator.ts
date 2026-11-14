/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA LLVM BACKEND - Modul Emitter & Penerjemah NIR ke LLVM IR Lengkap
 * Target Milestone: Phase 44 (v0.44.0)
 */

import { NIRConstantString } from '../nir/constant';
import { NIRFunction } from '../nir/function';
import { NIRModule } from '../nir/module';
import { LLVMDiagnosticsManager } from './diagnostics';
import { LLVMInstructionEmitter } from './llvm-instruction-emitter';
import { LLVMTypeMapper } from './llvm-type-mapper';
import { TargetPlatformInfo, TargetTripleManager } from './target-triple';

export class LLVMIRGenerator {
  private readonly typeMapper: LLVMTypeMapper;
  private readonly instEmitter: LLVMInstructionEmitter;
  private readonly diag: LLVMDiagnosticsManager;

  constructor(
    private readonly targetInfo: TargetPlatformInfo,
    useOpaquePointers: boolean = true,
    diagManager?: LLVMDiagnosticsManager
  ) {
    this.diag = diagManager || new LLVMDiagnosticsManager();
    this.typeMapper = new LLVMTypeMapper(useOpaquePointers, this.diag);
    this.instEmitter = new LLVMInstructionEmitter(this.typeMapper, this.diag);
  }

  public generate(mod: NIRModule): string {
    const lines: string[] = [];

    // Header komentar
    lines.push(`; ModuleID = '${mod.name}'`);
    lines.push(`source_filename = "${mod.name}.nusantara"`);
    lines.push(`target datalayout = "${this.targetInfo.dataLayout}"`);
    lines.push(`target triple = "${this.targetInfo.triple}"`);
    lines.push('');

    // Kumpulkan string literal constants yang didefinisikan secara global
    const stringLiterals = this.collectStringLiterals(mod);
    for (const [symName, literal] of stringLiterals.entries()) {
      const escapedStr = this.escapeLLVMString(literal);
      const byteLen = Buffer.byteLength(literal, 'utf-8') + 1; // Terminating null
      lines.push(
        `@${symName} = private unnamed_addr constant [${byteLen} x i8] c"${escapedStr}\\00", align 1`
      );
    }
    if (stringLiterals.size > 0) {
      lines.push('');
    }

    // Deklarasi Variabel Global
    for (const glob of mod.globals.values()) {
      const globTypeStr = this.typeMapper.map(glob.type);
      const initStr = glob.initializer ? this.instEmitter.formatValue(glob.initializer) : 'zeroinitializer';
      const constTag = glob.isConstant ? 'constant' : 'global';
      lines.push(`@${glob.globalName} = ${constTag} ${globTypeStr} ${initStr}, align 8`);
    }
    if (mod.globals.size > 0) {
      lines.push('');
    }

    // Deklarasi Eksternal Standar C / Nusantara Runtime
    const ptrType = this.typeMapper.getPointerType();
    lines.push('; Deklarasi Runtime Nusantara & Libc Eksternal');
    lines.push(`declare i32 @printf(${ptrType}, ...)`);
    lines.push(`declare ${ptrType} @malloc(i64)`);
    lines.push(`declare void @free(${ptrType})`);
    lines.push('declare void @exit(i32)');
    lines.push('declare i64 @nusantara_cetak_bilangan(i64)');
    lines.push('declare i64 @nusantara_cetak_bilangan_inline(i64)');
    lines.push('declare void @nusantara_cetak_desimal(double)');
    lines.push('declare void @nusantara_cetak_desimal_inline(double)');
    lines.push('declare void @nusantara_cetak_logika(i1)');
    lines.push(`declare void @nusantara_cetak_teks(${ptrType})`);
    lines.push(`declare void @nusantara_cetak_teks_inline(${ptrType})`);
    lines.push('declare void @nusantara_cetak_baris()');
    lines.push('');

    // Emisi Fungsi
    for (const fn of mod.functions.values()) {
      lines.push(this.emitFunction(fn));
      lines.push('');
    }

    return lines.join('\n');
  }

  private emitFunction(fn: NIRFunction): string {
    const lines: string[] = [];
    const retTypeStr = this.typeMapper.map(fn.returnType);
    const paramStrs = fn.parameters
      .map((p) => `${this.typeMapper.map(p.type)} %${p.name}`)
      .join(', ');

    lines.push(`define ${retTypeStr} @${fn.name}(${paramStrs}) #0 {`);

    for (let i = 0; i < fn.basicBlocks.length; i++) {
      const bb = fn.basicBlocks[i];
      lines.push(`${bb.label}:`);

      // Phi nodes terlebih dahulu
      for (const phi of bb.phiNodes) {
        lines.push(`  ${this.instEmitter.emitInstruction(phi)}`);
      }

      // Instruksi biasa
      for (const inst of bb.instructions) {
        lines.push(`  ${this.instEmitter.emitInstruction(inst)}`);
      }

      // Terminator wajib
      if (bb.terminator) {
        lines.push(`  ${this.instEmitter.emitInstruction(bb.terminator)}`);
      } else {
        this.diag.error(
          'LLVM_MISSING_TERMINATOR',
          `Basic Block '${bb.label}' dalam fungsi '@${fn.name}' tidak memiliki terminator.`
        );
        lines.push('  unreachable');
      }

      if (i < fn.basicBlocks.length - 1) {
        lines.push('');
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  private collectStringLiterals(mod: NIRModule): Map<string, string> {
    const literals = new Map<string, string>();
    let strIdx = 0;

    for (const fn of mod.functions.values()) {
      for (const bb of fn.basicBlocks) {
        for (const inst of bb.instructions) {
          for (const op of inst.getOperands()) {
            if (op instanceof NIRConstantString) {
              const sym = `.str.${strIdx++}`;
              literals.set(sym, op.value);
            }
          }
        }
      }
    }
    return literals;
  }

  private escapeLLVMString(str: string): string {
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      if (ch === 92) {
        out += '\\5C';
      } else if (ch === 34) {
        out += '\\22';
      } else if (ch === 10) {
        out += '\\0A';
      } else if (ch === 13) {
        out += '\\0D';
      } else if (ch >= 32 && ch <= 126) {
        out += str[i];
      } else {
        out += '\\' + ch.toString(16).toUpperCase().padStart(2, '0');
      }
    }
    return out;
  }
}
