/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 63: safe Multiboot2 -> reservations -> normalized extents -> PMM model.
 *
 * This is a TypeScript integration/model path. It is NOT called by the native
 * Ring 0 bootstrap and does not activate a hardware physical-frame allocator.
 */
import {
  BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS,
  normalizeMultiboot2MemoryRegions,
  type PhysicalMemoryReservation,
  type UsablePhysicalMemoryExtent,
} from './multiboot2-memory-regions.js';
import {
  createMultiboot2BootReservations,
  type Multiboot2BootInformation,
} from './multiboot2-info.js';
import { PhysicalMemoryManager } from '../memory/physical-memory.js';

export interface Multiboot2PmmBootstrapOptions {
  /** Physical address of the kernel-owned copied MBI, not the bootloader buffer. */
  copiedInfoPhysicalAddress?: bigint;
  /** Additional platform reservations, e.g. firmware tables or DMA buffers. */
  additionalReservations?: readonly PhysicalMemoryReservation[];
  minimumAddress?: bigint;
}

export interface Multiboot2PmmBootstrapResult {
  /** TypeScript model allocator; not the native Ring 0 allocator. */
  manager: PhysicalMemoryManager;
  /** Final sorted, page-aligned, non-overlapping candidate extents. */
  extents: UsablePhysicalMemoryExtent[];
  /** Full exclusion manifest used to derive extents. */
  reservations: PhysicalMemoryReservation[];
}

export function createMultiboot2PhysicalMemoryManager(
  info: Multiboot2BootInformation,
  options: Multiboot2PmmBootstrapOptions = {},
): Multiboot2PmmBootstrapResult {
  const copiedInfoPhysicalAddress = options.copiedInfoPhysicalAddress ?? 0x260000n;
  const dynamicReservations = createMultiboot2BootReservations(info, copiedInfoPhysicalAddress);
  const reservations: PhysicalMemoryReservation[] = [
    ...BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS,
    ...dynamicReservations,
    ...(options.additionalReservations ?? []),
  ];
  const extents = normalizeMultiboot2MemoryRegions(info.memoryMap, {
    minimumAddress: options.minimumAddress ?? 0x100000n,
    pageSize: 4096n,
    reservations,
  });
  const manager = new PhysicalMemoryManager(extents);
  return { manager, extents, reservations };
}
