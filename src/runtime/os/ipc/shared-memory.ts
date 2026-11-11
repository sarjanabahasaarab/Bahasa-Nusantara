/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Explicit Shared Memory Manager
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { ProcessID } from '../process/types';
import { AddressSpace, UserRegionType } from '../memory/address-space';
import { PagePermissions, PAGE_SIZE } from '../memory/types';

export class SharedMemoryManager {
  private static instance?: SharedMemoryManager;
  private readonly sharedRegions: Map<
    string,
    {
      id: string;
      ownerPid: ProcessID;
      physicalFrames: bigint[];
      sizeBytes: number;
      authorizedPids: Set<ProcessID>;
    }
  > = new Map();

  public static getInstance(): SharedMemoryManager {
    if (!this.instance) {
      this.instance = new SharedMemoryManager();
    }
    return this.instance;
  }

  public createRegion(
    regionId: string,
    ownerPid: ProcessID,
    sizeBytes: number
  ): boolean {
    if (this.sharedRegions.has(regionId)) return false;

    const pageCount = Math.ceil(sizeBytes / PAGE_SIZE);
    const frames: bigint[] = [];
    for (let i = 0; i < pageCount; i++) {
      // Frame fisik deterministik simulasi
      frames.push(0x0050_0000n + BigInt(this.sharedRegions.size * 0x10000 + i * 0x1000));
    }

    this.sharedRegions.set(regionId, {
      id: regionId,
      ownerPid,
      physicalFrames: frames,
      sizeBytes,
      authorizedPids: new Set([ownerPid]),
    });

    return true;
  }

  public grantAccess(regionId: string, ownerPid: ProcessID, targetPid: ProcessID): boolean {
    const reg = this.sharedRegions.get(regionId);
    if (!reg || reg.ownerPid !== ownerPid) return false;
    reg.authorizedPids.add(targetPid);
    return true;
  }

  public attach(
    regionId: string,
    processPid: ProcessID,
    addressSpace: AddressSpace,
    targetVirtualAddress: bigint,
    permissions: PagePermissions = PagePermissions.USER_READ_WRITE
  ): boolean {
    const reg = this.sharedRegions.get(regionId);
    if (!reg || !reg.authorizedPids.has(processPid)) return false;

    // Petakan frame fisik yang sama ke address space proses
    for (let i = 0; i < reg.physicalFrames.length; i++) {
      const vAddr = targetVirtualAddress + BigInt(i * PAGE_SIZE);
      addressSpace.mapPage(vAddr, reg.physicalFrames[i], permissions, true);
    }

    addressSpace.addRegion({
      id: `shm_${regionId}`,
      type: UserRegionType.SHARED_MEMORY,
      virtualAddress: targetVirtualAddress,
      sizeBytes: reg.sizeBytes,
      permissions,
      isShared: true,
      name: `SHM_${regionId}`,
    });

    return true;
  }
}
