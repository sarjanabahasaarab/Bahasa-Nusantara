/** @license SPDX-License-Identifier: Apache-2.0
 * Reproducible freestanding ARM64 toolchain and QEMU target description.
 */
export const ARM64_FREESTANDING_TOOLCHAIN = Object.freeze({
  targetTriple: 'aarch64-none-elf',
  llvmTarget: 'aarch64-none-elf',
  cpu: 'cortex-a57',
  clang: 'clang',
  linker: 'ld.lld',
  objcopy: 'llvm-objcopy',
  readelf: 'llvm-readelf',
  assemblerFlags: ['--target=aarch64-none-elf', '-mcpu=cortex-a57', '-ffreestanding', '-fno-stack-protector'] as const,
  linkerFlags: ['-m', 'aarch64elf', '-nostdlib'] as const,
  qemu: 'qemu-system-aarch64',
} as const);

export function getArm64ToolchainProbeCommands(): readonly (readonly string[])[] {
  return [
    ['clang', '--version'],
    ['clang', '--target=aarch64-none-elf', '-mcpu=cortex-a57', '-print-target-triple'],
    ['ld.lld', '--version'],
    ['llvm-objcopy', '--version'],
    ['llvm-readelf', '--version'],
    ['qemu-system-aarch64', '--version'],
  ];
}
