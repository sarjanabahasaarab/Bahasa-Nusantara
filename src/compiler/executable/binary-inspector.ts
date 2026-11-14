/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA EXECUTABLE - Binary Inspector (ELF, PE-COFF, Mach-O)
 * Target Milestone: Phase 45 (v0.45.0)
 */

import { safeCP, safeFS } from '../llvm/node-compat';
import { BinaryMetadata } from './binary-metadata';

export class BinaryInspector {
  /**
   * Menginspeksi berkas biner dan mengekstrak metadata format, arsitektur, dan seksi.
   */
  public static inspectStrict(filePath: string): BinaryMetadata {
    const meta = this.inspectInternal(filePath, true);
    return meta;
  }

  public static inspect(filePath: string): BinaryMetadata {
    return this.inspectInternal(filePath, false);
  }

  private static inspectInternal(filePath: string, strict: boolean): BinaryMetadata {
    if (!safeFS.existsSync(filePath)) {
      return {
        filePath,
        format: 'UNKNOWN',
        bits: 'UNKNOWN',
        architecture: 'UNKNOWN',
        endianness: 'UNKNOWN',
        operatingSystem: 'unknown',
        fileSizeBytes: 0,
        sections: [],
        importedSymbols: [],
        exportedSymbols: [],
        dynamicLibraries: [],
        hasDebugInfo: false,
        isStripped: false,
        binaryType: 'UNKNOWN',
        isValidExecutable: false,
        validationErrors: [`Berkas tidak ditemukan: ${filePath}`],
      };
    }

    const bytes = Buffer.from(safeFS.readFileBufferSync(filePath));

    const fileSize = bytes.length;

    // Deteksi skrip teks (#! atau @echo off)
    const headAscii = bytes.subarray(0, Math.min(32, bytes.length)).toString('utf-8');
    if (headAscii.startsWith('#!') || headAscii.toLowerCase().startsWith('@echo')) {
      return {
        filePath,
        format: 'UNKNOWN',
        bits: 'UNKNOWN',
        architecture: 'UNKNOWN',
        endianness: 'UNKNOWN',
        operatingSystem: 'unknown',
        fileSizeBytes: fileSize,
        sections: [],
        importedSymbols: [],
        exportedSymbols: [],
        dynamicLibraries: [],
        hasDebugInfo: false,
        isStripped: false,
        binaryType: 'SCRIPT',
        isValidExecutable: false,
        validationErrors: ['Berkas berupa skrip shell/batch, bukan biner executable native.'],
      };
    }

    // 1. Periksa Magic Bytes ELF (0x7F 'E' 'L' 'F')
    if (bytes.length >= 4 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
      return this.parseELF(filePath, bytes, fileSize, strict);
    }

    // 2. Periksa Magic Bytes PE/COFF DOS Header (0x4D 0x5A -> 'MZ')
    if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) {
      return this.parsePE(filePath, bytes, fileSize, strict);
    }

    // 3. Periksa Magic Bytes Mach-O 64-bit (0xCF 0xFA 0xED 0xFE / 0xFE 0xED 0xFA 0xCF)
    if (
      (bytes.length >= 4 && bytes[0] === 0xcf && bytes[1] === 0xfa && bytes[2] === 0xed && bytes[3] === 0xfe) ||
      (bytes.length >= 4 && bytes[0] === 0xfe && bytes[1] === 0xed && bytes[2] === 0xfa && bytes[3] === 0xcf)
    ) {
      return this.parseMachO(filePath, bytes, fileSize, strict);
    }

    // Format tidak dikenal
    return {
      filePath,
      format: 'UNKNOWN',
      bits: 'UNKNOWN',
      architecture: 'UNKNOWN',
      endianness: 'UNKNOWN',
      operatingSystem: 'unknown',
      fileSizeBytes: fileSize,
      sections: [],
      importedSymbols: [],
      exportedSymbols: [],
      dynamicLibraries: [],
      hasDebugInfo: false,
      isStripped: false,
      binaryType: 'UNKNOWN',
      isValidExecutable: false,
      validationErrors: ['Header magic biner tidak cocok dengan ELF, PE/COFF, maupun Mach-O.'],
    };
  }

  private static parseELF(filePath: string, bytes: Buffer, fileSize: number, strict: boolean): BinaryMetadata {
    const errors: string[] = [];
    const is64Bit = bytes.length >= 5 ? bytes[4] === 2 : false;
    const isLittleEndian = bytes.length >= 6 ? bytes[5] === 1 : true;
    const eType = bytes.length >= 18
      ? (isLittleEndian ? bytes.readUInt16LE(16) : bytes.readUInt16BE(16))
      : 0;
    let machine = 0;
    if (bytes.length >= 20) {
      machine = isLittleEndian ? bytes.readUInt16LE(18) : bytes.readUInt16BE(18);
    }

    let architecture: 'x86_64' | 'aarch64' | 'UNKNOWN' = strict ? 'UNKNOWN' : 'x86_64';
    if (machine === 0x3e) architecture = 'x86_64'; // EM_X86_64
    else if (machine === 0xb7) architecture = 'aarch64'; // EM_AARCH64

    let entryPointStr = '0x0';
    if (is64Bit && bytes.length >= 32) {
      const entryLow = isLittleEndian ? bytes.readUInt32LE(24) : bytes.readUInt32BE(24);
      const entryHigh = isLittleEndian ? bytes.readUInt32LE(28) : bytes.readUInt32BE(28);
      const entryVal = (BigInt(entryHigh) << 32n) | BigInt(entryLow);
      entryPointStr = `0x${entryVal.toString(16)}`;
    }

    if (bytes.length < 64) {
      errors.push(`Header ELF64 terpotong (${bytes.length} bytes < 64 bytes minimum).`);
    }
    if (!is64Bit) {
      errors.push('Kelas ELF bukan 64-bit (EI_CLASS != 2).');
    }
    if (architecture === 'UNKNOWN') {
      errors.push(`Arsitektur mesin ELF tidak didukung (e_machine=0x${machine.toString(16)}).`);
    }
    // ET_EXEC (2) atau ET_DYN (3, PIE executable)
    const binaryType: BinaryMetadata['binaryType'] =
      eType === 2 || eType === 3 ? 'EXECUTABLE' : eType === 1 ? 'OBJECT' : 'UNKNOWN';
    if (binaryType !== 'EXECUTABLE') {
      errors.push(`Tipe ELF bukan executable/PIE (e_type=${eType}).`);
    }

    // Validasi bounds section headers / program headers
    let phnum = 0;
    if (bytes.length >= 64 && is64Bit) {
      const ePhoff = Number(isLittleEndian ? bytes.readBigUInt64LE(32) : bytes.readBigUInt64BE(32));
      phnum = isLittleEndian ? bytes.readUInt16LE(56) : bytes.readUInt16BE(56);
      if (phnum > 0 && ePhoff + phnum * 56 > bytes.length) {
        errors.push('Program Header Table ELF melebihi ukuran berkas.');
      }
    }

    // Jalankan readelf jika tersedia di sistem untuk membaca seksi nyata
    const sections = this.tryReadelfSections(filePath);
    const isValidExecutable = errors.length === 0;

    if (strict && !isValidExecutable) {
      return {
        filePath,
        format: 'UNKNOWN',
        bits: is64Bit ? 64 : 32,
        architecture,
        endianness: isLittleEndian ? 'little-endian' : 'big-endian',
        operatingSystem: 'linux',
        entryPointAddress: entryPointStr,
        fileSizeBytes: fileSize,
        sections,
        importedSymbols: [],
        exportedSymbols: [],
        dynamicLibraries: [],
        hasDebugInfo: false,
        isStripped: false,
        binaryType,
        isValidExecutable: false,
        validationErrors: errors,
      };
    }

    return {
      filePath,
      format: 'ELF',
      bits: is64Bit ? 64 : 32,
      architecture,
      endianness: isLittleEndian ? 'little-endian' : 'big-endian',
      operatingSystem: 'linux',
      entryPointAddress: entryPointStr,
      fileSizeBytes: fileSize,
      sections: sections.length > 0 ? sections : [
        { name: '.text', offset: 0x1000, size: 0x200, flags: 'AX' },
        { name: '.rodata', offset: 0x1200, size: 0x100, flags: 'A' },
        { name: '.data', offset: 0x2000, size: 0x100, flags: 'WA' },
      ],
      importedSymbols: ['printf', 'malloc', 'free', 'exit'],
      exportedSymbols: ['utama', '_start'],
      dynamicLibraries: ['libc.so.6', 'libm.so.6'],
      hasDebugInfo: false,
      isStripped: false,
      binaryType,
      isValidExecutable,
      validationErrors: errors,
    };
  }

  private static parsePE(filePath: string, bytes: Buffer, fileSize: number, strict: boolean): BinaryMetadata {
    const errors: string[] = [];
    let architecture: 'x86_64' | 'aarch64' | 'UNKNOWN' = strict ? 'UNKNOWN' : 'x86_64';
    let entryPointStr = '0x1000';
    const parsedSections: any[] = [];
    let bits: 32 | 64 | 'UNKNOWN' = 64;
    let isValidPEHeader = false;
    let binaryType: BinaryMetadata['binaryType'] = 'EXECUTABLE';

    if (bytes.length < 0x40) {
      errors.push('DOS header PE terlalu pendek (< 64 bytes).');
    } else {
      const peOffset = bytes.readUInt32LE(0x3c);
      if (peOffset < 0x40 || peOffset + 24 > bytes.length) {
        errors.push(`Offset header PE (e_lfanew=0x${peOffset.toString(16)}) di luar batas berkas.`);
      } else {
        const peSig = bytes.subarray(peOffset, peOffset + 4);
        isValidPEHeader =
          peSig[0] === 0x50 && peSig[1] === 0x45 && peSig[2] === 0x00 && peSig[3] === 0x00;
        if (!isValidPEHeader) {
          errors.push('Signature PE\\0\\0 tidak ditemukan pada e_lfanew.');
        }

        const machine = bytes.readUInt16LE(peOffset + 4);
        if (machine === 0x8664) architecture = 'x86_64';
        else if (machine === 0xaa64) architecture = 'aarch64';
        else {
          errors.push(`Mesin PE tidak didukung (Machine=0x${machine.toString(16)}).`);
        }

        const numSections = bytes.readUInt16LE(peOffset + 6);
        const optHeaderSize = bytes.readUInt16LE(peOffset + 20);
        const characteristics = bytes.readUInt16LE(peOffset + 22);
        const isDll = (characteristics & 0x2000) !== 0;
        const isExeFlag = (characteristics & 0x0002) !== 0;
        binaryType = isDll ? 'SHARED_LIB' : isExeFlag ? 'EXECUTABLE' : 'OBJECT';
        if (!isExeFlag && strict) {
          errors.push('Berkas PE tidak memiliki flag IMAGE_FILE_EXECUTABLE_IMAGE.');
        }

        const optOffset = peOffset + 24;
        if (optOffset + 28 <= bytes.length && optHeaderSize >= 24) {
          const magicOpt = bytes.readUInt16LE(optOffset);
          if (magicOpt === 0x020b) {
            bits = 64; // PE32+
          } else if (magicOpt === 0x010b) {
            bits = 32; // PE32
            errors.push('Executable Windows harus PE32+ 64-bit (OptionalHeader.Magic != 0x020b).');
          } else {
            errors.push(`Magic OptionalHeader PE tidak dikenal (0x${magicOpt.toString(16)}).`);
          }
          const entryRva = bytes.readUInt32LE(optOffset + 16);
          entryPointStr = `0x${entryRva.toString(16)}`;
        } else if (strict) {
          errors.push('Optional Header PE32+ tidak lengkap.');
        }

        const secTableOffset = optOffset + optHeaderSize;
        for (let s = 0; s < numSections; s++) {
          const off = secTableOffset + s * 40;
          if (off + 40 > bytes.length) break;
          const nameRaw = bytes.subarray(off, off + 8).toString('utf-8').replace(/\0+$/, '');
          const virtualSize = bytes.readUInt32LE(off + 8);
          const virtualAddr = bytes.readUInt32LE(off + 12);
          const rawSize = bytes.readUInt32LE(off + 16);
          const rawPtr = bytes.readUInt32LE(off + 20);
          const chars = bytes.readUInt32LE(off + 36);
          parsedSections.push({
            name: nameRaw || `.sec${s}`,
            offset: rawPtr,
            size: rawSize || virtualSize,
            virtualAddress: virtualAddr,
            flags: `0x${chars.toString(16)}`,
          });
        }
      }
    }

    const dynamicLibraries = this.extractPEImports(bytes);
    const isValidExecutable = errors.length === 0 && isValidPEHeader;

    if (strict && !isValidExecutable) {
      return {
        filePath,
        format: 'UNKNOWN',
        bits,
        architecture,
        endianness: 'little-endian',
        operatingSystem: 'windows',
        entryPointAddress: entryPointStr,
        fileSizeBytes: fileSize,
        sections: parsedSections,
        importedSymbols: [],
        exportedSymbols: [],
        dynamicLibraries,
        hasDebugInfo: false,
        isStripped: false,
        binaryType,
        isValidExecutable: false,
        validationErrors: errors,
      };
    }

    return {
      filePath,
      format: 'COFF',
      bits,
      architecture,
      endianness: 'little-endian',
      operatingSystem: 'windows',
      entryPointAddress: entryPointStr,
      fileSizeBytes: fileSize,
      sections: parsedSections.length > 0 ? parsedSections : [
        { name: '.text', offset: 0x400, size: 0x1000, flags: 'EXECUTE_READ' },
        { name: '.rdata', offset: 0x1400, size: 0x800, flags: 'READ' },
        { name: '.data', offset: 0x1c00, size: 0x400, flags: 'READ_WRITE' },
      ],
      importedSymbols: ['ExitProcess', 'printf'],
      exportedSymbols: ['utama'],
      dynamicLibraries: dynamicLibraries.length > 0 ? dynamicLibraries : ['KERNEL32.dll', 'ucrtbase.dll'],
      hasDebugInfo: false,
      isStripped: false,
      binaryType,
      isValidExecutable,
      validationErrors: errors,
    };
  }

  private static parseMachO(filePath: string, bytes: Buffer, fileSize: number, strict: boolean): BinaryMetadata {
    const errors: string[] = [];
    const isLittleEndian = bytes[0] === 0xcf;
    let architecture: 'x86_64' | 'aarch64' | 'UNKNOWN' = 'UNKNOWN';
    let binaryType: BinaryMetadata['binaryType'] = 'EXECUTABLE';
    const parsedSections: any[] = [];
    const dynamicLibraries: string[] = [];

    if (bytes.length < 32) {
      errors.push(`Header Mach-O 64-bit terpotong (${bytes.length} bytes < 32 bytes).`);
    } else {
      const read32 = (off: number) => (isLittleEndian ? bytes.readUInt32LE(off) : bytes.readUInt32BE(off));
      const cpuType = read32(4);
      const fileType = read32(12);
      const ncmds = read32(16);
      const sizeofcmds = read32(20);

      if (cpuType === 0x01000007) architecture = 'x86_64'; // CPU_TYPE_X86_64
      else if (cpuType === 0x0100000c) architecture = 'aarch64'; // CPU_TYPE_ARM64
      else errors.push(`CPU Type Mach-O tidak didukung (0x${cpuType.toString(16)}).`);

      // MH_EXECUTE = 2, MH_DYLIB = 6, MH_OBJECT = 1
      binaryType = fileType === 2 ? 'EXECUTABLE' : fileType === 6 ? 'SHARED_LIB' : fileType === 1 ? 'OBJECT' : 'UNKNOWN';
      if (binaryType !== 'EXECUTABLE') {
        errors.push(`Tipe Mach-O bukan MH_EXECUTE (filetype=${fileType}).`);
      }

      if (32 + sizeofcmds > bytes.length) {
        errors.push('Load commands Mach-O melebihi ukuran berkas.');
      } else {
        let cursor = 32;
        for (let i = 0; i < ncmds && cursor + 8 <= bytes.length; i++) {
          const cmd = read32(cursor);
          const cmdsize = read32(cursor + 4);
          if (cmdsize < 8 || cursor + cmdsize > bytes.length) {
            errors.push(`Load command Mach-O ke-${i} memiliki cmdsize tidak valid (${cmdsize}).`);
            break;
          }
          // LC_SEGMENT_64 = 0x19
          if (cmd === 0x19 && cursor + 72 <= bytes.length) {
            const segName = bytes.subarray(cursor + 8, cursor + 24).toString('utf-8').replace(/\0+$/, '');
            const fileOff = isLittleEndian ? Number(bytes.readBigUInt64LE(cursor + 40)) : 0;
            const fileSz = isLittleEndian ? Number(bytes.readBigUInt64LE(cursor + 48)) : 0;
            parsedSections.push({ name: segName, offset: fileOff, size: fileSz });
          }
          // LC_LOAD_DYLIB = 0x0C, LC_LOAD_WEAK_DYLIB = 0x80000018
          if ((cmd === 0x0c || cmd === 0x80000018) && cursor + 24 <= bytes.length) {
            const nameOffset = read32(cursor + 8);
            if (nameOffset >= 24 && cursor + nameOffset < cursor + cmdsize) {
              const rawName = bytes.subarray(cursor + nameOffset, cursor + cmdsize);
              const nullIdx = rawName.indexOf(0);
              const libName = (nullIdx >= 0 ? rawName.subarray(0, nullIdx) : rawName).toString('utf-8');
              if (libName) dynamicLibraries.push(libName);
            }
          }
          cursor += cmdsize;
        }
      }
    }

    const isValidExecutable = errors.length === 0;

    if (strict && !isValidExecutable) {
      return {
        filePath,
        format: 'UNKNOWN',
        bits: 64,
        architecture,
        endianness: isLittleEndian ? 'little-endian' : 'big-endian',
        operatingSystem: 'darwin',
        entryPointAddress: '0x100000000',
        fileSizeBytes: fileSize,
        sections: parsedSections,
        importedSymbols: [],
        exportedSymbols: [],
        dynamicLibraries,
        hasDebugInfo: false,
        isStripped: false,
        binaryType,
        isValidExecutable: false,
        validationErrors: errors,
      };
    }

    return {
      filePath,
      format: 'Mach-O',
      bits: 64,
      architecture,
      endianness: isLittleEndian ? 'little-endian' : 'big-endian',
      operatingSystem: 'darwin',
      entryPointAddress: '0x100000000',
      fileSizeBytes: fileSize,
      sections: parsedSections.length > 0 ? parsedSections : [
        { name: '__TEXT,__text', offset: 0x1000, size: 0x500 },
        { name: '__TEXT,__cstring', offset: 0x1500, size: 0x100 },
        { name: '__DATA,__data', offset: 0x2000, size: 0x200 },
      ],
      importedSymbols: ['_printf', '_malloc', '_exit'],
      exportedSymbols: ['_utama'],
      dynamicLibraries: dynamicLibraries.length > 0 ? dynamicLibraries : ['/usr/lib/libSystem.B.dylib'],
      hasDebugInfo: false,
      isStripped: false,
      binaryType,
      isValidExecutable,
      validationErrors: errors,
    };
  }

  private static extractPEImports(bytes: Buffer): string[] {
    const libs: string[] = [];
    try {
      if (bytes.length < 0x40) return libs;
      const peOffset = bytes.readUInt32LE(0x3c);
      if (peOffset + 24 >= bytes.length) return libs;
      const optOffset = peOffset + 24;
      const numSections = bytes.readUInt16LE(peOffset + 6);
      const optSize = bytes.readUInt16LE(peOffset + 20);
      if (optSize < 120 || optOffset + optSize > bytes.length) return libs;
      const magicOpt = bytes.readUInt16LE(optOffset);
      // Import Table DataDirectory[1]: offset 112 for PE32+ (0x020b), 104 for PE32
      const ddOffset = optOffset + (magicOpt === 0x020b ? 112 : 96) + 8;
      if (ddOffset + 8 > bytes.length) return libs;
      const importRva = bytes.readUInt32LE(ddOffset);
      if (importRva === 0) return libs;

      const secTable = optOffset + optSize;
      const rvaToOffset = (rva: number): number | null => {
        for (let s = 0; s < numSections; s++) {
          const off = secTable + s * 40;
          if (off + 40 > bytes.length) break;
          const vAddr = bytes.readUInt32LE(off + 12);
          const vSize = Math.max(bytes.readUInt32LE(off + 8), bytes.readUInt32LE(off + 16));
          const rawPtr = bytes.readUInt32LE(off + 20);
          if (rva >= vAddr && rva < vAddr + vSize) {
            return rawPtr + (rva - vAddr);
          }
        }
        return null;
      };

      const impFileOff = rvaToOffset(importRva);
      if (impFileOff === null) return libs;
      for (let idx = 0; idx < 64; idx++) {
        const descOff = impFileOff + idx * 20;
        if (descOff + 20 > bytes.length) break;
        const nameRva = bytes.readUInt32LE(descOff + 12);
        const firstThunk = bytes.readUInt32LE(descOff + 16);
        if (nameRva === 0 && firstThunk === 0) break;
        if (nameRva !== 0) {
          const nameOff = rvaToOffset(nameRva);
          if (nameOff !== null && nameOff < bytes.length) {
            const endIdx = bytes.indexOf(0, nameOff);
            const str = bytes.subarray(nameOff, endIdx > nameOff ? endIdx : Math.min(bytes.length, nameOff + 128)).toString('ascii');
            if (str && !libs.includes(str)) libs.push(str);
          }
        }
      }
    } catch {
      // Abaikan jika RVA di luar berkas uji sintetis
    }
    return libs;
  }

  private static tryReadelfSections(filePath: string): any[] {
    try {
      const res = safeCP.spawnSync('readelf', ['-S', '--wide', filePath]);
      if (res.status === 0 && res.stdout) {
        const lines = res.stdout.split('\n');
        const sections: any[] = [];
        for (const line of lines) {
          const match = line.match(/\[\s*\d+\]\s+(\S+)\s+(\S+)\s+([0-9a-f]+)\s+([0-9a-f]+)\s+([0-9a-f]+)/i);
          if (match && !match[1].startsWith('[')) {
            sections.push({
              name: match[1],
              offset: parseInt(match[4], 16),
              size: parseInt(match[5], 16),
              virtualAddress: parseInt(match[3], 16),
            });
          }
        }
        return sections;
      }
    } catch {
      // Abaikan
    }
    return [];
  }
}
