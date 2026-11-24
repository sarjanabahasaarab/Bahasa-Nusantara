/** @license SPDX-License-Identifier: Apache-2.0
 * PHASE 81 — bounded subtraction of normalized physical reservations.
 *
 * This verifies the TypeScript reference/oracle only, not native Ring 0 execution.
 */
import assert from 'node:assert/strict';
import {
  subtractNormalizedPhysicalReservations,
  type UsablePhysicalMemoryExtent,
  type PhysicalMemoryReservation,
} from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

const extent = (base: bigint, end: bigint): UsablePhysicalMemoryExtent => ({
  base, length: end - base, endExclusive: end,
});
const run = (candidates: UsablePhysicalMemoryExtent[], reservations: PhysicalMemoryReservation[], maxOutputExtents = 320) =>
  subtractNormalizedPhysicalReservations(candidates, reservations, { maxOutputExtents });

assert.deepEqual(run([extent(0x1000n, 0xa000n)], []), [extent(0x1000n, 0xa000n)]);
assert.deepEqual(run([extent(0x1000n, 0xa000n)], [{ base: 0x4000n, length: 0x2000n }]), [
  extent(0x1000n, 0x4000n), extent(0x6000n, 0xa000n),
]);
assert.deepEqual(run([extent(0x1000n, 0xa000n)], [{ base: 0x1000n, length: 0x2000n }]), [
  extent(0x3000n, 0xa000n),
]);
assert.deepEqual(run([extent(0x1000n, 0xa000n)], [{ base: 0x8000n, length: 0x2000n }]), [
  extent(0x1000n, 0x8000n),
]);
assert.deepEqual(run([extent(0x1000n, 0xa000n)], [{ base: 0x2000n, length: 0x8000n }]), []);
assert.deepEqual(run([extent(0x1000n, 0xa000n)], [
  { base: 0x3001n, length: 0x0fffn },
  { base: 0x4000n, length: 0x1000n },
]), [extent(0x1000n, 0x3000n), extent(0x5000n, 0xa000n)]);
assert.deepEqual(run([extent(0x1_0000_0000n, 0x1_0000_a000n)], [
  { base: 0x1_0000_4000n, length: 0x1000n },
]), [extent(0x1_0000_0000n, 0x1_0000_4000n), extent(0x1_0000_5000n, 0x1_0000_a000n)]);
assert.deepEqual(run([
  extent(0x1000n, 0x3000n), extent(0x5000n, 0x8000n),
], [{ base: 0x2000n, length: 0x4000n }]), [
  extent(0x1000n, 0x2000n), extent(0x6000n, 0x8000n),
]);
assert.throws(() => run([extent(0x3000n, 0x5000n), extent(0x1000n, 0x2000n)], []), /terurut/);
assert.throws(() => run([extent(0x1001n, 0x5000n)], []), /sejajar/);
assert.throws(() => run([extent(0x1000n, 0x5000n)], [{ base: 0xffff_ffff_ffff_f000n, length: 0x2000n }]), /uint64/);
assert.throws(() => run([extent(0x1000n, 0x9000n)], [{ base: 0x3000n, length: 0x1000n }], 1), /Kapasitas/);
assert.throws(() => run([extent(0x1000n, 0x2000n)], [], -1), /Kapasitas/);

console.log('Phase 81: reservation subtraction reference tests passed.');
