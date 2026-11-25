/** @license SPDX-License-Identifier: Apache-2.0
 * PHASE 84 — Native bootstrap workspace reservation coverage.
 *
 * Verifies that every native Multiboot2 workspace that can be touched while
 * building the final extent catalog is excluded from the native reservation
 * catalog before subtraction. This is a layout/contract test, not proof that
 * a hardware PMM consumes the final extent table.
 */
import assert from 'node:assert/strict';
import {
  X86_BOOTSTRAP_FIXED_RESERVATIONS,
  X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS,
  X86_BOOTSTRAP_FINAL_EXTENT_TABLE_BASE,
  X86_BOOTSTRAP_FINAL_EXTENT_CAPACITY,
  X86_BOOTSTRAP_FINAL_EXTENT_RECORD_SIZE,
  X86_BOOTSTRAP_SUBTRACT_CANDIDATE_INDEX_ADDRESS,
  X86_BOOTSTRAP_SUBTRACT_END_HIGH_ADDRESS,
} from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

const expected = [
  [0x273000, 0x276000],
  [0x276000, 0x277000],
] as const;
for (const [start, end] of expected) {
  assert.ok(
    X86_BOOTSTRAP_FIXED_RESERVATIONS.some(r => r.start === start && r.end === end),
    `native fixed reservation missing [0x${start.toString(16)}, 0x${end.toString(16)})`,
  );
  assert.ok(
    BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.some(r =>
      r.base === BigInt(start) && r.length === BigInt(end - start)),
    `runtime reservation manifest missing [0x${start.toString(16)}, 0x${end.toString(16)})`,
  );
}
assert.equal(X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS, 0x273000);
assert.equal(X86_BOOTSTRAP_FINAL_EXTENT_TABLE_BASE, 0x273100);
assert.equal(X86_BOOTSTRAP_FINAL_EXTENT_CAPACITY * X86_BOOTSTRAP_FINAL_EXTENT_RECORD_SIZE, 5120);
assert.equal(X86_BOOTSTRAP_SUBTRACT_CANDIDATE_INDEX_ADDRESS, 0x276000);
assert.equal(X86_BOOTSTRAP_SUBTRACT_END_HIGH_ADDRESS, 0x276014);

// The fixed native catalog must remain sorted and non-overlapping so its
// subsequent page-rounding/merge pass has an unambiguous input contract.
for (let i = 1; i < X86_BOOTSTRAP_FIXED_RESERVATIONS.length; i++) {
  const previous = X86_BOOTSTRAP_FIXED_RESERVATIONS[i - 1];
  const current = X86_BOOTSTRAP_FIXED_RESERVATIONS[i];
  assert.ok(previous.start <= current.start, 'fixed reservations must be sorted');
  assert.ok(previous.end <= current.start, 'fixed reservations must not overlap');
}
console.log('Phase 84: native bootstrap workspace reservations passed.');
