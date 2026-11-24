/**
 * Phase 74: bootstrap diagnostic/parser scratch words must remain inside the
 * kernel-state physical reservation and must not overlap one another.
 *
 * This protects the fixed low-memory ABI used by the 32-bit Multiboot2
 * bootstrap. It does not claim that these words are a native PMM structure.
 */
import assert from 'node:assert/strict';
import { X86_BOOTSTRAP_STATE_LAYOUT } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';

const stateReservation = BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.find(
  (reservation) => reservation.reason?.includes('kernel state, TSS, IDT and IDTR') ?? false,
);
assert.ok(stateReservation, 'Kernel state physical reservation must exist');

const slots: Array<{ name: string; address: number }> = Object.entries(X86_BOOTSTRAP_STATE_LAYOUT)
  .map(([name, address]) => ({ name, address: Number(address) }))
  .sort((left, right) => left.address - right.address);

assert.equal(slots.length, 9, 'All six counters and three Multiboot2 cursor slots must be declared');

for (const slot of slots) {
  assert.equal(slot.address % 4, 0, `${slot.name} must be dword aligned`);
  assert.ok(slot.address >= Number(stateReservation.base),
    `${slot.name} must start inside the kernel-state reservation`);
  assert.ok(slot.address + 4 <= Number(stateReservation.base + stateReservation.length),
    `${slot.name} must end inside the kernel-state reservation`);
}

for (let index = 1; index < slots.length; index++) {
  assert.ok(
    slots[index - 1].address + 4 <= slots[index].address,
    `${slots[index - 1].name} must not overlap ${slots[index].name}`,
  );
}

assert.equal(slots[0].address, 0x0021_8040,
  'Bootstrap state ABI must retain its established first diagnostic offset');
assert.equal(slots.at(-1)!.address + 4, 0x0021_8064,
  'Bootstrap state ABI end must remain explicit and bounded');

console.log('Phase 74: bootstrap state layout reservation and overlap audit passed.');
