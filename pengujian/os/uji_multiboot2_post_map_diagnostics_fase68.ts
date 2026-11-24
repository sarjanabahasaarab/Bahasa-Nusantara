/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 68 — Post-memory-map Multiboot2 parser checkpoints.
 * Bytecode contract only; QEMU serial output remains runtime evidence.
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
  'NUSANTARA_DIAG_MODULE_BEGIN',
  'NUSANTARA_DIAG_MODULE_DONE',
  'NUSANTARA_DIAG_FRAMEBUFFER_BEGIN',
  'NUSANTARA_DIAG_FRAMEBUFFER_DONE',
  'NUSANTARA_DIAG_END_TAG_OK',
  'NUSANTARA_DIAG_TAG_ADVANCE_OK',
];
for (const marker of markers) assert.ok(has(marker), 'Missing checkpoint: ' + marker.trim());
console.log('HASIL PHASE 68.1–68.6: 6 LULUS, 0 GAGAL');
