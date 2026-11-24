/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 56 — complete physical reservation manifest for the current bootstrap.
 *
 * This verifies the model contract only. It does not wire the native Ring 0 PMM.
 */
import assert from 'node:assert/strict';
import {
  BOOTSTRAP_CPU_LOCAL_RESERVATIONS,
  BOOTSTRAP_MINIMUM_ALLOCATABLE_ADDRESS,
  BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS,
  normalizeMultiboot2MemoryRegions,
} from '../../src/runtime/os/boot/multiboot2-memory-regions.js';
import type { Multiboot2MemoryRegion } from '../../src/runtime/os/boot/multiboot2-info.js';
import { PhysicalMemoryManager } from '../../src/runtime/os/memory/physical-memory.js';

const firmwareRam: Multiboot2MemoryRegion = {
  base: 0x100000n,
  length: 0x700000n,
  endExclusive: 0x800000n,
  type: 1,
  kind: 'AVAILABLE',
  usable: true,
};

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('[LULUS] ' + name);
}

function overlaps(aBase: bigint, aLength: bigint, bBase: bigint, bLength: bigint): boolean {
  return aBase < bBase + bLength && bBase < aBase + aLength;
}

console.log('=== NUSANTARA PHASE 56: COMPLETE BOOTSTRAP PHYSICAL RESERVATIONS ===');

test('56.1 allocator lower bound excludes the kernel ELF and low boot memory', () => {
  assert.equal(BOOTSTRAP_MINIMUM_ALLOCATABLE_ADDRESS, 0x200000n);
});

test('56.2 complete manifest retains CPU-local stack and GS reservations', () => {
  for (const cpuReservation of BOOTSTRAP_CPU_LOCAL_RESERVATIONS) {
    assert.ok(BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.some((reservation) =>
      reservation.base === cpuReservation.base &&
      reservation.length === cpuReservation.length
    ));
  }
});

test('56.3 manifest is sorted, positive, page-aligned and non-overlapping', () => {
  for (let i = 0; i < BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.length; i++) {
    const current = BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS[i];
    assert.ok(current.base >= BOOTSTRAP_MINIMUM_ALLOCATABLE_ADDRESS);
    assert.ok(current.length > 0n);
    assert.equal(current.base % 4096n, 0n);
    assert.equal(current.length % 4096n, 0n);
    if (i > 0) {
      const previous = BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS[i - 1];
      assert.ok(previous.base + previous.length <= current.base);
    }
  }
});

test('56.4 normalizer excludes every known bootstrap-owned physical range', () => {
  const extents = normalizeMultiboot2MemoryRegions([firmwareRam], {
    minimumAddress: BOOTSTRAP_MINIMUM_ALLOCATABLE_ADDRESS,
    reservations: BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS,
  });
  assert.ok(extents.length > 0);
  for (const extent of extents) {
    assert.ok(extent.base >= BOOTSTRAP_MINIMUM_ALLOCATABLE_ADDRESS);
    for (const reservation of BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS) {
      assert.equal(
        overlaps(extent.base, extent.length, reservation.base, reservation.length),
        false,
        `usable extent overlaps reserved range: ${reservation.reason}`,
      );
    }
  }
});

test('56.5 sparse PMM never allocates a bootstrap-owned frame', () => {
  const extents = normalizeMultiboot2MemoryRegions([firmwareRam], {
    minimumAddress: BOOTSTRAP_MINIMUM_ALLOCATABLE_ADDRESS,
    reservations: BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS,
  });
  const pmm = new PhysicalMemoryManager(extents);
  let frame: bigint | null;
  while ((frame = pmm.allocateFrame()) !== null) {
    assert.ok(frame >= BOOTSTRAP_MINIMUM_ALLOCATABLE_ADDRESS);
    for (const reservation of BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS) {
      assert.equal(
        frame >= reservation.base && frame < reservation.base + reservation.length,
        false,
        `allocator returned reserved frame for ${reservation.reason}`,
      );
    }
  }
  assert.equal(pmm.getFreeFrameCount(), 0);
});

console.log(`HASIL PHASE 56.1–56.5: ${passed} LULUS, 0 GAGAL`);
