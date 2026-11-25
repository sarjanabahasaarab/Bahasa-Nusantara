/** @license SPDX-License-Identifier: Apache-2.0
 * PHASE 90 — Native x86-64 PMM allocate/free API contract.
 */
import assert from 'node:assert/strict';
import {
  X86BootstrapEncoder,
  X86_BOOTSTRAP_PMM_ALLOCATED_BITMAP_BASE,
  X86_BOOTSTRAP_PMM_ALLOCATED_BITMAP_BYTES,
  X86_BOOTSTRAP_PMM_API_TEST_FRAME_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_BASE,
  X86_BOOTSTRAP_PMM_BITMAP_FREE_COUNT_ADDRESS,
  X86_BOOTSTRAP_PMM_BITMAP_LIMIT_BYTES,
  X86_BOOTSTRAP_PMM_BITMAP_MANAGED_FRAMES,
  X86_BOOTSTRAP_FIXED_RESERVATIONS,
} from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

assert.equal(X86_BOOTSTRAP_PMM_ALLOCATED_BITMAP_BASE, 0x27a100);
assert.equal(X86_BOOTSTRAP_PMM_ALLOCATED_BITMAP_BYTES, 0x800);
assert.equal(X86_BOOTSTRAP_PMM_API_TEST_FRAME_ADDRESS, 0x27a000);
assert.equal(X86_BOOTSTRAP_PMM_BITMAP_MANAGED_FRAMES, 0x4000);
assert.equal(X86_BOOTSTRAP_PMM_BITMAP_LIMIT_BYTES, 0x04000000);
assert.ok(X86_BOOTSTRAP_FIXED_RESERVATIONS.some(r => r.start === 0x27a000 && r.end === 0x27b000));
assert.ok(BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.some(r => r.base === 0x27a000n && r.length === 0x1000n));
for (let i = 1; i < X86_BOOTSTRAP_FIXED_RESERVATIONS.length; i++) {
  assert.ok(X86_BOOTSTRAP_FIXED_RESERVATIONS[i - 1].end <= X86_BOOTSTRAP_FIXED_RESERVATIONS[i].start,
    'fixed reservations remain sorted and disjoint');
}

const binary = X86BootstrapEncoder.generateBootstrapBinary();
const code = Array.from(binary.codeBytes);
assert.ok(binary.pmmAllocateFrameAddress > binary.entryPoint, 'allocator is exposed as a callable kernel entrypoint');
assert.ok(binary.pmmFreeFrameAddress > binary.pmmAllocateFrameAddress, 'free routine is exposed after allocate routine');
assert.ok(Number(binary.pmmFreeFrameAddress - binary.entryPoint) < code.length, 'native PMM entrypoints point inside emitted kernel code');
const has = (bytes: number[]) => code.some((_, i) => bytes.every((v, j) => code[i + j] === v));
const marker = new TextEncoder().encode('NUSANTARA_PMM_NATIVE_ALLOC_FREE_OK');
assert.ok(code.some((_, i) => marker.every((v, j) => code[i + j] === v)), 'native PMM self-test marker is embedded');
assert.ok(has([0xf0, 0x0f, 0xab, 0x0f]), 'allocation atomically claims a free frame bit');
assert.ok(has([0xf0, 0x0f, 0xb3, 0x0f]), 'free atomically clears allocation ownership and free-state bits');
assert.ok(has([0xf7, 0xc7, 0xff, 0x0f, 0x00, 0x00]), 'free rejects any non-page-aligned address');
assert.ok(has([0xf0, 0xff, 0x0c, 0x25]), 'allocation decrements free-frame counter atomically');
assert.ok(has([0xf0, 0xff, 0x04, 0x25]), 'free increments free-frame counter atomically');
for (const address of [X86_BOOTSTRAP_PMM_ALLOCATED_BITMAP_BASE, X86_BOOTSTRAP_PMM_BITMAP_BASE, X86_BOOTSTRAP_PMM_BITMAP_FREE_COUNT_ADDRESS]) {
  const bytes = [address & 0xff, (address >>> 8) & 0xff, (address >>> 16) & 0xff, (address >>> 24) & 0xff];
  assert.ok(has(bytes), `native allocator references physical metadata address 0x${address.toString(16)}`);
}
console.log('Phase 90: native PMM allocate/free bytecode and reservation contract passed.');
