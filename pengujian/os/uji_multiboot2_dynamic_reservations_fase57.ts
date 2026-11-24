/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 57 — Multiboot2 dynamic boot memory reservations.
 *
 * Tests parser/model behavior only; no native physical memory access is implied.
 */
import assert from 'node:assert/strict';
import {
  createMultiboot2BootReservations,
  Multiboot2InfoParser,
} from '../../src/runtime/os/boot/multiboot2-info.js';
import { normalizeMultiboot2MemoryRegions } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

function makeTag(type: number, payload = new Uint8Array()): Uint8Array {
  const size = 8 + payload.byteLength;
  const aligned = Math.ceil(size / 8) * 8;
  const out = new Uint8Array(aligned);
  const view = new DataView(out.buffer);
  view.setUint32(0, type, true);
  view.setUint32(4, size, true);
  out.set(payload, 8);
  return out;
}

function makeMemoryMap(base = 0x100000n, length = 0xf00000n): Uint8Array {
  const payload = new Uint8Array(32);
  const view = new DataView(payload.buffer);
  view.setUint32(0, 24, true);
  view.setUint32(4, 0, true);
  view.setBigUint64(8, base, true);
  view.setBigUint64(16, length, true);
  view.setUint32(24, 1, true);
  return makeTag(6, payload);
}

function makeModule(start: number, end: number, command = 'initramfs.bin'): Uint8Array {
  const text = new TextEncoder().encode(command + '\0');
  const payload = new Uint8Array(8 + text.length);
  const view = new DataView(payload.buffer);
  view.setUint32(0, start, true);
  view.setUint32(4, end, true);
  payload.set(text, 8);
  return makeTag(3, payload);
}

function makeFramebuffer(address: bigint, pitch: number, width: number, height: number, bpp = 32): Uint8Array {
  const payload = new Uint8Array(24);
  const view = new DataView(payload.buffer);
  view.setBigUint64(0, address, true);
  view.setUint32(8, pitch, true);
  view.setUint32(12, width, true);
  view.setUint32(16, height, true);
  view.setUint8(20, bpp);
  view.setUint8(21, 1);
  view.setUint16(22, 0, true);
  return makeTag(8, payload);
}

function makeInfo(tags: Uint8Array[]): Uint8Array {
  const end = makeTag(0);
  const total = 8 + tags.reduce((sum, tag) => sum + tag.length, 0) + end.length;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, total, true);
  let offset = 8;
  for (const tag of tags) {
    out.set(tag, offset);
    offset += tag.length;
  }
  out.set(end, offset);
  return out;
}

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('[LULUS] ' + name);
}

console.log('=== NUSANTARA PHASE 57: DYNAMIC MULTIBOOT2 RESERVATIONS ===');

test('57.1 parses module start/end and bounded NUL-terminated command line', () => {
  const info = Multiboot2InfoParser.parse(makeInfo([makeModule(0x900000, 0x980000, 'initrd.img')]));
  assert.equal(info.modules.length, 1);
  assert.equal(info.modules[0].start, 0x900000n);
  assert.equal(info.modules[0].endExclusive, 0x980000n);
  assert.equal(info.modules[0].commandLine, 'initrd.img');
});

test('57.2 rejects zero/reversed module ranges and missing command terminator', () => {
  assert.throws(() => Multiboot2InfoParser.parse(makeInfo([makeModule(0x900000, 0x900000)])), /module/);
  const malformed = makeModule(0x900000, 0x980000);
  const view = new DataView(malformed.buffer);
  const tagSize = view.getUint32(4, true);
  malformed[tagSize - 1] = 0x41;
  assert.throws(() => Multiboot2InfoParser.parse(makeInfo([malformed])), /NUL/);
});

test('57.3 parses framebuffer and computes pitch multiplied by height', () => {
  const info = Multiboot2InfoParser.parse(makeInfo([makeFramebuffer(0x800000n, 4096, 1024, 768)]));
  assert.equal(info.framebuffers.length, 1);
  assert.equal(info.framebuffers[0].length, 0x300000n);
  assert.equal(info.framebuffers[0].endExclusive, 0xb00000n);
});

test('57.4 rejects framebuffer pitch smaller than visible row and uint64 overflow', () => {
  assert.throws(() => Multiboot2InfoParser.parse(makeInfo([makeFramebuffer(0x800000n, 100, 1024, 10)])), /framebuffer/);
  assert.throws(() => Multiboot2InfoParser.parse(makeInfo([makeFramebuffer((1n << 64n) - 0x1000n, 4096, 1024, 2)])), /framebuffer/);
});

test('57.5 produces exclusions for MBI, every module and framebuffer', () => {
  const parsed = Multiboot2InfoParser.parse(makeInfo([
    makeMemoryMap(),
    makeModule(0x900000, 0x980000, 'initrd.img'),
    makeFramebuffer(0xc00000n, 4096, 1024, 512),
  ]));
  const reservations = createMultiboot2BootReservations(parsed, 0x700000n);
  assert.deepEqual(reservations.map(x => [x.base, x.length]), [
    [0x700000n, BigInt(parsed.totalSize)],
    [0x900000n, 0x80000n],
    [0xc00000n, 0x200000n],
  ]);
});

test('57.6 normalizer excludes dynamic bootloader ranges from available firmware RAM', () => {
  const parsed = Multiboot2InfoParser.parse(makeInfo([
    makeMemoryMap(),
    makeModule(0x900000, 0x980000),
    makeFramebuffer(0xc00000n, 4096, 1024, 512),
  ]));
  const dynamic = createMultiboot2BootReservations(parsed, 0x700000n);
  const extents = normalizeMultiboot2MemoryRegions(parsed.memoryMap, { reservations: dynamic });
  for (const extent of extents) {
    for (const reservation of dynamic) {
      assert.equal(
        extent.base < reservation.base + reservation.length &&
        reservation.base < extent.endExclusive,
        false,
      );
    }
  }
});

test('57.7 rejects unaligned physical MBI address when creating reservation', () => {
  const parsed = Multiboot2InfoParser.parse(makeInfo([makeMemoryMap()]));
  assert.throws(() => createMultiboot2BootReservations(parsed, 0x700001n), /Alamat fisik/);
});

console.log('HASIL PHASE 57.1–57.7: ' + passed + ' LULUS, 0 GAGAL');
