/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 59 — Native Multiboot2 tag-walker machine-code contracts.
 *
 * Byte-level assertions verify emitted bootstrap instructions. Real execution
 * is separately verified by the QEMU boot workflow and serial marker.
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

console.log('=== NUSANTARA PHASE 59: NATIVE MULTIBOOT2 TAG PARSER ===');

test('59.1 walker starts at the first tag and derives the bounded end from copied total_size', () => {
  assert.ok(containsBytes([0x89, 0xfe, 0x83, 0xc6, 0x08]));
  assert.ok(containsBytes([0xa1, 0x00, 0x00, 0x26, 0x00]));
  assert.ok(containsBytes([0xbf, 0x00, 0x00, 0x26, 0x00, 0x01, 0xc7]));
});

test('59.2 every tag requires an 8-byte header and size within remaining bytes', () => {
  assert.ok(containsBytes([0x8b, 0x06, 0x8b, 0x4e, 0x04]));
  assert.ok(containsBytes([0x83, 0xf9, 0x08]));
  assert.ok(containsBytes([0x89, 0xfa, 0x29, 0xf2, 0x39, 0xd1]));
});

test('59.3 memory map requires version zero, entry size >=24, aligned and divisible payload', () => {
  assert.ok(containsBytes([0x83, 0x7e, 0x0c, 0x00]));
  assert.ok(containsBytes([0x8b, 0x4e, 0x08, 0x83, 0xf9, 0x18]));
  assert.ok(containsBytes([0xf6, 0xc1, 0x07]));
  assert.ok(containsBytes([0x31, 0xd2, 0xf7, 0xf1, 0x85, 0xd2]));
});

test('59.4 module tags validate a positive address interval and bounded NUL terminator', () => {
  assert.ok(containsBytes([0x8b, 0x46, 0x08, 0x3b, 0x46, 0x0c]));
  assert.ok(containsBytes([0xf2, 0xae]));
});

test('59.5 framebuffer tags validate minimum size, reserved field and nonzero metadata', () => {
  assert.ok(containsBytes([0x83, 0xf9, 0x20]));
  assert.ok(containsBytes([0x66, 0x83, 0x7e, 0x1e, 0x00]));
  assert.ok(containsBytes([0x80, 0x7e, 0x1c, 0x00]));
});

test('59.6 tag stepping rounds sizes to 8 bytes and rejects pointer overflow/out-of-range', () => {
  assert.ok(containsBytes([0x89, 0xc8, 0x83, 0xc0, 0x07, 0x0f, 0x82]));
  assert.ok(containsBytes([0x83, 0xe0, 0xf8, 0x01, 0xc6]));
  assert.ok(containsBytes([0x39, 0xfe, 0x0f, 0x87]));
});

test('59.7 End tag must be exactly 8 bytes, final, and memory map must exist', () => {
  assert.ok(containsBytes([0x83, 0xf9, 0x08]));
  assert.ok(containsBytes([0x8d, 0x04, 0x0e, 0x39, 0xf8]));
  assert.ok(containsBytes([0x85, 0xdb]));
  const marker = new TextEncoder().encode('NUSANTARA_MULTIBOOT2_PARSE_OK\r\n');
  assert.ok(containsBytes(Array.from(marker)));
});

console.log('HASIL PHASE 59.1–59.7: ' + passed + ' LULUS, 0 GAGAL');
