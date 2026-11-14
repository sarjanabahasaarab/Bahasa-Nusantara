/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA LLVM BACKEND - Emitter Instruksi NIR ke Format LLVM IR
 * Target Milestone: Phase 44 (v0.44.0) & Phase 23.1 String Interning / SSA Deduplication
 */

import {
  NIRAllocaInst,
  NIRBinaryInst,
  NIRCastInst,
  NIRFCmpInst,
  NIRGetElementPtrInst,
  NIRICmpInst,
  NIRInstruction,
  NIRLoadInst,
  NIROpcode,
  NIRPhiInst,
  NIRStoreInst,
} from '../nir/instruction';
import {
  NIRBranchInst,
  NIRCondBranchInst,
  NIRReturnInst,
} from '../nir/terminator';
import {
  NIRConstantBool,
  NIRConstantFloat,
  NIRConstantInt,
  NIRConstantNull,
  NIRConstantString,
} from '../nir/constant';
import { NIRFunction } from '../nir/function';
import { NIRValue } from '../nir/value';
import { LLVMDiagnosticsManager } from './diagnostics';
import { LLVMTypeMapper } from './llvm-type-mapper';

export type StringLiteralSymbolResolver = (lit: NIRConstantString) => string;

export class LLVMInstructionEmitter {
  private readonly ssaNameMap: Map<NIRValue, string> = new Map();
  private readonly bbLabelMap: Map<any, string> = new Map();
  private readonly standaloneStringMap: Map<string, string> = new Map();
  private standaloneStrIdx = 0;

  constructor(
    private readonly typeMapper: LLVMTypeMapper = new LLVMTypeMapper(),
    private readonly diag?: LLVMDiagnosticsManager,
    private readonly stringSymbolResolver?: StringLiteralSymbolResolver
  ) {}

  /**
   * Mendaftarkan nama SSA & label blok unik per fungsi sebelum instruksi di-emit,
   * sehingga duplikasi nama dari lowering (mis. %add, %cetak.bil, %call) tidak pernah
   * memicu 'multiple definition of local value' di LLVM.
   */
  public beginFunction(fn: NIRFunction): void {
    this.ssaNameMap.clear();
    this.bbLabelMap.clear();

    const usedValueNames = new Set<string>();
    for (const p of fn.parameters) {
      const base = `%${p.name}`;
      let unique = base;
      let suffix = 1;
      while (usedValueNames.has(unique)) {
        unique = `${base}.${suffix++}`;
      }
      usedValueNames.add(unique);
      this.ssaNameMap.set(p, unique);
    }

    const usedLabels = new Set<string>();
    for (const bb of fn.basicBlocks) {
      let label = bb.label;
      let lSuffix = 1;
      while (usedLabels.has(label)) {
        label = `${bb.label}.${lSuffix++}`;
      }
      usedLabels.add(label);
      this.bbLabelMap.set(bb, label);

      const assignInstName = (inst: NIRInstruction): void => {
        // Instruksi tanpa nilai hasil (void / terminator / store / actor.stop) tidak mendefinisikan register SSA
        if (
          inst.isTerminator() ||
          inst.opcode === NIROpcode.STORE ||
          inst.opcode === NIROpcode.ACTOR_STOP ||
          (inst.opcode === NIROpcode.CALL && inst.type.isVoid())
        ) {
          return;
        }
        const rawBase = inst.id.startsWith('%') ? inst.id : `%${inst.id}`;
        let unique = rawBase;
        let suffix = 1;
        while (usedValueNames.has(unique)) {
          unique = `${rawBase}.${suffix++}`;
        }
        usedValueNames.add(unique);
        this.ssaNameMap.set(inst, unique);
      };

      for (const phi of bb.phiNodes) assignInstName(phi);
      for (const inst of bb.instructions) assignInstName(inst);
    }
  }

  public endFunction(): void {
    this.ssaNameMap.clear();
    this.bbLabelMap.clear();
  }

  public getBlockLabel(bb: any, fallback: string = 'bb'): string {
    if (!bb) return fallback;
    return this.bbLabelMap.get(bb) || bb.label || fallback;
  }

  private getResultId(inst: NIRInstruction): string {
    return this.ssaNameMap.get(inst) || (inst.id.startsWith('%') ? inst.id : `%${inst.id}`);
  }

  public formatValue(val: NIRValue): string {
    if (val instanceof NIRConstantInt) {
      return val.value.toString();
    }
    if (val instanceof NIRConstantFloat) {
      let s = val.value.toString();
      if (!s.includes('.') && !s.includes('e')) s += '.0';
      return s;
    }
    if (val instanceof NIRConstantBool) {
      return val.value ? 'true' : 'false';
    }
    if (val instanceof NIRConstantNull) {
      return 'null';
    }
    if (val instanceof NIRConstantString) {
      if (this.stringSymbolResolver) {
        const sym = this.stringSymbolResolver(val);
        return sym.startsWith('@') ? sym : `@${sym}`;
      }
      let existing = this.standaloneStringMap.get(val.value);
      if (!existing) {
        existing = `.str.${this.standaloneStrIdx++}`;
        this.standaloneStringMap.set(val.value, existing);
      }
      return `@${existing}`;
    }

    const mapped = this.ssaNameMap.get(val);
    if (mapped) {
      return mapped;
    }

    // Register SSA lokal (%name) atau simbol global (@name)
    if (val.id.startsWith('%') || val.id.startsWith('@')) {
      return val.id;
    }
    return `%${val.id}`;
  }

  public emitInstruction(inst: NIRInstruction): string {
    const resId = this.getResultId(inst);

    switch (inst.opcode) {
      case NIROpcode.ALLOCA: {
        const alloca = inst as NIRAllocaInst;
        const allocTypeStr = this.typeMapper.map(alloca.allocatedType);
        return `${resId} = alloca ${allocTypeStr}, align 8`;
      }

      case NIROpcode.LOAD: {
        const load = inst as NIRLoadInst;
        const resTypeStr = this.typeMapper.map(load.type);
        const ptrVal = this.formatValue(load.pointer);
        const ptrTypeStr = this.typeMapper.getPointerType(load.type);
        return `${resId} = load ${resTypeStr}, ${ptrTypeStr} ${ptrVal}, align 8`;
      }

      case NIROpcode.STORE: {
        const store = inst as NIRStoreInst;
        const valTypeStr = this.typeMapper.map(store.value.type);
        const valStr = this.formatValue(store.value);
        const ptrVal = this.formatValue(store.pointer);
        const ptrTypeStr = this.typeMapper.getPointerType(store.value.type);
        return `store ${valTypeStr} ${valStr}, ${ptrTypeStr} ${ptrVal}, align 8`;
      }

      case NIROpcode.GEP: {
        const gep = inst as NIRGetElementPtrInst;
        const basePtr = this.formatValue(gep.basePtr);
        const elemTypeStr = this.typeMapper.map(gep.basePtr.type.elementType || gep.basePtr.type);
        const indices = gep.indices
          .map((i) => `${this.typeMapper.map(i.type)} ${this.formatValue(i)}`)
          .join(', ');
        const ptrTypeStr = this.typeMapper.getPointerType(gep.basePtr.type.elementType || gep.basePtr.type);
        return `${resId} = getelementptr inbounds ${elemTypeStr}, ${ptrTypeStr} ${basePtr}, ${indices}`;
      }

      case NIROpcode.ADD:
      case NIROpcode.SUB:
      case NIROpcode.MUL:
      case NIROpcode.SDIV:
      case NIROpcode.FDIV:
      case NIROpcode.SREM:
      case NIROpcode.AND:
      case NIROpcode.OR:
      case NIROpcode.XOR:
      case NIROpcode.SHL:
      case NIROpcode.ASHR:
      case NIROpcode.LSHR: {
        const bin = inst as NIRBinaryInst;
        const typeStr = this.typeMapper.map(bin.type);
        const lhs = this.formatValue(bin.lhs);
        const rhs = this.formatValue(bin.rhs);

        let llvmOp = bin.opcode.toString();
        if (bin.type.isFloat()) {
          if (bin.opcode === NIROpcode.ADD) llvmOp = 'fadd';
          else if (bin.opcode === NIROpcode.SUB) llvmOp = 'fsub';
          else if (bin.opcode === NIROpcode.MUL) llvmOp = 'fmul';
          else if (bin.opcode === NIROpcode.FDIV || bin.opcode === NIROpcode.SDIV) llvmOp = 'fdiv';
          else if (bin.opcode === NIROpcode.SREM) llvmOp = 'frem';
        }

        return `${resId} = ${llvmOp} ${typeStr} ${lhs}, ${rhs}`;
      }

      case NIROpcode.ICMP: {
        const icmp = inst as NIRICmpInst;
        const opTypeStr = this.typeMapper.map(icmp.lhs.type);
        const lhs = this.formatValue(icmp.lhs);
        const rhs = this.formatValue(icmp.rhs);
        return `${resId} = icmp ${icmp.predicate} ${opTypeStr} ${lhs}, ${rhs}`;
      }

      case NIROpcode.FCMP: {
        const fcmp = inst as NIRFCmpInst;
        const lhs = this.formatValue(fcmp.lhs);
        const rhs = this.formatValue(fcmp.rhs);
        return `${resId} = fcmp ${fcmp.predicate} double ${lhs}, ${rhs}`;
      }

      case NIROpcode.PHI: {
        const phi = inst as NIRPhiInst;
        const typeStr = this.typeMapper.map(phi.type);
        const incomingStrs = phi.incoming
          .map((inc) => `[ ${this.formatValue(inc.value)}, %${this.getBlockLabel(inc.block, 'bb')} ]`)
          .join(', ');
        return `${resId} = phi ${typeStr} ${incomingStrs}`;
      }

      case NIROpcode.CALL: {
        const call = inst as any;
        const retTypeStr = this.typeMapper.map(call.type);
        const argsStr = (call.args || [])
          .map((a: NIRValue) => `${this.typeMapper.map(a.type)} ${this.formatValue(a)}`)
          .join(', ');

        if (call.type.isVoid()) {
          return `call void @${call.calleeName}(${argsStr})`;
        }
        return `${resId} = call ${retTypeStr} @${call.calleeName}(${argsStr})`;
      }

      case NIROpcode.CAST: {
        const cast = inst as NIRCastInst;
        const srcTypeStr = this.typeMapper.map(cast.sourceValue.type);
        const targetTypeStr = this.typeMapper.map(cast.type);
        const srcVal = this.formatValue(cast.sourceValue);
        return `${resId} = ${cast.castKind} ${srcTypeStr} ${srcVal} to ${targetTypeStr}`;
      }

      case NIROpcode.RET: {
        const ret = inst as NIRReturnInst;
        if (!ret.returnValue || ret.returnValue.type.isVoid()) {
          return 'ret void';
        }
        const valTypeStr = this.typeMapper.map(ret.returnValue.type);
        return `ret ${valTypeStr} ${this.formatValue(ret.returnValue)}`;
      }

      case NIROpcode.BR: {
        const br = inst as NIRBranchInst;
        return `br label %${this.getBlockLabel(br.targetBlock, 'bb')}`;
      }

      case NIROpcode.BR_COND: {
        const condBr = inst as NIRCondBranchInst;
        const condVal = this.formatValue(condBr.condition);
        const thenLabel = this.getBlockLabel(condBr.thenBlock, 'then');
        const elseLabel = this.getBlockLabel(condBr.elseBlock, 'else');
        return `br i1 ${condVal}, label %${thenLabel}, label %${elseLabel}`;
      }

      case NIROpcode.UNREACHABLE: {
        return 'unreachable';
      }

      // Concurrency & Actor LLVM Lowering (Phase 46)
      case NIROpcode.ACTOR_CREATE: {
        const pt = this.typeMapper.getPointerType();
        return `${resId} = call ${pt} @nusantara_actor_create(${pt} null)`;
      }

      case NIROpcode.ACTOR_SEND: {
        const pt = this.typeMapper.getPointerType();
        const ops = (inst as any).operands || [];
        const target = ops[0] ? this.formatValue(ops[0]) : 'null';
        const msg = ops[1] ? this.formatValue(ops[1]) : 'null';
        return `call i32 @nusantara_actor_send(${pt} ${target}, i64 0, ${pt} ${msg})`;
      }

      case NIROpcode.ACTOR_STOP: {
        const pt = this.typeMapper.getPointerType();
        const ops = (inst as any).operands || [];
        const target = ops[0] ? this.formatValue(ops[0]) : 'null';
        return `call void @nusantara_actor_stop(${pt} ${target})`;
      }

      case NIROpcode.ASYNC_START: {
        const pt = this.typeMapper.getPointerType();
        const ops = (inst as any).operands || [];
        const callee = ops[0] ? this.formatValue(ops[0]) : 'null';
        return `${resId} = call ${pt} @nusantara_task_spawn(${pt} ${callee}, ${pt} null)`;
      }

      case NIROpcode.AWAIT: {
        const pt = this.typeMapper.getPointerType();
        const ops = (inst as any).operands || [];
        const task = ops[0] ? this.formatValue(ops[0]) : 'null';
        return `${resId} = call ${pt} @nusantara_task_wait(${pt} ${task})`;
      }

      default:
        this.diag?.error('LLVM_INST_UNKNOWN', `Instruksi opcode '${inst.opcode}' tidak didukung oleh emitter LLVM.`);
        return `; unsupported instruction: ${inst.opcode}`;
    }
  }
}
