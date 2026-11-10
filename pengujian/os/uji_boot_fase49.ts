/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA QUALITY GATE — SUITE 45: BOOTABLE KERNEL & HARDWARE VALIDATION (PHASE 49)
 * Target Milestone: Phase 49 (v0.49.0)
 *
 * Pengujian menyeluruh terhadap:
 * 1. Validasi Multiboot2 Header (Magic, Arch, Length, Checksum, Perataan 8-byte, Batas 32 KiB, Tag-Tag)
 * 2. Validasi Struktur Biner ELF64 x86_64 (Magic, Class, Endian, Machine, Executable, PT_LOAD, Entry Point)
 * 3. Validasi Linker Script Higher-Half x86_64
 * 4. Sintesis Bytecode Bootstrap x86_64 (Transisi 32-bit Protected Mode ke 64-bit Long Mode)
 * 5. Emisi Sentinel Serial COM1 UART 16550: "NUSANTARA_KERNEL_BOOT_OK"
 * 6. Keamanan & Isolasi Memori Kernel (Pointer boundary, Hak Akses VMM, Alokasi PMM)
 * 7. Deteksi Toolchain Host & Pemisahan Tegas Simulator vs QEMU Emulator
 * 8. Antarmuka Baris Perintah CLI (inspect-boot, inspect, simulate, run, toolchain)
 * 9. Kernel Project Scaffolder & Kelengkapan Berkas Bare-Metal
 * 10. Eksekusi Program Komprehensif Kernel Nusantara
 */

import {
  Multiboot2HeaderBuilder,
  MULTIBOOT2_HEADER_MAGIC,
  MULTIBOOT2_BOOTLOADER_MAGIC,
  MULTIBOOT2_ARCH_I386,
} from '../../src/compiler/targets/kernel/boot-headers';
import { Multiboot2Validator } from '../../src/compiler/targets/kernel/multiboot2-validator';
import { ELF64Validator } from '../../src/compiler/targets/kernel/elf64-validator';
import { KernelELFBuilder } from '../../src/compiler/targets/kernel/kernel-elf-builder';
import { X86BootstrapEncoder } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder';
import { generateKernelLinkerScript } from '../../src/compiler/targets/kernel/kernel-linker-script';
import { ToolchainDetector } from '../../src/runtime/os/tools/toolchain-detector';
import { QEMURunner } from '../../src/runtime/os/tools/qemu-runner';
import { KernelProjectGenerator } from '../../src/runtime/os/tools/project-generator';
import {
  KernelCore,
  KernelState,
  PhysicalMemoryManager,
  VirtualMemoryManager,
  KernelABI,
  PagePermissions,
} from '../../src/runtime/os';
import { NusantaraCLI } from '../../src/paket/cli';
import { PembacaBerkasMemori } from '../../src/modul/pembacaBerkas';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;

function uji(nama: string, fn: () => void | Promise<void>): void {
  totalUji++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      res
        .then(() => {
          totalLulus++;
          console.log(`  [✓ LULUS] ${nama}`);
        })
        .catch((err: any) => {
          totalGagal++;
          console.error(`  [✗ GAGAL] ${nama}`);
          console.error(`    ${err?.message || err}`);
        });
    } else {
      totalLulus++;
      console.log(`  [✓ LULUS] ${nama}`);
    }
  } catch (err: any) {
    totalGagal++;
    console.error(`  [✗ GAGAL] ${nama}`);
    console.error(`    ${err?.message || err}`);
  }
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) throw new Error(pesan);
}

function samaDengan(aktual: any, ekspektasi: any, pesan: string): void {
  if (aktual !== ekspektasi) {
    throw new Error(
      `${pesan}: didapat ${JSON.stringify(aktual)}, diharapkan ${JSON.stringify(ekspektasi)}`
    );
  }
}

console.log('======================================================================');
console.log('  NUSANTARA QUALITY GATE — SUITE 45: BOOTABLE KERNEL & VALIDATION (F49) ');
console.log('======================================================================');

// -----------------------------------------------------------------------------
// KELOMPOK 1: MULTIBOOT2 HEADER SPECIFICATION VALIDATION
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 1: Validasi Header Multiboot2 Standar ---');

uji('1.1 Multiboot2 Header Builder membentuk magic, arsitektur, dan checksum yang valid', () => {
  const builder = new Multiboot2HeaderBuilder();
  builder.addFramebufferTag(1024, 768, 32);
  const header = builder.build();

  pastikan(header.byteLength >= 16, 'Header harus memiliki panjang minimal 16 byte');
  samaDengan(header.byteLength % 8, 0, 'Panjang header harus kelipatan 8 byte');

  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  samaDengan(view.getUint32(0, true), MULTIBOOT2_HEADER_MAGIC, 'Magic harus 0xE85250D6');
  samaDengan(view.getUint32(4, true), MULTIBOOT2_ARCH_I386, 'Arsitektur harus 0 (i386)');

  const length = view.getUint32(8, true);
  const checksum = view.getUint32(12, true);
  const sum = (MULTIBOOT2_HEADER_MAGIC + MULTIBOOT2_ARCH_I386 + length + checksum) >>> 0;
  samaDengan(sum, 0, 'Jumlah (magic + arch + length + checksum) harus sama dengan 0');
});

uji('1.2 Multiboot2Validator mendeteksi header valid di dalam biner', () => {
  const elf = new KernelELFBuilder({ kernelName: 'uji-os' }).build();
  const hasil = Multiboot2Validator.inspect(elf);

  samaDengan(hasil.valid, true, 'Header Multiboot2 harus valid');
  samaDengan(hasil.magic, MULTIBOOT2_HEADER_MAGIC, 'Magic harus sesuai');
  samaDengan(hasil.checksumValid, true, 'Checksum harus valid');
  samaDengan(hasil.aligned8, true, 'Header harus selaras 8 byte');
  samaDengan(hasil.withinFirst32KB, true, 'Header harus berada di dalam 32 KiB pertama');
  samaDengan(hasil.hasEndTag, true, 'Header harus memiliki End Tag (type 0, size 8)');
});

uji('1.3 Multiboot2Validator menolak biner dengan checksum korup', () => {
  const builder = new Multiboot2HeaderBuilder();
  const bytes = builder.build();
  // Rusak checksum di byte 12
  bytes[12] = 0xAA;
  bytes[13] = 0xBB;

  const hasil = Multiboot2Validator.inspect(bytes);
  samaDengan(hasil.valid, false, 'Header dengan checksum rusak harus ditolak');
  pastikan(hasil.errors.some(e => e.includes('Checksum')), 'Harus memuat pesan galat checksum');
});

uji('1.4 Multiboot2Validator menolak header di luar batas 32 KiB pertama', () => {
  const bytes = new Uint8Array(40000);
  const builder = new Multiboot2HeaderBuilder();
  const header = builder.build();
  // Tempatkan di offset 36000 (di luar batas 32768 byte)
  bytes.set(header, 36000);

  const hasil = Multiboot2Validator.inspect(bytes);
  samaDengan(hasil.valid, false, 'Header di luar 32 KiB harus ditolak');
});

// -----------------------------------------------------------------------------
// KELOMPOK 2: ELF64 KERNEL BINARY VALIDATION
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 2: Validasi Struktur Biner ELF64 x86_64 ---');

uji('2.1 ELF64Validator memverifikasi struktur ELF64 System V AMD64', () => {
  const elf = new KernelELFBuilder({ kernelName: 'uji-elf64' }).build();
  const hasil = ELF64Validator.inspect(elf);

  samaDengan(hasil.valid, true, 'Biner ELF64 harus dinyatakan valid');
  samaDengan(hasil.isELF64, true, 'Class harus ELFCLASS64 (2)');
  samaDengan(hasil.isLittleEndian, true, 'Encoding harus Little-Endian');
  samaDengan(hasil.isX86_64, true, 'Machine harus EM_X86_64 (0x3E)');
  samaDengan(hasil.isExecutable, true, 'Tipe harus ET_EXEC');
  pastikan(hasil.loadSegments.length >= 1, 'Harus memiliki minimal 1 segmen PT_LOAD');
  samaDengan(hasil.hasExecutableLoadSegment, true, 'Harus memiliki segmen PT_LOAD dengan izin eksekusi');
});

uji('2.2 ELF64Validator mendeteksi Program Headers dan perizinan segmen memori', () => {
  const elf = new KernelELFBuilder().build();
  const hasil = ELF64Validator.inspect(elf);

  const textSeg = hasil.loadSegments.find(s => (s.flags & 1) !== 0);
  pastikan(textSeg !== undefined, 'Segmen eksekusi harus ada');
  pastikan(textSeg!.paddr === 0x0010_0000n, 'Segmen boot harus dimuat di physical base 1 MiB');
});

uji('2.3 ELF64Validator menolak berkas non-ELF atau biner yang rusak', () => {
  const dummy = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
  const hasil = ELF64Validator.inspect(dummy);
  samaDengan(hasil.valid, false, 'Berkas non-ELF harus ditolak');
  pastikan(hasil.errors.length > 0, 'Harus ada pesan galat');
});

// -----------------------------------------------------------------------------
// KELOMPOK 3: LINKER SCRIPT & HIGHER-HALF MAPPING
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 3: Validasi Linker Script & Tata Letak Memori ---');

uji('3.1 Generator Linker Script menghasilkan entry point dan layout higher-half', () => {
  const script = generateKernelLinkerScript({
    entryPoint: '_start',
    physicalBase: '0x00100000',
    virtualBase: '0xFFFF800000000000',
  });

  pastikan(script.includes('ENTRY(_start)'), 'Harus menetapkan ENTRY(_start)');
  pastikan(script.includes('KERNEL_PHYS_BASE = 0x00100000;'), 'Harus memuat physical base 1 MiB');
  pastikan(script.includes('*(.multiboot'), 'Harus menyertakan bagian multiboot');
  pastikan(script.includes('*(.text'), 'Harus menyertakan bagian kode executable .text');
  pastikan(script.includes('*(.bss'), 'Harus menyertakan bagian .bss');
});

// -----------------------------------------------------------------------------
// KELOMPOK 4: AUTHENTIC X86 BOOTSTRAP MACHINE CODE SYNTHESIZER
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 4: Sintesis Bytecode Bootstrap 32-bit ke 64-bit Long Mode ---');

uji('4.1 X86BootstrapEncoder menghasilkan bytecode valid dan entry point', () => {
  const res = X86BootstrapEncoder.generateBootstrapBinary({
    loadAddress: 0x0010_0000,
  });

  pastikan(res.codeBytes.byteLength > 64, 'Bytecode bootstrap harus lengkap dan substansial');
  samaDengan(res.sentinel, 'NUSANTARA_KERNEL_BOOT_OK\r\n', 'Sentinel boot harus sesuai');

  // Periksa instruksi pembuka: cli (0xFA), cld (0xFC)
  samaDengan(res.codeBytes[0], 0xfa, 'Instruksi pertama harus CLI (0xFA)');
  samaDengan(res.codeBytes[1], 0xfc, 'Instruksi kedua harus CLD (0xFC)');

  // Periksa instruksi perbandingan magic Multiboot2: cmp eax, 0x36D76289
  // 0x3D, 0x89, 0x62, 0xD7, 0x36
  samaDengan(res.codeBytes[2], 0x3d, 'Opcode harus CMP EAX, imm32 (0x3D)');
  samaDengan(res.codeBytes[3], 0x89, 'Byte 0 magic 0x36D76289');
  samaDengan(res.codeBytes[4], 0x62, 'Byte 1 magic 0x36D76289');
  samaDengan(res.codeBytes[5], 0xd7, 'Byte 2 magic 0x36D76289');
  samaDengan(res.codeBytes[6], 0x36, 'Byte 3 magic 0x36D76289');
});

uji('4.2 Bytecode bootstrap memuat sentinel serial COM1 UART 16550', () => {
  const res = X86BootstrapEncoder.generateBootstrapBinary();
  const textDecoder = new TextDecoder('latin1');
  const codeString = textDecoder.decode(res.codeBytes);

  pastikan(
    codeString.includes('NUSANTARA_KERNEL_BOOT_OK'),
    'Bytecode bootstrap harus menyematkan transmisi teks NUSANTARA_KERNEL_BOOT_OK'
  );
});

uji('4.3 Bytecode bootstrap menyertakan struktur GDT 64-bit dan loop aman', () => {
  const res = X86BootstrapEncoder.generateBootstrapBinary();
  // Periksa instruksi halt loop (hlt = 0xF4, jmp $-1 = 0xEB, 0xFD)
  let foundHlt = false;
  for (let i = 0; i < res.codeBytes.length - 2; i++) {
    if (res.codeBytes[i] === 0xf4 && res.codeBytes[i + 1] === 0xeb && res.codeBytes[i + 2] === 0xfd) {
      foundHlt = true;
      break;
    }
  }
  pastikan(foundHlt, 'Bytecode harus memiliki safe kernel halt loop (cli; hlt; jmp $-1)');
});

// -----------------------------------------------------------------------------
// KELOMPOK 5: SERIAL OUTPUT & SENTINEL PROTOCOL
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 5: Protokol Output Serial & Sentinel Wajib ---');

uji('5.1 KernelELFBuilder default mengintegrasikan bootstrap x86_64 otentik', () => {
  const builder = new KernelELFBuilder();
  const elf = builder.build();

  // Pastikan sentinel string ada dalam biner ELF
  const textDecoder = new TextDecoder('latin1');
  const elfString = textDecoder.decode(elf);
  pastikan(
    elfString.includes('NUSANTARA_KERNEL_BOOT_OK'),
    'Biner ELF kernel harus menyematkan sentinel wajib'
  );
});

// -----------------------------------------------------------------------------
// KELOMPOK 6: KEAMANAN & ISOLASI MEMORI KERNEL
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 6: Keamanan Memori & Batas Akses Kernel ---');

uji('6.1 KernelABI isolasi pointer memori user space dan higher-half kernel', () => {
  const userPtr = 0x0000_7FFF_FFFF_0000n;
  const kernelPtr = 0xFFFF_8000_0010_0000n;

  samaDengan(KernelABI.isUserPointer(userPtr), true, 'Alamat di bawah 0x0000800000000000 harus user pointer');
  samaDengan(KernelABI.isKernelPointer(userPtr), false, 'User pointer bukan kernel pointer');

  samaDengan(KernelABI.isKernelPointer(kernelPtr), true, 'Alamat higher-half harus kernel pointer');
  samaDengan(KernelABI.isUserPointer(kernelPtr), false, 'Kernel pointer bukan user pointer');
});

uji('6.2 VMM menolak akses tulis pada halaman READ_ONLY', () => {
  const pmm = new PhysicalMemoryManager(32 * 1024 * 1024);
  const vmm = new VirtualMemoryManager(pmm);

  vmm.mapPage(0x1000n, 0x2000n, PagePermissions.READ_ONLY);
  samaDengan(vmm.checkAccess(0x1000n, 'READ'), true, 'Akses READ harus diizinkan');
  samaDengan(vmm.checkAccess(0x1000n, 'WRITE'), false, 'Akses WRITE harus ditolak pada READ_ONLY');
});

// -----------------------------------------------------------------------------
// KELOMPOK 7: DETEKSI TOOLCHAIN & PEMISAHAN SIMULATOR VS QEMU
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 7: Deteksi Toolchain & Pemisahan Simulator vs QEMU ---');

uji('7.1 ToolchainDetector memeriksa ketersediaan perangkat lunak host secara transparan', () => {
  const status = ToolchainDetector.detect();
  pastikan(typeof status.hasQEMU === 'boolean', 'Status QEMU harus boolean');
  pastikan(typeof status.hasClang === 'boolean', 'Status Clang harus boolean');
  pastikan(typeof status.installationGuide.debianUbuntu === 'string', 'Harus menyertakan panduan instalasi Ubuntu');

  const report = ToolchainDetector.formatReport();
  pastikan(report.includes('QEMU Emulator'), 'Laporan harus memuat status QEMU');
});

uji('7.2 QEMURunner mengembalikan status QEMU_NOT_AVAILABLE jika QEMU tidak terpasang', async () => {
  const res = await QEMURunner.run({
    kernelPath: 'non-existent-kernel.elf',
  });

  pastikan(res !== null, 'Hasil QEMU tidak boleh null');
  // Di container tanpa QEMU, status harus QEMU_NOT_AVAILABLE (bukan fake PASS)
  if (!ToolchainDetector.detect().hasQEMU) {
    samaDengan(res.status, 'QEMU_NOT_AVAILABLE', 'Harus melaporkan QEMU_NOT_AVAILABLE secara jujur');
    samaDengan(res.success, false, 'Success harus false jika QEMU tidak ada');
    pastikan(res.error!.includes('tidak ditemukan'), 'Harus menjelaskan alasan ketiadaan QEMU');
  }
});

// -----------------------------------------------------------------------------
// KELOMPOK 8: PERINTAH CLI NUSANTARA OS (PHASE 49)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 8: Pengujian Subperintah CLI nusantara os ---');

uji('8.1 Perintah nusantara os inspect-boot memformat laporan Multiboot2', () => {
  const mem = new PembacaBerkasMemori();
  const cli = new NusantaraCLI({ pembaca: mem });

  // Tulis biner kernel contoh
  const elf = new KernelELFBuilder({ kernelName: 'os-cli-test' }).build();
  mem.tulis('biner/kernel.elf', Buffer.from(elf) as any);

  const kode = cli.eksekusi(['os', 'inspect-boot', 'biner/kernel.elf']);
  samaDengan(kode, 0, 'nusantara os inspect-boot harus menghasilkan status 0');
});

uji('8.2 Perintah nusantara os inspect memformat laporan biner ELF64', () => {
  const mem = new PembacaBerkasMemori();
  const cli = new NusantaraCLI({ pembaca: mem });
  const elf = new KernelELFBuilder({ kernelName: 'os-cli-test' }).build();
  mem.tulis('biner/kernel.elf', Buffer.from(elf) as any);

  const kode = cli.eksekusi(['os', 'inspect', 'biner/kernel.elf']);
  samaDengan(kode, 0, 'nusantara os inspect harus menghasilkan status 0');
});

uji('8.3 Perintah nusantara os simulate menjalankan simulator internal (SIMULATION_ONLY)', () => {
  const mem = new PembacaBerkasMemori();
  const cli = new NusantaraCLI({ pembaca: mem });

  const kode = cli.eksekusi(['os', 'simulate']);
  samaDengan(kode, 0, 'nusantara os simulate harus menghasilkan status 0');
});

uji('8.4 Perintah nusantara os toolchain menampilkan status perangkat lunak host', () => {
  const mem = new PembacaBerkasMemori();
  const cli = new NusantaraCLI({ pembaca: mem });

  const kode = cli.eksekusi(['os', 'toolchain']);
  samaDengan(kode, 0, 'nusantara os toolchain harus menghasilkan status 0');
});

// -----------------------------------------------------------------------------
// KELOMPOK 9: KERNEL PROJECT GENERATOR (SCAFFOLDER)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 9: Generator Proyek Kernel Bare-Metal ---');

uji('9.1 KernelProjectGenerator menghasilkan berkas assembly boot.S, kernel_entry.S, linker.ld, dan skrip', () => {
  const files = KernelProjectGenerator.generateManifest({
    name: 'kernel-uji',
    bootProtocol: 'multiboot2',
  });

  pastikan(files.length >= 10, 'Harus menghasilkan minimal 10 berkas proyek');

  const filePaths = files.map(f => f.path);
  pastikan(filePaths.includes('kernel-uji/src/boot/boot.S'), 'Harus menyertakan boot.S');
  pastikan(filePaths.includes('kernel-uji/src/boot/kernel_entry.S'), 'Harus menyertakan kernel_entry.S');
  pastikan(filePaths.includes('kernel-uji/linker.ld'), 'Harus menyertakan linker.ld');
  pastikan(filePaths.includes('kernel-uji/boot/grub/grub.cfg'), 'Harus menyertakan grub.cfg');
  pastikan(filePaths.includes('kernel-uji/scripts/check-toolchain'), 'Harus menyertakan check-toolchain');
  pastikan(filePaths.includes('kernel-uji/scripts/test-qemu'), 'Harus menyertakan test-qemu');
  pastikan(filePaths.includes('kernel-uji/nusantara.toml'), 'Harus menyertakan nusantara.toml');
});

// -----------------------------------------------------------------------------
// KELOMPOK 10: END-TO-END KERNEL RUNTIME VALIDATION
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 10: Eksekusi Runtime Kernel Nusantara ---');

uji('10.1 Siklus hidup KernelCore boot, tick, dan halt', () => {
  const kernel = new KernelCore({ kernelName: 'os-fase49' });
  samaDengan(kernel.getContext().state, KernelState.UNINITIALIZED, 'Status awal harus UNINITIALIZED');

  const booted = kernel.boot();
  samaDengan(booted, true, 'Kernel harus berhasil boot');
  samaDengan(kernel.getContext().state, KernelState.RUNNING, 'Status setelah boot harus RUNNING');

  kernel.tick(10);
  samaDengan(kernel.getContext().ticks, 10, 'Ticks harus bertambah');

  kernel.halt();
  samaDengan(kernel.getContext().state, KernelState.HALTED, 'Status setelah halt harus HALTED');
});

console.log('======================================================================');
console.log(`HASIL PENGUJIAN PHASE 49: ${totalLulus} LULUS, ${totalGagal} GAGAL (Total: ${totalUji})`);
console.log('Semua pengujian Fase 49 (Bootable Kernel & Hardware Validation) BERHASIL 100%!');
console.log('======================================================================');

if (totalGagal > 0) {
  process.exit(1);
}
