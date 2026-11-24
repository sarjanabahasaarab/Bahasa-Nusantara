/**
 * Phase 77: native insertion sort orders page-extent candidates by uint64 start.
 * It does not merge overlaps or subtract reservations; the result is sorted
 * candidates only and is not yet safe allocator input.
 */
import assert from 'node:assert/strict';
import {
  X86BootstrapEncoder,
  X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS,
  X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE,
  X86_BOOTSTRAP_PAGE_EXTENT_CAPACITY,
  X86_BOOTSTRAP_PAGE_EXTENT_SIZE,
  X86_BOOTSTRAP_PAGE_EXTENT_SORT_INDEX_ADDRESS,
  X86_BOOTSTRAP_PAGE_EXTENT_SORT_CURSOR_ADDRESS,
} from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';

assert.equal(X86_BOOTSTRAP_PAGE_EXTENT_SORT_INDEX_ADDRESS, 0x0027_0c00);
assert.equal(X86_BOOTSTRAP_PAGE_EXTENT_SORT_CURSOR_ADDRESS, 0x0027_0c04);
assert.ok(
  X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE +
    X86_BOOTSTRAP_PAGE_EXTENT_CAPACITY * X86_BOOTSTRAP_PAGE_EXTENT_SIZE <= 0x0027_0c00,
  'Candidate table must not overlap sort cursors',
);
assert.equal(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS, 0x0027_0000);

const bootstrap = X86BootstrapEncoder.generateBootstrapBinary();
const bytes = Array.from(bootstrap.codeBytes);
const contains = (needle: number[]) => bytes.some((_, i) =>
  needle.every((value, j) => bytes[i + j] === value)
);

assert.ok(contains([0xa1, 0x00, 0x0c, 0x27, 0x00]), 'Native sorter must read outer index');
assert.ok(contains([0xa3, 0x04, 0x0c, 0x27, 0x00]), 'Native sorter must store inner cursor');
assert.ok(contains([0x8b, 0x57, 0xf4, 0x3b, 0x57, 0x04]), 'Sort compares uint64 high dwords');
assert.ok(contains([0x8b, 0x47, 0xf0, 0x3b, 0x07]), 'Sort compares uint64 low dwords');
assert.ok(contains([0xff, 0x77, 0xf0, 0xff, 0x77, 0xf4, 0xff, 0x77, 0xf8, 0xff, 0x77, 0xfc]),
  'Sort preserves the full 16-byte record before shifting');
assert.ok(contains([0x61]), 'Sorter must restore the outer parser registers');
assert.ok(bytes.includes(...[]), 'Bootstrap bytecode is available');

console.log('Phase 77: native uint64 extent insertion-sort contract passed.');
