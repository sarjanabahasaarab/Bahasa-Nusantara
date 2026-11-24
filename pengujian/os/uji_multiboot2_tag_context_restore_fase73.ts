/**
 * Phase 73: the memory-map descriptor walker must restore the outer
 * Multiboot2 tag cursor (ECX/ESI/EDI) before advancing to the next tag.
 * Bytecode contract only; QEMU serial output is the runtime proof.
 */
import assert from 'node:assert/strict';
import { X86BootstrapEncoder } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';

const result = X86BootstrapEncoder.generateBootstrapBinary();
const bytes = Array.from(result.codeBytes);
const contains = (needle: number[]) => bytes.some((_, i) =>
  needle.every((value, j) => bytes[i + j] === value)
);

assert.ok(contains([0x89, 0x0d, 0x58, 0x80, 0x21, 0x00]),
  'Tag size ECX harus disimpan sebelum pemrosesan memory map');
assert.ok(contains([0x89, 0x35, 0x5c, 0x80, 0x21, 0x00]),
  'Tag pointer ESI harus disimpan sebelum pemrosesan memory map');
assert.ok(contains([0x89, 0x3d, 0x60, 0x80, 0x21, 0x00]),
  'MBI end EDI harus disimpan sebelum pemrosesan memory map');
assert.ok(contains([0x8b, 0x0d, 0x58, 0x80, 0x21, 0x00]),
  'Tag size ECX harus dipulihkan sebelum advance');
assert.ok(contains([0x8b, 0x35, 0x5c, 0x80, 0x21, 0x00]),
  'Tag pointer ESI harus dipulihkan sebelum advance');
assert.ok(contains([0x8b, 0x3d, 0x60, 0x80, 0x21, 0x00]),
  'MBI end EDI harus dipulihkan sebelum advance');

console.log('Phase 73: Multiboot2 tag context restore contract passed.');
