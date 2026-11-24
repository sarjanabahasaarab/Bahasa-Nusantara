/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 63 — End-to-end Multiboot2 reservations and PMM model integration.
 *
 * These tests validate TypeScript model integration only, not native Ring 0.
 */
import assert from 'node:assert/strict';
import { createMultiboot2PhysicalMemoryManager } from '../../src/runtime/os/boot/multiboot2-pmm.js';
import type { Multiboot2BootInformation, Multiboot2MemoryRegion } from '../../src/runtime/os/boot/multiboot2-info.js';

function region(base: bigint, length: bigint, type = 1): Multiboot2MemoryRegion {
  return { base, length, endExclusive: base + length, type,
    kind: type === 1 ? 'AVAILABLE' : 'RESERVED', usable: type === 1 };
}
function info(memoryMap: Multiboot2MemoryRegion[]): Multiboot2BootInformation {
  return { totalSize: 128, tags: [], memoryMap, modules: [], framebuffers: [] };
}
let passed = 0;
function test(name: string, run: () => void): void {
  run(); passed++; console.log('[LULUS] ' + name);
}
console.log('=== NUSANTARA PHASE 63: MULTIBOOT2 TO PMM MODEL ===');

test('63.1 combines fixed bootstrap and copied-MBI reservations before PMM construction', () => {
  const result = createMultiboot2PhysicalMemoryManager(info([region(0x100000n, 0x900000n)]));
  assert.ok(result.reservations.some(x => x.base === 0x200000n));
  assert.ok(result.reservations.some(x => x.base === 0x260000n));
  assert.ok(result.extents.every(x => x.base % 4096n === 0n && x.length % 4096n === 0n));
  assert.equal(result.manager.getTotalBytes(), result.extents.reduce((n, x) => n + Number(x.length), 0));
});

test('63.2 excludes module and framebuffer pages from candidate extents', () => {
  const boot = info([region(0x100000n, 0x900000n)]);
  boot.modules.push({ start: 0x700123n, endExclusive: 0x702001n, commandLine: 'initrd' });
  boot.framebuffers.push({ address: 0x800000n, pitch: 4096, width: 1024, height: 4,
    bitsPerPixel: 32, framebufferType: 1, length: 0x4000n, endExclusive: 0x804000n });
  const result = createMultiboot2PhysicalMemoryManager(boot);
  for (const extent of result.extents) {
    assert.ok(extent.endExclusive <= 0x700000n || extent.base >= 0x703000n);
    assert.ok(extent.endExclusive <= 0x800000n || extent.base >= 0x804000n);
  }
});

test('63.3 treats overlapping reserved firmware descriptors as exclusions', () => {
  const result = createMultiboot2PhysicalMemoryManager(info([
    region(0x100000n, 0x900000n), region(0x500123n, 0x100n, 2),
  ]));
  assert.ok(!result.extents.some(x => x.base <= 0x500000n && x.endExclusive > 0x500000n));
});

test('63.4 PMM allocates only from returned extents and never across firmware holes', () => {
  const result = createMultiboot2PhysicalMemoryManager(info([
    region(0x100000n, 0x200000n), region(0x500000n, 0x200000n),
  ]));
  const allowed = result.extents;
  for (let i = 0; i < result.manager.getTotalFrameCount(); i++) {
    const frame = result.manager.allocateFrame();
    assert.ok(frame !== null);
    assert.ok(allowed.some(x => frame! >= x.base && frame! < x.endExclusive));
  }
  assert.equal(result.manager.allocateFrame(), null);
});

test('63.5 rejects malformed dynamic reservations before exposing any PMM', () => {
  const boot = info([region(0x100000n, 0x900000n)]);
  boot.modules.push({ start: 0x700000n, endExclusive: 0x700000n, commandLine: 'bad' });
  assert.throws(() => createMultiboot2PhysicalMemoryManager(boot), /Rentang module/);
});

test('63.6 accepts caller-provided platform exclusions and custom copied-MBI address', () => {
  const result = createMultiboot2PhysicalMemoryManager(info([region(0x100000n, 0x900000n)]), {
    copiedInfoPhysicalAddress: 0x270000n,
    additionalReservations: [{ base: 0x900123n, length: 1n, reason: 'DMA test' }],
  });
  assert.ok(result.reservations.some(x => x.base === 0x270000n));
  assert.ok(!result.extents.some(x => x.base <= 0x900000n && x.endExclusive > 0x900000n));
});

console.log('HASIL PHASE 63.1–63.6: ' + passed + ' LULUS, 0 GAGAL');
