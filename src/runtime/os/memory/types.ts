/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Memory Management Types & Constants
 * Target Milestone: Phase 48 (v0.48.0)
 */

export const PAGE_SIZE = 4096; // 4 KB per frame/page

export enum PagePermissions {
  NONE = 0,
  READ = 1 << 0,      // Present & Readable
  READ_ONLY = 1 << 0, // Present & Read-only alias
  WRITE = 1 << 1,     // Writable
  EXECUTE = 1 << 2,   // Executable (No-Execute NX bit is clear)
  USER = 1 << 3,      // User-accessible (Supervisor bit is clear)
  READ_WRITE = READ | WRITE,
  READ_EXEC = READ | EXECUTE,
  READ_WRITE_EXEC = READ | WRITE | EXECUTE,
  USER_READ_WRITE = USER | READ | WRITE,
}

export enum MemoryRegionType {
  USABLE = 'USABLE',
  RESERVED = 'RESERVED',
  KERNEL_CODE = 'KERNEL_CODE',
  KERNEL_DATA = 'KERNEL_DATA',
  PAGE_TABLES = 'PAGE_TABLES',
  ACPI = 'ACPI',
  BOOTLOADER = 'BOOTLOADER',
}

export interface MemoryRegion {
  base: bigint;
  length: bigint;
  type: MemoryRegionType;
}

export interface HeapAllocationHeader {
  magic: number;
  size: number;
  isFree: boolean;
  alignment: number;
}
