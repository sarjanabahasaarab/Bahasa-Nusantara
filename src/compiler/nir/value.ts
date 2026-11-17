/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA INTERMEDIATE REPRESENTATION (NIR) - Sistem Nilai & Operand
 * Target Milestone: Phase 43 (v0.43.0)
 */

import { NIRType, NIRTypes } from './type';

export enum NIRValueKind {
  CONSTANT = 'constant',
  INSTRUCTION = 'instruction',
  PARAMETER = 'parameter',
  GLOBAL = 'global',
  BASIC_BLOCK = 'basic_block',
}

export interface NIRUse {
  user: any; // NIRInstruction
  operandIndex: number;
}

export abstract class NIRValue {
  private static idCounter: number = 0;
  public readonly id: string;
  public readonly uses: NIRUse[] = [];

  constructor(
    public readonly kind: NIRValueKind,
    public type: NIRType,
    name?: string
  ) {
    if (name !== undefined) {
      if (kind === NIRValueKind.CONSTANT) {
        this.id = name;
      } else if (kind === NIRValueKind.GLOBAL) {
        this.id = name.startsWith('@') ? name : `@${name}`;
      } else if (kind === NIRValueKind.BASIC_BLOCK) {
        this.id = name.startsWith('%bb.') ? name : (name.startsWith('%') ? name : `%bb.${name}`);
      } else {
        this.id = name.startsWith('%') ? name : `%${name}`;
      }
    } else {
      NIRValue.idCounter++;
      this.id = `%v${NIRValue.idCounter}`;
    }
  }

  public static resetCounter(initial: number = 0): void {
    NIRValue.idCounter = initial;
  }

  public addUse(user: any, operandIndex: number): void {
    this.uses.push({ user, operandIndex });
  }

  public removeUse(user: any, operandIndex: number): void {
    const idx = this.uses.findIndex(
      (u) => u.user === user && u.operandIndex === operandIndex
    );
    if (idx !== -1) {
      this.uses.splice(idx, 1);
    }
  }

  public replaceAllUsesWith(newVal: NIRValue): void {
    const currentUses = [...this.uses];
    for (const use of currentUses) {
      if (typeof use.user.setOperand === 'function') {
        use.user.setOperand(use.operandIndex, newVal);
      }
    }
    this.uses.length = 0;
  }

  public hasUsers(): boolean {
    return this.uses.length > 0;
  }

  public getUserCount(): number {
    return this.uses.length;
  }

  public abstract toString(): string;

  public toJSON(): any {
    return {
      kind: this.kind,
      id: this.id,
      type: this.type.toJSON(),
    };
  }
}

export class NIRParameter extends NIRValue {
  constructor(
    public readonly name: string,
    type: NIRType,
    public readonly index: number
  ) {
    super(NIRValueKind.PARAMETER, type, `%${name}`);
  }

  public toString(): string {
    return `${this.type.toString()} ${this.id}`;
  }

  public override toJSON(): any {
    return {
      ...super.toJSON(),
      name: this.name,
      index: this.index,
    };
  }
}

export class NIRGlobal extends NIRValue {
  constructor(
    public readonly globalName: string,
    type: NIRType,
    public isConstant: boolean = false,
    public initializer?: NIRValue
  ) {
    super(NIRValueKind.GLOBAL, type, `@${globalName}`);
  }

  public toString(): string {
    const constStr = this.isConstant ? 'constant' : 'global';
    const initStr = this.initializer ? ` ${this.initializer.toString()}` : '';
    return `${this.id} = ${constStr} ${this.type.toString()}${initStr}`;
  }

  public override toJSON(): any {
    return {
      ...super.toJSON(),
      globalName: this.globalName,
      isConstant: this.isConstant,
      initializer: this.initializer ? this.initializer.toJSON() : undefined,
    };
  }
}
