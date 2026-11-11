/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Process Fault Handler & Isolation Guard
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { FaultType, FAULT_NAMES } from './types';
import { KernelPanic } from '../kernel/kernel-panic';
import { KernelLogger } from '../kernel/kernel-logger';
import { ProcessManager } from '../process/manager';
import { ProcessID } from '../process/types';

export interface UserFaultDiagnostic {
  pid: ProcessID;
  faultType: FaultType;
  faultName: string;
  faultingRip: bigint;
  faultAddressCR2?: bigint;
  errorCode: bigint;
  handledSafely: boolean;
  actionTaken: 'PROCESS_TERMINATED' | 'SIGNAL_SENT' | 'KERNEL_PANIC';
}

export class ProcessFaultHandler {
  private static readonly diagnostics: UserFaultDiagnostic[] = [];

  public static getDiagnostics(): ReadonlyArray<UserFaultDiagnostic> {
    return this.diagnostics;
  }

  public static clearDiagnostics(): void {
    this.diagnostics.length = 0;
  }

  /**
   * Menangani exception CPU secara cerdas berdasarkan Privilege Level (Ring 0 vs Ring 3):
   * - Jika fault berasal dari Ring 3 (User Mode): Terminasi proses pelaku secara bersih,
   *   catat log diagnostik pada serial UART, dan JANGAN menjatuhkan kernel (NO KernelPanic).
   * - Jika fault berasal dari Ring 0 (Kernel Mode): Picu KernelPanic karena menandakan cacat internal kernel.
   */
  public static handleException(frame: any, activePid: ProcessID = 1): boolean {
    const logger = KernelLogger.getInstance();
    const cs = Number(frame.registers?.cs ?? 0x08);
    const isRing3 = (cs & 3) === 3 || Boolean(frame.isUserMode);

    const faultType: FaultType = frame.faultType ?? FaultType.PAGE_FAULT;
    const faultName = FAULT_NAMES[faultType] ?? `FAULT_${faultType}`;
    const rip = frame.registers?.rip ?? 0n;
    const errorCode = BigInt(frame.errorCode ?? 0);
    const cr2 = frame.cr2FaultAddress;

    if (isRing3) {
      // 1. Fault Berasal dari Ring 3: Tangani dengan aman tanpa merusak kernel!
      const diag: UserFaultDiagnostic = {
        pid: activePid,
        faultType,
        faultName,
        faultingRip: rip,
        faultAddressCR2: cr2,
        errorCode,
        handledSafely: true,
        actionTaken: 'PROCESS_TERMINATED',
      };
      this.diagnostics.push(diag);

      logger.warn(
        'USER_FAULT',
        `[PID ${activePid}] Pengecualian ${faultName} pada RIP=0x${rip.toString(16)} (CR2=${cr2 ? '0x' + cr2.toString(16) : 'N/A'}, ErrCode=0x${errorCode.toString(16)}). Menghentikan proses pengguna secara aman.`
      );

      // Terminasi proses pengguna
      ProcessManager.getInstance().process_terminate(activePid, `EXCEPTION_${faultName}`);

      return true; // Berhasil ditangani tanpa panik
    } else {
      // 2. Fault Berasal dari Ring 0: Cacat fatal kernel
      logger.panic(
        'KERNEL_FAULT',
        `FATAL KERNEL EXCEPTION: ${faultName} pada Ring 0 RIP=0x${rip.toString(16)}! Kernel dihentikan.`
      );

      KernelPanic.trigger({
        reason: `Fatal Ring 0 ${faultName}`,
        subsystem: 'CPU_FAULT',
        registers: {
          rip,
          rsp: frame.registers?.rsp ?? 0n,
          cr2,
          errorCode,
        },
      });

      return false;
    }
  }
}
