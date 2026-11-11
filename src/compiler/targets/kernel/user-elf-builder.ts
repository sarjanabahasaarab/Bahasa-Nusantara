/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * User ELF64 Executable Synthesizer (x86_64 User Mode)
 * Target Milestone: Phase 50 (v0.50.0)
 */

export interface UserELFOptions {
  entryPoint?: bigint;       // Default: 0x0000_0000_0040_0000n
  programPayload?: Uint8Array;
  programName?: string;
}

export class UserELFBuilder {
  public static readonly DEFAULT_USER_ENTRY = 0x0000_0000_0040_0000n;

  /**
   * Menghasilkan biner ELF64 x86_64 lengkap untuk aplikasi User Mode (ET_EXEC).
   */
  public static build(options: UserELFOptions = {}): Uint8Array {
    const entryPoint = options.entryPoint ?? this.DEFAULT_USER_ENTRY;

    // Default Payload: Program User Mode minimal yang memanggil syscall CONSOLE_WRITE lalu PROCESS_EXIT
    // mov rax, 6 (sys_console_write); mov rdi, buffer; mov rsi, len; syscall
    // mov rax, 1 (sys_process_exit); mov rdi, 0; syscall
    const defaultPayload = options.programPayload ?? new Uint8Array([
      // 0x00: mov rax, 6 (SYS_CONSOLE_WRITE)
      0x48, 0xc7, 0xc0, 0x06, 0x00, 0x00, 0x00,
      // 0x07: mov rdi, 0x00400040 (pointer string)
      0x48, 0xc7, 0xc7, 0x40, 0x00, 0x40, 0x00,
      // 0x0E: mov rsi, 31 (panjang string)
      0x48, 0xc7, 0xc6, 0x1f, 0x00, 0x00, 0x00,
      // 0x15: syscall
      0x0f, 0x05,
      // 0x17: mov rax, 1 (SYS_PROCESS_EXIT)
      0x48, 0xc7, 0xc0, 0x01, 0x00, 0x00, 0x00,
      // 0x1E: xor rdi, rdi (exit code 0)
      0x48, 0x31, 0xff,
      // 0x21: syscall
      0x0f, 0x05,
      // 0x23: hlt (safety)
      0xf4,
    ]);

    // Layout ELF:
    // 0x00..0x3F: ELF64 Header (64 B)
    // 0x40..0x77: Program Header 1 (56 B) - PT_LOAD Text/Code (RX)
    // 0x78..0xAF: Program Header 2 (56 B) - PT_LOAD Data/ROData (R)
    // 0xB0..0xFF: Padding to 0x100
    // 0x100.. : Payload Text
    const elfHeaderSize = 64;
    const phdrSize = 56;
    const phdrCount = 1;
    const textOffset = 0x1000;
    const totalSize = textOffset + Math.max(defaultPayload.length, 64);

    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    // 1. ELF Header (64 bytes)
    // Magic: \x7F E L F
    buffer[0] = 0x7f; buffer[1] = 0x45; buffer[2] = 0x4c; buffer[3] = 0x46;
    buffer[4] = 2;    // ELFCLASS64
    buffer[5] = 1;    // ELFDATA2LSB (Little Endian)
    buffer[6] = 1;    // EV_CURRENT
    buffer[7] = 0;    // System V ABI
    view.setUint16(16, 2, true);          // e_type = ET_EXEC
    view.setUint16(18, 0x3e, true);       // e_machine = EM_X86_64
    view.setUint32(20, 1, true);          // e_version = 1
    view.setBigUint64(24, entryPoint, true); // e_entry
    view.setBigUint64(32, BigInt(elfHeaderSize), true); // e_phoff = 64
    view.setBigUint64(40, 0n, true);      // e_shoff = 0 (stripped)
    view.setUint32(48, 0, true);          // e_flags = 0
    view.setUint16(52, elfHeaderSize, true); // e_ehsize = 64
    view.setUint16(54, phdrSize, true);   // e_phentsize = 56
    view.setUint16(56, phdrCount, true);  // e_phnum = 1
    view.setUint16(58, 0, true);          // e_shentsize = 0
    view.setUint16(60, 0, true);          // e_shnum = 0
    view.setUint16(62, 0, true);          // e_shstrndx = 0

    // 2. Program Header 1: PT_LOAD (RX)
    const phOffset = elfHeaderSize;
    view.setUint32(phOffset + 0, 1, true);           // p_type = PT_LOAD
    view.setUint32(phOffset + 4, 1 | 4, true);       // p_flags = PF_X | PF_R
    view.setBigUint64(phOffset + 8, BigInt(textOffset), true); // p_offset
    view.setBigUint64(phOffset + 16, entryPoint, true);        // p_vaddr
    view.setBigUint64(phOffset + 24, entryPoint, true);        // p_paddr
    view.setBigUint64(phOffset + 32, BigInt(defaultPayload.length), true); // p_filesz
    view.setBigUint64(phOffset + 40, BigInt(defaultPayload.length), true); // p_memsz
    view.setBigUint64(phOffset + 48, 0x1000n, true);           // p_align = 4KB

    // 3. Salin payload ke textOffset
    buffer.set(defaultPayload, textOffset);

    return buffer;
  }
}
