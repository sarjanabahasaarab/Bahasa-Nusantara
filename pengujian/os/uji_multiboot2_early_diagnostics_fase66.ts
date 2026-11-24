/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 66 — Early Multiboot2 boot diagnostic checkpoints.
 *
 * Bytecode contract only. QEMU serial output is the runtime evidence.
 */
import assert from 'node:assert/strict';
import { X86BootstrapEncoder } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';

const code = X86BootstrapEncoder.generateBootstrapBinary().codeBytes;
function has(text: string): boolean {
  const bytes = new TextEncoder().encode(text);
  outer: for (let i = 0; i <= code.length - bytes.length; i++) {
    for (let j = 0; j < bytes.length; j++) if (code[i + j] !== bytes[j]) continue outer;
    return true;
  }
  return false;
}
const markers = [
  'NUSANTARA_DIAG_MAGIC_OK\r\n',
  'NUSANTARA_DIAG_MBI_POINTER_OK\r\n',
  'NUSANTARA_DIAG_MBI_HEADER_OK\r\n',
  'NUSANTARA_DIAG_MBI_RANGE_OK\r\n',
  'NUSANTARA_DIAG_MBI_COPY_OK\r\n',
  'NUSANTARA_DIAG_MMAP_BEGIN\r\n',
  'NUSANTARA_DIAG_MMAP_DONE\r\n',
];
for (const marker of markers) assert.ok(has(marker), 'Missing native boot diagnostic: ' + marker.trim());
console.log('HASIL PHASE 66.1–66.7: 7 LULUS, 0 GAGAL');
