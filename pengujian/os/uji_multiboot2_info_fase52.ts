/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 52 — Multiboot2 runtime information and memory map parser tests.
 */
import assert from 'node:assert/strict';
import { Multiboot2InfoParser } from '../../src/runtime/os/boot/multiboot2-info.js';

function makeTag(type: number, payload: Uint8Array = new Uint8Array()): Uint8Array {
  const size = 8 + payload.byteLength;
  const aligned = Math.ceil(size / 8) * 8;
  const out = new Uint8Array(aligned);
  const view = new DataView(out.buffer);
  view.setUint32(0, type, true);
  view.setUint32(4, size, true);
  out.set(payload, 8);
  return out;
}

function makeMemoryMap(entries: Array<{base: bigint; length: bigint; type: number}>, entrySize = 24): Uint8Array {
  const payload = new Uint8Array(8 + entries.length * entrySize);
  const view = new DataView(payload.buffer);
  view.setUint32(0, entrySize, true);
  view.setUint32(4, 0, true);
  entries.forEach((entry, index) => {
    const at = 8 + index * entrySize;
    view.setBigUint64(at, entry.base, true);
    view.setBigUint64(at + 8, entry.length, true);
    view.setUint32(at + 16, entry.type, true);
    view.setUint32(at + 20, 0, true);
  });
  return makeTag(6, payload);
}

function makeInfo(tags: Uint8Array[]): Uint8Array {
  const end = makeTag(0);
  const total = 8 + tags.reduce((sum, tag) => sum + tag.byteLength, 0) + end.byteLength;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, total, true);
  view.setUint32(4, 0, true);
  let offset = 8;
  for (const tag of tags) {
    out.set(tag, offset);
    offset += tag.byteLength;
  }
  out.set(end, offset);
  return out;
}

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try {
    run();
    passed++;
    console.log('[LULUS] ' + name);
  } catch (error) {
    failed++;
    console.error('[GAGAL] ' + name + ': ' + (error instanceof Error ? error.message : String(error)));
  }
}

console.log('=== NUSANTARA PHASE 52: MULTIBOOT2 MEMORY MAP ===');

test('52.44 membaca region RAM tersedia dan menghitung batas eksklusif', () => {
  const data = makeInfo([makeMemoryMap([{base: 0x100000n, length: 0x3f00000n, type: 1}])]);
  const result = Multiboot2InfoParser.parse(data);
  assert.equal(result.memoryMap.length, 1);
  assert.equal(result.memoryMap[0].kind, 'AVAILABLE');
  assert.equal(result.memoryMap[0].usable, true);
  assert.equal(result.memoryMap[0].endExclusive, 0x4000000n);
});

test('52.45 mempertahankan tipe region reserved, ACPI, NVS, dan bad memory', () => {
  const data = makeInfo([makeMemoryMap([
    {base: 0n, length: 0x100000n, type: 2},
    {base: 0x100000n, length: 0x1000n, type: 3},
    {base: 0x101000n, length: 0x1000n, type: 4},
    {base: 0x102000n, length: 0x1000n, type: 5},
  ])]);
  const result = Multiboot2InfoParser.parse(data);
  assert.deepEqual(result.memoryMap.map(x => x.kind), ['RESERVED', 'ACPI_RECLAIMABLE', 'ACPI_NVS', 'BAD_MEMORY']);
  assert.equal(result.memoryMap.some(x => x.usable), false);
});

test('52.46 melewati tag yang tidak dikenal tanpa merusak parsing', () => {
  const data = makeInfo([makeTag(0xCAFE, new Uint8Array([1,2,3,4]))]);
  const result = Multiboot2InfoParser.parse(data);
  assert.equal(result.tags[0].type, 0xCAFE);
  assert.equal(result.memoryMap.length, 0);
});

test('52.47 mendukung beberapa memory-map tag dan entry tambahan', () => {
  const data = makeInfo([
    makeMemoryMap([{base: 0x100000n, length: 0x200000n, type: 1}]),
    makeMemoryMap([{base: 0x400000n, length: 0x100000n, type: 1}, {base: 0x500000n, length: 0x1000n, type: 2}]),
  ]);
  const result = Multiboot2InfoParser.parse(data);
  assert.equal(result.memoryMap.length, 3);
  assert.equal(result.memoryMap[2].base, 0x500000n);
});

test('52.48 membaca Uint8Array dengan byteOffset bukan nol', () => {
  const info = makeInfo([makeMemoryMap([{base: 0x100000n, length: 0x100000n, type: 1}])]);
  const wrapped = new Uint8Array(info.length + 12);
  wrapped.set(info, 6);
  const result = Multiboot2InfoParser.parse(wrapped.subarray(6, 6 + info.length));
  assert.equal(result.memoryMap[0].base, 0x100000n);
});

test('52.49 menolak total_size yang lebih besar dari buffer', () => {
  const data = makeInfo([]);
  new DataView(data.buffer).setUint32(0, data.length + 8, true);
  assert.throws(() => Multiboot2InfoParser.parse(data), /total_size/);
});

test('52.50 menolak field reserved yang bukan nol', () => {
  const data = makeInfo([]);
  new DataView(data.buffer).setUint32(4, 1, true);
  assert.throws(() => Multiboot2InfoParser.parse(data), /reserved/);
});

test('52.51 menolak entry_size memory map yang terlalu kecil', () => {
  const tag = makeMemoryMap([{base: 0x100000n, length: 0x1000n, type: 1}]);
  new DataView(tag.buffer).setUint32(8, 16, true);
  const data = makeInfo([tag]);
  assert.throws(() => Multiboot2InfoParser.parse(data), /entry_size/);
});

test('52.52 menolak rentang memori yang overflow uint64', () => {
  const data = makeInfo([makeMemoryMap([{base: (1n << 64n) - 0x100n, length: 0x200n, type: 1}])]);
  assert.throws(() => Multiboot2InfoParser.parse(data), /Rentang memori/);
});

test('52.53 menolak struktur tanpa End tag yang benar', () => {
  const tag = makeTag(1);
  const data = new Uint8Array(8 + tag.length);
  const view = new DataView(data.buffer);
  view.setUint32(0, data.length, true);
  data.set(tag, 8);
  assert.throws(() => Multiboot2InfoParser.parse(data), /End tag/);
});

test('52.54 menolak payload memory map yang tidak habis dibagi entry_size', () => {
  const tag = makeMemoryMap([{base: 0x100000n, length: 0x1000n, type: 1}]);
  const malformed = new Uint8Array(tag.length + 8);
  malformed.set(tag);
  const view = new DataView(malformed.buffer);
  view.setUint32(4, tag.length + 8, true);
  view.setUint32(8, 24, true);
  const data = makeInfo([malformed]);
  assert.throws(() => Multiboot2InfoParser.parse(data), /Payload memory map/);
});

console.log(`HASIL PHASE 52.44–52.54: ${passed} LULUS, ${failed} GAGAL`);
if (failed > 0) process.exit(1);
