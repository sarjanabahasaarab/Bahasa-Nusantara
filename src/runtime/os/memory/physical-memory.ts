/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Physical Memory Manager (Bitmap Frame Allocator)
 * Supports both legacy contiguous test ranges and firmware-described sparse RAM.
 */

import { PAGE_SIZE, MemoryRegion } from './types.js';
import type { UsablePhysicalMemoryExtent } from '../boot/multiboot2-memory-regions.js';

const MAX_BITMAP_SIZE_BYTES = 64 * 1024 * 1024;
const PAGE_SIZE_BIGINT = BigInt(PAGE_SIZE);
const UINT64_LIMIT = 1n << 64n;

interface FrameRange {
  readonly base: bigint;
  readonly frameCount: number;
  readonly firstFrame: number;
}

export class PhysicalMemoryManager {
  private readonly totalFrames: number;
  private readonly bitmap: Uint8Array;
  private freeFrames: number;
  private readonly frameRanges: readonly FrameRange[];

  /**
   * Numeric form preserves the original contiguous allocator API.
   * Extent form accepts only page-aligned, non-overlapping firmware-approved RAM.
   */
  constructor(totalBytes?: number, memoryBase?: bigint);
  constructor(extents: readonly UsablePhysicalMemoryExtent[]);
  constructor(
    totalBytesOrExtents: number | readonly UsablePhysicalMemoryExtent[] = 64 * 1024 * 1024,
    memoryBase: bigint = 0x100000n,
  ) {
    const ranges: FrameRange[] = [];
    let totalFrames = 0;

    if (typeof totalBytesOrExtents === 'number') {
      if (!Number.isSafeInteger(totalBytesOrExtents) || totalBytesOrExtents < 0) {
        throw new RangeError('Ukuran memori fisik harus bilangan bulat aman non-negatif');
      }
      if (typeof memoryBase !== 'bigint' || memoryBase < 0n || memoryBase % PAGE_SIZE_BIGINT !== 0n) {
        throw new RangeError('Base memori fisik harus bigint non-negatif dan page-aligned');
      }
      totalFrames = Math.floor(totalBytesOrExtents / PAGE_SIZE);
      if (totalFrames > 0) {
        ranges.push({ base: memoryBase, frameCount: totalFrames, firstFrame: 0 });
      }
    } else {
      if (!Array.isArray(totalBytesOrExtents)) {
        throw new TypeError('Firmware memory extents harus berupa array.');
      }
      let previousEnd = 0n;
      for (const [index, extent] of totalBytesOrExtents.entries()) {
        if (!extent || typeof extent.base !== 'bigint' || typeof extent.length !== 'bigint' ||
            typeof extent.endExclusive !== 'bigint') {
          throw new TypeError(`Firmware extent #${index} tidak valid.`);
        }
        const { base, length, endExclusive } = extent;
        const end = base + length;
        if (base < 0n || length <= 0n || end <= base || end > UINT64_LIMIT ||
            endExclusive !== end || base % PAGE_SIZE_BIGINT !== 0n ||
            length % PAGE_SIZE_BIGINT !== 0n) {
          throw new RangeError(`Firmware extent #${index} harus valid dan page-aligned.`);
        }
        if (index > 0 && base < previousEnd) {
          throw new RangeError('Firmware extents tidak boleh tumpang tindih atau tidak berurutan.');
        }
        const frameCountBig = length / PAGE_SIZE_BIGINT;
        if (frameCountBig > BigInt(Number.MAX_SAFE_INTEGER)) {
          throw new RangeError('Jumlah frame firmware melebihi batas integer aman.');
        }
        const frameCount = Number(frameCountBig);
        if (!Number.isSafeInteger(totalFrames + frameCount)) {
          throw new RangeError('Jumlah total frame firmware melebihi batas integer aman.');
        }
        ranges.push({ base, frameCount, firstFrame: totalFrames });
        totalFrames += frameCount;
        previousEnd = end;
      }
    }

    const bitmapSizeBytes = Math.ceil(totalFrames / 8);
    if (!Number.isSafeInteger(bitmapSizeBytes) || bitmapSizeBytes > MAX_BITMAP_SIZE_BYTES) {
      throw new RangeError(`Bitmap PMM melebihi batas aman ${MAX_BITMAP_SIZE_BYTES} byte`);
    }

    this.totalFrames = totalFrames;
    this.frameRanges = ranges;
    this.bitmap = new Uint8Array(bitmapSizeBytes);
    this.freeFrames = totalFrames;
  }

  public getTotalBytes(): number {
    return this.totalFrames * PAGE_SIZE;
  }

  public getTotalFrames(): number {
    return this.totalFrames;
  }

  public getFreeFrames(): number {
    return this.freeFrames;
  }

  public getFreeBytes(): number {
    return this.freeFrames * PAGE_SIZE;
  }

  public getFreeFrameCount(): number {
    return this.freeFrames;
  }

  public getTotalFrameCount(): number {
    return this.totalFrames;
  }

  private physicalAddressForFrame(frameIndex: number): bigint | null {
    if (!Number.isSafeInteger(frameIndex) || frameIndex < 0 || frameIndex >= this.totalFrames) return null;
    let low = 0;
    let high = this.frameRanges.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const range = this.frameRanges[mid];
      if (frameIndex < range.firstFrame) high = mid - 1;
      else if (frameIndex >= range.firstFrame + range.frameCount) low = mid + 1;
      else return range.base + BigInt(frameIndex - range.firstFrame) * PAGE_SIZE_BIGINT;
    }
    return null;
  }

  private frameIndexForPhysicalAddress(physicalAddress: bigint): number | null {
    if (typeof physicalAddress !== 'bigint' || physicalAddress < 0n ||
        physicalAddress % PAGE_SIZE_BIGINT !== 0n) return null;
    let low = 0;
    let high = this.frameRanges.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const range = this.frameRanges[mid];
      const end = range.base + BigInt(range.frameCount) * PAGE_SIZE_BIGINT;
      if (physicalAddress < range.base) high = mid - 1;
      else if (physicalAddress >= end) low = mid + 1;
      else return range.firstFrame + Number((physicalAddress - range.base) / PAGE_SIZE_BIGINT);
    }
    return null;
  }

  /** Alokasi satu frame fisik 4 KiB dari rentang RAM yang disetujui firmware. */
  public allocateFrame(): bigint | null {
    if (this.freeFrames === 0) return null;
    for (let i = 0; i < this.totalFrames; i++) {
      const byteIdx = i >> 3;
      const bitIdx = i & 7;
      if ((this.bitmap[byteIdx] & (1 << bitIdx)) === 0) {
        const physicalAddress = this.physicalAddressForFrame(i);
        if (physicalAddress === null) return null;
        this.bitmap[byteIdx] |= 1 << bitIdx;
        this.freeFrames--;
        return physicalAddress;
      }
    }
    return null;
  }

  public allocateContiguous(count: number): bigint | null {
    return this.allocateContiguousFrames(count);
  }

  /** Alokasi frame berurutan secara fisik; tidak pernah melintasi celah firmware. */
  public allocateContiguousFrames(count: number): bigint | null {
    if (!Number.isSafeInteger(count) || count <= 0 || count > this.freeFrames) return null;
    let consecutive = 0;
    let startIdx = -1;
    for (let i = 0; i < this.totalFrames; i++) {
      const byteIdx = i >> 3;
      const bitIdx = i & 7;
      if ((this.bitmap[byteIdx] & (1 << bitIdx)) !== 0) {
        consecutive = 0;
        startIdx = -1;
        continue;
      }
      const currentAddress = this.physicalAddressForFrame(i);
      const previousAddress = i > 0 ? this.physicalAddressForFrame(i - 1) : null;
      if (consecutive === 0 || currentAddress === null ||
          previousAddress === null || currentAddress !== previousAddress + PAGE_SIZE_BIGINT) {
        startIdx = i;
        consecutive = 1;
      } else {
        consecutive++;
      }
      if (consecutive === count) {
        for (let j = startIdx; j < startIdx + count; j++) {
          this.bitmap[j >> 3] |= 1 << (j & 7);
        }
        this.freeFrames -= count;
        return this.physicalAddressForFrame(startIdx);
      }
    }
    return null;
  }

  /** Pembebasan hanya berhasil untuk frame yang benar-benar dikelola allocator ini. */
  public freeFrame(physAddr: bigint): boolean {
    const frameIdx = this.frameIndexForPhysicalAddress(physAddr);
    if (frameIdx === null) return false;
    const byteIdx = frameIdx >> 3;
    const bitIdx = frameIdx & 7;
    if ((this.bitmap[byteIdx] & (1 << bitIdx)) === 0) return false;
    this.bitmap[byteIdx] &= ~(1 << bitIdx);
    this.freeFrames++;
    return true;
  }

  /** Menandai halaman yang disentuh reservasi sebagai terpakai pada rentang yang dikelola. */
  public reserveRegion(regionOrBase: MemoryRegion | bigint, length?: number): void {
    let base: bigint;
    let len: bigint;
    if (typeof regionOrBase === 'bigint') {
      base = regionOrBase;
      const numericLength = length ?? PAGE_SIZE;
      if (!Number.isSafeInteger(numericLength) || numericLength <= 0) return;
      len = BigInt(numericLength);
    } else {
      base = regionOrBase.base;
      len = regionOrBase.length;
      if (typeof len !== 'bigint' || len <= 0n) return;
    }
    if (base < 0n) return;
    const regionEnd = base + len;
    if (regionEnd <= base || regionEnd > UINT64_LIMIT) return;

    for (const range of this.frameRanges) {
      const rangeEnd = range.base + BigInt(range.frameCount) * PAGE_SIZE_BIGINT;
      const clippedStart = base > range.base ? base : range.base;
      const clippedEnd = regionEnd < rangeEnd ? regionEnd : rangeEnd;
      if (clippedStart >= clippedEnd) continue;
      const startIdx = range.firstFrame + Number((clippedStart - range.base) / PAGE_SIZE_BIGINT);
      const endOffset = clippedEnd - range.base;
      const endIdx = range.firstFrame + Number((endOffset + PAGE_SIZE_BIGINT - 1n) / PAGE_SIZE_BIGINT);
      for (let i = startIdx; i < endIdx; i++) {
        const byteIdx = i >> 3;
        const bitIdx = i & 7;
        if ((this.bitmap[byteIdx] & (1 << bitIdx)) === 0) {
          this.bitmap[byteIdx] |= 1 << bitIdx;
          this.freeFrames--;
        }
      }
    }
  }
}
