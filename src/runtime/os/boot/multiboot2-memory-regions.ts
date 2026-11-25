/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Converts Multiboot2 firmware memory descriptors into conservative,
 * page-aligned RAM extents. This is a pure model/helper; it does not map,
 * read, or reserve physical memory in the running kernel.
 */
import type { Multiboot2MemoryRegion } from './multiboot2-info.js';

const UINT64_LIMIT = 1n << 64n;

export interface PhysicalMemoryReservation {
  base: bigint;
  length: bigint;
  reason?: string;
}

/**
 * Fixed bootstrap CPU-local physical reservations used by the x86-64 encoder.
 *
 * These ranges are a reservation contract for firmware-derived PMM setup;
 * callers must pass them through NormalizePhysicalMemoryOptions.reservations.
 * They do not themselves reserve hardware pages or configure page tables.
 */
export const BOOTSTRAP_CPU_LOCAL_RESERVATIONS: readonly PhysicalMemoryReservation[] = Object.freeze([
  { base: 0x24c000n, length: 0x4000n, reason: 'bootstrap CPU syscall stack (16 KiB)' },
  { base: 0x251000n, length: 0x1000n, reason: 'bootstrap CPU-local GS data page' },
]);


/**
 * Lowest physical address the bootstrap PMM may consider for allocation.
 * The fixed kernel image/low bootstrap area is excluded below this boundary.
 * Dynamic Multiboot2 information, modules, framebuffer and DMA buffers must
 * still be discovered and reserved separately by the native PMM initializer.
 */
export const BOOTSTRAP_MINIMUM_ALLOCATABLE_ADDRESS = 0x200000n;

/**
 * Complete known physical footprint of the current single-CPU x86 bootstrap.
 *
 * These reservations cover page tables, kernel state/descriptor tables,
 * a conservative 64 KiB kernel/IST stack arena, CPU-local syscall stack/data,
 * boot page tables, and the four 4 KiB user code/stack frames.
 *
 * This remains a model-side manifest: the future native PMM initializer must
 * pass both this list and BOOTSTRAP_MINIMUM_ALLOCATABLE_ADDRESS to the
 * normalizer. Stack arena size is a conservative reservation, not a measured
 * runtime stack high-water mark. No AP/SMP memory is included.
 */
export const BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS: readonly PhysicalMemoryReservation[] = Object.freeze([
  { base: 0x200000n, length: 0x18000n, reason: 'bootstrap process/direct-map page tables (96 KiB)' },
  { base: 0x218000n, length: 0x4000n, reason: 'kernel state, TSS, IDT and IDTR (16 KiB)' },
  { base: 0x220000n, length: 0x10000n, reason: 'bootstrap kernel and IST stack arena (64 KiB)' },
  ...BOOTSTRAP_CPU_LOCAL_RESERVATIONS,
  { base: 0x260000n, length: 0x10000n, reason: 'copied Multiboot2 information buffer (64 KiB)' },
  { base: 0x270000n, length: 0x1000n, reason: 'native Multiboot2 page-extent candidate workspace (4 KiB)' },
  { base: 0x271000n, length: 0x1000n, reason: 'native Multiboot2 reservation catalog workspace (4 KiB)' },
  { base: 0x272000n, length: 0x1000n, reason: 'native Multiboot2 reservation normalization workspace (4 KiB)' },
  { base: 0x2f0000n, length: 0x4000n, reason: 'early boot page tables (16 KiB)' },
  { base: 0x600000n, length: 0x1000n, reason: 'process A user code frame (4 KiB)' },
  { base: 0x610000n, length: 0x1000n, reason: 'process A user stack frame (4 KiB)' },
  { base: 0x620000n, length: 0x1000n, reason: 'process B user code frame (4 KiB)' },
  { base: 0x630000n, length: 0x1000n, reason: 'process B user stack frame (4 KiB)' },
]);

export interface UsablePhysicalMemoryExtent {
  base: bigint;
  length: bigint;
  endExclusive: bigint;
}

export interface NormalizePhysicalMemoryOptions {
  pageSize?: bigint;
  minimumAddress?: bigint;
  reservations?: readonly PhysicalMemoryReservation[];
}

interface Interval {
  start: bigint;
  end: bigint;
}

function assertRange(base: bigint, length: bigint, label: string): bigint {
  if (typeof base !== 'bigint' || typeof length !== 'bigint' || base < 0n || length <= 0n) {
    throw new RangeError(`${label}: base/length harus bigint non-negatif dan panjang positif.`);
  }
  const end = base + length;
  if (end <= base || end > UINT64_LIMIT) {
    throw new RangeError(`${label}: rentang melampaui batas alamat fisik uint64.`);
  }
  return end;
}

function alignDown(value: bigint, alignment: bigint): bigint {
  return (value / alignment) * alignment;
}

function alignUp(value: bigint, alignment: bigint): bigint {
  const quotient = value / alignment;
  return (value % alignment === 0n ? quotient : quotient + 1n) * alignment;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  intervals.sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
  const merged: Interval[] = [];
  for (const interval of intervals) {
    if (interval.start >= interval.end) continue;
    const previous = merged[merged.length - 1];
    if (previous && interval.start <= previous.end) {
      if (interval.end > previous.end) previous.end = interval.end;
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

/**
 * Return only complete pages fully contained in firmware type-1 RAM.
 * Every non-type-1 descriptor, unknown descriptor, and caller reservation
 * conservatively blocks every page it touches.
 */
export function normalizeMultiboot2MemoryRegions(
  regions: readonly Multiboot2MemoryRegion[],
  options: NormalizePhysicalMemoryOptions = {},
): UsablePhysicalMemoryExtent[] {
  if (!Array.isArray(regions)) {
    throw new TypeError('Daftar memory map harus berupa array.');
  }

  const pageSize = options.pageSize ?? 4096n;
  const minimumAddress = options.minimumAddress ?? 0x100000n;
  if (typeof pageSize !== 'bigint' || pageSize <= 0n || (pageSize & (pageSize - 1n)) !== 0n) {
    throw new RangeError('Ukuran halaman harus pangkat dua positif dalam bigint.');
  }
  if (typeof minimumAddress !== 'bigint' || minimumAddress < 0n || minimumAddress > UINT64_LIMIT) {
    throw new RangeError('minimumAddress harus berada dalam rentang uint64.');
  }

  const effectiveMinimumAddress = alignUp(minimumAddress, pageSize);
  const usable: Interval[] = [];
  const blocked: Interval[] = [];

  for (const [index, region] of regions.entries()) {
    if (!region || !Number.isSafeInteger(region.type) || region.type < 0 || region.type > 0xFFFF_FFFF) {
      throw new TypeError(`Descriptor memory map #${index} tidak valid.`);
    }
    const end = assertRange(region.base, region.length, `Descriptor memory map #${index}`);
    if (region.endExclusive !== end || typeof region.usable !== 'boolean') {
      throw new RangeError(`Descriptor memory map #${index} tidak konsisten.`);
    }

    if (region.type === 1 && region.usable) {
      const start = alignUp(region.base, pageSize);
      const alignedEnd = alignDown(end, pageSize);
      const clippedStart = start > effectiveMinimumAddress ? start : effectiveMinimumAddress;
      if (clippedStart < alignedEnd) usable.push({ start: clippedStart, end: alignedEnd });
    } else {
      // Unknown/reserved/ACPI/bad regions are never handed to the allocator.
      const start = alignDown(region.base, pageSize);
      const alignedEnd = alignUp(end, pageSize);
      if (start < alignedEnd) blocked.push({ start, end: alignedEnd });
    }
  }

  for (const [index, reservation] of (options.reservations ?? []).entries()) {
    const end = assertRange(reservation.base, reservation.length, `Reservasi #${index}`);
    blocked.push({
      start: alignDown(reservation.base, pageSize),
      end: alignUp(end, pageSize),
    });
  }

  const available = mergeIntervals(usable);
  const exclusions = mergeIntervals(blocked);
  const result: UsablePhysicalMemoryExtent[] = [];

  for (const candidate of available) {
    let cursor = candidate.start;
    for (const exclusion of exclusions) {
      if (exclusion.end <= cursor) continue;
      if (exclusion.start >= candidate.end) break;
      if (exclusion.start > cursor) {
        result.push({
          base: cursor,
          length: exclusion.start - cursor,
          endExclusive: exclusion.start,
        });
      }
      if (exclusion.end > cursor) cursor = exclusion.end;
      if (cursor >= candidate.end) break;
    }
    if (cursor < candidate.end) {
      result.push({
        base: cursor,
        length: candidate.end - cursor,
        endExclusive: candidate.end,
      });
    }
  }

  return result;
}


/**
 * Phase 81 reference algorithm: subtract a sorted reservation set from already
 * normalized, sorted firmware candidates. This is a deterministic TypeScript
 * oracle for the future native bootstrap implementation; it is not invoked by
 * Ring 0 and does not make the resulting extents hardware allocator input.
 */
export function subtractNormalizedPhysicalReservations(
  candidates: readonly UsablePhysicalMemoryExtent[],
  reservations: readonly PhysicalMemoryReservation[],
  options: { pageSize?: bigint; maxOutputExtents?: number } = {},
): UsablePhysicalMemoryExtent[] {
  if (!Array.isArray(candidates) || !Array.isArray(reservations)) {
    throw new TypeError('Kandidat dan reservasi harus berupa array.');
  }
  const pageSize = options.pageSize ?? 4096n;
  const maxOutputExtents = options.maxOutputExtents ?? 320;
  if (typeof pageSize !== 'bigint' || pageSize <= 0n || (pageSize & (pageSize - 1n)) !== 0n) {
    throw new RangeError('Ukuran halaman harus pangkat dua positif.');
  }
  if (!Number.isSafeInteger(maxOutputExtents) || maxOutputExtents < 0) {
    throw new RangeError('Kapasitas hasil harus bilangan bulat aman non-negatif.');
  }

  let previousCandidateEnd = -1n;
  const checkedCandidates: Interval[] = [];
  for (const [index, candidate] of candidates.entries()) {
    if (!candidate || typeof candidate.base !== 'bigint ||
        typeof candidate.length !== 'bigint' || typeof candidate.endExclusive !== 'bigint') {
      throw new TypeError(`Kandidat #${index} tidak valid.`);
    }
    const end = assertRange(candidate.base, candidate.length, `Kandidat #${index}`);
    if (candidate.endExclusive !== end || candidate.base % pageSize !== 0n ||
        end % pageSize !== 0n || candidate.base < previousCandidateEnd) {
      throw new RangeError(`Kandidat #${index} tidak sejajar atau tidak terurut.`);
    }
    checkedCandidates.push({ start: candidate.base, end });
    previousCandidateEnd = end;
  }

  const exclusions: Interval[] = [];
  for (const [index, reservation] of reservations.entries()) {
    const end = assertRange(reservation.base, reservation.length, `Reservasi #${index}`);
    exclusions.push({
      start: alignDown(reservation.base, pageSize),
      end: alignUp(end, pageSize),
    });
  }
  const mergedExclusions = mergeIntervals(exclusions);
  const result: UsablePhysicalMemoryExtent[] = [];
  const append = (start: bigint, end: bigint) => {
    if (start >= end) return;
    if (result.length >= maxOutputExtents) {
      throw new RangeError('Kapasitas tabel hasil pengurangan reservasi terlampaui.');
    }
    result.push({ base: start, length: end - start, endExclusive: end });
  };

  let exclusionIndex = 0;
  for (const candidate of checkedCandidates) {
    let cursor = candidate.start;
    while (exclusionIndex < mergedExclusions.length &&
           mergedExclusions[exclusionIndex].end <= cursor) exclusionIndex++;
    let scan = exclusionIndex;
    while (scan < mergedExclusions.length) {
      const exclusion = mergedExclusions[scan];
      if (exclusion.start >= candidate.end) break;
      if (exclusion.start > cursor) append(cursor, exclusion.start);
      if (exclusion.end > cursor) cursor = exclusion.end;
      if (cursor >= candidate.end) break;
      scan++;
    }
    if (cursor < candidate.end) append(cursor, candidate.end);
  }
  return result;
}
