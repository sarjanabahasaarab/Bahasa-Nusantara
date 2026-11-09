/**
 * Kernel ELF64 Binary Builder & Synthesizer.
 * Membentuk biner ELF64 x86_64 dengan Multiboot2 header yang valid untuk target kernel mandiri.
 */

import { Multiboot2HeaderBuilder, MULTIBOOT2_HEADER_MAGIC } from './boot-headers.js';

export interface KernelELFOptions {
  entryPoint?: bigint;
  kernelName?: string;
  multibootHeader?: Uint8Array;
  textPayload?: Uint8Array;
}

export class KernelELFBuilder {
  private entryPoint: bigint;
  private kernelName: string;
  private multibootBytes: Uint8Array;
  private textPayload: Uint8Array;

  constructor(options: KernelELFOptions = {}) {
    this.entryPoint = options.entryPoint ?? 0x0010_0000n; // 1 MiB physical boot entry
    this.kernelName = options.kernelName ?? 'nusantara-kernel';
    this.multibootBytes = options.multibootHeader ?? new Multiboot2HeaderBuilder().build();
    // Default payload: instruksi hlt x86_64 loop (cli; hlt; jmp $-1) -> FA F4 EB FD
    this.textPayload = options.textPayload ?? new Uint8Array([0xFA, 0xF4, 0xEB, 0xFD]);
  }

  /**
   * Bangun biner ELF64 lengkap dalam Uint8Array.
   */
  public build(): Uint8Array {
    // 1. Strings untuk .shstrtab
    const shstrtabNames = [
      '',
      '.multiboot',
      '.text',
      '.rodata',
      '.data',
      '.bss',
      '.shstrtab',
      '.symtab',
      '.strtab',
    ];
    const shstrtabOffsets: number[] = [];
    const shstrtabBuf: number[] = [];
    for (const name of shstrtabNames) {
      shstrtabOffsets.push(shstrtabBuf.length);
      for (let i = 0; i < name.length; i++) {
        shstrtabBuf.push(name.charCodeAt(i));
      }
      shstrtabBuf.push(0); // null terminator
    }
    const shstrtabData = new Uint8Array(shstrtabBuf);

    // 2. Strings untuk .strtab
    const strtabNames = ['', '_start', 'kernel_main', 'multiboot_header', this.kernelName];
    const strtabOffsets: number[] = [];
    const strtabBuf: number[] = [];
    for (const name of strtabNames) {
      strtabOffsets.push(strtabBuf.length);
      for (let i = 0; i < name.length; i++) {
        strtabBuf.push(name.charCodeAt(i));
      }
      strtabBuf.push(0);
    }
    const strtabData = new Uint8Array(strtabBuf);

    // 3. Layout File Offsets
    // ELF Header: 64 bytes
    // Program Headers: 2 segments * 56 bytes = 112 bytes
    const elfHeaderSize = 64;
    const phdrEntrySize = 56;
    const phdrCount = 2;
    const phdrTotalSize = phdrCount * phdrEntrySize;

    // Payload offsets
    const multibootOffset = 0x1000; // Align ke 4K page boundary
    const multibootSize = this.multibootBytes.byteLength;

    const textOffset = multibootOffset + Math.ceil(multibootSize / 16) * 16;
    const textSize = this.textPayload.byteLength;

    const rodataOffset = textOffset + Math.ceil(textSize / 16) * 16;
    const rodataData = new TextEncoder().encode(`Nusantara OS Kernel v0.48.0 (${this.kernelName})\0`);
    const rodataSize = rodataData.byteLength;

    const dataOffset = rodataOffset + Math.ceil(rodataSize / 16) * 16;
    const dataPayload = new Uint8Array([0x4E, 0x55, 0x53, 0x41]); // 'NUSA'
    const dataSize = dataPayload.byteLength;

    const shstrtabOffset = dataOffset + Math.ceil(dataSize / 16) * 16;
    const shstrtabSize = shstrtabData.byteLength;

    // .symtab: 24 bytes per entry (Elf64_Sym)
    // Entries: 0: NULL, 1: _start, 2: kernel_main
    const symtabOffset = shstrtabOffset + Math.ceil(shstrtabSize / 16) * 16;
    const symEntrySize = 24;
    const symCount = 4;
    const symtabSize = symCount * symEntrySize;

    const strtabOffset = symtabOffset + symtabSize;
    const strtabSize = strtabData.byteLength;

    // Section Headers (Elf64_Shdr): 64 bytes each
    const shdrEntrySize = 64;
    const shdrCount = 9;
    const shdrOffset = strtabOffset + Math.ceil(strtabSize / 16) * 16;
    const shdrTotalSize = shdrCount * shdrEntrySize;

    const totalFileSize = shdrOffset + shdrTotalSize;
    const buffer = new Uint8Array(totalFileSize);
    const view = new DataView(buffer.buffer);

    // ==========================================
    // 4. Tulis ELF64 Header (64 bytes)
    // ==========================================
    // e_ident
    buffer[0] = 0x7F; // ELFMAG0
    buffer[1] = 0x45; // 'E'
    buffer[2] = 0x4C; // 'L'
    buffer[3] = 0x46; // 'F'
    buffer[4] = 2;    // ELFCLASS64
    buffer[5] = 1;    // ELFDATA2LSB (Little Endian)
    buffer[6] = 1;    // EV_CURRENT
    buffer[7] = 0;    // ELFOSABI_NONE / System V
    buffer[8] = 0;    // ABI Version
    // buffer[9..15] = 0 padding

    view.setUint16(16, 2, true);      // e_type = ET_EXEC
    view.setUint16(18, 0x3E, true);   // e_machine = EM_X86_64 (62)
    view.setUint32(20, 1, true);      // e_version = EV_CURRENT
    view.setBigUint64(24, this.entryPoint, true); // e_entry
    view.setBigUint64(32, BigInt(elfHeaderSize), true); // e_phoff
    view.setBigUint64(40, BigInt(shdrOffset), true);    // e_shoff
    view.setUint32(48, 0, true);      // e_flags
    view.setUint16(52, elfHeaderSize, true); // e_ehsize = 64
    view.setUint16(54, phdrEntrySize, true); // e_phentsize = 56
    view.setUint16(56, phdrCount, true);     // e_phnum = 2
    view.setUint16(58, shdrEntrySize, true); // e_shentsize = 64
    view.setUint16(60, shdrCount, true);     // e_shnum = 9
    view.setUint16(62, 6, true);             // e_shstrndx = 6 (.shstrtab)

    // ==========================================
    // 5. Tulis Program Headers (Elf64_Phdr)
    // ==========================================
    // Phdr 0: PT_LOAD untuk Boot / Multiboot segment (R-X)
    let phOffset = elfHeaderSize;
    view.setUint32(phOffset, 1, true);                // p_type = PT_LOAD
    view.setUint32(phOffset + 4, 5, true);            // p_flags = PF_R | PF_X (1 | 4 = 5)
    view.setBigUint64(phOffset + 8, BigInt(multibootOffset), true); // p_offset
    view.setBigUint64(phOffset + 16, 0x0010_0000n, true);          // p_vaddr
    view.setBigUint64(phOffset + 24, 0x0010_0000n, true);          // p_paddr
    view.setBigUint64(phOffset + 32, BigInt(multibootSize + textSize), true); // p_filesz
    view.setBigUint64(phOffset + 40, BigInt(multibootSize + textSize), true); // p_memsz
    view.setBigUint64(phOffset + 48, 0x1000n, true);               // p_align = 4KB

    // Phdr 1: PT_LOAD untuk Higher-Half Kernel Data (RW-)
    phOffset += phdrEntrySize;
    view.setUint32(phOffset, 1, true);                // p_type = PT_LOAD
    view.setUint32(phOffset + 4, 6, true);            // p_flags = PF_R | PF_W (4 | 2 = 6)
    view.setBigUint64(phOffset + 8, BigInt(rodataOffset), true); // p_offset
    view.setBigUint64(phOffset + 16, 0xFFFF_FFFF_8010_0000n, true); // p_vaddr
    view.setBigUint64(phOffset + 24, 0x0010_2000n, true);          // p_paddr
    view.setBigUint64(phOffset + 32, BigInt(rodataSize + dataSize), true); // p_filesz
    view.setBigUint64(phOffset + 40, BigInt(rodataSize + dataSize + 0x1000), true); // p_memsz (includes bss)
    view.setBigUint64(phOffset + 48, 0x1000n, true);               // p_align = 4KB

    // ==========================================
    // 6. Tulis Data Payload
    // ==========================================
    buffer.set(this.multibootBytes, multibootOffset);
    buffer.set(this.textPayload, textOffset);
    buffer.set(rodataData, rodataOffset);
    buffer.set(dataPayload, dataOffset);
    buffer.set(shstrtabData, shstrtabOffset);
    buffer.set(strtabData, strtabOffset);

    // ==========================================
    // 7. Tulis Simbol (.symtab)
    // ==========================================
    let symOff = symtabOffset;
    // Sym 0: NULL
    symOff += symEntrySize;

    // Sym 1: _start
    view.setUint32(symOff, strtabOffsets[1], true); // st_name -> "_start"
    buffer[symOff + 4] = (1 << 4) | 2;             // st_info -> STB_GLOBAL | STT_FUNC
    buffer[symOff + 5] = 0;                        // st_other
    view.setUint16(symOff + 6, 2, true);           // st_shndx -> .text
    view.setBigUint64(symOff + 8, this.entryPoint, true); // st_value
    view.setBigUint64(symOff + 16, BigInt(textSize), true); // st_size
    symOff += symEntrySize;

    // Sym 2: kernel_main
    view.setUint32(symOff, strtabOffsets[2], true); // st_name -> "kernel_main"
    buffer[symOff + 4] = (1 << 4) | 2;             // st_info -> STB_GLOBAL | STT_FUNC
    buffer[symOff + 5] = 0;
    view.setUint16(symOff + 6, 2, true);           // st_shndx -> .text
    view.setBigUint64(symOff + 8, 0xFFFF_FFFF_8010_0000n, true);
    view.setBigUint64(symOff + 16, 16n, true);
    symOff += symEntrySize;

    // Sym 3: multiboot_header
    view.setUint32(symOff, strtabOffsets[3], true); // st_name -> "multiboot_header"
    buffer[symOff + 4] = (1 << 4) | 1;             // st_info -> STB_GLOBAL | STT_OBJECT
    buffer[symOff + 5] = 0;
    view.setUint16(symOff + 6, 1, true);           // st_shndx -> .multiboot
    view.setBigUint64(symOff + 8, 0x0010_0000n, true);
    view.setBigUint64(symOff + 16, BigInt(multibootSize), true);

    // ==========================================
    // 8. Tulis Section Headers (Elf64_Shdr)
    // ==========================================
    const writeShdr = (
      index: number,
      nameOffset: number,
      type: number,
      flags: bigint,
      addr: bigint,
      offset: number,
      size: number,
      link = 0,
      info = 0,
      addralign = 1,
      entsize = 0
    ) => {
      const sh = shdrOffset + index * shdrEntrySize;
      view.setUint32(sh, nameOffset, true);
      view.setUint32(sh + 4, type, true);
      view.setBigUint64(sh + 8, flags, true);
      view.setBigUint64(sh + 16, addr, true);
      view.setBigUint64(sh + 24, BigInt(offset), true);
      view.setBigUint64(sh + 32, BigInt(size), true);
      view.setUint32(sh + 40, link, true);
      view.setUint32(sh + 44, info, true);
      view.setBigUint64(sh + 48, BigInt(addralign), true);
      view.setBigUint64(sh + 56, BigInt(entsize), true);
    };

    // [0] NULL
    writeShdr(0, 0, 0, 0n, 0n, 0, 0);

    // [1] .multiboot (SHT_PROGBITS = 1, SHF_ALLOC = 2)
    writeShdr(1, shstrtabOffsets[1], 1, 2n, 0x0010_0000n, multibootOffset, multibootSize, 0, 0, 8);

    // [2] .text (SHT_PROGBITS = 1, SHF_ALLOC | SHF_EXECINSTR = 6)
    writeShdr(2, shstrtabOffsets[2], 1, 6n, 0x0010_0100n, textOffset, textSize, 0, 0, 16);

    // [3] .rodata (SHT_PROGBITS = 1, SHF_ALLOC = 2)
    writeShdr(3, shstrtabOffsets[3], 1, 2n, 0xFFFF_FFFF_8010_0000n, rodataOffset, rodataSize, 0, 0, 16);

    // [4] .data (SHT_PROGBITS = 1, SHF_ALLOC | SHF_WRITE = 3)
    writeShdr(4, shstrtabOffsets[4], 1, 3n, 0xFFFF_FFFF_8010_1000n, dataOffset, dataSize, 0, 0, 16);

    // [5] .bss (SHT_NOBITS = 8, SHF_ALLOC | SHF_WRITE = 3)
    writeShdr(5, shstrtabOffsets[5], 8, 3n, 0xFFFF_FFFF_8010_2000n, dataOffset + dataSize, 0x1000, 0, 0, 4096);

    // [6] .shstrtab (SHT_STRTAB = 3)
    writeShdr(6, shstrtabOffsets[6], 3, 0n, 0n, shstrtabOffset, shstrtabSize);

    // [7] .symtab (SHT_SYMTAB = 2)
    writeShdr(7, shstrtabOffsets[7], 2, 0n, 0n, symtabOffset, symtabSize, 8, 1, 8, symEntrySize);

    // [8] .strtab (SHT_STRTAB = 3)
    writeShdr(8, shstrtabOffsets[8], 3, 0n, 0n, strtabOffset, strtabSize);

    return buffer;
  }
}
