/** @license SPDX-License-Identifier: Apache-2.0
 * PHASE 86 — Native validation of the final physical extent catalog.
 */
import assert from 'node:assert/strict';
import {
  X86BootstrapEncoder,
  X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS,
  X86_BOOTSTRAP_FINAL_EXTENT_TABLE_BASE,
  X86_BOOTSTRAP_FINAL_EXTENT_CAPACITY,
  X86_BOOTSTRAP_FINAL_EXTENT_RECORD_SIZE,
  X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_LOW_ADDRESS,
  X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_HIGH_ADDRESS,
  X86_BOOTSTRAP_FIXED_RESERVATIONS,
} from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

assert.deepEqual([
  X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS,
  X86_BOOTSTRAP_FINAL_EXTENT_TABLE_BASE,
  X86_BOOTSTRAP_FINAL_EXTENT_CAPACITY,
  X86_BOOTSTRAP_FINAL_EXTENT_RECORD_SIZE,
  X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_LOW_ADDRESS,
  X86_BOOTSTRAP_FINAL_VALIDATE_PREVIOUS_HIGH_ADDRESS,
], [0x273000, 0x273100, 320, 16, 0x277000, 0x277004]);

assert.ok(X86_BOOTSTRAP_FIXED_RESERVATIONS.some(r => r.start === 0x277000 && r.end === 0x278000));
assert.ok(BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.some(r => r.base === 0x277000n && r.length === 0x1000n));

const reservations = X86_BOOTSTRAP_FIXED_RESERVATIONS;
for (let i = 1; i < reservations.length; i++) {
  assert.ok(reservations[i - 1].end <= reservations[i].start, 'fixed reservations remain sorted and disjoint');
}

const code = Array.from(X86BootstrapEncoder.generateBootstrapBinary().codeBytes);
const has = (bytes: number[]) => code.some((_, i) => bytes.every((v, j) => code[i + j] === v));
const marker = new TextEncoder().encode('NUSANTARA_MULTIBOOT2_FINAL_EXTENTS_VALIDATED_OK');
assert.ok(code.some((_, i) => marker.every((v, j) => code[i + j] === v)));
assert.ok(has([0x3d, 0x40, 0x01, 0x00, 0x00]), 'native count is checked against 320');
assert.ok(has([0xf7, 0xc1, 0xff, 0x0f, 0x00, 0x00]), 'native start alignment is checked');
assert.ok(has([0xf7, 0xc3, 0xff, 0x0f, 0x00, 0x00]), 'native end alignment is checked');
assert.ok(has([0x89, 0x1d, 0x00, 0x70, 0x27, 0x00]), 'previous end low is retained');
assert.ok(has([0x89, 0x2d, 0x04, 0x70, 0x27, 0x00]), 'previous end high is retained');
assert.ok(has([0xa1, 0x00, 0x70, 0x27, 0x00, 0x39, 0xc8]), 'ordering compares previous end against current start in the correct direction');
console.log('Phase 86: native final extent validation layout and bytecode contract passed.');
