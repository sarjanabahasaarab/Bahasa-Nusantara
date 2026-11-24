/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 51 — Kernel/Userland ABI Contract Quality Gate.
 */
import assert from 'node:assert/strict';
import { KernelABI, SyscallTable, UserlandABI, type RegisterContext } from '../../src/runtime/os/index.js';

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try { run(); passed++; console.log('[PASS] ' + name); }
  catch (error) { failed++; console.error('[FAIL] ' + name + ': ' + (error instanceof Error ? error.message : String(error))); }
}
function registers(): RegisterContext {
  return {
    rax: 6n, rbx: 0n, rcx: 0n, rdx: 3n, rsi: 2n, rdi: 1n,
    rbp: 0n, rsp: 0x7000n, r8: 5n, r9: 6n, r10: 4n, r11: 0n,
    r12: 0n, r13: 0n, r14: 0n, r15: 0n,
    rip: 0x400000n, rflags: 0x202n, cs: 0x23, ss: 0x1b,
  };
}
console.log('=== NUSANTARA PHASE 51: KERNEL/USERLAND ABI ===');
const table = new SyscallTable();
const manifest = UserlandABI.createManifest(table);

test('51.1 ABI identity and architecture', () => {
  assert.equal(manifest.abi, 'nusantara-userland');
  assert.equal(manifest.architecture, 'x86_64');
  assert.deepEqual(manifest.version, { major: 1, minor: 0, patch: 0 });
});
test('51.2 function and syscall register conventions', () => {
  assert.equal(manifest.functionCallingConvention, 'sysv-amd64');
  assert.equal(manifest.syscallCallingConvention, 'syscall-amd64');
  assert.equal(manifest.syscallNumberRegister, 'rax');
  assert.deepEqual(manifest.argumentRegisters, ['rdi', 'rsi', 'rdx', 'r10', 'r8', 'r9']);
  assert.equal(manifest.returnRegister, 'rax');
  assert.equal(manifest.stackAlignment, 16);
});
test('51.3 manifest syscall entries are complete and sorted', () => {
  assert.equal(manifest.syscalls.length, table.getAll().size);
  assert.deepEqual(manifest.syscalls.map((x) => x.number), [...manifest.syscalls.map((x) => x.number)].sort((a, b) => a - b));
});
test('51.4 manifest does not expose kernel handlers', () => {
  for (const entry of manifest.syscalls) {
    assert.equal('handler' in entry, false);
    assert.ok(entry.minArgs >= 0 && entry.minArgs <= 6);
    assert.equal(entry.maxArgs, 6);
  }
});
test('51.5 manifest collections are immutable', () => {
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(Object.isFrozen(manifest.syscalls), true);
  assert.equal(Object.isFrozen(manifest.features), true);
  assert.equal(Object.isFrozen(manifest.version), true);
});
test('51.6 accepts the supported ABI version', () => {
  const result = UserlandABI.negotiate({ abi: 'nusantara-userland', version: { major: 1, minor: 0, patch: 0 }, architecture: 'x86_64' });
  assert.equal(result.compatible, true);
  assert.equal(result.reason, 'COMPATIBLE');
});
test('51.7 accepts a compatible version with required supported features', () => {
  assert.equal(UserlandABI.negotiate({
    abi: 'nusantara-userland', version: { major: 1, minor: 0, patch: 0 }, architecture: 'x86_64',
    requiredFeatures: [...UserlandABI.FEATURES],
  }).compatible, true);
});
test('51.8 rejects a different ABI identity', () => {
  assert.equal(UserlandABI.negotiate({ abi: 'other', version: { major: 1, minor: 0, patch: 0 }, architecture: 'x86_64' }).reason, 'ABI_MISMATCH');
});
test('51.9 rejects unsupported architecture', () => {
  assert.equal(UserlandABI.negotiate({ abi: 'nusantara-userland', version: { major: 1, minor: 0, patch: 0 }, architecture: 'aarch64' }).reason, 'ARCHITECTURE_MISMATCH');
});
test('51.10 rejects incompatible major version', () => {
  assert.equal(UserlandABI.negotiate({ abi: 'nusantara-userland', version: { major: 2, minor: 0, patch: 0 }, architecture: 'x86_64' }).reason, 'MAJOR_VERSION_MISMATCH');
});
test('51.11 rejects a newer minor version', () => {
  assert.equal(UserlandABI.negotiate({ abi: 'nusantara-userland', version: { major: 1, minor: 1, patch: 0 }, architecture: 'x86_64' }).reason, 'UNSUPPORTED_MINOR_VERSION');
});
test('51.12 reports unavailable required features', () => {
  const result = UserlandABI.negotiate({
    abi: 'nusantara-userland', version: { major: 1, minor: 0, patch: 0 }, architecture: 'x86_64',
    requiredFeatures: ['feature-not-implemented'],
  });
  assert.equal(result.reason, 'MISSING_FEATURES');
  assert.deepEqual(result.missingFeatures, ['feature-not-implemented']);
});
test('51.13 decodes the syscall register frame in ABI order', () => {
  const frame = UserlandABI.decodeSyscallFrame(registers());
  assert.equal(frame.number, 6);
  assert.deepEqual(frame.args, [1n, 2n, 3n, 4n, 5n, 6n]);
});
test('51.14 decoding does not mutate source registers', () => {
  const regs = registers();
  const before = { ...regs };
  UserlandABI.decodeSyscallFrame(regs);
  assert.deepEqual(regs, before);
});
test('51.15 rejects a negative syscall number', () => {
  const regs = registers(); regs.rax = -1n;
  assert.throws(() => UserlandABI.decodeSyscallFrame(regs), RangeError);
});
test('51.16 rejects a syscall number outside safe integer range', () => {
  const regs = registers(); regs.rax = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
  assert.throws(() => UserlandABI.decodeSyscallFrame(regs), RangeError);
});
test('51.17 writes positive syscall result to RAX', () => {
  const regs = registers(); UserlandABI.writeSyscallResult(regs, 123n);
  assert.equal(regs.rax, 123n);
});
test('51.18 writes negative errno result to RAX', () => {
  const regs = registers(); UserlandABI.writeSyscallResult(regs, -14n);
  assert.equal(regs.rax, -14n);
});
test('51.19 accepts signed 64-bit boundary values', () => {
  const regs = registers();
  UserlandABI.writeSyscallResult(regs, -(1n << 63n));
  assert.equal(regs.rax, -(1n << 63n));
  UserlandABI.writeSyscallResult(regs, (1n << 63n) - 1n);
  assert.equal(regs.rax, (1n << 63n) - 1n);
});
test('51.20 rejects results outside signed 64-bit range', () => {
  const regs = registers();
  assert.throws(() => UserlandABI.writeSyscallResult(regs, 1n << 63n), RangeError);
  assert.throws(() => UserlandABI.writeSyscallResult(regs, -(1n << 63n) - 1n), RangeError);
});
test('51.21 validates registered syscall numbers', () => {
  assert.equal(UserlandABI.isValidSyscallNumber(1, table), true);
  assert.equal(UserlandABI.isValidSyscallNumber(999, table), false);
  assert.equal(UserlandABI.isValidSyscallNumber(1.5, table), false);
  assert.equal(UserlandABI.isValidSyscallNumber(-1, table), false);
});
test('51.22 preserves existing kernel ABI helpers', () => {
  assert.equal(KernelABI.isAligned(0x1000n, 16), true);
  assert.equal(KernelABI.isUserPointerValid(0x10000n, 8), true);
  assert.equal(KernelABI.isUserPointerValid(0xFFFF800000000000n, 8), false);
});
test('51.23 syscall manifest is generated from the active registry', () => {
  const local = new SyscallTable();
  assert.equal(UserlandABI.createManifest(local).syscalls.length, local.getAll().size);
});
console.log('Phase 51: PASS=' + passed + ', FAIL=' + failed + ', TOTAL=' + (passed + failed));
if (failed > 0) process.exitCode = 1;
