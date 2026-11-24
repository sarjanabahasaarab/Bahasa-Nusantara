/**
 * Phase 72: explicit runtime branch marker for Multiboot2 tag-bound failures.
 * This is a bytecode contract test; QEMU serial output remains the runtime proof.
 */
import assert from 'node:assert/strict';
import { X86BootstrapEncoder } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';

const code = X86BootstrapEncoder.generateBootstrapBinary().codeBytes;
const bytes = Array.from(code);
const contains = (needle: number[]) => bytes.some((_, i) =>
  needle.every((value, j) => bytes[i + j] === value)
);
const marker = Array.from(new TextEncoder().encode('NUSANTARA_DIAG_TAG_BOUNDS_FAIL\\r\\n'));

assert.ok(contains([0x39, 0xfe, 0x0f, 0x87]),
  'Perbandingan ESI/EDI harus memiliki cabang khusus saat batas tag terlampaui');
assert.ok(contains(marker),
  'Marker runtime untuk kegagalan batas tag harus tertanam pada bootstrap');
console.log('Phase 72: tag-bounds failure diagnostic contract passed.');
