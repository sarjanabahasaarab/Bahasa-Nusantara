/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - System Call Dispatcher & Validator
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { SyscallNumber, SYSCALL_NAMES } from './syscall-numbers';
import { SyscallTable } from './syscall-table';
import { SyscallContext, SyscallError, SyscallTraceEvent } from './types';
import { KernelABI } from '../abi/kernel-abi';
import { RegisterContext } from '../abi/types';
import { UserPointerSecurity } from '../security/user-pointer';

export class SyscallDispatcher {
  private readonly table: SyscallTable;
  private readonly traces: SyscallTraceEvent[] = [];
  private tracingEnabled: boolean = true;
  private memoryReader?: (addr: bigint, len: number) => Uint8Array | null;
  private memoryWriter?: (addr: bigint, data: Uint8Array) => boolean;

  constructor(table?: SyscallTable) {
    this.table = table ?? SyscallTable.getInstance();
  }

  public setMemoryAccessors(
    reader: (addr: bigint, len: number) => Uint8Array | null,
    writer: (addr: bigint, data: Uint8Array) => boolean
  ): void {
    this.memoryReader = reader;
    this.memoryWriter = writer;
  }

  public setTracingEnabled(enabled: boolean): void {
    this.tracingEnabled = enabled;
  }

  public getTraces(): ReadonlyArray<SyscallTraceEvent> {
    return this.traces;
  }

  public clearTraces(): void {
    this.traces.length = 0;
  }

  /**
   * Eksekusi system call dari RegisterContext CPU (x86_64 SysV ABI).
   * RAX = Nomor Syscall
   * RDI = Arg 1, RSI = Arg 2, RDX = Arg 3, R10 = Arg 4, R8 = Arg 5, R9 = Arg 6
   * Hasil dikembalikan pada RAX (jika galat, nilai negatif -E).
   */
  public async dispatchFromRegisters(regs: RegisterContext, ctx: SyscallContext): Promise<bigint> {
    const syscallNum = Number(regs.rax);
    const args: bigint[] = [
      regs.rdi,
      regs.rsi,
      regs.rdx,
      regs.r10,
      regs.r8,
      regs.r9,
    ];

    const result = await this.dispatch(syscallNum, args, ctx);
    regs.rax = result;
    return result;
  }

  /**
   * Eksekusi langsung system call dengan validasi argumen dan pointer
   */
  public async dispatch(
    syscallNumber: number,
    args: bigint[],
    ctx: SyscallContext
  ): Promise<bigint> {
    const start = Date.now();
    const entry = this.table.get(syscallNumber);

    let result: bigint;

    if (!entry) {
      result = BigInt(SyscallError.K_ENOSYS);
    } else if (args.length < entry.minArgs) {
      result = BigInt(SyscallError.K_EINVAL);
    } else {
      try {
        // Validasi pointer khusus untuk system call memori dan I/O jika dipanggil dari User space
        const pointerError = this.validatePointersForSyscall(syscallNumber, args, ctx);
        if (pointerError !== SyscallError.K_OK) {
          result = BigInt(pointerError);
        } else {
          result = await entry.handler(args, ctx);
        }
      } catch (err: any) {
        result = BigInt(SyscallError.K_EIO);
      }
    }

    if (this.tracingEnabled) {
      this.traces.push({
        ticks: Date.now(),
        processId: ctx.callingProcessId,
        threadId: ctx.callingThreadId,
        syscallNumber,
        syscallName: SYSCALL_NAMES[syscallNumber] ?? `syscall_${syscallNumber}`,
        args: [...args],
        result,
        durationMs: Date.now() - start,
      });
      if (this.traces.length > 500) {
        this.traces.shift();
      }
    }

    return result;
  }

  /**
   * Validasi pointer pengguna untuk mencegah pointer injection ke ruang kernel (EFAULT)
   */
  private validatePointersForSyscall(
    syscallNumber: number,
    args: bigint[],
    ctx: SyscallContext
  ): SyscallError {
    if (ctx.isKernelCaller) {
      return SyscallError.K_OK; // Pemanggil dalam mode kernel bebas mengakses memori
    }

    // CONSOLE_WRITE(bufferPtr, count)
    if (syscallNumber === SyscallNumber.CONSOLE_WRITE) {
      const bufferPtr = args[0];
      const count = Number(args[1]);
      const res = UserPointerSecurity.validateUserBuffer(bufferPtr, count, false);
      if (!res.valid) {
        return SyscallError.K_EFAULT;
      }
    }

    // FILE_WRITE(fd, bufferPtr, count)
    if (syscallNumber === SyscallNumber.FILE_WRITE) {
      const bufferPtr = args[1];
      const count = Number(args[2]);
      const res = UserPointerSecurity.validateUserBuffer(bufferPtr, count, false);
      if (!res.valid) {
        return SyscallError.K_EFAULT;
      }
    }

    // FILE_READ(fd, bufferPtr, count)
    if (syscallNumber === SyscallNumber.FILE_READ) {
      const bufferPtr = args[1];
      const count = Number(args[2]);
      const res = UserPointerSecurity.validateUserBuffer(bufferPtr, count, true);
      if (!res.valid) {
        return SyscallError.K_EFAULT;
      }
    }

    // FILE_OPEN(pathPtr, flags, mode)
    if (syscallNumber === SyscallNumber.FILE_OPEN) {
      const pathPtr = args[0];
      const res = UserPointerSecurity.validateUserAddress(pathPtr, false);
      if (!res.valid) {
        return SyscallError.K_EFAULT;
      }
    }

    // MEMORY_RELEASE(ptr, size)
    if (syscallNumber === SyscallNumber.MEMORY_RELEASE) {
      const ptr = args[0];
      const size = Number(args[1]);
      const res = UserPointerSecurity.validateUserBuffer(ptr, size, false);
      if (!res.valid) {
        return SyscallError.K_EFAULT;
      }
    }

    return SyscallError.K_OK;
  }
}
