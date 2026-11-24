/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 69 — Register-safe checkpoints around native Multiboot2 tag advance.
 * This verifies emitted bytecode strings/instructions, not runtime boot success.
 */
import assert from 'node:assert/strict';
import { X86BootstrapEncoder } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
const code = X86BootstrapEncoder.generateBootstrapBinary().codeBytes;
function has(value: string): boolean {
  const bytes = new TextEncoder().encode(value);
  outer: for (let i = 0; i <= code.length - bytes.length; i++) {
    for (let j = 0; j < bytes.length; j++) if (code[i + j] !== bytes[j]) continue outer;
    return true;
  }
  return false;
}
const markers = [
  'NUSANTARA_DIAG_AFTER_MMAP_RESTORE\r\n',
  'NUSANTARA_DIAG_TAG_POINTER_ADD_OK\r\n',
  'NUSANTARA_DIAG_TAG_BOUNDS_OK\r\n',
];
for (const marker of markers) assert.ok(has(marker), 'Missing checkpoint: ' + marker.trim());
assert.ok(has('NUSANTARA_DIAG_TAG_ADVANCE_OK\r\n'), 'Missing tag-advance checkpoint');
console.log('HASIL PHASE 69.1–69.4: 4 LULUS, 0 GAGAL');
