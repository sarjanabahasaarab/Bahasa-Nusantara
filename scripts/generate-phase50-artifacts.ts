/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Phase 50 Artifact Generator & Hardware Validation Builder
 * Membangun biner otentik kernel.elf, user-test.elf, user-fault-test.elf,
 * dan image ISO GRUB2 Multiboot2 bootable (via grub-mkrescue + xorriso).
 *
 * ATURAN KEJUJURAN TEKNIS:
 * Skrip ini DILARANG menulis log serial QEMU palsu (serial.log / boot.log / qemu.log)
 * atau image ISO palsu tanpa El Torito boot catalog. Log serial QEMU hanya boleh berasal
 * dari eksekusi nyata qemu-system-x86_64.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { spawnSync } from 'child_process';
import { KernelELFBuilder } from '../src/compiler/targets/kernel/kernel-elf-builder';
import { UserELFBuilder } from '../src/compiler/targets/kernel/user-elf-builder';
import { Multiboot2Validator } from '../src/compiler/targets/kernel/multiboot2-validator';
import { ELF64Validator } from '../src/compiler/targets/kernel/elf64-validator';
import { ToolchainDetector } from '../src/runtime/os/tools/toolchain-detector';
import { AddressSpace } from '../src/runtime/os/memory/address-space';
import { PagePermissions } from '../src/runtime/os/memory/types';
import { UserPointerSecurity } from '../src/runtime/os/security/user-pointer';
import { ProcessFaultHandler } from '../src/runtime/os/interrupt/fault-handler';
import { SegmentSelector } from '../src/runtime/os/hal/gdt-tss';
import { ProcessManager } from '../src/runtime/os/process/manager';
import { ProcessState } from '../src/runtime/os/process/types';

function commandExists(bin: string): boolean {
  const res = spawnSync('which', [bin], { encoding: 'utf-8' });
  return res.status === 0;
}

async function generatePhase50Artifacts() {
  const artifactsDir = path.resolve('artifacts', 'phase50');
  fs.mkdirSync(artifactsDir, { recursive: true });

  // Hapus log serial lama / palsu agar tidak pernah dianggap sebagai log QEMU terbaru
  for (const staleLog of ['serial.log', 'boot.log', 'qemu.log', 'qemu-debug.log']) {
    const stalePath = path.join(artifactsDir, staleLog);
    if (fs.existsSync(stalePath)) {
      fs.unlinkSync(stalePath);
    }
  }

  console.log('======================================================================');
  console.log('  MEMBANGUN ARTEFAK KERNEL & ISO BOOTABLE NUSANTARA OS (PHASE 50)     ');
  console.log('======================================================================\n');

  // 1. Build Kernel ELF64
  console.log('[1/8] Membangun kernel.elf (ELF64 x86_64 dengan Multiboot2 & Long Mode)...');
  const kernelBytes = new KernelELFBuilder().build();
  const kernelPath = path.join(artifactsDir, 'kernel.elf');
  fs.writeFileSync(kernelPath, kernelBytes);
  console.log(`       -> Ditulis: ${kernelPath} (${kernelBytes.length} bytes)`);

  // 2. Build User Application ELF64 (user-test.elf & alias user.elf)
  console.log('[2/8] Membangun user-test.elf (Ring 3 CPL 3, syscalls, & exit)...');
  const userTestBytes = UserELFBuilder.buildUserTestProgram();
  const userTestPath = path.join(artifactsDir, 'user-test.elf');
  const userAliasPath = path.join(artifactsDir, 'user.elf');
  fs.writeFileSync(userTestPath, userTestBytes);
  fs.writeFileSync(userAliasPath, userTestBytes);
  console.log(`       -> Ditulis: ${userTestPath} (${userTestBytes.length} bytes)`);

  // 3. Build User Fault Test ELF64 (user-fault-test.elf)
  console.log('[3/8] Membangun user-fault-test.elf (Percobaan akses memori kernel dari Ring 3)...');
  const userFaultBytes = UserELFBuilder.buildUserFaultProgram();
  const userFaultPath = path.join(artifactsDir, 'user-fault-test.elf');
  fs.writeFileSync(userFaultPath, userFaultBytes);
  console.log(`       -> Ditulis: ${userFaultPath} (${userFaultBytes.length} bytes)`);

  // 4. Validasi Struktural Multiboot2 & ELF64 (+ grub-file jika tersedia)
  console.log('[4/8] Memvalidasi biner ELF64 & Multiboot2 (elf-validation.txt)...');
  const mb2Val = Multiboot2Validator.inspect(kernelBytes);
  const elfKernelVal = ELF64Validator.inspect(kernelBytes);
  const elfUserVal = ELF64Validator.inspect(userTestBytes);
  const elfFaultVal = ELF64Validator.inspect(userFaultBytes);

  if (!mb2Val.valid || !elfKernelVal.valid || !elfUserVal.valid || !elfFaultVal.valid) {
    console.error('[GALAT FATAL] Validasi struktural biner ELF64 / Multiboot2 gagal:');
    console.error({
      mb2Errors: mb2Val.errors,
      kernelErrors: elfKernelVal.errors,
      userErrors: elfUserVal.errors,
      faultErrors: elfFaultVal.errors,
    });
    process.exit(1);
  }

  let grubFileStatus = 'SKIPPED (grub-file tidak terpasang)';
  if (commandExists('grub-file')) {
    const gf = spawnSync('grub-file', ['--is-x86-multiboot2', kernelPath], { encoding: 'utf-8' });
    if (gf.status !== 0) {
      console.error(`[GALAT FATAL] grub-file --is-x86-multiboot2 gagal pada ${kernelPath}`);
      process.exit(1);
    }
    grubFileStatus = 'LULUS (grub-file --is-x86-multiboot2 exit 0)';
    console.log(`       -> ${grubFileStatus}`);
  }

  const elfReport = [
    '======================================================================',
    '               LAPORAN VALIDASI BINER ELF64 & MULTIBOOT2             ',
    '======================================================================',
    '--- 1. BINER KERNEL (kernel.elf) ---',
    `Multiboot2 Header Valid : ${mb2Val.valid ? 'YA (LULUS)' : 'TIDAK (GAGAL)'}`,
    `grub-file Check         : ${grubFileStatus}`,
    `Multiboot2 Offset       : 0x${mb2Val.headerOffset.toString(16)}`,
    `Multiboot2 Architecture : ${mb2Val.architecture === 0 ? '0 (i386 32-bit protected mode entry)' : mb2Val.architecture}`,
    `Multiboot2 Checksum     : 0x${mb2Val.checksum.toString(16)} (Checksum valid: ${mb2Val.checksumValid})`,
    `ELF64 Format Valid      : ${elfKernelVal.valid ? 'YA (LULUS)' : 'TIDAK'}`,
    `ELF64 Class / Endian    : 64-bit / Little-Endian (AMD64)`,
    `Entry Point Kernel      : 0x${elfKernelVal.entryPoint.toString(16)}`,
    `Program Headers (PT_LOAD): ${elfKernelVal.loadSegments.length} segmen`,
    ...elfKernelVal.loadSegments.map(
      (s, i) =>
        `  [${i}] off=0x${s.offset.toString(16)} vaddr=0x${s.vaddr.toString(16)} paddr=0x${s.paddr.toString(16)} filesz=${s.filesz} memsz=${s.memsz} flags=${s.flagsStr}`
    ),
    '',
    '--- 2. BINER APLIKASI USER MODE (user-test.elf) ---',
    `ELF64 Format Valid      : ${elfUserVal.valid ? 'YA (LULUS)' : 'TIDAK'}`,
    `Entry Point User Space  : 0x${elfUserVal.entryPoint.toString(16)}`,
    `Segmen Flags            : PF_R | PF_X (Readable & Executable, Non-Writable)`,
    '',
    '--- 3. BINER APLIKASI USER FAULT TEST (user-fault-test.elf) ---',
    `ELF64 Format Valid      : ${elfFaultVal.valid ? 'YA (LULUS)' : 'TIDAK'}`,
    `Entry Point User Space  : 0x${elfFaultVal.entryPoint.toString(16)}`,
    `Segmen Flags            : PF_R | PF_X`,
    '======================================================================',
  ].join('\n');
  fs.writeFileSync(path.join(artifactsDir, 'elf-validation.txt'), elfReport);

  // 5. Build Bootable GRUB2 ISO (nusantara-phase50.iso & alias nusantara-os.iso)
  console.log('[5/8] Membangun bootable ISO GRUB2 Multiboot2 (grub-mkrescue)...');
  const toolchain = ToolchainDetector.detect();
  const isoPath = path.join(artifactsDir, 'nusantara-phase50.iso');
  const isoAliasPath = path.join(artifactsDir, 'nusantara-os.iso');
  let isoBuildStatus = 'NOT_BUILT (grub-mkrescue / xorriso tidak terpasang)';

  if (toolchain.hasGRUB && toolchain.hasXorriso) {
    const tmpIsoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusantara-iso-'));
    try {
      const bootGrubDir = path.join(tmpIsoDir, 'boot', 'grub');
      fs.mkdirSync(bootGrubDir, { recursive: true });
      fs.copyFileSync(kernelPath, path.join(tmpIsoDir, 'boot', 'kernel.elf'));
      fs.copyFileSync(userTestPath, path.join(tmpIsoDir, 'boot', 'user-test.elf'));
      fs.copyFileSync(userFaultPath, path.join(tmpIsoDir, 'boot', 'user-fault-test.elf'));
      fs.writeFileSync(
        path.join(bootGrubDir, 'grub.cfg'),
        [
          'set timeout=0',
          'set default=0',
          '',
          'serial --unit=0 --speed=115200',
          'terminal_input serial console',
          'terminal_output serial console',
          '',
          'menuentry "NUSANTARA OS (x86_64 Multiboot2 Kernel)" {',
          '    multiboot2 /boot/kernel.elf',
          '    boot',
          '}',
          '',
        ].join('\n')
      );

      if (fs.existsSync(isoPath)) fs.unlinkSync(isoPath);
      if (fs.existsSync(isoAliasPath)) fs.unlinkSync(isoAliasPath);

      const mkRes = spawnSync('grub-mkrescue', ['-o', isoPath, tmpIsoDir], {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      if (mkRes.status !== 0) {
        console.error('[GALAT FATAL] grub-mkrescue gagal membuat image ISO bootable:');
        console.error(mkRes.stderr || mkRes.stdout);
        process.exit(1);
      }

      // Validasi struktur ISO El Torito via xorriso
      const xorCheck = spawnSync('xorriso', ['-indev', isoPath, '-report_el_torito', 'plain'], {
        encoding: 'utf-8',
      });
      if (xorCheck.status !== 0 || !xorCheck.stdout.includes('El Torito boot img')) {
        console.error('[GALAT FATAL] ISO tidak memuat El Torito boot catalog yang valid!');
        console.error(xorCheck.stdout, xorCheck.stderr);
        process.exit(1);
      }

      fs.copyFileSync(isoPath, isoAliasPath);
      const isoStats = fs.statSync(isoPath);
      isoBuildStatus = `BUILT_GRUB2_EL_TORITO (${isoStats.size} bytes)`;
      console.log(`       -> ISO GRUB2 Bootable valid dibuat: ${isoPath} (${isoStats.size} bytes)`);
    } finally {
      fs.rmSync(tmpIsoDir, { recursive: true, force: true });
    }
  } else {
    // Hapus ISO lama yang mungkin non-bootable agar tidak menyesatkan
    if (fs.existsSync(isoPath)) fs.unlinkSync(isoPath);
    if (fs.existsSync(isoAliasPath)) fs.unlinkSync(isoAliasPath);

    console.warn('[PERINGATAN] grub-mkrescue atau xorriso tidak ditemukan.');
    console.warn('             ISO bootable fisik hanya dapat dibuat pada host yang memiliki grub-pc-bin + xorriso.');
    if (process.env.CI === 'true' || process.env.REQUIRE_GRUB_ISO === '1') {
      console.error('[GALAT FATAL CI] grub-mkrescue dan xorriso wajib terpasang pada lingkungan CI!');
      process.exit(1);
    }
  }

  // 6. Toolchain Versions Report
  console.log('[6/8] Membuat laporan deteksi toolchain host (toolchain-versions.txt)...');
  const toolchainReport = [
    '======================================================================',
    '       STATUS DETEKSI TOOLCHAIN HOST SISTEM — PHASE 50 VALIDATION     ',
    '======================================================================',
    `Tanggal Audit       : ${new Date().toISOString()}`,
    `Arsitektur Host     : ${process.arch}`,
    `Platform Host       : ${process.platform}`,
    `Node.js Version     : ${process.version}`,
    '----------------------------------------------------------------------',
    `QEMU x86_64 Emulator: ${toolchain.hasQEMU ? 'TERPASANG (' + toolchain.qemuVersion + ')' : 'TIDAK TERPASANG'}`,
    `Clang Compiler (LLVM): ${toolchain.hasClang ? 'TERPASANG (' + toolchain.clangVersion + ')' : 'TIDAK TERPASANG'}`,
    `LLD Linker (LLD)    : ${toolchain.hasLLD ? 'TERPASANG' : 'TIDAK TERPASANG'}`,
    `GCC Compiler        : ${toolchain.hasGCC ? 'TERPASANG' : 'TIDAK TERPASANG'}`,
    `Xorriso ISO Tool    : ${toolchain.hasXorriso ? 'TERPASANG' : 'TIDAK TERPASANG'}`,
    `GRUB Rescue Tool    : ${toolchain.hasGRUB ? 'TERPASANG' : 'TIDAK TERPASANG'}`,
    `GDB Debugger        : ${toolchain.hasGDB ? 'TERPASANG' : 'TIDAK TERPASANG'}`,
    `Status ISO Bootable : ${isoBuildStatus}`,
    '======================================================================',
  ].join('\n');
  fs.writeFileSync(path.join(artifactsDir, 'toolchain-versions.txt'), toolchainReport);

  // 7. Isolation Test Report (Model Verification)
  console.log('[7/8] Membuat laporan verifikasi model isolasi memori (isolation-test-report.txt)...');
  const asTestA = new AddressSpace();
  const readRes = asTestA.checkAccess(0xFFFFFFFF80000000n, 'READ', true);
  const testAPass = !readRes.allowed && readRes.faultReason === 'SUPERVISOR_PRIVILEGE_VIOLATION';
  const writeRes = asTestA.checkAccess(0xFFFF800000000000n, 'WRITE', true);
  const testBPass = !writeRes.allowed && writeRes.faultReason === 'SUPERVISOR_PRIVILEGE_VIOLATION';

  const asProcA = new AddressSpace();
  const asProcB = new AddressSpace();
  const cr3A = asProcA.cr3;
  const cr3B = asProcB.cr3;
  asProcA.allocateAndMapUserPage(0x00401000n, PagePermissions.USER_READ_WRITE);
  asProcB.allocateAndMapUserPage(0x00402000n, PagePermissions.USER_READ_WRITE);
  const testCPass = cr3A !== cr3B && asProcA.translate(0x00402000n) === null && asProcB.translate(0x00401000n) === null;

  asTestA.mapPage(0x00500000n, 0x02000000n, PagePermissions.READ_WRITE, true);
  const nxRes = asTestA.checkAccess(0x00500000n, 'EXECUTE', true);
  const testDPass = !nxRes.allowed && nxRes.faultReason === 'NO_EXECUTE_VIOLATION';

  asTestA.mapPage(0x00600000n, 0x02100000n, PagePermissions.READ, true);
  const roRes = asTestA.checkAccess(0x00600000n, 'WRITE', true);
  const testEPass = !roRes.allowed && roRes.faultReason === 'WRITE_PROTECTION_VIOLATION';

  const nullPtr = UserPointerSecurity.validateUserAddress(0n);
  const zeroPagePtr = UserPointerSecurity.validateUserAddress(0x5000n);
  const kernelPtr = UserPointerSecurity.validateUserAddress(0xFFFFFFFF80000000n);
  const nonCanonPtr = UserPointerSecurity.validateUserAddress(0x0000_8000_0000_0000n);
  const testFPass = !nullPtr.valid && !zeroPagePtr.valid && !kernelPtr.valid && !nonCanonPtr.valid;

  ProcessFaultHandler.clearDiagnostics();
  const pm = ProcessManager.getInstance();
  const faultProc = pm.process_create('faulty_proc', 0, false);
  pm.process_start(faultProc.pid);
  const handled = ProcessFaultHandler.handleException({
    vector: 14,
    errorCode: 4n,
    cr2FaultAddress: 0xFFFFFFFF80000000n,
    registers: { cs: SegmentSelector.USER_CODE, rip: 0x00401020n, rsp: 0x00007FFFFFFFE000n },
    faultType: 14,
  }, faultProc.pid);
  const faultLookup = pm.process_lookup(faultProc.pid);
  const faultPass = handled && faultLookup?.state === ProcessState.TERMINATED;

  const isolationReport = [
    '======================================================================',
    '     VERIFIKASI STRUKTUR & MODEL HARDWARE PAGING (PRE-QEMU CHECK)     ',
    '======================================================================',
    `Test A — Kernel Memory Read (0xFFFFFFFF80000000): ${testAPass ? 'LULUS' : 'GAGAL'}`,
    `Test B — Kernel Memory Write (0xFFFF800000000000): ${testBPass ? 'LULUS' : 'GAGAL'}`,
    `Test C — Isolasi Proses A (CR3 0x${cr3A.toString(16)}) & B (CR3 0x${cr3B.toString(16)}): ${testCPass ? 'LULUS' : 'GAGAL'}`,
    `Test D — No-Execute (NX) Protection: ${testDPass ? 'LULUS' : 'GAGAL'}`,
    `Test E — Read-Only Protection: ${testEPass ? 'LULUS' : 'GAGAL'}`,
    `Test F — Invalid User Pointer (EFAULT): ${testFPass ? 'LULUS' : 'GAGAL'}`,
    `Test G — Fault Guard Model Check: ${faultPass ? 'LULUS' : 'GAGAL'}`,
    '----------------------------------------------------------------------',
    'CATATAN: Verifikasi hardware CPU Ring 3 aktual membutuhkan eksekusi QEMU nyata.',
    '======================================================================',
  ].join('\n');
  fs.writeFileSync(path.join(artifactsDir, 'isolation-test-report.txt'), isolationReport);

  // 8. QEMU Exit Code Contract & Test Report Summary (Tanpa Klaim Log QEMU Palsu!)
  console.log('[8/8] Menulis kontrak exit code & menghitung SHA256SUMS...');
  const qemuExitContract = [
    '======================================================================',
    '             KONTRAK EXIT CODE QEMU & STATUS EKSEKUSI SAAT INI         ',
    '======================================================================',
    'Kontrak ISA Debug Exit Port (iobase=0xf4, iosize=0x04):',
    '  exit_code = (val << 1) | 1',
    '  - val = 0x00 (SUCCESS) -> raw QEMU exit code 1',
    '  - val = 0x01 (PANIC)   -> raw QEMU exit code 3',
    '  - timeout              -> raw timeout exit code 124',
    '',
    `Status Build Host: QEMU=${toolchain.hasQEMU ? 'TERSEDIA' : 'TIDAK TERPASANG'} | ISO=${isoBuildStatus}`,
    'Status QEMU Boot : NOT_EXECUTED_IN_BUILD_STEP (menunggu eksekusi qemu-system-x86_64)',
    '======================================================================',
  ].join('\n');
  fs.writeFileSync(path.join(artifactsDir, 'qemu-exit-code.txt'), qemuExitContract);

  const testReport = [
    '======================================================================',
    '            RANGKUMAN HASIL BUILD ARTIFAK PHASE 50 NUSANTARA OS       ',
    '======================================================================',
    `1. Kernel ELF64 (${kernelBytes.length} B)   : VALID (Multiboot2 + ELF64 x86_64)`,
    `2. User Test ELF (${userTestBytes.length} B) : VALID`,
    `3. User Fault ELF (${userFaultBytes.length} B): VALID`,
    `4. GRUB2 ISO Status               : ${isoBuildStatus}`,
    '5. Serial / QEMU Logs             : BELUM DIEKSEKUSI (tidak membuat log palsu)',
    '======================================================================',
  ].join('\n');
  fs.writeFileSync(path.join(artifactsDir, 'test-report.txt'), testReport);
  fs.writeFileSync(path.join(artifactsDir, 'test-results.txt'), testReport);

  const filesToHash = [
    'kernel.elf',
    'user.elf',
    'user-test.elf',
    'user-fault-test.elf',
    'nusantara-os.iso',
    'nusantara-phase50.iso',
    'qemu-exit-code.txt',
    'elf-validation.txt',
    'isolation-test-report.txt',
    'toolchain-versions.txt',
    'test-report.txt',
    'test-results.txt',
    'FINAL-CERTIFICATION.md',
  ];

  const hashLines: string[] = [];
  for (const f of filesToHash) {
    const fPath = path.join(artifactsDir, f);
    if (fs.existsSync(fPath)) {
      const data = fs.readFileSync(fPath);
      const hash = crypto.createHash('sha256').update(data).digest('hex');
      hashLines.push(`${hash}  ${f}`);
    }
  }
  const shaPath = path.join(artifactsDir, 'SHA256SUMS');
  fs.writeFileSync(shaPath, hashLines.join('\n') + '\n');

  console.log(`\nBuild artefak selesai. SHA256SUMS ditulis (${hashLines.length} berkas).`);
}

generatePhase50Artifacts().catch((err) => {
  console.error('Galat saat menghasilkan artifak Phase 50:', err);
  process.exit(1);
});
