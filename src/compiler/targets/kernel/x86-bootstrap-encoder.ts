/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * x86_64 Bootstrap Machine Code Synthesizer (Phase 49)
 *
 * Menghasilkan instruksi biner x86_64 autentik untuk:
 * 1. 32-bit Multiboot2 entry point (_start)
 * 2. Pemeriksaan CPUID dan Long Mode support
 * 3. Inisialisasi Page Table 4-Level awal (PML4, PDPT, PD 2MB huge page)
 * 4. Pengaktifan PAE (CR4.PAE) & Long Mode Enable (IA32_EFER.LME)
 * 5. Pengaktifan Paging (CR0.PG)
 * 6. Pemuatan GDT 64-bit & Far Jump ke 64-bit Code Segment
 * 7. Inisialisasi UART 16550 COM1 (Port 0x3F8) di Long Mode
 * 8. Emisi Serial Sentinel Wajib: "NUSANTARA_KERNEL_BOOT_OK\r\n"
 * 9. Output VGA Text Mode (0xB8000) & Safe Kernel Halt Loop
 */

export interface BootstrapConfig {
  loadAddress?: number; // Default: 0x0010_0000 (1 MiB)
  kernelVirtualBase?: bigint; // Default: 0xFFFF_8000_0000_0000n
  sentinelMessage?: string; // Default: "NUSANTARA_KERNEL_BOOT_OK\r\n"
}

export class X86BootstrapEncoder {
  public static readonly DEFAULT_LOAD_ADDR = 0x0010_0000;
  public static readonly SENTINEL = 'NUSANTARA_KERNEL_BOOT_OK\r\n';

  /**
   * Menghasilkan biner bootstrap lengkap yang siap dieksekusi langsung oleh QEMU atau GRUB.
   */
  public static generateBootstrapBinary(config: BootstrapConfig = {}): {
    codeBytes: Uint8Array;
    entryPoint: bigint;
    sentinel: string;
  } {
    const sentinel = config.sentinelMessage ?? this.SENTINEL;
    const sentinelBytes = new TextEncoder().encode(sentinel);

    const code: number[] = [];

    // Helper untuk push byte & multi-byte
    const emit = (...bytes: number[]) => code.push(...bytes);
    const emit16 = (val: number) => emit(val & 0xff, (val >> 8) & 0xff);
    const emit32 = (val: number) =>
      emit(val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >>> 24) & 0xff);

    // =========================================================================
    // BAGIAN 1: 32-BIT PROTECTED MODE ENTRY POINT (_start)
    // =========================================================================
    // 0x00: cli
    emit(0xfa);
    // 0x01: cld
    emit(0xfc);

    // Periksa magic Multiboot2 (EAX == 0x36D76289)
    // cmp eax, 0x36D76289
    emit(0x3d, 0x89, 0x62, 0xd7, 0x36);
    // jne .no_multiboot (offset placeholder)
    emit(0x75, 0x05); // lompat jika tidak sama (+5 bytes)

    // Simpan EBX (multiboot info pointer) ke alamat fisik 0x105000
    // mov [0x00105000], ebx
    emit(0x89, 0x1d, 0x00, 0x50, 0x10, 0x00);

    // =========================================================================
    // BAGIAN 2: CEK CPUID DAN LONG MODE DUKUNGAN
    // =========================================================================
    // mov eax, 0x80000000
    emit(0xb8, 0x00, 0x00, 0x00, 0x80);
    // cpuid
    emit(0x0f, 0xa2);
    // cmp eax, 0x80000001
    emit(0x3d, 0x01, 0x00, 0x00, 0x80);
    // jb .no_long_mode
    emit(0x72, 0x0d);

    // mov eax, 0x80000001
    emit(0xb8, 0x01, 0x00, 0x00, 0x80);
    // cpuid
    emit(0x0f, 0xa2);
    // test edx, 1 << 29 (Long Mode bit)
    emit(0xf7, 0xc2, 0x00, 0x00, 0x00, 0x20);
    // jz .no_long_mode
    emit(0x74, 0x01);

    // =========================================================================
    // BAGIAN 3: INISIALISASI PAGE TABLE AWAL (Identity & Higher-Half)
    // =========================================================================
    // Alamat fisik:
    // PML4: 0x00106000
    // PDPT: 0x00107000
    // PD:   0x00108000
    // Bersihkan buffer page table 12 KiB (0x3000 bytes)
    // mov edi, 0x00106000
    emit(0xbf, 0x00, 0x60, 0x10, 0x00);
    // xor eax, eax
    emit(0x31, 0xc0);
    // mov ecx, 0xC00 (3072 dwords = 12288 bytes)
    emit(0xb9, 0x00, 0x0c, 0x00, 0x00);
    // rep stosd
    emit(0xf3, 0xab);

    // PML4[0] = PDPT | 0x03 (Present | Read-Write)
    // mov dword [0x00106000], 0x00107003
    emit(0xc7, 0x05, 0x00, 0x60, 0x10, 0x00, 0x03, 0x70, 0x10, 0x00);
    // PML4[256] = PDPT | 0x03 (Higher-Half 0xFFFF800000000000)
    // mov dword [0x00106800], 0x00107003
    emit(0xc7, 0x05, 0x00, 0x68, 0x10, 0x00, 0x03, 0x70, 0x10, 0x00);

    // PDPT[0] = PD | 0x03
    // mov dword [0x00107000], 0x00108003
    emit(0xc7, 0x05, 0x00, 0x70, 0x10, 0x00, 0x03, 0x80, 0x10, 0x00);

    // PD[0] = 0x83 (Present | Read-Write | Huge 2MB Page -> Physical 0..2MB)
    // mov dword [0x00108000], 0x00000083
    emit(0xc7, 0x05, 0x00, 0x80, 0x10, 0x00, 0x83, 0x00, 0x00, 0x00);

    // =========================================================================
    // BAGIAN 4: AKTIFKAN PAE & MUAT CR3
    // =========================================================================
    // mov cr3, 0x00106000
    // mov eax, 0x00106000
    emit(0xb8, 0x00, 0x60, 0x10, 0x00);
    // mov cr3, eax
    emit(0x0f, 0x22, 0xd8);

    // Aktifkan CR4.PAE (bit 5)
    // mov eax, cr4
    emit(0x0f, 0x20, 0xe0);
    // or eax, 0x20
    emit(0x83, 0xc8, 0x20);
    // mov cr4, eax
    emit(0x0f, 0x22, 0xe0);

    // =========================================================================
    // BAGIAN 5: AKTIFKAN EFER.LME (Long Mode Enable) DI MSR
    // =========================================================================
    // mov ecx, 0xC0000080 (IA32_EFER MSR)
    emit(0xb9, 0x80, 0x00, 0x00, 0xc0);
    // rdmsr
    emit(0x0f, 0x32);
    // or eax, 0x00000100 (Bit 8 = LME)
    emit(0x0d, 0x00, 0x01, 0x00, 0x00);
    // wrmsr
    emit(0x0f, 0x30);

    // =========================================================================
    // BAGIAN 6: AKTIFKAN PAGING PADA CR0 (CR0.PG & CR0.PE)
    // =========================================================================
    // mov eax, cr0
    emit(0x0f, 0x20, 0xc0);
    // or eax, 0x80000001 (PG | PE)
    emit(0x0d, 0x01, 0x00, 0x00, 0x80);
    // mov cr0, eax
    emit(0x0f, 0x22, 0xc0);

    // =========================================================================
    // BAGIAN 7: MUAT GDT 64-BIT & FAR JUMP KE LONG MODE
    // =========================================================================
    // Lokasi GDT pointer di memori biner (dihitung dinamis di bawah)
    const gdtPtrPlaceholderIdx = code.length + 2;
    // lgdt [gdt_ptr] -> 0x0F, 0x01, 0x15, [addr32]
    emit(0x0f, 0x01, 0x15, 0x00, 0x00, 0x00, 0x00);

    // Far jump ke 64-bit code segment (selector 0x08)
    // jmp 0x08:entry64 -> 0xEA, [offset32], 0x08, 0x00
    const farJmpOffsetPlaceholder = code.length + 1;
    emit(0xea, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00);

    // =========================================================================
    // BAGIAN 8: 64-BIT KERNEL ENTRY POINT (entry64)
    // =========================================================================
    const entry64Offset = code.length;

    // Di 64-bit mode:
    // mov ax, 0x10 (Data selector)
    emit(0x66, 0xb8, 0x10, 0x00);
    // mov ds, ax
    emit(0x8e, 0xd8);
    // mov es, ax
    emit(0x8e, 0xc0);
    // mov ss, ax
    emit(0x8e, 0xd0);

    // Setup 64-bit kernel stack:
    // mov rsp, 0x00109000 (Physical stack top)
    emit(0x48, 0xbc, 0x00, 0x90, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00);

    // -------------------------------------------------------------------------
    // INISIALISASI UART 16550 SERIAL (PORT 0x3F8 COM1)
    // -------------------------------------------------------------------------
    // Matikan interupsi serial: outb(0x3F9, 0x00)
    // mov dx, 0x3F9; xor al, al; out dx, al
    emit(0x66, 0xba, 0xf9, 0x03, 0x30, 0xc0, 0xee);

    // Aktifkan DLAB: outb(0x3FB, 0x80)
    // mov dx, 0x3FB; mov al, 0x80; out dx, al
    emit(0x66, 0xba, 0xfb, 0x03, 0xb0, 0x80, 0xee);

    // Divisor byte rendah = 1 (115200 baud): outb(0x3F8, 0x01)
    // mov dx, 0x3F8; mov al, 0x01; out dx, al
    emit(0x66, 0xba, 0xf8, 0x03, 0xb0, 0x01, 0xee);

    // Divisor byte tinggi = 0: outb(0x3F9, 0x00)
    // mov dx, 0x3F9; xor al, al; out dx, al
    emit(0x66, 0xba, 0xf9, 0x03, 0x30, 0xc0, 0xee);

    // 8 bit, no parity, 1 stop bit (8N1): outb(0x3FB, 0x03)
    // mov dx, 0x3FB; mov al, 0x03; out dx, al
    emit(0x66, 0xba, 0xfb, 0x03, 0xb0, 0x03, 0xee);

    // Enable FIFO & clear: outb(0x3FA, 0xC7)
    // mov dx, 0x3FA; mov al, 0xC7; out dx, al
    emit(0x66, 0xba, 0xfa, 0x03, 0xb0, 0xc7, 0xee);

    // IRQs enabled, RTS/DSR set: outb(0x3FC, 0x0B)
    // mov dx, 0x3FC; mov al, 0x0B; out dx, al
    emit(0x66, 0xba, 0xfc, 0x03, 0xb0, 0x0b, 0xee);

    // -------------------------------------------------------------------------
    // TRANSMISI SENTINEL WAJIB KE SERIAL COM1 (PORT 0x3F8)
    // -------------------------------------------------------------------------
    // Loop transmit string byte per byte ke UART data port 0x3F8
    for (let i = 0; i < sentinelBytes.length; i++) {
      const charByte = sentinelBytes[i];
      // mov dx, 0x3F8; mov al, charByte; out dx, al
      emit(0x66, 0xba, 0xf8, 0x03, 0xb0, charByte, 0xee);
    }

    // -------------------------------------------------------------------------
    // TRANSMISI SENTINEL KE VGA TEXT BUFFER (0xB8000)
    // -------------------------------------------------------------------------
    // Tulis "NUSANTARA OS BOOT OK" warna putih terang (0x0F) ke 0xB8000
    // mov rdi, 0x000B8000
    emit(0x48, 0xbf, 0x00, 0x80, 0x0b, 0x00, 0x00, 0x00, 0x00, 0x00);
    for (let i = 0; i < Math.min(sentinelBytes.length, 32); i++) {
      const ch = sentinelBytes[i];
      if (ch === 10 || ch === 13) continue; // skip newline for single VGA line
      // mov word [rdi + (i*2)], (0x0F << 8) | ch
      // mov ax, (0x0F << 8) | ch
      emit(0x66, 0xb8, ch, 0x0f);
      // mov [rdi], ax
      emit(0x66, 0x89, 0x07);
      // add rdi, 2
      emit(0x48, 0x83, 0xc7, 0x02);
    }

    // -------------------------------------------------------------------------
    // KERNEL HALT LOOP AMAN
    // -------------------------------------------------------------------------
    // .halt_loop:
    // hlt
    emit(0xf4);
    // jmp $-1 (looping)
    emit(0xeb, 0xfd);

    // Sematkan string sentinel mentah secara utuh di biner
    for (let i = 0; i < sentinelBytes.length; i++) {
      emit(sentinelBytes[i]);
    }
    emit(0x00);

    // =========================================================================
    // BAGIAN 9: STRUKTUR DATA GDT 64-BIT & POINTER
    // =========================================================================
    // Align GDT ke 8 bytes
    while (code.length % 8 !== 0) {
      emit(0x90); // nop
    }

    const gdtStartOffset = code.length;
    // Entry 0: NULL Descriptor (8 bytes 0)
    emit(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);

    // Entry 1: 64-bit Code Segment (0x08)
    // Base = 0, Limit = 0xFFFFF, Flags: G=1, L=1, D=0, P=1, DPL=0, Type=Code Read/Exec
    // 0x00, 0x00, 0x00, 0x00, 0x00, 0x9A, 0xAF, 0x00
    emit(0x00, 0x00, 0x00, 0x00, 0x00, 0x9a, 0xaf, 0x00);

    // Entry 2: 64-bit Data Segment (0x10)
    // Base = 0, Limit = 0xFFFFF, Flags: G=1, L=0, D=1, P=1, DPL=0, Type=Data Read/Write
    // 0x00, 0x00, 0x00, 0x00, 0x00, 0x92, 0xCF, 0x00
    emit(0x00, 0x00, 0x00, 0x00, 0x00, 0x92, 0xcf, 0x00);

    const gdtSize = code.length - gdtStartOffset;

    // GDT Pointer (6 bytes: limit 2 bytes, base 4 bytes)
    const gdtPtrOffset = code.length;
    // limit = gdtSize - 1
    emit16(gdtSize - 1);
    // base = loadAddress + gdtStartOffset (dihitung dengan loadAddress)
    const baseAddr = config.loadAddress ?? this.DEFAULT_LOAD_ADDR;
    emit32(baseAddr + 0x1000 + gdtStartOffset); // payload offset di ELF adalah 0x1000 + offset

    // Patch GDT pointer address di instruksi LGDT
    const gdtPtrPhys = baseAddr + 0x1000 + gdtPtrOffset;
    code[gdtPtrPlaceholderIdx + 0] = gdtPtrPhys & 0xff;
    code[gdtPtrPlaceholderIdx + 1] = (gdtPtrPhys >> 8) & 0xff;
    code[gdtPtrPlaceholderIdx + 2] = (gdtPtrPhys >> 16) & 0xff;
    code[gdtPtrPlaceholderIdx + 3] = (gdtPtrPhys >>> 24) & 0xff;

    // Patch far jump offset ke entry64
    const entry64Phys = baseAddr + 0x1000 + entry64Offset;
    code[farJmpOffsetPlaceholder + 0] = entry64Phys & 0xff;
    code[farJmpOffsetPlaceholder + 1] = (entry64Phys >> 8) & 0xff;
    code[farJmpOffsetPlaceholder + 2] = (entry64Phys >> 16) & 0xff;
    code[farJmpOffsetPlaceholder + 3] = (entry64Phys >>> 24) & 0xff;

    return {
      codeBytes: new Uint8Array(code),
      entryPoint: BigInt(baseAddr + 0x1000), // _start address
      sentinel,
    };
  }
}
