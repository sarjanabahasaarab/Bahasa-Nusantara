/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Interrupt Descriptor Table (IDT 64-bit)
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { GateType, IDTDescriptor, InterruptFrame, InterruptHandler } from './types';
import { RegisterContext } from '../abi/types';
import { KernelABI } from '../abi/kernel-abi';

export interface IDTGate {
  offset: bigint;
  selector: number;
  ist: number;
  type: GateType;
  dpl: number; // 0 = Kernel, 3 = User
  present: boolean;
}

export class InterruptDescriptorTable {
  public static readonly TOTAL_GATES = 256;
  private readonly gates: Array<IDTGate | null> = new Array(InterruptDescriptorTable.TOTAL_GATES).fill(null);
  private readonly handlers: Map<number, InterruptHandler> = new Map();
  private isLoaded: boolean = false;

  public setGate(
    vector: number,
    offset: bigint,
    selector: number = 0x08, // Kernel code segment
    ist: number = 0,
    type: GateType = GateType.INTERRUPT_GATE,
    dpl: number = 0
  ): void {
    if (vector < 0 || vector >= InterruptDescriptorTable.TOTAL_GATES) {
      throw new Error(`Vektor interupsi di luar rentang: ${vector}`);
    }

    this.gates[vector] = {
      offset,
      selector,
      ist,
      type,
      dpl,
      present: true,
    };
  }

  public getGate(vector: number): IDTGate | null {
    return this.gates[vector] ?? null;
  }

  public getGateCount(): number {
    return InterruptDescriptorTable.TOTAL_GATES;
  }

  public getDescriptor(vector: number): { selector: number; typeAttributes: number; offset: bigint } | null {
    const gate = this.gates[vector];
    if (!gate) return null;
    return {
      selector: gate.selector,
      typeAttributes: 0x8E,
      offset: gate.offset,
    };
  }

  public getIDTR(): IDTDescriptor {
    return this.load();
  }

  public registerHandler(vector: number, handler: InterruptHandler): void {
    this.handlers.set(vector, handler);
  }

  public getHandler(vector: number): InterruptHandler | undefined {
    return this.handlers.get(vector);
  }

  public load(): IDTDescriptor {
    this.isLoaded = true;
    return {
      limit: InterruptDescriptorTable.TOTAL_GATES * 16 - 1, // 16 bytes per entry in x86_64
      base: 0xFFFF_FFFF_8000_1000n, // Alamat virtual IDT di higher-half
    };
  }

  public isIDTLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Pemicu dispatching interupsi atau exception
   */
  public dispatch(vector: number, errorCode: bigint = 0n, regs?: Partial<RegisterContext>, cr2?: bigint): void {
    const handler = this.handlers.get(vector);
    const gate = this.gates[vector];

    if (!gate || !gate.present) {
      throw new Error(`Unhandled Interrupt: Vektor ${vector} tidak memiliki gate atau tidak present`);
    }

    const fullRegs: RegisterContext = {
      ...KernelABI.createDefaultRegisters(),
      ...(regs ?? {}),
    };

    const frame: InterruptFrame = {
      vector,
      errorCode,
      registers: fullRegs,
      cr2FaultAddress: cr2,
    };

    if (handler) {
      handler(frame);
    }
  }
}
