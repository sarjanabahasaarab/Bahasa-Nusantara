/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA LLVM BACKEND - Pemetaan Sistem Tipe NIR ke LLVM IR
 * Target Milestone: Phase 44 (v0.44.0)
 */

import { NIRType, NIRTypeKind } from '../nir/type';
import { LLVMDiagnosticsManager } from './diagnostics';

export class LLVMTypeMapper {
  constructor(
    public readonly useOpaquePointers: boolean = true,
    private readonly diag?: LLVMDiagnosticsManager
  ) {}

  public map(nirType: NIRType): string {
    switch (nirType.kind) {
      case NIRTypeKind.VOID:
        return 'void';
      case NIRTypeKind.BOOLEAN:
        return 'i1';
      case NIRTypeKind.INT32:
        return 'i32';
      case NIRTypeKind.INT64:
        return 'i64';
      case NIRTypeKind.FLOAT64:
        return 'double';
      case NIRTypeKind.STRING:
        // Representasi string di LLVM IR: ptr (opaque) atau i8*
        return this.useOpaquePointers ? 'ptr' : 'i8*';
      case NIRTypeKind.POINTER:
        return this.useOpaquePointers ? 'ptr' : `${this.map(nirType.elementType || nirType)}*`;
      case NIRTypeKind.ARRAY:
        const count = nirType.size || 0;
        const elemType = nirType.elementType ? this.map(nirType.elementType) : 'i64';
        return `[${count} x ${elemType}]`;
      case NIRTypeKind.STRUCT:
        if (nirType.structName) {
          return `%struct.${nirType.structName}`;
        }
        if (nirType.fieldTypes && nirType.fieldTypes.size > 0) {
          const fieldStrs = Array.from(nirType.fieldTypes.values()).map((f) => this.map(f)).join(', ');
          return `{ ${fieldStrs} }`;
        }
        return '{}';
      case NIRTypeKind.FUNCTION:
        const retType = nirType.returnType ? this.map(nirType.returnType) : 'void';
        const params = (nirType.paramTypes || []).map((p) => this.map(p)).join(', ');
        return `${retType} (${params})`;
      case NIRTypeKind.ANY:
        // Tipe dinamis direpresentasikan sebagai pointer opaque atau i64
        return this.useOpaquePointers ? 'ptr' : 'i8*';
      default:
        this.diag?.error(
          'LLVM_TYPE_UNSUPPORTED',
          `Tipe NIR '${nirType.toString()}' belum memiliki representasi LLVM yang valid.`
        );
        return 'i64';
    }
  }

  public getPointerType(elementType?: NIRType): string {
    if (this.useOpaquePointers) {
      return 'ptr';
    }
    if (elementType) {
      return `${this.map(elementType)}*`;
    }
    return 'i8*';
  }
}
