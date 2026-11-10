/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA LLVM BACKEND - Emitter Instruksi NIR ke Format LLVM IR
 * Target Milestone: Phase 44 (v0.44.0)
 */

import {
  NIRAllocaInst,
  NIRBinaryInst,
  NIRCastInst,
  NIRCastKind,
  NIRFCmpInst,
  NIRGetElementPtrInst,
  NIRICmpInst,
  NIRInstruction,
  NIRLoadInst,
  NIROpcode,
  NIRPhiInst,
  NIRPredicate,
  NIRStoreInst,
} from '../nir/instruction';
import {
  NIRBranchInst,
  NIRCondBranchInst,
  NIRReturnInst,
  NIRUnreachableInst,
} from '../nir/terminator';
import { NIRConstant, NIRConstantArray, NIRConstantBool, NIRConstantFloat, NIRConstantInt, NIRConstantNull, NIRConstantString } from '../nir/constant';
import { NIRValue, NIRValueKind } from '../nir/value';
import { LLVMDiagnosticsManager } from './diagnostics';
import { LLVMTypeMapper } from './llvm-type-mapper';

export class LLVMInstructionEmitter {
  constructor(
    private readonly typeMapper: LLVMTypeMapper = new LLVMTypeMapper(),
    private readonly diag?: LLVMDiagnosticsManager
  ) {}

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
      return `@.str.${val.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    }

    // Register SSA lokal (%name) atau simbol global (@name)
    if (val.id.startsWith('%') || val.id.startsWith('@')) {
      return val.id;
    }
    return `%${val.id}`;
  }

  public emitInstruction(inst: NIRInstruction): string {
    switch (inst.opcode) {
      case NIROpcode.ALLOCA: {
        const alloca = inst as NIRAllocaInst;
        const allocTypeStr = this.typeMapper.map(alloca.allocatedType);
        return `${inst.id} = alloca ${allocTypeStr}, align 8`;
      }

      case NIROpcode.LOAD: {
        const load = inst as NIRLoadInst;
        const resTypeStr = this.typeMapper.map(load.type);
        const ptrVal = this.formatValue(load.pointer);
        const ptrTypeStr = this.typeMapper.getPointerType(load.type);
        return `${inst.id} = load ${resTypeStr}, ${ptrTypeStr} ${ptrVal}, align 8`;
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
        return `${inst.id} = getelementptr inbounds ${elemTypeStr}, ${ptrTypeStr} ${basePtr}, ${indices}`;
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

        return `${inst.id} = ${llvmOp} ${typeStr} ${lhs}, ${rhs}`;
      }

      case NIROpcode.ICMP: {
        const icmp = inst as NIRICmpInst;
        const opTypeStr = this.typeMapper.map(icmp.lhs.type);
        const lhs = this.formatValue(icmp.lhs);
        const rhs = this.formatValue(icmp.rhs);
        return `${inst.id} = icmp ${icmp.predicate} ${opTypeStr} ${lhs}, ${rhs}`;
      }

      case NIROpcode.FCMP: {
        const fcmp = inst as NIRFCmpInst;
        const lhs = this.formatValue(fcmp.lhs);
        const rhs = this.formatValue(fcmp.rhs);
        return `${inst.id} = fcmp ${fcmp.predicate} double ${lhs}, ${rhs}`;
      }

      case NIROpcode.PHI: {
        const phi = inst as NIRPhiInst;
        const typeStr = this.typeMapper.map(phi.type);
        const incomingStrs = phi.incoming
          .map((inc) => `[ ${this.formatValue(inc.value)}, %${inc.block ? inc.block.label : 'bb'} ]`)
          .join(', ');
        return `${inst.id} = phi ${typeStr} ${incomingStrs}`;
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
        return `${inst.id} = call ${retTypeStr} @${call.calleeName}(${argsStr})`;
      }

      case NIROpcode.CAST: {
        const cast = inst as NIRCastInst;
        const srcTypeStr = this.typeMapper.map(cast.sourceValue.type);
        const targetTypeStr = this.typeMapper.map(cast.type);
        const srcVal = this.formatValue(cast.sourceValue);
        return `${inst.id} = ${cast.castKind} ${srcTypeStr} ${srcVal} to ${targetTypeStr}`;
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
        return `br label %${br.targetBlock ? br.targetBlock.label : 'bb'}`;
      }

      case NIROpcode.BR_COND: {
        const condBr = inst as NIRCondBranchInst;
        const condVal = this.formatValue(condBr.condition);
        const thenLabel = condBr.thenBlock ? condBr.thenBlock.label : 'then';
        const elseLabel = condBr.elseBlock ? condBr.elseBlock.label : 'else';
        return `br i1 ${condVal}, label %${thenLabel}, label %${elseLabel}`;
      }

      case NIROpcode.UNREACHABLE: {
        return 'unreachable';
      }

      // Concurrency & Actor LLVM Lowering (Phase 46)
      case NIROpcode.ACTOR_CREATE: {
        const pt = this.typeMapper.getPointerType();
        return `${inst.id} = call ${pt} @nusantara_actor_create(${pt} null)`;
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
        return `${inst.id} = call ${pt} @nusantara_task_spawn(${pt} ${callee}, ${pt} null)`;
      }

      case NIROpcode.AWAIT: {
        const pt = this.typeMapper.getPointerType();
        const ops = (inst as any).operands || [];
        const task = ops[0] ? this.formatValue(ops[0]) : 'null';
        return `${inst.id} = call ${pt} @nusantara_task_wait(${pt} ${task})`;
      }

      default:
        this.diag?.error('LLVM_INST_UNKNOWN', `Instruksi opcode '${inst.opcode}' tidak didukung oleh emitter LLVM.`);
        return `; unsupported instruction: ${inst.opcode}`;
    }
  }
}
