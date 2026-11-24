/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 64 — Hardening bitmap PMM over sparse firmware extents.
 * Tests the TypeScript allocator model; does not claim native Ring 0 coverage.
 */
import assert from 'node:assert/strict';
import { PhysicalMemoryManager } from '../../src/runtime/os/memory/physical-memory.js';
import type { UsablePhysicalMemoryExtent } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

const PAGE = 4096n;
function extent(base: bigint, pages: bigint): UsablePhysicalMemoryExtent {
  return { base, length: pages * PAGE, endExclusive: base + pages * PAGE };
}
let passed = 0;
function test(name: string, run: () => void): void {
  run(); passed++; console.log('[LULUS] ' + name);
}
console.log('=== NUSANTARA PHASE 64: PMM BITMAP HARDENING ===');

test('64.1 rejects unaligned, empty, overflowing and inconsistent extents', () => {
  assert.throws(() => new PhysicalMemoryManager([{ base: 0x100001n, length: PAGE, endExclusive: 0x101001n }]), /page-aligned/);
  assert.throws(() => new PhysicalMemoryManager([{ base: 0x100000n, length: 0n, endExclusive: 0x100000n }]), /page-aligned/);
  assert.throws(() => new PhysicalMemoryManager([{ base: (1n << 64n) - PAGE, length: PAGE * 2n, endExclusive: (1n << 64n) + PAGE }]), /page-aligned/);
  assert.throws(() => new PhysicalMemoryManager([{ base: 0x100000n, length: PAGE, endExclusive: 0x102000n }]), /page-aligned/);
});

test('64.2 rejects unsorted and overlapping firmware extents', () => {
  assert.throws(() => new PhysicalMemoryManager([extent(0x200000n, 2n), extent(0x100000n, 2n)]), /tumpang tindih atau tidak berurutan/);
  assert.throws(() => new PhysicalMemoryManager([extent(0x100000n, 3n), extent(0x102000n, 2n)]), /tumpang tindih atau tidak berurutan/);
});

test('64.3 allocates individual frames across sparse extents without inventing addresses', () => {
  const ranges = [extent(0x100000n, 2n), extent(0x500000n, 2n)];
  const pmm = new PhysicalMemoryManager(ranges);
  assert.equal(pmm.allocateFrame(), 0x100000n);
  assert.equal(pmm.allocateFrame(), 0x101000n);
  assert.equal(pmm.allocateFrame(), 0x500000n);
  assert.equal(pmm.allocateFrame(), 0x501000n);
  assert.equal(pmm.allocateFrame(), null);
});

test('64.4 contiguous allocation never crosses a physical firmware hole', () => {
  const pmm = new PhysicalMemoryManager([extent(0x100000n, 2n), extent(0x500000n, 3n)]);
  assert.equal(pmm.allocateContiguousFrames(3), 0x500000n);
  assert.equal(pmm.getFreeFrames(), 2);
  assert.equal(pmm.allocateContiguousFrames(3), null);
});

test('64.5 frees only allocated frames and rejects double-free and unaligned addresses', () => {
  const pmm = new PhysicalMemoryManager([extent(0x100000n, 2n)]);
  assert.equal(pmm.freeFrame(0x100000n), false);
  const frame = pmm.allocateFrame();
  assert.equal(frame, 0x100000n);
  assert.equal(pmm.freeFrame(0x100001n), false);
  assert.equal(pmm.freeFrame(frame!), true);
  assert.equal(pmm.freeFrame(frame!), false);
  assert.equal(pmm.getFreeFrames(), 2);
});

test('64.6 reservation marks touched pages once and ignores addresses outside managed RAM', () => {
  const pmm = new PhysicalMemoryManager([extent(0x100000n, 4n)]);
  pmm.reserveRegion(0x100001n, 1);
  assert.equal(pmm.getFreeFrames(), 3);
  pmm.reserveRegion(0x100001n, 1);
  assert.equal(pmm.getFreeFrames(), 3);
  pmm.reserveRegion(0x900000n, 0x2000);
  assert.equal(pmm.getFreeFrames(), 3);
  assert.equal(pmm.allocateFrame(), 0x101000n);
});

test('64.7 bitmap size is bounded before allocating a huge bitmap', () => {
  assert.throws(
    () => new PhysicalMemoryManager([extent(0x100000n, (64n * 1024n * 1024n * 8n) + 1n)]),
    /Bitmap PMM melebihi batas aman/,
  );
});

test('64.8 zero-capacity sparse map is valid and safely exhausted', () => {
  const pmm = new PhysicalMemoryManager([]);
  assert.equal(pmm.getTotalFrames(), 0);
  assert.equal(pmm.getFreeFrames(), 0);
  assert.equal(pmm.allocateFrame(), null);
  assert.equal(pmm.allocateContiguousFrames(1), null);
});

console.log('HASIL PHASE 64.1–64.8: ' + passed + ' LULUS, 0 GAGAL');
