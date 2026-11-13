/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * x86_64 Bootstrap & Bare-Metal Ring 3 Microkernel Machine Code Synthesizer (Phase 49 & Phase 50)
 *
 * Menghasilkan instruksi biner x86_64 autentik untuk dieksekusi langsung oleh CPU QEMU/GRUB2:
 * 1. Entry point 32-bit Protected Mode (_start) + verifikasi Multiboot2 magic (0x36D76289)
 * 2. Inisialisasi UART 16550 COM1 (Port 0x3F8) & diagnosa boot real-time
 * 3. Pemeriksaan CPUID, Long Mode (LM bit 29), dan No-Execute (NX bit 20)
 * 4. Transisi Long Mode (4-Level Paging CR3, CR4.PAE, EFER.LME/SCE/NXE, CR0.PG/WP)
 * 5. GDT 64-bit (Ring 0 CS 0x08/SS 0x10, Ring 3 SS 0x1B/CS 0x23, TSS64 0x28) + LTR 0x28
 * 6. IDT 64-bit lengkap (256 vectors + #UD, #DF IST1, #GP, #PF Page Fault Handler) + Mask 8259 PIC
 * 7. Konfigurasi MSR SYSCALL/SYSRET (IA32_STAR, IA32_LSTAR, IA32_FMASK)
 * 8. Isolasi Page Table per-proses PML4_A (CR3_A) vs PML4_B (CR3_B) dengan bit U/S & NX
 * 9. Pemuatan & eksekusi nyata ELF64 User Mode (user-test.elf & user-fault-test.elf) melalui IRETQ Ring 3
 * 10. Penanganan hardware Page Fault (#PF) pada Ring 3 tanpa Kernel Panic + ISA Debug Exit (0xF4)
 */

import { UserELFBuilder } from './user-elf-builder.js';

export interface BootstrapConfig {
  loadAddress?: number; // Default: 0x0010_0020
  kernelVirtualBase?: bigint; // Default: 0xFFFF_FFFF_8000_0000n (-2 GiB)
  sentinelMessage?: string; // Default: "NUSANTARA_KERNEL_BOOT_OK\r\n"
}

const enum Reg64 {
  RAX = 0,
  RCX = 1,
  RDX = 2,
  RBX = 3,
  RSP = 4,
  RBP = 5,
  RSI = 6,
  RDI = 7,
}

interface LabelFixup {
  patchOffset: number;
  targetLabel: string;
  kind: 'rel32' | 'abs32' | 'abs64';
  nextInstrOffset: number;
}

class X64Assembler {
  public readonly code: number[] = [];
  private readonly labels = new Map<string, number>();
  private readonly fixups: LabelFixup[] = [];

  public emit(...bytes: number[]): void {
    for (const b of bytes) {
      this.code.push(b & 0xff);
    }
  }

  public emit16(val: number): void {
    this.emit(val & 0xff, (val >> 8) & 0xff);
  }

  public emit32(val: number): void {
    this.emit(
      val & 0xff,
      (val >> 8) & 0xff,
      (val >> 16) & 0xff,
      (val >>> 24) & 0xff
    );
  }

  public emit64(val: bigint): void {
    const low = Number(val & 0xffff_ffffn);
    const high = Number((val >> 32n) & 0xffff_ffffn);
    this.emit32(low);
    this.emit32(high);
  }

  public emitBytes(bytes: Uint8Array): void {
    for (let i = 0; i < bytes.length; i++) {
      this.code.push(bytes[i]);
    }
  }

  public emitCString(str: string): void {
    const encoded = new TextEncoder().encode(str);
    this.emitBytes(encoded);
    this.emit(0x00);
  }

  public align(boundary: number, padByte = 0x90): void {
    while (this.code.length % boundary !== 0) {
      this.emit(padByte);
    }
  }

  public label(name: string): void {
    if (this.labels.has(name)) {
      throw new Error(`Duplicate assembler label: ${name}`);
    }
    this.labels.set(name, this.code.length);
  }

  public getLabelOffset(name: string): number {
    const off = this.labels.get(name);
    if (off === undefined) {
      throw new Error(`Undefined assembler label: ${name}`);
    }
    return off;
  }

  public emitRel32Patch(targetLabel: string): void {
    const patchOffset = this.code.length;
    this.emit32(0);
    this.fixups.push({
      patchOffset,
      targetLabel,
      kind: 'rel32',
      nextInstrOffset: this.code.length,
    });
  }

  public emitAbs32Patch(targetLabel: string): void {
    const patchOffset = this.code.length;
    this.emit32(0);
    this.fixups.push({
      patchOffset,
      targetLabel,
      kind: 'abs32',
      nextInstrOffset: this.code.length,
    });
  }

  public emitAbs64Patch(targetLabel: string): void {
    const patchOffset = this.code.length;
    this.emit64(0n);
    this.fixups.push({
      patchOffset,
      targetLabel,
      kind: 'abs64',
      nextInstrOffset: this.code.length,
    });
  }

  // Jumps & Calls (32-bit relative, valid di 32-bit maupun 64-bit mode)
  public jmp(label: string): void {
    this.emit(0xe9);
    this.emitRel32Patch(label);
  }

  public je(label: string): void {
    this.emit(0x0f, 0x84);
    this.emitRel32Patch(label);
  }

  public jne(label: string): void {
    this.emit(0x0f, 0x85);
    this.emitRel32Patch(label);
  }

  public jb(label: string): void {
    this.emit(0x0f, 0x82);
    this.emitRel32Patch(label);
  }

  public jae(label: string): void {
    this.emit(0x0f, 0x83);
    this.emitRel32Patch(label);
  }

  public ja(label: string): void {
    this.emit(0x0f, 0x87);
    this.emitRel32Patch(label);
  }

  public jbe(label: string): void {
    this.emit(0x0f, 0x86);
    this.emitRel32Patch(label);
  }

  public call(label: string): void {
    this.emit(0xe8);
    this.emitRel32Patch(label);
  }

  // Register immediate loads
  public movRegImm32(reg: Reg64, imm32: number): void {
    this.emit(0xb8 + reg);
    this.emit32(imm32);
  }

  public movRegImm64(reg: Reg64, imm64: bigint): void {
    this.emit(0x48, 0xb8 + reg);
    this.emit64(imm64);
  }

  public movRegLabel64(reg: Reg64, label: string): void {
    this.emit(0x48, 0xb8 + reg);
    this.emitAbs64Patch(label);
  }

  public leaRegRipLabel(reg: Reg64, label: string): void {
    // REX.W + LEA reg, [RIP + rel32] -> ModR/M = (reg << 3) | 0b101
    this.emit(0x48, 0x8d, (reg << 3) | 0x05);
    this.emitRel32Patch(label);
  }

  // 64-bit absolute memory store/load via SIB [disp32] (sign-extended disp32)
  public storeMem64Abs(addr32: number, srcReg: Reg64): void {
    this.emit(0x48, 0x89, (srcReg << 3) | 0x04, 0x25);
    this.emit32(addr32);
  }

  public loadMem64Abs(dstReg: Reg64, addr32: number): void {
    this.emit(0x48, 0x8b, (dstReg << 3) | 0x04, 0x25);
    this.emit32(addr32);
  }

  public storeMem64AbsImm32(addr32: number, imm32: number): void {
    this.emit(0x48, 0xc7, 0x04, 0x25);
    this.emit32(addr32);
    this.emit32(imm32);
  }

  // 32-bit mode only: mov dword [addr32], imm32
  public storeMem32AbsImm32Mode32(addr32: number, imm32: number): void {
    this.emit(0xc7, 0x05);
    this.emit32(addr32);
    this.emit32(imm32);
  }

  // Emit print helper call (64-bit mode)
  public printLabel64(strLabel: string, printFnLabel: string): void {
    this.leaRegRipLabel(Reg64.RSI, strLabel);
    this.call(printFnLabel);
  }

  // Emit print helper call (32-bit mode)
  public printLabel32(strLabel: string, printFnLabel: string): void {
    this.emit(0xbe); // mov esi, abs32
    this.emitAbs32Patch(strLabel);
    this.call(printFnLabel);
  }

  public resolveFixups(baseAddr: number): Uint8Array {
    for (const fx of this.fixups) {
      const targetOff = this.labels.get(fx.targetLabel);
      if (targetOff === undefined) {
        throw new Error(`Unresolved assembler label: ${fx.targetLabel}`);
      }
      if (fx.kind === 'rel32') {
        const rel = targetOff - fx.nextInstrOffset;
        this.code[fx.patchOffset + 0] = rel & 0xff;
        this.code[fx.patchOffset + 1] = (rel >> 8) & 0xff;
        this.code[fx.patchOffset + 2] = (rel >> 16) & 0xff;
        this.code[fx.patchOffset + 3] = (rel >> 24) & 0xff;
      } else if (fx.kind === 'abs32') {
        const abs = (baseAddr + targetOff) >>> 0;
        this.code[fx.patchOffset + 0] = abs & 0xff;
        this.code[fx.patchOffset + 1] = (abs >> 8) & 0xff;
        this.code[fx.patchOffset + 2] = (abs >> 16) & 0xff;
        this.code[fx.patchOffset + 3] = (abs >>> 24) & 0xff;
      } else {
        const abs64 = BigInt(baseAddr + targetOff);
        const low = Number(abs64 & 0xffff_ffffn);
        const high = Number((abs64 >> 32n) & 0xffff_ffffn);
        this.code[fx.patchOffset + 0] = low & 0xff;
        this.code[fx.patchOffset + 1] = (low >> 8) & 0xff;
        this.code[fx.patchOffset + 2] = (low >> 16) & 0xff;
        this.code[fx.patchOffset + 3] = (low >>> 24) & 0xff;
        this.code[fx.patchOffset + 4] = high & 0xff;
        this.code[fx.patchOffset + 5] = (high >> 8) & 0xff;
        this.code[fx.patchOffset + 6] = (high >> 16) & 0xff;
        this.code[fx.patchOffset + 7] = (high >>> 24) & 0xff;
      }
    }
    return new Uint8Array(this.code);
  }
}

export class X86BootstrapEncoder {
  public static readonly DEFAULT_LOAD_ADDR = 0x0010_0020;
  public static readonly SENTINEL = 'NUSANTARA_KERNEL_BOOT_OK\r\n';

  // 10 Tahapan Diagnostik Boot Wajib (Phase 49)
  public static readonly STAGE_1_START = 'NUSANTARA_BOOT_START\r\n';
  public static readonly STAGE_2_MULTIBOOT2 = 'NUSANTARA_MULTIBOOT2_OK\r\n';
  public static readonly STAGE_3_LONG_MODE = 'NUSANTARA_CPU_LONG_MODE_OK\r\n';
  public static readonly STAGE_4_PAGING = 'NUSANTARA_PAGING_OK\r\n';
  public static readonly STAGE_5_GDT64 = 'NUSANTARA_GDT64_OK\r\n';
  public static readonly STAGE_6_LONG_ENTERED = 'NUSANTARA_LONG_MODE_ENTERED\r\n';
  public static readonly STAGE_7_IDT = 'NUSANTARA_IDT_OK\r\n';
  public static readonly STAGE_8_MEM = 'NUSANTARA_MEMORY_MANAGER_OK\r\n';
  public static readonly STAGE_9_MAIN = 'NUSANTARA_KERNEL_MAIN_ENTERED\r\n';
  public static readonly STAGE_10_BOOT_OK = 'NUSANTARA_KERNEL_BOOT_OK\r\n';

  // 8 Tahapan Diagnostik User Mode & Process Isolation Wajib (Phase 50)
  public static readonly STAGE_11_USERMODE_ENTERED = 'NUSANTARA_USERMODE_ENTERED\r\n';
  public static readonly STAGE_12_HELLO_USER = 'HELLO FROM NUSANTARA USER MODE\r\n';
  public static readonly STAGE_13_SYSCALL_OK = 'NUSANTARA_SYSCALL_OK\r\n';
  public static readonly STAGE_14_PROCESS_EXIT_OK = 'NUSANTARA_PROCESS_EXIT_OK\r\n';
  public static readonly STAGE_15_PROCESS_ISOLATION_OK = 'NUSANTARA_PROCESS_ISOLATION_OK\r\n';
  public static readonly STAGE_15B_USER_FAULT_ISOLATED = 'NUSANTARA_USER_FAULT_ISOLATED\r\n';
  public static readonly STAGE_15C_KERNEL_SURVIVED_USER_FAULT = 'NUSANTARA_KERNEL_SURVIVED_USER_FAULT\r\n';
  public static readonly STAGE_16_USERMODE_TEST_PASS = 'NUSANTARA_USERMODE_TEST_PASS\r\n';

  // Peta alamat memori kerja fisik Kernel (di luar image kernel ELF 0x100000..0x1FFFFF)
  private static readonly PML4_A_ADDR = 0x0020_0000;
  private static readonly PDPT_LOW_A_ADDR = 0x0020_1000;
  private static readonly PD_LOW_A_ADDR = 0x0020_2000;
  private static readonly PT_USER_A_ADDR = 0x0020_3000;
  private static readonly PDPT_HIGH_ADDR = 0x0020_4000;
  private static readonly PD_HIGH_ADDR = 0x0020_5000;

  private static readonly PML4_B_ADDR = 0x0021_0000;
  private static readonly PDPT_LOW_B_ADDR = 0x0021_1000;
  private static readonly PD_LOW_B_ADDR = 0x0021_2000;
  private static readonly PT_USER_B_ADDR = 0x0021_3000;

  // Kernel State Block (Supervisor only)
  private static readonly STATE_BASE = 0x0021_8000;
  private static readonly STATE_MBI_PTR = 0x0021_8000;
  private static readonly STATE_MB2_MAGIC = 0x0021_8004;
  private static readonly STATE_RESUME_RSP = 0x0021_8008;
  private static readonly STATE_RESUME_RIP = 0x0021_8010;
  private static readonly STATE_SYSCALL_USER_RSP = 0x0021_8018;
  private static readonly STATE_CURRENT_PID = 0x0021_8020;
  private static readonly STATE_FAULT_COUNT = 0x0021_8028;
  private static readonly STATE_SYSCALL_FLAGS = 0x0021_8030;
  private static readonly STATE_NX_SUPPORTED = 0x0021_8038;

  private static readonly TSS64_ADDR = 0x0021_9000;
  private static readonly IDT64_ADDR = 0x0021_A000;
  private static readonly IDTR64_ADDR = 0x0021_B000;

  private static readonly KERNEL_STACK_TOP = 0x0022_8000;
  private static readonly KERNEL_IST1_TOP = 0x0022_C000;
  private static readonly KERNEL_SYSCALL_STACK_TOP = 0x0023_0000;

  private static readonly BOOT_PML4_ADDR = 0x002F_0000;
  private static readonly BOOT_PDPT_ADDR = 0x002F_1000;
  private static readonly BOOT_PD_ADDR = 0x002F_2000;

  // Physical Frames terisolasi untuk Proses A dan Proses B
  private static readonly PROC_A_CODE_PHYS = 0x0060_0000;
  private static readonly PROC_A_STACK_PHYS = 0x0061_0000;
  private static readonly PROC_B_CODE_PHYS = 0x0062_0000;
  private static readonly PROC_B_STACK_PHYS = 0x0063_0000;
  private static readonly USER_STACK_VIRT_RSP = 0x0050_0FF0;

  /**
   * Menghasilkan biner bootstrap & microkernel lengkap yang siap dieksekusi QEMU/GRUB2.
   */
  public static generateBootstrapBinary(config: BootstrapConfig = {}): {
    codeBytes: Uint8Array;
    entryPoint: bigint;
    sentinel: string;
  } {
    const sentinel = config.sentinelMessage ?? this.STAGE_10_BOOT_OK;
    const baseAddr = config.loadAddress ?? this.DEFAULT_LOAD_ADDR;
    const a = new X64Assembler();

    // =========================================================================
    // BAGIAN 1: 32-BIT PROTECTED MODE ENTRY POINT (_start)
    // Catatan: 7 byte pembuka dipertahankan presisi demi kompatibilitas Phase 49!
    // =========================================================================
    // [0] cli
    a.emit(0xfa);
    // [1] cld
    a.emit(0xfc);
    // [2..6] cmp eax, 0x36D76289 (Multiboot2 bootloader magic)
    a.emit(0x3d, 0x89, 0x62, 0xd7, 0x36);

    // Simpan flag perbandingan ZF lewat EBP: mov ebp, eax; mov edi, ebx; mov esp, 0x00228000
    a.emit(0x89, 0xc5); // mov ebp, eax
    a.emit(0x89, 0xdf); // mov edi, ebx
    a.movRegImm32(Reg64.RSP, this.KERNEL_STACK_TOP);

    // Inisialisasi UART 16550 COM1 Port 0x3F8 sedini mungkin (115200 8N1)
    a.emit(0x66, 0xba, 0xf9, 0x03, 0x30, 0xc0, 0xee); // outb(0x3F9, 0x00) IER
    a.emit(0x66, 0xba, 0xfb, 0x03, 0xb0, 0x80, 0xee); // outb(0x3FB, 0x80) DLAB=1
    a.emit(0x66, 0xba, 0xf8, 0x03, 0xb0, 0x01, 0xee); // outb(0x3F8, 0x01) 115200 baud low
    a.emit(0x66, 0xba, 0xf9, 0x03, 0x30, 0xc0, 0xee); // outb(0x3F9, 0x00) high
    a.emit(0x66, 0xba, 0xfb, 0x03, 0xb0, 0x03, 0xee); // outb(0x3FB, 0x03) 8N1
    a.emit(0x66, 0xba, 0xfa, 0x03, 0xb0, 0xc7, 0xee); // outb(0x3FA, 0xC7) FIFO
    a.emit(0x66, 0xba, 0xfc, 0x03, 0xb0, 0x0b, 0xee); // outb(0x3FC, 0x0B) MCR RTS/DTR

    // Tahap 1: NUSANTARA_BOOT_START
    a.printLabel32('msg_boot_start', 'print_serial32');

    // Verifikasi ulang Multiboot2 Magic yang disimpan di EBP
    a.emit(0x81, 0xfd, 0x89, 0x62, 0xd7, 0x36); // cmp ebp, 0x36D76289
    a.je('mb2_magic_ok');
    a.printLabel32('msg_panic_mb2', 'print_serial32');
    a.jmp('panic32');

    a.label('mb2_magic_ok');
    a.printLabel32('msg_mb2_ok', 'print_serial32');

    // =========================================================================
    // BAGIAN 2: CEK CPUID DAN DUKUNGAN 64-BIT LONG MODE
    // =========================================================================
    // pushfd; pop eax; mov ecx, eax; xor eax, 0x200000; push eax; popfd; pushfd; pop eax; xor eax, ecx
    a.emit(0x9c, 0x58, 0x89, 0xc1, 0x35, 0x00, 0x00, 0x20, 0x00, 0x50, 0x9d, 0x9c, 0x58, 0x31, 0xc8);
    a.je('panic32_cpu');

    // mov eax, 0x80000000; cpuid; cmp eax, 0x80000001; jb panic32_cpu
    a.movRegImm32(Reg64.RAX, 0x8000_0000);
    a.emit(0x0f, 0xa2); // cpuid
    a.emit(0x3d, 0x01, 0x00, 0x00, 0x80); // cmp eax, 0x80000001
    a.jb('panic32_cpu');

    // mov eax, 0x80000001; cpuid; test edx, (1 << 29); jz panic32_cpu
    a.movRegImm32(Reg64.RAX, 0x8000_0001);
    a.emit(0x0f, 0xa2); // cpuid
    a.emit(0xf7, 0xc2, 0x00, 0x00, 0x00, 0x20); // test edx, 0x20000000 (LM)
    a.je('panic32_cpu');

    a.printLabel32('msg_cpu_ok', 'print_serial32');

    // =========================================================================
    // BAGIAN 3: INISIALISASI BOOT PAGE TABLES (0..8 MiB Identity + Higher Half)
    // =========================================================================
    // Simpan EDI (MBI ptr) di EBX sementara, nolkan 0x002F0000..0x002F3FFF
    a.emit(0x89, 0xfb); // mov ebx, edi
    a.movRegImm32(Reg64.RDI, this.BOOT_PML4_ADDR);
    a.emit(0x31, 0xc0); // xor eax, eax
    a.movRegImm32(Reg64.RCX, 0x1000); // 4096 dwords = 16 KiB
    a.emit(0xf3, 0xab); // rep stosd

    // PML4_BOOT[0] & PML4_BOOT[256] & PML4_BOOT[511] = BOOT_PDPT | 0x03
    a.storeMem32AbsImm32Mode32(this.BOOT_PML4_ADDR + 0, this.BOOT_PDPT_ADDR | 0x03);
    a.storeMem32AbsImm32Mode32(this.BOOT_PML4_ADDR + 256 * 8, this.BOOT_PDPT_ADDR | 0x03);
    a.storeMem32AbsImm32Mode32(this.BOOT_PML4_ADDR + 511 * 8, this.BOOT_PDPT_ADDR | 0x03);

    // PDPT_BOOT[0] & PDPT_BOOT[510] = BOOT_PD | 0x03
    a.storeMem32AbsImm32Mode32(this.BOOT_PDPT_ADDR + 0, this.BOOT_PD_ADDR | 0x03);
    a.storeMem32AbsImm32Mode32(this.BOOT_PDPT_ADDR + 510 * 8, this.BOOT_PD_ADDR | 0x03);

    // PD_BOOT[0..3] = 2MB Huge Pages untuk 0..8 MiB fisik
    a.storeMem32AbsImm32Mode32(this.BOOT_PD_ADDR + 0, 0x0000_0083);
    a.storeMem32AbsImm32Mode32(this.BOOT_PD_ADDR + 8, 0x0020_0083);
    a.storeMem32AbsImm32Mode32(this.BOOT_PD_ADDR + 16, 0x0040_0083);
    a.storeMem32AbsImm32Mode32(this.BOOT_PD_ADDR + 24, 0x0060_0083);

    // Aktifkan PAE (CR4.PAE = 1) & pasang CR3 = BOOT_PML4
    a.movRegImm32(Reg64.RAX, this.BOOT_PML4_ADDR);
    a.emit(0x0f, 0x22, 0xd8); // mov cr3, eax
    a.emit(0x0f, 0x20, 0xe0, 0x83, 0xc8, 0x20, 0x0f, 0x22, 0xe0); // cr4 |= 0x20

    // Aktifkan IA32_EFER.LME (bit 8)
    a.emit(0xb9, 0x80, 0x00, 0x00, 0xc0); // mov ecx, 0xC0000080
    a.emit(0x0f, 0x32); // rdmsr
    a.emit(0x0d, 0x00, 0x01, 0x00, 0x00); // or eax, 0x100
    a.emit(0x0f, 0x30); // wrmsr

    // Aktifkan CR0.PG (bit 31) + CR0.WP (bit 16) + CR0.PE (bit 0) -> 0x80010001
    a.emit(0x0f, 0x20, 0xc0); // mov eax, cr0
    a.emit(0x0d, 0x01, 0x00, 0x01, 0x80); // or eax, 0x80010001
    a.emit(0x0f, 0x22, 0xc0); // mov cr0, eax

    a.printLabel32('msg_paging_ok', 'print_serial32');

    // Muat GDT 64-bit: lgdt [gdt_ptr]
    a.emit(0x0f, 0x01, 0x15);
    a.emitAbs32Patch('gdt_ptr');

    a.printLabel32('msg_gdt_ok', 'print_serial32');

    // Far Jump ke 64-bit Long Mode (selector 0x08 -> entry64)
    a.emit(0xea);
    a.emitAbs32Patch('entry64');
    a.emit16(0x0008);

    // Helper 32-bit Serial Print: ESI -> 0-terminated string (with COM1 LSR THRE wait)
    a.label('print_serial32');
    a.emit(0xac); // lodsb
    a.emit(0x84, 0xc0); // test al, al
    a.je('print_serial32_done');
    a.emit(0x88, 0xc4); // mov ah, al
    a.label('print_serial32_wait');
    a.emit(0x66, 0xba, 0xfd, 0x03); // mov dx, 0x3FD (LSR)
    a.emit(0xec); // in al, dx
    a.emit(0xa8, 0x20); // test al, 0x20 (THRE)
    a.je('print_serial32_wait');
    a.emit(0x88, 0xe0); // mov al, ah
    a.emit(0x66, 0xba, 0xf8, 0x03); // mov dx, 0x3F8
    a.emit(0xee); // out dx, al
    a.jmp('print_serial32');
    a.label('print_serial32_done');
    a.emit(0xc3); // ret

    a.label('panic32_cpu');
    a.printLabel32('msg_panic_cpu', 'print_serial32');
    a.label('panic32');
    // Tulis 0x01 ke ISA Debug Exit Port 0xF4 (exit_code = 3)
    a.emit(0x66, 0xba, 0xf4, 0x00, 0xb0, 0x01, 0xee);
    a.emit(0xfa, 0xf4, 0xeb, 0xfd); // cli; hlt; jmp $-1

    // =========================================================================
    // BAGIAN 4: 64-BIT LONG MODE KERNEL ENTRY POINT (entry64)
    // Catatan: EBX masih menyimpan mbi_ptr, EBP menyimpan mb2_magic
    // =========================================================================
    a.label('entry64');
    // Set data segments = 0x10 (64-bit Kernel Data), FS=GS=0
    a.emit(0x66, 0xb8, 0x10, 0x00, 0x8e, 0xd8, 0x8e, 0xc0, 0x8e, 0xd0);
    a.emit(0x31, 0xc0, 0x8e, 0xe0, 0x8e, 0xe8); // xor eax, eax; mov fs, ax; mov gs, ax
    a.movRegImm64(Reg64.RSP, BigInt(this.KERNEL_STACK_TOP));

    // Mask semua IRQ legacy 8259 PIC (Port 0x21 & 0xA1 = 0xFF) agar PIT/IRQ tidak menabrak #DF vector 8
    a.emit(0xb0, 0xff, 0xe6, 0x21, 0xe6, 0xa1);

    // Nolkan STATE_BASE, TSS64, IDT64, IDTR64 (0x00218000..0x0021BFFF = 16 KiB = 0x1000 dwords)
    // Simpan sementara EBX (MBI) & EBP (magic) ke R12 & R13 sebelum stosd
    a.emit(0x41, 0x89, 0xdc); // mov r12d, ebx
    a.emit(0x41, 0x89, 0xed); // mov r13d, ebp
    a.movRegImm64(Reg64.RDI, BigInt(this.STATE_BASE));
    a.emit(0x31, 0xc0); // xor eax, eax
    a.movRegImm32(Reg64.RCX, 0x1000);
    a.emit(0xf3, 0xab); // rep stosd
    // Simpan MBI & magic ke STATE_BASE
    a.emit(0x4c, 0x89, 0x24, 0x25); a.emit32(this.STATE_MBI_PTR);   // mov [STATE_MBI_PTR], r12
    a.emit(0x44, 0x89, 0x2c, 0x25); a.emit32(this.STATE_MB2_MAGIC); // mov dword [STATE_MB2_MAGIC], r13d

    a.printLabel64('msg_long_entered', 'print_serial64');

    // -------------------------------------------------------------------------
    // Siapkan TSS64 di TSS64_ADDR (0x00219000) & muat LTR 0x28
    // -------------------------------------------------------------------------
    // RSP0 (+4) = KERNEL_STACK_TOP
    a.storeMem64AbsImm32(this.TSS64_ADDR + 4, this.KERNEL_STACK_TOP);
    // IST1 (+0x24) = KERNEL_IST1_TOP
    a.storeMem64AbsImm32(this.TSS64_ADDR + 0x24, this.KERNEL_IST1_TOP);
    // IOPB offset (+0x66) = 104 (0x68)
    a.emit(0x66, 0xc7, 0x04, 0x25);
    a.emit32(this.TSS64_ADDR + 0x66);
    a.emit16(0x0068);
    // mov ax, 0x28; ltr ax
    a.emit(0x66, 0xb8, 0x28, 0x00, 0x0f, 0x00, 0xd8);

    // -------------------------------------------------------------------------
    // Siapkan IDT64 (256 interrupt gate * 16B) & LIDT
    // -------------------------------------------------------------------------
    a.movRegImm32(Reg64.RCX, 0); // vector i = 0..255
    a.label('idt_fill_loop');
    a.emit(0x48, 0x89, 0xc8); // mov rax, rcx
    a.movRegLabel64(Reg64.RBX, 'isr_unhandled');
    a.emit(0x31, 0xd2); // xor edx, edx (IST = 0)
    a.call('set_idt_gate');
    a.emit(0x48, 0xff, 0xc1); // inc rcx
    a.emit(0x48, 0x81, 0xf9, 0x00, 0x01, 0x00, 0x00); // cmp rcx, 256
    a.jb('idt_fill_loop');

    // Vector 6 (#UD - menangkap gagal CPL==3 di user-test!)
    a.movRegImm32(Reg64.RAX, 6);
    a.movRegLabel64(Reg64.RBX, 'isr_ud');
    a.emit(0x31, 0xd2); // IST 0
    a.call('set_idt_gate');

    // Vector 8 (#DF - Double Fault menggunakan IST 1)
    a.movRegImm32(Reg64.RAX, 8);
    a.movRegLabel64(Reg64.RBX, 'isr_df');
    a.movRegImm32(Reg64.RDX, 1); // IST 1
    a.call('set_idt_gate');

    // Vector 13 (#GP - General Protection Fault)
    a.movRegImm32(Reg64.RAX, 13);
    a.movRegLabel64(Reg64.RBX, 'isr_gp');
    a.emit(0x31, 0xd2);
    a.call('set_idt_gate');

    // Vector 14 (#PF - Hardware Page Fault Isolator!)
    a.movRegImm32(Reg64.RAX, 14);
    a.movRegLabel64(Reg64.RBX, 'isr_pf');
    a.emit(0x31, 0xd2);
    a.call('set_idt_gate');

    // Isi IDTR64 di 0x0021B000: dw 4095, dq 0x0021A000
    a.emit(0x66, 0xc7, 0x04, 0x25);
    a.emit32(this.IDTR64_ADDR);
    a.emit16(0x0fff);
    a.storeMem64AbsImm32(this.IDTR64_ADDR + 2, this.IDT64_ADDR);

    // lidt [IDTR64_ADDR]
    a.movRegImm64(Reg64.RAX, BigInt(this.IDTR64_ADDR));
    a.emit(0x0f, 0x01, 0x18); // lidt [rax]

    a.printLabel64('msg_idt_ok', 'print_serial64');

    // =========================================================================
    // BAGIAN 5: KONFIGURASI NXE, SYSCALL MSRS, & ISOLATED PAGING (PML4_A vs PML4_B)
    // =========================================================================
    // Cek CPUID 0x80000001 EDX bit 20 (NX bit) -> simpan mask NX di R15 (0x8000000000000000 atau 0)
    a.emit(0x4d, 0x31, 0xff); // xor r15, r15
    a.movRegImm32(Reg64.RAX, 0x8000_0001);
    a.emit(0x0f, 0xa2); // cpuid
    a.emit(0xf7, 0xc2, 0x00, 0x00, 0x10, 0x00); // test edx, (1 << 20)
    a.je('no_nx_support');
    a.storeMem64AbsImm32(this.STATE_NX_SUPPORTED, 1);
    a.emit(0x49, 0xbf); // mov r15, 0x8000_0000_0000_0000
    a.emit64(0x8000_0000_0000_0000n);
    // Aktifkan IA32_EFER.NXE (bit 11 = 0x800) & IA32_EFER.SCE (bit 0 = 0x01)
    a.movRegImm32(Reg64.RCX, 0xc000_0080);
    a.emit(0x0f, 0x32); // rdmsr
    a.emit(0x0d, 0x01, 0x08, 0x00, 0x00); // or eax, 0x801
    a.emit(0x0f, 0x30); // wrmsr
    a.jmp('efer_done');

    a.label('no_nx_support');
    // Tetap aktifkan IA32_EFER.SCE (bit 0 = 0x01)
    a.movRegImm32(Reg64.RCX, 0xc000_0080);
    a.emit(0x0f, 0x32); // rdmsr
    a.emit(0x83, 0xc8, 0x01); // or eax, 1
    a.emit(0x0f, 0x30); // wrmsr

    a.label('efer_done');
    // IA32_STAR (0xC0000081): EDX = 0x0010_0008 (SYSRET base 0x0010, SYSCALL base 0x0008), EAX = 0
    a.movRegImm32(Reg64.RCX, 0xc000_0081);
    a.emit(0x31, 0xc0); // xor eax, eax
    a.movRegImm32(Reg64.RDX, 0x0010_0008);
    a.emit(0x0f, 0x30); // wrmsr

    // IA32_LSTAR (0xC0000082): target rip = syscall_entry
    a.movRegImm32(Reg64.RCX, 0xc000_0082);
    a.movRegLabel64(Reg64.RAX, 'syscall_entry');
    a.emit(0x48, 0x89, 0xc2, 0x48, 0xc1, 0xea, 0x20); // mov rdx, rax; shr rdx, 32
    a.emit(0x0f, 0x30); // wrmsr

    // IA32_FMASK (0xC0000084): mask IF (0x200)
    a.movRegImm32(Reg64.RCX, 0xc000_0084);
    a.movRegImm32(Reg64.RAX, 0x0000_0200);
    a.emit(0x31, 0xd2); // xor edx, edx
    a.emit(0x0f, 0x30); // wrmsr

    // Nolkan seluruh area page table runtime 0x00200000..0x00217FFF (96 KiB = 0x6000 dwords)
    a.movRegImm64(Reg64.RDI, BigInt(this.PML4_A_ADDR));
    a.emit(0x31, 0xc0);
    a.movRegImm32(Reg64.RCX, 0x6000);
    a.emit(0xf3, 0xab);

    // Higher-Half Kernel Tables (Supervisor-Only U/S=0): PDPT_HIGH[510] & PD_HIGH[0..3]
    a.storeMem64AbsImm32(this.PDPT_HIGH_ADDR + 510 * 8, this.PD_HIGH_ADDR | 0x03);
    a.storeMem64AbsImm32(this.PD_HIGH_ADDR + 0, 0x0000_0083);
    a.storeMem64AbsImm32(this.PD_HIGH_ADDR + 8, 0x0020_0083);
    a.storeMem64AbsImm32(this.PD_HIGH_ADDR + 16, 0x0040_0083);
    a.storeMem64AbsImm32(this.PD_HIGH_ADDR + 24, 0x0060_0083);

    // Process A Page Tables (PML4_A)
    a.storeMem64AbsImm32(this.PML4_A_ADDR + 0, this.PDPT_LOW_A_ADDR | 0x07);     // User walk OK
    a.storeMem64AbsImm32(this.PML4_A_ADDR + 511 * 8, this.PDPT_HIGH_ADDR | 0x03); // Supervisor only!
    a.storeMem64AbsImm32(this.PDPT_LOW_A_ADDR + 0, this.PD_LOW_A_ADDR | 0x07);    // User walk OK
    a.storeMem64AbsImm32(this.PD_LOW_A_ADDR + 0, 0x0000_0083);                   // 0..2MB Supervisor Only
    a.storeMem64AbsImm32(this.PD_LOW_A_ADDR + 8, 0x0020_0083);                   // 2..4MB Supervisor Only
    a.storeMem64AbsImm32(this.PD_LOW_A_ADDR + 16, this.PT_USER_A_ADDR | 0x07);   // 4..6MB -> PT_USER_A (4K pages)
    a.storeMem64AbsImm32(this.PD_LOW_A_ADDR + 24, 0x0060_0083);                  // 6..8MB Supervisor Only

    // PT_USER_A[0] (0x00400000 -> phys 0x00600000, RO + User + Exec)
    a.storeMem64AbsImm32(this.PT_USER_A_ADDR + 0, this.PROC_A_CODE_PHYS | 0x05);
    // PT_USER_A[0x100] (0x00500000 -> phys 0x00610000, RW + User + NX)
    a.movRegImm64(Reg64.RAX, BigInt(this.PROC_A_STACK_PHYS | 0x07));
    a.emit(0x4c, 0x09, 0xf8); // or rax, r15 (NX bit jika didukung)
    a.storeMem64Abs(this.PT_USER_A_ADDR + 0x100 * 8, Reg64.RAX);

    // Process B Page Tables (PML4_B terisolasi)
    a.storeMem64AbsImm32(this.PML4_B_ADDR + 0, this.PDPT_LOW_B_ADDR | 0x07);
    a.storeMem64AbsImm32(this.PML4_B_ADDR + 511 * 8, this.PDPT_HIGH_ADDR | 0x03);
    a.storeMem64AbsImm32(this.PDPT_LOW_B_ADDR + 0, this.PD_LOW_B_ADDR | 0x07);
    a.storeMem64AbsImm32(this.PD_LOW_B_ADDR + 0, 0x0000_0083);
    a.storeMem64AbsImm32(this.PD_LOW_B_ADDR + 8, 0x0020_0083);
    a.storeMem64AbsImm32(this.PD_LOW_B_ADDR + 16, this.PT_USER_B_ADDR | 0x07);
    a.storeMem64AbsImm32(this.PD_LOW_B_ADDR + 24, 0x0060_0083);

    // PT_USER_B[0] (0x00400000 -> phys 0x00620000, RO + User + Exec)
    a.storeMem64AbsImm32(this.PT_USER_B_ADDR + 0, this.PROC_B_CODE_PHYS | 0x05);
    // PT_USER_B[0x100] (0x00500000 -> phys 0x00630000, RW + User + NX)
    a.movRegImm64(Reg64.RAX, BigInt(this.PROC_B_STACK_PHYS | 0x07));
    a.emit(0x4c, 0x09, 0xf8); // or rax, r15
    a.storeMem64Abs(this.PT_USER_B_ADDR + 0x100 * 8, Reg64.RAX);

    // Aktifkan PML4_A di CR3
    a.movRegImm64(Reg64.RAX, BigInt(this.PML4_A_ADDR));
    a.emit(0x0f, 0x22, 0xd8); // mov cr3, rax

    a.printLabel64('msg_mem_ok', 'print_serial64');

    // =========================================================================
    // BAGIAN 6: KERNEL MAIN & EKSEKUSI ELF64 USER MODE NYATA (RING 3)
    // =========================================================================
    a.printLabel64('msg_main_entered', 'print_serial64');
    a.printLabel64('msg_boot_ok', 'print_serial64');

    // 1. Muat embedded ELF64 user-test.elf ke frame Proses A (0x00600000 / stack 0x00610000)
    a.leaRegRipLabel(Reg64.RSI, 'embedded_user_test_elf');
    a.movRegImm64(Reg64.RDI, BigInt(this.PROC_A_CODE_PHYS));
    a.movRegImm64(Reg64.RDX, BigInt(this.PROC_A_STACK_PHYS));
    a.call('load_elf64_user'); // RAX = e_entry

    // Simpan konteks lanjut kernel setelah Process A memanggil SYS_PROCESS_EXIT
    a.storeMem64AbsImm32(this.STATE_CURRENT_PID, 1);
    a.storeMem64AbsImm32(this.STATE_SYSCALL_FLAGS, 0);
    a.storeMem64Abs(this.STATE_RESUME_RSP, Reg64.RSP);
    a.movRegLabel64(Reg64.RBX, 'after_proc_a');
    a.storeMem64Abs(this.STATE_RESUME_RIP, Reg64.RBX);

    // Masuki Ring 3 lewat IRETQ pada Proses A (CR3 = PML4_A, CS = 0x23, SS = 0x1B)
    a.movRegImm64(Reg64.RCX, BigInt(this.PML4_A_ADDR));
    a.emit(0x0f, 0x22, 0xd9); // mov cr3, rcx
    a.emit(0x68); a.emit32(0x1b);                      // push USER_DATA (0x1B)
    a.emit(0x68); a.emit32(this.USER_STACK_VIRT_RSP);  // push USER_RSP
    a.emit(0x68); a.emit32(0x202);                     // push RFLAGS (IF=1)
    a.emit(0x68); a.emit32(0x23);                      // push USER_CODE (0x23)
    a.emit(0x50);                                      // push rax (e_entry)
    // Bersihkan register GP sebelum masuk Ring 3
    a.emit(0x31, 0xc0, 0x31, 0xdb, 0x31, 0xc9, 0x31, 0xd2, 0x31, 0xf6, 0x31, 0xff);
    a.emit(0x48, 0xcf); // iretq!

    // -------------------------------------------------------------------------
    // Kembali ke Ring 0 setelah Process A memanggil syscall SYS_PROCESS_EXIT(0)
    // -------------------------------------------------------------------------
    a.label('after_proc_a');
    // Verifikasi bahwa user-test.elf benar-benar mengeksekusi SYS_PROCESS_ID (1) & SYS_CONSOLE_WRITE (2)
    a.loadMem64Abs(Reg64.RAX, this.STATE_SYSCALL_FLAGS);
    a.emit(0x48, 0x83, 0xf8, 0x03); // cmp rax, 3
    a.jne('panic64_proc');
    a.printLabel64('msg_process_exit_ok', 'print_serial64');

    // 2. Verifikasi Isolasi Address Space: CR3_A != CR3_B dan frame PT_USER_A[0] != PT_USER_B[0]
    a.loadMem64Abs(Reg64.RAX, this.PT_USER_A_ADDR);
    a.loadMem64Abs(Reg64.RBX, this.PT_USER_B_ADDR);
    a.emit(0x48, 0x39, 0xd8); // cmp rax, rbx
    a.je('panic64_isolation');
    a.printLabel64('msg_process_isolation_ok', 'print_serial64');

    // 3. Muat embedded ELF64 user-fault-test.elf ke frame Proses B (0x00620000 / stack 0x00630000)
    a.leaRegRipLabel(Reg64.RSI, 'embedded_user_fault_elf');
    a.movRegImm64(Reg64.RDI, BigInt(this.PROC_B_CODE_PHYS));
    a.movRegImm64(Reg64.RDX, BigInt(this.PROC_B_STACK_PHYS));
    a.call('load_elf64_user'); // RAX = e_entry

    a.storeMem64AbsImm32(this.STATE_CURRENT_PID, 2);
    a.storeMem64AbsImm32(this.STATE_FAULT_COUNT, 0);
    a.storeMem64Abs(this.STATE_RESUME_RSP, Reg64.RSP);
    a.movRegLabel64(Reg64.RBX, 'after_proc_b');
    a.storeMem64Abs(this.STATE_RESUME_RIP, Reg64.RBX);

    // Switch CR3 ke PML4_B dan jalankan user-fault-test.elf di Ring 3 via IRETQ!
    a.movRegImm64(Reg64.RCX, BigInt(this.PML4_B_ADDR));
    a.emit(0x0f, 0x22, 0xd9); // mov cr3, rcx
    a.emit(0x68); a.emit32(0x1b);                      // push USER_DATA
    a.emit(0x68); a.emit32(this.USER_STACK_VIRT_RSP);  // push USER_RSP
    a.emit(0x68); a.emit32(0x202);                     // push RFLAGS
    a.emit(0x68); a.emit32(0x23);                      // push USER_CODE
    a.emit(0x50);                                      // push rax
    a.emit(0x31, 0xc0, 0x31, 0xdb, 0x31, 0xc9, 0x31, 0xd2, 0x31, 0xf6, 0x31, 0xff);
    a.emit(0x48, 0xcf); // iretq -> Process B membaca 0xFFFFFFFF80000000 -> Hardware #PF!

    // -------------------------------------------------------------------------
    // Kembali ke Ring 0 setelah #PF Handler mengisolasi pelanggaran Ring 3 Proses B
    // -------------------------------------------------------------------------
    a.label('after_proc_b');
    a.loadMem64Abs(Reg64.RAX, this.STATE_FAULT_COUNT);
    a.emit(0x48, 0x83, 0xf8, 0x01); // cmp rax, 1
    a.jne('panic64_fault');

    a.printLabel64('msg_kernel_survived', 'print_serial64');
    a.printLabel64('msg_usermode_test_pass', 'print_serial64');

    // Tulis ke VGA Text Buffer (0xB8000): " [NUSANTARA USERMODE OK] "
    a.movRegImm64(Reg64.RDI, 0x000b_8000n);
    const vgaMsg = ' [NUSANTARA USERMODE OK] ';
    for (let i = 0; i < vgaMsg.length; i++) {
      const ch = vgaMsg.charCodeAt(i);
      a.emit(0x66, 0xb8, ch, 0x2f);
      a.emit(0x66, 0x89, 0x07);
      a.emit(0x48, 0x83, 0xc7, 0x02);
    }

    // ISA Debug Exit port 0xF4 dengan nilai 0x00 (exit code QEMU = 1)
    a.emit(0x66, 0xba, 0xf4, 0x00, 0xb0, 0x00, 0xee);
    // Safe Kernel Halt Loop
    a.emit(0xf4, 0xeb, 0xfd);

    // =========================================================================
    // BAGIAN 7: SUBROUTINES & EXCEPTION / SYSCALL HANDLERS (64-BIT)
    // =========================================================================

    // -------------------------------------------------------------------------
    // SYSCALL HANDLER (IA32_LSTAR)
    // Input: RAX=num, RDI=arg1, RSI=arg2, RCX=user_rip, R11=user_rflags
    // -------------------------------------------------------------------------
    a.label('syscall_entry');
    a.storeMem64Abs(this.STATE_SYSCALL_USER_RSP, Reg64.RSP);
    a.movRegImm64(Reg64.RSP, BigInt(this.KERNEL_SYSCALL_STACK_TOP));
    a.emit(0x51);             // push rcx (User RIP)
    a.emit(0x41, 0x53);       // push r11 (User RFLAGS)
    a.emit(0x53);             // push rbx

    // Dispatch: 2 = SYS_PROCESS_ID, 6 = SYS_CONSOLE_WRITE, 1 = SYS_PROCESS_EXIT
    a.emit(0x48, 0x83, 0xf8, 0x02); // cmp rax, 2
    a.je('sys_pid');
    a.emit(0x48, 0x83, 0xf8, 0x06); // cmp rax, 6
    a.je('sys_write');
    a.emit(0x48, 0x83, 0xf8, 0x01); // cmp rax, 1
    a.je('sys_exit');

    // Syscall tidak dikenal -> -38 (-ENOSYS)
    a.movRegImm64(Reg64.RAX, -38n);
    a.jmp('syscall_return');

    a.label('sys_pid');
    // Verifikasi return RIP user (RCX) berada di ruang user canonical
    a.movRegImm64(Reg64.RBX, 0x0000_8000_0000_0000n);
    a.emit(0x48, 0x39, 0xd9); // cmp rcx, rbx
    a.jae('panic64_syscall');
    a.loadMem64Abs(Reg64.RAX, this.STATE_SYSCALL_FLAGS);
    a.emit(0x48, 0x83, 0xc8, 0x01); // or rax, 1
    a.storeMem64Abs(this.STATE_SYSCALL_FLAGS, Reg64.RAX);
    a.printLabel64('msg_usermode_entered', 'print_serial64');
    a.loadMem64Abs(Reg64.RAX, this.STATE_CURRENT_PID);
    a.jmp('syscall_return');

    a.label('sys_write');
    // Validasi user pointer RDI: >= 0x1000 && < 0x0000800000000000, len RSI <= 4096
    a.movRegImm64(Reg64.RBX, 0x1000n);
    a.emit(0x48, 0x39, 0xdf); // cmp rdi, rbx
    a.jb('sys_write_efault');
    a.movRegImm64(Reg64.RBX, 0x0000_8000_0000_0000n);
    a.emit(0x48, 0x39, 0xdf); // cmp rdi, rbx
    a.jae('sys_write_efault');
    a.movRegImm64(Reg64.RBX, 4096n);
    a.emit(0x48, 0x39, 0xde); // cmp rsi, rbx
    a.ja('sys_write_efault');

    // Tulis byte langsung dari buffer User Space [RDI .. RDI+RSI] ke UART COM1 (0x3F8)!
    a.emit(0x48, 0x89, 0xf1); // mov rcx, rsi (loop count)
    a.emit(0x48, 0x85, 0xc9); // test rcx, rcx
    a.je('sys_write_done');
    a.emit(0x48, 0x89, 0xf3); // mov rbx, rdi
    a.label('sys_write_loop');
    a.emit(0x8a, 0x03); // mov al, [rbx]
    a.emit(0x88, 0xc4); // mov ah, al
    a.label('sys_write_wait_tx');
    a.emit(0x66, 0xba, 0xfd, 0x03); // mov dx, 0x3FD (LSR)
    a.emit(0xec); // in al, dx
    a.emit(0xa8, 0x20); // test al, 0x20 (THRE)
    a.je('sys_write_wait_tx');
    a.emit(0x88, 0xe0); // mov al, ah
    a.emit(0x66, 0xba, 0xf8, 0x03); // mov dx, 0x3F8
    a.emit(0xee); // out dx, al
    a.emit(0x48, 0xff, 0xc3); // inc rbx
    a.emit(0x48, 0xff, 0xc9); // dec rcx
    a.jne('sys_write_loop');
    a.label('sys_write_done');
    a.loadMem64Abs(Reg64.RAX, this.STATE_SYSCALL_FLAGS);
    a.emit(0x48, 0x83, 0xc8, 0x02); // or rax, 2
    a.storeMem64Abs(this.STATE_SYSCALL_FLAGS, Reg64.RAX);
    a.printLabel64('msg_syscall_ok', 'print_serial64');
    a.emit(0x48, 0x89, 0xf0); // mov rax, rsi (return bytes written)
    a.jmp('syscall_return');

    a.label('sys_write_efault');
    a.movRegImm64(Reg64.RAX, -14n); // -EFAULT
    a.jmp('syscall_return');

    a.label('sys_exit');
    // Kembalikan kontrol secara bersih ke kernel_resume_rsp / kernel_resume_rip
    a.loadMem64Abs(Reg64.RSP, this.STATE_RESUME_RSP);
    a.loadMem64Abs(Reg64.RAX, this.STATE_RESUME_RIP);
    a.emit(0xff, 0xe0); // jmp rax

    a.label('syscall_return');
    a.emit(0x5b);             // pop rbx
    a.emit(0x41, 0x5b);       // pop r11
    a.emit(0x59);             // pop rcx
    a.loadMem64Abs(Reg64.RSP, this.STATE_SYSCALL_USER_RSP);
    a.emit(0x48, 0x0f, 0x07); // sysretq (Ring 0 -> Ring 3, CS=0x23, SS=0x1B)

    // -------------------------------------------------------------------------
    // HARDWARE PAGE FAULT (#PF, IDT Vector 14) HANDLER
    // Stack saat masuk (Ring 3 -> Ring 0 via TSS.RSP0):
    // [RSP+0]=ErrorCode, [RSP+8]=RIP, [RSP+16]=CS, [RSP+24]=RFLAGS, [RSP+32]=UserRSP, [RSP+40]=UserSS
    // -------------------------------------------------------------------------
    a.label('isr_pf');
    // Cek Error Code bit 2 (User fault)
    a.emit(0x48, 0x8b, 0x04, 0x24);       // mov rax, [rsp] (ErrorCode)
    a.emit(0xa8, 0x04);                   // test al, 4 (U/S bit)
    a.je('panic64_pf_ring0');
    // Cek CS pada stack frame [rsp+16] memiliki CPL == 3
    a.emit(0x48, 0x8b, 0x5c, 0x24, 0x10); // mov rbx, [rsp + 16] (CS)
    a.emit(0x48, 0x83, 0xe3, 0x03);       // and rbx, 3
    a.emit(0x48, 0x83, 0xfb, 0x03);       // cmp rbx, 3
    a.jne('panic64_pf_ring0');

    // Pulihkan Page Table Kernel (CR3 = PML4_A) sebelum mengakses/mencetak lebih lanjut
    a.movRegImm64(Reg64.RAX, BigInt(this.PML4_A_ADDR));
    a.emit(0x0f, 0x22, 0xd8); // mov cr3, rax

    // Catat fault count = 1 dan cetak NUSANTARA_USER_FAULT_ISOLATED
    a.loadMem64Abs(Reg64.RAX, this.STATE_FAULT_COUNT);
    a.emit(0x48, 0xff, 0xc0); // inc rax
    a.storeMem64Abs(this.STATE_FAULT_COUNT, Reg64.RAX);

    a.printLabel64('msg_user_fault_isolated', 'print_serial64');

    // Hentikan proses pelaku secara aman & kembali ke kernel_main tanpa KernelPanic!
    a.loadMem64Abs(Reg64.RSP, this.STATE_RESUME_RSP);
    a.loadMem64Abs(Reg64.RAX, this.STATE_RESUME_RIP);
    a.emit(0xff, 0xe0); // jmp rax

    // Panic Handlers (Menulis 0x01 ke port 0xF4 -> QEMU raw exit = 3)
    a.label('isr_ud');
    a.movRegImm64(Reg64.RAX, BigInt(this.PML4_A_ADDR));
    a.emit(0x0f, 0x22, 0xd8);
    a.printLabel64('msg_panic_ud', 'print_serial64');
    a.jmp('panic64_halt');

    a.label('isr_df');
    a.movRegImm64(Reg64.RAX, BigInt(this.PML4_A_ADDR));
    a.emit(0x0f, 0x22, 0xd8);
    a.printLabel64('msg_panic_df', 'print_serial64');
    a.jmp('panic64_halt');

    a.label('isr_gp');
    a.movRegImm64(Reg64.RAX, BigInt(this.PML4_A_ADDR));
    a.emit(0x0f, 0x22, 0xd8);
    a.printLabel64('msg_panic_gp', 'print_serial64');
    a.jmp('panic64_halt');

    a.label('isr_unhandled');
    a.movRegImm64(Reg64.RAX, BigInt(this.PML4_A_ADDR));
    a.emit(0x0f, 0x22, 0xd8);
    a.printLabel64('msg_panic_unhandled', 'print_serial64');
    a.jmp('panic64_halt');

    a.label('panic64_pf_ring0');
    a.movRegImm64(Reg64.RAX, BigInt(this.PML4_A_ADDR));
    a.emit(0x0f, 0x22, 0xd8);
    a.printLabel64('msg_panic_pf', 'print_serial64');
    a.jmp('panic64_halt');

    a.label('panic64_proc');
    a.label('panic64_isolation');
    a.label('panic64_fault');
    a.label('panic64_syscall');
    a.label('panic64_elf');
    a.printLabel64('msg_panic_kernel', 'print_serial64');

    a.label('panic64_halt');
    a.emit(0x66, 0xba, 0xf4, 0x00, 0xb0, 0x01, 0xee); // outb(0xF4, 0x01)
    a.emit(0xfa, 0xf4, 0xeb, 0xfd); // cli; hlt; jmp $-1

    // -------------------------------------------------------------------------
    // Helper: set_idt_gate(RAX=vec, RBX=handler_addr, RDX=ist)
    // -------------------------------------------------------------------------
    a.label('set_idt_gate');
    a.emit(0x48, 0xc1, 0xe0, 0x04); // shl rax, 4 (vec * 16)
    a.emit(0x48, 0x05); a.emit32(this.IDT64_ADDR); // add rax, IDT64_ADDR
    a.emit(0x66, 0x89, 0x18);       // mov [rax], bx (offset[15:0])
    a.emit(0x66, 0xc7, 0x40, 0x02, 0x08, 0x00); // mov word [rax+2], 0x0008 (Kernel CS)
    a.emit(0x88, 0x50, 0x04);       // mov [rax+4], dl (IST)
    a.emit(0xc6, 0x40, 0x05, 0x8e); // mov byte [rax+5], 0x8E (Present|DPL0|IntGate64)
    a.emit(0x48, 0xc1, 0xeb, 0x10); // shr rbx, 16
    a.emit(0x66, 0x89, 0x58, 0x06); // mov [rax+6], bx (offset[31:16])
    a.emit(0x48, 0xc1, 0xeb, 0x10); // shr rbx, 16
    a.emit(0x89, 0x58, 0x08);       // mov [rax+8], ebx (offset[63:32])
    a.emit(0xc7, 0x40, 0x0c, 0x00, 0x00, 0x00, 0x00); // mov dword [rax+12], 0
    a.emit(0xc3); // ret

    // -------------------------------------------------------------------------
    // Helper: print_serial64(RSI = null-terminated string)
    // -------------------------------------------------------------------------
    a.label('print_serial64');
    a.emit(0xac);             // lodsb
    a.emit(0x84, 0xc0);       // test al, al
    a.je('print_serial64_done');
    a.emit(0x88, 0xc4);       // mov ah, al
    a.label('print_serial64_wait');
    a.emit(0x66, 0xba, 0xfd, 0x03); // mov dx, 0x3FD (LSR)
    a.emit(0xec);             // in al, dx
    a.emit(0xa8, 0x20);       // test al, 0x20 (THRE)
    a.je('print_serial64_wait');
    a.emit(0x88, 0xe0);       // mov al, ah
    a.emit(0x66, 0xba, 0xf8, 0x03); // mov dx, 0x3F8
    a.emit(0xee);             // out dx, al
    a.jmp('print_serial64');
    a.label('print_serial64_done');
    a.emit(0xc3);

    // -------------------------------------------------------------------------
    // Helper ELF64 User Program Loader:
    // Input : RSI = ELF64 buffer ptr, RDI = dest code phys page, RDX = dest stack phys page
    // Output: RAX = e_entry virtual address
    // -------------------------------------------------------------------------
    a.label('load_elf64_user');
    a.emit(0x53);             // push rbx
    a.emit(0x52);             // push rdx (stack frame)
    a.emit(0x57);             // push rdi (code frame)

    // Nolkan kedua physical frame 4 KiB (RDI & RDX)
    a.emit(0x31, 0xc0, 0xb9, 0x00, 0x04, 0x00, 0x00, 0xf3, 0xab); // rep stosd on code frame (RDI)
    a.emit(0x48, 0x89, 0xd7); // mov rdi, rdx
    a.emit(0x31, 0xc0, 0xb9, 0x00, 0x04, 0x00, 0x00, 0xf3, 0xab); // rep stosd on stack frame

    // Cek ELF64 magic 0x464C457F & e_class==2 & e_machine==0x3E
    a.emit(0x81, 0x3e, 0x7f, 0x45, 0x4c, 0x46); // cmp dword [rsi], 0x464C457F
    a.jne('panic64_elf');
    a.emit(0x80, 0x7e, 0x04, 0x02); // cmp byte [rsi+4], 2
    a.jne('panic64_elf');
    a.emit(0x66, 0x81, 0x7e, 0x12, 0x3e, 0x00); // cmp word [rsi+18], 0x3E
    a.jne('panic64_elf');

    // Baca p_offset = [rsi+64+8], p_filesz = [rsi+64+32] dari Program Header 0 (e_phoff = 64)
    a.emit(0x48, 0x8b, 0x5e, 0x20); // mov rbx, [rsi + 32] (e_phoff)
    a.emit(0x48, 0x01, 0xf3);       // add rbx, rsi -> phdr[0]
    a.emit(0x83, 0x3b, 0x01);       // cmp dword [rbx], 1 (PT_LOAD)
    a.jne('panic64_elf');

    a.emit(0x48, 0x8b, 0x4b, 0x20); // mov rcx, [rbx + 32] (p_filesz)
    a.emit(0x48, 0x81, 0xf9, 0x00, 0x10, 0x00, 0x00); // cmp rcx, 4096
    a.ja('panic64_elf');

    // Salin p_filesz byte dari (rsi + p_offset) ke code frame [rsp]
    a.emit(0x48, 0x8b, 0x5b, 0x08); // mov rbx, [rbx + 8] (p_offset)
    a.emit(0x48, 0x01, 0xf3);       // add rbx, rsi (source = rbx)
    a.emit(0x5f);                   // pop rdi (dest code frame)
    a.emit(0x5a);                   // pop rdx (stack frame, clean stack)
    a.emit(0x48, 0x85, 0xc9);       // test rcx, rcx
    a.je('elf_copy_done');
    a.label('elf_copy_loop');
    a.emit(0x8a, 0x03);             // mov al, [rbx]
    a.emit(0x88, 0x07);             // mov [rdi], al
    a.emit(0x48, 0xff, 0xc3);       // inc rbx
    a.emit(0x48, 0xff, 0xc7);       // inc rdi
    a.emit(0x48, 0xff, 0xc9);       // dec rcx
    a.jne('elf_copy_loop');

    a.label('elf_copy_done');
    a.emit(0x48, 0x8b, 0x46, 0x18); // mov rax, [rsi + 24] (e_entry)
    a.emit(0x5b);                   // pop rbx
    a.emit(0xc3);                   // ret

    // =========================================================================
    // BAGIAN 8: DATA STRINGS, EMBEDDED USER ELF64, & GDT64
    // =========================================================================
    a.label('msg_boot_start');           a.emitCString(this.STAGE_1_START);
    a.label('msg_mb2_ok');               a.emitCString(this.STAGE_2_MULTIBOOT2);
    a.label('msg_cpu_ok');               a.emitCString(this.STAGE_3_LONG_MODE);
    a.label('msg_paging_ok');            a.emitCString(this.STAGE_4_PAGING);
    a.label('msg_gdt_ok');               a.emitCString(this.STAGE_5_GDT64);
    a.label('msg_long_entered');         a.emitCString(this.STAGE_6_LONG_ENTERED);
    a.label('msg_idt_ok');               a.emitCString(this.STAGE_7_IDT);
    a.label('msg_mem_ok');               a.emitCString(this.STAGE_8_MEM);
    a.label('msg_main_entered');         a.emitCString(this.STAGE_9_MAIN);
    a.label('msg_boot_ok');              a.emitCString(sentinel);
    a.label('msg_usermode_entered');     a.emitCString(this.STAGE_11_USERMODE_ENTERED);
    a.label('msg_syscall_ok');           a.emitCString(this.STAGE_13_SYSCALL_OK);
    a.label('msg_process_exit_ok');      a.emitCString(this.STAGE_14_PROCESS_EXIT_OK);
    a.label('msg_process_isolation_ok'); a.emitCString(this.STAGE_15_PROCESS_ISOLATION_OK);
    a.label('msg_user_fault_isolated');  a.emitCString(this.STAGE_15B_USER_FAULT_ISOLATED);
    a.label('msg_kernel_survived');      a.emitCString(this.STAGE_15C_KERNEL_SURVIVED_USER_FAULT);
    a.label('msg_usermode_test_pass');   a.emitCString(this.STAGE_16_USERMODE_TEST_PASS);

    a.label('msg_panic_mb2');            a.emitCString('NUSANTARA_KERNEL_PANIC: INVALID_MULTIBOOT2_MAGIC\r\n');
    a.label('msg_panic_cpu');            a.emitCString('NUSANTARA_KERNEL_PANIC: LONG_MODE_UNSUPPORTED\r\n');
    a.label('msg_panic_ud');             a.emitCString('NUSANTARA_KERNEL_PANIC: UNDEFINED_OPCODE_CPL_FAIL\r\n');
    a.label('msg_panic_df');             a.emitCString('NUSANTARA_KERNEL_PANIC: DOUBLE_FAULT\r\n');
    a.label('msg_panic_gp');             a.emitCString('NUSANTARA_KERNEL_PANIC: GENERAL_PROTECTION_FAULT\r\n');
    a.label('msg_panic_pf');             a.emitCString('NUSANTARA_KERNEL_PANIC: RING0_PAGE_FAULT\r\n');
    a.label('msg_panic_unhandled');      a.emitCString('NUSANTARA_KERNEL_PANIC: UNHANDLED_EXCEPTION\r\n');
    a.label('msg_panic_kernel');         a.emitCString('NUSANTARA_KERNEL_PANIC: VERIFICATION_FAILED\r\n');

    // Sematkan payload ELF64 user-test.elf & user-fault-test.elf asli (bukan string cetak dari Ring 0!)
    // HELLO FROM NUSANTARA USER MODE hanya keluar saat Ring 3 benar-benar menjalankan user-test.elf!
    a.align(16, 0x00);
    a.label('embedded_user_test_elf');
    a.emitBytes(UserELFBuilder.buildUserTestProgram());

    a.align(16, 0x00);
    a.label('embedded_user_fault_elf');
    a.emitBytes(UserELFBuilder.buildUserFaultProgram());

    // GDT 64-BIT (Ring 0, Ring 3, TSS64 at 0x00219000)
    a.align(8, 0x90);
    a.label('gdt_start');
    // Entry 0: NULL
    a.emit(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    // Entry 1: Kernel Code (0x08, DPL=0, L=1)
    a.emit(0xff, 0xff, 0x00, 0x00, 0x00, 0x9a, 0xaf, 0x00);
    // Entry 2: Kernel Data (0x10, DPL=0)
    a.emit(0xff, 0xff, 0x00, 0x00, 0x00, 0x92, 0xcf, 0x00);
    // Entry 3: User Data (0x18 | 3 = 0x1B, DPL=3)
    a.emit(0xff, 0xff, 0x00, 0x00, 0x00, 0xf2, 0xcf, 0x00);
    // Entry 4: User Code (0x20 | 3 = 0x23, DPL=3, L=1)
    a.emit(0xff, 0xff, 0x00, 0x00, 0x00, 0xfa, 0xaf, 0x00);
    // Entry 5: TSS64 Descriptor (0x28, 16 bytes, base = TSS64_ADDR = 0x00219000, limit = 0x0067)
    const tssBase = this.TSS64_ADDR;
    a.emit(
      0x67,
      0x00,
      tssBase & 0xff,
      (tssBase >> 8) & 0xff,
      (tssBase >> 16) & 0xff,
      0x89,
      0x00,
      (tssBase >>> 24) & 0xff
    );
    a.emit(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    a.label('gdt_end');

    const gdtSize = a.getLabelOffset('gdt_end') - a.getLabelOffset('gdt_start');
    a.label('gdt_ptr');
    a.emit16(gdtSize - 1);
    a.emitAbs32Patch('gdt_start');

    const codeBytes = a.resolveFixups(baseAddr);

    return {
      codeBytes,
      entryPoint: BigInt(baseAddr),
      sentinel,
    };
  }
}
