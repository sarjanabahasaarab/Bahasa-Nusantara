/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel Core Types & Interfaces
 * Target Milestone: Phase 48 (v0.48.0)
 */

export enum KernelState {
  UNINITIALIZED = 'UNINITIALIZED',
  BOOTING = 'BOOTING',
  RUNNING = 'RUNNING',
  HALTED = 'HALTED',
  PANICKED = 'PANICKED',
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  PANIC = 4,
}

export interface KernelConfig {
  kernelName: string;
  name?: string;
  version: string;
  architecture: 'x86_64';
  logLevel: LogLevel;
  maxMemoryBytes: number;
  enableSerialLogging: boolean;
  enableVirtualMemory: boolean;
  enablePreemption: boolean;
  timeSliceMs: number;
}

export interface KernelContext {
  bootTime: number;
  uptimeTicks: number;
  ticks: number;
  state: KernelState;
  activeProcessId: number;
  activeThreadId: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  interruptCount: number;
  syscallCount: number;
}
