/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - System Call Number Definitions
 * Target Milestone: Phase 48 (v0.48.0)
 */

export enum SyscallNumber {
  PROCESS_EXIT = 1,
  PROCESS_ID = 2,
  THREAD_YIELD = 3,
  MEMORY_ALLOCATE = 4,
  MEMORY_RELEASE = 5,
  CONSOLE_WRITE = 6,
  CLOCK_GET = 7,
  FILE_OPEN = 8,
  FILE_READ = 9,
  FILE_WRITE = 10,
  FILE_CLOSE = 11,
}

export const SYSCALL_NAMES: Record<number, string> = {
  [SyscallNumber.PROCESS_EXIT]: 'sys_process_exit',
  [SyscallNumber.PROCESS_ID]: 'sys_process_id',
  [SyscallNumber.THREAD_YIELD]: 'sys_thread_yield',
  [SyscallNumber.MEMORY_ALLOCATE]: 'sys_memory_allocate',
  [SyscallNumber.MEMORY_RELEASE]: 'sys_memory_release',
  [SyscallNumber.CONSOLE_WRITE]: 'sys_console_write',
  [SyscallNumber.CLOCK_GET]: 'sys_clock_get',
  [SyscallNumber.FILE_OPEN]: 'sys_file_open',
  [SyscallNumber.FILE_READ]: 'sys_file_read',
  [SyscallNumber.FILE_WRITE]: 'sys_file_write',
  [SyscallNumber.FILE_CLOSE]: 'sys_file_close',
};
