/** @license SPDX-License-Identifier: Apache-2.0
 * PHASE 82 — Native subtraction of normalized reservations from RAM candidates.
 */
import assert from 'node:assert/strict';
import {
  X86BootstrapEncoder,
  X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS,
  X86_BOOTSTRAP_FINAL_EXTENT_TABLE_BASE,
  X86_BOOTSTRAP_FINAL_EXTENT_CAPACITY,
  X86_BOOTSTRAP_FINAL_EXTENT_RECORD_SIZE,
  X86_BOOTSTRAP_SUBTRACT_CANDIDATE_INDEX_ADDRESS,
  X86_BOOTSTRAP_SUBTRACT_RESERVATION_INDEX_ADDRESS,
  X86_BOOTSTRAP_SUBTRACT_CURSOR_LOW_ADDRESS,
  X86_BOOTSTRAP_SUBTRACT_CURSOR_HIGH_ADDRESS,
  X86_BOOTSTRAP_SUBTRACT_END_LOW_ADDRESS,
  X86_BOOTSTRAP_SUBTRACT_END_HIGH_ADDRESS,
} from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

assert.deepEqual([
  X86_BOOTSTRAP_FINAL_EXTENT_COUNT_ADDRESS,
  X86_BOOTSTRAP_FINAL_EXTENT_TABLE_BASE,
  X86_BOOTSTRAP_FINAL_EXTENT_CAPACITY,
  X86_BOOTSTRAP_FINAL_EXTENT_RECORD_SIZE,
], [0x273000, 0x273100, 320, 16]);
assert.deepEqual([
  X86_BOOTSTRAP_SUBTRACT_CANDIDATE_INDEX_ADDRESS,
  X86_BOOTSTRAP_SUBTRACT_RESERVATION_INDEX_ADDRESS,
  X86_BOOTSTRAP_SUBTRACT_CURSOR_LOW_ADDRESS,
  X86_BOOTSTRAP_SUBTRACT_CURSOR_HIGH_ADDRESS,
  X86_BOOTSTRAP_SUBTRACT_END_LOW_ADDRESS,
  X86_BOOTSTRAP_SUBTRACT_END_HIGH_ADDRESS,
], [0x276000, 0x276004, 0x276008, 0x27600c, 0x276010, 0x276014]);
assert.ok(BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.some(r => r.base === 0x273000n && r.length === 0x3000n));
assert.ok(BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.some(r => r.base === 0x276000n && r.length === 0x1000n));

const code = Array.from(X86BootstrapEncoder.generateBootstrapBinary().codeBytes);
const has = (bytes: number[]) => code.some((_, i) => bytes.every((v, j) => code[i + j] === v));
const marker = new TextEncoder().encode('NUSANTARA_MULTIBOOT2_RESERVATIONS_SUBTRACTED_OK');
assert.ok(code.some((_, i) => marker.every((v, j) => code[i + j] === v)));
assert.ok(has([0x3d, 0x40, 0x01, 0x00, 0x00]), 'output capacity guard 320 exists');
assert.ok(has([0x6b, 0xc9, 0x10]), '16-byte candidate/reservation indexing exists');
assert.ok(has([0xff, 0x05]), 'bounded cursor/count increments exist');
console.log('Phase 82: native reservation subtraction layout and bytecode contract passed.');
