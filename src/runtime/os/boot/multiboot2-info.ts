/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Multiboot2 Boot Information Parser.
 * Parses the runtime information block supplied by a Multiboot2 bootloader.
 * This is a bounded parser/model; it does not dereference physical memory itself.
 */

export const MULTIBOOT2_INFO_TAG = {
  END: 0,
  MEMORY_MAP: 6,
} as const;

export type Multiboot2MemoryKind =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'ACPI_RECLAIMABLE'
  | 'ACPI_NVS'
  | 'BAD_MEMORY'
  | 'UNKNOWN';

export interface Multiboot2MemoryRegion {
  base: bigint;
  length: bigint;
  endExclusive: bigint;
  type: number;
  kind: Multiboot2MemoryKind;
  usable: boolean;
}

export interface Multiboot2InfoTag {
  type: number;
  size: number;
  offset: number;
}

export interface Multiboot2BootInformation {
  totalSize: number;
  tags: Multiboot2InfoTag[];
  memoryMap: Multiboot2MemoryRegion[];
}

const UINT64_LIMIT = 1n << 64n;
const MIN_MEMORY_MAP_ENTRY_SIZE = 24;

function memoryKind(type: number): Multiboot2MemoryKind {
  switch (type) {
    case 1: return 'AVAILABLE';
    case 2: return 'RESERVED';
    case 3: return 'ACPI_RECLAIMABLE';
    case 4: return 'ACPI_NVS';
    case 5: return 'BAD_MEMORY';
    default: return 'UNKNOWN';
  }
}

/**
 * Validates and parses a Multiboot2 information structure.
 * All offsets and tag lengths are checked before any field is read.
 */
export class Multiboot2InfoParser {
  public static parse(bytes: Uint8Array): Multiboot2BootInformation {
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError('Data Multiboot2 harus berupa Uint8Array.');
    }
    if (bytes.byteLength < 16) {
      throw new RangeError('Struktur informasi Multiboot2 terlalu pendek.');
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const totalSize = view.getUint32(0, true);
    const reserved = view.getUint32(4, true);

    if (totalSize < 16 || totalSize > bytes.byteLength || totalSize % 8 !== 0) {
      throw new RangeError('total_size Multiboot2 tidak valid atau tidak selaras 8 byte.');
    }
    if (reserved !== 0) {
      throw new RangeError('Field reserved pada informasi Multiboot2 harus bernilai 0.');
    }

    const tags: Multiboot2InfoTag[] = [];
    const memoryMap: Multiboot2MemoryRegion[] = [];
    let offset = 8;
    let foundEndTag = false;

    while (offset < totalSize) {
      if (totalSize - offset < 8) {
        throw new RangeError('Header tag Multiboot2 terpotong.');
      }

      const type = view.getUint32(offset, true);
      const size = view.getUint32(offset + 4, true);

      if (size < 8 || size > totalSize - offset) {
        throw new RangeError(`Ukuran tag Multiboot2 tidak valid pada offset ${offset}.`);
      }

      tags.push({ type, size, offset });

      if (type === MULTIBOOT2_INFO_TAG.END) {
        if (size !== 8 || offset + size !== totalSize) {
          throw new RangeError('End tag Multiboot2 harus berukuran 8 byte dan menjadi tag terakhir.');
        }
        foundEndTag = true;
        offset += size;
        break;
      }

      if (type === MULTIBOOT2_INFO_TAG.MEMORY_MAP) {
        if (size < 16) {
          throw new RangeError('Memory-map tag Multiboot2 harus memiliki header 16 byte.');
        }

        const entrySize = view.getUint32(offset + 8, true);
        const entryVersion = view.getUint32(offset + 12, true);
        if (entryVersion !== 0) {
          throw new RangeError(`Versi entri memory map tidak didukung: ${entryVersion}.`);
        }
        if (entrySize < MIN_MEMORY_MAP_ENTRY_SIZE || entrySize % 8 !== 0) {
          throw new RangeError('entry_size memory map harus minimal 24 byte dan selaras 8 byte.');
        }

        const payloadSize = size - 16;
        if (payloadSize % entrySize !== 0) {
          throw new RangeError('Payload memory map tidak habis dibagi entry_size.');
        }

        for (let entryOffset = offset + 16; entryOffset < offset + size; entryOffset += entrySize) {
          const base = view.getBigUint64(entryOffset, true);
          const length = view.getBigUint64(entryOffset + 8, true);
          const typeValue = view.getUint32(entryOffset + 16, true);
          const endExclusive = base + length;

          if (length === 0n || endExclusive <= base || endExclusive > UINT64_LIMIT) {
            throw new RangeError(`Rentang memori Multiboot2 tidak valid pada offset ${entryOffset}.`);
          }

          memoryMap.push({
            base,
            length,
            endExclusive,
            type: typeValue,
            kind: memoryKind(typeValue),
            usable: typeValue === 1,
          });
        }
      }

      const alignedSize = Math.ceil(size / 8) * 8;
      if (alignedSize > totalSize - offset) {
        throw new RangeError('Padding tag Multiboot2 melewati total_size.');
      }
      offset += alignedSize;
    }

    if (!foundEndTag || offset !== totalSize) {
      throw new RangeError('End tag Multiboot2 tidak ditemukan pada akhir struktur.');
    }

    return { totalSize, tags, memoryMap };
  }
}
