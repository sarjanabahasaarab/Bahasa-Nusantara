/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - System Call Types & Error Codes
 * Target Milestone: Phase 48 (v0.48.0)
 */

import type { AddressSpace } from '../memory/address-space';

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

export interface UserMemoryAccess {
  /** Salin data dari alamat pengguna ke buffer milik kernel. Null berarti gagal. */
  copyFromUser(address: bigint, length: number): Uint8Array | null;
  /** Salin buffer milik kernel ke alamat pengguna. False berarti gagal. */
  copyToUser(address: bigint, data: Uint8Array, length?: number): boolean;
}

export interface SyscallContext {
  callingProcessId: number;
  callingThreadId: number;
  isKernelCaller: boolean;
  /** Address space milik proses pemanggil; wajib dipasok oleh lapisan process manager. */
  addressSpace?: AddressSpace;
  /** API copyin/copyout yang disediakan dispatcher untuk handler syscall. */
  userMemory?: UserMemoryAccess;
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
