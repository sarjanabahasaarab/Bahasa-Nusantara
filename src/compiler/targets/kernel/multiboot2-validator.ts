/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Multiboot2 Header Inspector & Validator (Phase 49)
 *
 * Memeriksa kesesuaian biner kernel dengan spesifikasi Multiboot2:
 * 1. Magic number 0xE85250D6
 * 2. Arsitektur 0 (i386 32-bit protected mode entry)
 * 3. Header length selaras 8-byte
 * 4. Checksum (magic + arch + length + checksum == 0)
 * 5. Batas lokasi dalam 32768 byte pertama biner ELF
 * 6. Parsing tag-tag Multiboot2 (End tag, Information request, Address, Entry, Framebuffer)
 */

import {
  MULTIBOOT2_HEADER_MAGIC,
  MULTIBOOT2_ARCH_I386,
} from './boot-headers';

export interface Multiboot2ParsedTag {
  type: number;
  typeName: string;
  flags: number;
  size: number;
  rawOffset: number;
  details?: Record<string, any>;
}

export interface Multiboot2InspectionResult {
  valid: boolean;
  headerOffset: number; // Offset byte dalam file ELF
  magic: number;
  architecture: number;
  architectureName: string;
  headerLength: number;
  checksum: number;
  checksumValid: boolean;
  aligned8: boolean;
  withinFirst32KB: boolean;
  tags: Multiboot2ParsedTag[];
  hasEndTag: boolean;
  errors: string[];
  warnings: string[];
  bootloaderCompatibility: {
    grub2: boolean;
    qemuDirectKernel: boolean;
    limineMultiboot2: boolean;
  };
}

export class Multiboot2Validator {
  public static readonly MAX_HEADER_SEARCH_BYTES = 32768; // 32 KiB per Multiboot2 spec

  public static inspect(binary: Uint8Array): Multiboot2InspectionResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Cari magic Multiboot2 di dalam 32 KiB pertama dengan perataan 8-byte
    let foundOffset = -1;
    const searchLimit = Math.min(binary.byteLength - 16, this.MAX_HEADER_SEARCH_BYTES);

    const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);

    for (let offset = 0; offset <= searchLimit; offset += 8) {
      const magic = view.getUint32(offset, true);
      if (magic === MULTIBOOT2_HEADER_MAGIC) {
        foundOffset = offset;
        break;
      }
    }

    if (foundOffset === -1) {
      // Coba periksa apakah magic ada tetapi tidak selaras 8-byte
      for (let offset = 0; offset <= searchLimit; offset += 4) {
        if (view.getUint32(offset, true) === MULTIBOOT2_HEADER_MAGIC) {
          errors.push(
            `Header Multiboot2 ditemukan di offset 0x${offset.toString(16)}, namun TIDAK selaras kelipatan 8 byte (alignment violation).`
          );
          foundOffset = offset;
          break;
        }
      }
    }

    if (foundOffset === -1) {
      return {
        valid: false,
        headerOffset: -1,
        magic: 0,
        architecture: -1,
        architectureName: 'UNKNOWN',
        headerLength: 0,
        checksum: 0,
        checksumValid: false,
        aligned8: false,
        withinFirst32KB: false,
        tags: [],
        hasEndTag: false,
        errors: [
          'Magic Multiboot2 (0xE85250D6) tidak ditemukan dalam batas 32 KiB pertama berkas.',
        ],
        warnings: [],
        bootloaderCompatibility: {
          grub2: false,
          qemuDirectKernel: false,
          limineMultiboot2: false,
        },
      };
    }

    // 2. Baca field pokok Multiboot2 header
    const magic = view.getUint32(foundOffset, true);
    const arch = view.getUint32(foundOffset + 4, true);
    const headerLength = view.getUint32(foundOffset + 8, true);
    const checksum = view.getUint32(foundOffset + 12, true);

    const aligned8 = foundOffset % 8 === 0;
    const withinFirst32KB = foundOffset < this.MAX_HEADER_SEARCH_BYTES;

    if (!aligned8) {
      errors.push(`Offset header (0x${foundOffset.toString(16)}) melanggar aturan perataan 8-byte.`);
    }

    if (!withinFirst32KB) {
      errors.push(`Header Multiboot2 berada di luar batas 32 KiB pertama.`);
    }

    let archName = 'UNKNOWN';
    if (arch === MULTIBOOT2_ARCH_I386) {
      archName = 'i386 (32-bit protected mode entry)';
    } else if (arch === 4) {
      archName = 'MIPS';
    } else {
      errors.push(`Arsitektur header tidak didukung: ${arch} (harus 0 untuk i386 / x86_64 bootstrap)`);
    }

    if (headerLength < 16) {
      errors.push(`Header length (${headerLength} byte) kurang dari panjang minimum 16 byte.`);
    } else if (headerLength % 8 !== 0) {
      errors.push(`Header length (${headerLength} byte) bukan kelipatan 8.`);
    }

    const sum = (magic + arch + headerLength + checksum) >>> 0;
    const checksumValid = sum === 0;
    if (!checksumValid) {
      errors.push(
        `Checksum Multiboot2 tidak valid: (magic + arch + length + checksum) = 0x${sum.toString(16)} (seharusnya 0).`
      );
    }

    // 3. Parse tag-tag Multiboot2
    const tags: Multiboot2ParsedTag[] = [];
    let hasEndTag = false;
    let tagOffset = foundOffset + 16;
    const headerEnd = foundOffset + headerLength;

    while (tagOffset < headerEnd && tagOffset + 8 <= binary.byteLength) {
      const type = view.getUint16(tagOffset, true);
      const flags = view.getUint16(tagOffset + 2, true);
      const size = view.getUint32(tagOffset + 4, true);

      let typeName = 'UNKNOWN';
      const details: Record<string, any> = {};

      switch (type) {
        case 0:
          typeName = 'END_TAG (Akhir Header)';
          hasEndTag = true;
          break;
        case 1:
          typeName = 'INFORMATION_REQUEST';
          break;
        case 2:
          typeName = 'ADDRESS (Header Address Override)';
          if (size >= 24) {
            details.headerAddr = view.getUint32(tagOffset + 8, true);
            details.loadAddr = view.getUint32(tagOffset + 12, true);
            details.loadEndAddr = view.getUint32(tagOffset + 16, true);
            details.bssEndAddr = view.getUint32(tagOffset + 20, true);
          }
          break;
        case 3:
          typeName = 'ENTRY_ADDRESS (Entry Point Override)';
          if (size >= 12) {
            details.entryAddr = view.getUint32(tagOffset + 8, true);
          }
          break;
        case 4:
          typeName = 'FLAGS (Console Requirements)';
          break;
        case 5:
          typeName = 'FRAMEBUFFER (Requested Video Mode)';
          if (size >= 20) {
            details.width = view.getUint32(tagOffset + 8, true);
            details.height = view.getUint32(tagOffset + 12, true);
            details.bpp = view.getUint32(tagOffset + 16, true);
          }
          break;
        case 6:
          typeName = 'MODULE_ALIGNMENT';
          break;
        case 7:
          typeName = 'EFI_BOOT_SERVICES';
          break;
        case 8:
          typeName = 'EFI_I386_ENTRY';
          break;
        case 9:
          typeName = 'EFI_AMD64_ENTRY';
          break;
        case 10:
          typeName = 'RELOCATABLE_HEADER';
          break;
        default:
          typeName = `TAG_TYPE_${type}`;
      }

      tags.push({
        type,
        typeName,
        flags,
        size,
        rawOffset: tagOffset,
        details: Object.keys(details).length > 0 ? details : undefined,
      });

      if (type === 0) {
        break; // End tag tercapai
      }

      if (size < 8) {
        errors.push(`Tag Multiboot2 korup: ukuran (${size}) kurang dari 8 byte.`);
        break;
      }

      // Ukuran tag harus diratakan ke 8 byte per spesifikasi
      const alignedTagSize = Math.ceil(size / 8) * 8;
      tagOffset += alignedTagSize;
    }

    if (!hasEndTag) {
      errors.push('Multiboot2 End Tag (type 0, size 8) tidak ditemukan di akhir header.');
    }

    const isValid = errors.length === 0;

    return {
      valid: isValid,
      headerOffset: foundOffset,
      magic,
      architecture: arch,
      architectureName: archName,
      headerLength,
      checksum,
      checksumValid,
      aligned8,
      withinFirst32KB,
      tags,
      hasEndTag,
      errors,
      warnings,
      bootloaderCompatibility: {
        grub2: isValid && aligned8 && withinFirst32KB,
        qemuDirectKernel: isValid && aligned8,
        limineMultiboot2: isValid && aligned8,
      },
    };
  }

  /**
   * Menghasilkan teks laporan inspeksi boot Multiboot2 yang mudah dibaca untuk CLI.
   */
  public static formatReport(result: Multiboot2InspectionResult): string {
    let out = '======================================================================\n';
    out += '       LAPORAN INSPEKSI BOOTLOADER PROTOKOL MULTIBOOT2 (x86_64)       \n';
    out += '======================================================================\n';

    if (result.headerOffset === -1) {
      out += `Status              : GAGAL / TIDAK DITEMUKAN\n`;
      for (const err of result.errors) {
        out += `[GALAT] ${err}\n`;
      }
      return out;
    }

    out += `Status Validasi     : ${result.valid ? 'LULUS (VALID)' : 'GAGAL (INVALID)'}\n`;
    out += `Offset Header       : 0x${result.headerOffset.toString(16).padStart(8, '0')} (${result.headerOffset} bytes)\n`;
    out += `Magic Multiboot2    : 0x${result.magic.toString(16).toUpperCase()} ${result.magic === MULTIBOOT2_HEADER_MAGIC ? '[SESUAI]' : '[TIDAK SESUAI]'}\n`;
    out += `Arsitektur          : ${result.architecture} -> ${result.architectureName}\n`;
    out += `Panjang Header      : ${result.headerLength} byte (Diratakan 8-byte: ${result.aligned8 ? 'YA' : 'TIDAK'})\n`;
    out += `Checksum Header     : 0x${result.checksum.toString(16).toUpperCase()} (${result.checksumValid ? 'VALID (Jumlah mod 2^32 = 0)' : 'TIDAK VALID'})\n`;
    out += `Posisi dalam 32KB   : ${result.withinFirst32KB ? 'YA (Sesuai Batas Spesifikasi Multiboot2)' : 'TIDAK'}\n`;

    out += `\nDaftar Tag Header (${result.tags.length}):\n`;
    for (let i = 0; i < result.tags.length; i++) {
      const t = result.tags[i];
      out += `  [${i + 1}] Type ${t.type.toString().padEnd(2)}: ${t.typeName.padEnd(35)} (Size: ${t.size} B, Flags: ${t.flags})\n`;
      if (t.details) {
        out += `       Rincian: ${JSON.stringify(t.details)}\n`;
      }
    }

    out += `\nKompatibilitas Bootloader:\n`;
    out += `  - GRUB 2 (multiboot2 /boot/kernel.elf)   : ${result.bootloaderCompatibility.grub2 ? 'DIDUKUNG' : 'TIDAK DIDUKUNG'}\n`;
    out += `  - QEMU Direct Boot (qemu -kernel file)   : ${result.bootloaderCompatibility.qemuDirectKernel ? 'DIDUKUNG' : 'TIDAK DIDUKUNG'}\n`;
    out += `  - Limine Bootloader (multiboot2 protocol): ${result.bootloaderCompatibility.limineMultiboot2 ? 'DIDUKUNG' : 'TIDAK DIDUKUNG'}\n`;

    if (result.errors.length > 0) {
      out += `\nTemuan Galat:\n`;
      for (const err of result.errors) {
        out += `  [✗] ${err}\n`;
      }
    }

    if (result.warnings.length > 0) {
      out += `\nPeringatan:\n`;
      for (const w of result.warnings) {
        out += `  [!] ${w}\n`;
      }
    }

    out += '======================================================================\n';
    return out;
  }
}
