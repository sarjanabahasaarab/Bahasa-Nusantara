/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - System Call Table Registry
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { SyscallNumber, SYSCALL_NAMES } from './syscall-numbers';
import { SyscallEntry, SyscallContext, SyscallError } from './types';

export class SyscallTable {
  private static instance?: SyscallTable;
  private readonly table: Map<number, SyscallEntry> = new Map();

  constructor() {
    this.registerDefaults();
  }

  public static getInstance(): SyscallTable {
    if (!this.instance) {
      this.instance = new SyscallTable();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = undefined;
  }

  public register(entry: SyscallEntry): void {
    this.table.set(entry.number, entry);
  }

  public get(num: number): SyscallEntry | undefined {
    return this.table.get(num);
  }

  public has(num: number): boolean {
    return this.table.has(num);
  }

  public getAll(): ReadonlyMap<number, SyscallEntry> {
    return this.table;
  }

  private registerDefaults(): void {
    // 1. sys_process_exit(exit_code: int)
    this.register({
      number: SyscallNumber.PROCESS_EXIT,
      name: SYSCALL_NAMES[SyscallNumber.PROCESS_EXIT],
      minArgs: 1,
      handler: (args, _ctx) => {
        const exitCode = Number(args[0]);
        return BigInt(exitCode);
      },
    });

    // 2. sys_process_id() -> pid
    this.register({
      number: SyscallNumber.PROCESS_ID,
      name: SYSCALL_NAMES[SyscallNumber.PROCESS_ID],
      minArgs: 0,
      handler: (_args, ctx) => {
        return BigInt(ctx.callingProcessId);
      },
    });

    // 3. sys_thread_yield() -> 0
    this.register({
      number: SyscallNumber.THREAD_YIELD,
      name: SYSCALL_NAMES[SyscallNumber.THREAD_YIELD],
      minArgs: 0,
      handler: (_args, _ctx) => {
        return 0n;
      },
    });

    // 4. sys_memory_allocate(size: uint64, align: uint64) -> ptr
    this.register({
      number: SyscallNumber.MEMORY_ALLOCATE,
      name: SYSCALL_NAMES[SyscallNumber.MEMORY_ALLOCATE],
      minArgs: 1,
      handler: (args, _ctx) => {
        const size = Number(args[0]);
        const align = args.length > 1 ? Number(args[1]) : 8;
        if (size <= 0) return BigInt(SyscallError.K_EINVAL);
        // Alokasi virtual 64-bit mock address untuk userspace
        const baseAddr = 0x0000_7000_0000_0000n + BigInt(Math.floor(Math.random() * 0x100000) * 0x1000);
        return baseAddr;
      },
    });

    // 5. sys_memory_release(ptr: uint64, size: uint64) -> 0
    this.register({
      number: SyscallNumber.MEMORY_RELEASE,
      name: SYSCALL_NAMES[SyscallNumber.MEMORY_RELEASE],
      minArgs: 1,
      handler: (args, _ctx) => {
        const ptr = args[0];
        if (ptr === 0n) return BigInt(SyscallError.K_EINVAL);
        return 0n;
      },
    });

    // 6. sys_console_write(ptr: uint64, len: uint64) -> written_len
    this.register({
      number: SyscallNumber.CONSOLE_WRITE,
      name: SYSCALL_NAMES[SyscallNumber.CONSOLE_WRITE],
      minArgs: 2,
      handler: (args, _ctx) => {
        const len = Number(args[1]);
        if (len < 0) return BigInt(SyscallError.K_EINVAL);
        return BigInt(len);
      },
    });

    // 7. sys_clock_get() -> ticks
    this.register({
      number: SyscallNumber.CLOCK_GET,
      name: SYSCALL_NAMES[SyscallNumber.CLOCK_GET],
      minArgs: 0,
      handler: (_args, _ctx) => {
        return BigInt(Date.now());
      },
    });

    // 8. sys_file_open(path_ptr: uint64, flags: uint64) -> fd
    this.register({
      number: SyscallNumber.FILE_OPEN,
      name: SYSCALL_NAMES[SyscallNumber.FILE_OPEN],
      minArgs: 1,
      handler: (_args, _ctx) => {
        // Mock default handle fd 3
        return 3n;
      },
    });

    // 9. sys_file_read(fd: int, buf_ptr: uint64, count: uint64) -> read_bytes
    this.register({
      number: SyscallNumber.FILE_READ,
      name: SYSCALL_NAMES[SyscallNumber.FILE_READ],
      minArgs: 3,
      handler: (args, _ctx) => {
        const fd = Number(args[0]);
        const count = Number(args[2]);
        if (fd < 0) return BigInt(SyscallError.K_EBADF);
        return BigInt(count);
      },
    });

    // 10. sys_file_write(fd: int, buf_ptr: uint64, count: uint64) -> written_bytes
    this.register({
      number: SyscallNumber.FILE_WRITE,
      name: SYSCALL_NAMES[SyscallNumber.FILE_WRITE],
      minArgs: 3,
      handler: (args, _ctx) => {
        const fd = Number(args[0]);
        const count = Number(args[2]);
        if (fd < 0) return BigInt(SyscallError.K_EBADF);
        return BigInt(count);
      },
    });

    // 11. sys_file_close(fd: int) -> 0
    this.register({
      number: SyscallNumber.FILE_CLOSE,
      name: SYSCALL_NAMES[SyscallNumber.FILE_CLOSE],
      minArgs: 1,
      handler: (args, _ctx) => {
        const fd = Number(args[0]);
        if (fd < 0) return BigInt(SyscallError.K_EBADF);
        return 0n;
      },
    });
  }
}
