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

/**
 * Fixed 32-bit bootstrap scratch slots inside the reserved 0x218000-0x21c000
 * kernel-state region. Keep this layout synchronized with the boot reservation
 * manifest; these words are diagnostics/parser scratch, not PMM metadata.
 */
/**
 * Bounded native Multiboot2 usable-descriptor catalog in the otherwise-unused
 * first kernel-state page. The page is already covered by the 0x218000-0x21c000
 * bootstrap reservation; TSS/IDT/IDTR start at 0x219000.
 *
 * Each entry stores the six 32-bit words of the Multiboot2 24-byte base
 * descriptor (base, length, type, reserved). This is a raw catalog, not yet
 * a normalized allocator-ready extent list.
 */
export const X86_BOOTSTRAP_USABLE_DESCRIPTOR_COUNT_ADDRESS = 0x0021_8064;
export const X86_BOOTSTRAP_USABLE_DESCRIPTOR_TABLE_BASE = 0x0021_8100;
export const X86_BOOTSTRAP_USABLE_DESCRIPTOR_CAPACITY = 160;
export const X86_BOOTSTRAP_USABLE_DESCRIPTOR_SIZE = 24;

/**
 * Phase 76: page-aligned candidate extents emitted by the native bootstrap.
 * Each record is { start:uint64, endExclusive:uint64 }. These are candidates
 * only: overlapping firmware descriptors and reserved regions are not yet
 * subtracted, so this table must not be handed directly to the PMM.
 */
export const X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS = 0x0027_0000;
export const X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE = 0x0027_0100;
export const X86_BOOTSTRAP_PAGE_EXTENT_CAPACITY = 160;
export const X86_BOOTSTRAP_PAGE_EXTENT_SIZE = 16;
/** In-place insertion-sort cursors inside the reserved Phase 76 workspace. */
export const X86_BOOTSTRAP_PAGE_EXTENT_SORT_INDEX_ADDRESS = 0x0027_0c00;
export const X86_BOOTSTRAP_PAGE_EXTENT_SORT_CURSOR_ADDRESS = 0x0027_0c04;
/** Phase 78 in-place merge cursors in the reserved workspace. */
export const X86_BOOTSTRAP_PAGE_EXTENT_MERGE_READ_ADDRESS = 0x0027_0c08;
export const X86_BOOTSTRAP_PAGE_EXTENT_MERGE_WRITE_ADDRESS = 0x0027_0c0c;
/** Phase 79: bounded native exclusion catalog in its own reserved page. */
export const X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS = 0x0027_1000;
export const X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE = 0x0027_1100;
export const X86_BOOTSTRAP_RESERVATION_CATALOG_CAPACITY = 160;
export const X86_BOOTSTRAP_RESERVATION_CATALOG_RECORD_SIZE = 16;
export const X86_BOOTSTRAP_RESERVATION_NORMALIZE_INDEX_ADDRESS = 0x0027_2000;
export const X86_BOOTSTRAP_RESERVATION_SORT_INDEX_ADDRESS = 0x0027_2004;
export const X86_BOOTSTRAP_RESERVATION_SORT_CURSOR_ADDRESS = 0x0027_2008;
export const X86_BOOTSTRAP_RESERVATION_MERGE_READ_ADDRESS = 0x0027_200c;
export const X86_BOOTSTRAP_RESERVATION_MERGE_WRITE_ADDRESS = 0x0027_2010;
/** Phase 82: final native extents after subtracting all normalized exclusions. */
export const X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS = 0x0027_3000;
export const X86_BOOTSTRAP_FINAL_EXTENT_TABLE_BASE = 0x0027_3100;
export const X86_BOOTSTRAP_FINAL_EXTENT_CAPACITY = 320;
export const X86_BOOTSTRAP_FINAL_EXTENT_RECORD_SIZE = 16;
/** Phase 82 bounded subtraction cursors, reserved at 0x276000. */
export const X86_BOOTSTRAP_SUBTRACT_CANDIDATE_INDEX_ADDRESS = 0x0027_6000;
export const X86_BOOTSTRAP_SUBTRACT_RESERVATION_INDEX_ADDRESS = 0x0027_6004;
export const X86_BOOTSTRAP_SUBTRACT_CURSOR_LOW_ADDRESS = 0x0027_6008;
export const X86_BOOTSTRAP_SUBTRACT_CURSOR_HIGH_ADDRESS = 0x0027_600c;
export const X86_BOOTSTRAP_SUBTRACT_END_LOW_ADDRESS = 0x0027_6010;
export const X86_BOOTSTRAP_SUBTRACT_END_HIGH_ADDRESS = 0x0027_6014;
/** Phase 86: previous end pair used to validate sorted, disjoint final extents. */
export const X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_LOW_ADDRESS = 0x0027_7000;
export const X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_HIGH_ADDRESS = 0x0027_7004;
/** Phase 88: bounded cross-check scratch for candidate containment and reservation exclusion. */
export const X86_BOOTSTRAP_FINAL_CROSSCHECK_COUNT_ADDRESS = 0x0027_8000;
export const X86_BOOTSTRAP_FINAL_CROSSCHECK_INDEX_ADDRESS = 0x0027_8004;
export const X86_BOOTSTRAP_FINAL_CROSSCHECK_CANDIDATE_INDEX_ADDRESS = 0x0027_8008;
export const X86_BOOTSTRAP_FINAL_CROSSCHECK_RESERVATION_INDEX_ADDRESS = 0x0027_800c;
export const X86_BOOTSTRAP_FINAL_CROSSCHECK_START_LOW_ADDRESS = 0x0027_8010;
export const X86_BOOTSTRAP_FINAL_CROSSCHECK_START_HIGH_ADDRESS = 0x0027_8014;
export const X86_BOOTSTRAP_FINAL_CROSSCHECK_END_LOW_ADDRESS = 0x0027_8018;
export const X86_BOOTSTRAP_FINAL_CROSSCHECK_END_HIGH_ADDRESS = 0x0027_801c;
/** End-exclusive fixed bootstrap exclusions; dynamic entries are appended at boot. */
export const X86_BOOTSTRAP_FIXED_RESERVATIONS = Object.freeze([
  { start: 0x00000000, end: 0x00200000, reason: 'low memory and kernel image' },
  { start: 0x00200000, end: 0x00218000, reason: 'bootstrap page tables' },
  { start: 0x00218000, end: 0x0021c000, reason: 'kernel state and descriptor tables' },
  { start: 0x00220000, end: 0x00230000, reason: 'kernel and IST stacks' },
  { start: 0x0024c000, end: 0x00250000, reason: 'CPU syscall stack' },
  { start: 0x00251000, end: 0x00252000, reason: 'CPU-local GS data' },
  { start: 0x00260000, end: 0x00270000, reason: 'copied Multiboot2 information' },
  { start: 0x00270000, end: 0x00271000, reason: 'native extent workspace' },
  { start: 0x00271000, end: 0x00272000, reason: 'native reservation catalog workspace' },
  { start: 0x00272000, end: 0x00273000, reason: 'native reservation normalization workspace' },
  { start: 0x00273000, end: 0x00276000, reason: 'native final physical extent output table and count (12 KiB)' },
  { start: 0x00276000, end: 0x00277000, reason: 'native reservation subtraction scratch (4 KiB)' },
  { start: 0x00277000, end: 0x00278000, reason: 'native final extent validation scratch (4 KiB)' },
  { start: 0x00278000, end: 0x00279000, reason: 'native final extent cross-check scratch (4 KiB)' },
  { start: 0x002f0000, end: 0x002f4000, reason: 'early boot page tables' },
  { start: 0x00600000, end: 0x00601000, reason: 'process A user code' },
  { start: 0x00610000, end: 0x00611000, reason: 'process A user stack' },
  { start: 0x00620000, end: 0x00621000, reason: 'process B user code' },
  { start: 0x00630000, end: 0x00631000, reason: 'process B user stack' },
] as const);





export const X86_BOOTSTRAP_STATE_LAYOUT = Object.freeze({
  usableDescriptorCount: 0x0021_8040,
  blockedDescriptorCount: 0x0021_8044,
  rawUsableBytesLow: 0x0021_8048,
  rawUsableBytesHigh: 0x0021_804c,
  alignedUsableBytesLow: 0x0021_8050,
  alignedUsableBytesHigh: 0x0021_8054,
  multibootTagSize: 0x0021_8058,
  multibootTagPointer: 0x0021_805c,
  multibootInfoEnd: 0x0021_8060,
} as const);

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
  public static readonly STAGE_2B_MULTIBOOT2_COPY = 'NUSANTARA_MULTIBOOT2_COPY_OK\r\n';
  public static readonly STAGE_3_LONG_MODE = 'NUSANTARA_CPU_LONG_MODE_OK\r\n';
  public static readonly STAGE_4_PAGING = 'NUSANTARA_PAGING_OK\r\n';
  public static readonly STAGE_5_GDT64 = 'NUSANTARA_GDT64_OK\r\n';
  public static readonly STAGE_6_LONG_ENTERED = 'NUSANTARA_LONG_MODE_ENTERED\r\n';
  public static readonly STAGE_7_IDT = 'NUSANTARA_IDT_OK\r\n';
  public static readonly STAGE_8_MEM = 'NUSANTARA_MEMORY_MANAGER_OK\r\n';
  public static readonly STAGE_8B_DIRECT_MAP = 'NUSANTARA_DIRECT_MAP_OK\r\n';
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
  private static readonly PD_DIRECT_ADDR = 0x0020_6000;

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
  private static readonly STATE_CURRENT_PID = 0x0021_8020;
  private static readonly STATE_FAULT_COUNT = 0x0021_8028;
  private static readonly STATE_SYSCALL_FLAGS = 0x0021_8030;
  private static readonly STATE_NX_SUPPORTED = 0x0021_8038;

  private static readonly TSS64_ADDR = 0x0021_9000;
  private static readonly IDT64_ADDR = 0x0021_A000;
  private static readonly IDTR64_ADDR = 0x0021_B000;

  private static readonly KERNEL_STACK_TOP = 0x0022_8000;
  private static readonly KERNEL_IST1_TOP = 0x0022_C000;
  // CPU-local area for the bootstrap CPU. AP/SMP initialization must provision one per CPU.
  private static readonly CPU_LOCAL_BASE = 0x0025_1000;
  private static readonly CPU_LOCAL_SYSCALL_STACK_TOP = 0x0025_0000;
  // A bounded 64 KiB copy of the bootloader-owned MBI, reserved before PMM use.
  private static readonly MULTIBOOT2_COPY_BUFFER_ADDR = 0x0026_0000;
  private static readonly MULTIBOOT2_COPY_BUFFER_SIZE = 0x0001_0000;

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
    a.emit(0x89, 0xdf); // mov edi, ebx (preserve Multiboot2 information pointer)
    // Do not touch the stack until the boot information has been copied safely.

    // Inisialisasi UART 16550 COM1 Port 0x3F8 sedini mungkin (115200 8N1)
    a.emit(0x66, 0xba, 0xf9, 0x03, 0x30, 0xc0, 0xee); // outb(0x3F9, 0x00) IER
    a.emit(0x66, 0xba, 0xfb, 0x03, 0xb0, 0x80, 0xee); // outb(0x3FB, 0x80) DLAB=1
    a.emit(0x66, 0xba, 0xf8, 0x03, 0xb0, 0x01, 0xee); // outb(0x3F8, 0x01) 115200 baud low
    a.emit(0x66, 0xba, 0xf9, 0x03, 0x30, 0xc0, 0xee); // outb(0x3F9, 0x00) high
    a.emit(0x66, 0xba, 0xfb, 0x03, 0xb0, 0x03, 0xee); // outb(0x3FB, 0x03) 8N1
    a.emit(0x66, 0xba, 0xfa, 0x03, 0xb0, 0xc7, 0xee); // outb(0x3FA, 0xC7) FIFO
    a.emit(0x66, 0xba, 0xfc, 0x03, 0xb0, 0x0b, 0xee); // outb(0x3FC, 0x0B) MCR RTS/DTR
    // Emit the first boot sentinel before parsing MBI so early failures are diagnosable.
    a.printLabel32('msg_boot_start', 'print_serial32');

    // Verifikasi Multiboot2 magic tanpa memakai stack yang belum aman.
    a.emit(0x81, 0xfd, 0x89, 0x62, 0xd7, 0x36); // cmp ebp, 0x36D76289
    a.je('mb2_magic_ok');
    a.jmp('panic32');

    a.label('mb2_magic_ok');
    a.printLabel32('msg_diag_magic_ok', 'print_serial32');
    // Validate and copy MBI while paging is off. The early identity-access
    // contract is intentionally limited to the first 8 MiB; unsupported
    // higher addresses fail closed instead of being dereferenced blindly.
    a.emit(0x89, 0xfb); // mov ebx, edi (source pointer)
    a.emit(0x85, 0xdb); // test ebx, ebx
    a.je('panic32');
    a.emit(0xf6, 0xc3, 0x07); // test bl, 7 (8-byte alignment)
    a.jne('panic32');
    a.emit(0x81, 0xfb, 0xf0, 0xff, 0x7f, 0x00); // cmp ebx, 0x007FFFF0
    a.ja('panic32');
    a.printLabel32('msg_diag_mbi_pointer_ok', 'print_serial32');
    a.emit(0x8b, 0x0b); // mov ecx, [ebx] (total_size)
    a.emit(0x83, 0xf9, 0x10); // cmp ecx, 16
    a.jb('panic32');
    a.emit(0x81, 0xf9); a.emit32(this.MULTIBOOT2_COPY_BUFFER_SIZE); // cmp ecx, reserved copy-buffer capacity
    a.ja('panic32');
    a.emit(0xf6, 0xc1, 0x07); // test cl, 7
    a.jne('panic32');
    a.emit(0x83, 0x7b, 0x04, 0x00); // cmp dword [ebx+4], 0
    a.jne('panic32');
    a.printLabel32('msg_diag_mbi_header_ok', 'print_serial32');
    a.emit(0x89, 0xd8); // mov eax, ebx
    a.emit(0x01, 0xc8); // add eax, ecx
    a.jb('panic32'); // carry means pointer + total_size overflowed
    a.emit(0x3d, 0x00, 0x00, 0x80, 0x00); // cmp eax, 8 MiB identity-map limit
    a.ja('panic32');
    a.printLabel32('msg_diag_mbi_range_ok', 'print_serial32');

    // Overlap-safe memmove into the reserved kernel-owned copy buffer.
    a.emit(0x89, 0xde); // mov esi, ebx
    a.emit(0x8b, 0x0b); // mov ecx, [ebx]
    a.movRegImm32(Reg64.RDI, this.MULTIBOOT2_COPY_BUFFER_ADDR);
    a.emit(0x39, 0xf7); // cmp edi, esi
    a.jbe('mb2_copy_forward');
    a.emit(0x89, 0xf0); // mov eax, esi
    a.emit(0x01, 0xc8); // add eax, ecx (source end already validated)
    a.emit(0x39, 0xc7); // cmp edi, eax
    a.jae('mb2_copy_forward');
    a.emit(0x01, 0xce); // add esi, ecx
    a.emit(0x4e); // dec esi
    a.emit(0x89, 0xf8); // mov eax, edi
    a.emit(0x01, 0xc8); // add eax, ecx
    a.emit(0x48); // dec eax
    a.emit(0x89, 0xc7); // mov edi, eax
    a.emit(0xfd, 0xf3, 0xa4, 0xfc); // std; rep movsb; cld
    a.jmp('mb2_copy_done');
    a.label('mb2_copy_forward');
    a.emit(0xf3, 0xa4); // rep movsb
    a.label('mb2_copy_done');
    a.printLabel32('msg_diag_mbi_copy_ok', 'print_serial32');
    a.movRegImm32(Reg64.RDI, this.MULTIBOOT2_COPY_BUFFER_ADDR);
    a.movRegImm32(Reg64.RSP, this.KERNEL_STACK_TOP);

    // Native 32-bit Multiboot2 tag walker. It only reads the kernel-owned
    // bounded copy, validates every tag boundary/alignment, and requires a
    // structurally valid non-empty memory-map tag before accepting End.
    a.emit(0x89, 0xfe); // mov esi, edi
    a.emit(0x83, 0xc6, 0x08); // add esi, 8 (first tag)
    a.emit(0xa1); a.emit32(this.MULTIBOOT2_COPY_BUFFER_ADDR); // mov eax, [buffer] (total_size)
    a.movRegImm32(Reg64.RDI, this.MULTIBOOT2_COPY_BUFFER_ADDR);
    a.emit(0x01, 0xc7); // add edi, eax (exclusive end of copied MBI)
    a.emit(0x31, 0xdb); // xor ebx, ebx (memory-map seen flag)
    // Bootstrap-only memory-map accounting in the reserved kernel state page.
    // These diagnostics are not allocator metadata.
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_STATE_LAYOUT.usableDescriptorCount, 0);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_STATE_LAYOUT.blockedDescriptorCount, 0);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_STATE_LAYOUT.rawUsableBytesLow, 0);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_STATE_LAYOUT.rawUsableBytesHigh, 0);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_STATE_LAYOUT.alignedUsableBytesLow, 0);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_STATE_LAYOUT.alignedUsableBytesHigh, 0);
    // Native catalog count starts empty. The fixed table is bounded to 160
    // descriptors (3,840 bytes) inside the reserved 0x218000 state page.
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_USABLE_DESCRIPTOR_COUNT_ADDRESS, 0);
    // Phase 76: bounded page-extent candidate output starts empty.
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS, 0);
    // Phase 79: initialize the bounded native exclusion catalog.
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS, 0);
    for (let i = 0; i < X86_BOOTSTRAP_FIXED_RESERVATIONS.length; i++) {
      const reservation = X86_BOOTSTRAP_FIXED_RESERVATIONS[i];
      const slot = X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE +
        i * X86_BOOTSTRAP_RESERVATION_CATALOG_RECORD_SIZE;
      a.storeMem32AbsImm32Mode32(slot, reservation.start);
      a.storeMem32AbsImm32Mode32(slot + 4, 0);
      a.storeMem32AbsImm32Mode32(slot + 8, reservation.end);
      a.storeMem32AbsImm32Mode32(slot + 12, 0);
    }
    a.storeMem32AbsImm32Mode32(
      X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS,
      X86_BOOTSTRAP_FIXED_RESERVATIONS.length,
    );


    a.label('mb2_native_tag_loop');
    a.emit(0x89, 0xf8); // mov eax, edi
    a.emit(0x29, 0xf0); // sub eax, esi
    a.emit(0x83, 0xf8, 0x08); // cmp eax, 8
    a.jb('panic32');
    a.emit(0x8b, 0x06); // mov eax, [esi] (tag type)
    a.emit(0x8b, 0x4e, 0x04); // mov ecx, [esi+4] (tag size)
    a.emit(0x83, 0xf9, 0x08); // cmp ecx, 8
    a.jb('panic32');
    a.emit(0x89, 0xfa); // mov edx, edi
    a.emit(0x29, 0xf2); // sub edx, esi
    a.emit(0x39, 0xd1); // cmp ecx, edx
    a.ja('panic32');

    a.emit(0x83, 0xf8, 0x00); // cmp eax, END
    a.je('mb2_native_end');
    a.emit(0x83, 0xf8, 0x06); // cmp eax, MEMORY_MAP
    a.je('mb2_native_memory_map');
    a.emit(0x83, 0xf8, 0x03); // cmp eax, MODULE
    a.je('mb2_native_module');
    a.emit(0x83, 0xf8, 0x08); // cmp eax, FRAMEBUFFER
    a.je('mb2_native_framebuffer');
    a.jmp('mb2_native_advance');

    a.label('mb2_native_memory_map');
    // Snapshot the outer tag cursor context in reserved bootstrap scratch.
    // The descriptor walker uses ESI/ECX heavily; restore all parser inputs
    // explicitly before advancing beyond the memory-map tag.
    a.emit(0x89, 0x0d); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.multibootTagSize); // mov [scratch_tag_size], ecx
    a.emit(0x89, 0x35); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.multibootTagPointer); // mov [scratch_tag_ptr], esi
    a.emit(0x89, 0x3d); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.multibootInfoEnd); // mov [scratch_mbi_end], edi
    // Preserve every live tag-parser register across serial output.
    a.emit(0x60); // pushad
    a.printLabel32('msg_diag_mmap_begin', 'print_serial32');
    a.emit(0x61); // popad
    a.emit(0x83, 0xf9, 0x10); // cmp ecx, 16
    a.jb('panic32');
    a.emit(0x83, 0x7e, 0x0c, 0x00); // entry_version must be zero
    a.jne('panic32');
    a.emit(0x51); // push ecx (tag size)
    a.emit(0x8b, 0x4e, 0x08); // mov ecx, [esi+8] (entry_size)
    a.emit(0x83, 0xf9, 0x18); // cmp ecx, 24
    a.jb('panic32');
    a.emit(0xf6, 0xc1, 0x07); // test cl, 7
    a.jne('panic32');
    a.emit(0x8b, 0x46, 0x04); // mov eax, [esi+4] (tag size)
    a.emit(0x83, 0xe8, 0x10); // sub eax, 16
    a.emit(0x85, 0xc0); // test eax, eax
    a.je('panic32');
    a.emit(0x31, 0xd2); // xor edx, edx
    a.emit(0xf7, 0xf1); // div ecx
    a.emit(0x85, 0xd2); // test edx, edx
    a.jne('panic32');
    a.emit(0x85, 0xc0); // require at least one entry
    a.je('panic32');
    // Validate every 24-byte-or-larger descriptor before accepting the map:
    // nonzero length, reserved dword zero, and checked uint64 base + length.
    // Preserve tag size and tag pointer; ECX=entry_size, EDX=entry count.
    a.emit(0x56); // push esi (tag pointer)
    a.emit(0x55); // push ebp (preserve Multiboot2 magic for long-mode state)
    a.emit(0x89, 0xc2); // mov edx, eax (entry count)
    a.emit(0x8d, 0x76, 0x10); // lea esi, [esi+16] (first descriptor)
    a.label('mb2_native_memory_entry_loop');
    a.emit(0x85, 0xd2); // test edx, edx
    a.je('mb2_native_memory_entries_done');
    a.emit(0x52); // push edx: preserve remaining-entry count across address arithmetic
    a.emit(0x8b, 0x46, 0x08); // mov eax, [esi+8] (length low)
    a.emit(0x0b, 0x46, 0x0c); // or eax, [esi+12] (length high)
    a.emit(0x85, 0xc0); // reject zero-length descriptor
    a.je('panic32');
    a.emit(0x83, 0x7e, 0x14, 0x00); // reserved dword must be zero
    a.jne('panic32');
    a.emit(0x8b, 0x06); // mov eax, [esi] (base low)
    a.emit(0x03, 0x46, 0x08); // add eax, [esi+8] (length low)
    a.emit(0x8b, 0x46, 0x04); // mov eax, [esi+4] (base high; preserves CF)
    a.emit(0x13, 0x46, 0x0c); // adc eax, [esi+12] (length high)
    a.jb('panic32'); // carry means uint64 base + length overflow
    // Type 1 is firmware-reported available RAM. Other types are blocked.
    // Overlaps and bootstrap reservations still require later normalization.
    a.emit(0x83, 0x7e, 0x10, 0x01); // cmp dword [esi+16], 1 (AVAILABLE)
    a.jne('mb2_native_memory_entry_blocked');
    // Copy the raw 24-byte type-1 descriptor into the bounded native catalog.
    // EDI is the outer MBI end pointer, saved in Phase 73 scratch and restored
    // after this descriptor walk. Overflow is fail-closed: never truncate.
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_USABLE_DESCRIPTOR_COUNT_ADDRESS); // mov eax, [count]
    a.emit(0x3d); a.emit32(X86_BOOTSTRAP_USABLE_DESCRIPTOR_CAPACITY); // cmp eax, capacity
    a.jae('panic32');
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_USABLE_DESCRIPTOR_SIZE); // imul eax, eax, 24
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_USABLE_DESCRIPTOR_TABLE_BASE); // add eax, table base
    a.emit(0x89, 0xc7); // mov edi, eax (destination)
    a.emit(0x8b, 0x06, 0x89, 0x07); // base low
    a.emit(0x8b, 0x46, 0x04, 0x89, 0x47, 0x04); // base high
    a.emit(0x8b, 0x46, 0x08, 0x89, 0x47, 0x08); // length low
    a.emit(0x8b, 0x46, 0x0c, 0x89, 0x47, 0x0c); // length high
    a.emit(0x8b, 0x46, 0x10, 0x89, 0x47, 0x10); // type
    a.emit(0x8b, 0x46, 0x14, 0x89, 0x47, 0x14); // reserved
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_USABLE_DESCRIPTOR_COUNT_ADDRESS); // count++
    // Compute complete 4 KiB pages contained in this individual type-1
    // descriptor. This is an audit counter only: overlapping descriptors and
    // reserved ranges are intentionally not deduplicated/subtracted here.
    a.emit(0x53); // push ebx (memory-map-present flag)
    a.emit(0x8b, 0x06); // mov eax, [esi] base low
    a.emit(0x8b, 0x6e, 0x04); // mov ebp, [esi+4] base high
    a.emit(0x05, 0xff, 0x0f, 0x00, 0x00); // add eax, 4095
    a.emit(0x83, 0xd5, 0x00); // adc ebp, 0
    a.jb('panic32'); // reject overflow while rounding the 64-bit base upward
    a.emit(0x25, 0x00, 0xf0, 0xff, 0xff); // and eax, 0xfffff000 (align start up)
    a.emit(0x8b, 0x16); // mov edx, [esi] base low
    a.emit(0x03, 0x56, 0x08); // add edx, [esi+8] length low
    a.emit(0x8b, 0x5e, 0x04); // mov ebx, [esi+4] base high
    a.emit(0x13, 0x5e, 0x0c); // adc ebx, [esi+12] length high
    a.emit(0x81, 0xe2, 0x00, 0xf0, 0xff, 0xff); // align end down
    a.emit(0x39, 0xeb); // cmp ebx, ebp (end high vs start high)
    a.jb('mb2_native_no_complete_pages');
    a.ja('mb2_native_has_complete_pages');
    a.emit(0x39, 0xc2); // cmp edx, eax
    a.jbe('mb2_native_no_complete_pages');
    a.label('mb2_native_has_complete_pages');
    // Preserve the aligned 64-bit start/end and the outer entry_size while
    // computing a bounded destination slot. EDI is scratch here; the MBI end
    // pointer is restored from the Phase 73 context after the map walk.
    a.emit(0x50); // push eax (start low)
    a.emit(0x55); // push ebp (start high)
    a.emit(0x52); // push edx (end low)
    a.emit(0x53); // push ebx (end high)
    a.emit(0x51); // push ecx (entry_size)
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS); // mov eax, [extent_count]
    a.emit(0x3d); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_CAPACITY); // cmp eax, capacity
    a.jae('panic32');
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_PAGE_EXTENT_SIZE); // imul eax, eax, 16
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE); // add eax, table base
    a.emit(0x89, 0xc7); // mov edi, eax (destination slot)
    a.emit(0x59); // pop ecx (entry_size)
    a.emit(0x5b); // pop ebx (end high)
    a.emit(0x5a); // pop edx (end low)
    a.emit(0x5d); // pop ebp (start high)
    a.emit(0x58); // pop eax (start low)
    a.emit(0x89, 0x07); // mov [edi], eax
    a.emit(0x89, 0x6f, 0x04); // mov [edi+4], ebp
    a.emit(0x89, 0x57, 0x08); // mov [edi+8], edx
    a.emit(0x89, 0x5f, 0x0c); // mov [edi+12], ebx
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS); // extent_count++
    a.emit(0x29, 0xc2); // sub edx, eax (aligned byte span low)
    a.emit(0x19, 0xeb); // sbb ebx, ebp (aligned byte span high)
    a.emit(0x01, 0x15); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.alignedUsableBytesLow); // add aligned bytes low
    a.emit(0x11, 0x1d); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.alignedUsableBytesHigh); // adc aligned bytes high
    a.jb('panic32'); // checked 64-bit aligned-byte diagnostic
    a.label('mb2_native_no_complete_pages');
    a.emit(0x5b); // pop ebx (restore memory-map-present flag)
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.usableDescriptorCount); // inc usable descriptor count
    a.emit(0x8b, 0x46, 0x08); // mov eax, [esi+8] (length low)
    a.emit(0x8b, 0x6e, 0x0c); // mov ebp, [esi+12] (length high)
    a.emit(0x01, 0x05); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.rawUsableBytesLow); // add raw usable bytes low
    a.emit(0x11, 0x2d); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.rawUsableBytesHigh); // adc raw usable bytes high
    a.jb('panic32'); // reject overflow in diagnostic 64-bit sum
    a.jmp('mb2_native_memory_entry_classified');
    a.label('mb2_native_memory_entry_blocked');
    // Preserve parser registers while appending the raw blocked uint64 interval.
    a.emit(0x60);
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.emit(0x3d); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_CAPACITY);
    a.jae('panic32');
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_RESERVATION_CATALOG_RECORD_SIZE);
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE);
    a.emit(0x89, 0xc7);
    a.emit(0x8b, 0x06, 0x89, 0x07);
    a.emit(0x8b, 0x46, 0x04, 0x89, 0x47, 0x04);
    a.emit(0x8b, 0x06); a.emit(0x03, 0x46, 0x08); a.emit(0x89, 0x47, 0x08);
    a.emit(0x8b, 0x46, 0x04); a.emit(0x13, 0x46, 0x0c);
    a.jb('panic32');
    a.emit(0x89, 0x47, 0x0c);
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.emit(0x61);
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.blockedDescriptorCount); // inc blocked descriptor count
    a.label('mb2_native_memory_entry_classified');
    a.emit(0x01, 0xce); // add esi, ecx (advance by entry_size)
    a.jb('panic32'); // reject 32-bit descriptor pointer wrap
    a.emit(0x5a); // pop edx (restore remaining-entry count after address arithmetic)
    a.emit(0x4a); // dec edx
    a.jmp('mb2_native_memory_entry_loop');
    a.label('mb2_native_memory_entries_done');
    a.emit(0x5e); // pop esi (restore tag pointer)
    a.emit(0x5d); // pop ebp (restore original Multiboot2 magic)
    a.emit(0x59); // pop ecx (restore tag size)
    a.emit(0x60); // pushad while printing the completion checkpoint
    a.printLabel32('msg_diag_mmap_done', 'print_serial32');
    a.emit(0x61); // popad
    a.emit(0xbb, 0x01, 0x00, 0x00, 0x00); // mov ebx, 1 (validated memory map present)
    // Phase 69: preserve all live registers around serial-only checkpoints.
    a.emit(0x60); a.printLabel32('msg_diag_after_mmap_restore', 'print_serial32'); a.emit(0x61);
    // Restore parser cursor state from dedicated scratch, independent of the
    // descriptor walk's stack/register usage.
    a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.multibootTagSize); // mov ecx, [scratch_tag_size]
    a.emit(0x8b, 0x35); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.multibootTagPointer); // mov esi, [scratch_tag_ptr]
    a.emit(0x8b, 0x3d); a.emit32(X86_BOOTSTRAP_STATE_LAYOUT.multibootInfoEnd); // mov edi, [scratch_mbi_end]
    // Phase 77: insertion-sort candidate records by unsigned 64-bit start.
    // pushad/popad keeps the outer Multiboot2 parser context intact.
    a.emit(0x60); // pushad
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_PAGE_EXTENT_SORT_INDEX_ADDRESS, 1);
    a.label('phase77_sort_outer');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_SORT_INDEX_ADDRESS); // mov eax, [i]
    a.emit(0x8b, 0x15); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS); // mov edx, [count]
    a.emit(0x39, 0xd0); // cmp eax, edx
    a.jae('phase77_sort_done');
    a.emit(0xa3); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_SORT_CURSOR_ADDRESS); // mov [j], eax
    a.label('phase77_sort_inner');
    a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_SORT_CURSOR_ADDRESS); // mov ecx, [j]
    a.emit(0x85, 0xc9); // test ecx, ecx
    a.je('phase77_sort_outer_next');
    a.emit(0x89, 0xc8); // mov eax, ecx
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_PAGE_EXTENT_SIZE); // imul eax, eax, 16
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE); // add eax, table base
    a.emit(0x89, 0xc7); // mov edi, eax (current record)
    a.emit(0x8b, 0x57, 0xf4); // mov edx, [edi-12] previous start high
    a.emit(0x3b, 0x57, 0x04); // cmp edx, [edi+4] current start high
    a.ja('phase77_sort_swap');
    a.jb('phase77_sort_inner_next');
    a.emit(0x8b, 0x47, 0xf0); // mov eax, [edi-16] previous start low
    a.emit(0x3b, 0x07); // cmp eax, [edi] current start low
    a.ja('phase77_sort_swap');
    a.jmp('phase77_sort_inner_next');
    a.label('phase77_sort_swap');
    a.emit(0xff, 0x77, 0xf0); // push [edi-16]
    a.emit(0xff, 0x77, 0xf4); // push [edi-12]
    a.emit(0xff, 0x77, 0xf8); // push [edi-8]
    a.emit(0xff, 0x77, 0xfc); // push [edi-4]
    a.emit(0x8b, 0x07, 0x89, 0x47, 0xf0); // [edi] -> [edi-16]
    a.emit(0x8b, 0x47, 0x04, 0x89, 0x47, 0xf4); // +4 -> -12
    a.emit(0x8b, 0x47, 0x08, 0x89, 0x47, 0xf8); // +8 -> -8
    a.emit(0x8b, 0x47, 0x0c, 0x89, 0x47, 0xfc); // +12 -> -4
    a.emit(0x58, 0x89, 0x47, 0x0c); // pop eax; [edi+12] = eax
    a.emit(0x58, 0x89, 0x47, 0x08); // pop eax; [edi+8] = eax
    a.emit(0x58, 0x89, 0x47, 0x04); // pop eax; [edi+4] = eax
    a.emit(0x58, 0x89, 0x07); // pop eax; [edi] = eax
    a.label('phase77_sort_inner_next');
    a.emit(0xff, 0x0d); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_SORT_CURSOR_ADDRESS); // dec [j]
    a.jmp('phase77_sort_inner');
    a.label('phase77_sort_outer_next');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_SORT_INDEX_ADDRESS); // inc [i]
    a.jmp('phase77_sort_outer');
    a.label('phase77_sort_done');
    // Phase 78: compact sorted candidates in-place, merging overlap and adjacency.
    // Both cursors are bounded by the already-validated candidate count.
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_READ_ADDRESS, 0);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_WRITE_ADDRESS, 0);
    a.label('phase78_merge_loop');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_READ_ADDRESS); // eax = read
    a.emit(0x8b, 0x15); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS); // edx = count
    a.emit(0x39, 0xd0); // cmp read,count
    a.jae('phase78_merge_done');
    // ESI points at current input candidate.
    a.emit(0x89, 0xc1); // mov ecx,eax
    a.emit(0x6b, 0xc9, X86_BOOTSTRAP_PAGE_EXTENT_SIZE);
    a.emit(0x81, 0xc1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE);
    a.emit(0x89, 0xce); // mov esi,ecx
    // First candidate is copied to output slot zero.
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_WRITE_ADDRESS);
    a.emit(0x85, 0xc0);
    a.je('phase78_merge_append');
    // EDI points at the previous output record (write - 1).
    a.emit(0x48); // dec eax
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_PAGE_EXTENT_SIZE);
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE);
    a.emit(0x89, 0xc7); // mov edi,eax
    // If current.start > previous.end, append; otherwise merge.
    a.emit(0x8b, 0x56, 0x04); // current start high
    a.emit(0x3b, 0x57, 0x0c); // compare previous end high
    a.ja('phase78_merge_append');
    a.jb('phase78_merge_overlap');
    a.emit(0x8b, 0x06); // current start low
    a.emit(0x3b, 0x47, 0x08); // compare previous end low
    a.ja('phase78_merge_append');
    a.label('phase78_merge_overlap');
    // Extend previous.end only when current.end is greater.
    a.emit(0x8b, 0x56, 0x0c); // current end high
    a.emit(0x3b, 0x57, 0x0c); // previous end high
    a.ja('phase78_merge_update_end');
    a.jb('phase78_merge_advance');
    a.emit(0x8b, 0x56, 0x08); // current end low
    a.emit(0x3b, 0x47, 0x08); // previous end low
    a.jbe('phase78_merge_advance');
    a.label('phase78_merge_update_end');
    a.emit(0x8b, 0x46, 0x08, 0x89, 0x47, 0x08); // copy end low
    a.emit(0x8b, 0x46, 0x0c, 0x89, 0x47, 0x0c); // copy end high
    a.jmp('phase78_merge_advance');
    a.label('phase78_merge_append');
    // Destination is table[write]; copy the complete 16-byte record.
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_WRITE_ADDRESS);
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_PAGE_EXTENT_SIZE);
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE);
    a.emit(0x89, 0xc7); // EDI = output slot
    a.emit(0x8b, 0x06, 0x89, 0x07);
    a.emit(0x8b, 0x46, 0x04, 0x89, 0x47, 0x04);
    a.emit(0x8b, 0x46, 0x08, 0x89, 0x47, 0x08);
    a.emit(0x8b, 0x46, 0x0c, 0x89, 0x47, 0x0c);
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_WRITE_ADDRESS);
    a.label('phase78_merge_advance');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_READ_ADDRESS);
    a.jmp('phase78_merge_loop');
    a.label('phase78_merge_done');
    // Publish compacted count only after the complete pass.
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_WRITE_ADDRESS);
    a.emit(0xa3); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS);
    // Verify adjacent output extents are strictly separated (no overlap/touch).
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_READ_ADDRESS, 1);
    a.label('phase78_verify_loop');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_READ_ADDRESS);
    a.emit(0x8b, 0x15); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS);
    a.emit(0x39, 0xd0);
    a.jae('phase78_verify_done');
    a.emit(0x89, 0xc1);
    a.emit(0x6b, 0xc9, X86_BOOTSTRAP_PAGE_EXTENT_SIZE);
    a.emit(0x81, 0xc1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE);
    a.emit(0x89, 0xcf); // EDI = current record
        // Compare previous end (current record - 16 + 8/12) against current start.
    a.emit(0x8b, 0x57, 0xfc); // previous end high at edi-4
    a.emit(0x3b, 0x57, 0x04); // current start high
    a.ja('panic32');
    a.jb('phase78_verify_next');
    a.emit(0x8b, 0x47, 0xf8); // previous end low at edi-8
    a.emit(0x3b, 0x07); // current start low
    a.jae('panic32'); // touching intervals should have been merged too
    a.label('phase78_verify_next');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_READ_ADDRESS);
    a.jmp('phase78_verify_loop');
    a.label('phase78_verify_done');
    a.emit(0x60); a.printLabel32('msg_mb2_extents_merged', 'print_serial32'); a.emit(0x61);
    // Verify the resulting table is monotonically ordered before reporting OK.
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_PAGE_EXTENT_SORT_INDEX_ADDRESS, 1);
    a.label('phase77_verify_loop');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_SORT_INDEX_ADDRESS); // mov eax, [i]
    a.emit(0x8b, 0x15); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS); // mov edx, [count]
    a.emit(0x39, 0xd0); // cmp eax, edx
    a.jae('phase77_verify_done');
    a.emit(0x89, 0xc1); // mov ecx, eax
    a.emit(0x6b, 0xc9, X86_BOOTSTRAP_PAGE_EXTENT_SIZE); // imul ecx, ecx, 16
    a.emit(0x81, 0xc1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE); // add ecx, table base
    a.emit(0x89, 0xcf); // mov edi, ecx
    a.emit(0x8b, 0x57, 0xf4); // mov edx, [edi-12] previous start high
    a.emit(0x3b, 0x57, 0x04); // cmp edx, [edi+4] current start high
    a.ja('panic32');
    a.jb('phase77_verify_next');
    a.emit(0x8b, 0x47, 0xf0); // mov eax, [edi-16] previous start low
    a.emit(0x3b, 0x07); // cmp eax, [edi] current start low
    a.ja('panic32');
    a.label('phase77_verify_next');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_SORT_INDEX_ADDRESS); // inc [i]
    a.jmp('phase77_verify_loop');
    a.label('phase77_verify_done');
    a.emit(0x61); // popad
    a.jmp('mb2_native_advance');

    a.label('mb2_native_module');
    a.emit(0x60); a.printLabel32('msg_diag_module_begin', 'print_serial32'); a.emit(0x61);
    a.emit(0x83, 0xf9, 0x11); // cmp ecx, 17
    a.jb('panic32');
    a.emit(0x8b, 0x46, 0x08); // mov eax, [esi+8] module start
    a.emit(0x3b, 0x46, 0x0c); // cmp eax, [esi+12] module end
    a.jae('panic32');
    a.emit(0x57, 0x51); // push edi; push ecx
    a.emit(0x8d, 0x7e, 0x10); // lea edi, [esi+16]
    a.emit(0x8b, 0x4e, 0x04); // mov ecx, [esi+4]
    a.emit(0x83, 0xe9, 0x10); // sub ecx, 16
    a.emit(0x31, 0xc0); // xor eax, eax
    a.emit(0xf2, 0xae); // repne scasb (NUL required within tag)
    a.jne('panic32');
    a.emit(0x59, 0x5f); // pop ecx; pop edi
    a.emit(0x60); a.printLabel32('msg_diag_module_done', 'print_serial32'); a.emit(0x61);
    // Catalog module physical [start,end) for later page-rounded subtraction.
    a.emit(0x60);
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.emit(0x3d); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_CAPACITY);
    a.jae('panic32');
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_RESERVATION_CATALOG_RECORD_SIZE);
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE);
    a.emit(0x89, 0xc7);
    a.emit(0x8b, 0x46, 0x08, 0x89, 0x07);
    a.emit(0x31, 0xc0, 0x89, 0x47, 0x04);
    a.emit(0x8b, 0x46, 0x0c, 0x89, 0x47, 0x08);
    a.emit(0x31, 0xc0, 0x89, 0x47, 0x0c);
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.emit(0x61);
    a.jmp('mb2_native_advance');

    a.label('mb2_native_framebuffer');
    a.emit(0x60); a.printLabel32('msg_diag_fb_begin', 'print_serial32'); a.emit(0x61);
    a.emit(0x83, 0xf9, 0x20); // cmp ecx, 32
    a.jb('panic32');
    a.emit(0x66, 0x83, 0x7e, 0x1e, 0x00); // reserved word must be zero
    a.jne('panic32');
    a.emit(0x8b, 0x46, 0x08); // framebuffer address low dword
    a.emit(0x0b, 0x46, 0x0c); // or eax, address high dword
    a.emit(0x85, 0xc0);
    a.je('panic32');
    a.emit(0x83, 0x7e, 0x10, 0x00); // pitch nonzero
    a.je('panic32');
    a.emit(0x83, 0x7e, 0x14, 0x00); // width nonzero
    a.je('panic32');
    a.emit(0x83, 0x7e, 0x18, 0x00); // height nonzero
    a.je('panic32');
    a.emit(0x80, 0x7e, 0x1c, 0x00); // bits_per_pixel nonzero
    a.je('panic32');
    a.emit(0x60); a.printLabel32('msg_diag_fb_done', 'print_serial32'); a.emit(0x61);
    // Catalog framebuffer [address, address + pitch*height), checked uint64.
    a.emit(0x60);
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.emit(0x3d); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_CAPACITY);
    a.jae('panic32');
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_RESERVATION_CATALOG_RECORD_SIZE);
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE);
    a.emit(0x89, 0xc7);
    a.emit(0x8b, 0x46, 0x10);
    a.emit(0xf7, 0x66, 0x18); // mul dword [height] => edx:eax
    a.emit(0x85, 0xd2);
    a.jne('phase79_fb_size_ok');
    a.emit(0x85, 0xc0);
    a.je('panic32');
    a.label('phase79_fb_size_ok');
    a.emit(0x8b, 0x5e, 0x08);
    a.emit(0x8b, 0x4e, 0x0c);
    a.emit(0x89, 0x5f, 0x00);
    a.emit(0x89, 0x4f, 0x04);
    a.emit(0x01, 0xc3);
    a.emit(0x11, 0xd1);
    a.jb('panic32');
    a.emit(0x89, 0x5f, 0x08);
    a.emit(0x89, 0x4f, 0x0c);
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.emit(0x61);
    a.jmp('mb2_native_advance');

    a.label('mb2_native_end');
    a.emit(0x83, 0xf9, 0x08); // End tag size must be exactly 8
    a.jne('panic32');
    a.emit(0x8d, 0x04, 0x0e); // lea eax, [esi+ecx]
    a.emit(0x39, 0xf8); // cmp eax, edi (End must finish total_size)
    a.jne('panic32');
    a.emit(0x85, 0xdb); // memory-map tag required
    a.je('panic32');
    a.emit(0x60); a.printLabel32('msg_diag_end_tag_ok', 'print_serial32'); a.emit(0x61);
    a.jmp('mb2_native_parse_done');

    a.label('mb2_native_advance');
    a.emit(0x89, 0xc8); // mov eax, ecx
    a.emit(0x83, 0xc0, 0x07); // add eax, 7
    a.jb('panic32');
    a.emit(0x83, 0xe0, 0xf8); // align size to 8
    a.emit(0x01, 0xc6); // add esi, eax
    a.jb('panic32');
    a.emit(0x60); a.printLabel32('msg_diag_tag_pointer_add_ok', 'print_serial32'); a.emit(0x61);
    a.emit(0x39, 0xfe); // cmp esi, edi
    a.ja('mb2_native_tag_bounds_fail');
    a.emit(0x60); a.printLabel32('msg_diag_tag_bounds_ok', 'print_serial32'); a.emit(0x61);
    a.emit(0x60); a.printLabel32('msg_diag_tag_advance_ok', 'print_serial32'); a.emit(0x61);
    a.jmp('mb2_native_tag_loop');

    a.label('mb2_native_tag_bounds_fail');
    a.emit(0x60); a.printLabel32('msg_diag_tag_bounds_fail', 'print_serial32'); a.emit(0x61);
    a.jmp('panic32');


    a.label('mb2_native_parse_done');
    // Phase 80: round exclusions to 4 KiB pages, sort by uint64 start, merge.
    a.emit(0x60);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_RESERVATION_NORMALIZE_INDEX_ADDRESS, 0);
    a.label('phase80_round_loop');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_RESERVATION_NORMALIZE_INDEX_ADDRESS);
    a.emit(0x8b, 0x15); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.emit(0x39, 0xd0); a.jae('phase80_round_done');
    a.emit(0x89, 0xc1); a.emit(0x6b, 0xc9, 16);
    a.emit(0x81, 0xc1); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE);
    a.emit(0x89, 0xce);
    a.emit(0x8b, 0x06); a.emit(0x25, 0x00, 0xf0, 0xff, 0xff); a.emit(0x89, 0x06);
    a.emit(0x8b, 0x46, 0x08); a.emit(0x05, 0xff, 0x0f, 0x00, 0x00);
    a.emit(0x8b, 0x56, 0x0c); a.emit(0x83, 0xd2, 0x00); a.jb('panic32');
    a.emit(0x25, 0x00, 0xf0, 0xff, 0xff); a.emit(0x89, 0x46, 0x08); a.emit(0x89, 0x56, 0x0c);
    a.emit(0x8b, 0x56, 0x04); a.emit(0x3b, 0x56, 0x0c); a.ja('panic32'); a.jb('phase80_round_next');
    a.emit(0x8b, 0x06); a.emit(0x3b, 0x46, 0x08); a.jae('panic32');
    a.label('phase80_round_next');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_NORMALIZE_INDEX_ADDRESS); a.jmp('phase80_round_loop');
    a.label('phase80_round_done');
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_RESERVATION_SORT_INDEX_ADDRESS, 1);
    a.label('phase80_sort_outer');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_RESERVATION_SORT_INDEX_ADDRESS);
    a.emit(0x8b, 0x15); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.emit(0x39, 0xd0); a.jae('phase80_sort_done');
    a.emit(0xa3); a.emit32(X86_BOOTSTRAP_RESERVATION_SORT_CURSOR_ADDRESS);
    a.label('phase80_sort_inner');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_RESERVATION_SORT_CURSOR_ADDRESS);
    a.emit(0x85, 0xc0); a.je('phase80_sort_outer_next');
    a.emit(0x89, 0xc1); a.emit(0x6b, 0xc9, 16);
    a.emit(0x81, 0xc1); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE);
    a.emit(0x89, 0xce); a.emit(0x8d, 0x79, 0xf0);
    a.emit(0x8b, 0x57, 0x04); a.emit(0x3b, 0x56, 0x04);
    a.ja('phase80_sort_swap'); a.jb('phase80_sort_outer_next');
    a.emit(0x8b, 0x07); a.emit(0x3b, 0x06); a.jbe('phase80_sort_outer_next');
    a.label('phase80_sort_swap');
    a.emit(0xff, 0x76, 0x00); a.emit(0xff, 0x76, 0x04); a.emit(0xff, 0x76, 0x08); a.emit(0xff, 0x76, 0x0c);
    a.emit(0x8b, 0x07, 0x89, 0x46, 0x00);
    a.emit(0x8b, 0x47, 0x04, 0x89, 0x46, 0x04);
    a.emit(0x8b, 0x47, 0x08, 0x89, 0x46, 0x08);
    a.emit(0x8b, 0x47, 0x0c, 0x89, 0x46, 0x0c);
    a.emit(0x58, 0x89, 0x47, 0x0c); a.emit(0x58, 0x89, 0x47, 0x08);
    a.emit(0x58, 0x89, 0x47, 0x04); a.emit(0x58, 0x89, 0x07);
    a.emit(0xff, 0x0d); a.emit32(X86_BOOTSTRAP_RESERVATION_SORT_CURSOR_ADDRESS); a.jmp('phase80_sort_inner');
    a.label('phase80_sort_outer_next');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_SORT_INDEX_ADDRESS); a.jmp('phase80_sort_outer');
    a.label('phase80_sort_done');
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_RESERVATION_MERGE_READ_ADDRESS, 0);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_RESERVATION_MERGE_WRITE_ADDRESS, 0);
    a.label('phase80_merge_loop');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_RESERVATION_MERGE_READ_ADDRESS);
    a.emit(0x8b, 0x15); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.emit(0x39, 0xd0); a.jae('phase80_merge_done');
    a.emit(0x89, 0xc1); a.emit(0x6b, 0xc9, 16);
    a.emit(0x81, 0xc1); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE); a.emit(0x89, 0xce);
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_RESERVATION_MERGE_WRITE_ADDRESS);
    a.emit(0x85, 0xc0); a.je('phase80_merge_append');
    a.emit(0x48); a.emit(0x6b, 0xc0, 16); a.emit(0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE); a.emit(0x89, 0xc7);
    a.emit(0x8b, 0x56, 0x04); a.emit(0x3b, 0x57, 0x0c);
    a.ja('phase80_merge_append'); a.jb('phase80_merge_overlap');
    a.emit(0x8b, 0x06); a.emit(0x3b, 0x47, 0x08); a.ja('phase80_merge_append');
    a.label('phase80_merge_overlap');
    a.emit(0x8b, 0x56, 0x0c); a.emit(0x3b, 0x57, 0x0c);
    a.ja('phase80_merge_update'); a.jb('phase80_merge_advance');
    a.emit(0x8b, 0x56, 0x08); a.emit(0x3b, 0x47, 0x08); a.jbe('phase80_merge_advance');
    a.label('phase80_merge_update');
    a.emit(0x8b, 0x46, 0x08, 0x89, 0x47, 0x08); a.emit(0x8b, 0x46, 0x0c, 0x89, 0x47, 0x0c); a.jmp('phase80_merge_advance');
    a.label('phase80_merge_append');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_RESERVATION_MERGE_WRITE_ADDRESS);
    a.emit(0x6b, 0xc0, 16); a.emit(0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE); a.emit(0x89, 0xc7);
    a.emit(0x8b, 0x06, 0x89, 0x07); a.emit(0x8b, 0x46, 0x04, 0x89, 0x47, 0x04);
    a.emit(0x8b, 0x46, 0x08, 0x89, 0x47, 0x08); a.emit(0x8b, 0x46, 0x0c, 0x89, 0x47, 0x0c);
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_MERGE_WRITE_ADDRESS);
    a.label('phase80_merge_advance');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_MERGE_READ_ADDRESS); a.jmp('phase80_merge_loop');
    a.label('phase80_merge_done');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_RESERVATION_MERGE_WRITE_ADDRESS);
    a.emit(0xa3); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.emit(0x61);
    // Phase 82: native bounded subtraction of normalized exclusions from
    // sorted page-aligned firmware candidate extents. Output is a separate
    // table; the Phase 76 input catalog remains intact for diagnostics.
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS, 0);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_SUBTRACT_CANDIDATE_INDEX_ADDRESS, 0);
    a.label('phase82_candidate_loop');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_SUBTRACT_CANDIDATE_INDEX_ADDRESS);
    a.emit(0x8b, 0x15); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS);
    a.emit(0x39, 0xd0); a.jae('phase82_done');
    a.emit(0x89, 0xc1); a.emit(0x6b, 0xc9, X86_BOOTSTRAP_PAGE_EXTENT_SIZE);
    a.emit(0x81, 0xc1); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE);
    a.emit(0x89, 0xce); // ESI = candidate
    a.emit(0x8b, 0x06); a.emit(0xa3); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_LOW_ADDRESS);
    a.emit(0x8b, 0x46, 0x04); a.emit(0xa3); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_HIGH_ADDRESS);
    a.emit(0x8b, 0x46, 0x08); a.emit(0xa3); a.emit32(X86_BOOTSTRAP_SUBTRACT_END_LOW_ADDRESS);
    a.emit(0x8b, 0x46, 0x0c); a.emit(0xa3); a.emit32(X86_BOOTSTRAP_SUBTRACT_END_HIGH_ADDRESS);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_SUBTRACT_RESERVATION_INDEX_ADDRESS, 0);
    a.label('phase82_reservation_loop');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_SUBTRACT_RESERVATION_INDEX_ADDRESS);
    a.emit(0x8b, 0x15); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.emit(0x39, 0xd0); a.jae('phase82_candidate_tail');
    a.emit(0x89, 0xc1); a.emit(0x6b, 0xc9, X86_BOOTSTRAP_RESERVATION_CATALOG_RECORD_SIZE);
    a.emit(0x81, 0xc1); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE);
    a.emit(0x89, 0xcf); // EDI = exclusion
    // If exclusion.end <= cursor, advance to the next exclusion.
    a.emit(0x8b, 0x57, 0x0c); a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_HIGH_ADDRESS);
    a.emit(0x39, 0xca); a.jb('phase82_next_reservation'); a.ja('phase82_test_after');
    a.emit(0x8b, 0x57, 0x08); a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_LOW_ADDRESS);
    a.emit(0x39, 0xca); a.jbe('phase82_next_reservation');
    a.label('phase82_test_after');
    // If exclusion.start >= candidate.end, remaining exclusions cannot overlap.
    a.emit(0x8b, 0x57, 0x04); a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_END_HIGH_ADDRESS);
    a.emit(0x39, 0xca); a.ja('phase82_candidate_tail'); a.jb('phase82_overlap');
    a.emit(0x8b, 0x17); a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_END_LOW_ADDRESS);
    a.emit(0x39, 0xca); a.jae('phase82_candidate_tail');
    a.label('phase82_overlap');
    // Emit the gap [cursor, exclusion.start) when it is non-empty.
    a.emit(0x8b, 0x57, 0x04); a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_HIGH_ADDRESS);
    a.emit(0x39, 0xca); a.ja('phase82_append_gap'); a.jb('phase82_gap_done');
    a.emit(0x8b, 0x17); a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_LOW_ADDRESS);
    a.emit(0x39, 0xca); a.jbe('phase82_gap_done');
    a.label('phase82_append_gap');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS);
    a.emit(0x3d); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_CAPACITY); a.jae('panic32');
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_FINAL_EXTENT_RECORD_SIZE);
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_TABLE_BASE); a.emit(0x89, 0xc2);
    a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_LOW_ADDRESS); a.emit(0x89, 0x0a);
    a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_HIGH_ADDRESS); a.emit(0x89, 0x4a, 0x04);
    a.emit(0x8b, 0x0f); a.emit(0x89, 0x4a, 0x08);
    a.emit(0x8b, 0x4f, 0x04); a.emit(0x89, 0x4a, 0x0c);
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS);
    a.label('phase82_gap_done');
    // Since the exclusion intersects the candidate, move cursor to its end.
    a.emit(0x8b, 0x47, 0x08); a.emit(0xa3); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_LOW_ADDRESS);
    a.emit(0x8b, 0x47, 0x0c); a.emit(0xa3); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_HIGH_ADDRESS);
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_SUBTRACT_RESERVATION_INDEX_ADDRESS);
    a.jmp('phase82_reservation_loop');
    a.label('phase82_next_reservation');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_SUBTRACT_RESERVATION_INDEX_ADDRESS);
    a.jmp('phase82_reservation_loop');
    a.label('phase82_candidate_tail');
    // Emit [cursor, candidate.end) if the cursor has not reached the end.
    a.emit(0x8b, 0x15); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_HIGH_ADDRESS);
    a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_END_HIGH_ADDRESS);
    a.emit(0x39, 0xca); a.jb('phase82_append_tail'); a.ja('phase82_candidate_done');
    a.emit(0x8b, 0x15); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_LOW_ADDRESS);
    a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_END_LOW_ADDRESS);
    a.emit(0x39, 0xca); a.jae('phase82_candidate_done');
    a.label('phase82_append_tail');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS);
    a.emit(0x3d); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_CAPACITY); a.jae('panic32');
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_FINAL_EXTENT_RECORD_SIZE);
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_TABLE_BASE); a.emit(0x89, 0xc2);
    a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_LOW_ADDRESS); a.emit(0x89, 0x0a);
    a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_CURSOR_HIGH_ADDRESS); a.emit(0x89, 0x4a, 0x04);
    a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_END_LOW_ADDRESS); a.emit(0x89, 0x4a, 0x08);
    a.emit(0x8b, 0x0d); a.emit32(X86_BOOTSTRAP_SUBTRACT_END_HIGH_ADDRESS); a.emit(0x89, 0x4a, 0x0c);
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS);
    a.label('phase82_candidate_done');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_SUBTRACT_CANDIDATE_INDEX_ADDRESS);
    a.jmp('phase82_candidate_loop');
    a.label('phase82_done');
    // Phase 86: validate the actual native output table before publishing it.
    // Count is bounded; every record must be non-empty, 4 KiB aligned, sorted,
    // and disjoint. Previous end is kept in the separately reserved scratch page.
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS);
    a.emit(0x3d); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_CAPACITY); a.ja('panic32');
    a.emit(0x89, 0xc7); // edi = stable count
    a.emit(0x31, 0xf6); // esi = index
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_LOW_ADDRESS, 0);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_HIGH_ADDRESS, 0);
    a.label('phase86_validate_loop');
    a.emit(0x39, 0xfe); a.jae('phase86_validate_done');
    a.emit(0x89, 0xf0);
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_FINAL_EXTENT_RECORD_SIZE);
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_TABLE_BASE);
    a.emit(0x8b, 0x08);
    a.emit(0x8b, 0x50, 0x04);
    a.emit(0x8b, 0x58, 0x08);
    a.emit(0x8b, 0x68, 0x0c);
    a.emit(0x39, 0xea); a.jb('phase86_record_nonempty'); a.ja('panic32');
    a.emit(0x39, 0xd9); a.jae('panic32');
    a.label('phase86_record_nonempty');
    a.emit(0xf7, 0xc1); a.emit32(0x00000fff); a.jne('panic32');
    a.emit(0xf7, 0xc3); a.emit32(0x00000fff); a.jne('panic32');
    a.emit(0x83, 0xfe, 0x00); a.je('phase86_first_record');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_HIGH_ADDRESS);
    a.emit(0x39, 0xd0); a.ja('panic32'); a.jb('phase86_ordered');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_LOW_ADDRESS);
    // Compare previousEndLow - currentStartLow; panic only when previous end is above the new start.
    a.emit(0x39, 0xc8); a.ja('panic32');
    a.label('phase86_ordered');
    a.label('phase86_first_record');
    a.emit(0x89, 0x1d); a.emit32(X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_LOW_ADDRESS);
    a.emit(0x89, 0x2d); a.emit32(X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_HIGH_ADDRESS);
    a.emit(0x46);
    a.jmp('phase86_validate_loop');
    a.label('phase86_validate_done');
    // Phase 88: prove every final extent is contained in a firmware candidate
    // and disjoint from every page-normalized reservation before publication.
    // Scratch is isolated in the separately reserved 0x278000 page.
    a.emit(0x60); // pushad
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS);
    a.emit(0xa3); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_COUNT_ADDRESS);
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_FINAL_CROSSCHECK_INDEX_ADDRESS, 0);
    a.label('phase88_final_loop');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_INDEX_ADDRESS);
    a.emit(0x3b, 0x05); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_COUNT_ADDRESS);
    a.jae('phase88_done');
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_FINAL_EXTENT_RECORD_SIZE);
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_FINAL_EXTENT_TABLE_BASE);
    a.emit(0x89, 0xc6); // esi = final extent
    a.emit(0x8b, 0x06, 0xa3); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_START_LOW_ADDRESS);
    a.emit(0x8b, 0x46, 0x04, 0xa3); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_START_HIGH_ADDRESS);
    a.emit(0x8b, 0x46, 0x08, 0xa3); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_END_LOW_ADDRESS);
    a.emit(0x8b, 0x46, 0x0c, 0xa3); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_END_HIGH_ADDRESS);

    // Find one candidate with candidate.start <= final.start and
    // candidate.end >= final.end. Absence of containment is a hard failure.
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_FINAL_CROSSCHECK_CANDIDATE_INDEX_ADDRESS, 0);
    a.label('phase88_candidate_loop');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_CANDIDATE_INDEX_ADDRESS);
    a.emit(0x3b, 0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS);
    a.jae('panic32');
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_PAGE_EXTENT_SIZE);
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE);
    a.emit(0x89, 0xc7); // edi = candidate
    // candidate.start <= final.start
    a.emit(0x8b, 0x57, 0x04);
    a.emit(0x3b, 0x15); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_START_HIGH_ADDRESS);
    a.ja('phase88_candidate_next');
    a.jb('phase88_candidate_start_ok');
    a.emit(0x8b, 0x07);
    a.emit(0x3b, 0x05); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_START_LOW_ADDRESS);
    a.ja('phase88_candidate_next');
    a.label('phase88_candidate_start_ok');
    // candidate.end >= final.end
    a.emit(0x8b, 0x57, 0x0c);
    a.emit(0x3b, 0x15); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_END_HIGH_ADDRESS);
    a.jb('phase88_candidate_next');
    a.ja('phase88_candidate_contained');
    a.emit(0x8b, 0x47, 0x08);
    a.emit(0x3b, 0x05); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_END_LOW_ADDRESS);
    a.jb('phase88_candidate_next');
    a.label('phase88_candidate_contained');

    // A final extent must not intersect any normalized reservation.
    a.storeMem32AbsImm32Mode32(X86_BOOTSTRAP_FINAL_CROSSCHECK_RESERVATION_INDEX_ADDRESS, 0);
    a.label('phase88_reservation_loop');
    a.emit(0xa1); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_RESERVATION_INDEX_ADDRESS);
    a.emit(0x3b, 0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS);
    a.jae('phase88_final_next');
    a.emit(0x6b, 0xc0, X86_BOOTSTRAP_RESERVATION_CATALOG_RECORD_SIZE);
    a.emit(0x05); a.emit32(X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE);
    a.emit(0x89, 0xc7); // edi = normalized reservation
    // reservation.end <= final.start => no overlap
    a.emit(0x8b, 0x57, 0x0c);
    a.emit(0x3b, 0x15); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_START_HIGH_ADDRESS);
    a.jb('phase88_reservation_next');
    a.ja('phase88_check_reservation_start');
    a.emit(0x8b, 0x47, 0x08);
    a.emit(0x3b, 0x05); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_START_LOW_ADDRESS);
    a.jbe('phase88_reservation_next');
    a.label('phase88_check_reservation_start');
    // reservation.start >= final.end => overlap; otherwise the ranges overlap.
    a.emit(0x8b, 0x57, 0x04);
    a.emit(0x3b, 0x15); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_END_HIGH_ADDRESS);
    a.ja('panic32');
    a.jb('phase88_reservation_next');
    a.emit(0x8b, 0x07);
    a.emit(0x3b, 0x05); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_END_LOW_ADDRESS);
    a.jae('panic32');
    a.label('phase88_reservation_next');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_RESERVATION_INDEX_ADDRESS);
    a.jmp('phase88_reservation_loop');

    a.label('phase88_final_next');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_INDEX_ADDRESS);
    a.jmp('phase88_final_loop');
    a.label('phase88_candidate_next');
    a.emit(0xff, 0x05); a.emit32(X86_BOOTSTRAP_FINAL_CROSSCHECK_CANDIDATE_INDEX_ADDRESS);
    a.jmp('phase88_candidate_loop');
    a.label('phase88_done');
    a.emit(0x61); // popad
    a.emit(0x60); a.printLabel32('msg_mb2_final_extents_crosschecked', 'print_serial32'); a.emit(0x61);
    a.printLabel32('msg_mb2_final_extents_validated', 'print_serial32');
    // Publish a completion marker only after the entire bounded output table is built.
    a.emit(0x60); a.printLabel32('msg_mb2_reservations_subtracted', 'print_serial32'); a.emit(0x61);
    a.emit(0x60); a.printLabel32('msg_mb2_reservations_normalized', 'print_serial32'); a.emit(0x61);
    a.emit(0x60); a.printLabel32('msg_mb2_reservations_catalogued', 'print_serial32'); a.emit(0x61);
    // Restore the copied-MBI base expected by the existing boot continuation.
    a.movRegImm32(Reg64.RDI, this.MULTIBOOT2_COPY_BUFFER_ADDR);
    a.printLabel32('msg_mb2_ok', 'print_serial32');
    a.printLabel32('msg_mb2_copy_ok', 'print_serial32');
    a.printLabel32('msg_mb2_parse_ok', 'print_serial32');
    a.printLabel32('msg_mb2_ranges_ok', 'print_serial32');
    a.printLabel32('msg_mb2_classify_ok', 'print_serial32');
    a.printLabel32('msg_mb2_page_audit_ok', 'print_serial32');

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

    // Helper 32-bit Serial Print: ESI -> 0-terminated string (with bounded COM1 LSR THRE wait)
    a.label('print_serial32');
    a.emit(0x51); // push ecx
    a.label('print_serial32_next');
    a.emit(0xac); // lodsb
    a.emit(0x84, 0xc0); // test al, al
    a.je('print_serial32_done');
    a.emit(0x88, 0xc4); // mov ah, al
    a.movRegImm32(Reg64.RCX, 0x0010_0000); // bounded LSR retry counter
    a.label('print_serial32_wait');
    a.emit(0x66, 0xba, 0xfd, 0x03); // mov dx, 0x3FD (LSR)
    a.emit(0xec); // in al, dx
    a.emit(0xa8, 0x20); // test al, 0x20 (THRE)
    a.jne('print_serial32_send');
    a.emit(0xff, 0xc9); // dec ecx
    a.jne('print_serial32_wait');
    a.label('print_serial32_send');
    a.emit(0x88, 0xe0); // mov al, ah
    a.emit(0x66, 0xba, 0xf8, 0x03); // mov dx, 0x3F8
    a.emit(0xee); // out dx, al
    a.jmp('print_serial32_next');
    a.label('print_serial32_done');
    a.emit(0x59); // pop ecx
    a.emit(0xc3); // ret

    a.label('panic32_cpu');
    a.jmp('panic32');
    a.label('panic32');
    // Tulis 0x01 (32-bit) ke ISA Debug Exit Port 0xF4 (exit_code = 3)
    a.emit(0x66, 0xba, 0xf4, 0x00); // mov dx, 0xF4
    a.movRegImm32(Reg64.RAX, 1);    // mov eax, 1
    a.emit(0xef);                   // out dx, eax
    a.emit(0xfa, 0xf4, 0xeb, 0xfd); // cli; hlt; jmp $-1

    // =========================================================================
    // BAGIAN 4: 64-BIT LONG MODE KERNEL ENTRY POINT (entry64)
    // Catatan: EBX masih menyimpan mbi_ptr, EBP menyimpan mb2_magic
    // =========================================================================
    a.label('entry64');
    a.emit(0xfa, 0xfc); // cli; cld
    // Set data segments = 0x10 (64-bit Kernel Data), FS=GS=0
    a.emit(0x66, 0xb8, 0x10, 0x00, 0x8e, 0xd8, 0x8e, 0xc0, 0x8e, 0xd0);
    a.emit(0x31, 0xc0, 0x8e, 0xe0, 0x8e, 0xe8); // xor eax, eax; mov fs, ax; mov gs, ax
    a.movRegImm64(Reg64.RSP, BigInt(this.KERNEL_STACK_TOP));

    // Mask semua IRQ legacy 8259 PIC (Port 0x21 & 0xA1 = 0xFF) dan bersihkan EOI tertunda
    a.emit(0xb0, 0xff, 0xe6, 0x21, 0xe6, 0xa1);
    a.emit(0xb0, 0x20, 0xe6, 0xa0, 0xe6, 0x20);

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

    // Vector 6 (#UD - menangkap gagal CPL==3 di user-test, dengan IST 1)
    a.movRegImm32(Reg64.RAX, 6);
    a.movRegLabel64(Reg64.RBX, 'isr_ud');
    a.movRegImm32(Reg64.RDX, 1); // IST 1
    a.call('set_idt_gate');

    // Vector 8 (#DF - Double Fault menggunakan IST 1)
    a.movRegImm32(Reg64.RAX, 8);
    a.movRegLabel64(Reg64.RBX, 'isr_df');
    a.movRegImm32(Reg64.RDX, 1); // IST 1
    a.call('set_idt_gate');

    // Vector 13 (#GP - General Protection Fault menggunakan IST 1)
    a.movRegImm32(Reg64.RAX, 13);
    a.movRegLabel64(Reg64.RBX, 'isr_gp');
    a.movRegImm32(Reg64.RDX, 1); // IST 1
    a.call('set_idt_gate');

    // Vector 14 (#PF - Hardware Page Fault Isolator, RSP0 TSS saat Ring 3 -> Ring 0)
    a.movRegImm32(Reg64.RAX, 14);
    a.movRegLabel64(Reg64.RBX, 'isr_pf');
    a.emit(0x31, 0xd2); // IST 0
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
    // Bootstrap CPU-local syscall context (GS base is kernel-local; KERNEL_GS_BASE is user GS=0).
    // User entry performs SWAPGS; syscall/exception entry swaps back to this kernel-local area.
    a.movRegImm32(Reg64.RCX, 0xc000_0101); // IA32_GS_BASE
    a.movRegImm32(Reg64.RAX, this.CPU_LOCAL_BASE);
    a.emit(0x31, 0xd2, 0x0f, 0x30); // xor edx, edx; wrmsr
    a.movRegImm32(Reg64.RCX, 0xc000_0102); // IA32_KERNEL_GS_BASE = user GS base 0
    a.emit(0x31, 0xc0, 0x31, 0xd2, 0x0f, 0x30); // xor eax, eax; xor edx, edx; wrmsr
    a.movRegImm64(Reg64.RAX, BigInt(this.CPU_LOCAL_SYSCALL_STACK_TOP));
    a.emit(0x65, 0x48, 0x89, 0x04, 0x25, 0x00, 0x00, 0x00, 0x00); // mov gs:[0], rax (syscall stack top)

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

    // Higher-Half kernel mapping (PDPT_HIGH[510]) dan direct map (PDPT_HIGH[0]).
    // Direct map dipisahkan ke PD sendiri agar setiap huge page dapat diberi NX.
    a.storeMem64AbsImm32(this.PDPT_HIGH_ADDR + 510 * 8, this.PD_HIGH_ADDR | 0x03);
    a.storeMem64AbsImm32(this.PDPT_HIGH_ADDR + 0, this.PD_DIRECT_ADDR | 0x03);

    // Direct physical map: FFFF800000000000 -> physical 0..64 MiB.
    // Setiap entri adalah 2 MiB RW + NX (bila CPU mendukung NX).
    for (let page = 0; page < 32; page++) {
      const physicalBase = page * 0x20_0000;
      a.movRegImm64(Reg64.RAX, BigInt(physicalBase | 0x83));
      a.emit(0x4c, 0x09, 0xf8); // Tambahkan bit NX dari R15 jika didukung.
      a.storeMem64Abs(this.PD_DIRECT_ADDR + page * 8, Reg64.RAX);
    }
    a.storeMem64AbsImm32(this.PD_HIGH_ADDR + 0, 0x0000_0083);
    a.storeMem64AbsImm32(this.PD_HIGH_ADDR + 8, 0x0020_0083);
    a.storeMem64AbsImm32(this.PD_HIGH_ADDR + 16, 0x0040_0083);
    a.storeMem64AbsImm32(this.PD_HIGH_ADDR + 24, 0x0060_0083);

    // Process A Page Tables (PML4_A)
    a.storeMem64AbsImm32(this.PML4_A_ADDR + 0, this.PDPT_LOW_A_ADDR | 0x07);     // User walk OK
    a.storeMem64AbsImm32(this.PML4_A_ADDR + 511 * 8, this.PDPT_HIGH_ADDR | 0x03); // Higher-half kernel, supervisor only.
    a.storeMem64AbsImm32(this.PML4_A_ADDR + 256 * 8, this.PDPT_HIGH_ADDR | 0x03); // Direct map, supervisor only.
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
    a.storeMem64AbsImm32(this.PML4_B_ADDR + 256 * 8, this.PDPT_HIGH_ADDR | 0x03);
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

    // Uji akses tulis/baca melalui direct map fisik pada alamat 7 MiB.
    // Jika pemetaan tidak aktif, hardware #PF Ring 0 akan menghentikan boot.
    a.movRegImm64(Reg64.RAX, 0xFFFF_8000_0070_0000n);
    a.movRegImm64(Reg64.RBX, 0x4E55_5341_4D41_5031n); // "NUSAMAP1"
    a.emit(0x48, 0x89, 0x18); // mov [rax], rbx
    a.emit(0x48, 0x8b, 0x08); // mov rcx, [rax]
    a.emit(0x48, 0x39, 0xd9); // cmp rcx, rbx
    a.jne('panic64_direct_map');
    a.printLabel64('msg_direct_map_ok', 'print_serial64');

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

    // Masuki Ring 3 lewat IRETQ pada Proses A (CR3 = PML4_A, CS = 0x23, SS = 0x1B, IF = 0)
    a.movRegImm64(Reg64.RCX, BigInt(this.PML4_A_ADDR));
    a.emit(0x0f, 0x22, 0xd9); // mov cr3, rcx
    a.emit(0x68); a.emit32(0x1b);                      // push USER_DATA (0x1B)
    a.emit(0x68); a.emit32(this.USER_STACK_VIRT_RSP);  // push USER_RSP
    a.emit(0x68); a.emit32(0x002);                     // push RFLAGS (IF=0 agar IRQ legacy tidak mengganggu bare-metal test)
    a.emit(0x68); a.emit32(0x23);                      // push USER_CODE (0x23)
    a.emit(0x50);                                      // push rax (e_entry)
    // Bersihkan register GP sebelum masuk Ring 3
    a.emit(0x31, 0xc0, 0x31, 0xdb, 0x31, 0xc9, 0x31, 0xd2, 0x31, 0xf6, 0x31, 0xff);
    a.emit(0x0f, 0x01, 0xf8); // swapgs: expose user GS=0 before IRETQ
    a.emit(0x48, 0xcf); // iretq!

    // -------------------------------------------------------------------------
    // Kembali ke Ring 0 setelah Process A memanggil syscall SYS_PROCESS_EXIT(0)
    // -------------------------------------------------------------------------
    a.label('after_proc_a');
    a.emit(0xfc); // cld
    // Bit 0=PROCESS_ID, bit 1=CONSOLE_WRITE valid, bit 2=CONSOLE_WRITE invalid ditolak.
    // Ketiganya wajib terjadi sebelum proses dianggap lulus.
    a.loadMem64Abs(Reg64.RAX, this.STATE_SYSCALL_FLAGS);
    a.emit(0x48, 0x83, 0xf8, 0x07); // cmp rax, 0b111
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

    // Switch CR3 ke PML4_B dan jalankan user-fault-test.elf di Ring 3 via IRETQ (IF=0)!
    a.movRegImm64(Reg64.RCX, BigInt(this.PML4_B_ADDR));
    a.emit(0x0f, 0x22, 0xd9); // mov cr3, rcx
    a.emit(0x68); a.emit32(0x1b);                      // push USER_DATA
    a.emit(0x68); a.emit32(this.USER_STACK_VIRT_RSP);  // push USER_RSP
    a.emit(0x68); a.emit32(0x002);                     // push RFLAGS (IF=0)
    a.emit(0x68); a.emit32(0x23);                      // push USER_CODE
    a.emit(0x50);                                      // push rax
    a.emit(0x31, 0xc0, 0x31, 0xdb, 0x31, 0xc9, 0x31, 0xd2, 0x31, 0xf6, 0x31, 0xff);
    a.emit(0x0f, 0x01, 0xf8); // swapgs: expose user GS=0 before IRETQ
    a.emit(0x48, 0xcf); // iretq -> Process B membaca 0xFFFFFFFF80000000 -> Hardware #PF!

    // -------------------------------------------------------------------------
    // Kembali ke Ring 0 setelah #PF Handler mengisolasi pelanggaran Ring 3 Proses B
    // -------------------------------------------------------------------------
    a.label('after_proc_b');
    a.emit(0xfc); // cld
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

    // ISA Debug Exit port 0xF4 (32-bit iosize=0x04) dengan nilai 0x00 (exit code QEMU = 1)
    a.emit(0x66, 0xba, 0xf4, 0x00); // mov dx, 0xF4
    a.emit(0x31, 0xc0);             // xor eax, eax
    a.emit(0xef);                   // out dx, eax
    // Safe Kernel Halt Loop
    a.emit(0xfa, 0xf4, 0xeb, 0xfd); // cli; hlt; jmp $-1

    // =========================================================================
    // BAGIAN 7: SUBROUTINES & EXCEPTION / SYSCALL HANDLERS (64-BIT)
    // =========================================================================

    // -------------------------------------------------------------------------
    // SYSCALL HANDLER (IA32_LSTAR)
    // Input: RAX=num, RDI=arg1, RSI=arg2, RCX=user_rip, R11=user_rflags
    // -------------------------------------------------------------------------
    a.label('syscall_entry');
    a.emit(0x0f, 0x01, 0xf8); // swapgs: switch from user GS to bootstrap CPU-local GS
    a.emit(0xfc); // cld
    a.emit(0x65, 0x48, 0x89, 0x24, 0x25, 0x08, 0x00, 0x00, 0x00); // mov gs:[8], rsp (user RSP)
    a.emit(0x65, 0x48, 0x8b, 0x24, 0x25, 0x00, 0x00, 0x00, 0x00); // mov rsp, gs:[0] (CPU-local syscall stack)
    a.emit(0x50); // push rax (syscall num)
    // Reload kernel DS=ES=0x10 karena IRETQ ke Ring 3 menolkan DS/ES
    a.emit(0x66, 0xb8, 0x10, 0x00, 0x8e, 0xd8, 0x8e, 0xc0);
    a.emit(0x58); // pop rax
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
    // Guard hardware bootstrap: hanya buffer di halaman kode user yang dipetakan
    // (0x00400000..0x00401000) boleh dibaca. Periksa batas akhir dengan carry
    // agar pointer+panjang tidak overflow atau melintasi halaman yang belum dipetakan.
    a.movRegImm64(Reg64.RBX, 0x0040_0000n);
    a.emit(0x48, 0x39, 0xdf); // cmp rdi, rbx
    a.jb('sys_write_efault');
    a.movRegImm64(Reg64.RBX, 0x0040_1000n);
    a.emit(0x48, 0x39, 0xdf); // cmp rdi, rbx
    a.jae('sys_write_efault');
    a.movRegImm64(Reg64.RBX, 4096n);
    a.emit(0x48, 0x39, 0xde); // cmp rsi, rbx
    a.ja('sys_write_efault');
    a.emit(0x48, 0x89, 0xfb); // mov rbx, rdi (simpan pointer, hitung batas akhir)
    a.emit(0x48, 0x01, 0xf3); // add rbx, rsi
    a.jb('sys_write_efault'); // carry => overflow
    a.emit(0x48, 0x81, 0xfb, 0x00, 0x10, 0x40, 0x00); // cmp rbx, 0x00401000
    a.ja('sys_write_efault');

    // Tulis byte langsung dari buffer User Space [RDI .. RDI+RSI] ke UART COM1 (0x3F8)!
    a.emit(0x48, 0x89, 0xf1); // mov rcx, rsi (loop count)
    a.emit(0x48, 0x85, 0xc9); // test rcx, rcx
    a.je('sys_write_done');
    a.emit(0x48, 0x89, 0xfb); // mov rbx, rdi
    a.label('sys_write_loop');
    a.emit(0x8a, 0x03); // mov al, [rbx]
    a.emit(0x88, 0xc4); // mov ah, al
    a.emit(0x51);       // push rcx (simpan sisa panjang byte)
    a.movRegImm32(Reg64.RCX, 0x0010_0000);
    a.label('sys_write_wait_tx');
    a.emit(0x66, 0xba, 0xfd, 0x03); // mov dx, 0x3FD (LSR)
    a.emit(0xec); // in al, dx
    a.emit(0xa8, 0x20); // test al, 0x20 (THRE)
    a.jne('sys_write_send_tx');
    a.emit(0xff, 0xc9); // dec ecx
    a.jne('sys_write_wait_tx');
    a.label('sys_write_send_tx');
    a.emit(0x59);       // pop rcx
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
    // Catat bahwa pointer tidak valid benar-benar ditolak oleh jalur hardware.
    a.loadMem64Abs(Reg64.RAX, this.STATE_SYSCALL_FLAGS);
    a.emit(0x48, 0x83, 0xc8, 0x04); // or rax, 4
    a.storeMem64Abs(this.STATE_SYSCALL_FLAGS, Reg64.RAX);
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
    a.emit(0x65, 0x48, 0x8b, 0x24, 0x25, 0x08, 0x00, 0x00, 0x00); // mov rsp, gs:[8] (restore user RSP)
    a.emit(0x0f, 0x01, 0xf8); // swapgs: restore user GS before SYSRETQ
    a.emit(0x48, 0x0f, 0x07); // sysretq (Ring 0 -> Ring 3, CS=0x23, SS=0x1B)

    // -------------------------------------------------------------------------
    // HARDWARE PAGE FAULT (#PF, IDT Vector 14) HANDLER
    // Stack saat masuk (Ring 3 -> Ring 0 via TSS.RSP0):
    // [RSP+0]=ErrorCode, [RSP+8]=RIP, [RSP+16]=CS, [RSP+24]=RFLAGS, [RSP+32]=UserRSP, [RSP+40]=UserSS
    // -------------------------------------------------------------------------
    a.label('isr_pf');
    a.emit(0xfc); // cld
    // Cek Error Code bit 2 (User fault)
    a.emit(0x48, 0x8b, 0x04, 0x24);       // mov rax, [rsp] (ErrorCode)
    a.emit(0xa8, 0x04);                   // test al, 4 (U/S bit)
    a.je('panic64_pf_ring0');
    // Cek CS pada stack frame [rsp+16] memiliki CPL == 3
    a.emit(0x48, 0x8b, 0x5c, 0x24, 0x10); // mov rbx, [rsp + 16] (CS)
    a.emit(0x48, 0x83, 0xe3, 0x03);       // and rbx, 3
    a.emit(0x48, 0x83, 0xfb, 0x03);       // cmp rbx, 3
    a.jne('panic64_pf_ring0');
    a.emit(0x0f, 0x01, 0xf8); // swapgs: user-origin fault now runs with kernel CPU-local GS

    // Pulihkan DS=ES=SS=0x10 & Page Table Kernel (CR3 = PML4_A) sebelum mengakses/mencetak lebih lanjut
    a.emit(0x66, 0xb8, 0x10, 0x00, 0x8e, 0xd8, 0x8e, 0xc0, 0x8e, 0xd0);
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

    // Exception Diagnostic & Panic Handlers (Mencetak VEC, ERR, RIP, CR2, CS, RSP, GPR lalu keluar 0xF4=0x01)
    a.label('isr_ud');
    a.emit(0x6a, 0x00); // push 0 (no HW error code)
    a.emit(0x6a, 0x06); // push 6 (#UD)
    a.jmp('exception_common_panic');

    a.label('isr_df');
    a.emit(0x6a, 0x08); // push 8 (#DF, HW pushed error code 0)
    a.jmp('exception_common_panic');

    a.label('isr_gp');
    a.emit(0x6a, 0x0d); // push 13 (#GP, HW pushed error code)
    a.jmp('exception_common_panic');

    a.label('isr_unhandled');
    a.emit(0x6a, 0x00); // push 0
    a.emit(0x68); a.emit32(0xff); // push 0xFF (unhandled vector)
    a.jmp('exception_common_panic');

    a.label('panic64_pf_ring0');
    a.emit(0x6a, 0x0e); // push 14 (#PF Ring0/non-user)

    a.label('exception_common_panic');
    a.emit(0xfa, 0xfc);       // cli; cld
    a.emit(0x50, 0x53, 0x51, 0x52); // push rax; push rbx; push rcx; push rdx
    // Stack offsets: +0x00=RDX, +0x08=RCX, +0x10=RBX, +0x18=RAX, +0x20=VEC, +0x28=ERR, +0x30=RIP, +0x38=CS, +0x40=RFLAGS, +0x48=RSP
    a.emit(0x66, 0xb8, 0x10, 0x00, 0x8e, 0xd8, 0x8e, 0xc0, 0x8e, 0xd0); // DS=ES=SS=0x10
    a.movRegImm64(Reg64.RAX, BigInt(this.PML4_A_ADDR));
    a.emit(0x0f, 0x22, 0xd8); // mov cr3, rax (kernel page tables)

    // Cetak pesan panic spesifik vektor
    a.emit(0x48, 0x8b, 0x44, 0x24, 0x20); // mov rax, [rsp + 0x20] (VEC)
    a.emit(0x48, 0x83, 0xf8, 0x06); a.je('exc_msg_ud');
    a.emit(0x48, 0x83, 0xf8, 0x08); a.je('exc_msg_df');
    a.emit(0x48, 0x83, 0xf8, 0x0d); a.je('exc_msg_gp');
    a.emit(0x48, 0x83, 0xf8, 0x0e); a.je('exc_msg_pf');
    a.printLabel64('msg_panic_unhandled', 'print_serial64');
    a.jmp('exc_print_regs');
    a.label('exc_msg_ud'); a.printLabel64('msg_panic_ud', 'print_serial64'); a.jmp('exc_print_regs');
    a.label('exc_msg_df'); a.printLabel64('msg_panic_df', 'print_serial64'); a.jmp('exc_print_regs');
    a.label('exc_msg_gp'); a.printLabel64('msg_panic_gp', 'print_serial64'); a.jmp('exc_print_regs');
    a.label('exc_msg_pf'); a.printLabel64('msg_panic_pf', 'print_serial64');

    a.label('exc_print_regs');
    a.printLabel64('msg_diag_vec', 'print_serial64');
    a.emit(0x48, 0x8b, 0x7c, 0x24, 0x20); a.call('print_hex64'); // VEC
    a.printLabel64('msg_diag_err', 'print_serial64');
    a.emit(0x48, 0x8b, 0x7c, 0x24, 0x28); a.call('print_hex64'); // ERR
    a.printLabel64('msg_diag_rip', 'print_serial64');
    a.emit(0x48, 0x8b, 0x7c, 0x24, 0x30); a.call('print_hex64'); // RIP
    a.printLabel64('msg_diag_cr2', 'print_serial64');
    a.emit(0x0f, 0x20, 0xd7);             a.call('print_hex64'); // CR2
    a.printLabel64('msg_diag_cs', 'print_serial64');
    a.emit(0x48, 0x8b, 0x7c, 0x24, 0x38); a.call('print_hex64'); // CS
    a.printLabel64('msg_diag_rsp', 'print_serial64');
    a.emit(0x48, 0x8b, 0x7c, 0x24, 0x48); a.call('print_hex64'); // RSP
    a.printLabel64('msg_diag_rax', 'print_serial64');
    a.emit(0x48, 0x8b, 0x7c, 0x24, 0x18); a.call('print_hex64'); // RAX
    a.printLabel64('msg_diag_rbx', 'print_serial64');
    a.emit(0x48, 0x8b, 0x7c, 0x24, 0x10); a.call('print_hex64'); // RBX
    a.printLabel64('msg_diag_rcx', 'print_serial64');
    a.emit(0x48, 0x8b, 0x7c, 0x24, 0x08); a.call('print_hex64'); // RCX
    a.printLabel64('msg_diag_rdx', 'print_serial64');
    a.emit(0x48, 0x8b, 0x7c, 0x24, 0x00); a.call('print_hex64'); // RDX
    a.printLabel64('msg_diag_nl', 'print_serial64');
    a.jmp('panic64_halt');

    a.label('panic64_direct_map');
    a.label('panic64_proc');
    a.label('panic64_isolation');
    a.label('panic64_fault');
    a.label('panic64_syscall');
    a.label('panic64_elf');
    a.printLabel64('msg_panic_kernel', 'print_serial64');

    a.label('panic64_halt');
    a.emit(0x66, 0xba, 0xf4, 0x00); // mov dx, 0xF4
    a.movRegImm32(Reg64.RAX, 1);    // mov eax, 1 (32-bit iosize=0x04 -> QEMU exit code 3)
    a.emit(0xef);                   // out dx, eax
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
    // Helper: print_serial64(RSI = null-terminated string) (bounded LSR polling)
    // -------------------------------------------------------------------------
    a.label('print_serial64');
    a.emit(0xfc);             // cld
    a.emit(0x51);             // push rcx
    a.label('print_serial64_next');
    a.emit(0xac);             // lodsb
    a.emit(0x84, 0xc0);       // test al, al
    a.je('print_serial64_done');
    a.emit(0x88, 0xc4);       // mov ah, al
    a.movRegImm32(Reg64.RCX, 0x0010_0000);
    a.label('print_serial64_wait');
    a.emit(0x66, 0xba, 0xfd, 0x03); // mov dx, 0x3FD (LSR)
    a.emit(0xec);             // in al, dx
    a.emit(0xa8, 0x20);       // test al, 0x20 (THRE)
    a.jne('print_serial64_send');
    a.emit(0xff, 0xc9);       // dec ecx
    a.jne('print_serial64_wait');
    a.label('print_serial64_send');
    a.emit(0x88, 0xe0);       // mov al, ah
    a.emit(0x66, 0xba, 0xf8, 0x03); // mov dx, 0x3F8
    a.emit(0xee);             // out dx, al
    a.jmp('print_serial64_next');
    a.label('print_serial64_done');
    a.emit(0x59);             // pop rcx
    a.emit(0xc3);

    // -------------------------------------------------------------------------
    // Helper: print_hex64(RDI = 64-bit value)
    // -------------------------------------------------------------------------
    a.label('print_hex64');
    a.emit(0x50, 0x51, 0x52, 0x57); // push rax; push rcx; push rdx; push rdi
    a.movRegImm32(Reg64.RCX, 16);   // 16 hex digits
    a.label('print_hex64_loop');
    a.emit(0x48, 0xc1, 0xc7, 0x04); // rol rdi, 4
    a.emit(0x48, 0x89, 0xf8);       // mov rax, rdi
    a.emit(0x24, 0x0f);             // and al, 0x0f
    a.emit(0x3c, 0x0a);             // cmp al, 10
    a.emit(0x72, 0x04);             // jb +4
    a.emit(0x04, 0x37);             // add al, 'A' - 10
    a.emit(0xeb, 0x02);             // jmp +2
    a.emit(0x04, 0x30);             // add al, '0'
    a.emit(0x88, 0xc4);             // mov ah, al
    a.emit(0x51);                   // push rcx
    a.movRegImm32(Reg64.RCX, 0x0010_0000);
    a.label('print_hex64_wait');
    a.emit(0x66, 0xba, 0xfd, 0x03);
    a.emit(0xec);
    a.emit(0xa8, 0x20);
    a.jne('print_hex64_send');
    a.emit(0xff, 0xc9);
    a.jne('print_hex64_wait');
    a.label('print_hex64_send');
    a.emit(0x59);                   // pop rcx
    a.emit(0x88, 0xe0);
    a.emit(0x66, 0xba, 0xf8, 0x03);
    a.emit(0xee);
    a.emit(0xff, 0xc9);             // dec ecx
    a.jne('print_hex64_loop');
    a.emit(0x5f, 0x5a, 0x59, 0x58); // pop rdi; pop rdx; pop rcx; pop rax
    a.emit(0xc3);

    // -------------------------------------------------------------------------
    // Helper ELF64 User Program Loader:
    // Input : RSI = ELF64 buffer ptr, RDI = dest code phys page, RDX = dest stack phys page
    // Output: RAX = e_entry virtual address
    // -------------------------------------------------------------------------
    a.label('load_elf64_user');
    a.emit(0xfc);             // cld
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
    a.label('msg_mb2_copy_ok');          a.emitCString(this.STAGE_2B_MULTIBOOT2_COPY);
    a.label('msg_mb2_parse_ok');         a.emitCString('NUSANTARA_MULTIBOOT2_PARSE_OK\r\n');
    a.label('msg_mb2_ranges_ok');        a.emitCString('NUSANTARA_MULTIBOOT2_RANGES_OK\r\n');
    a.label('msg_mb2_classify_ok');      a.emitCString('NUSANTARA_MULTIBOOT2_CLASSIFY_OK\r\n');
    a.label('msg_mb2_page_audit_ok');    a.emitCString('NUSANTARA_MULTIBOOT2_PAGE_AUDIT_OK\r\n');
    a.label('msg_mb2_extents_sorted');  a.emitCString('NUSANTARA_MULTIBOOT2_EXTENTS_SORTED_OK\r\n');
    a.label('msg_mb2_extents_merged');  a.emitCString('NUSANTARA_MULTIBOOT2_EXTENTS_MERGED_OK\r\n');
    a.label('msg_mb2_reservations_catalogued'); a.emitCString('NUSANTARA_MULTIBOOT2_RESERVATIONS_CATALOGUED_OK\r\n');
    a.label('msg_mb2_reservations_normalized'); a.emitCString('NUSANTARA_MULTIBOOT2_RESERVATIONS_NORMALIZED_OK\r\n');
    a.label('msg_mb2_reservations_subtracted'); a.emitCString('NUSANTARA_MULTIBOOT2_RESERVATIONS_SUBTRACTED_OK\r\n');
    a.label('msg_mb2_final_extents_validated'); a.emitCString('NUSANTARA_MULTIBOOT2_FINAL_EXTENTS_VALIDATED_OK\r\n');
    a.label('msg_mb2_final_extents_crosschecked'); a.emitCString('NUSANTARA_MULTIBOOT2_FINAL_EXTENTS_CROSSCHECK_OK\r\n');
    a.label('msg_diag_mmap_begin');      a.emitCString('NUSANTARA_DIAG_MMAP_BEGIN\r\n');
    a.label('msg_diag_mmap_done');       a.emitCString('NUSANTARA_DIAG_MMAP_DONE\r\n');
    a.label('msg_diag_module_begin');    a.emitCString('NUSANTARA_DIAG_MODULE_BEGIN\r\n');
    a.label('msg_diag_module_done');     a.emitCString('NUSANTARA_DIAG_MODULE_DONE\r\n');
    a.label('msg_diag_fb_begin');        a.emitCString('NUSANTARA_DIAG_FRAMEBUFFER_BEGIN\r\n');
    a.label('msg_diag_fb_done');         a.emitCString('NUSANTARA_DIAG_FRAMEBUFFER_DONE\r\n');
    a.label('msg_diag_end_tag_ok');      a.emitCString('NUSANTARA_DIAG_END_TAG_OK\r\n');
    a.label('msg_diag_tag_advance_ok'); a.emitCString('NUSANTARA_DIAG_TAG_ADVANCE_OK\r\n');
    a.label('msg_diag_after_mmap_restore');       a.emitCString('NUSANTARA_DIAG_AFTER_MMAP_RESTORE\r\n');
    a.label('msg_diag_tag_pointer_add_ok');       a.emitCString('NUSANTARA_DIAG_TAG_POINTER_ADD_OK\r\n');
    a.label('msg_diag_tag_bounds_ok');       a.emitCString('NUSANTARA_DIAG_TAG_BOUNDS_OK\r\n');
    a.label('msg_diag_tag_bounds_fail');       a.emitCString('NUSANTARA_DIAG_TAG_BOUNDS_FAIL\r\n');
    a.label('msg_diag_magic_ok');       a.emitCString('NUSANTARA_DIAG_MAGIC_OK\r\n');
    a.label('msg_diag_mbi_pointer_ok'); a.emitCString('NUSANTARA_DIAG_MBI_POINTER_OK\r\n');
    a.label('msg_diag_mbi_header_ok');  a.emitCString('NUSANTARA_DIAG_MBI_HEADER_OK\r\n');
    a.label('msg_diag_mbi_range_ok');   a.emitCString('NUSANTARA_DIAG_MBI_RANGE_OK\r\n');
    a.label('msg_diag_mbi_copy_ok');    a.emitCString('NUSANTARA_DIAG_MBI_COPY_OK\r\n');
    a.label('msg_cpu_ok');               a.emitCString(this.STAGE_3_LONG_MODE);
    a.label('msg_paging_ok');            a.emitCString(this.STAGE_4_PAGING);
    a.label('msg_gdt_ok');               a.emitCString(this.STAGE_5_GDT64);
    a.label('msg_long_entered');         a.emitCString(this.STAGE_6_LONG_ENTERED);
    a.label('msg_idt_ok');               a.emitCString(this.STAGE_7_IDT);
    a.label('msg_mem_ok');               a.emitCString(this.STAGE_8_MEM);
    a.label('msg_direct_map_ok');        a.emitCString(this.STAGE_8B_DIRECT_MAP);
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
    a.label('msg_diag_vec');             a.emitCString('NUSANTARA_EXCEPTION_DIAG VEC=0x');
    a.label('msg_diag_err');             a.emitCString(' ERR=0x');
    a.label('msg_diag_rip');             a.emitCString(' RIP=0x');
    a.label('msg_diag_cr2');             a.emitCString(' CR2=0x');
    a.label('msg_diag_cs');              a.emitCString(' CS=0x');
    a.label('msg_diag_rsp');             a.emitCString(' RSP=0x');
    a.label('msg_diag_rax');             a.emitCString(' RAX=0x');
    a.label('msg_diag_rbx');             a.emitCString(' RBX=0x');
    a.label('msg_diag_rcx');             a.emitCString(' RCX=0x');
    a.label('msg_diag_rdx');             a.emitCString(' RDX=0x');
    a.label('msg_diag_nl');              a.emitCString('\r\n');

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
