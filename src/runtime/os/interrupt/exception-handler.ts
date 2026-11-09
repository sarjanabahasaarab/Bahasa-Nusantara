/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Exception Handlers (#DE, #UD, #DF, #GP, #PF)
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { FaultType, FAULT_NAMES, InterruptFrame } from './types';
import { InterruptDescriptorTable } from './idt';
import { KernelPanic } from '../kernel/kernel-panic';
import { KernelLogger } from '../kernel/kernel-logger';

export class ExceptionHandler {
  private readonly customHandlers: Map<FaultType, (frame: any) => boolean> = new Map();

  public register(faultType: FaultType, handler: (frame: any) => boolean): void {
    this.customHandlers.set(faultType, handler);
  }

  public handleFault(faultContext: any): boolean {
    const handler = this.customHandlers.get(faultContext.faultType);
    if (handler) {
      return handler(faultContext);
    }
    return false;
  }

  public static registerAll(idt: InterruptDescriptorTable): void {
    const logger = KernelLogger.getInstance();

    // 0. Divide By Zero (#DE)
    idt.registerHandler(FaultType.DIVIDE_BY_ZERO, (frame) => {
      logger.error('FAULT', `Pengecualian: ${FAULT_NAMES[FaultType.DIVIDE_BY_ZERO]} pada RIP=0x${frame.registers.rip.toString(16)}`);
      KernelPanic.trigger({
        reason: 'Divide by zero error',
        subsystem: 'CPU_FAULT',
        registers: {
          rip: frame.registers.rip,
          rax: frame.registers.rax,
          rcx: frame.registers.rcx,
          rsp: frame.registers.rsp,
        },
      });
    });

    // 6. Invalid Opcode (#UD)
    idt.registerHandler(FaultType.INVALID_OPCODE, (frame) => {
      logger.error('FAULT', `Pengecualian: ${FAULT_NAMES[FaultType.INVALID_OPCODE]} pada RIP=0x${frame.registers.rip.toString(16)}`);
      KernelPanic.trigger({
        reason: 'Invalid opcode executed',
        subsystem: 'CPU_FAULT',
        registers: { rip: frame.registers.rip, rsp: frame.registers.rsp },
      });
    });

    // 8. Double Fault (#DF)
    idt.registerHandler(FaultType.DOUBLE_FAULT, (frame) => {
      logger.panic('FAULT', `FATAL: ${FAULT_NAMES[FaultType.DOUBLE_FAULT]}! Kode galat: 0x${frame.errorCode.toString(16)}`);
      KernelPanic.trigger({
        reason: 'Double fault occurred',
        subsystem: 'CPU_FAULT',
        registers: { rip: frame.registers.rip, rsp: frame.registers.rsp },
      });
    });

    // 13. General Protection Fault (#GP)
    idt.registerHandler(FaultType.GENERAL_PROTECTION_FAULT, (frame) => {
      logger.error('FAULT', `Pengecualian: ${FAULT_NAMES[FaultType.GENERAL_PROTECTION_FAULT]}, Kode Galat: 0x${frame.errorCode.toString(16)}`);
      KernelPanic.trigger({
        reason: `General protection fault (error code: 0x${frame.errorCode.toString(16)})`,
        subsystem: 'CPU_FAULT',
        registers: { rip: frame.registers.rip, rsp: frame.registers.rsp, errorCode: frame.errorCode },
      });
    });

    // 14. Page Fault (#PF)
    idt.registerHandler(FaultType.PAGE_FAULT, (frame) => {
      const cr2 = frame.cr2FaultAddress ?? 0n;
      const isPresent = (frame.errorCode & 1n) !== 0n;
      const isWrite = (frame.errorCode & 2n) !== 0n;
      const isUser = (frame.errorCode & 4n) !== 0n;
      const desc = `Page fault pada alamat 0x${cr2.toString(16)} (P=${isPresent ? 1 : 0}, W/R=${isWrite ? 'W' : 'R'}, U/S=${isUser ? 'U' : 'S'})`;
      logger.error('FAULT', desc);
      KernelPanic.trigger({
        reason: desc,
        subsystem: 'MEMORY_FAULT',
        registers: { rip: frame.registers.rip, rsp: frame.registers.rsp, cr2, errorCode: frame.errorCode },
      });
    });
  }
}
