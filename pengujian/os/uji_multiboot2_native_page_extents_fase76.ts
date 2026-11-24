/**
 * Phase 76: native x86 bootstrap emits bounded 4 KiB-aligned candidate extents.
 * These are not final allocator extents: overlaps and all reservations still
 * require a later native normalization/subtraction pass.
 */
import assert from 'node:assert/strict';
import {
  X86BootstrapEncoder,
  X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS,
  X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE,
  X86_BOOTSTRAP_PAGE_EXTENT_CAPACITY,
  X86_BOOTSTRAP_PAGE_EXTENT_SIZE,
  X86_BOOTSTRAP_USABLE_DESCRIPTOR_TABLE_BASE,
  X86_BOOTSTRAP_USABLE_DESCRIPTOR_CAPACITY,
  X86_BOOTSTRAP_USABLE_DESCRIPTOR_SIZE,
} from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

assert.equal(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS, 0x0027_0000);
assert.equal(X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE, 0x0027_0100);
assert.equal(X86_BOOTSTRAP_PAGE_EXTENT_CAPACITY, 160);
assert.equal(X86_BOOTSTRAP_PAGE_EXTENT_SIZE, 16);
assert.equal(
  X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE + X86_BOOTSTRAP_PAGE_EXTENT_CAPACITY * X86_BOOTSTRAP_PAGE_EXTENT_SIZE,
  0x0027_0b00,
  'Candidate table must fit inside the dedicated 4 KiB workspace',
);
assert.ok(
  X86_BOOTSTRAP_USABLE_DESCRIPTOR_TABLE_BASE +
    X86_BOOTSTRAP_USABLE_DESCRIPTOR_CAPACITY * X86_BOOTSTRAP_USABLE_DESCRIPTOR_SIZE <= 0x0021_9000,
  'Raw descriptor table must remain below the TSS/IDT area',
);

const workspace = BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.find(
  (reservation) => reservation.reason?.includes('page-extent candidate workspace'),
);
assert.ok(workspace, 'Candidate workspace must be excluded from the model PMM manifest');
assert.equal(workspace.base, 0x270000n);
assert.equal(workspace.length, 0x1000n);

const bootstrap = X86BootstrapEncoder.generateBootstrapBinary();
const bytes = Array.from(bootstrap.codeBytes);
const contains = (needle: number[]) => bytes.some((_, i) =>
  needle.every((value, j) => bytes[i + j] === value)
);

assert.ok(contains([0xc7, 0x05, 0x00, 0x00, 0x27, 0x00, 0x00, 0x00, 0x00, 0x00]),
  'Native candidate count must be initialized');
assert.ok(contains([0xa1, 0x00, 0x00, 0x27, 0x00]),
  'Native code must read candidate count');
assert.ok(contains([0x3d, 0xa0, 0x00, 0x00, 0x00]),
  'Native code must enforce the 160-entry capacity');
assert.ok(contains([0x6b, 0xc0, 0x10]),
  'Native code must compute 16-byte candidate slots');
assert.ok(contains([0x05, 0x00, 0x01, 0x27, 0x00]),
  'Native code must target the dedicated candidate table');
for (const store of [
  [0x89, 0x07],
  [0x89, 0x6f, 0x04],
  [0x89, 0x57, 0x08],
  [0x89, 0x5f, 0x0c],
]) assert.ok(contains(store), 'Candidate must store all four uint32 words');
assert.ok(contains([0xff, 0x05, 0x00, 0x00, 0x27, 0x00]),
  'Native code must increment candidate count');

console.log('Phase 76: native page-aligned candidate extent contract passed.');
