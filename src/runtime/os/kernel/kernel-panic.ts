/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel Panic Handler & Diagnostics Dump
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { KernelLogger } from './kernel-logger';

export interface PanicContext {
  reason: string;
  sourceFile?: string;
  sourceLine?: number;
  subsystem?: string;
  registers?: Record<string, string | number | bigint>;
  stackTrace?: string[];
  additionalInfo?: Record<string, any>;
}

export class KernelPanicError extends Error {
  public readonly context: PanicContext;

  constructor(context: PanicContext) {
    super(`KERNEL PANIC: ${context.reason}`);
    this.name = 'KernelPanicError';
    this.context = context;
  }
}

export class KernelPanic {
  private static panicHandler?: (context: PanicContext) => void;

  public static setPanicHandler(handler: (context: PanicContext) => void): void {
    this.panicHandler = handler;
  }

  public static trigger(
    contextOrReason: PanicContext | string,
    registersOrInfo?: Partial<PanicContext> | Record<string, string | number | bigint>
  ): never {
    let context: PanicContext;
    if (typeof contextOrReason === 'string') {
      context = {
        reason: contextOrReason,
        registers: registersOrInfo && !('reason' in registersOrInfo) ? (registersOrInfo as Record<string, string | number | bigint>) : undefined,
        ...(registersOrInfo && 'reason' in registersOrInfo ? (registersOrInfo as any) : {}),
      };
    } else {
      context = contextOrReason;
    }

    const logger = KernelLogger.getInstance();
    logger.panic('PANIC', `==================== KERNEL PANIC ====================`);
    logger.panic('PANIC', `Alasan      : ${context.reason}`);
    if (context.subsystem) {
      logger.panic('PANIC', `Subsistem   : ${context.subsystem}`);
    }
    if (context.sourceFile) {
      logger.panic('PANIC', `Lokasi      : ${context.sourceFile}:${context.sourceLine ?? 0}`);
    }

    if (context.registers) {
      logger.panic('PANIC', `--- Register Dump (x86_64) ---`);
      for (const [reg, val] of Object.entries(context.registers)) {
        const hexVal = typeof val === 'bigint' ? `0x${val.toString(16).padStart(16, '0')}` :
                       typeof val === 'number' ? `0x${val.toString(16).padStart(16, '0')}` : String(val);
        logger.panic('PANIC', `  ${reg.padEnd(8)} : ${hexVal}`);
      }
    }

    if (context.stackTrace && context.stackTrace.length > 0) {
      logger.panic('PANIC', `--- Call Stack Trace ---`);
      context.stackTrace.forEach((frame, idx) => {
        logger.panic('PANIC', `  #${idx.toString().padStart(2, '0')} ${frame}`);
      });
    }

    logger.panic('PANIC', `======================================================`);

    if (this.panicHandler) {
      this.panicHandler(context);
    }

    throw new KernelPanicError(context);
  }
}
