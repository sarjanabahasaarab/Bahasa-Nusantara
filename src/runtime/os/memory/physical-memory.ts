/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Physical Memory Manager (Bitmap Frame Allocator)
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { PAGE_SIZE, MemoryRegion, MemoryRegionType } from './types';

export class PhysicalMemoryManager {
  private readonly totalFrames: number;
  private readonly bitmap: Uint8Array;
  private freeFrames: number;
  private readonly memoryBase: bigint;

  constructor(totalBytes: number = 64 * 1024 * 1024, memoryBase: bigint = 0x100000n) {
    if (!Number.isSafeInteger(totalBytes) || totalBytes < 0) {
      throw new RangeError('Ukuran memori fisik harus bilangan bulat aman non-negatif');
    }
    if (memoryBase < 0n || memoryBase % BigInt(PAGE_SIZE) !== 0n) {
      throw new RangeError('Base memori fisik harus non-negatif dan page-aligned');
    }
    this.memoryBase = memoryBase;
    this.totalFrames = Math.floor(totalBytes / PAGE_SIZE);
    const bitmapSizeBytes = Math.ceil(this.totalFrames / 8);
    this.bitmap = new Uint8Array(bitmapSizeBytes);
    this.freeFrames = this.totalFrames;
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

  /**
   * Alokasi satu frame fisik (4096 byte)
   */
  public allocateFrame(): bigint | null {
    if (this.freeFrames === 0) return null;

    for (let i = 0; i < this.totalFrames; i++) {
      const byteIdx = i >> 3;
      const bitIdx = i & 7;
      if ((this.bitmap[byteIdx] & (1 << bitIdx)) === 0) {
        // Tandai sebagai teralokasi (1)
        this.bitmap[byteIdx] |= (1 << bitIdx);
        this.freeFrames--;
        return this.memoryBase + BigInt(i * PAGE_SIZE);
      }
    }
    return null;
  }

  public allocateContiguous(count: number): bigint | null {
    return this.allocateContiguousFrames(count);
  }

  public getFreeFrameCount(): number {
    return this.freeFrames;
  }

  public getTotalFrameCount(): number {
    return this.totalFrames;
  }

  /**
   * Alokasi beberapa frame fisik berurutan (kontigu)
   */
  public allocateContiguousFrames(count: number): bigint | null {
    if (!Number.isSafeInteger(count) || count <= 0 || count > this.freeFrames) return null;

    let consecutive = 0;
    let startIdx = -1;

    for (let i = 0; i < this.totalFrames; i++) {
      const byteIdx = i >> 3;
      const bitIdx = i & 7;
      if ((this.bitmap[byteIdx] & (1 << bitIdx)) === 0) {
        if (consecutive === 0) startIdx = i;
        consecutive++;
        if (consecutive === count) {
          // Ditemukan! Tandai seluruhnya teralokasi
          for (let j = startIdx; j < startIdx + count; j++) {
            const b = j >> 3;
            const bit = j & 7;
            this.bitmap[b] |= (1 << bit);
          }
          this.freeFrames -= count;
          return this.memoryBase + BigInt(startIdx * PAGE_SIZE);
        }
      } else {
        consecutive = 0;
        startIdx = -1;
      }
    }
    return null;
  }

  /**
   * Pembebasan frame fisik
   */
  public freeFrame(physAddr: bigint): boolean {
    if (physAddr < this.memoryBase) return false;
    const offset = physAddr - this.memoryBase;
    if (offset % BigInt(PAGE_SIZE) !== 0n) return false;
    const frameIdx = Number(offset / BigInt(PAGE_SIZE));

    if (frameIdx < 0 || frameIdx >= this.totalFrames) {
      return false; // Alamat di luar jangkauan
    }

    const byteIdx = frameIdx >> 3;
    const bitIdx = frameIdx & 7;

    // Periksa apakah sebelumnya memang teralokasi (pencegahan double-free)
    if ((this.bitmap[byteIdx] & (1 << bitIdx)) === 0) {
      return false; // Sudah bebas
    }

    // Bebaskan (0)
    this.bitmap[byteIdx] &= ~(1 << bitIdx);
    this.freeFrames++;
    return true;
  }

  /**
   * Menandai rentang memori fisik sebagai terpakai/reserved (misal untuk kernel text, ACPI, dll)
   */
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
    if (regionEnd <= base) return;

    const managedStart = this.memoryBase;
    const managedEnd = managedStart + BigInt(this.totalFrames * PAGE_SIZE);
    const clippedStart = base > managedStart ? base : managedStart;
    const clippedEnd = regionEnd < managedEnd ? regionEnd : managedEnd;
    if (clippedStart >= clippedEnd) return;

    const pageSize = BigInt(PAGE_SIZE);
    const startIdx = Number((clippedStart - managedStart) / pageSize);
    const endOffset = clippedEnd - managedStart;
    const endIdx = Number((endOffset + pageSize - 1n) / pageSize);

    for (let i = startIdx; i < endIdx; i++) {
      const byteIdx = i >> 3;
      const bitIdx = i & 7;
      if ((this.bitmap[byteIdx] & (1 << bitIdx)) === 0) {
        this.bitmap[byteIdx] |= (1 << bitIdx);
        this.freeFrames--;
      }
    }
  }
}
