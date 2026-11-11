/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - User Pointer Security & Access Control Layer
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { KernelABI } from '../abi/kernel-abi';
import { AddressSpace } from '../memory/address-space';
import { PagePermissions } from '../memory/types';

export enum UserSecurityError {
  OK = 0,
  NULL_POINTER = -1,
  KERNEL_SPACE_INJECTION = -2,
  NON_CANONICAL_ADDRESS = -3,
  UNMAPPED_MEMORY = -4,
  WRITE_PROTECTION_VIOLATION = -5,
  EXECUTE_PROTECTION_VIOLATION = -6,
  BUFFER_OVERFLOW = -7,
  BUFFER_TOO_LARGE = -8,
  STRING_NOT_TERMINATED = -9,
}

export class UserPointerSecurity {
  public static readonly MAX_USER_BUFFER_BYTES = 16 * 1024 * 1024; // 16 MB limit per transfer
  public static readonly MAX_USER_STRING_BYTES = 4096; // 4 KB limit for strings

  /**
   * Validasi alamat tunggal apakah aman dan berada di ruang pengguna
   */
  public static validateUserAddress(
    ptr: bigint,
    isWrite: boolean = false,
    addressSpace?: AddressSpace
  ): { valid: boolean; error: UserSecurityError; message: string } {
    // 1. Cek NULL Pointer
    if (ptr === 0n || ptr < KernelABI.MEMORY_LAYOUT.userSpaceStart) {
      return {
        valid: false,
        error: UserSecurityError.NULL_POINTER,
        message: 'Pointer pengguna NULL atau berada pada halaman proteksi nol (< 64KB)',
      };
    }

    // 2. Cek Format Kanonikal
    if (!AddressSpace.isCanonical(ptr)) {
      return {
        valid: false,
        error: UserSecurityError.NON_CANONICAL_ADDRESS,
        message: `Alamat non-kanonikal x86_64: 0x${ptr.toString(16)}`,
      };
    }

    // 3. Mencegah Injeksi Alamat Kernel (Privilege Escalation)
    if (!KernelABI.isUserPointer(ptr)) {
      return {
        valid: false,
        error: UserSecurityError.KERNEL_SPACE_INJECTION,
        message: `Pelanggaran keamanan: pointer pengguna mengarah ke ruang memori kernel (0x${ptr.toString(16)})`,
      };
    }

    // 4. Jika diberikan addressSpace, periksa izin halaman perangkat keras
    if (addressSpace) {
      const check = addressSpace.checkAccess(ptr, isWrite ? 'WRITE' : 'READ', true);
      if (!check.allowed) {
        const errCode = check.faultReason === 'WRITE_PROTECTION_VIOLATION'
          ? UserSecurityError.WRITE_PROTECTION_VIOLATION
          : UserSecurityError.UNMAPPED_MEMORY;
        return {
          valid: false,
          error: errCode,
          message: `Akses ditolak pada address space proses: ${check.faultReason}`,
        };
      }
    }

    return { valid: true, error: UserSecurityError.OK, message: 'Alamat pengguna sah' };
  }

  /**
   * Validasi seluruh rentang buffer memori pengguna
   */
  public static validateUserBuffer(
    ptr: bigint,
    length: number,
    isWrite: boolean = false,
    addressSpace?: AddressSpace
  ): { valid: boolean; error: UserSecurityError; message: string } {
    if (length < 0) {
      return {
        valid: false,
        error: UserSecurityError.BUFFER_OVERFLOW,
        message: 'Ukuran buffer tidak boleh negatif',
      };
    }

    if (length === 0) {
      return { valid: true, error: UserSecurityError.OK, message: 'Buffer berukuran 0' };
    }

    if (length > this.MAX_USER_BUFFER_BYTES) {
      return {
        valid: false,
        error: UserSecurityError.BUFFER_TOO_LARGE,
        message: `Ukuran buffer melebihi batas keamanan kernel (${length} > ${this.MAX_USER_BUFFER_BYTES} bytes)`,
      };
    }

    // Cek batas awal
    const startCheck = this.validateUserAddress(ptr, isWrite, addressSpace);
    if (!startCheck.valid) return startCheck;

    // Cek batas akhir
    const endPtr = ptr + BigInt(length) - 1n;
    if (endPtr < ptr) {
      return {
        valid: false,
        error: UserSecurityError.BUFFER_OVERFLOW,
        message: 'Integer overflow pada kalkulasi batas akhir pointer buffer',
      };
    }

    const endCheck = this.validateUserAddress(endPtr, isWrite, addressSpace);
    if (!endCheck.valid) return endCheck;

    // Jika addressSpace tersedia, pastikan setiap halaman di rentang buffer terpetakan
    if (addressSpace) {
      const startPage = ptr & ~0xFFFn;
      const endPage = endPtr & ~0xFFFn;
      for (let p = startPage; p <= endPage; p += 0x1000n) {
        const chk = addressSpace.checkAccess(p, isWrite ? 'WRITE' : 'READ', true);
        if (!chk.allowed) {
          return {
            valid: false,
            error: chk.faultReason === 'WRITE_PROTECTION_VIOLATION'
              ? UserSecurityError.WRITE_PROTECTION_VIOLATION
              : UserSecurityError.UNMAPPED_MEMORY,
            message: `Halaman 0x${p.toString(16)} tidak memiliki izin yang sesuai (${chk.faultReason})`,
          };
        }
      }
    }

    return { valid: true, error: UserSecurityError.OK, message: 'Buffer pengguna sah' };
  }

  /**
   * Validasi string null-terminated dari ruang pengguna dengan pembatasan panjang maksimum
   */
  public static validateUserString(
    ptr: bigint,
    maxLen: number = this.MAX_USER_STRING_BYTES,
    addressSpace?: AddressSpace,
    memoryReader?: (addr: bigint, len: number) => Uint8Array | null
  ): { valid: boolean; length: number; str?: string; error: UserSecurityError } {
    const check = this.validateUserAddress(ptr, false, addressSpace);
    if (!check.valid) {
      return { valid: false, length: 0, error: check.error };
    }

    if (memoryReader) {
      const bytes = memoryReader(ptr, maxLen);
      if (!bytes) {
        return { valid: false, length: 0, error: UserSecurityError.UNMAPPED_MEMORY };
      }
      let nullIdx = -1;
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0) {
          nullIdx = i;
          break;
        }
      }
      if (nullIdx === -1) {
        return { valid: false, length: maxLen, error: UserSecurityError.STRING_NOT_TERMINATED };
      }
      const str = new TextDecoder().decode(bytes.subarray(0, nullIdx));
      return { valid: true, length: nullIdx, str, error: UserSecurityError.OK };
    }

    return { valid: true, length: 0, error: UserSecurityError.OK };
  }

  /**
   * Salin data secara aman dari ruang pengguna ke buffer kernel (copy_from_user)
   */
  public static copyFromUser(
    destKernelBuffer: Uint8Array,
    srcUserPtr: bigint,
    length: number,
    addressSpace?: AddressSpace,
    memoryReader?: (addr: bigint, len: number) => Uint8Array | null
  ): boolean {
    const validation = this.validateUserBuffer(srcUserPtr, length, false, addressSpace);
    if (!validation.valid) {
      return false;
    }

    if (memoryReader) {
      const data = memoryReader(srcUserPtr, length);
      if (!data || data.length < length) {
        return false;
      }
      destKernelBuffer.set(data.subarray(0, length));
      return true;
    }

    return true;
  }

  /**
   * Salin data secara aman dari buffer kernel ke ruang pengguna (copy_to_user)
   */
  public static copyToUser(
    destUserPtr: bigint,
    srcKernelBuffer: Uint8Array,
    length: number,
    addressSpace?: AddressSpace,
    memoryWriter?: (addr: bigint, data: Uint8Array) => boolean
  ): boolean {
    const validation = this.validateUserBuffer(destUserPtr, length, true, addressSpace);
    if (!validation.valid) {
      return false;
    }

    if (memoryWriter) {
      return memoryWriter(destUserPtr, srcKernelBuffer.subarray(0, length));
    }

    return true;
  }
}
