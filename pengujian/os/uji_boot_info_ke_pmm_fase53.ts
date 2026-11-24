/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 53 — End-to-end model: Multiboot2 info -> normalized RAM -> sparse PMM.
 *
 * This suite validates the TypeScript integration pipeline only. It does not
 * claim that the bootstrap assembly has copied/parsing MBI or that Ring 0 uses
 * this allocator yet.
 */
import assert from 'node:assert/strict';
import { Multiboot2InfoParser } from '../../src/runtime/os/boot/multiboot2-info.js';
import { normalizeMultiboot2MemoryRegions } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';
import { PhysicalMemoryManager } from '../../src/runtime/os/memory/physical-memory.js';

interface FirmwareEntry {
  base: bigint;
  length: bigint;
  type: number;
}

function buildMultiboot2Info(entries: readonly FirmwareEntry[]): Uint8Array {
  const mapTagSize = 16 + entries.length * 24;
  const totalSize = 8 + mapTagSize + 8;
  const bytes = new Uint8Array(totalSize);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, totalSize, true);
  view.setUint32(4, 0, true);
  view.setUint32(8, 6, true);
  view.setUint32(12, mapTagSize, true);
  view.setUint32(16, 24, true);
  view.setUint32(20, 0, true);
  let offset = 24;
  for (const entry of entries) {
    view.setBigUint64(offset, entry.base, true);
    view.setBigUint64(offset + 8, entry.length, true);
    view.setUint32(offset + 16, entry.type, true);
    view.setUint32(offset + 20, 0, true);
    offset += 24;
  }
  view.setUint32(offset, 0, true);
  view.setUint32(offset + 4, 8, true);
  return bytes;
}

const firmwareInfo = buildMultiboot2Info([
  { base: 0x100000n, length: 0x10000n, type: 1 },
  // Partial-page reserved descriptor must block the page it touches.
  { base: 0x104800n, length: 0x800n, type: 2 },
  { base: 0x108000n, length: 0x1000n, type: 4 },
  // Unknown firmware types must never become allocatable RAM.
  { base: 0x10c000n, length: 0x1000n, type: 0xfeed },
]);

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try { run(); passed++; console.log('[LULUS] ' + name); }
  catch (error) {
    failed++;
    console.error('[GAGAL] ' + name + ': ' + (error instanceof Error ? error.message : String(error)));
  }
}

function createFirmwarePMM(): PhysicalMemoryManager {
  const bootInfo = Multiboot2InfoParser.parse(firmwareInfo);
  const extents = normalizeMultiboot2MemoryRegions(bootInfo.memoryMap, {
    minimumAddress: 0x100000n,
    reservations: [
      { base: 0x100000n, length: 0x2000n, reason: 'kernel image + bootstrap' },
      { base: 0x10a000n, length: 0x1000n, reason: 'copied Multiboot2 information' },
    ],
  });
  return new PhysicalMemoryManager(extents);
}

console.log('=== NUSANTARA PHASE 53: INTEGRASI MULTIBOOT2 -> PMM ===');

test('53.1 parser, normalizer, dan PMM membentuk satu alur firmware-to-allocator', () => {
  const bootInfo = Multiboot2InfoParser.parse(firmwareInfo);
  assert.equal(bootInfo.memoryMap.length, 4);
  const pmm = createFirmwarePMM();
  assert.equal(pmm.getTotalFrameCount(), 10);
  assert.equal(pmm.getFreeFrameCount(), 10);
});

test('53.2 alokasi tidak pernah mengambil halaman kernel, reserved, ACPI, MBI, atau tipe unknown', () => {
  const pmm = createFirmwarePMM();
  const allocated: bigint[] = [];
  for (let i = 0; i < 10; i++) {
    const frame = pmm.allocateFrame();
    assert.notEqual(frame, null);
    allocated.push(frame!);
  }
  assert.deepEqual(allocated, [
    0x102000n, 0x103000n, 0x105000n, 0x106000n, 0x107000n,
    0x109000n, 0x10b000n, 0x10d000n, 0x10e000n, 0x10f000n,
  ]);
  assert.equal(pmm.allocateFrame(), null);
});

test('53.3 alokasi kontigu tidak dapat melintasi halaman firmware yang diblokir', () => {
  const pmm = createFirmwarePMM();
  assert.equal(pmm.allocateContiguousFrames(3), null);
  assert.equal(pmm.getFreeFrameCount(), 10);
  assert.equal(pmm.allocateContiguousFrames(2), 0x102000n);
  assert.equal(pmm.getFreeFrameCount(), 8);
});

test('53.4 parser menolak ukuran struktur firmware yang dipotong sebelum PMM dibuat', () => {
  const truncated = firmwareInfo.slice(0, firmwareInfo.length - 8);
  assert.throws(() => Multiboot2InfoParser.parse(truncated), /total_size/);
});

console.log(`HASIL PHASE 53.1–53.4: ${passed} LULUS, ${failed} GAGAL`);
if (failed > 0) process.exit(1);
