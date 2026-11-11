/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Interrupt & Exception Types (x86_64)
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { RegisterContext } from '../abi/types';

export enum GateType {
  INTERRUPT_GATE = 0xE, // IF (Interrupt Flag) cleared automatically on entry
  TRAP_GATE = 0xF,      // IF remains unchanged on entry
}

export enum FaultType {
  DIVIDE_BY_ZERO = 0,
  DEBUG = 1,
  NON_MASKABLE_INTERRUPT = 2,
  BREAKPOINT = 3,
  OVERFLOW = 4,
  BOUND_RANGE_EXCEEDED = 5,
  INVALID_OPCODE = 6,
  DEVICE_NOT_AVAILABLE = 7,
  DOUBLE_FAULT = 8,
  INVALID_TSS = 10,
  SEGMENT_NOT_PRESENT = 11,
  STACK_SEGMENT_FAULT = 12,
  GENERAL_PROTECTION_FAULT = 13,
  PAGE_FAULT = 14,
}

export const FAULT_NAMES: Record<number, string> = {
  [FaultType.DIVIDE_BY_ZERO]: 'Divide By Zero Exception (#DE)',
  [FaultType.DEBUG]: 'Debug Exception (#DB)',
  [FaultType.NON_MASKABLE_INTERRUPT]: 'NMI Interrupt',
  [FaultType.BREAKPOINT]: 'Breakpoint Exception (#BP)',
  [FaultType.OVERFLOW]: 'Overflow Exception (#OF)',
  [FaultType.BOUND_RANGE_EXCEEDED]: 'Bound Range Exceeded (#BR)',
  [FaultType.INVALID_OPCODE]: 'Invalid Opcode Exception (#UD)',
  [FaultType.DEVICE_NOT_AVAILABLE]: 'Device Not Available (#NM)',
  [FaultType.DOUBLE_FAULT]: 'Double Fault Exception (#DF)',
  [FaultType.INVALID_TSS]: 'Invalid TSS (#TS)',
  [FaultType.SEGMENT_NOT_PRESENT]: 'Segment Not Present (#NP)',
  [FaultType.STACK_SEGMENT_FAULT]: 'Stack Segment Fault (#SS)',
  [FaultType.GENERAL_PROTECTION_FAULT]: 'General Protection Fault (#GP)',
  [FaultType.PAGE_FAULT]: 'Page Fault Exception (#PF)',
};

export interface IDTDescriptor {
  limit: number;
  base: bigint;
}

export interface InterruptFrame {
  vector: number;
  errorCode: bigint;
  registers: RegisterContext;
  cr2FaultAddress?: bigint; // Khusus Page Fault (#PF)
  isUserMode?: boolean;
}

export type InterruptHandler = (frame: InterruptFrame) => void;
