/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel Thread Representation
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { ThreadID, ProcessID, ThreadState } from './types';
import { RegisterContext } from '../abi/types';
import { KernelABI } from '../abi/kernel-abi';

export class Thread {
  public state: ThreadState = ThreadState.CREATED;
  public registers: RegisterContext;
  public readonly stackBase: bigint;
  public readonly stackSize: number;
  public priority: number; // 1 (terendah) .. 5 (tertinggi)
  public quantumRemaining: number;
  public totalCpuTicks: number = 0;

  public get context(): RegisterContext {
    return this.registers;
  }

  public set context(val: RegisterContext) {
    this.registers = val;
  }

  public get processId(): ProcessID {
    return this.pid;
  }

  constructor(
    public readonly tid: ThreadID,
    public readonly pid: ProcessID,
    entryPointOrPriority: bigint | number = 0n,
    stackBase: bigint = 0xFFFF_8000_1000_0000n,
    stackSize: number = KernelABI.KERNEL_STACK_SIZE_BYTES,
    priority: number = 3
  ) {
    this.stackBase = stackBase;
    this.stackSize = stackSize;

    let entry = 0n;
    let prio = priority;
    if (typeof entryPointOrPriority === 'number') {
      prio = entryPointOrPriority;
      entry = 0n;
    } else {
      entry = entryPointOrPriority;
    }

    this.priority = Math.max(1, Math.min(5, prio));
    this.quantumRemaining = this.priority * 10; // Quantum proporsional prioritas

    this.registers = KernelABI.createDefaultRegisters();
    this.registers.rip = entry;
    this.registers.rsp = stackBase + BigInt(stackSize) - 16n; // 16-byte aligned top of stack
    this.registers.rbp = this.registers.rsp;
  }

  public saveContext(regs: RegisterContext): void {
    this.registers = { ...regs };
  }

  public restoreContext(): RegisterContext {
    return { ...this.registers };
  }
}
