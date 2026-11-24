/**
 * Phase 78: native merge of sorted page-extent candidates.
 * Adjacent and overlapping records are compacted in-place using uint64 bounds.
 * Firmware blocked descriptors and bootstrap reservations are not yet removed.
 */
import assert from 'node:assert/strict';
import {
  X86BootstrapEncoder,
  X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS,
  X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE,
  X86_BOOTSTRAP_PAGE_EXTENT_CAPACITY,
  X86_BOOTSTRAP_PAGE_EXTENT_SIZE,
  X86_BOOTSTRAP_PAGE_EXTENT_MERGE_READ_ADDRESS,
  X86_BOOTSTRAP_PAGE_EXTENT_MERGE_WRITE_ADDRESS,
} from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';

assert.equal(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_READ_ADDRESS, 0x0027_0c08);
assert.equal(X86_BOOTSTRAP_PAGE_EXTENT_MERGE_WRITE_ADDRESS, 0x0027_0c0c);
assert.equal(X86_BOOTSTRAP_PAGE_EXTENT_COUNT_ADDRESS, 0x0027_0000);
assert.ok(
  X86_BOOTSTRAP_PAGE_EXTENT_TABLE_BASE +
    X86_BOOTSTRAP_PAGE_EXTENT_CAPACITY * X86_BOOTSTRAP_PAGE_EXTENT_SIZE <=
    X86_BOOTSTRAP_PAGE_EXTENT_MERGE_READ_ADDRESS,
  'Candidate table must not overlap merge cursors',
);

const bootstrap = X86BootstrapEncoder.generateBootstrapBinary();
const bytes = Array.from(bootstrap.codeBytes);
const contains = (needle: number[]) => bytes.some((_, i) =>
  needle.every((value, j) => bytes[i + j] === value)
);
assert.ok(contains([0xa1, 0x08, 0x0c, 0x27, 0x00]), 'Native merge reads input cursor');
assert.ok(contains([0xa1, 0x0c, 0x0c, 0x27, 0x00]), 'Native merge reads output cursor');
assert.ok(contains([0xff, 0x05, 0x08, 0x0c, 0x27, 0x00]), 'Native merge advances input');
assert.ok(contains([0xff, 0x05, 0x0c, 0x0c, 0x27, 0x00]), 'Native merge advances output');
assert.ok(contains([0x8b, 0x56, 0x04, 0x3b, 0x57, 0x0c]),
  'Native merge compares uint64 start/end high words');
assert.ok(contains([0x8b, 0x06, 0x3b, 0x47, 0x08]),
  'Native merge compares uint64 start/end low words');
assert.ok(contains([0x8b, 0x46, 0x08, 0x89, 0x47, 0x08]),
  'Native merge extends previous end low word');
assert.ok(contains([0x8b, 0x46, 0x0c, 0x89, 0x47, 0x0c]),
  'Native merge extends previous end high word');
assert.ok(contains([0xa3, 0x00, 0x00, 0x27, 0x00]),
  'Native merge publishes compacted count after the pass');
assert.ok(contains([0x8b, 0x57, 0xfc, 0x3b, 0x57, 0x04]),
  'Native merge verifies adjacent intervals do not overlap or touch');
assert.ok(bytes.includes(0x60) && bytes.includes(0x61),
  'Native merge executes inside a saved-register context');

console.log('Phase 78: native uint64 extent merge contract passed.');
