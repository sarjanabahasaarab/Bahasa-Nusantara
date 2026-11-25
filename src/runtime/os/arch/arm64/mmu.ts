/** @license SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — AArch64 stage-1 translation table model (Phase 93).
 *
 * Produces a deterministic, inspectable 4 KiB / 48-bit translation-table plan.
 * This module does not allocate physical RAM or enable SCTLR_EL1.M; the kernel
 * must provide a real page-table allocator and perform the architecture-
 * required cache/TLB maintenance before activating the tables.
 */
export const ARM64_MMU_PAGE_SIZE = 4096n;
export const ARM64_MMU_ENTRIES_PER_TABLE = 512;
export const ARM64_MMU_VA_BITS = 48;
export const ARM64_MMU_PA_BITS = 48;
export const ARM64_MMU_LEVEL_SHIFTS = [39, 30, 21, 12] as const;
export const ARM64_MMU_VALID = 1n;
export const ARM64_MMU_TABLE_OR_PAGE = 2n;
export const ARM64_MMU_ACCESS_FLAG = 1n << 10n;
export const ARM64_MMU_PXN = 1n << 53n;
export const ARM64_MMU_UXN = 1n << 54n;
export const ARM64_MMU_PHYSICAL_ADDRESS_MASK = 0x0000_ffff_ffff_f000n;

/** MAIR_EL1 slots used by the first QEMU virt memory map. */
export const ARM64_MAIR_ATTR_DEVICE_NGNRNE = 0x00n;
export const ARM64_MAIR_ATTR_NORMAL_WB = 0xffn;
export const ARM64_MAIR_EL1_BOOT_VALUE =
  (ARM64_MAIR_ATTR_DEVICE_NGNRNE << 0n) |
  (ARM64_MAIR_ATTR_NORMAL_WB << 8n);

export type Arm64MmuAccess = 'el1-rw' | 'el1-ro' | 'el0-rw' | 'el0-ro';
export type Arm64MmuShareability = 'non-shareable' | 'outer-shareable' | 'inner-shareable';
export type Arm64MmuMemoryType = 'device-nGnRnE' | 'normal-wb';

export interface Arm64PageMapping {
  virtualAddress: bigint;
  physicalAddress: bigint;
  access: Arm64MmuAccess;
  memoryType: Arm64MmuMemoryType;
  shareability: Arm64MmuShareability;
  executableAtEl1?: boolean;
  executableAtEl0?: boolean;
}

export interface Arm64PageTableEntry {
  index: number;
  descriptor: bigint;
  kind: 'table' | 'page';
  virtualPrefix: bigint;
}

export interface Arm64PageTable {
  level: 0 | 1 | 2 | 3;
  physicalAddress: bigint;
  entries: readonly Arm64PageTableEntry[];
}

export interface Arm64PageTablePlan {
  rootPhysicalAddress: bigint;
  tables: readonly Arm64PageTable[];
  mappedPages: number;
}

interface MutableTable {
  level: 0 | 1 | 2 | 3;
  physicalAddress: bigint;
  entries: Map<number, Arm64PageTableEntry>;
}

const UINT64_MAX = (1n << 64n) - 1n;
const MAX_ADDRESS = (1n << BigInt(ARM64_MMU_PA_BITS)) - 1n;

function fail(message: string): never {
  throw new RangeError(message);
}

function validateAddress(address: bigint, label: string, alignment: bigint): void {
  if (address < 0n || address > MAX_ADDRESS || address > UINT64_MAX) {
    fail(`${label} berada di luar rentang alamat fisik 48-bit.`);
  }
  if (address % alignment !== 0n) fail(`${label} harus sejajar ${alignment} byte.`);
}

function validateVirtualAddress(address: bigint): void {
  // This first implementation deliberately supports TTBR0's lower 48-bit VA
  // range only. TTBR1/high-half canonical addresses are a later kernel phase.
  if (address < 0n || address >= (1n << 48n)) {
    fail('Virtual address harus berada pada rentang TTBR0 48-bit.');
  }
  if (address % ARM64_MMU_PAGE_SIZE !== 0n) {
    fail('Virtual address harus sejajar halaman 4 KiB.');
  }
}

function pageIndex(address: bigint, level: 0 | 1 | 2 | 3): number {
  return Number((address >> BigInt(ARM64_MMU_LEVEL_SHIFTS[level])) & 0x1ffn);
}

function accessBits(access: Arm64MmuAccess): bigint {
  switch (access) {
    case 'el1-rw': return 0b00n << 6n;
    case 'el0-rw': return 0b01n << 6n;
    case 'el1-ro': return 0b10n << 6n;
    case 'el0-ro': return 0b11n << 6n;
  }
}

function shareabilityBits(value: Arm64MmuShareability): bigint {
  switch (value) {
    case 'non-shareable': return 0b00n << 8n;
    case 'outer-shareable': return 0b10n << 8n;
    case 'inner-shareable': return 0b11n << 8n;
  }
}

function attributeIndex(value: Arm64MmuMemoryType): bigint {
  return value === 'device-nGnRnE' ? 0n : 1n;
}

/** Encode a level-0..2 table descriptor pointing at a 4 KiB-aligned table. */
export function encodeArm64TableDescriptor(tablePhysicalAddress: bigint): bigint {
  validateAddress(tablePhysicalAddress, 'Alamat tabel', ARM64_MMU_PAGE_SIZE);
  return (tablePhysicalAddress & ARM64_MMU_PHYSICAL_ADDRESS_MASK) | 0b11n;
}

/** Encode a level-3 4 KiB page descriptor with explicit memory and permission bits. */
export function encodeArm64PageDescriptor(mapping: Arm64PageMapping): bigint {
  validateVirtualAddress(mapping.virtualAddress);
  validateAddress(mapping.physicalAddress, 'Alamat fisik halaman', ARM64_MMU_PAGE_SIZE);
  const attr = attributeIndex(mapping.memoryType) << 2n;
  const ap = accessBits(mapping.access);
  const sh = shareabilityBits(mapping.shareability);
  const pxn = mapping.executableAtEl1 === true ? 0n : ARM64_MMU_PXN;
  const uxn = mapping.executableAtEl0 === true ? 0n : ARM64_MMU_UXN;
  return (mapping.physicalAddress & ARM64_MMU_PHYSICAL_ADDRESS_MASK) |
    ARM64_MMU_VALID | ARM64_MMU_TABLE_OR_PAGE | attr | ap | sh |
    ARM64_MMU_ACCESS_FLAG | pxn | uxn;
}

/**
 * Build a sparse four-level translation-table plan for 4 KiB pages.
 * allocateTable must return unique, aligned physical pages reserved for tables.
 */
export function buildArm64PageTablePlan(
  mappings: readonly Arm64PageMapping[],
  rootPhysicalAddress: bigint,
  allocateTable: () => bigint,
): Arm64PageTablePlan {
  validateAddress(rootPhysicalAddress, 'Root table', ARM64_MMU_PAGE_SIZE);
  if (typeof allocateTable !== 'function') throw new TypeError('Allocator tabel wajib berupa fungsi.');

  const root: MutableTable = { level: 0, physicalAddress: rootPhysicalAddress, entries: new Map() };
  const tables: MutableTable[] = [root];
  const byPrefix = new Map<string, MutableTable>([['0:0', root]]);
  const allocated = new Set<bigint>([rootPhysicalAddress]);
  const mappedVirtualPages = new Set<bigint>();

  for (const mapping of mappings) {
    validateVirtualAddress(mapping.virtualAddress);
    validateAddress(mapping.physicalAddress, 'Alamat fisik halaman', ARM64_MMU_PAGE_SIZE);
    if (mappedVirtualPages.has(mapping.virtualAddress)) {
      fail(`Virtual page dipetakan lebih dari sekali: 0x${mapping.virtualAddress.toString(16)}.`);
    }
    mappedVirtualPages.add(mapping.virtualAddress);

    let table = root;
    for (let level = 0 as 0 | 1 | 2; level < 3; level = (level + 1) as 0 | 1 | 2) {
      const index = pageIndex(mapping.virtualAddress, level);
      const nextLevel = (level + 1) as 1 | 2 | 3;
      const prefix = mapping.virtualAddress >> BigInt(ARM64_MMU_LEVEL_SHIFTS[nextLevel]);
      const key = `${nextLevel}:${prefix.toString(16)}`;
      let child = byPrefix.get(key);
      if (!child) {
        const physicalAddress = allocateTable();
        validateAddress(physicalAddress, 'Alamat tabel baru', ARM64_MMU_PAGE_SIZE);
        if (allocated.has(physicalAddress)) fail('Allocator mengembalikan alamat tabel yang sudah digunakan.');
        allocated.add(physicalAddress);
        child = { level: nextLevel, physicalAddress, entries: new Map() };
        byPrefix.set(key, child);
        tables.push(child);
        table.entries.set(index, {
          index,
          descriptor: encodeArm64TableDescriptor(physicalAddress),
          kind: 'table',
          virtualPrefix: prefix,
        });
      } else {
        const existing = table.entries.get(index);
        if (!existing || existing.kind !== 'table' || (existing.descriptor & ARM64_MMU_PHYSICAL_ADDRESS_MASK) !== child.physicalAddress) {
          fail('Konflik struktur tabel untuk virtual address yang sama.');
        }
      }
      table = child;
    }

    const leafIndex = pageIndex(mapping.virtualAddress, 3);
    if (table.entries.has(leafIndex)) fail('Entri leaf page table bertabrakan.');
    table.entries.set(leafIndex, {
      index: leafIndex,
      descriptor: encodeArm64PageDescriptor(mapping),
      kind: 'page',
      virtualPrefix: mapping.virtualAddress >> 12n,
    });
  }

  return {
    rootPhysicalAddress,
    tables: tables.map((table) => ({
      level: table.level,
      physicalAddress: table.physicalAddress,
      entries: [...table.entries.values()].sort((a, b) => a.index - b.index),
    })),
    mappedPages: mappedVirtualPages.size,
  };
}
