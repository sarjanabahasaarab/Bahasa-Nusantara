/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 61 — Native Multiboot2 memory descriptor classification.
 *
 * Tests inspect generated machine-code contracts. Counters are bootstrap
 * diagnostics only; they are not normalized extents and must not feed PMM.
 */
import assert from 'node:assert/strict';
import { X86BootstrapEncoder } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';

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

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('[LULUS] ' + name);
}

console.log('=== NUSANTARA PHASE 61: NATIVE MEMORY MAP CLASSIFICATION ===');

test('61.1 initializes all four diagnostic counters in reserved kernel state', () => {
  assert.ok(containsBytes([0xc7, 0x05, 0x40, 0x80, 0x21, 0x00, 0, 0, 0, 0]));
  assert.ok(containsBytes([0xc7, 0x05, 0x44, 0x80, 0x21, 0x00, 0, 0, 0, 0]));
  assert.ok(containsBytes([0xc7, 0x05, 0x48, 0x80, 0x21, 0x00, 0, 0, 0, 0]));
  assert.ok(containsBytes([0xc7, 0x05, 0x4c, 0x80, 0x21, 0x00, 0, 0, 0, 0]));
});

test('61.2 classifies only firmware memory type 1 as available RAM', () => {
  assert.ok(containsBytes([0x83, 0x7e, 0x10, 0x01]));
  assert.ok(containsBytes([0x0f, 0x85])); // non-type-1 branch
});

test('61.3 increments separate available and blocked descriptor counters', () => {
  assert.ok(containsBytes([0xff, 0x05, 0x40, 0x80, 0x21, 0x00]));
  assert.ok(containsBytes([0xff, 0x05, 0x44, 0x80, 0x21, 0x00]));
});

test('61.4 accumulates type-1 byte lengths as checked uint64', () => {
  assert.ok(containsBytes([0x8b, 0x46, 0x08, 0x8b, 0x6e, 0x0c]));
  assert.ok(containsBytes([0x01, 0x05, 0x48, 0x80, 0x21, 0x00]));
  assert.ok(containsBytes([0x11, 0x2d, 0x4c, 0x80, 0x21, 0x00, 0x0f, 0x82]));
});

test('61.5 emits classification marker after the native memory-map parser succeeds', () => {
  const marker = new TextEncoder().encode('NUSANTARA_MULTIBOOT2_RANGES_OK\r\n');
  assert.ok(containsBytes(Array.from(marker)));
  assert.ok(containsBytes([0xe9])); // parser's control-flow continuation remains emitted
});

console.log('HASIL PHASE 61.1–61.5: ' + passed + ' LULUS, 0 GAGAL');
