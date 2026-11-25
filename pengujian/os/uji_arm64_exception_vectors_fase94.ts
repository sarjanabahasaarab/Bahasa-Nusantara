/** @license SPDX-License-Identifier: Apache-2.0
 * Phase 94 — AArch64 vector table and exception frame ABI checks.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const assembly = readFileSync('src/runtime/os/arch/arm64/exception-vectors.S', 'utf8');
const header = readFileSync('src/runtime/os/arch/arm64/exception.h', 'utf8');

assert.match(assembly, /\.balign\s+2048[\s\S]*arm64_exception_vectors:/,
  'VBAR_EL1 vector table must be aligned to 2 KiB');
assert.equal((assembly.match(/^ARM64_VECTOR_SLOT\s+\d+$/gm) ?? []).length, 16,
  'Vector table must define exactly 16 architectural slots');
assert.equal((assembly.match(/^ARM64_VECTOR_SP0_STUB\s+\d+$/gm) ?? []).length, 4,
  'EL1 SP0 vectors must fail-stop without touching an untrusted stack');
assert.equal((assembly.match(/^ARM64_VECTOR_STUB\s+\d+$/gm) ?? []).length, 12,
  'All SPx and lower-EL vector slots must have a dedicated register-saving stub');
assert.match(assembly, /\.space\s+124/,
  'Each 4-byte branch must be padded to a 128-byte vector slot');
assert.match(assembly, /stp\s+x16,\s*x17,\s*\[sp\][\s\S]*mov\s+x16,\s*#\\number/,
  'Vector stubs must preserve scratch registers before storing vector number');
assert.match(assembly, /sub\s+sp,\s*sp,\s*#288/,
  'Exception frame must reserve 288 bytes and retain 16-byte stack alignment');
assert.match(assembly, /mrs\s+x0,\s*esr_el1[\s\S]*mrs\s+x0,\s*far_el1[\s\S]*mrs\s+x0,\s*elr_el1[\s\S]*mrs\s+x0,\s*spsr_el1/,
  'Frame must capture ESR, FAR, ELR and SPSR');
assert.match(assembly, /bl\s+nusantara_arm64_exception_dispatch/,
  'Exception common path must call the kernel dispatcher');
assert.match(assembly, /msr\s+elr_el1,\s*x0[\s\S]*msr\s+spsr_el1,\s*x0[\s\S]*eret/,
  'Returning dispatcher must restore exception return state');
assert.match(assembly, /nusantara_arm64_install_exception_vectors:[\s\S]*mrs\s+x0,\s*CurrentEL[\s\S]*cmp\s+x0,\s*#4[\s\S]*msr\s+VBAR_EL1,\s*x1[\s\S]*isb[\s\S]*mov\s+w0,\s*#1/,
  'Installer must guard EL1 and write VBAR_EL1 followed by ISB');
assert.match(assembly, /\.weak\s+nusantara_arm64_exception_dispatch[\s\S]*wfe/,
  'Default dispatcher must fail closed instead of returning to unknown state');

assert.match(header, /NUSANTARA_ARM64_EXCEPTION_VECTOR_COUNT 16u/);
assert.match(header, /NUSANTARA_ARM64_EXCEPTION_VECTOR_SLOT_BYTES 128u/);
assert.match(header, /NUSANTARA_ARM64_EXCEPTION_TABLE_BYTES 2048u/);
assert.match(header, /NUSANTARA_ARM64_EXCEPTION_FRAME_BYTES 288u/);
assert.match(header, /uint64_t x\[31\]/);
assert.match(header, /offsetof\(nusantara_arm64_exception_frame_t, esr_el1\) == 248u/);
assert.match(header, /offsetof\(nusantara_arm64_exception_frame_t, vector\) == 280u/);

assert.ok(header.includes('int nusantara_arm64_install_exception_vectors(void)'));
assert.ok(header.includes('nusantara_arm64_exception_dispatch(nusantara_arm64_exception_frame_t *frame)'));

console.log('Phase 94: AArch64 16-slot vector table, exception frame ABI and fail-closed dispatcher passed.');
