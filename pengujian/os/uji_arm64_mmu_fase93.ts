/** @license SPDX-License-Identifier: Apache-2.0
 * Phase 93 — AArch64 4 KiB translation table descriptor and layout tests.
 */
import assert from 'node:assert/strict';
import {
  ARM64_MMU_ACCESS_FLAG,
  ARM64_MMU_ENTRIES_PER_TABLE,
  ARM64_MMU_LEVEL_SHIFTS,
  ARM64_MMU_PAGE_SIZE,
  ARM64_MMU_PHYSICAL_ADDRESS_MASK,
  ARM64_MAIR_EL1_BOOT_VALUE,
  ARM64_MMU_PXN,
  ARM64_MMU_UXN,
  buildArm64PageTablePlan,
  encodeArm64PageDescriptor,
  encodeArm64TableDescriptor,
} from '../../src/runtime/os/arch/arm64/mmu.js';

assert.equal(ARM64_MMU_PAGE_SIZE, 4096n);
assert.equal(ARM64_MMU_ENTRIES_PER_TABLE, 512);
assert.deepEqual(ARM64_MMU_LEVEL_SHIFTS, [39, 30, 21, 12]);
assert.equal(ARM64_MAIR_EL1_BOOT_VALUE, 0xff00n);

const tableDescriptor = encodeArm64TableDescriptor(0x41000000n);
assert.equal(tableDescriptor & ARM64_MMU_PHYSICAL_ADDRESS_MASK, 0x41000000n);
assert.equal(tableDescriptor & 0b11n, 0b11n);
assert.throws(() => encodeArm64TableDescriptor(0x41000001n), /sejajar/);

const device = encodeArm64PageDescriptor({
  virtualAddress: 0x09000000n,
  physicalAddress: 0x09000000n,
  access: 'el1-rw',
  memoryType: 'device-nGnRnE',
  shareability: 'outer-shareable',
});
assert.equal(device & ARM64_MMU_PHYSICAL_ADDRESS_MASK, 0x09000000n);
assert.equal(device & 0b11n, 0b11n);
assert.ok((device & ARM64_MMU_ACCESS_FLAG) !== 0n);
assert.ok((device & ARM64_MMU_PXN) !== 0n);
assert.ok((device & ARM64_MMU_UXN) !== 0n);
assert.equal((device >> 2n) & 0b111n, 0n);

const executableKernelPage = encodeArm64PageDescriptor({
  virtualAddress: 0x40080000n,
  physicalAddress: 0x40080000n,
  access: 'el1-ro',
  memoryType: 'normal-wb',
  shareability: 'inner-shareable',
  executableAtEl1: true,
});
assert.equal((executableKernelPage >> 2n) & 0b111n, 1n);
assert.equal((executableKernelPage >> 6n) & 0b11n, 0b10n);
assert.equal(executableKernelPage & ARM64_MMU_PXN, 0n);
assert.ok((executableKernelPage & ARM64_MMU_UXN) !== 0n);

assert.throws(() => encodeArm64PageDescriptor({
  virtualAddress: 0x40080001n, physicalAddress: 0x40080000n,
  access: 'el1-rw', memoryType: 'normal-wb', shareability: 'inner-shareable',
}), /Virtual address harus sejajar/);
assert.throws(() => encodeArm64PageDescriptor({
  virtualAddress: 0x40080000n, physicalAddress: 0x40080001n,
  access: 'el1-rw', memoryType: 'normal-wb', shareability: 'inner-shareable',
}), /sejajar/);
assert.throws(() => encodeArm64PageDescriptor({
  virtualAddress: 1n << 48n, physicalAddress: 0x40080000n,
  access: 'el1-rw', memoryType: 'normal-wb', shareability: 'inner-shareable',
}), /TTBR0 48-bit/);

let nextTable = 0x41000000n;
const allocate = () => {
  const result = nextTable;
  nextTable += ARM64_MMU_PAGE_SIZE;
  return result;
};
const plan = buildArm64PageTablePlan([
  {
    virtualAddress: 0x40080000n, physicalAddress: 0x40080000n,
    access: 'el1-ro', memoryType: 'normal-wb', shareability: 'inner-shareable',
    executableAtEl1: true,
  },
  {
    virtualAddress: 0x40081000n, physicalAddress: 0x40081000n,
    access: 'el1-rw', memoryType: 'normal-wb', shareability: 'inner-shareable',
  },
  {
    virtualAddress: 0x09000000n, physicalAddress: 0x09000000n,
    access: 'el1-rw', memoryType: 'device-nGnRnE', shareability: 'outer-shareable',
  },
], 0x40fff000n, allocate);

assert.equal(plan.rootPhysicalAddress, 0x40fff000n);
assert.equal(plan.mappedPages, 3);
assert.equal(plan.tables[0].level, 0);
assert.equal(plan.tables[0].entries.length, 1);
assert.equal(plan.tables.filter((table) => table.level === 1).length, 1);
assert.equal(plan.tables.filter((table) => table.level === 2).length, 2);
assert.equal(plan.tables.filter((table) => table.level === 3).length, 2);
assert.equal(plan.tables.length, 6, 'Sparse plan must allocate only the six required table pages.');
assert.ok(plan.tables.every((table) => table.physicalAddress % ARM64_MMU_PAGE_SIZE === 0n));
assert.ok(plan.tables.every((table) => table.entries.every((entry) => entry.index >= 0 && entry.index < 512)));
assert.throws(() => buildArm64PageTablePlan([
  { virtualAddress: 0x40080000n, physicalAddress: 0x40080000n, access: 'el1-rw', memoryType: 'normal-wb', shareability: 'inner-shareable' },
  { virtualAddress: 0x40080000n, physicalAddress: 0x40081000n, access: 'el1-rw', memoryType: 'normal-wb', shareability: 'inner-shareable' },
], 0x40fff000n, allocate), /lebih dari sekali/);

const reusedAllocator = () => 0x42000000n;
assert.throws(() => buildArm64PageTablePlan([
  { virtualAddress: 0x40080000n, physicalAddress: 0x40080000n, access: 'el1-rw', memoryType: 'normal-wb', shareability: 'inner-shareable' },
], 0x40fff000n, reusedAllocator), /sudah digunakan/);

console.log('Phase 93: ARM64 4 KiB descriptors, MAIR, permissions and sparse table layout passed.');
