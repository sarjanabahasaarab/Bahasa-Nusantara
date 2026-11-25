/** @license SPDX-License-Identifier: Apache-2.0
 * Phase 91 — ARM64 boot ABI, AAPCS64 and QEMU target contract.
 */
import assert from 'node:assert/strict';
import {
  ARM64_ARCHITECTURE,
  ARM64_ELF_MACHINE,
  ARM64_PAGE_SIZE,
  ARM64_STACK_ALIGNMENT,
  ARM64_QEMU_VIRT_PROFILE,
  buildArm64QemuArgs,
  validateArm64BootContext,
} from '../../src/runtime/os/arch/arm64/boot-contract.js';
import { ARM64_AAPCS64, isArm64StackPointerAligned } from '../../src/runtime/os/arch/arm64/abi.js';
import { ARM64_FREESTANDING_TOOLCHAIN, getArm64ToolchainProbeCommands } from '../../src/runtime/os/arch/arm64/toolchain.js';

assert.equal(ARM64_ARCHITECTURE, 'aarch64');
assert.equal(ARM64_ELF_MACHINE, 183);
assert.equal(ARM64_PAGE_SIZE, 4096);
assert.equal(ARM64_STACK_ALIGNMENT, 16);
assert.equal(ARM64_QEMU_VIRT_PROFILE.machine, 'virt,gic-version=3');
assert.equal(ARM64_QEMU_VIRT_PROFILE.cpu, 'cortex-a57');
assert.equal(ARM64_QEMU_VIRT_PROFILE.uart, 'PL011');
assert.equal(ARM64_FREESTANDING_TOOLCHAIN.targetTriple, 'aarch64-none-elf');
assert.equal(ARM64_FREESTANDING_TOOLCHAIN.qemu, 'qemu-system-aarch64');
assert.ok(getArm64ToolchainProbeCommands().some(c => c[0] === 'clang' && c.includes('--target=aarch64-none-elf')));

const valid = {
  programCounter: 0x40080000n,
  x0: 0x44000000n,
  x1: 0n, x2: 0n, x3: 0n,
  exceptionLevel: 2 as const,
  mmuEnabled: false,
  dataCacheEnabled: false,
  interruptsMasked: true,
  littleEndian: true,
};
assert.deepEqual(validateArm64BootContext(valid), { valid: true });
assert.equal(validateArm64BootContext({ ...valid, x0: 0n }).code, 'INVALID_DTB_POINTER');
assert.equal(validateArm64BootContext({ ...valid, x0: 0x44000004n }).code, 'INVALID_DTB_POINTER');
assert.equal(validateArm64BootContext({ ...valid, programCounter: 0x40080002n }).code, 'INVALID_PC');
assert.equal(validateArm64BootContext({ ...valid, x1: 1n }).code, 'RESERVED_REGISTER_NOT_ZERO');
assert.equal(validateArm64BootContext({ ...valid, exceptionLevel: 0 as 1 }).code, 'INVALID_EXCEPTION_LEVEL');
assert.equal(validateArm64BootContext({ ...valid, mmuEnabled: true }).code, 'MMU_MUST_BE_OFF');
assert.equal(validateArm64BootContext({ ...valid, dataCacheEnabled: true }).code, 'DATA_CACHE_MUST_BE_OFF');
assert.equal(validateArm64BootContext({ ...valid, interruptsMasked: false }).code, 'INTERRUPTS_MUST_BE_MASKED');
assert.equal(validateArm64BootContext({ ...valid, littleEndian: false }).code, 'LITTLE_ENDIAN_REQUIRED');

assert.deepEqual(ARM64_AAPCS64.argumentRegisters, ['x0','x1','x2','x3','x4','x5','x6','x7']);
assert.deepEqual(ARM64_AAPCS64.calleeSavedRegisters, ['x19-x29']);
assert.equal(ARM64_AAPCS64.stackAlignmentBytes, 16);
assert.equal(isArm64StackPointerAligned(0x8000n), true);
assert.equal(isArm64StackPointerAligned(0x8008n), false);
assert.equal(isArm64StackPointerAligned(-16n), false);

assert.deepEqual(buildArm64QemuArgs('artifacts/arm64/Image'), [
  '-machine','virt,gic-version=3','-cpu','cortex-a57','-m','256M','-nographic',
  '-serial','stdio','-kernel','artifacts/arm64/Image','-no-reboot','-no-shutdown',
]);
assert.throws(() => buildArm64QemuArgs(''), /tidak boleh kosong/);
assert.throws(() => buildArm64QemuArgs('kernel\0Image'), /NUL/);
console.log('Phase 91: ARM64 boot ABI, AAPCS64, toolchain and QEMU profile tests passed.');
