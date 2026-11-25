/** @license SPDX-License-Identifier: Apache-2.0
 * Phase 92 — AArch64 Image header, entry, stack and PL011 runtime contract.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARM64_QEMU_VIRT_PROFILE } from '../../src/runtime/os/arch/arm64/boot-contract.js';

const source = readFileSync('src/runtime/os/arch/arm64/image.S', 'utf8');
const linker = readFileSync('src/runtime/os/arch/arm64/image.ld', 'utf8');
const builder = readFileSync('scripts/build-arm64-image.mjs', 'utf8');

const header = source.slice(source.indexOf('_image_start:'), source.indexOf('.org'));
assert.equal((header.match(/^\\s*\\.quad\\s+0$/gm) ?? []).length, 4,
  'Image header must place ARM64 magic at byte offset 56');

assert.match(source, /\.quad\s+0x00080000/, 'Image header must declare the 512 KiB text offset');
assert.match(source, /\.word\s+0x644d5241/, 'Image header must contain ARM64 magic');
assert.match(source, /\.org\s+0x800/, 'AArch64 entry code must start at Image offset 0x800');
assert.match(source, /msr\s+spsr_el2,\s*x1[\s\S]*msr\s+elr_el2,\s*x1[\s\S]*eret/, 'EL2 entry must transition to EL1');
assert.match(source, /arm64_stack_top[\s\S]*mov\s+sp,\s*x1/, 'Kernel must establish a private aligned stack');
assert.match(source, /movz\s+x2,\s*#0x9000,\s*lsl\s+#12/, 'PL011 UART base must be 0x09000000');
assert.match(source, /NUSANTARA_ARM64_BOOT_OK\\r\\n/, 'Runtime success sentinel must be present');
assert.match(source, /NUSANTARA_ARM64_BOOT_FAIL\\r\\n/, 'Runtime failure sentinel must be present');
assert.match(linker, /0x40080000/, 'Image must link at the QEMU virt AArch64 kernel load address');
assert.match(builder, /aarch64-none-elf[\s\S]*llvm-objcopy/, 'Builder must use the freestanding AArch64 toolchain');
assert.equal(ARM64_QEMU_VIRT_PROFILE.uartPhysicalBase, 0x09000000n);
console.log('Phase 92: AArch64 Image header, EL transition, stack and PL011 contracts passed.');
