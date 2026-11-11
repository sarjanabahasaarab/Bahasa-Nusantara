/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel & User Thread Representation (TCB)
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { ThreadID, ProcessID, ThreadState } from './types';
import { RegisterContext } from '../abi/types';
import { KernelABI } from '../abi/kernel-abi';
import { SegmentSelector } from '../hal/gdt-tss';

export class Thread {
  public state: ThreadState = ThreadState.CREATED;
  public registers: RegisterContext;
  public readonly stackBase: bigint;
  public readonly stackSize: number;
  public readonly kernelStackTop: bigint;
  public userStackTop?: bigint;
  public isUserMode: boolean = false;
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
    priority: number = 3,
    isUserMode: boolean = false
  ) {
    this.stackBase = stackBase;
    this.stackSize = stackSize;
    this.kernelStackTop = stackBase + BigInt(stackSize) - 16n;
    this.isUserMode = isUserMode;

    let entry = 0n;
    let prio = priority;
    if (typeof entryPointOrPriority === 'number') {
      prio = entryPointOrPriority;
      entry = 0n;
    } else {
      entry = entryPointOrPriority;
    }

    this.priority = Math.max(1, Math.min(5, prio));
    this.quantumRemaining = this.priority * 10;

    this.registers = KernelABI.createDefaultRegisters();
    this.registers.rip = entry;

    if (this.isUserMode) {
      this.registers.cs = SegmentSelector.USER_CODE; // 0x23 (Ring 3)
      this.registers.ss = SegmentSelector.USER_DATA; // 0x1B (Ring 3)
      this.registers.rsp = 0x0000_7FFF_FFFF_0000n;
      this.registers.rbp = this.registers.rsp;
    } else {
      this.registers.cs = SegmentSelector.KERNEL_CODE; // 0x08 (Ring 0)
      this.registers.ss = SegmentSelector.KERNEL_DATA; // 0x10 (Ring 0)
      this.registers.rsp = this.kernelStackTop;
      this.registers.rbp = this.registers.rsp;
    }
  }

  public setUserStack(stackTop: bigint): void {
    this.userStackTop = stackTop;
    this.registers.rsp = stackTop;
    this.registers.rbp = stackTop;
  }

  public saveContext(regs: RegisterContext): void {
    this.registers = { ...regs };
  }

  public restoreContext(): RegisterContext {
    return { ...this.registers };
  }
}
