/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA INTERMEDIATE REPRESENTATION (NIR) - Deserializer JSON
 * Target Milestone: Phase 43 (v0.43.0)
 */

import { NIRBasicBlock } from './basic-block';
import { NIRConstants } from './constant';
import { NIRFunction } from './function';
import {
  NIRAllocaInst,
  NIRBinaryInst,
  NIRCallInst,
  NIRCastInst,
  NIRCastKind,
  NIRFCmpInst,
  NIRICmpInst,
  NIRInstruction,
  NIRLoadInst,
  NIROpcode,
  NIRPhiInst,
  NIRPredicate,
  NIRStoreInst,
  NIRActorCreateInst,
  NIRActorSendInst,
  NIRActorStopInst,
  NIRAsyncStartInst,
  NIRAwaitInst,
} from './instruction';
import { NIRModule } from './module';
import {
  NIRBranchInst,
  NIRCondBranchInst,
  NIRReturnInst,
  NIRUnreachableInst,
} from './terminator';
import { NIRType, NIRTypes } from './type';
import { NIRGlobal, NIRValue } from './value';

export class NIRDeserializer {
  public static deserializeModule(json: any): NIRModule {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    return NIRDeserializer.fromJSON(data);
  }

  public static deserializeFunction(json: any): NIRFunction {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    const mod = NIRDeserializer.fromJSON(data);
    const fns = Array.from(mod.functions.values());
    if (fns.length === 0) {
      throw new Error('Tidak ada fungsi yang ditemukan dalam data serialisasi NIR');
    }
    return fns[0];
  }

  public static fromJSON(json: any): NIRModule {
    if (!json || typeof json !== 'object') {
      throw new Error('Data NIR tidak valid: objek JSON diperlukan');
    }

    if (!json.schema || !json.schema.startsWith('nusantara-nir')) {
      throw new Error(`Skema NIR tidak dikenali: '${json.schema}'`);
    }

    const mod = new NIRModule(json.name || 'DeserializedModule');
    if (json.targetTriple) mod.targetTriple = json.targetTriple;
    if (json.dataLayout) mod.dataLayout = json.dataLayout;

    // 1. Muat metadata
    if (json.metadata && typeof json.metadata === 'object') {
      for (const [k, v] of Object.entries(json.metadata)) {
        mod.setMetadata(k, v);
      }
    }

    // 2. Muat variabel global
    if (json.globals && typeof json.globals === 'object') {
      for (const [name, gData] of Object.entries<any>(json.globals)) {
        const type = NIRType.fromJSON(gData.type);
        const global = new NIRGlobal(gData.globalName || name, type, gData.isConstant);
        mod.addGlobal(global);
      }
    }

    // 3. Muat fungsi-fungsi
    if (json.functions && typeof json.functions === 'object') {
      for (const [fnName, fnData] of Object.entries<any>(json.functions)) {
        const retType = NIRType.fromJSON(fnData.returnType);
        const params = (fnData.parameters || []).map((p: any) => ({
          name: p.name || p.id?.replace('%', ''),
          type: NIRType.fromJSON(p.type),
        }));

        const fn = mod.createFunction(fnData.name || fnName, retType, params);
        fn.isDeclaration = !!fnData.isDeclaration;

        if (fn.isDeclaration) continue;

        // Peta nilai untuk me-resolve operand instruksi
        const valueMap = new Map<string, NIRValue>();
        for (const p of fn.parameters) {
          valueMap.set(p.id, p);
        }

        // a. Buat seluruh BasicBlock terlebih dahulu
        const bbMap = new Map<string, NIRBasicBlock>();
        for (const bbData of fnData.basicBlocks || []) {
          const bb = fn.createBasicBlock(bbData.label);
          bbMap.set(bb.label, bb);
          valueMap.set(bb.id, bb);
        }

        // b. Buat instruksi dan sambungkan operand
        for (const bbData of fnData.basicBlocks || []) {
          const bb = bbMap.get(bbData.label)!;

          // Helper pencari nilai operand
          const resolveVal = (id: string, typeHint?: NIRType): NIRValue => {
            if (valueMap.has(id)) return valueMap.get(id)!;
            if (id.startsWith('@')) {
              const gName = id.substring(1);
              const g = mod.getGlobal(gName);
              if (g) return g;
            }
            // Anggap sebagai konstanta jika berupa angka, boolean, atau string literal
            if (id === 'true' || id === 'false') return NIRConstants.bool(id === 'true');
            if (/^-?\d+$/.test(id)) {
              return NIRConstants.int(
                BigInt(id),
                typeHint && typeHint.isInteger() ? typeHint : NIRTypes.i64()
              );
            }
            if (/^-?\d+\.\d+$/.test(id)) return NIRConstants.float(parseFloat(id));
            if (id.startsWith('"') && id.endsWith('"')) {
              try {
                return NIRConstants.string(JSON.parse(id));
              } catch {
                // fallback below
              }
            }
            return NIRConstants.null(typeHint);
          };

          // Rekonstruksi Phi Nodes
          for (const phiData of bbData.phiNodes || []) {
            const phiType = NIRType.fromJSON(phiData.type);
            const phi = new NIRPhiInst(phiType, phiData.id);
            bb.addInstruction(phi);
            valueMap.set(phi.id, phi);
          }

          // Rekonstruksi Normal Instructions
          for (const instData of bbData.instructions || []) {
            const inst = this.reconstructInstruction(instData, bb, resolveVal, bbMap);
            if (inst) {
              bb.addInstruction(inst);
              valueMap.set(inst.id, inst);
            }
          }

          // Rekonstruksi Terminator
          if (bbData.terminator) {
            const term = this.reconstructTerminator(bbData.terminator, bb, resolveVal, bbMap);
            if (term) {
              bb.setTerminator(term);
            }
          }
        }

        // Hubungkan kembali incoming branches pada phi node
        for (const bbData of fnData.basicBlocks || []) {
          const bb = bbMap.get(bbData.label)!;
          for (let i = 0; i < (bbData.phiNodes || []).length; i++) {
            const phiData = bbData.phiNodes[i];
            const phi = bb.phiNodes[i];
            for (const inc of phiData.incoming || []) {
              const val = valueMap.get(inc.value) || NIRConstants.null();
              const fromBB = bbMap.get(inc.block) || bb;
              phi.addIncoming(val, fromBB);
            }
          }
        }

        fn.rebuildCFG();
      }
    }

    return mod;
  }

  private static reconstructInstruction(
    data: any,
    bb: NIRBasicBlock,
    resolveVal: (id: string, typeHint?: NIRType) => NIRValue,
    bbMap: Map<string, NIRBasicBlock>
  ): NIRInstruction | null {
    const type = NIRType.fromJSON(data.type);
    const ops = data.operands || [];

    switch (data.opcode) {
      case NIROpcode.ALLOCA:
        return new NIRAllocaInst(NIRType.fromJSON(data.allocatedType), data.id);

      case NIROpcode.LOAD: {
        const ptr = resolveVal(ops[0], NIRTypes.pointer(type));
        return new NIRLoadInst(ptr, data.id);
      }

      case NIROpcode.STORE: {
        const val = resolveVal(ops[0]);
        const ptr = resolveVal(ops[1], NIRTypes.pointer(val.type));
        return new NIRStoreInst(val, ptr);
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
        const lhs = resolveVal(ops[0], type);
        const rhs = resolveVal(ops[1], type);
        return new NIRBinaryInst(data.opcode, lhs, rhs, data.id);
      }

      case NIROpcode.ICMP: {
        const lhs = resolveVal(ops[0]);
        const rhs = resolveVal(ops[1], lhs.type);
        return new NIRICmpInst(data.predicate as NIRPredicate, lhs, rhs, data.id);
      }

      case NIROpcode.FCMP: {
        const lhs = resolveVal(ops[0]);
        const rhs = resolveVal(ops[1], lhs.type);
        return new NIRFCmpInst(data.predicate as NIRPredicate, lhs, rhs, data.id);
      }

      case NIROpcode.CALL: {
        const args = ops.map((opId: string) => resolveVal(opId));
        return new NIRCallInst(data.calleeName, args, type, data.id);
      }

      case NIROpcode.CAST: {
        const src = resolveVal(ops[0]);
        return new NIRCastInst(data.castKind as NIRCastKind, src, type, data.id);
      }

      // Concurrency & Actor Deserialization (Phase 46)
      case NIROpcode.ACTOR_CREATE: {
        const initArg = ops[0] ? resolveVal(ops[0]) : undefined;
        return new NIRActorCreateInst(data.actorName || 'Actor', initArg, data.id);
      }

      case NIROpcode.ACTOR_SEND: {
        const target = resolveVal(ops[0], NIRTypes.ptr());
        const msg = resolveVal(ops[1]);
        return new NIRActorSendInst(target, msg, data.id);
      }

      case NIROpcode.ACTOR_STOP: {
        const target = resolveVal(ops[0], NIRTypes.ptr());
        return new NIRActorStopInst(target, data.id);
      }

      case NIROpcode.ASYNC_START: {
        const callee = resolveVal(ops[0], NIRTypes.ptr());
        const args = ops.slice(1).map((op: string) => resolveVal(op));
        return new NIRAsyncStartInst(callee, args, data.id);
      }

      case NIROpcode.AWAIT: {
        const task = resolveVal(ops[0], NIRTypes.ptr());
        return new NIRAwaitInst(task, type, data.id);
      }

      default:
        return null;
    }
  }

  private static reconstructTerminator(
    data: any,
    bb: NIRBasicBlock,
    resolveVal: (id: string, typeHint?: NIRType) => NIRValue,
    bbMap: Map<string, NIRBasicBlock>
  ): any {
    switch (data.opcode) {
      case NIROpcode.RET: {
        const retType = data.type ? NIRType.fromJSON(data.type) : undefined;
        const retVal = data.hasReturnValue && data.operands && data.operands[0]
          ? resolveVal(data.operands[0], retType)
          : undefined;
        return new NIRReturnInst(retVal);
      }

      case NIROpcode.BR: {
        const targetLabel = data.targetBlock ? data.targetBlock.replace('%bb.', '') : '';
        const target = bbMap.get(targetLabel) || bb;
        return new NIRBranchInst(target);
      }

      case NIROpcode.BR_COND: {
        const cond = resolveVal(data.operands[0], NIRTypes.i1());
        const thenLabel = data.thenBlock ? data.thenBlock.replace('%bb.', '') : '';
        const elseLabel = data.elseBlock ? data.elseBlock.replace('%bb.', '') : '';
        const thenBB = bbMap.get(thenLabel) || bb;
        const elseBB = bbMap.get(elseLabel) || bb;
        return new NIRCondBranchInst(cond, thenBB, elseBB);
      }

      case NIROpcode.UNREACHABLE:
        return new NIRUnreachableInst();

      default:
        return null;
    }
  }

  public static fromJSONString(str: string): NIRModule {
    const obj = JSON.parse(str);
    return this.fromJSON(obj);
  }
}
