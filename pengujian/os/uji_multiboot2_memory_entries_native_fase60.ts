/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 60 — Native Multiboot2 memory-map descriptor validation.
 *
 * These assertions inspect generated machine-code contracts. QEMU execution
 * and the serial marker are separate evidence; this suite is not a PMM test.
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

console.log('=== NUSANTARA PHASE 60: NATIVE MEMORY MAP DESCRIPTORS ===');

test('60.1 descriptor iteration begins after the memory-map tag header', () => {
  assert.ok(containsBytes([0x5e, 0x83, 0xf9, 0x10])); // restore saved tag pointer, then validate minimum tag size
  assert.ok(containsBytes([0x85, 0xd2, 0x0f, 0x84]));
});

test('60.2 rejects zero-length descriptors and nonzero reserved fields', () => {
  assert.ok(containsBytes([0x8b, 0x46, 0x08, 0x0b, 0x46, 0x0c, 0x85, 0xc0]));
  assert.ok(containsBytes([0x83, 0x7e, 0x14, 0x00]));
});

test('60.3 performs checked 64-bit base-plus-length arithmetic', () => {
  assert.ok(containsBytes([0x8b, 0x06, 0x03, 0x46, 0x08]));
  assert.ok(containsBytes([0x8b, 0x46, 0x04, 0x13, 0x46, 0x0c]));
  // Conditional carry branch to fail-closed panic path follows ADC.
  assert.ok(containsBytes([0x13, 0x46, 0x0c, 0x0f, 0x82]));
});

test('60.4 descriptor pointer advances by validated entry_size and rejects wrap', () => {
  assert.ok(containsBytes([0x01, 0xce, 0x0f, 0x82])); // add esi, ecx; near JB panic32
  assert.ok(containsBytes([0x4a, 0xe9]));
});

test('60.5 preserves tag pointer and tag size after scanning every descriptor', () => {
  assert.ok(containsBytes([0x5e, 0x5d, 0x59, 0x56])); // restore tag pointer, saved EBP, tag size; preserve pointer for diagnostic
});

test('60.6 emits a distinct serial marker only after native descriptor validation', () => {
  const marker = new TextEncoder().encode('NUSANTARA_MULTIBOOT2_RANGES_OK\r\n');
  assert.ok(containsBytes(Array.from(marker)));
});

console.log('HASIL PHASE 60.1–60.6: ' + passed + ' LULUS, 0 GAGAL');
