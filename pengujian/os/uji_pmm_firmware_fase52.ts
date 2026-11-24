/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 52 — PMM initialized from sparse, firmware-approved RAM extents.
 */
import assert from 'node:assert/strict';
import { PhysicalMemoryManager } from '../../src/runtime/os/memory/physical-memory.js';
import type { UsablePhysicalMemoryExtent } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

const extent = (base: bigint, length: bigint): UsablePhysicalMemoryExtent => ({
  base, length, endExclusive: base + length,
});

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try { run(); passed++; console.log('[LULUS] ' + name); }
  catch (error) { failed++; console.error('[GAGAL] ' + name + ': ' + (error instanceof Error ? error.message : String(error))); }
}

console.log('=== NUSANTARA PHASE 52: PMM DARI FIRMWARE EXTENTS ===');

test('52.70 menghitung frame hanya dari rentang RAM tersedia', () => {
  const pmm = new PhysicalMemoryManager([extent(0x100000n, 0x2000n), extent(0x400000n, 0x3000n)]);
  assert.equal(pmm.getTotalFrameCount(), 5);
  assert.equal(pmm.getTotalBytes(), 5 * 4096);
  assert.equal(pmm.getFreeFrameCount(), 5);
});

test('52.71 alokasi melompat ke extent berikutnya tanpa mengalokasikan celah', () => {
  const pmm = new PhysicalMemoryManager([extent(0x100000n, 0x2000n), extent(0x400000n, 0x2000n)]);
  assert.deepEqual([
    pmm.allocateFrame(), pmm.allocateFrame(), pmm.allocateFrame(), pmm.allocateFrame(),
  ], [0x100000n, 0x101000n, 0x400000n, 0x401000n]);
  assert.equal(pmm.allocateFrame(), null);
});

test('52.72 alamat pada celah firmware tidak dapat dibebaskan', () => {
  const pmm = new PhysicalMemoryManager([extent(0x100000n, 0x1000n), extent(0x400000n, 0x1000n)]);
  assert.equal(pmm.freeFrame(0x200000n), false);
  assert.equal(pmm.getFreeFrameCount(), 2);
});

test('52.73 alokasi kontigu tidak boleh menyeberangi celah fisik', () => {
  const pmm = new PhysicalMemoryManager([extent(0x100000n, 0x2000n), extent(0x400000n, 0x2000n)]);
  assert.equal(pmm.allocateContiguousFrames(3), null);
  assert.equal(pmm.getFreeFrameCount(), 4);
  assert.equal(pmm.allocateContiguousFrames(2), 0x100000n);
  assert.equal(pmm.getFreeFrameCount(), 2);
});

test('52.74 reservasi parsial memblokir seluruh halaman yang disentuh', () => {
  const pmm = new PhysicalMemoryManager([extent(0x100000n, 0x3000n)]);
  pmm.reserveRegion(0x101001n, 1);
  assert.equal(pmm.getFreeFrameCount(), 2);
  assert.equal(pmm.allocateFrame(), 0x100000n);
  assert.equal(pmm.allocateFrame(), 0x102000n);
  assert.equal(pmm.allocateFrame(), null);
});

test('52.75 menolak extent yang tidak page-aligned', () => {
  assert.throws(() => new PhysicalMemoryManager([extent(0x100001n, 0x1000n)]), /page-aligned/);
});

test('52.76 menolak extent yang tumpang tindih atau tidak berurutan', () => {
  assert.throws(() => new PhysicalMemoryManager([
    extent(0x200000n, 0x2000n), extent(0x100000n, 0x2000n),
  ]), /tumpang tindih atau tidak berurutan/);
});

test('52.77 menolak endExclusive yang tidak konsisten', () => {
  const invalid = extent(0x100000n, 0x1000n);
  invalid.endExclusive += 0x1000n;
  assert.throws(() => new PhysicalMemoryManager([invalid]), /page-aligned/);
});

test('52.78 tetap menjaga kompatibilitas constructor memori kontigu lama', () => {
  const pmm = new PhysicalMemoryManager(3 * 4096, 0x800000n);
  assert.equal(pmm.allocateFrame(), 0x800000n);
  assert.equal(pmm.allocateFrame(), 0x801000n);
  assert.equal(pmm.getTotalFrameCount(), 3);
});

test('52.79 reserveRegion di luar seluruh extent tidak mengubah bitmap', () => {
  const pmm = new PhysicalMemoryManager([extent(0x100000n, 0x2000n)]);
  pmm.reserveRegion(0x900000n, 0x1000);
  assert.equal(pmm.getFreeFrameCount(), 2);
});

console.log(`HASIL PHASE 52.70–52.79: ${passed} LULUS, ${failed} GAGAL`);
if (failed > 0) process.exit(1);
