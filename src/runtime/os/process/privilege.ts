/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - CPU Privilege Level & Ring Transition Engine (x86_64)
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { SegmentSelector, GDT64Manager } from '../hal/gdt-tss';
import { RegisterContext } from '../abi/types';
import { Thread } from './thread';

export enum CPUPrivilegeLevel {
  RING_0_KERNEL = 0,
  RING_3_USER = 3,
}

export class PrivilegeManager {
  private static gdtManager = GDT64Manager.getInstance();

  /**
   * Menyiapkan context register CPU untuk berpindah dari Ring 0 ke Ring 3 via instruksi IRETQ / SYSRET.
   *
   * Stack frame IRETQ x86_64 (dari atas ke bawah saat transisi):
   * [RSP + 32] = SS     : 0x1B (User Data Segment, DPL 3, RPL 3)
   * [RSP + 24] = RSP    : User Stack Pointer
   * [RSP + 16] = RFLAGS : 0x202 (IF aktif, IOPL 0)
   * [RSP + 8]  = CS     : 0x23 (User Code Segment, DPL 3, RPL 3)
   * [RSP + 0]  = RIP    : User Entry Point
   */
  public static prepareUserModeTransition(
    userEntryPoint: bigint,
    userRsp: bigint,
    kernelStackRsp0: bigint
  ): RegisterContext {
    // 1. Perbarui RSP0 pada TSS agar interupsi/syscall berikutnya beralih ke kernel stack thread ini
    this.gdtManager.setKernelStack(kernelStackRsp0);

    // 2. Siapkan RegisterContext dalam kondisi Ring 3
    return {
      rax: 0n,
      rbx: 0n,
      rcx: userEntryPoint, // RCX diisi RIP untuk SYSRET ABI
      rdx: 0n,
      rsi: 0n,
      rdi: 0n,
      rbp: userRsp,
      rsp: userRsp,
      r8: 0n,
      r9: 0n,
      r10: 0n,
      r11: 0x202n,        // R11 diisi RFLAGS untuk SYSRET ABI
      r12: 0n,
      r13: 0n,
      r14: 0n,
      r15: 0n,
      rip: userEntryPoint,
      rflags: 0x202n,     // Interrupt Flag (IF) aktif, IOPL = 0 (Ring 3 dilarang in/out port langsung)
      cs: SegmentSelector.USER_CODE, // 0x23 (RPL 3)
      ss: SegmentSelector.USER_DATA, // 0x1B (RPL 3)
    };
  }

  /**
   * Menyiapkan kembalinya eksekusi ke Kernel Mode (Ring 0)
   */
  public static prepareKernelModeReturn(
    kernelRsp: bigint,
    kernelRip: bigint
  ): RegisterContext {
    return {
      rax: 0n,
      rbx: 0n,
      rcx: 0n,
      rdx: 0n,
      rsi: 0n,
      rdi: 0n,
      rbp: kernelRsp,
      rsp: kernelRsp,
      r8: 0n,
      r9: 0n,
      r10: 0n,
      r11: 0n,
      r12: 0n,
      r13: 0n,
      r14: 0n,
      r15: 0n,
      rip: kernelRip,
      rflags: 0x202n,
      cs: SegmentSelector.KERNEL_CODE, // 0x08 (RPL 0)
      ss: SegmentSelector.KERNEL_DATA, // 0x10 (RPL 0)
    };
  }

  /**
   * Memeriksa apakah register context saat ini sedang berjalan di User Mode (Ring 3)
   */
  public static isUserMode(regs: RegisterContext): boolean {
    return (regs.cs & 3) === 3 && (regs.ss & 3) === 3;
  }

  /**
   * Memeriksa apakah register context saat ini sedang berjalan di Kernel Mode (Ring 0)
   */
  public static isKernelMode(regs: RegisterContext): boolean {
    return (regs.cs & 3) === 0 && (regs.ss & 3) === 0;
  }
}
