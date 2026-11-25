/** @license SPDX-License-Identifier: Apache-2.0
 * PHASE 89 — Native PMM bitmap initialized only from verified physical extents.
 */
import assert from 'node:assert/strict';
import {
  X86BootstrapEncoder,
  X86_BOOTSTRAP_PMM_BITMAP_FREE_COUNT_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_MANAGED_FRAME_COUNT_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_EXTENT_INDEX_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_FRAME_INDEX_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_FRAME_END_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_BASE,
  X86_BOOTSTRAP_PMM_BITMAP_LIMIT_BYTES,
  X86_BOOTSTRAP_PMM_BITMAP_MANAGED_FRAMES,
  X86_BOOTSTRAP_PMM_BITMAP_BYTES,
  X86_BOOTSTRAP_FIXED_RESERVATIONS,
} from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

assert.deepEqual([
  X86_BOOTSTRAP_PMM_BITMAP_FREE_COUNT_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_MANAGED_FRAME_COUNT_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_EXTENT_INDEX_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_FRAME_INDEX_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_FRAME_END_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_BASE,
  X86_BOOTSTRAP_PMM_BITMAP_LIMIT_BYTES,
  X86_BOOTSTRAP_PMM_BITMAP_MANAGED_FRAMES,
  X86_BOOTSTRAP_PMM_BITMAP_BYTES,
], [0x279000, 0x279004, 0x279008, 0x27900c, 0x279010, 0x279100, 0x04000000, 0x4000, 0x800]);

assert.ok(X86_BOOTSTRAP_FIXED_RESERVATIONS.some(r => r.start === 0x279000 && r.end === 0x27a000));
assert.ok(BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.some(r => r.base === 0x279000n && r.length === 0x1000n));
for (let i = 1; i < X86_BOOTSTRAP_FIXED_RESERVATIONS.length; i++) {
  assert.ok(X86_BOOTSTRAP_FIXED_RESERVATIONS[i - 1].end <= X86_BOOTSTRAP_FIXED_RESERVATIONS[i].start,
    'fixed reservations remain sorted and disjoint');
}

const code = Array.from(X86BootstrapEncoder.generateBootstrapBinary().codeBytes);
const has = (bytes: number[]) => code.some((_, i) => bytes.every((v, j) => code[i + j] === v));
const marker = new TextEncoder().encode('NUSANTARA_PMM_BITMAP_INITIALIZED_OK');
assert.ok(code.some((_, i) => marker.every((v, j) => code[i + j] === v)), 'native PMM initialization marker is embedded');
assert.ok(has([0xfc, 0xf3, 0xab]), 'bitmap is initialized to all-reserved before releasing approved frames');
assert.ok(has([0x0f, 0xb3, 0x0f]), 'native loop clears one bit per approved physical frame using BTR');
assert.ok(has([0x3d, 0x00, 0x00, 0x00, 0x04]), 'native PMM bitmap clamps physical memory to 64 MiB direct-map limit');
for (const address of [
  X86_BOOTSTRAP_PMM_BITMAP_FREE_COUNT_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_MANAGED_FRAME_COUNT_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_EXTENT_INDEX_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_FRAME_INDEX_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_FRAME_END_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_BASE,
]) {
  const bytes = [address & 0xff, (address >>> 8) & 0xff, (address >>> 16) & 0xff, (address >>> 24) & 0xff];
  assert.ok(has(bytes), `native PMM code references reserved bitmap address 0x${address.toString(16)}`);
}
console.log('Phase 89: native PMM bitmap layout and bytecode contract passed.');
