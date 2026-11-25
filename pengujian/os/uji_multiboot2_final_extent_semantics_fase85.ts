/** @license SPDX-License-Identifier: Apache-2.0
 * PHASE 85 — Semantic verification of reservation-subtracted physical extents.
 *
 * The reference model is checked against an independent page-by-page oracle.
 * This does not execute the native bootstrap output table or initialize Ring 0 PMM.
 */
import assert from 'node:assert/strict';
import {
  subtractNormalizedPhysicalReservations,
  type PhysicalMemoryReservation,
  type UsablePhysicalMemoryExtent,
} from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

const PAGE = 0x1000n;
const extent = (base: bigint, end: bigint): UsablePhysicalMemoryExtent => ({
  base, length: end - base, endExclusive: end,
});
const run = (
  candidates: UsablePhysicalMemoryExtent[],
  reservations: PhysicalMemoryReservation[],
  maxOutputExtents = 320,
) => subtractNormalizedPhysicalReservations(candidates, reservations, {
  pageSize: PAGE,
  maxOutputExtents,
});
const roundDown = (n: bigint) => (n / PAGE) * PAGE;
const roundUp = (n: bigint) => ((n + PAGE - 1n) / PAGE) * PAGE;

// Independent oracle: represent each complete 4 KiB page as available/blocked.
function oracle(
  candidates: UsablePhysicalMemoryExtent[],
  reservations: PhysicalMemoryReservation[],
): string[] {
  const free = new Set<string>();
  for (const c of candidates) {
    for (let p = c.base; p < c.endExclusive; p += PAGE) free.add(p.toString());
  }
  for (const r of reservations) {
    const start = roundDown(r.base);
    const end = roundUp(r.base + r.length);
    for (let p = start; p < end; p += PAGE) free.delete(p.toString());
  }
  return [...free].map(BigInt).sort((a, b) => a < b ? -1 : a > b ? 1 : 0).map(String);
}
function expand(extents: UsablePhysicalMemoryExtent[]): string[] {
  const pages: string[] = [];
  for (const e of extents) {
    assert.ok(e.base < e.endExclusive, 'extent must be non-empty');
    assert.equal(e.base % PAGE, 0n, 'extent start must be page aligned');
    assert.equal(e.endExclusive % PAGE, 0n, 'extent end must be page aligned');
    assert.equal(e.length, e.endExclusive - e.base, 'length must match end-exclusive');
    for (let p = e.base; p < e.endExclusive; p += PAGE) pages.push(p.toString());
  }
  for (let i = 1; i < extents.length; i++) {
    assert.ok(extents[i - 1].endExclusive <= extents[i].base, 'output must be sorted and non-overlapping');
  }
  return pages;
}

// Explicit boundaries: before, inside, after, spanning, adjacent, overlapping,
// unsorted exclusions, and a reservation that touches a candidate boundary.
const base = 0x1000n;
const candidates = [extent(base, 0x11000n), extent(0x14000n, 0x1c000n)];
const reservations: PhysicalMemoryReservation[] = [
  { base: 0x17001n, length: 0x1fffn },
  { base: 0x3000n, length: 0x1000n },
  { base: 0x6000n, length: 0x3000n },
  { base: 0x1000n, length: 0x1000n },
  { base: 0x1b000n, length: 0x1000n },
  { base: 0x0fffn, length: 1n },
];
assert.deepEqual(expand(run(candidates, reservations)), oracle(candidates, reservations));

// Deterministic property matrix. Candidate extents are sparse and sorted;
// reservations are intentionally shuffled, overlapping, and sometimes unaligned.
let seed = 0x85f1a5;
const random = (max: number) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % max;
};
for (let sample = 0; sample < 240; sample++) {
  const candidateList: UsablePhysicalMemoryExtent[] = [];
  let cursorPage = 1;
  const candidateCount = 1 + random(8);
  for (let i = 0; i < candidateCount; i++) {
    cursorPage += random(4);
    const lengthPages = 1 + random(12);
    const start = BigInt(cursorPage) * PAGE;
    const end = BigInt(cursorPage + lengthPages) * PAGE;
    candidateList.push(extent(start, end));
    cursorPage += lengthPages;
  }
  const exclusionList: PhysicalMemoryReservation[] = [];
  const exclusionCount = random(18);
  for (let i = 0; i < exclusionCount; i++) {
    const startByte = BigInt(random(Math.max(2, cursorPage * 0x1000))) + 1n;
    const lengthByte = BigInt(1 + random(0x5000));
    exclusionList.push({ base: startByte, length: lengthByte });
  }
  // Reverse order to ensure subtraction does not depend on input reservation order.
  exclusionList.reverse();
  const actual = run(candidateList, exclusionList);
  assert.deepEqual(
    expand(actual),
    oracle(candidateList, exclusionList),
    `page-by-page oracle mismatch in deterministic sample #${sample}`,
  );
}

// Worst-case bound: 160 separate candidates, each split into two fragments by
// one reservation. The mathematically required output is exactly 320 records.
const fragmentedCandidates: UsablePhysicalMemoryExtent[] = [];
const fragmentedReservations: PhysicalMemoryReservation[] = [];
for (let i = 0; i < 160; i++) {
  const start = BigInt(i * 4 + 1) * PAGE;
  fragmentedCandidates.push(extent(start, start + 3n * PAGE));
  fragmentedReservations.push({ base: start + PAGE, length: PAGE });
}
const maxOutput = run(fragmentedCandidates, fragmentedReservations, 320);
assert.equal(maxOutput.length, 320, '160 candidates split once must produce 320 extents');
assert.equal(expand(maxOutput).length, 320, 'all 320 fragments must be preserved');
assert.throws(
  () => run(fragmentedCandidates, fragmentedReservations, 319),
  /Kapasitas/,
  'capacity 319 must reject the 320-record result',
);

// uint64 upper boundary: [2^64 - 4 KiB, 2^64) is a valid extent.
const uint64Limit = 1n << 64n;
const topPage = uint64Limit - PAGE;
assert.deepEqual(run([extent(topPage, uint64Limit)], []), [extent(topPage, uint64Limit)]);
assert.deepEqual(
  run([extent(topPage, uint64Limit)], [{ base: topPage, length: PAGE }]),
  [],
);
assert.throws(
  () => run([extent(topPage, uint64Limit)], [{ base: uint64Limit - 1n, length: 2n }]),
  /uint64/,
);

assert.deepEqual(run([], []), []);
assert.deepEqual(run([extent(0x1000n, 0x2000n)], [{ base: 0x1000n, length: PAGE }]), []);
console.log('Phase 85: final extent semantics, 240 oracle samples, capacity boundary, and uint64 edge tests passed.');
