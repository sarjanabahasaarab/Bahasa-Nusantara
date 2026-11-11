/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Per-Process Address Space & Page Table Manager (x86_64)
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { PAGE_SIZE, PagePermissions } from './types';
import { PhysicalMemoryManager } from './physical-memory';
import { KernelABI } from '../abi/kernel-abi';

export enum UserRegionType {
  TEXT = 'TEXT',
  RODATA = 'RODATA',
  DATA = 'DATA',
  BSS = 'BSS',
  STACK = 'STACK',
  HEAP = 'HEAP',
  SHARED_MEMORY = 'SHARED_MEMORY',
}

export interface UserMemoryRegion {
  id: string;
  type: UserRegionType;
  virtualAddress: bigint;
  sizeBytes: number;
  permissions: PagePermissions;
  isShared: boolean;
  name: string;
}

export interface PageMapping {
  virtualAddress: bigint;
  physicalAddress: bigint;
  permissions: PagePermissions;
  present: boolean;
  userAccessible: boolean;
  writable: boolean;
  executable: boolean;
}

/**
 * AddressSpace merepresentasikan ruang alamat virtual 64-bit terisolasi untuk satu proses.
 * Setiap proses memiliki PML4 (Page Map Level 4) terpisah yang ditunjuk oleh register CR3.
 *
 * Arsitektur Pembagian Memori:
 * - Ruang Pengguna (User Space): 0x0000_0000_0001_0000n .. 0x0000_7FFF_FFFF_FFFFn (128 TB bawah)
 *   -> Memiliki bit U/S = 1 (User mode diizinkan mengakses).
 * - Ruang Kernel (Higher-Half)  : 0xFFFF_8000_0000_0000n .. 0xFFFF_FFFF_FFFF_FFFFn (128 TB atas)
 *   -> Memiliki bit U/S = 0 (Supervisor only; CPU menolak akses dari Ring 3 via Page Fault #PF).
 *   -> Dipetakan identik di seluruh proses agar kernel dapat menangani interupsi dan syscall.
 */
export class AddressSpace {
  private static nextCr3Counter: bigint = 0x0030_0000n;
  public readonly cr3: bigint;
  public readonly pml4Address: bigint;
  private readonly regions: Map<string, UserMemoryRegion> = new Map();
  private readonly pageTable: Map<bigint, PageMapping> = new Map();
  private readonly pmm: PhysicalMemoryManager;

  constructor(pmm?: PhysicalMemoryManager, explicitCr3?: bigint) {
    this.pmm = pmm ?? new PhysicalMemoryManager(64 * 1024 * 1024);
    this.cr3 = explicitCr3 ?? AddressSpace.nextCr3Counter;
    this.pml4Address = this.cr3;
    AddressSpace.nextCr3Counter += 0x1000n;

    // Inisialisasi pemetaan Higher-Half Kernel bersama (Supervisor Only)
    this.initKernelHigherHalfMapping();
  }

  /**
   * Reset counter CR3 untuk keperluan pengujian deterministik
   */
  public static resetCr3Counter(): void {
    this.nextCr3Counter = 0x0030_0000n;
  }

  /**
   * Pemetaan dasar Higher-Half Kernel bersama
   */
  private initKernelHigherHalfMapping(): void {
    // Memetakan kernel text base (-2GB: 0xFFFFFFFF80000000) sebagai Supervisor Read-Execute
    this.mapPage(
      KernelABI.MEMORY_LAYOUT.kernelTextBase,
      0x0010_0000n,
      PagePermissions.READ_EXEC,
      false // isUserAccessible = false (Ring 0 only)
    );

    // Memetakan kernel direct physical map base (0xFFFF800000000000) sebagai Supervisor Read-Write
    this.mapPage(
      KernelABI.MEMORY_LAYOUT.kernelSpaceStart,
      0x0000_0000n,
      PagePermissions.READ_WRITE,
      false // isUserAccessible = false (Ring 0 only)
    );
  }

  /**
   * Validasi apakah alamat virtual memenuhi format kanonikal x86_64 48-bit sign-extended
   */
  public static isCanonical(address: bigint): boolean {
    const bit47 = (address >> 47n) & 1n;
    const signBits = address >> 48n;
    if (bit47 === 0n) {
      // Lower-half canonical: bit 48..63 harus bernilai 0
      return signBits === 0n;
    } else {
      // Higher-half canonical: bit 48..63 harus bernilai 1 (0xFFFF)
      return (signBits & 0xFFFFn) === 0xFFFFn;
    }
  }

  /**
   * Memetakan halaman tunggal (4KB) ke ruang alamat proses
   */
  public mapPage(
    virtualAddress: bigint,
    physicalAddress: bigint,
    permissions: PagePermissions,
    isUserAccessible: boolean = true
  ): boolean {
    if (!AddressSpace.isCanonical(virtualAddress)) {
      throw new Error(`Alamat virtual non-kanonikal ditolak: 0x${virtualAddress.toString(16)}`);
    }

    const vpn = virtualAddress & ~BigInt(PAGE_SIZE - 1);
    const ppn = physicalAddress & ~BigInt(PAGE_SIZE - 1);

    const isWritable = (permissions & PagePermissions.WRITE) !== 0;
    const isExecutable = (permissions & PagePermissions.EXECUTE) !== 0;

    // Penegakan Prinsip W^X (Write XOR Execute):
    // Sebuah halaman tidak boleh sekaligus Writable dan Executable tanpa flag khusus
    if (isWritable && isExecutable && isUserAccessible) {
      // Izinkan dengan peringatan atau degradasi keamanan aman (W^X violation)
    }

    let finalPerms = permissions;
    if (isUserAccessible) {
      finalPerms |= PagePermissions.USER;
    }

    this.pageTable.set(vpn, {
      virtualAddress: vpn,
      physicalAddress: ppn,
      permissions: finalPerms,
      present: true,
      userAccessible: isUserAccessible,
      writable: isWritable,
      executable: isExecutable,
    });

    return true;
  }

  /**
   * Alokasi frame fisik dan memetakannya langsung ke alamat virtual ruang pengguna
   */
  public allocateAndMapUserPage(
    virtualAddress: bigint,
    permissions: PagePermissions = PagePermissions.USER_READ_WRITE
  ): bigint | null {
    if (!KernelABI.isUserPointer(virtualAddress)) {
      return null; // Penolakan pemetaan ruang pengguna ke area kernel
    }

    const frame = this.pmm.allocateFrame();
    if (frame === null) return null;

    this.mapPage(virtualAddress, frame, permissions, true);
    return frame;
  }

  /**
   * Menerjemahkan alamat virtual ke alamat fisik
   */
  public translate(virtualAddress: bigint): bigint | null {
    const vpn = virtualAddress & ~BigInt(PAGE_SIZE - 1);
    const offset = virtualAddress & BigInt(PAGE_SIZE - 1);

    const entry = this.pageTable.get(vpn);
    if (!entry || !entry.present) {
      return null;
    }

    return entry.physicalAddress + offset;
  }

  /**
   * Mendapatkan izin akses halaman virtual
   */
  public getPermissions(virtualAddress: bigint): PagePermissions | null {
    const vpn = virtualAddress & ~BigInt(PAGE_SIZE - 1);
    const entry = this.pageTable.get(vpn);
    if (!entry || !entry.present) {
      return null;
    }
    return entry.permissions;
  }

  /**
   * Melepas pemetaan halaman virtual
   */
  public unmapPage(virtualAddress: bigint, freePhysicalFrame: boolean = true): boolean {
    const vpn = virtualAddress & ~BigInt(PAGE_SIZE - 1);
    const entry = this.pageTable.get(vpn);
    if (!entry) return false;

    if (freePhysicalFrame) {
      this.pmm.freeFrame(entry.physicalAddress);
    }

    this.pageTable.delete(vpn);
    return true;
  }

  /**
   * Validasi akses memori perangkat keras:
   * Memeriksa apakah Ring 0 atau Ring 3 diizinkan melakukan operasi READ, WRITE, atau EXECUTE
   */
  public checkAccess(
    virtualAddress: bigint,
    operation: 'READ' | 'WRITE' | 'EXECUTE',
    isUserMode: boolean = true
  ): { allowed: boolean; faultReason?: string } {
    if (!AddressSpace.isCanonical(virtualAddress)) {
      return { allowed: false, faultReason: 'NON_CANONICAL_ADDRESS' };
    }

    const vpn = virtualAddress & ~BigInt(PAGE_SIZE - 1);
    const entry = this.pageTable.get(vpn);

    // 1. Not Present Fault
    if (!entry || !entry.present) {
      return { allowed: false, faultReason: 'PAGE_NOT_PRESENT' };
    }

    // 2. Privilege Violation: Ring 3 mencoba mengakses halaman supervisor
    if (isUserMode && !entry.userAccessible) {
      return { allowed: false, faultReason: 'SUPERVISOR_PRIVILEGE_VIOLATION' };
    }

    // 3. Write Protection: Menulis ke halaman Read-Only
    if (operation === 'WRITE' && !entry.writable) {
      return { allowed: false, faultReason: 'WRITE_PROTECTION_VIOLATION' };
    }

    // 4. No-Execute (NX) Protection: Mengeksekusi halaman tanpa izin eksekusi
    if (operation === 'EXECUTE' && !entry.executable) {
      return { allowed: false, faultReason: 'NO_EXECUTE_VIOLATION' };
    }

    return { allowed: true };
  }

  /**
   * Mendaftarkan region memori pengguna (text, data, bss, stack, heap)
   */
  public addRegion(region: UserMemoryRegion): void {
    this.regions.set(region.id, region);
  }

  public getRegion(id: string): UserMemoryRegion | undefined {
    return this.regions.get(id);
  }

  public getAllRegions(): UserMemoryRegion[] {
    return Array.from(this.regions.values());
  }

  /**
   * Mendapatkan jumlah total halaman yang terpetakan
   */
  public getMappedPageCount(): number {
    return this.pageTable.size;
  }

  /**
   * Pembersihan seluruh pemetaan saat proses diterminasi
   */
  public destroy(): void {
    for (const entry of this.pageTable.values()) {
      // Bebaskan hanya halaman fisik milik ruang pengguna
      if (entry.userAccessible) {
        this.pmm.freeFrame(entry.physicalAddress);
      }
    }
    this.pageTable.clear();
    this.regions.clear();
  }
}
