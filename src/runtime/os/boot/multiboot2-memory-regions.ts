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
