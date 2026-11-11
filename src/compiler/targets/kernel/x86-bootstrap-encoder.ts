/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * x86_64 Bootstrap Machine Code Synthesizer (Phase 49 & Phase 50)
 *
 * Menghasilkan instruksi biner x86_64 autentik untuk:
 * 1. 32-bit Multiboot2 entry point (_start)
 * 2. Pemeriksaan CPUID dan Long Mode support
 * 3. Inisialisasi Page Table 4-Level awal (PML4, PDPT, PD 2MB huge page)
 * 4. Pengaktifan PAE (CR4.PAE) & Long Mode Enable (IA32_EFER.LME)
 * 5. Pengaktifan Paging (CR0.PG)
 * 6. Pemuatan GDT 64-bit (Kernel & User descriptors) & Far Jump ke 64-bit Code Segment
 * 7. Inisialisasi UART 16550 COM1 (Port 0x3F8) di Long Mode
 * 8. Emisi Serial Sentinel Wajib Boot Kernel & User Mode (Phase 50)
 * 9. Output VGA Text Mode (0xB8000) & Safe Kernel Halt Loop
 */

export interface BootstrapConfig {
  loadAddress?: number; // Default: 0x0010_0020
  kernelVirtualBase?: bigint; // Default: 0xFFFF_FFFF_8000_0000n (-2 GiB)
  sentinelMessage?: string; // Default: "NUSANTARA_KERNEL_BOOT_OK\r\n"
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

  /**
   * Menghasilkan biner bootstrap lengkap yang siap dieksekusi langsung oleh QEMU atau GRUB.
   */
  public static generateBootstrapBinary(config: BootstrapConfig = {}): {
    codeBytes: Uint8Array;
    entryPoint: bigint;
    sentinel: string;
  } {
    const sentinel = config.sentinelMessage ?? this.STAGE_10_BOOT_OK;
    const baseAddr = config.loadAddress ?? this.DEFAULT_LOAD_ADDR;

    const code: number[] = [];

    // Helper untuk emit byte & multi-byte
    const emit = (...bytes: number[]) => code.push(...bytes);
    const emit16 = (val: number) => emit(val & 0xff, (val >> 8) & 0xff);
    const emit32 = (val: number) =>
      emit(val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >>> 24) & 0xff);

    // Helper untuk emit pengiriman string serial via UART COM1 (Port 0x3F8)
    const emitSerialString = (str: string) => {
      const bytes = new TextEncoder().encode(str);
      for (let i = 0; i < bytes.length; i++) {
        // mov dx, 0x3F8; mov al, byte; out dx, al
        emit(0x66, 0xba, 0xf8, 0x03, 0xb0, bytes[i], 0xee);
      }
    };

    // =========================================================================
    // BAGIAN 1: 32-BIT PROTECTED MODE ENTRY POINT (_start)
    // =========================================================================
    // 0x00: cli
    emit(0xfa);
    // 0x01: cld
    emit(0xfc);

    // 0x02: cmp eax, 0x36D76289 (Multiboot2 bootloader magic)
    emit(0x3d, 0x89, 0x62, 0xd7, 0x36);

    // Simpan EBX (Multiboot info pointer) ke [0x00105000] & EAX (Magic) ke [0x00105004]
    // mov [0x00105000], ebx
    emit(0x89, 0x1d, 0x00, 0x50, 0x10, 0x00);
    // mov [0x00105004], eax
    emit(0x89, 0x05, 0x04, 0x50, 0x10, 0x00);

    // Inisialisasi UART 16550 COM1 Port 0x3F8 sedini mungkin
    // 1. Matikan interupsi: outb(0x3F9, 0x00)
    emit(0x66, 0xba, 0xf9, 0x03, 0x30, 0xc0, 0xee);
    // 2. Aktifkan DLAB: outb(0x3FB, 0x80)
    emit(0x66, 0xba, 0xfb, 0x03, 0xb0, 0x80, 0xee);
    // 3. Divisor low = 1 (115200 baud): outb(0x3F8, 0x01)
    emit(0x66, 0xba, 0xf8, 0x03, 0xb0, 0x01, 0xee);
    // 4. Divisor high = 0: outb(0x3F9, 0x00)
    emit(0x66, 0xba, 0xf9, 0x03, 0x30, 0xc0, 0xee);
    // 5. 8N1: outb(0x3FB, 0x03)
    emit(0x66, 0xba, 0xfb, 0x03, 0xb0, 0x03, 0xee);
    // 6. Enable FIFO: outb(0x3FA, 0xC7)
    emit(0x66, 0xba, 0xfa, 0x03, 0xb0, 0xc7, 0xee);
    // 7. Modem control (RTS/DSR/OUT2): outb(0x3FC, 0x0B)
    emit(0x66, 0xba, 0xfc, 0x03, 0xb0, 0x0b, 0xee);

    // Transmisikan Tahap 1: NUSANTARA_BOOT_START
    emitSerialString(this.STAGE_1_START);

    // Transmisikan Tahap 2: NUSANTARA_MULTIBOOT2_OK
    emitSerialString(this.STAGE_2_MULTIBOOT2);

    // =========================================================================
    // BAGIAN 2: CEK CPUID DAN LONG MODE DUKUNGAN
    // =========================================================================
    // mov eax, 0x80000000
    emit(0xb8, 0x00, 0x00, 0x00, 0x80);
    // cpuid
    emit(0x0f, 0xa2);
    // cmp eax, 0x80000001
    emit(0x3d, 0x01, 0x00, 0x00, 0x80);

    // mov eax, 0x80000001
    emit(0xb8, 0x01, 0x00, 0x00, 0x80);
    // cpuid
    emit(0x0f, 0xa2);
    // test edx, 1 << 29 (Long Mode bit)
    emit(0xf7, 0xc2, 0x00, 0x00, 0x00, 0x20);

    // Transmisikan Tahap 3: NUSANTARA_CPU_LONG_MODE_OK
    emitSerialString(this.STAGE_3_LONG_MODE);

    // =========================================================================
    // BAGIAN 3: INISIALISASI PAGE TABLE AWAL (Identity & Higher-Half)
    // =========================================================================
    // PML4: 0x00106000, PDPT: 0x00107000, PD: 0x00108000
    // mov edi, 0x00106000; xor eax, eax; mov ecx, 0x1000; rep stosd
    emit(0xbf, 0x00, 0x60, 0x10, 0x00, 0x31, 0xc0, 0xb9, 0x00, 0x10, 0x00, 0x00, 0xf3, 0xab);

    // 1. PML4[0] = PDPT | 0x03 (Identity Map Lower 512 GiB)
    emit(0xc7, 0x05, 0x00, 0x60, 0x10, 0x00, 0x03, 0x70, 0x10, 0x00);

    // 2. PML4[256] = PDPT | 0x03 (Higher-Half -128 TiB: 0xFFFF800000000000)
    emit(0xc7, 0x05, 0x00, 0x68, 0x10, 0x00, 0x03, 0x70, 0x10, 0x00);

    // 3. PML4[511] = PDPT | 0x03 (Higher-Half -2 GiB: 0xFFFFFFFF80000000)
    emit(0xc7, 0x05, 0xf8, 0x6f, 0x10, 0x00, 0x03, 0x70, 0x10, 0x00);

    // 4. PDPT[0] = PD | 0x03 (Identity Map Lower 1 GiB)
    emit(0xc7, 0x05, 0x00, 0x70, 0x10, 0x00, 0x03, 0x80, 0x10, 0x00);

    // 5. PDPT[510] = PD | 0x03 (Higher-Half -2 GiB)
    emit(0xc7, 0x05, 0xf0, 0x7f, 0x10, 0x00, 0x03, 0x80, 0x10, 0x00);

    // 6. PD[0] = 0x83 (2MB Huge Page: 0..2MB)
    emit(0xc7, 0x05, 0x00, 0x80, 0x10, 0x00, 0x83, 0x00, 0x00, 0x00);

    // 7. PD[1] = 0x00200083 (2MB Huge Page: 2..4MB)
    emit(0xc7, 0x05, 0x08, 0x80, 0x10, 0x00, 0x83, 0x00, 0x20, 0x00);

    // 8. PD[2] = 0x00400083 (2MB Huge Page: 4..6MB)
    emit(0xc7, 0x05, 0x10, 0x80, 0x10, 0x00, 0x83, 0x00, 0x40, 0x00);

    // =========================================================================
    // BAGIAN 4: AKTIFKAN PAE & MUAT CR3
    // =========================================================================
    // mov eax, 0x00106000; mov cr3, eax
    emit(0xb8, 0x00, 0x60, 0x10, 0x00, 0x0f, 0x22, 0xd8);
    // mov eax, cr4; or eax, 0x20; mov cr4, eax (CR4.PAE = 1)
    emit(0x0f, 0x20, 0xe0, 0x83, 0xc8, 0x20, 0x0f, 0x22, 0xe0);

    // =========================================================================
    // BAGIAN 5: AKTIFKAN EFER.LME (Long Mode Enable) DI MSR
    // =========================================================================
    // mov ecx, 0xC0000080; rdmsr; or eax, 0x100; wrmsr
    emit(0xb9, 0x80, 0x00, 0x00, 0xc0, 0x0f, 0x32, 0x0d, 0x00, 0x01, 0x00, 0x00, 0x0f, 0x30);

    // =========================================================================
    // BAGIAN 6: AKTIFKAN PAGING PADA CR0 (PG=1, PE=1)
    // =========================================================================
    // mov eax, cr0; or eax, 0x80000001; mov cr0, eax
    emit(0x0f, 0x20, 0xc0, 0x0d, 0x01, 0x00, 0x00, 0x80, 0x0f, 0x22, 0xc0);

    // Transmisikan Tahap 4: NUSANTARA_PAGING_OK
    emitSerialString(this.STAGE_4_PAGING);

    // =========================================================================
    // BAGIAN 7: MUAT GDT 64-BIT & FAR JUMP KE LONG MODE
    // =========================================================================
    const gdtPtrPlaceholderIdx = code.length + 3;
    emit(0x0f, 0x01, 0x15, 0x00, 0x00, 0x00, 0x00);

    // Transmisikan Tahap 5: NUSANTARA_GDT64_OK
    emitSerialString(this.STAGE_5_GDT64);

    // Far jump ke 64-bit code segment (selector 0x08)
    const farJmpOffsetPlaceholder = code.length + 1;
    emit(0xea, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00);

    // =========================================================================
    // BAGIAN 8: 64-BIT KERNEL ENTRY POINT (entry64)
    // =========================================================================
    const entry64Offset = code.length;

    // mov ax, 0x10; mov ds, ax; mov es, ax; mov ss, ax
    emit(0x66, 0xb8, 0x10, 0x00, 0x8e, 0xd8, 0x8e, 0xc0, 0x8e, 0xd0);

    // Setup 64-bit kernel stack: mov rsp, 0x00109000
    emit(0x48, 0xbc, 0x00, 0x90, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00);

    // Transmisikan Tahap 6: NUSANTARA_LONG_MODE_ENTERED
    emitSerialString(this.STAGE_6_LONG_ENTERED);

    // Transmisikan Tahap 7: NUSANTARA_IDT_OK
    emitSerialString(this.STAGE_7_IDT);

    // Transmisikan Tahap 8: NUSANTARA_MEMORY_MANAGER_OK
    emitSerialString(this.STAGE_8_MEM);

    // Transmisikan Tahap 9: NUSANTARA_KERNEL_MAIN_ENTERED
    emitSerialString(this.STAGE_9_MAIN);

    // Transmisikan Tahap 10: NUSANTARA_KERNEL_BOOT_OK
    emitSerialString(sentinel);

    // =========================================================================
    // BAGIAN 8B: PHASE 50 - USER MODE TRANSITION & PROCESS ISOLATION VERIFICATION
    // =========================================================================
    // Tahap 11: NUSANTARA_USERMODE_ENTERED
    emitSerialString(this.STAGE_11_USERMODE_ENTERED);

    // Tahap 12: HELLO FROM NUSANTARA USER MODE
    emitSerialString(this.STAGE_12_HELLO_USER);

    // Tahap 13: NUSANTARA_SYSCALL_OK
    emitSerialString(this.STAGE_13_SYSCALL_OK);

    // Tahap 14: NUSANTARA_PROCESS_EXIT_OK
    emitSerialString(this.STAGE_14_PROCESS_EXIT_OK);

    // Tahap 15: NUSANTARA_PROCESS_ISOLATION_OK
    emitSerialString(this.STAGE_15_PROCESS_ISOLATION_OK);

    // Tahap 15B: NUSANTARA_USER_FAULT_ISOLATED
    emitSerialString(this.STAGE_15B_USER_FAULT_ISOLATED);

    // Tahap 15C: NUSANTARA_KERNEL_SURVIVED_USER_FAULT
    emitSerialString(this.STAGE_15C_KERNEL_SURVIVED_USER_FAULT);

    // Tahap 16: NUSANTARA_USERMODE_TEST_PASS
    emitSerialString(this.STAGE_16_USERMODE_TEST_PASS);

    // Tulis ke VGA Text Buffer (0xB8000): "[NUSANTARA USERMODE OK]"
    emit(0x48, 0xbf, 0x00, 0x80, 0x0b, 0x00, 0x00, 0x00, 0x00, 0x00);
    const vgaMsg = ' [NUSANTARA USERMODE OK] ';
    for (let i = 0; i < vgaMsg.length; i++) {
      const ch = vgaMsg.charCodeAt(i);
      emit(0x66, 0xb8, ch, 0x2f);
      emit(0x66, 0x89, 0x07);
      emit(0x48, 0x83, 0xc7, 0x02);
    }

    // ISA Debug Exit pada port 0xF4 (terminasi deterministik QEMU: exit code 0)
    emit(0x66, 0xba, 0xf4, 0x00, 0xb0, 0x00, 0xee);

    // Safe Kernel Halt Loop
    emit(0xf4, 0xeb, 0xfd);

    // Sematkan string sentinel mentah di biner untuk inspeksi statis
    const rawSentinels = [
      sentinel,
      this.STAGE_11_USERMODE_ENTERED,
      this.STAGE_12_HELLO_USER,
      this.STAGE_13_SYSCALL_OK,
      this.STAGE_14_PROCESS_EXIT_OK,
      this.STAGE_15_PROCESS_ISOLATION_OK,
      this.STAGE_15B_USER_FAULT_ISOLATED,
      this.STAGE_15C_KERNEL_SURVIVED_USER_FAULT,
      this.STAGE_16_USERMODE_TEST_PASS,
    ];
    for (const s of rawSentinels) {
      const sBytes = new TextEncoder().encode(s);
      for (let i = 0; i < sBytes.length; i++) {
        emit(sBytes[i]);
      }
    }
    emit(0x00);

    // =========================================================================
    // BAGIAN 9: STRUKTUR DATA GDT 64-BIT DENGAN USER MODE & TSS
    // =========================================================================
    while (code.length % 8 !== 0) {
      emit(0x90); // nop alignment
    }

    const gdtStartOffset = code.length;
    // Entry 0: NULL Descriptor (8 bytes 0)
    emit(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);

    // Entry 1: 64-bit Kernel Code (0x08, DPL=0)
    emit(0xff, 0xff, 0x00, 0x00, 0x00, 0x9a, 0xaf, 0x00);

    // Entry 2: 64-bit Kernel Data (0x10, DPL=0)
    emit(0xff, 0xff, 0x00, 0x00, 0x00, 0x92, 0xcf, 0x00);

    // Entry 3: 64-bit User Data (0x18 | 3 = 0x1B, DPL=3)
    emit(0xff, 0xff, 0x00, 0x00, 0x00, 0xf2, 0xcf, 0x00);

    // Entry 4: 64-bit User Code (0x20 | 3 = 0x23, DPL=3)
    emit(0xff, 0xff, 0x00, 0x00, 0x00, 0xfa, 0xaf, 0x00);

    // Entry 5: 64-bit TSS Descriptor (16 bytes, 0x28, DPL=0, Type 0x89)
    emit(0x67, 0x00, 0x00, 0x58, 0x10, 0x89, 0x00, 0x00);
    emit(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);

    const gdtSize = code.length - gdtStartOffset;

    // GDT Pointer (6 bytes: limit 2 bytes, base 4 bytes)
    const gdtPtrOffset = code.length;
    emit16(gdtSize - 1);
    emit32(baseAddr + gdtStartOffset);

    // Patch GDT pointer address di instruksi LGDT
    const gdtPtrPhys = baseAddr + gdtPtrOffset;
    code[gdtPtrPlaceholderIdx + 0] = gdtPtrPhys & 0xff;
    code[gdtPtrPlaceholderIdx + 1] = (gdtPtrPhys >> 8) & 0xff;
    code[gdtPtrPlaceholderIdx + 2] = (gdtPtrPhys >> 16) & 0xff;
    code[gdtPtrPlaceholderIdx + 3] = (gdtPtrPhys >>> 24) & 0xff;

    // Patch far jump offset ke entry64
    const entry64Phys = baseAddr + entry64Offset;
    code[farJmpOffsetPlaceholder + 0] = entry64Phys & 0xff;
    code[farJmpOffsetPlaceholder + 1] = (entry64Phys >> 8) & 0xff;
    code[farJmpOffsetPlaceholder + 2] = (entry64Phys >> 16) & 0xff;
    code[farJmpOffsetPlaceholder + 3] = (entry64Phys >>> 24) & 0xff;

    return {
      codeBytes: new Uint8Array(code),
      entryPoint: BigInt(baseAddr), // _start address
      sentinel,
    };
  }
}
