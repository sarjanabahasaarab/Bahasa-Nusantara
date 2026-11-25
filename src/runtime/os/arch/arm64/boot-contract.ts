/** @license SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — ARM64 boot and platform contract (Phase 91).
 *
 * The boot contract follows the AArch64 Linux Image entry convention used by
 * QEMU virt: execution begins at the Image entry point with MMU/data cache off,
 * interrupts masked, and the physical DTB address in X0. This is a boot ABI
 * convention only; it does not imply Linux kernel code or Linux runtime use.
 */
export const ARM64_ARCHITECTURE = 'aarch64' as const;
export const ARM64_ELF_MACHINE = 183 as const; // EM_AARCH64
export const ARM64_PAGE_SIZE = 4096 as const;
export const ARM64_STACK_ALIGNMENT = 16 as const;
export const ARM64_IMAGE_HEADER_SIZE = 64 as const;
export const ARM64_BOOT_DTB_REGISTER = 'x0' as const;
export const ARM64_BOOT_RESERVED_REGISTERS = ['x1', 'x2', 'x3'] as const;

export type Arm64ExceptionLevel = 1 | 2;

export interface Arm64BootContext {
  /** Physical address of the Image entry point. */
  programCounter: bigint;
  /** Physical address of the flattened device tree supplied by firmware/QEMU. */
  x0: bigint;
  x1: bigint;
  x2: bigint;
  x3: bigint;
  exceptionLevel: Arm64ExceptionLevel;
  mmuEnabled: boolean;
  dataCacheEnabled: boolean;
  interruptsMasked: boolean;
  littleEndian: boolean;
}

export type Arm64BootValidationCode =
  | 'INVALID_PC'
  | 'INVALID_DTB_POINTER'
  | 'RESERVED_REGISTER_NOT_ZERO'
  | 'INVALID_EXCEPTION_LEVEL'
  | 'MMU_MUST_BE_OFF'
  | 'DATA_CACHE_MUST_BE_OFF'
  | 'INTERRUPTS_MUST_BE_MASKED'
  | 'LITTLE_ENDIAN_REQUIRED';

export interface Arm64BootValidation {
  valid: boolean;
  code?: Arm64BootValidationCode;
  message?: string;
}

const UINT64_MAX = (1n << 64n) - 1n;

/** Validate preconditions before the architecture-specific entry stub uses X0. */
export function validateArm64BootContext(context: Arm64BootContext): Arm64BootValidation {
  if (context.programCounter <= 0n || context.programCounter > UINT64_MAX || context.programCounter % 4n !== 0n) {
    return { valid: false, code: 'INVALID_PC', message: 'PC harus alamat instruksi AArch64 yang positif dan sejajar 4 byte.' };
  }
  if (context.x0 <= 0n || context.x0 > UINT64_MAX || context.x0 % 8n !== 0n) {
    return { valid: false, code: 'INVALID_DTB_POINTER', message: 'X0 harus menunjuk DTB fisik non-nol yang sejajar 8 byte.' };
  }
  if (context.x1 !== 0n || context.x2 !== 0n || context.x3 !== 0n) {
    return { valid: false, code: 'RESERVED_REGISTER_NOT_ZERO', message: 'Register X1–X3 wajib nol saat entry.' };
  }
  if (context.exceptionLevel !== 1 && context.exceptionLevel !== 2) {
    return { valid: false, code: 'INVALID_EXCEPTION_LEVEL', message: 'Kernel hanya menerima entry pada EL1 atau EL2 non-secure.' };
  }
  if (context.mmuEnabled) return { valid: false, code: 'MMU_MUST_BE_OFF', message: 'MMU wajib nonaktif saat entry.' };
  if (context.dataCacheEnabled) return { valid: false, code: 'DATA_CACHE_MUST_BE_OFF', message: 'Data cache wajib nonaktif saat entry.' };
  if (!context.interruptsMasked) return { valid: false, code: 'INTERRUPTS_MUST_BE_MASKED', message: 'Interrupt wajib dimask saat entry.' };
  if (!context.littleEndian) return { valid: false, code: 'LITTLE_ENDIAN_REQUIRED', message: 'Mode little-endian diwajibkan.' };
  return { valid: true };
}

/** Stable QEMU virt machine profile for the first ARM64 port. */
export const ARM64_QEMU_VIRT_PROFILE = Object.freeze({
  executable: 'qemu-system-aarch64',
  machine: 'virt,gic-version=3',
  cpu: 'cortex-a57',
  memory: '256M',
  serial: 'stdio',
  uart: 'PL011',
  uartPhysicalBase: 0x09000000n,
  gicDistributorBase: 0x08000000n,
  gicRedistributorBase: 0x080a0000n,
  bootProtocol: 'AArch64 Image entry with DTB address in X0',
} as const);

/** Build an argv vector; callers must spawn directly and never interpolate a shell command. */
export function buildArm64QemuArgs(kernelImagePath: string): string[] {
  if (!kernelImagePath.trim() || kernelImagePath.includes('\0')) {
    throw new TypeError('Path kernel ARM64 tidak boleh kosong atau mengandung NUL.');
  }
  return [
    '-machine', ARM64_QEMU_VIRT_PROFILE.machine,
    '-cpu', ARM64_QEMU_VIRT_PROFILE.cpu,
    '-m', ARM64_QEMU_VIRT_PROFILE.memory,
    '-nographic',
    '-serial', ARM64_QEMU_VIRT_PROFILE.serial,
    '-kernel', kernelImagePath,
    '-no-reboot',
    '-no-shutdown',
  ];
}
