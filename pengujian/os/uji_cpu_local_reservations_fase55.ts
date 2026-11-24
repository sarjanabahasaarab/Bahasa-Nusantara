/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 55 — explicit physical reservation contract for bootstrap CPU-local state.
 *
 * Model-level only: callers must supply these reservations to the firmware
 * normalizer. This test does not claim native Ring 0 PMM wiring.
 */
import assert from 'node:assert/strict';
import {
  BOOTSTRAP_CPU_LOCAL_RESERVATIONS,
  normalizeMultiboot2MemoryRegions,
} from '../../src/runtime/os/boot/multiboot2-memory-regions.js';
import type { Multiboot2MemoryRegion } from '../../src/runtime/os/boot/multiboot2-info.js';
import { PhysicalMemoryManager } from '../../src/runtime/os/memory/physical-memory.js';

const usableRegion: Multiboot2MemoryRegion = {
  base: 0x100000n,
  length: 0x2000000n,
  endExclusive: 0x2100000n,
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

console.log('=== NUSANTARA PHASE 55: CPU-LOCAL MEMORY RESERVATIONS ===');

test('55.1 bootstrap syscall stack reserves exactly the configured 16 KiB interval', () => {
  assert.deepEqual(BOOTSTRAP_CPU_LOCAL_RESERVATIONS[0], {
    base: 0x24c000n,
    length: 0x4000n,
    reason: 'bootstrap CPU syscall stack (16 KiB)',
  });
});

test('55.2 GS CPU-local data page is explicitly reserved', () => {
  assert.deepEqual(BOOTSTRAP_CPU_LOCAL_RESERVATIONS[1], {
    base: 0x251000n,
    length: 0x1000n,
    reason: 'bootstrap CPU-local GS data page',
  });
});

test('55.3 firmware normalizer splits usable RAM around both bootstrap reservations', () => {
  const extents = normalizeMultiboot2MemoryRegions([usableRegion], {
    reservations: BOOTSTRAP_CPU_LOCAL_RESERVATIONS,
  });
  assert.deepEqual(extents.map(({ base, endExclusive }) => [base, endExclusive]), [
    [0x100000n, 0x24c000n],
    [0x250000n, 0x251000n],
    [0x252000n, 0x2100000n],
  ]);
});

test('55.4 sparse PMM never returns frames from the reserved CPU-local ranges', () => {
  const extents = normalizeMultiboot2MemoryRegions([usableRegion], {
    reservations: BOOTSTRAP_CPU_LOCAL_RESERVATIONS,
  });
  const pmm = new PhysicalMemoryManager(extents);
  let frame: bigint | null;
  while ((frame = pmm.allocateFrame()) !== null) {
    assert.ok(frame < 0x24c000n || frame >= 0x250000n);
    assert.ok(frame < 0x251000n || frame >= 0x252000n);
  }
  assert.equal(pmm.getFreeFrameCount(), 0);
});

console.log(`HASIL PHASE 55.1–55.4: ${passed} LULUS, 0 GAGAL`);
