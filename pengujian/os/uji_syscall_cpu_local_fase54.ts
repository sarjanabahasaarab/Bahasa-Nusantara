/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 54 — Bootstrap CPU-local syscall stack via GS/SWAPGS.
 *
 * These checks validate generated x86-64 machine-code structure. QEMU boot
 * validation remains the execution-level gate; this is not an SMP/AP claim.
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

function countBytes(needle: readonly number[]): number {
  let count = 0;
  for (let i = 0; i <= code.length - needle.length; i++) {
    if (needle.every((value, offset) => code[i + offset] === value)) count++;
  }
  return count;
}

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('[LULUS] ' + name);
}

console.log('=== NUSANTARA PHASE 54: CPU-LOCAL SYSCALL STACK ===');

test('54.1 kernel GS base and user KERNEL_GS_BASE are initialized through WRMSR', () => {
  assert.ok(containsBytes([0xb9, 0x01, 0x01, 0x00, 0xc0])); // IA32_GS_BASE
  assert.ok(containsBytes([0xb9, 0x02, 0x01, 0x00, 0xc0])); // IA32_KERNEL_GS_BASE
  assert.ok(containsBytes([0xb8, 0x00, 0x10, 0x25, 0x00])); // CPU-local area 0x251000
});

test('54.2 CPU-local syscall stack top is stored at GS:[0]', () => {
  assert.ok(containsBytes([0x65, 0x48, 0x89, 0x04, 0x25, 0x00, 0x00, 0x00, 0x00]));
});

test('54.3 syscall entry saves user RSP and switches to GS-local kernel stack', () => {
  assert.ok(containsBytes([0x65, 0x48, 0x89, 0x24, 0x25, 0x08, 0x00, 0x00, 0x00]));
  assert.ok(containsBytes([0x65, 0x48, 0x8b, 0x24, 0x25, 0x00, 0x00, 0x00, 0x00]));
});

test('54.4 syscall return restores user RSP before SWAPGS and SYSRETQ', () => {
  assert.ok(containsBytes([0x65, 0x48, 0x8b, 0x24, 0x25, 0x08, 0x00, 0x00, 0x00]));
  assert.ok(containsBytes([0x0f, 0x01, 0xf8, 0x48, 0x0f, 0x07]));
});

test('54.5 both Ring 3 entries and user-origin page fault switch GS correctly', () => {
  // Process A, Process B, syscall entry, syscall return, and user #PF recovery.
  assert.ok(countBytes([0x0f, 0x01, 0xf8]) >= 5);
});

console.log(`HASIL PHASE 54.1–54.5: ${passed} LULUS, 0 GAGAL`);
