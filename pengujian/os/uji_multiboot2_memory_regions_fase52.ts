/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 52 — conservative Multiboot2 physical memory region normalization.
 */
import assert from 'node:assert/strict';
import { normalizeMultiboot2MemoryRegions } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';
import type { Multiboot2MemoryRegion } from '../../src/runtime/os/boot/multiboot2-info.js';

function region(base: bigint, length: bigint, type = 1): Multiboot2MemoryRegion {
  return {
    base,
    length,
    endExclusive: base + length,
    type,
    kind: type === 1 ? 'AVAILABLE' : type === 2 ? 'RESERVED' : 'UNKNOWN',
    usable: type === 1,
  };
}

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try { run(); passed++; console.log('[LULUS] ' + name); }
  catch (error) { failed++; console.error('[GAGAL] ' + name + ': ' + (error instanceof Error ? error.message : String(error))); }
}

console.log('=== NUSANTARA PHASE 52: NORMALISASI RAM FIRMWARE ===');

test('52.58 hanya mengeluarkan halaman penuh dan melewati RAM di bawah 1 MiB', () => {
  const result = normalizeMultiboot2MemoryRegions([region(0n, 0x500123n)]);
  assert.deepEqual(result, [{ base: 0x100000n, length: 0x400000n, endExclusive: 0x500000n }]);
});

test('52.59 memotong halaman yang disentuh region reserved', () => {
  const result = normalizeMultiboot2MemoryRegions([
    region(0x100000n, 0x800000n),
    region(0x302001n, 0x1fffn, 2),
  ]);
  assert.deepEqual(result, [
    { base: 0x100000n, length: 0x202000n, endExclusive: 0x302000n },
    { base: 0x304000n, length: 0x5fc000n, endExclusive: 0x900000n },
  ]);
});

test('52.60 menggabungkan region usable yang bersebelahan', () => {
  const result = normalizeMultiboot2MemoryRegions([
    region(0x100000n, 0x200000n),
    region(0x300000n, 0x100000n),
  ]);
  assert.deepEqual(result, [{ base: 0x100000n, length: 0x300000n, endExclusive: 0x400000n }]);
});

test('52.61 tidak menggabungkan rentang yang dipisahkan celah firmware', () => {
  const result = normalizeMultiboot2MemoryRegions([
    region(0x100000n, 0x100000n),
    region(0x300000n, 0x100000n),
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0].endExclusive, 0x200000n);
  assert.equal(result[1].base, 0x300000n);
});

test('52.62 tipe ACPI, NVS, bad memory, dan unknown memblokir halaman', () => {
  const result = normalizeMultiboot2MemoryRegions([
    region(0x100000n, 0x800000n),
    region(0x200000n, 0x1000n, 3),
    region(0x300000n, 0x1000n, 4),
    region(0x400000n, 0x1000n, 5),
    region(0x500000n, 0x1000n, 99),
  ]);
  assert.deepEqual(result.map(x => [x.base, x.endExclusive]), [
    [0x100000n, 0x200000n],
    [0x201000n, 0x300000n],
    [0x301000n, 0x400000n],
    [0x401000n, 0x500000n],
    [0x501000n, 0x900000n],
  ]);
});

test('52.63 reservasi kernel/boot-info membuang seluruh halaman yang disentuh', () => {
  const result = normalizeMultiboot2MemoryRegions(
    [region(0x100000n, 0x800000n)],
    { reservations: [{ base: 0x201123n, length: 0x100n, reason: 'kernel image' }, { base: 0x500000n, length: 0x2000n, reason: 'boot info' }] },
  );
  assert.deepEqual(result.map(x => [x.base, x.endExclusive]), [
    [0x100000n, 0x201000n],
    [0x202000n, 0x500000n],
    [0x502000n, 0x900000n],
  ]);
});

test('52.64 menangani region usable yang tumpang tindih secara konservatif', () => {
  const result = normalizeMultiboot2MemoryRegions([
    region(0x100000n, 0x400000n),
    region(0x200000n, 0x1000n, 2),
  ]);
  assert.deepEqual(result.map(x => [x.base, x.endExclusive]), [
    [0x100000n, 0x200000n],
    [0x201000n, 0x500000n],
  ]);
});

test('52.65 menolak page size bukan pangkat dua', () => {
  assert.throws(() => normalizeMultiboot2MemoryRegions([region(0x100000n, 0x10000n)], { pageSize: 6000n }), /pangkat dua/);
});

test('52.66 menolak descriptor dengan endExclusive yang tidak konsisten', () => {
  const invalid = region(0x100000n, 0x10000n);
  invalid.endExclusive += 0x1000n;
  assert.throws(() => normalizeMultiboot2MemoryRegions([invalid]), /tidak konsisten/);
});

test('52.67 menolak rentang firmware yang overflow uint64', () => {
  assert.throws(() => normalizeMultiboot2MemoryRegions([
    region((1n << 64n) - 0x1000n, 0x2000n),
  ]), /uint64/);
});

test('52.68 menolak reservasi panjang nol', () => {
  assert.throws(() => normalizeMultiboot2MemoryRegions(
    [region(0x100000n, 0x10000n)],
    { reservations: [{ base: 0x200000n, length: 0n }] },
  ), /panjang positif/);
});

test('52.69 menghormati minimumAddress yang ditentukan pemanggil', () => {
  const result = normalizeMultiboot2MemoryRegions(
    [region(0x100000n, 0x400000n)],
    { minimumAddress: 0x200123n },
  );
  assert.deepEqual(result, [{ base: 0x201000n, length: 0x2ff000n, endExclusive: 0x500000n }]);
});

console.log(`HASIL PHASE 52.58–52.69: ${passed} LULUS, ${failed} GAGAL`);
if (failed > 0) process.exit(1);
