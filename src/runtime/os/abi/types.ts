/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel ABI Types & Definitions (x86_64)
 * Target Milestone: Phase 48 (v0.48.0)
 */

export interface RegisterContext {
  rax: bigint;
  rbx: bigint;
  rcx: bigint;
  rdx: bigint;
  rsi: bigint;
  rdi: bigint;
  rbp: bigint;
  rsp: bigint;
  r8: bigint;
  r9: bigint;
  r10: bigint;
  r11: bigint;
  r12: bigint;
  r13: bigint;
  r14: bigint;
  r15: bigint;
  rip: bigint;
  rflags: bigint;
  cs: number;
  ss: number;
  cr3?: bigint;
}

export interface StackLayout {
  stackBase: bigint;
  stackSize: number;
  alignmentBytes: number;
  hasRedZone: boolean;
}

export interface MemoryLayout {
  userSpaceStart: bigint;
  userSpaceEnd: bigint;
  kernelSpaceStart: bigint;
  kernelSpaceEnd: bigint;
  directPhysicalMapStart: bigint;
  kernelHeapStart: bigint;
  kernelTextBase: bigint;
}
