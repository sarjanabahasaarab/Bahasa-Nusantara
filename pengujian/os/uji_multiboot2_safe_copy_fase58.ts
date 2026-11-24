/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 58 — Safe physical Multiboot2 information copy in x86 bootstrap.
 *
 * These tests inspect emitted machine-code contracts and reservation metadata.
 * Actual execution is separately gated by the bootable-kernel QEMU workflow.
 */
import assert from 'node:assert/strict';
import { X86BootstrapEncoder } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import {
  BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS,
} from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

const code = X86BootstrapEncoder.generateBootstrapBinary().codeBytes;

function containsBytes(needle: readonly number[]): boolean {
  outer: for (let i = 0; i <= code.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (code[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

function findBytes(needle: readonly number[]): number {
  outer: for (let i = 0; i <= code.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (code[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('[LULUS] ' + name);
}

console.log('=== NUSANTARA PHASE 58: SAFE MULTIBOOT2 PHYSICAL COPY ===');

test('58.1 bootstrap rejects null and unaligned MBI pointers before dereference', () => {
  assert.ok(containsBytes([0x89, 0xfb, 0x85, 0xdb])); // preserve pointer; test ebx, ebx
  assert.ok(containsBytes([0xf6, 0xc3, 0x07])); // test bl, 7
});

test('58.2 bootstrap bounds MBI pointer to the active 8 MiB identity map', () => {
  assert.ok(containsBytes([0x81, 0xfb, 0xf0, 0xff, 0x7f, 0x00]));
  assert.ok(containsBytes([0x3d, 0x00, 0x00, 0x80, 0x00]));
});

test('58.3 bootstrap validates total_size lower bound, capacity and 8-byte alignment', () => {
  assert.ok(containsBytes([0x8b, 0x0b, 0x83, 0xf9, 0x10]));
  assert.ok(containsBytes([0x81, 0xf9, 0x00, 0x00, 0x01, 0x00]));
  assert.ok(containsBytes([0xf6, 0xc1, 0x07]));
  assert.ok(containsBytes([0x83, 0x7b, 0x04, 0x00])); // reserved dword must be zero
});

test('58.4 pointer addition is checked for carry and end-of-map overflow', () => {
  assert.ok(containsBytes([0x89, 0xd8, 0x01, 0xc8, 0x0f, 0x82]));
});

test('58.5 MBI copy uses overlap-safe forward and backward REP MOVSB paths', () => {
  assert.ok(containsBytes([0xfd, 0xf3, 0xa4, 0xfc])); // std; rep movsb; cld
  assert.ok(containsBytes([0xf3, 0xa4])); // forward rep movsb
  assert.ok(containsBytes([0x39, 0xf7])); // compare destination/source
});

test('58.6 copy buffer is reserved in the bootstrap physical-memory manifest', () => {
  const buffer = BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.find(
    item => item.base === 0x260000n,
  );
  assert.deepEqual(
    buffer && [buffer.base, buffer.length],
    [0x260000n, 0x10000n],
  );
});

test('58.7 kernel emits an explicit serial marker only after the copy routine', () => {
  const text = new TextDecoder('latin1').decode(code);
  assert.ok(text.includes('NUSANTARA_MULTIBOOT2_COPY_OK'));
  const copy = findBytes([0xfd, 0xf3, 0xa4, 0xfc]);
  const marker = findBytes(Array.from(new TextEncoder().encode('NUSANTARA_MULTIBOOT2_COPY_OK')));
  assert.ok(copy >= 0 && marker > copy);
});

console.log('HASIL PHASE 58.1–58.7: ' + passed + ' LULUS, 0 GAGAL');
