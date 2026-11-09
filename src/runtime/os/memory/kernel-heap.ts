/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel Heap Allocator
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { HeapAllocationHeader } from './types';
import { KernelABI } from '../abi/kernel-abi';

const HEAP_MAGIC = 0x4E555341; // 'NUSA'

interface AllocatedBlock {
  address: bigint;
  size: number;
  alignment: number;
  isFree: boolean;
  magic: number;
}

export class KernelHeap {
  private readonly heapStart: bigint;
  private readonly heapSize: number;
  private readonly heapEnd: bigint;
  private currentOffset: number = 0;
  private readonly blocks: Map<bigint, AllocatedBlock> = new Map();
  private allocatedBytes: number = 0;

  constructor(heapStart: bigint = 0xFFFF_9000_0000_0000n, heapSize: number = 16 * 1024 * 1024) {
    this.heapStart = heapStart;
    this.heapSize = heapSize;
    this.heapEnd = heapStart + BigInt(heapSize);
  }

  public getHeapStart(): bigint {
    return this.heapStart;
  }

  public getHeapSize(): number {
    return this.heapSize;
  }

  public getAllocatedBytes(): number {
    return this.allocatedBytes;
  }

  public getFreeBytes(): number {
    return this.heapSize - this.allocatedBytes;
  }

  /**
   * Alokasi blok memori kernel dengan dukungan perataan khusus (alignment)
   */
  public allocate(size: number, alignment: number = 8): bigint {
    // 1. Validasi ukuran dan integer overflow
    if (size <= 0 || size > this.heapSize) {
      throw new Error(`Ukuran alokasi memori tidak sah: ${size}`);
    }

    if (alignment <= 0 || (alignment & (alignment - 1)) !== 0) {
      throw new Error(`Alignment harus kelipatan dua positif, diterima: ${alignment}`);
    }

    // 2. Cari blok bebas yang muat (Free-list recycling)
    for (const [addr, block] of this.blocks.entries()) {
      if (block.isFree && block.size >= size && KernelABI.isAligned(addr, alignment)) {
        block.isFree = false;
        this.allocatedBytes += block.size;
        return addr;
      }
    }

    // 3. Alokasi bump dari pointer saat ini
    const rawAddress = this.heapStart + BigInt(this.currentOffset);
    const alignedAddress = KernelABI.alignUp(rawAddress, alignment);
    const padding = Number(alignedAddress - rawAddress);

    const totalRequired = padding + size;
    if (this.currentOffset + totalRequired > this.heapSize) {
      throw new Error(`Out of Memory (OOM): Kernel Heap kehabisan memori (${this.heapSize} bytes terpakai)`);
    }

    this.currentOffset += totalRequired;
    this.allocatedBytes += size;

    const block: AllocatedBlock = {
      address: alignedAddress,
      size,
      alignment,
      isFree: false,
      magic: HEAP_MAGIC,
    };

    this.blocks.set(alignedAddress, block);
    return alignedAddress;
  }

  /**
   * Pembebasan blok memori kernel dengan deteksi double-free dan validasi magic
   */
  public free(address: bigint): boolean {
    const block = this.blocks.get(address);

    if (!block) {
      throw new Error(`Invalid Pointer: Alamat 0x${address.toString(16)} bukan pointer alokasi heap yang sah`);
    }

    if (block.magic !== HEAP_MAGIC) {
      throw new Error(`Heap Corruption: Header blok pada 0x${address.toString(16)} rusak`);
    }

    if (block.isFree) {
      throw new Error(`Double Free: Alamat 0x${address.toString(16)} telah dibebaskan sebelumnya`);
    }

    block.isFree = true;
    this.allocatedBytes -= block.size;
    return true;
  }

  /**
   * Hitung rasio fragmentasi eksternal heap (0..1)
   */
  public getFragmentationRatio(): number {
    let freeBlockBytes = 0;
    let maxFreeBlock = 0;

    for (const block of this.blocks.values()) {
      if (block.isFree) {
        freeBlockBytes += block.size;
        if (block.size > maxFreeBlock) maxFreeBlock = block.size;
      }
    }

    if (freeBlockBytes === 0) return 0;
    return (freeBlockBytes - maxFreeBlock) / freeBlockBytes;
  }

  public getActiveAllocationCount(): number {
    let count = 0;
    for (const block of this.blocks.values()) {
      if (!block.isFree) count++;
    }
    return count;
  }
}
