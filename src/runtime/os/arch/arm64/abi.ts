/** @license SPDX-License-Identifier: Apache-2.0
 * AAPCS64 register and stack contract for NUSANTARA OS kernel interfaces.
 */
export const ARM64_AAPCS64 = Object.freeze({
  argumentRegisters: ['x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7'] as const,
  resultRegisters: ['x0', 'x1'] as const,
  indirectResultRegister: 'x8' as const,
  callerSavedRegisters: ['x0-x17', 'x30'] as const,
  calleeSavedRegisters: ['x19-x29'] as const,
  platformRegister: 'x18' as const,
  framePointer: 'x29' as const,
  linkRegister: 'x30' as const,
  stackPointer: 'sp' as const,
  stackAlignmentBytes: 16,
  stackGrowth: 'down' as const,
  instructionAlignmentBytes: 4,
} as const);

export function isArm64StackPointerAligned(stackPointer: bigint): boolean {
  return stackPointer >= 0n && stackPointer % BigInt(ARM64_AAPCS64.stackAlignmentBytes) === 0n;
}
