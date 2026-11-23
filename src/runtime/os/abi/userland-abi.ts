/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS — Stable Kernel/Userland ABI Contract (Phase 51).
 * This module describes the ABI; it does not execute privileged CPU instructions.
 */
import type { RegisterContext } from './types.js';
import { SyscallTable } from '../syscall/syscall-table.js';

export type UserlandABIArchitecture = 'x86_64';
export interface UserlandABIVersion { readonly major: number; readonly minor: number; readonly patch: number; }
export interface UserlandABISyscall { readonly number: number; readonly name: string; readonly minArgs: number; readonly maxArgs: number; }
export interface UserlandABIManifest {
  readonly abi: 'nusantara-userland';
  readonly version: UserlandABIVersion;
  readonly architecture: UserlandABIArchitecture;
  readonly functionCallingConvention: 'sysv-amd64';
  readonly syscallCallingConvention: 'syscall-amd64';
  readonly syscallNumberRegister: 'rax';
  readonly argumentRegisters: readonly ['rdi', 'rsi', 'rdx', 'r10', 'r8', 'r9'];
  readonly returnRegister: 'rax';
  readonly stackAlignment: 16;
  readonly features: readonly string[];
  readonly syscalls: readonly UserlandABISyscall[];
}
export interface UserlandABINegotiationRequest {
  readonly abi?: string;
  readonly version: UserlandABIVersion;
  readonly architecture: string;
  readonly requiredFeatures?: readonly string[];
}
export interface UserlandABINegotiationResult {
  readonly compatible: boolean;
  readonly reason: 'COMPATIBLE' | 'ABI_MISMATCH' | 'ARCHITECTURE_MISMATCH' | 'INVALID_VERSION' |
    'MAJOR_VERSION_MISMATCH' | 'UNSUPPORTED_MINOR_VERSION' | 'MISSING_FEATURES';
  readonly missingFeatures: readonly string[];
  readonly supportedVersion: UserlandABIVersion;
}
export interface DecodedSyscallFrame { readonly number: number; readonly args: readonly bigint[]; }

const ABI_VERSION: UserlandABIVersion = Object.freeze({ major: 1, minor: 0, patch: 0 });
const ARGUMENT_REGISTERS = Object.freeze(['rdi', 'rsi', 'rdx', 'r10', 'r8', 'r9'] as const);
const FEATURES = Object.freeze([
  'syscall-register-frame-v1',
  'negative-errno-return',
  'user-pointer-validation',
  'process-address-space-isolation',
  'elf64-user-executable',
]);
const INT64_MIN = -(1n << 63n);
const INT64_MAX = (1n << 63n) - 1n;
const MAX_SYSCALL_ARGS = 6;

function isVersion(value: unknown): value is UserlandABIVersion {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return ['major', 'minor', 'patch'].every((key) =>
    Number.isSafeInteger(candidate[key]) && Number(candidate[key]) >= 0
  );
}

/** Versioned contract for applications communicating with the NUSANTARA x86_64 kernel. */
export class UserlandABI {
  public static readonly VERSION = ABI_VERSION;
  public static readonly FEATURES = FEATURES;
  public static readonly MAX_SYSCALL_ARGS = MAX_SYSCALL_ARGS;

  /** Build a deterministic public manifest; kernel handler functions are never exposed. */
  public static createManifest(table: SyscallTable = SyscallTable.getInstance()): UserlandABIManifest {
    const syscalls = [...table.getAll().values()]
      .sort((a, b) => a.number - b.number)
      .map((entry) => Object.freeze({
        number: entry.number,
        name: entry.name,
        minArgs: entry.minArgs,
        maxArgs: MAX_SYSCALL_ARGS,
      }));
    return Object.freeze({
      abi: 'nusantara-userland' as const,
      version: ABI_VERSION,
      architecture: 'x86_64' as const,
      functionCallingConvention: 'sysv-amd64' as const,
      syscallCallingConvention: 'syscall-amd64' as const,
      syscallNumberRegister: 'rax' as const,
      argumentRegisters: ARGUMENT_REGISTERS,
      returnRegister: 'rax' as const,
      stackAlignment: 16 as const,
      features: FEATURES,
      syscalls: Object.freeze(syscalls),
    });
  }

  /** Negotiate major/minor compatibility and required ABI features. */
  public static negotiate(request: UserlandABINegotiationRequest): UserlandABINegotiationResult {
    const result = (
      compatible: boolean,
      reason: UserlandABINegotiationResult['reason'],
      missingFeatures: readonly string[] = [],
    ): UserlandABINegotiationResult => Object.freeze({
      compatible,
      reason,
      missingFeatures: Object.freeze([...missingFeatures]),
      supportedVersion: ABI_VERSION,
    });

    if (!request || request.abi !== 'nusantara-userland') return result(false, 'ABI_MISMATCH');
    if (request.architecture !== 'x86_64') return result(false, 'ARCHITECTURE_MISMATCH');
    if (!isVersion(request.version)) return result(false, 'INVALID_VERSION');
    if (request.version.major !== ABI_VERSION.major) return result(false, 'MAJOR_VERSION_MISMATCH');
    if (request.version.minor > ABI_VERSION.minor) return result(false, 'UNSUPPORTED_MINOR_VERSION');

    const requested = request.requiredFeatures ?? [];
    if (!Array.isArray(requested) || requested.some((feature) => typeof feature !== 'string')) {
      return result(false, 'INVALID_VERSION');
    }
    const missing = requested.filter((feature) => !FEATURES.includes(feature));
    if (missing.length > 0) return result(false, 'MISSING_FEATURES', missing);
    return result(true, 'COMPATIBLE');
  }

  /** Decode x86_64 SYSCALL registers without executing privileged instructions or mutating input. */
  public static decodeSyscallFrame(registers: RegisterContext): DecodedSyscallFrame {
    const rawNumber = registers.rax;
    if (rawNumber < 0n || rawNumber > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new RangeError('Nomor system call di luar rentang integer aman');
    }
    return Object.freeze({
      number: Number(rawNumber),
      args: Object.freeze([registers.rdi, registers.rsi, registers.rdx, registers.r10, registers.r8, registers.r9]),
    });
  }

  /** Store a signed 64-bit result in RAX; negative values represent negative errno. */
  public static writeSyscallResult(registers: RegisterContext, result: bigint): void {
    if (result < INT64_MIN || result > INT64_MAX) {
      throw new RangeError('Hasil system call harus berada dalam rentang signed 64-bit');
    }
    registers.rax = result;
  }

  public static isValidSyscallNumber(number: number, table: SyscallTable = SyscallTable.getInstance()): boolean {
    return Number.isSafeInteger(number) && number > 0 && table.has(number);
  }
}
