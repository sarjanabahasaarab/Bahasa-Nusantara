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
  MODULE: 3,
  FRAMEBUFFER: 8,
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

export interface Multiboot2Module {
  start: bigint;
  endExclusive: bigint;
  commandLine: string;
}

export interface Multiboot2Framebuffer {
  address: bigint;
  pitch: number;
  width: number;
  height: number;
  bitsPerPixel: number;
  framebufferType: number;
  length: bigint;
  endExclusive: bigint;
}

export interface Multiboot2BootInformation {
  totalSize: number;
  tags: Multiboot2InfoTag[];
  memoryMap: Multiboot2MemoryRegion[];
  modules: Multiboot2Module[];
  framebuffers: Multiboot2Framebuffer[];
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
    const modules: Multiboot2Module[] = [];
    const framebuffers: Multiboot2Framebuffer[] = [];
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


      if (type === MULTIBOOT2_INFO_TAG.MODULE) {
        if (size < 17) throw new RangeError('Module tag Multiboot2 terlalu pendek.');
        const start = BigInt(view.getUint32(offset + 8, true));
        const endExclusive = BigInt(view.getUint32(offset + 12, true));
        if (endExclusive <= start) throw new RangeError('Rentang module Multiboot2 harus positif dan berurutan.');
        const commandBytes = bytes.subarray(offset + 16, offset + size);
        const terminator = commandBytes.indexOf(0);
        if (terminator < 0) throw new RangeError('Command line module Multiboot2 tidak diakhiri NUL.');
        const commandLine = new TextDecoder('utf-8', { fatal: true }).decode(commandBytes.subarray(0, terminator));
        modules.push({ start, endExclusive, commandLine });
      }

      if (type === MULTIBOOT2_INFO_TAG.FRAMEBUFFER) {
        if (size < 32) throw new RangeError('Framebuffer tag Multiboot2 harus minimal 32 byte.');
        const address = view.getBigUint64(offset + 8, true);
        const pitch = view.getUint32(offset + 16, true);
        const width = view.getUint32(offset + 20, true);
        const height = view.getUint32(offset + 24, true);
        const bitsPerPixel = view.getUint8(offset + 28);
        const framebufferType = view.getUint8(offset + 29);
        const reserved = view.getUint16(offset + 30, true);
        const minimumPitch = Math.ceil(width * bitsPerPixel / 8);
        const length = BigInt(pitch) * BigInt(height);
        const endExclusive = address + length;
        if (reserved !== 0 || address === 0n || pitch === 0 || width === 0 ||
            height === 0 || bitsPerPixel === 0 || pitch < minimumPitch ||
            length === 0n || endExclusive <= address || endExclusive > UINT64_LIMIT) {
          throw new RangeError('Rentang atau metadata framebuffer Multiboot2 tidak valid.');
        }
        framebuffers.push({ address, pitch, width, height, bitsPerPixel, framebufferType, length, endExclusive });
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
          const entryReserved = view.getUint32(entryOffset + 20, true);
          const endExclusive = base + length;

          if (entryReserved !== 0) {
            throw new RangeError(`Reserved field memory-map entry harus 0 pada offset ${entryOffset}.`);
          }
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

    return { totalSize, tags, memoryMap, modules, framebuffers };
  }
}


/**
 * Convert runtime bootloader-owned physical ranges into PMM exclusions.
 * Pure model helper only: the native kernel must safely copy MBI bytes and
 * reserve these ranges before making any firmware RAM available to allocation.
 */
export function createMultiboot2BootReservations(
  info: Multiboot2BootInformation,
  infoPhysicalAddress: bigint,
): Array<{ base: bigint; length: bigint; reason: string }> {
  if (!info || !Number.isSafeInteger(info.totalSize) || info.totalSize < 16 ||
      typeof infoPhysicalAddress !== 'bigint' || infoPhysicalAddress < 0n ||
      infoPhysicalAddress % 8n !== 0n) {
    throw new RangeError('Alamat fisik atau metadata Multiboot2 tidak valid.');
  }
  const limit = 1n << 64n;
  const infoEnd = infoPhysicalAddress + BigInt(info.totalSize);
  if (infoEnd <= infoPhysicalAddress || infoEnd > limit) {
    throw new RangeError('Rentang blok informasi Multiboot2 melampaui uint64.');
  }

  const reservations: Array<{ base: bigint; length: bigint; reason: string }> = [{
    base: infoPhysicalAddress,
    length: BigInt(info.totalSize),
    reason: 'Multiboot2 information structure',
  }];

  for (const [index, module] of info.modules.entries()) {
    if (module.start < 0n || module.endExclusive <= module.start || module.endExclusive > limit) {
      throw new RangeError('Rentang module Multiboot2 #' + index + ' tidak valid.');
    }
    reservations.push({
      base: module.start,
      length: module.endExclusive - module.start,
      reason: 'Multiboot2 module #' + index + ': ' + module.commandLine,
    });
  }

  for (const [index, framebuffer] of info.framebuffers.entries()) {
    if (framebuffer.address < 0n || framebuffer.length <= 0n ||
        framebuffer.endExclusive !== framebuffer.address + framebuffer.length ||
        framebuffer.endExclusive > limit) {
      throw new RangeError('Rentang framebuffer Multiboot2 #' + index + ' tidak valid.');
    }
    reservations.push({
      base: framebuffer.address,
      length: framebuffer.length,
      reason: 'Multiboot2 framebuffer #' + index,
    });
  }
  return reservations;
}
