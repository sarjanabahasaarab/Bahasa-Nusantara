/** @license SPDX-License-Identifier: Apache-2.0
 * PHASE 88 — Native final extent containment and reservation cross-check.
 */
import assert from 'node:assert/strict';
import {
  X86BootstrapEncoder,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_COUNT_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_INDEX_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_CANDIDATE_INDEX_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_RESERVATION_INDEX_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_START_LOW_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_START_HIGH_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_END_LOW_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_END_HIGH_ADDRESS,
  X86_BOOTSTRAP_FIXED_RESERVATIONS,
} from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

assert.deepEqual([
  X86_BOOTSTRAP_FINAL_CROSSCHECK_COUNT_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_INDEX_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_CANDIDATE_INDEX_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_RESERVATION_INDEX_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_START_LOW_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_START_HIGH_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_END_LOW_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_END_HIGH_ADDRESS,
], [0x278000, 0x278004, 0x278008, 0x27800c, 0x278010, 0x278014, 0x278018, 0x27801c]);

assert.ok(X86_BOOTSTRAP_FIXED_RESERVATIONS.some(r => r.start === 0x278000 && r.end === 0x279000));
assert.ok(BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.some(r => r.base === 0x278000n && r.length === 0x1000n));
for (let i = 1; i < X86_BOOTSTRAP_FIXED_RESERVATIONS.length; i++) {
  assert.ok(
    X86_BOOTSTRAP_FIXED_RESERVATIONS[i - 1].end <= X86_BOOTSTRAP_FIXED_RESERVATIONS[i].start,
    'fixed reservations remain sorted and disjoint',
  );
}

const code = Array.from(X86BootstrapEncoder.generateBootstrapBinary().codeBytes);
const has = (bytes: number[]) => code.some((_, i) => bytes.every((v, j) => code[i + j] === v));
const marker = new TextEncoder().encode('NUSANTARA_MULTIBOOT2_FINAL_EXTENTS_CROSSCHECK_OK');
assert.ok(code.some((_, i) => marker.every((v, j) => code[i + j] === v)), 'cross-check completion marker is embedded');
for (const address of [
  X86_BOOTSTRAP_FINAL_CROSSCHECK_COUNT_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_INDEX_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_CANDIDATE_INDEX_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_RESERVATION_INDEX_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_START_LOW_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_START_HIGH_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_END_LOW_ADDRESS,
  X86_BOOTSTRAP_FINAL_CROSSCHECK_END_HIGH_ADDRESS,
]) {
  const bytes = [address & 0xff, (address >>> 8) & 0xff, (address >>> 16) & 0xff, (address >>> 24) & 0xff];
  assert.ok(has(bytes), `native cross-check references scratch address 0x${address.toString(16)}`);
}
assert.ok(has([0x05, 0x00, 0x01, 0x27, 0x00]), 'native containment scan references candidate extent table');
assert.ok(has([0x05, 0x00, 0x11, 0x27, 0x00]), 'native overlap scan references normalized reservation catalog');
console.log('Phase 88: native final extent containment and reservation cross-check contract passed.');
