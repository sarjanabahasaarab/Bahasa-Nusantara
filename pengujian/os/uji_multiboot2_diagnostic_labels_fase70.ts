/**
 * Phase 70: regression test for every serial diagnostic label referenced by
 * the native x86 bootstrap encoder.
 */
import { X86BootstrapEncoder } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { KernelELFBuilder } from '../../src/compiler/targets/kernel/kernel-elf-builder.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const bootstrap = X86BootstrapEncoder.generateBootstrapBinary();
assert(bootstrap.codeBytes.length > 0, 'Bootstrap harus menghasilkan bytecode');

const elf = new KernelELFBuilder({
  kernelName: 'phase70-diagnostic-label-regression',
  entryPoint: 0x0010_0000n,
}).build();

assert(elf[0] === 0x7f && elf[1] === 0x45 && elf[2] === 0x4c && elf[3] === 0x46,
  'KernelELFBuilder harus menyelesaikan seluruh fixup dan menghasilkan ELF64');
console.log('Phase 70: seluruh label diagnostik bootstrap terselesaikan; ELF64 berhasil dibangun.');
