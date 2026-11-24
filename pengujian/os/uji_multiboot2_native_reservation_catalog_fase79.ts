/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 79 — Native bootstrap reservation catalog contract.
 * Bytecode checks do not replace QEMU serial/runtime validation.
 */
import assert from 'node:assert/strict';
import {
  X86BootstrapEncoder,
  X86_BOOTSTRAP_FIXED_RESERVATIONS,
  X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS,
  X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE,
  X86_BOOTSTRAP_RESERVATION_CATALOG_CAPACITY,
  X86_BOOTSTRAP_RESERVATION_CATALOG_RECORD_SIZE,
} from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

assert.equal(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS, 0x0027_1000);
assert.equal(X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE, 0x0027_1100);
assert.equal(X86_BOOTSTRAP_RESERVATION_CATALOG_CAPACITY, 160);
assert.equal(X86_BOOTSTRAP_RESERVATION_CATALOG_RECORD_SIZE, 16);
assert.equal(X86_BOOTSTRAP_FIXED_RESERVATIONS.length, 14);
assert.ok(
  X86_BOOTSTRAP_RESERVATION_CATALOG_TABLE_BASE +
    X86_BOOTSTRAP_RESERVATION_CATALOG_CAPACITY * X86_BOOTSTRAP_RESERVATION_CATALOG_RECORD_SIZE <=
    0x0027_2000,
  'Catalog table must remain inside its reserved 4 KiB workspace',
);
assert.ok(
  BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.some(
    (r) => r.base === 0x271000n && r.length === 0x1000n,
  ),
  'The catalog workspace must be excluded from model PMM extents',
);

for (const range of X86_BOOTSTRAP_FIXED_RESERVATIONS) {
  assert.ok(Number.isInteger(range.start) && Number.isInteger(range.end));
  assert.ok(range.start >= 0 && range.end > range.start);
  assert.equal(range.start % 4096, 0, 'Fixed reservation start must be page aligned');
  assert.equal(range.end % 4096, 0, 'Fixed reservation end must be page aligned');
}

const code = Array.from(X86BootstrapEncoder.generateBootstrapBinary().codeBytes);
const has = (needle: number[]) => code.some((_, i) =>
  needle.every((value, j) => code[i + j] === value)
);
const addr = (value: number) => [
  value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff,
];
assert.ok(has([0xa3, ...addr(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS)]),
  'Native bootstrap initializes the reservation catalog count');
assert.ok(has([0xa1, ...addr(X86_BOOTSTRAP_RESERVATION_CATALOG_COUNT_ADDRESS)]),
  'Native parser reads catalog count before bounded appends');
assert.ok(has([0x3d, 0xa0, 0x00, 0x00, 0x00]),
  'Native parser fails closed at the 160-record catalog capacity');
assert.ok(has([0xf7, 0x66, 0x18]),
  'Framebuffer reservation size uses checked pitch × height multiplication');
assert.ok(has([0x8b, 0x06, 0x03, 0x46, 0x08]),
  'Blocked firmware descriptors produce uint64 end-exclusive catalog entries');
assert.ok(has([0x8b, 0x46, 0x08, 0x89, 0x07]),
  'Module physical start is catalogued');
assert.ok(has([0x89, 0x5f, 0x08, 0x89, 0x4f, 0x0c]),
  'Framebuffer end-exclusive address is catalogued');
const marker = new TextEncoder().encode('NUSANTARA_MULTIBOOT2_RESERVATIONS_CATALOGUED_OK');
assert.ok(code.some((_, i) => marker.every((v, j) => code[i + j] === v)),
  'Catalog completion marker is emitted only after Multiboot2 tag parsing');

console.log('Phase 79: native fixed, firmware-blocked, module and framebuffer reservation catalog contract passed.');
