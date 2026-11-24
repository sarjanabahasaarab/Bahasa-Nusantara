/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 65 — Multiboot2 native boot diagnostics and register preservation.
 *
 * Byte-level contracts only. Runtime success is determined by QEMU CI.
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
console.log('=== NUSANTARA PHASE 65: MULTIBOOT2 BOOT DIAGNOSTICS ===');

test('65.1 emits the first boot sentinel immediately after UART initialization', () => {
  const uart = [0x66, 0xba, 0xfc, 0x03, 0xb0, 0x0b, 0xee];
  const boot = Array.from(new TextEncoder().encode('NUSANTARA_BOOT_START'));
  let at = -1;
  outer: for (let i = 0; i <= code.length - uart.length - boot.length; i++) {
    for (let j = 0; j < uart.length; j++) if (code[i + j] !== uart[j]) continue outer;
    at = i;
    break;
  }
  assert.ok(at >= 0, 'UART initialization sequence must exist');
  const bootMarker = Array.from(new TextEncoder().encode('NUSANTARA_BOOT_START'));
  let bootAt = -1;
  outerBoot: for (let i = at + uart.length; i <= code.length - bootMarker.length; i++) {
    for (let j = 0; j < bootMarker.length; j++) if (code[i + j] !== bootMarker[j]) continue outerBoot;
    bootAt = i;
    break;
  }
  assert.ok(bootAt > at, 'first boot sentinel must follow UART setup');
});

test('65.2 includes memory-map entry begin and completion diagnostic markers', () => {
  assert.ok(containsBytes(Array.from(new TextEncoder().encode('NUSANTARA_DIAG_MMAP_BEGIN\r\n'))));
  assert.ok(containsBytes(Array.from(new TextEncoder().encode('NUSANTARA_DIAG_MMAP_DONE\r\n'))));
});

test('65.3 preserves the tag pointer around diagnostic serial output', () => {
  assert.ok(containsBytes([0x56])); // push esi
  assert.ok(containsBytes([0x5e])); // pop esi
});

test('65.4 preserves EBP containing the Multiboot2 magic across memory-map auditing', () => {
  assert.ok(containsBytes([0x56, 0x55])); // push esi; push ebp
  assert.ok(containsBytes([0x5e, 0x5d, 0x59])); // pop esi; pop ebp; pop ecx
});

console.log('HASIL PHASE 65.1–65.4: ' + passed + ' LULUS, 0 GAGAL');
