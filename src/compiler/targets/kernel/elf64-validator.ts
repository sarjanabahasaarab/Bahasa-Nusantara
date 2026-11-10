/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ELF64 Kernel Binary Inspector & Validator (Phase 49)
 *
 * Memeriksa kesesuaian biner kernel ELF64 dengan standar x86_64 System V ABI:
 * 1. ELF Magic: 0x7F 'E' 'L' 'F'
 * 2. Class 64-bit (ELFCLASS64 = 2)
 * 3. Endianness: Little Endian (ELFDATA2LSB = 1)
 * 4. Machine type: AMD x86_64 (EM_X86_64 = 0x3E)
 * 5. Type: Executable (ET_EXEC = 2)
 * 6. Program Headers PT_LOAD segments & permissions
 * 7. Entry point address validation
 * 8. Section headers validation
 */

export interface ELF64ProgramHeaderInfo {
  type: number;
  typeName: string;
  flags: number;
  flagsStr: string;
  offset: bigint;
  vaddr: bigint;
  paddr: bigint;
  filesz: bigint;
  memsz: bigint;
  align: bigint;
}

export interface ELF64SectionHeaderInfo {
  name: string;
  type: number;
  typeName: string;
  flags: bigint;
  addr: bigint;
  offset: bigint;
  size: bigint;
  align: bigint;
}

export interface ELF64InspectionResult {
  valid: boolean;
  isELF64: boolean;
  isLittleEndian: boolean;
  isX86_64: boolean;
  isExecutable: boolean;
  entryPoint: bigint;
  programHeaderCount: number;
  sectionHeaderCount: number;
  programHeaders: ELF64ProgramHeaderInfo[];
  sectionHeaders: ELF64SectionHeaderInfo[];
  loadSegments: ELF64ProgramHeaderInfo[];
  hasExecutableLoadSegment: boolean;
  errors: string[];
  warnings: string[];
}

export class ELF64Validator {
  public static inspect(binary: Uint8Array): ELF64InspectionResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (binary.byteLength < 64) {
      return {
        valid: false,
        isELF64: false,
        isLittleEndian: false,
        isX86_64: false,
        isExecutable: false,
        entryPoint: 0n,
        programHeaderCount: 0,
        sectionHeaderCount: 0,
        programHeaders: [],
        sectionHeaders: [],
        loadSegments: [],
        hasExecutableLoadSegment: false,
        errors: ['Ukuran berkas kurang dari 64 byte (ukuran minimum ELF64 header).'],
        warnings: [],
      };
    }

    const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);

    // 1. Magic ELF: 0x7F, 'E', 'L', 'F'
    const isMagicValid =
      binary[0] === 0x7f &&
      binary[1] === 0x45 &&
      binary[2] === 0x4c &&
      binary[3] === 0x46;

    if (!isMagicValid) {
      errors.push('Magic ELF tidak valid (bukan berkas ELF).');
    }

    // 2. Class: 1 = 32-bit, 2 = 64-bit
    const elfClass = binary[4];
    const isELF64 = elfClass === 2;
    if (!isELF64) {
      errors.push(`ELF Class bukan 64-bit (didapat: ${elfClass === 1 ? '32-bit' : elfClass}).`);
    }

    // 3. Endianness: 1 = Little Endian, 2 = Big Endian
    const dataEncoding = binary[5];
    const isLittleEndian = dataEncoding === 1;
    if (!isLittleEndian) {
      errors.push('Encoding bukan Little-Endian (ELFDATA2LSB).');
    }

    // 4. Header fields (Little Endian)
    const e_type = view.getUint16(16, true);
    const isExecutable = e_type === 2; // ET_EXEC
    if (!isExecutable) {
      warnings.push(`e_type bukan ET_EXEC (didapat: ${e_type}).`);
    }

    const e_machine = view.getUint16(18, true);
    const isX86_64 = e_machine === 0x3e; // EM_X86_64 = 62
    if (!isX86_64) {
      errors.push(`e_machine bukan AMD x86_64 (didapat: 0x${e_machine.toString(16)}).`);
    }

    const entryPoint = view.getBigUint64(24, true);
    const e_phoff = Number(view.getBigUint64(32, true));
    const e_shoff = Number(view.getBigUint64(40, true));
    const e_phentsize = view.getUint16(54, true);
    const e_phnum = view.getUint16(56, true);
    const e_shentsize = view.getUint16(58, true);
    const e_shnum = view.getUint16(60, true);
    const e_shstrndx = view.getUint16(62, true);

    // 5. Program Headers
    const programHeaders: ELF64ProgramHeaderInfo[] = [];
    const loadSegments: ELF64ProgramHeaderInfo[] = [];

    if (e_phoff > 0 && e_phnum > 0) {
      for (let i = 0; i < e_phnum; i++) {
        const off = e_phoff + i * e_phentsize;
        if (off + 56 > binary.byteLength) break;

        const p_type = view.getUint32(off, true);
        const p_flags = view.getUint32(off + 4, true);
        const p_offset = view.getBigUint64(off + 8, true);
        const p_vaddr = view.getBigUint64(off + 16, true);
        const p_paddr = view.getBigUint64(off + 24, true);
        const p_filesz = view.getBigUint64(off + 32, true);
        const p_memsz = view.getBigUint64(off + 40, true);
        const p_align = view.getBigUint64(off + 48, true);

        let typeName = 'UNKNOWN';
        if (p_type === 1) typeName = 'PT_LOAD';
        else if (p_type === 2) typeName = 'PT_DYNAMIC';
        else if (p_type === 3) typeName = 'PT_INTERP';
        else if (p_type === 4) typeName = 'PT_NOTE';
        else if (p_type === 6) typeName = 'PT_PHDR';
        else if (p_type === 7) typeName = 'PT_TLS';

        let flagsStr = '';
        if (p_flags & 4) flagsStr += 'R';
        if (p_flags & 2) flagsStr += 'W';
        if (p_flags & 1) flagsStr += 'X';

        const phInfo: ELF64ProgramHeaderInfo = {
          type: p_type,
          typeName,
          flags: p_flags,
          flagsStr,
          offset: p_offset,
          vaddr: p_vaddr,
          paddr: p_paddr,
          filesz: p_filesz,
          memsz: p_memsz,
          align: p_align,
        };

        programHeaders.push(phInfo);
        if (p_type === 1) {
          loadSegments.push(phInfo);
        }
      }
    }

    const hasExecutableLoadSegment = loadSegments.some(s => (s.flags & 1) !== 0);
    if (!hasExecutableLoadSegment) {
      errors.push('Tidak ditemukan segmen PT_LOAD dengan izin eksekusi (PF_X).');
    }

    // 6. Section Headers (jika ada string table)
    const sectionHeaders: ELF64SectionHeaderInfo[] = [];
    let shstrtabBytes: Uint8Array | null = null;

    if (e_shoff > 0 && e_shnum > 0 && e_shstrndx < e_shnum) {
      const strtabShOff = e_shoff + e_shstrndx * e_shentsize;
      if (strtabShOff + 64 <= binary.byteLength) {
        const strOffset = Number(view.getBigUint64(strtabShOff + 24, true));
        const strSize = Number(view.getBigUint64(strtabShOff + 32, true));
        if (strOffset + strSize <= binary.byteLength) {
          shstrtabBytes = binary.subarray(strOffset, strOffset + strSize);
        }
      }
    }

    if (e_shoff > 0 && e_shnum > 0) {
      for (let i = 0; i < e_shnum; i++) {
        const off = e_shoff + i * e_shentsize;
        if (off + 64 > binary.byteLength) break;

        const sh_name = view.getUint32(off, true);
        const sh_type = view.getUint32(off + 4, true);
        const sh_flags = view.getBigUint64(off + 8, true);
        const sh_addr = view.getBigUint64(off + 16, true);
        const sh_offset = view.getBigUint64(off + 24, true);
        const sh_size = view.getBigUint64(off + 32, true);
        const sh_addralign = view.getBigUint64(off + 48, true);

        let name = '';
        if (shstrtabBytes && sh_name < shstrtabBytes.length) {
          let end = sh_name;
          while (end < shstrtabBytes.length && shstrtabBytes[end] !== 0) {
            end++;
          }
          name = new TextDecoder().decode(shstrtabBytes.subarray(sh_name, end));
        }

        let typeName = 'SHT_PROGBITS';
        if (sh_type === 0) typeName = 'SHT_NULL';
        else if (sh_type === 2) typeName = 'SHT_SYMTAB';
        else if (sh_type === 3) typeName = 'SHT_STRTAB';
        else if (sh_type === 8) typeName = 'SHT_NOBITS';

        sectionHeaders.push({
          name: name || `sec_${i}`,
          type: sh_type,
          typeName,
          flags: sh_flags,
          addr: sh_addr,
          offset: sh_offset,
          size: sh_size,
          align: sh_addralign,
        });
      }
    }

    const isValid = errors.length === 0;

    return {
      valid: isValid,
      isELF64,
      isLittleEndian,
      isX86_64,
      isExecutable,
      entryPoint,
      programHeaderCount: programHeaders.length,
      sectionHeaderCount: sectionHeaders.length,
      programHeaders,
      sectionHeaders,
      loadSegments,
      hasExecutableLoadSegment,
      errors,
      warnings,
    };
  }

  public static formatReport(result: ELF64InspectionResult): string {
    let out = '======================================================================\n';
    out += '            LAPORAN INSPEKSI BINER KERNEL ELF64 (x86_64)              \n';
    out += '======================================================================\n';
    out += `Status Validasi     : ${result.valid ? 'LULUS (VALID ELF64)' : 'GAGAL (INVALID)'}\n`;
    out += `Format              : ${result.isELF64 ? 'ELF64' : 'BUKAN ELF64'}\n`;
    out += `Endianness          : ${result.isLittleEndian ? 'Little-Endian (x86_64 standar)' : 'Big-Endian'}\n`;
    out += `Arsitektur Mesin    : ${result.isX86_64 ? 'AMD x86_64 (EM_X86_64 = 0x3E)' : 'BUKAN x86_64'}\n`;
    out += `Tipe Berkas         : ${result.isExecutable ? 'ET_EXEC (Executable)' : 'NON-EXEC'}\n`;
    out += `Entry Point         : 0x${result.entryPoint.toString(16).padStart(16, '0')}\n`;
    out += `Program Headers     : ${result.programHeaderCount} segmen (PT_LOAD: ${result.loadSegments.length})\n`;
    out += `Section Headers     : ${result.sectionHeaderCount} bagian\n`;

    out += `\nSegmen Pemuatan Memori (PT_LOAD):\n`;
    for (let i = 0; i < result.loadSegments.length; i++) {
      const seg = result.loadSegments[i];
      out += `  [${i + 1}] Offset: 0x${seg.offset.toString(16).padStart(8, '0')} | VAddr: 0x${seg.vaddr.toString(16).padStart(16, '0')} | PAddr: 0x${seg.paddr.toString(16).padStart(8, '0')} | Izin: [${seg.flagsStr}] | FileSz: ${seg.filesz} B | MemSz: ${seg.memsz} B\n`;
    }

    if (result.sectionHeaders.length > 0) {
      out += `\nDaftar Bagian (Sections):\n`;
      for (const sec of result.sectionHeaders) {
        if (sec.type === 0) continue; // skip null section
        out += `  - ${sec.name.padEnd(16)} (Type: ${sec.typeName.padEnd(12)}, Addr: 0x${sec.addr.toString(16)}, Size: ${sec.size} B)\n`;
      }
    }

    if (result.errors.length > 0) {
      out += `\nTemuan Galat:\n`;
      for (const err of result.errors) {
        out += `  [✗] ${err}\n`;
      }
    }

    out += '======================================================================\n';
    return out;
  }
}
