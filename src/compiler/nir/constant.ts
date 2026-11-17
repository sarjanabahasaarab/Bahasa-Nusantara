/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA INTERMEDIATE REPRESENTATION (NIR) - Konstanta NIR
 * Target Milestone: Phase 43 (v0.43.0)
 */

import { NIRType, NIRTypes } from './type';
import { NIRValue, NIRValueKind } from './value';

export abstract class NIRConstant extends NIRValue {
  constructor(type: NIRType, public readonly rawValue: any, literalId?: string) {
    super(NIRValueKind.CONSTANT, type, literalId);
  }

  public abstract isZero(): boolean;
  public abstract isOne(): boolean;
}

export class NIRConstantInt extends NIRConstant {
  constructor(public readonly value: bigint | number, type: NIRType = NIRTypes.i64()) {
    super(type, value, value.toString());
  }

  public isZero(): boolean {
    return BigInt(this.value) === 0n;
  }

  public isOne(): boolean {
    return BigInt(this.value) === 1n;
  }

  public toString(): string {
    return `${this.type.toString()} ${this.value.toString()}`;
  }

  public override toJSON(): any {
    return {
      ...super.toJSON(),
      constKind: 'int',
      value: this.value.toString(),
    };
  }
}

export class NIRConstantFloat extends NIRConstant {
  constructor(public readonly value: number, type: NIRType = NIRTypes.f64()) {
    super(type, value, value.toString());
  }

  public isZero(): boolean {
    return this.value === 0.0;
  }

  public isOne(): boolean {
    return this.value === 1.0;
  }

  public toString(): string {
    return `${this.type.toString()} ${this.value.toString()}`;
  }

  public override toJSON(): any {
    return {
      ...super.toJSON(),
      constKind: 'float',
      value: this.value,
    };
  }
}

export class NIRConstantBool extends NIRConstant {
  constructor(public readonly value: boolean) {
    super(NIRTypes.i1(), value, value ? 'true' : 'false');
  }

  public isZero(): boolean {
    return !this.value;
  }

  public isOne(): boolean {
    return this.value;
  }

  public toString(): string {
    return `i1 ${this.value ? 'true' : 'false'}`;
  }

  public override toJSON(): any {
    return {
      ...super.toJSON(),
      constKind: 'bool',
      value: this.value,
    };
  }
}

export class NIRConstantString extends NIRConstant {
  constructor(public readonly value: string) {
    super(NIRTypes.string(), value, JSON.stringify(value));
  }

  public isZero(): boolean {
    return this.value.length === 0;
  }

  public isOne(): boolean {
    return false;
  }

  public toString(): string {
    return `string ${JSON.stringify(this.value)}`;
  }

  public override toJSON(): any {
    return {
      ...super.toJSON(),
      constKind: 'string',
      value: this.value,
    };
  }
}

export class NIRConstantNull extends NIRConstant {
  constructor(type: NIRType = NIRTypes.pointer(NIRTypes.any())) {
    super(type, null, 'null');
  }

  public isZero(): boolean {
    return true;
  }

  public isOne(): boolean {
    return false;
  }

  public toString(): string {
    return `${this.type.toString()} null`;
  }

  public override toJSON(): any {
    return {
      ...super.toJSON(),
      constKind: 'null',
    };
  }
}

export class NIRConstantArray extends NIRConstant {
  constructor(public readonly elements: NIRConstant[], type: NIRType) {
    super(type, elements, `[${elements.map((e) => e.id).join(', ')}]`);
  }

  public isZero(): boolean {
    return this.elements.length === 0;
  }

  public isOne(): boolean {
    return false;
  }

  public toString(): string {
    const elems = this.elements.map((e) => e.toString()).join(', ');
    return `${this.type.toString()} [${elems}]`;
  }

  public override toJSON(): any {
    return {
      ...super.toJSON(),
      constKind: 'array',
      elements: this.elements.map((e) => e.toJSON()),
    };
  }
}

export class NIRConstants {
  public static int(val: number | bigint, type?: NIRType): NIRConstantInt {
    return new NIRConstantInt(val, type);
  }

  public static i64(val: number | bigint): NIRConstantInt {
    return new NIRConstantInt(val, NIRTypes.i64());
  }

  public static i32(val: number): NIRConstantInt {
    return new NIRConstantInt(val, NIRTypes.i32());
  }

  public static float(val: number): NIRConstantFloat {
    return new NIRConstantFloat(val, NIRTypes.f64());
  }

  public static bool(val: boolean): NIRConstantBool {
    return new NIRConstantBool(val);
  }

  public static string(val: string): NIRConstantString {
    return new NIRConstantString(val);
  }

  public static null(type?: NIRType): NIRConstantNull {
    return new NIRConstantNull(type);
  }

  public static array(elems: NIRConstant[], type: NIRType): NIRConstantArray {
    return new NIRConstantArray(elems, type);
  }
}
