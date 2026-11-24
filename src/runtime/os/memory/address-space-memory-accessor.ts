/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Address-space aware user memory transfer backend.
 *
 * This is an adapter over explicitly supplied physical-memory I/O callbacks.
 * It does not dereference physical addresses itself and is not a hardware
 * kernel mapping implementation.
 */
import { AddressSpace } from './address-space';
import { KernelABI } from '../abi/kernel-abi';
import { PAGE_SIZE } from './types';
import type { SyscallDispatcher } from '../syscall/syscall-dispatcher';

export type PhysicalMemoryReader = (physicalAddress: bigint, length: number) => Uint8Array | null;
export type PhysicalMemoryWriter = (physicalAddress: bigint, data: Uint8Array) => boolean;

export class AddressSpaceMemoryAccessor {
  constructor(
    private readonly readPhysical: PhysicalMemoryReader,
    private readonly writePhysical: PhysicalMemoryWriter,
  ) {}

  public copyFromUser(
    addressSpace: AddressSpace,
    virtualAddress: bigint,
    length: number,
  ): Uint8Array | null {
    if (!Number.isSafeInteger(length) || length < 0 || length > 16 * 1024 * 1024) return null;
    if (length === 0) return new Uint8Array(0);
    const generation = addressSpace.getMappingGeneration();
    if (!this.validateRange(addressSpace, virtualAddress, length, 'READ')) return null;
    if (addressSpace.getMappingGeneration() !== generation) return null;

    const result = new Uint8Array(length);
    let copied = 0;
    while (copied < length) {
      const current = virtualAddress + BigInt(copied);
      const pageOffset = Number(current % BigInt(PAGE_SIZE));
      const chunkLength = Math.min(PAGE_SIZE - pageOffset, length - copied);
      if (addressSpace.getMappingGeneration() !== generation || !addressSpace.checkAccess(current, 'READ', true).allowed) return null;
      const physical = addressSpace.translate(current);
      if (physical === null) return null;
      let bytes: Uint8Array | null;
      try { bytes = this.readPhysical(physical, chunkLength); } catch { return null; }
      if (!(bytes instanceof Uint8Array) || bytes.length < chunkLength || addressSpace.getMappingGeneration() !== generation) return null;
      result.set(bytes.subarray(0, chunkLength), copied);
      copied += chunkLength;
    }
    return result;
  }

  public copyToUser(
    addressSpace: AddressSpace,
    virtualAddress: bigint,
    source: Uint8Array,
    length: number = source.length,
  ): boolean {
    if (!Number.isSafeInteger(length) || length < 0 || length > source.length || length > 16 * 1024 * 1024) return false;
    if (length === 0) return true;
    const generation = addressSpace.getMappingGeneration();
    if (!this.validateRange(addressSpace, virtualAddress, length, 'WRITE')) return false;
    if (addressSpace.getMappingGeneration() !== generation) return false;

    let copied = 0;
    while (copied < length) {
      const current = virtualAddress + BigInt(copied);
      const pageOffset = Number(current % BigInt(PAGE_SIZE));
      const chunkLength = Math.min(PAGE_SIZE - pageOffset, length - copied);
      if (addressSpace.getMappingGeneration() !== generation || !addressSpace.checkAccess(current, 'WRITE', true).allowed) return false;
      const physical = addressSpace.translate(current);
      if (physical === null) return false;
      try {
        if (!this.writePhysical(physical, source.subarray(copied, copied + chunkLength))) return false;
        if (addressSpace.getMappingGeneration() !== generation) return false;
      } catch { return false; }
      copied += chunkLength;
    }
    return true;
  }

  private validateRange(
    addressSpace: AddressSpace,
    virtualAddress: bigint,
    length: number,
    operation: 'READ' | 'WRITE',
  ): boolean {
    if (!AddressSpace.isCanonical(virtualAddress) || virtualAddress < KernelABI.MEMORY_LAYOUT.userSpaceStart || virtualAddress > KernelABI.MEMORY_LAYOUT.userSpaceEnd) return false;
    const end = virtualAddress + BigInt(length) - 1n;
    if (end < virtualAddress || !AddressSpace.isCanonical(end) || end > KernelABI.MEMORY_LAYOUT.userSpaceEnd) return false;
    const firstPage = virtualAddress - (virtualAddress % BigInt(PAGE_SIZE));
    const lastPage = end - (end % BigInt(PAGE_SIZE));
    for (let page = firstPage; page <= lastPage; page += BigInt(PAGE_SIZE)) {
      if (!addressSpace.checkAccess(page, operation, true).allowed) return false;
      if (addressSpace.translate(page) === null) return false;
    }
    return true;
  }
}

/**
 * Pasang adapter translasi ini pada dispatcher model syscall.
 * Backend tetap harus menyediakan callback baca/tulis memori fisik yang valid.
 */
export function installAddressSpaceMemoryAccessor(
  dispatcher: Pick<SyscallDispatcher, 'setMemoryAccessors'>,
  accessor: AddressSpaceMemoryAccessor,
): void {
  dispatcher.setMemoryAccessors(
    (addressSpace, virtualAddress, length) =>
      accessor.copyFromUser(addressSpace, virtualAddress, length),
    (addressSpace, virtualAddress, data) =>
      accessor.copyToUser(addressSpace, virtualAddress, data),
  );
}
