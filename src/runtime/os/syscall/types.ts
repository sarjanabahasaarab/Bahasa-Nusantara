/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - System Call Types & Error Codes
 * Target Milestone: Phase 48 (v0.48.0)
 */

export enum SyscallError {
  K_OK = 0,
  K_EPERM = -1,    // Operasi tidak diizinkan
  K_ENOENT = -2,   // Berkas atau entitas tidak ditemukan
  K_ESRCH = -3,    // Proses atau thread tidak ditemukan
  K_EIO = -5,      // Kesalahan I/O hardware
  K_EBADF = -9,    // Deskriptor berkas tidak sah
  K_ENOMEM = -12,  // Kehabisan memori kernel/user
  K_EFAULT = -14,  // Alamat memori pointer buruk / tidak valid
  K_EINVAL = -22,  // Argumen tidak sah
  K_ENOSYS = -38,  // System call tidak diimplementasikan
}

export interface SyscallContext {
  callingProcessId: number;
  callingThreadId: number;
  isKernelCaller: boolean;
}

export interface SyscallEntry {
  number: number;
  name: string;
  minArgs: number;
  handler: (args: bigint[], ctx: SyscallContext) => bigint | Promise<bigint>;
}

export interface SyscallTraceEvent {
  ticks: number;
  processId: number;
  threadId: number;
  syscallNumber: number;
  syscallName: string;
  args: bigint[];
  result: bigint;
  durationMs: number;
}
