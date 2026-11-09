/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel Application Binary Interface (ABI) Specification & Helpers
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { RegisterContext, StackLayout, MemoryLayout } from './types';

export class KernelABI {
  /**
   * Layout Memori Standar x86_64 Higher-Half Kernel
   */
  public static readonly MEMORY_LAYOUT: MemoryLayout = {
    userSpaceStart: 0x0000_0000_0001_0000n, // Melewati halaman NULL 64KB
    userSpaceEnd: 0x0000_7FFF_FFFF_FFFFn,   // Batas atas ruang pengguna kanonikal (128 TB)
    kernelSpaceStart: 0xFFFF_8000_0000_0000n, // Batas bawah ruang kernel kanonikal (128 TB)
    kernelSpaceEnd: 0xFFFF_FFFF_FFFF_FFFFn,
    directPhysicalMapStart: 0xFFFF_8000_0000_0000n,
    kernelHeapStart: 0xFFFF_9000_0000_0000n,
    kernelTextBase: 0xFFFF_FFFF_8000_0000n,  // -2GB offset untuk model kode kernel
  };

  /**
   * Konfigurasi Stack x86_64
   * Kernel NUSANTARA secara tegas mematikan Red Zone (-mno-red-zone)
   * dan mewajibkan perataan stack 16-byte sebelum pemanggilan fungsi (CALL).
   */
  public static readonly STACK_ALIGNMENT_BYTES: number = 16;
  public static readonly KERNEL_STACK_SIZE_BYTES: number = 16384; // 16 KB

  /**
   * Konvensi Register Pemanggilan Fungsi (System V AMD64 ABI):
   * Argumen: RDI, RSI, RDX, RCX, R8, R9
   * Nilai Kembalian: RAX (dan RDX jika 128-bit)
   */
  public static readonly FUNCTION_ARG_REGISTERS: ReadonlyArray<keyof RegisterContext> = [
    'rdi', 'rsi', 'rdx', 'rcx', 'r8', 'r9'
  ];

  /**
   * Konvensi Register System Call (Nusantara / SysV AMD64 Syscall ABI):
   * Syscall Number : RAX
   * Argumen 1..6   : RDI, RSI, RDX, R10, R8, R9 (Perhatikan R10 menggantikan RCX karena instruksi SYSCALL menimpa RCX dengan RIP)
   * Nilai Kembalian: RAX (negatif menandakan kode galat -E)
   */
  public static readonly SYSCALL_ARG_REGISTERS: ReadonlyArray<keyof RegisterContext> = [
    'rdi', 'rsi', 'rdx', 'r10', 'r8', 'r9'
  ];

  public static readonly CALLEE_SAVED_REGISTERS: ReadonlyArray<keyof RegisterContext> = [
    'rbx', 'rsp', 'rbp', 'r12', 'r13', 'r14', 'r15'
  ];

  public static readonly CALLER_SAVED_REGISTERS: ReadonlyArray<keyof RegisterContext> = [
    'rax', 'rcx', 'rdx', 'rsi', 'rdi', 'r8', 'r9', 'r10', 'r11'
  ];

  /**
   * Pembuatan RegisterContext kosong / awal
   */
  public static createDefaultRegisters(): RegisterContext {
    return {
      rax: 0n, rbx: 0n, rcx: 0n, rdx: 0n,
      rsi: 0n, rdi: 0n, rbp: 0n, rsp: 0n,
      r8: 0n,  r9: 0n,  r10: 0n, r11: 0n,
      r12: 0n, r13: 0n, r14: 0n, r15: 0n,
      rip: 0n, rflags: 0x202n, // IF (Interrupt Flag) aktif default
      cs: 0x08, // Kernel code segment selector (GDT)
      ss: 0x10, // Kernel data segment selector (GDT)
    };
  }

  /**
   * Validasi apakah alamat memori pointer pengguna valid dan tidak menyentuh ruang memori kernel.
   * Mencegah eksploitasi privilege escalation di mana user meminta kernel membaca/menulis memori kernel.
   */
  public static isUserPointerValid(pointer: bigint, length: number): boolean {
    if (pointer < this.MEMORY_LAYOUT.userSpaceStart) {
      return false; // Null pointer atau halaman 0
    }
    const end = pointer + BigInt(length);
    if (end > this.MEMORY_LAYOUT.userSpaceEnd || end < pointer) {
      return false; // Melebihi ruang pengguna atau overflow
    }
    return true;
  }

  /**
   * Validasi perataan alamat memori (alignment)
   */
  public static isAligned(address: bigint, alignment: number): boolean {
    if (alignment <= 0 || (alignment & (alignment - 1)) !== 0) {
      throw new Error(`Alignment harus kelipatan dua positif, diterima: ${alignment}`);
    }
    return (address & BigInt(alignment - 1)) === 0n;
  }

  /**
   * Perataan ke atas (align up)
   */
  public static alignUp(address: bigint, alignment: number): bigint {
    const alignBig = BigInt(alignment);
    const mask = alignBig - 1n;
    return (address + mask) & ~mask;
  }

  /**
   * Perataan ke bawah (align down)
   */
  public static alignDown(address: bigint, alignment: number): bigint {
    const mask = BigInt(alignment - 1);
    return address & ~mask;
  }

  public static isKernelPointer(pointer: bigint): boolean {
    return pointer >= this.MEMORY_LAYOUT.kernelSpaceStart;
  }

  /**
   * Konvensi Penamaan Simbol Kernel NUSANTARA
   */
  public static mangleKernelSymbol(moduleOrName: string, name?: string): string {
    return name ? `_NK_${moduleOrName}_${name}` : `_NK_${moduleOrName}`;
  }

  public static isKernelSymbol(symbolName: string): boolean {
    return symbolName.startsWith('_NK_');
  }
}
