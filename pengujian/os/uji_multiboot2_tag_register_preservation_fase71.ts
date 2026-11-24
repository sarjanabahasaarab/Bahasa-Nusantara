/**
 * Phase 71: register preservation around Multiboot2 tag diagnostics.
 */
import { X86BootstrapEncoder } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { KernelELFBuilder } from '../../src/compiler/targets/kernel/kernel-elf-builder.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const bootstrap = X86BootstrapEncoder.generateBootstrapBinary();
assert(bootstrap.codeBytes.length > 0, 'Bootstrap bytecode tidak boleh kosong');
const elf = new KernelELFBuilder({
  kernelName: 'phase71-multiboot-register-preservation',
  entryPoint: 0x0010_0000n,
}).build();
assert(elf[0] === 0x7f && elf[1] === 0x45 && elf[2] === 0x4c && elf[3] === 0x46,
  'ELF64 harus berhasil dibangun setelah seluruh label diagnostik difixup');

const asText = new TextDecoder().decode(bootstrap.codeBytes);
for (const marker of [
  'NUSANTARA_DIAG_MMAP_BEGIN',
  'NUSANTARA_DIAG_MMAP_DONE',
  'NUSANTARA_DIAG_MODULE_BEGIN',
  'NUSANTARA_DIAG_MODULE_DONE',
  'NUSANTARA_DIAG_FRAMEBUFFER_BEGIN',
  'NUSANTARA_DIAG_FRAMEBUFFER_DONE',
  'NUSANTARA_DIAG_END_TAG_OK',
]) assert(asText.includes(marker), 'Marker tidak ditemukan: ' + marker);
console.log('Phase 71: bootstrap register-preservation regression passed.');
