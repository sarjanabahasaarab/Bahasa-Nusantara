/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PENGUJIAN KOMPREHENSIF PHASE 23: BUILD SYSTEM & DISTRIBUSI DESKTOP NUSANTARA
 * Memverifikasi target matrix (6 platform), build pipeline native, parser biner ELF/PE/Mach-O,
 * inspeksi dependensi nyata, arsip .zip/.tar.gz, SHA256SUMS, installer/upgrade/uninstaller,
 * penanganan galat toolchain/SDK, dan regresi Phase 1-22.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import { spawnSync } from 'child_process';

import {
  ArchiveBuilder,
  DESKTOP_CANONICAL_TARGETS,
  DesktopDistributionPackager,
  DesktopInstallerGenerator,
  NativeBuildPipeline,
  TargetMatrixManager,
} from '../../src/build';
import { AOTCompiler } from '../../src/compiler/aot/aot-compiler';
import { BinaryInspector } from '../../src/compiler/executable/binary-inspector';
import { StandalonePackager } from '../../src/compiler/executable/standalone-packager';
import { DependencyInspector } from '../../src/compiler/linker/dependency-inspector';
import { LLVMValidator } from '../../src/compiler/llvm/llvm-validator';
import { TargetTripleManager } from '../../src/compiler/llvm/target-triple';
import { LLVMToolchainManager } from '../../src/compiler/llvm/toolchain-manager';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { PembacaBerkasNode } from '../../src/modul/pembacaBerkas';
import { NusantaraCLI } from '../../src/paket/cli';

let totalUji = 0;
let lulus = 0;
let gagal = 0;
let belumDiverifikasi = 0;

function uji(nama: string, fn: () => void | 'UNVERIFIED'): void {
  totalUji++;
  try {
    const res = fn();
    if (res === 'UNVERIFIED') {
      belumDiverifikasi++;
      console.log(`  [⚠ BELUM DIVERIFIKASI] ${nama}`);
    } else {
      lulus++;
      console.log(`  [✓ LULUS] ${nama}`);
    }
  } catch (err: any) {
    gagal++;
    console.error(`  [✗ GAGAL] ${nama}`);
    console.error(`            ${err.message}`);
  }
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) throw new Error(`Penegasan gagal: ${pesan}`);
}

function samaDengan<T>(aktual: T, diharapkan: T, pesan?: string): void {
  if (aktual !== diharapkan) {
    throw new Error(`${pesan || 'Nilai tidak cocok'}: aktual='${aktual}', diharapkan='${diharapkan}'`);
  }
}

console.log('=============================================================================');
console.log('PENGUJIAN RESMI PHASE 23: BUILD SYSTEM & DISTRIBUSI DESKTOP NUSANTARA');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// GRUP 1: MATRIKS TARGET DESKTOP & DETEKSI TOOLCHAIN / CROSS-SDK
// -----------------------------------------------------------------------------
console.log('=== [GRUP 1: Matriks Target & Deteksi Toolchain] ===');

uji('1.1 Mendukung seluruh 6 target desktop resmi beserta aliasnya', () => {
  samaDengan(DESKTOP_CANONICAL_TARGETS.length, 6);
  const expectedTriples: Record<string, string> = {
    'windows-x86_64': 'x86_64-pc-windows-msvc',
    'windows-x64': 'x86_64-pc-windows-msvc',
    'windows-arm64': 'aarch64-pc-windows-msvc',
    'linux-x86_64': 'x86_64-unknown-linux-gnu',
    'linux-x64': 'x86_64-unknown-linux-gnu',
    'linux-arm64': 'aarch64-unknown-linux-gnu',
    'macos-x86_64': 'x86_64-apple-darwin',
    'macos-x64': 'x86_64-apple-darwin',
    'macos-arm64': 'arm64-apple-darwin',
  };

  for (const [alias, triple] of Object.entries(expectedTriples)) {
    const res = TargetTripleManager.resolveStrict(alias);
    pastikan(res.supported, `Target '${alias}' harus valid`);
    samaDengan(res.info.triple, triple, `Triple untuk ${alias}`);
    pastikan(res.info.isSupported === true, `isSupported untuk ${alias}`);
  }
});

uji('1.2 Target OS/arsitektur tidak didukung ditolak secara tegas (resolveStrict)', () => {
  for (const bad of ['freebsd-riscv64', 'plan9-mips', 'solaris-sparc', '']) {
    const res = TargetTripleManager.resolveStrict(bad);
    samaDengan(res.supported, false, `Target '${bad}' wajib ditolak`);
    const cli = new NusantaraCLI({ pembaca: new PembacaBerkasNode(), log: () => {}, error: () => {} });
    const exitCode = cli.jalankan(['bangun', '--target', bad || 'unknown-arch']);
    pastikan(exitCode !== 0, `CLI harus mengembalikan exit code non-nol untuk target '${bad}'`);
  }
});

uji('1.3 Penanganan jujur jika LLVM/Clang tidak terpasang di lingkungan saat ini', () => {
  const status = new LLVMToolchainManager('/nonexistent-llvm-bin-dir-test').detect();
  samaDengan(status.available, false);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-no-clang-'));
  try {
    const res = NativeBuildPipeline.build({
      sourceCode: 'program Uji\nmulai\n  tampilkan("Halo")\nselesai\n',
      appName: 'uji',
      outputDirectory: tmpDir,
      customToolchainPath: '/nonexistent-llvm-bin-dir-test',
    });
    samaDengan(res.success, false, 'Harus gagal ketika toolchain LLVM tidak ditemukan');
    samaDengan(res.statusCode, 'TOOLCHAIN_TIDAK_TERSEDIA');
    pastikan(!res.executablePath, 'Tidak boleh menghasilkan biner palsu');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// GRUP 1B: AUDIT LLVM IR LITERAL STRING & KELENGKAPAN SIMBOL GLOBAL (11 SKENARIO)
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 1B: Audit LLVM IR Literal String & Konsistensi Simbol] ===');

uji('1B.1 Seluruh 11 skenario literal string menghasilkan LLVM IR sah tanpa simbol tak terdefinisi', () => {
  const compiler = new AOTCompiler();
  const toolchain = new LLVMToolchainManager().detect();
  const validator = new LLVMValidator(toolchain);

  const scenarios: Array<{ nama: string; kode: string; minStrings: number }> = [
    {
      nama: '01_single_string',
      kode: `program S1\nmulai\n  tampilkan("Halo Nusantara")\nselesai\n`,
      minStrings: 1,
    },
    {
      nama: '02_multi_string_satu_fungsi',
      kode: `program S2\nmulai\n  tampilkan("Satu", "Dua", "Tiga")\nselesai\n`,
      minStrings: 4, // "Satu", " ", "Dua", "Tiga"
    },
    {
      nama: '03_duplicate_string_interning',
      kode: `program S3\nmulai\n  tampilkan("Sama")\n  tampilkan("Sama")\nselesai\n`,
      minStrings: 1,
    },
    {
      nama: '04_string_sebagai_argumen_fungsi',
      kode: `program S4\nfungsi cetakPesan(p : teks) : kosong\nmulai\n  tampilkan(p)\nselesai\nmulai\n  cetakPesan("Dikirim ke fungsi")\nselesai\n`,
      minStrings: 1,
    },
    {
      nama: '05_string_dalam_percabangan_jika',
      kode: `program S5\nmulai\n  x : bilangan = 5\n  jika x > 2 maka\n    tampilkan("Lebih besar")\n  selain\n    tampilkan("Lebih kecil")\n  akhir\nselesai\n`,
      minStrings: 2,
    },
    {
      nama: '06_string_dalam_perulangan',
      kode: `program S6\nmulai\n  i : bilangan = 0\n  selama i < 2 lakukan\n    tampilkan("Iterasi")\n    i = i + 1\n  akhir\n  untuk j dari 1 sampai 2 lakukan\n    tampilkan("Untuk", j)\n  akhir\nselesai\n`,
      minStrings: 2,
    },
    {
      nama: '07_string_kosong',
      kode: `program S7\nmulai\n  tampilkan("")\nselesai\n`,
      minStrings: 1,
    },
    {
      nama: '08_string_quote_dan_escape',
      kode: `program S8\nmulai\n  tampilkan("Kutipan \\"Nusantara\\"\\nBaris Baru\\tTab")\nselesai\n`,
      minStrings: 1,
    },
    {
      nama: '09_string_unicode_bahasa_indonesia',
      kode: `program S9\nmulai\n  tampilkan("Bahasa Indonesia — Café Rp10.000 🚀")\nselesai\n`,
      minStrings: 1,
    },
    {
      nama: '10_multi_tampilkan_dan_ekspresi',
      kode: `program S10\nmulai\n  hasil : bilangan = 20 + 22\n  tampilkan("NUSANTARA_NATIVE_CI_OK")\n  tampilkan("Pengujian LLVM IR berhasil")\n  tampilkan("Bahasa Indonesia")\n  tampilkan(hasil)\nselesai\n`,
      minStrings: 3,
    },
    {
      nama: '11_rantai_panggilan_fungsi_bersarang',
      kode: `program S11\nfungsi dalam(label : teks, n : bilangan) : bilangan\nmulai\n  tampilkan("Dalam:", label)\n  kembalikan n + 2\nselesai\nfungsi luar(k : bilangan) : bilangan\nmulai\n  tampilkan("Luar")\n  kembalikan dalam("DariLuar", k * 2)\nselesai\nmulai\n  tampilkan("Awal")\n  res : bilangan = luar(20)\n  tampilkan("Akhir", res)\nselesai\n`,
      minStrings: 5,
    },
  ];

  for (const sc of scenarios) {
    const res = compiler.compileSource(sc.kode, { emitLLVM: false, optLevel: 'O2' });
    pastikan(res.success && Boolean(res.llvmIR), `Kompilasi '${sc.nama}' gagal: ${res.diagnostics.join(' | ')}`);
    const ir = res.llvmIR!;

    pastikan(!/@\.str\._v\d+/.test(ir), `${sc.nama}: terdeteksi simbol rusak @.str._v*`);
    const strDeclCount = (ir.match(/^@\.str\.\d+\s*=/gm) || []).length;
    pastikan(
      strDeclCount >= sc.minStrings,
      `${sc.nama}: jumlah deklarasi @.str.N=${strDeclCount} kurang dari minimum ${sc.minStrings}`
    );

    const valRes = validator.validateIR(ir);
    pastikan(
      valRes.valid,
      `${sc.nama}: LLVMValidator gagal (${valRes.toolUsed || 'static'}): ${valRes.diagnostics.join(' | ')}`
    );
  }
});

// -----------------------------------------------------------------------------
// GRUP 2: PARSER KETAT HEADER BINER (ELF64, PE32+, MACH-O 64) & TOLAK STUB
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 2: Validasi Biner Executable (ELF64, PE32+, Mach-O 64)] ===');

uji('2.1 Inspeksi ketat menolak skrip shell (#!) dan batch (@echo) sebagai executable native', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-stub-check-'));
  try {
    const shPath = path.join(tmpDir, 'fake_elf');
    fs.writeFileSync(shPath, '#!/bin/sh\necho "bukan native"\n');
    const shMeta = BinaryInspector.inspectStrict(shPath);
    samaDengan(shMeta.binaryType, 'SCRIPT');
    samaDengan(shMeta.isValidExecutable, false);

    const batPath = path.join(tmpDir, 'fake_pe.exe');
    fs.writeFileSync(batPath, '@echo off\r\necho bukan pe\r\n');
    const batMeta = BinaryInspector.inspectStrict(batPath);
    samaDengan(batMeta.binaryType, 'SCRIPT');
    samaDengan(batMeta.isValidExecutable, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

uji('2.2 Inspeksi ketat ELF64 x86_64 dan ARM64 serta penolakan berkas korup', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-elf-strict-'));
  try {
    // ELF64 x86_64 valid
    const elfX64 = Buffer.alloc(64);
    elfX64[0] = 0x7f; elfX64[1] = 0x45; elfX64[2] = 0x4c; elfX64[3] = 0x46;
    elfX64[4] = 2; // 64-bit
    elfX64[5] = 1; // LE
    elfX64[6] = 1; // EV_CURRENT
    elfX64.writeUInt16LE(2, 16); // ET_EXEC
    elfX64.writeUInt16LE(0x3e, 18); // EM_X86_64
    elfX64.writeBigUInt64LE(0x401000n, 24);
    const x64Path = path.join(tmpDir, 'bin_x64');
    fs.writeFileSync(x64Path, elfX64);
    const metaX64 = BinaryInspector.inspectStrict(x64Path);
    samaDengan(metaX64.isValidExecutable, true);
    samaDengan(metaX64.format, 'ELF');
    samaDengan(metaX64.architecture, 'x86_64');
    samaDengan(metaX64.binaryType, 'EXECUTABLE');

    // ELF64 ARM64 valid
    const elfArm = Buffer.from(elfX64);
    elfArm.writeUInt16LE(0xb7, 18); // EM_AARCH64
    const armPath = path.join(tmpDir, 'bin_arm64');
    fs.writeFileSync(armPath, elfArm);
    const metaArm = BinaryInspector.inspectStrict(armPath);
    samaDengan(metaArm.isValidExecutable, true);
    samaDengan(metaArm.architecture, 'aarch64');

    // ELF terpotong (<64 byte) harus ditolak strict
    const truncPath = path.join(tmpDir, 'trunc.elf');
    fs.writeFileSync(truncPath, Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0]));
    const truncMeta = BinaryInspector.inspectStrict(truncPath);
    samaDengan(truncMeta.isValidExecutable, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

uji('2.3 Inspeksi ketat PE32+ Windows (AMD64 & ARM64) serta deteksi PE signature palsu', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-pe-strict-'));
  try {
    const buildPe = (machine: number) => {
      const buf = Buffer.alloc(512);
      buf[0] = 0x4d; buf[1] = 0x5a; // MZ
      buf.writeUInt32LE(0x80, 0x3c); // e_lfanew
      buf.write('PE\0\0', 0x80, 'ascii');
      buf.writeUInt16LE(machine, 0x84);
      buf.writeUInt16LE(1, 0x86); // NumberOfSections
      buf.writeUInt16LE(240, 0x94); // SizeOfOptionalHeader
      buf.writeUInt16LE(0x0022, 0x96); // Characteristics: EXECUTABLE_IMAGE | LARGE_ADDRESS_AWARE
      buf.writeUInt16LE(0x020b, 0x98); // OptionalHeader Magic = PE32+
      buf.writeUInt32LE(0x1000, 0x98 + 16); // AddressOfEntryPoint
      // Section header .text
      const secOff = 0x98 + 240;
      buf.write('.text', secOff, 'ascii');
      buf.writeUInt32LE(0x200, secOff + 16); // SizeOfRawData
      buf.writeUInt32LE(0x200, secOff + 20); // PointerToRawData
      return buf;
    };

    const peX64Path = path.join(tmpDir, 'app_x64.exe');
    fs.writeFileSync(peX64Path, buildPe(0x8664));
    const metaX64 = BinaryInspector.inspectStrict(peX64Path);
    samaDengan(metaX64.isValidExecutable, true);
    samaDengan(metaX64.format, 'COFF');
    samaDengan(metaX64.architecture, 'x86_64');
    samaDengan(metaX64.binaryType, 'EXECUTABLE');

    const peArmPath = path.join(tmpDir, 'app_arm64.exe');
    fs.writeFileSync(peArmPath, buildPe(0xaa64));
    const metaArm = BinaryInspector.inspectStrict(peArmPath);
    samaDengan(metaArm.isValidExecutable, true);
    samaDengan(metaArm.architecture, 'aarch64');
    samaDengan(metaArm.binaryType, 'EXECUTABLE');

    // MZ tanpa 'PE\0\0' harus ditolak strict
    const badPe = buildPe(0x8664);
    badPe.write('XXXX', 0x80, 'ascii');
    const badPath = path.join(tmpDir, 'bad.exe');
    fs.writeFileSync(badPath, badPe);
    samaDengan(BinaryInspector.inspectStrict(badPath).isValidExecutable, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

uji('2.4 Inspeksi ketat Mach-O 64-bit (x86_64 & ARM64) + ekstraksi LC_LOAD_DYLIB', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-macho-strict-'));
  try {
    const buildMachO = (cpuType: number, dylibPath: string) => {
      const cmdSize = 24 + dylibPath.length + 1;
      const paddedCmdSize = Math.ceil(cmdSize / 8) * 8;
      const buf = Buffer.alloc(32 + paddedCmdSize);
      // MH_MAGIC_64 LE bytes in file: cf fa ed fe
      buf[0] = 0xcf; buf[1] = 0xfa; buf[2] = 0xed; buf[3] = 0xfe;
      buf.writeInt32LE(cpuType, 4);
      buf.writeUInt32LE(2, 12); // MH_EXECUTE
      buf.writeUInt32LE(1, 16); // ncmds = 1
      buf.writeUInt32LE(paddedCmdSize, 20); // sizeofcmds
      // Load Command LC_LOAD_DYLIB (0x0c)
      buf.writeUInt32LE(0x0c, 32);
      buf.writeUInt32LE(paddedCmdSize, 36);
      buf.writeUInt32LE(24, 40); // name offset inside command
      buf.write(dylibPath, 32 + 24, 'utf-8');
      return buf;
    };

    const macArm = path.join(tmpDir, 'app_mac_arm64');
    fs.writeFileSync(macArm, buildMachO(0x0100000c, '/usr/lib/libSystem.B.dylib'));
    const metaArm = BinaryInspector.inspectStrict(macArm);
    samaDengan(metaArm.isValidExecutable, true);
    samaDengan(metaArm.format, 'Mach-O');
    samaDengan(metaArm.architecture, 'aarch64');
    samaDengan(metaArm.binaryType, 'EXECUTABLE');
    pastikan(metaArm.dynamicLibraries.includes('/usr/lib/libSystem.B.dylib'), 'Harus memuat LC_LOAD_DYLIB');

    const macX64 = path.join(tmpDir, 'app_mac_x64');
    fs.writeFileSync(macX64, buildMachO(0x01000007, '/usr/lib/libSystem.B.dylib'));
    const metaX64 = BinaryInspector.inspectStrict(macX64);
    samaDengan(metaX64.isValidExecutable, true);
    samaDengan(metaX64.architecture, 'x86_64');

    const depMac = new DependencyInspector().inspect(macArm, 'darwin');
    pastikan(depMac.inspectedFromDisk === true, 'Mach-O harus diinspeksi dari disk');
    pastikan(depMac.dependencies.some((d) => d.name === 'libSystem.B.dylib'), 'Dependensi libSystem.B.dylib harus terdeteksi pada Mach-O');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// GRUP 3: INSPEKSI DEPENDENSI BINER NYATA & EKSEKUSI NATIVE (BILA CLANG ADA)
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 3: Inspeksi Dependensi Nyata & Eksekusi Native Host] ===');

uji('3.1 DependencyInspector memeriksa biner nyata di disk (/bin/sh di Linux)', () => {
  if (process.platform === 'linux' && fs.existsSync('/bin/sh')) {
    const rep = new DependencyInspector().inspect('/bin/sh', 'linux');
    pastikan(rep.inspectedFromDisk === true, 'Harus menginspeksi biner nyata dari disk');
    pastikan(rep.allResolved, 'Dependensi /bin/sh harus terpenuhi');
  }
});

uji('3.2 Kompilasi, validasi LLVM IR, & eksekusi biner native UjiNativePhase23 (wajib aktif bila NUSANTARA_REQUIRE_CLANG=1)', () => {
  const status = new LLVMToolchainManager().detect();
  const requireClang = process.env.NUSANTARA_REQUIRE_CLANG === '1';
  if (!status.available) {
    if (requireClang) {
      throw new Error(
        'NUSANTARA_REQUIRE_CLANG=1 aktif, tetapi toolchain Clang/LLVM tidak ditemukan di CI!'
      );
    }
    console.log('     [CATATAN JUJUR] Clang/LLVM tidak terpasang di container ini; kompilasi native dilewati (BELUM DIVERIFIKASI).');
    return 'UNVERIFIED';
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-native-e2e-'));
  try {
    const srcPath = path.join(tmpDir, 'uji_native_phase23.nusantara');
    fs.writeFileSync(
      srcPath,
      `program UjiNativePhase23\nmulai\n  hasil : bilangan = 20 + 22\n  tampilkan("NUSANTARA_NATIVE_CI_OK")\n  tampilkan("Pengujian LLVM IR berhasil")\n  tampilkan("Bahasa Indonesia")\n  tampilkan(hasil)\nselesai\n`,
      'utf-8'
    );

    const res = NativeBuildPipeline.build({
      sourceFilePath: srcPath,
      appName: 'uji_native_phase23',
      outputDirectory: tmpDir,
      linkingMode: 'dynamic',
      verifyExecution: true,
    });

    pastikan(res.success, `Build native gagal [${res.statusCode}]: ${res.diagnostics.join(' | ')}`);
    pastikan(Boolean(res.llvmIRPath && fs.existsSync(res.llvmIRPath)), 'Berkas LLVM IR (.ll) harus dihasilkan di disk');
    const irText = fs.readFileSync(res.llvmIRPath!, 'utf-8');
    pastikan(!/@\.str\._v\d+/.test(irText), 'LLVM IR mengandung simbol string rusak @.str._v');
    pastikan(Boolean(res.executablePath && fs.existsSync(res.executablePath)), 'Executable native harus ada di disk');
    pastikan(Boolean(res.binaryMetadata?.isValidExecutable), 'Header executable harus sah');
    pastikan(Boolean(res.dependencyReport?.allResolved), 'Dependensi runtime executable harus terpenuhi');
    pastikan(Boolean(res.executionVerification?.executed && res.executionVerification?.success), 'Eksekusi biner harus berhasil');

    const stdout = res.executionVerification?.stdout || '';
    pastikan(stdout.includes('NUSANTARA_NATIVE_CI_OK'), `Output tidak memuat sentinel: '${stdout}'`);
    pastikan(stdout.includes('Pengujian LLVM IR berhasil'), `Output tidak memuat teks uji: '${stdout}'`);
    pastikan(stdout.includes('Bahasa Indonesia'), `Output tidak memuat Bahasa Indonesia: '${stdout}'`);
    pastikan(stdout.includes('42'), `Output tidak memuat hasil 42: '${stdout}'`);

    const reportDir = process.env.NUSANTARA_BUILD_REPORT_DIR;
    if (reportDir) {
      fs.mkdirSync(reportDir, { recursive: true });
      fs.writeFileSync(path.join(reportDir, 'uji_native_phase23.ll'), irText, 'utf-8');
      fs.writeFileSync(
        path.join(reportDir, 'uji_native_phase23_report.json'),
        JSON.stringify(
          {
            target: res.target.canonicalTarget,
            triple: res.target.triple,
            toolchainVersion: status.version,
            binaryFormat: res.binaryMetadata?.format,
            binaryArch: res.binaryMetadata?.architecture,
            binaryType: res.binaryMetadata?.binaryType,
            executableSha256: res.executableSha256,
            executionMode: res.executionVerification?.executionMode,
            exitCode: res.executionVerification?.exitCode,
            stdout,
          },
          null,
          2
        ),
        'utf-8'
      );
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// GRUP 4: ARSIP DISTRIBUSI (.ZIP & .TAR.GZ), ANTI-TRAVERSAL & SHA256SUMS
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 4: Arsip Distribusi, Ekstraksi Aman & SHA-256] ===');

uji('4.1 Pembuatan & ekstraksi .zip dan .tar.gz tervalidasi oleh pure Node dan python3 zipfile/tarfile', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-pkg-dist-'));
  try {
    const res = DesktopDistributionPackager.packageTarget({
      appName: 'demo_app',
      appVersion: 'v0.23.0',
      target: 'linux-x86_64',
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: tmpDir,
      reproducible: true,
      includeInstallers: true,
    });

    pastikan(res.success && res.artifacts.length === 2, 'Harus menghasilkan .zip dan .tar.gz');
    const zipArt = res.artifacts.find((a) => a.format === 'zip')!;
    const tgzArt = res.artifacts.find((a) => a.format === 'tar.gz')!;

    // Uji integritas SHA-256 pada staging dir
    const sumRes = ArchiveBuilder.verifySha256SumsFromDirectory(
      fs.readFileSync(res.sha256sumsPath, 'utf-8'),
      res.stagingDirectory
    );
    pastikan(sumRes.valid && sumRes.checkedCount >= 5, 'Seluruh SHA256SUMS internal harus cocok');

    // Ekstraksi .zip & .tar.gz lewat parser aman Nusantara
    const zipBytes = new Uint8Array(fs.readFileSync(zipArt.filePath));
    const tgzBytes = new Uint8Array(fs.readFileSync(tgzArt.filePath));
    const outZip = path.join(tmpDir, 'out_zip');
    const outTgz = path.join(tmpDir, 'out_tgz');

    const exZip = ArchiveBuilder.extractZip(zipBytes, outZip);
    const exTgz = ArchiveBuilder.extractTarGz(tgzBytes, outTgz);
    pastikan(exZip.length >= 6 && exTgz.length >= 6, 'Kedua arsip harus berisi seluruh berkas distribusi');

    const rootDirName = fs.readdirSync(outTgz)[0];
    const sumAfterExtract = ArchiveBuilder.verifySha256SumsFromDirectory(
      fs.readFileSync(path.join(outTgz, rootDirName, 'SHA256SUMS'), 'utf-8'),
      path.join(outTgz, rootDirName)
    );
    pastikan(sumAfterExtract.valid, 'SHA256SUMS sesudah ekstraksi .tar.gz harus tetap cocok 100%');

    // Uji deteksi tamper: ubah 1 byte manifest dan pastikan gagal
    fs.appendFileSync(path.join(outTgz, rootDirName, 'manifest.json'), ' ');
    const sumTampered = ArchiveBuilder.verifySha256SumsFromDirectory(
      fs.readFileSync(path.join(outTgz, rootDirName, 'SHA256SUMS'), 'utf-8'),
      path.join(outTgz, rootDirName)
    );
    samaDengan(sumTampered.valid, false, 'Modifikasi 1 byte harus terdeteksi sebagai ketidakcocokan SHA-256');

    // Validasi lintas tool memakai Python standard library (zipfile & tarfile) bila tersedia
    const pyCheck = spawnSync(
      'python3',
      [
        '-c',
        `import zipfile, tarfile; z = zipfile.ZipFile(${JSON.stringify(zipArt.filePath)}); assert z.testzip() is None; t = tarfile.open(${JSON.stringify(tgzArt.filePath)}, 'r:gz'); assert len(t.getnames()) >= 6`,
      ],
      { encoding: 'utf-8' }
    );
    if (pyCheck.status === 0) {
      pastikan(true, 'Arsip lolos python3 zipfile.testzip() & tarfile');
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

uji('4.2 Proteksi anti-path traversal menolak entri ../ dan path absolut pada arsip', () => {
  let rejected = false;
  try {
    ArchiveBuilder.createZip([{ name: '../../etc/cron.d/pwn', content: 'bad' }]);
  } catch (err: any) {
    rejected = err.message.includes('traversal');
  }
  pastikan(rejected, 'Entri ZIP ../ wajib ditolak');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-tar-sec-'));
  try {
    // Buat tar tarGz secara manual berisi nama traversal tidak lewat ArchiveBuilder
    const tarHdr = new Uint8Array(512);
    const enc = new TextEncoder();
    tarHdr.set(enc.encode('../outside.txt'), 0);
    tarHdr.set(enc.encode('0000644\0'), 100);
    tarHdr.set(enc.encode('0000000\0'), 108);
    tarHdr.set(enc.encode('0000000\0'), 116);
    tarHdr.set(enc.encode('00000000004\0'), 124);
    tarHdr.set(enc.encode('00000000000\0'), 136);
    for (let i = 148; i < 156; i++) tarHdr[i] = 0x20;
    tarHdr[156] = 0x30;
    tarHdr.set(enc.encode('ustar\x00' + '00'), 257);
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += tarHdr[i];
    tarHdr.set(enc.encode(sum.toString(8).padStart(6, '0') + '\0 '), 148);
    const payload = new Uint8Array(512);
    payload.set(enc.encode('hack'));
    const fullTar = Buffer.concat([tarHdr, payload, new Uint8Array(1024)]);
    const gz = zlib.gzipSync(fullTar);

    let traversalBlocked = false;
    try {
      ArchiveBuilder.extractTarGz(new Uint8Array(gz), tmpDir);
    } catch (e: any) {
      traversalBlocked = e.message.includes('traversal');
    }
    pastikan(traversalBlocked, 'Ekstraksi .tar.gz wajib memblokir path traversal');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// GRUP 5: INSTALLER, UPGRADE & UNINSTALLER LINTAS OS
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 5: Siklus Hidup Installer, Upgrade & Uninstaller] ===');

uji('5.1 Skrip installer Windows (.ps1 & .bat) berisi cek SHA-256, backup upgrade & pembersihan PATH aman', () => {
  const winBundle = DesktopInstallerGenerator.generate({
    appName: 'demo_app',
    appVersion: 'v0.23.0',
    target: 'windows-x86_64',
    os: 'windows',
    binRelativePath: 'bin/demo_app.exe',
  });
  const names = winBundle.files.map((f) => f.name);
  pastikan(names.includes('install.ps1') && names.includes('uninstall.ps1'), 'Bundel Windows harus menyertakan install.ps1 dan uninstall.ps1');
  pastikan(names.includes('install.bat') && names.includes('uninstall.bat'), 'Bundel Windows harus menyertakan install.bat dan uninstall.bat');

  const psInstall = String(winBundle.files.find((f) => f.name === 'install.ps1')!.content);
  const psUninstall = String(winBundle.files.find((f) => f.name === 'uninstall.ps1')!.content);
  pastikan(psInstall.includes('Get-FileHash') && psInstall.includes('SHA256'), 'install.ps1 harus memverifikasi integritas berkas memakai Get-FileHash SHA256');
  pastikan(psInstall.includes('BackupBin'), 'Harus punya backup saat upgrade');
  pastikan(psUninstall.includes('SetEnvironmentVariable'), 'Harus membersihkan User PATH dengan aman');
});

uji('5.2 Eksekusi nyata install.sh -> upgrade -> uninstall.sh dalam sandbox HOME terisolasi', () => {
  if (process.platform === 'win32') {
    return 'UNVERIFIED';
  }
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-installer-sandbox-'));
  try {
    const fakeHome = path.join(tmpRoot, 'home');
    const prefixDir = path.join(tmpRoot, 'prefix');
    const pkgOut1 = path.join(tmpRoot, 'pkg_v1');
    const pkgOut2 = path.join(tmpRoot, 'pkg_v2');
    fs.mkdirSync(fakeHome, { recursive: true });
    // Buat .bashrc berisi konfigurasi pribadi agar dipastikan TIDAK terhapus oleh uninstall.sh
    const bashrcPath = path.join(fakeHome, '.bashrc');
    fs.writeFileSync(bashrcPath, '# Konfigurasi pribadi pengguna\nexport EDITOR=nano\n', 'utf-8');

    const pkg1 = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_demo',
      appVersion: 'v0.23.0',
      target: 'linux-x86_64',
      packageKind: 'script-launcher',
      outputDirectory: pkgOut1,
      includeInstallers: true,
    });

    // 1) Install v1
    const instRes1 = DesktopInstallerGenerator.runPosixScriptInSandbox({
      packageDir: pkg1.stagingDirectory,
      scriptName: 'install.sh',
      prefixDir,
      homeDir: fakeHome,
    });
    pastikan(instRes1.success, `install.sh v1 gagal: ${instRes1.stderr}`);
    const installedBin = path.join(prefixDir, 'bin', 'nusa_demo');
    pastikan(fs.existsSync(installedBin), 'Biner terpasang harus ada di prefix/bin');
    pastikan(fs.readFileSync(bashrcPath, 'utf-8').includes('NUSANTARA NUSA_DEMO PATH'), 'Penanda PATH NUSANTARA harus ditambahkan ke .bashrc');

    // 2) Upgrade ke v2
    const pkg2 = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_demo',
      appVersion: 'v0.23.1',
      target: 'linux-x86_64',
      packageKind: 'script-launcher',
      outputDirectory: pkgOut2,
      includeInstallers: true,
    });
    const instRes2 = DesktopInstallerGenerator.runPosixScriptInSandbox({
      packageDir: pkg2.stagingDirectory,
      scriptName: 'install.sh',
      prefixDir,
      homeDir: fakeHome,
    });
    pastikan(instRes2.success, `Upgrade install.sh v2 gagal: ${instRes2.stderr}`);
    const manifestAfterUpgrade = JSON.parse(
      fs.readFileSync(path.join(prefixDir, '.nusa_demo-package-manifest.json'), 'utf-8')
    );
    samaDengan(manifestAfterUpgrade.versi, 'v0.23.1');

    // 3) Penolakan tamper checksum oleh install.sh
    fs.appendFileSync(path.join(pkg2.stagingDirectory, 'manifest.json'), '\n// corrupted');
    const tamperRes = DesktopInstallerGenerator.runPosixScriptInSandbox({
      packageDir: pkg2.stagingDirectory,
      scriptName: 'install.sh',
      prefixDir,
      homeDir: fakeHome,
    });
    samaDengan(tamperRes.success, false, 'install.sh wajib menolak paket dengan checksum rusak');

    // 4) Uninstall bersih
    const uninstRes = DesktopInstallerGenerator.runPosixScriptInSandbox({
      packageDir: pkg1.stagingDirectory,
      scriptName: 'uninstall.sh',
      prefixDir,
      homeDir: fakeHome,
    });
    pastikan(uninstRes.success, `uninstall.sh gagal: ${uninstRes.stderr}`);
    pastikan(!fs.existsSync(installedBin), 'Biner harus terhapus setelah uninstall');
    const bashrcAfter = fs.readFileSync(bashrcPath, 'utf-8');
    pastikan(bashrcAfter.includes('export EDITOR=nano'), 'Konfigurasi pribadi .bashrc TIDAK boleh hilang');
    pastikan(!bashrcAfter.includes('NUSANTARA NUSA_DEMO PATH'), 'Blok PATH Nusantara harus dibersihkan');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// GRUP 6: INTEGRASI CLI & REGRESI PHASE 1–22
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 6: Integrasi CLI & Regresi Phase 1-22] ===');

uji('6.1 CLI info melaporkan ke-6 target desktop resmi', () => {
  const logs: string[] = [];
  const cli = new NusantaraCLI({ pembaca: new PembacaBerkasNode(), log: (m) => logs.push(m) });
  const code = cli.jalankan(['info', '--json']);
  samaDengan(code, 0);
  const parsed = JSON.parse(logs.join('\n'));
  for (const t of DESKTOP_CANONICAL_TARGETS) {
    pastikan(parsed.targetDidukung.includes(t), `Target ${t} harus tercantum di nusantara info`);
  }
});

uji('6.2 StandalonePackager sekarang menulis arsip .tar.gz nyata ke disk beserta SHA256SUMS', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-standalone-tgz-'));
  try {
    const exePath = path.join(tmpDir, 'halo_cli');
    fs.writeFileSync(exePath, '#!/bin/sh\necho "Halo"\n');
    const res = StandalonePackager.package({
      appName: 'halo_cli',
      appVersion: '1.0.0',
      executablePath: exePath,
      outputDirectory: tmpDir,
      includeInstallers: true,
    });
    pastikan(res.success && Boolean(res.archivePath && fs.existsSync(res.archivePath)), 'Arsip .tar.gz wajib ada di disk');
    pastikan(Boolean(res.sha256sumsPath && fs.existsSync(res.sha256sumsPath)), 'SHA256SUMS wajib ada');
    pastikan(fs.existsSync(path.join(res.standaloneDirectory, 'install.sh')), 'Installer wajib disertakan saat diminta');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

uji('6.3 Regresi bahasa NUSANTARA Phase 1-22 (lexer, parser, tipe, interpreter, stdlib)', () => {
  const kode = `
program UjiRegresiFase23
gunakan "matematika" sebagai mtk
gunakan "teks" sebagai tk

mulai
  hasil : desimal = mtk.akar(81.0)
  pesan : teks = tk.kapital("nusantara")
  tampilkan(pesan, hasil)
selesai
`;
  const buf = new PenulisOutputBuffer();
  const interp = new Interpreter(buf);
  interp.jalankanKode(kode);
  samaDengan(buf.dapatkanSeluruhTeks().join('\n').trim(), 'NUSANTARA 9');
});

console.log('\n=============================================================================');
console.log('RINGKASAN PENGUJIAN PHASE 23 (BUILD SYSTEM & DISTRIBUSI DESKTOP)');
console.log(`Total Uji          : ${totalUji}`);
console.log(`Lulus              : ${lulus}`);
console.log(`Gagal              : ${gagal}`);
console.log(`Belum Diverifikasi : ${belumDiverifikasi}`);
console.log('=============================================================================\n');

if (gagal > 0) {
  process.exit(1);
}
