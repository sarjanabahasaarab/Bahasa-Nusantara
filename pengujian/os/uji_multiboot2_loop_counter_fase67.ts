/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 67 — Preserve native Multiboot2 memory-map iteration state.
 *
 * Bytecode contract only. QEMU serial checkpoints remain the runtime proof.
 */
import assert from 'node:assert/strict';
import { X86BootstrapEncoder } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';

const code = X86BootstrapEncoder.generateBootstrapBinary().codeBytes;
function containsBytes(needle: readonly number[]): boolean {
  outer: for (let i = 0; i <= code.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (code[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

// EDX starts as the remaining descriptor count, but is also used as the
// low half of each descriptor's computed end address. It must be saved for
// every descriptor and restored before DEC EDX advances the loop.
assert.ok(containsBytes([0x52, 0x8b, 0x46, 0x08]), 'remaining-entry count must be pushed before descriptor arithmetic');
assert.ok(containsBytes([0x5a, 0x4a]), 'remaining-entry count must be restored immediately before decrement');
console.log('HASIL PHASE 67.1–67.2: 2 LULUS, 0 GAGAL');
