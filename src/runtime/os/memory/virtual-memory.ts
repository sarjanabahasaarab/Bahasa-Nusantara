/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Virtual Memory Manager (4-Level Paging x86_64)
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { PAGE_SIZE, PagePermissions } from './types';
import { PhysicalMemoryManager } from './physical-memory';

export interface PageTableEntry {
  physicalAddress: bigint;
  permissions: PagePermissions;
  present: boolean;
}

export class VirtualMemoryManager {
  private readonly pageTable: Map<bigint, PageTableEntry> = new Map();
  private readonly pmm: PhysicalMemoryManager;
  private readonly cr3Root: bigint;

  constructor(pmm?: PhysicalMemoryManager, cr3Root?: bigint) {
    this.pmm = pmm ?? new PhysicalMemoryManager(64 * 1024 * 1024);
    this.cr3Root = cr3Root ?? (this.pmm.allocateFrame() ?? 0x200000n);
  }

  public getCR3(): bigint {
    return this.cr3Root;
  }

  /**
   * Memetakan halaman virtual (4KB) ke frame fisik dengan hak akses PagePermissions.
   */
  public mapPage(
    virtAddr: bigint,
    physAddr: bigint,
    permissions: PagePermissions | { readable?: boolean; writable?: boolean; user?: boolean; executable?: boolean } = PagePermissions.READ_WRITE
  ): boolean {
    const pageAlignedVirt = virtAddr & ~BigInt(PAGE_SIZE - 1);
    const pageAlignedPhys = physAddr & ~BigInt(PAGE_SIZE - 1);

    let perms: PagePermissions = PagePermissions.READ_ONLY;
    if (typeof permissions === 'number') {
      perms = permissions;
    } else if (typeof permissions === 'object') {
      perms = 0 as PagePermissions;
      if (permissions.readable) perms |= PagePermissions.READ_ONLY;
      if (permissions.writable) perms |= PagePermissions.READ_WRITE;
      if (permissions.user) perms |= PagePermissions.USER;
      if (permissions.executable) perms |= PagePermissions.EXECUTE;
    }

    this.pageTable.set(pageAlignedVirt, {
      physicalAddress: pageAlignedPhys,
      permissions: perms,
      present: true,
    });

    return true;
  }

  public translateAddress(virtAddr: bigint): bigint | null {
    return this.translate(virtAddr);
  }

  /**
   * Alokasi dan pemetaan otomatis halaman virtual menggunakan frame fisik baru dari PMM
   */
  public allocateAndMap(
    virtAddr: bigint,
    permissions: PagePermissions = PagePermissions.READ_WRITE
  ): bigint | null {
    const frame = this.pmm.allocateFrame();
    if (frame === null) return null;

    if (!this.mapPage(virtAddr, frame, permissions)) {
      this.pmm.freeFrame(frame);
      return null;
    }

    return frame;
  }

  /**
   * Melepas pemetaan halaman virtual dan mengembalikan frame fisik ke PMM
   */
  public unmapPage(virtAddr: bigint, freePhysicalFrame: boolean = true): boolean {
    const pageAlignedVirt = virtAddr & ~BigInt(PAGE_SIZE - 1);
    const entry = this.pageTable.get(pageAlignedVirt);
    if (!entry) return false;

    if (freePhysicalFrame) {
      this.pmm.freeFrame(entry.physicalAddress);
    }

    this.pageTable.delete(pageAlignedVirt);
    return true;
  }

  /**
   * Menerjemahkan alamat virtual ke alamat fisik melalui tabel halaman
   */
  public translate(virtAddr: bigint): bigint | null {
    const pageAlignedVirt = virtAddr & ~BigInt(PAGE_SIZE - 1);
    const offset = virtAddr & BigInt(PAGE_SIZE - 1);

    const entry = this.pageTable.get(pageAlignedVirt);
    if (!entry || !entry.present) {
      return null; // Page Fault
    }

    return entry.physicalAddress + offset;
  }

  /**
   * Mendapatkan hak akses permissions halaman virtual
   */
  public getPermissions(virtAddr: bigint): PagePermissions | null {
    const pageAlignedVirt = virtAddr & ~BigInt(PAGE_SIZE - 1);
    const entry = this.pageTable.get(pageAlignedVirt);
    return entry && entry.present ? entry.permissions : null;
  }

  /**
   * Memeriksa apakah operasi tertentu (READ, WRITE, EXECUTE, USER) diizinkan pada alamat virtual
   */
  public checkAccess(
    virtAddr: bigint,
    requiredPerm: PagePermissions | 'read' | 'write' | 'execute' | 'READ' | 'WRITE' | 'EXECUTE',
    isUserMode: boolean = false
  ): boolean {
    const perms = this.getPermissions(virtAddr);
    if (perms === null) return false; // Not present -> Page Fault

    let req: PagePermissions = PagePermissions.READ_ONLY;
    if (typeof requiredPerm === 'string') {
      const lower = requiredPerm.toLowerCase();
      if (lower === 'write') req = PagePermissions.WRITE;
      else if (lower === 'execute') req = PagePermissions.EXECUTE;
      else req = PagePermissions.READ;
    } else {
      req = requiredPerm;
    }

    if (isUserMode && (perms & PagePermissions.USER) === 0) {
      return false; // Halaman supervisor diakses dalam mode pengguna -> GPF / Page Fault
    }

    if ((req & PagePermissions.WRITE) !== 0 && (perms & PagePermissions.WRITE) === 0) {
      return false; // Penulisan ke halaman read-only -> Page Fault
    }

    if ((req & PagePermissions.EXECUTE) !== 0 && (perms & PagePermissions.EXECUTE) === 0) {
      return false; // Eksekusi halaman No-Execute -> Page Fault
    }

    return true;
  }

  public getMappedPageCount(): number {
    return this.pageTable.size;
  }

  public clear(): void {
    this.pageTable.clear();
  }
}
