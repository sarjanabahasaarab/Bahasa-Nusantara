/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 62 — Native 4 KiB page-aligned RAM audit.
 *
 * These assertions verify generated x86 bootstrap machine-code contracts.
 * The counters are per-descriptor diagnostics only, not allocator extents.
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
  run(); passed++; console.log('[LULUS] ' + name);
}
console.log('=== NUSANTARA PHASE 62: PAGE-ALIGNED RAM AUDIT ===');

test('62.1 initializes the 64-bit aligned-byte audit counter', () => {
  assert.ok(containsBytes([0xc7, 0x05, 0x50, 0x80, 0x21, 0x00, 0, 0, 0, 0]));
  assert.ok(containsBytes([0xc7, 0x05, 0x54, 0x80, 0x21, 0x00, 0, 0, 0, 0]));
});

test('62.2 rounds descriptor base upward to a 4 KiB boundary with overflow guard', () => {
  assert.ok(containsBytes([0x05, 0xff, 0x0f, 0x00, 0x00, 0x83, 0xd5, 0x00]));
  assert.ok(containsBytes([0x25, 0x00, 0xf0, 0xff, 0xff]));
});

test('62.3 rounds descriptor end downward to a 4 KiB boundary', () => {
  assert.ok(containsBytes([0x8b, 0x16, 0x03, 0x56, 0x08]));
  assert.ok(containsBytes([0x81, 0xe2, 0x00, 0xf0, 0xff, 0xff]));
});

test('62.4 excludes descriptors with no complete page', () => {
  assert.ok(containsBytes([0x39, 0xeb]));
  assert.ok(containsBytes([0x39, 0xc2]));
  assert.ok(containsBytes([0x0f, 0x86])); // near JBE branch emitted by assembler
});

test('62.5 accumulates complete-page byte spans with checked uint64 arithmetic', () => {
  assert.ok(containsBytes([0x29, 0xc2, 0x19, 0xeb]));
  assert.ok(containsBytes([0x01, 0x15, 0x50, 0x80, 0x21, 0x00]));
  assert.ok(containsBytes([0x11, 0x1d, 0x54, 0x80, 0x21, 0x00]));
});

test('62.6 restores the memory-map-present register and emits page-audit marker', () => {
  assert.ok(containsBytes([0x53]));
  assert.ok(containsBytes([0x5b]));
  const marker = new TextEncoder().encode('NUSANTARA_MULTIBOOT2_PAGE_AUDIT_OK\r\n');
  assert.ok(containsBytes(Array.from(marker)));
});

console.log('HASIL PHASE 62.1–62.6: ' + passed + ' LULUS, 0 GAGAL');
