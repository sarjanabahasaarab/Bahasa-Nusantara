/**
 * Phase 75: native bootstrap captures bounded raw Multiboot2 type-1 descriptors.
 * This verifies emitted x86 bytecode contracts; QEMU serial markers remain the
 * runtime proof that the bootstrap parser actually traverses the map.
 */
import assert from 'node:assert/strict';
import { X86BootstrapEncoder, X86_BOOTSTRAP_USABLE_DESCRIPTOR_CAPACITY,
  X86_BOOTSTRAP_USABLE_DESCRIPTOR_COUNT_ADDRESS,
  X86_BOOTSTRAP_USABLE_DESCRIPTOR_SIZE,
  X86_BOOTSTRAP_USABLE_DESCRIPTOR_TABLE_BASE,
} from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { KernelELFBuilder } from '../../src/compiler/targets/kernel/kernel-elf-builder.js';

assert.equal(X86_BOOTSTRAP_USABLE_DESCRIPTOR_CAPACITY, 160);
assert.equal(X86_BOOTSTRAP_USABLE_DESCRIPTOR_SIZE, 24);
assert.equal(X86_BOOTSTRAP_USABLE_DESCRIPTOR_TABLE_BASE, 0x0021_8100);
assert.equal(
  X86_BOOTSTRAP_USABLE_DESCRIPTOR_TABLE_BASE +
    X86_BOOTSTRAP_USABLE_DESCRIPTOR_CAPACITY * X86_BOOTSTRAP_USABLE_DESCRIPTOR_SIZE,
  0x0021_9000,
  'Descriptor catalog must end exactly before the TSS reservation',
);
assert.equal(X86_BOOTSTRAP_USABLE_DESCRIPTOR_COUNT_ADDRESS, 0x0021_8064);

const bootstrap = X86BootstrapEncoder.generateBootstrapBinary();
const bytes = Array.from(bootstrap.codeBytes);
const contains = (needle: number[]) => bytes.some((_, i) =>
  needle.every((value, j) => bytes[i + j] === value)
);

assert.ok(contains([0xc7, 0x05, 0x64, 0x80, 0x21, 0x00, 0x00, 0x00, 0x00, 0x00]),
  'Native descriptor catalog count must be initialized to zero');
assert.ok(contains([0xa1, 0x64, 0x80, 0x21, 0x00]),
  'Native parser must load descriptor count before append');
assert.ok(contains([0x3d, 0xa0, 0x00, 0x00, 0x00]),
  'Native parser must reject descriptor catalog overflow at 160 entries');
assert.ok(contains([0x6b, 0xc0, 0x18]),
  'Native parser must compute 24-byte descriptor slot offsets');
assert.ok(contains([0x05, 0x00, 0x81, 0x21, 0x00]),
  'Native parser must address the reserved descriptor table');
assert.ok(contains([0xff, 0x05, 0x64, 0x80, 0x21, 0x00]),
  'Native parser must increment the descriptor count after storing a record');

for (const copyPair of [
  [0x8b, 0x06, 0x89, 0x07],
  [0x8b, 0x46, 0x04, 0x89, 0x47, 0x04],
  [0x8b, 0x46, 0x08, 0x89, 0x47, 0x08],
  [0x8b, 0x46, 0x0c, 0x89, 0x47, 0x0c],
  [0x8b, 0x46, 0x10, 0x89, 0x47, 0x10],
  [0x8b, 0x46, 0x14, 0x89, 0x47, 0x14],
]) {
  assert.ok(contains(copyPair), 'Semua enam dword descriptor 24-byte harus disalin');
}

const elf = new KernelELFBuilder({
  kernelName: 'phase75-native-usable-descriptor-catalog',
  entryPoint: 0x0010_0000n,
}).build();
assert.deepEqual(Array.from(elf.slice(0, 4)), [0x7f, 0x45, 0x4c, 0x46],
  'Kernel ELF64 harus tetap dapat dibangun setelah penambahan catalog native');

console.log('Phase 75: native Multiboot2 usable-descriptor catalog contract passed.');
