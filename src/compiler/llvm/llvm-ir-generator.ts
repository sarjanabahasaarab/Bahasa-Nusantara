/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA LLVM BACKEND - Modul Emitter & Penerjemah NIR ke LLVM IR Lengkap
 * Target Milestone: Phase 44 (v0.44.0) & Phase 23.1 String Interning Registry
 */

import { NIRConstantArray, NIRConstantString } from '../nir/constant';
import { NIRFunction } from '../nir/function';
import { NIRModule } from '../nir/module';
import { NIRValue } from '../nir/value';
import { LLVMDiagnosticsManager } from './diagnostics';
import { LLVMInstructionEmitter } from './llvm-instruction-emitter';
import { LLVMTypeMapper } from './llvm-type-mapper';
import { TargetPlatformInfo } from './target-triple';

export class LLVMIRGenerator {
  private readonly typeMapper: LLVMTypeMapper;
  private readonly instEmitter: LLVMInstructionEmitter;
  private readonly diag: LLVMDiagnosticsManager;

  // Registry interning string constant terpusat per pemanggilan generate()
  private stringValueToSymbol: Map<string, string> = new Map();
  private stringEntries: Array<{ symbol: string; value: string }> = [];
  private nextStringId = 0;

  constructor(
    private readonly targetInfo: TargetPlatformInfo,
    useOpaquePointers: boolean = true,
    diagManager?: LLVMDiagnosticsManager
  ) {
    this.diag = diagManager || new LLVMDiagnosticsManager();
    this.typeMapper = new LLVMTypeMapper(useOpaquePointers, this.diag);
    this.instEmitter = new LLVMInstructionEmitter(
      this.typeMapper,
      this.diag,
      (lit) => this.internStringLiteral(lit.value)
    );
  }

  public generate(mod: NIRModule): string {
    this.stringValueToSymbol = new Map();
    this.stringEntries = [];
    this.nextStringId = 0;

    // 1. Prapindai seluruh string literal di globals, phiNodes, instructions, dan terminators
    this.collectStringLiterals(mod);

    // 2. Emit body globals & fungsi terlebih dahulu agar setiap referensi tambahan tetap terdaftar
    //    di stringEntries sebelum header global konstanta string dirender.
    const globalLines: string[] = [];
    for (const glob of mod.globals.values()) {
      const globTypeStr = this.typeMapper.map(glob.type);
      const initStr = glob.initializer ? this.instEmitter.formatValue(glob.initializer) : 'zeroinitializer';
      const constTag = glob.isConstant ? 'constant' : 'global';
      globalLines.push(`@${glob.globalName} = ${constTag} ${globTypeStr} ${initStr}, align 8`);
    }

    const functionSections: string[] = [];
    for (const fn of mod.functions.values()) {
      functionSections.push(this.emitFunction(fn));
    }

    // 3. Susun modul LLVM IR akhir dengan seluruh deklarasi konstanta string di bagian atas
    const lines: string[] = [];
    lines.push(`; ModuleID = '${mod.name}'`);
    lines.push(`source_filename = "${mod.name}.nusantara"`);
    lines.push(`target datalayout = "${this.targetInfo.dataLayout}"`);
    lines.push(`target triple = "${this.targetInfo.triple}"`);
    lines.push('');

    if (this.stringEntries.length > 0) {
      const utf8Encoder = new TextEncoder();
      for (const entry of this.stringEntries) {
        const utf8Bytes = utf8Encoder.encode(entry.value);
        const escapedStr = this.escapeLLVMStringBytes(utf8Bytes);
        const byteLen = utf8Bytes.length + 1; // Terminating \00
        lines.push(
          `@${entry.symbol} = private unnamed_addr constant [${byteLen} x i8] c"${escapedStr}\\00", align 1`
        );
      }
      lines.push('');
    }

    if (globalLines.length > 0) {
      lines.push(...globalLines);
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

    for (const fnIR of functionSections) {
      lines.push(fnIR);
      lines.push('');
    }

    return lines.join('\n');
  }

  private internStringLiteral(value: string): string {
    const existing = this.stringValueToSymbol.get(value);
    if (existing) {
      return existing;
    }
    const sym = `.str.${this.nextStringId++}`;
    this.stringValueToSymbol.set(value, sym);
    this.stringEntries.push({ symbol: sym, value });
    return sym;
  }

  private collectStringFromValue(val: NIRValue | undefined): void {
    if (!val) return;
    if (val instanceof NIRConstantString) {
      this.internStringLiteral(val.value);
      return;
    }
    if (val instanceof NIRConstantArray) {
      for (const elem of val.elements) {
        this.collectStringFromValue(elem);
      }
    }
  }

  private collectStringLiterals(mod: NIRModule): void {
    for (const glob of mod.globals.values()) {
      this.collectStringFromValue(glob.initializer);
    }

    for (const fn of mod.functions.values()) {
      for (const bb of fn.basicBlocks) {
        for (const phi of bb.phiNodes) {
          for (const op of phi.getOperands()) {
            this.collectStringFromValue(op);
          }
          for (const inc of phi.incoming) {
            this.collectStringFromValue(inc.value);
          }
        }
        for (const inst of bb.instructions) {
          for (const op of inst.getOperands()) {
            this.collectStringFromValue(op);
          }
          const maybeArgs = (inst as any).args;
          if (Array.isArray(maybeArgs)) {
            for (const a of maybeArgs) {
              this.collectStringFromValue(a);
            }
          }
        }
        if (bb.terminator) {
          for (const op of bb.terminator.getOperands()) {
            this.collectStringFromValue(op);
          }
        }
      }
    }
  }

  private emitFunction(fn: NIRFunction): string {
    this.instEmitter.beginFunction(fn);
    try {
      const lines: string[] = [];
      const retTypeStr = this.typeMapper.map(fn.returnType);
      const paramStrs = fn.parameters
        .map((p) => `${this.typeMapper.map(p.type)} ${this.instEmitter.formatValue(p)}`)
        .join(', ');

      lines.push(`define ${retTypeStr} @${fn.name}(${paramStrs}) {`);

      for (let i = 0; i < fn.basicBlocks.length; i++) {
        const bb = fn.basicBlocks[i];
        lines.push(`${this.instEmitter.getBlockLabel(bb)}:`);

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
    } finally {
      this.instEmitter.endFunction();
    }
  }

  private escapeLLVMStringBytes(bytes: Uint8Array): string {
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b >= 32 && b <= 126 && b !== 92 && b !== 34) {
        out += String.fromCharCode(b);
      } else {
        out += '\\' + b.toString(16).toUpperCase().padStart(2, '0');
      }
    }
    return out;
  }
}
