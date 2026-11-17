/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RANGKAIAN PENGUJIAN RESMI PHASE 23 (v0.23.0 - v0.23.5)
 * Build System, Native AOT Compilation, Distribusi Desktop 6 Target, Arsip, & Sertifikasi CI
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import { AOTCompiler } from '../../src/compiler/aot/aot-compiler';
import { BinaryInspector } from '../../src/compiler/executable/binary-inspector';
import { StandalonePackager } from '../../src/compiler/executable/standalone-packager';
import { DynamicLinker } from '../../src/compiler/linker/dynamic-linker';
import { StaticLinker } from '../../src/compiler/linker/static-linker';
import { LLVMToolchainManager, LLVMToolchainStatus } from '../../src/compiler/llvm/toolchain-manager';
import { LLVMValidator } from '../../src/compiler/llvm/llvm-validator';
import { TargetTripleManager } from '../../src/compiler/llvm/target-triple';
import { safeCP } from '../../src/compiler/llvm/node-compat';
import {
  ArchiveBuilder,
  CanonicalDesktopTarget,
  DESKTOP_CANONICAL_TARGETS,
  DesktopDistributionPackager,
  DesktopInstallerGenerator,
  NativeBuildPipeline,
  PHASE23_CERTIFICATION_SENTINEL,
  Phase23CertificationEngine,
  Phase23TargetEvidence,
  TargetCapability,
  TargetMatrixManager,
} from '../../src/build';
import { NusantaraCLI } from '../../src/paket/cli';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;
let totalBelumDiverifikasi = 0;

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) {
    throw new Error(pesan);
  }
}

function samaDengan<T>(aktual: T, diharapkan: T, pesan?: string): void {
  if (aktual !== diharapkan) {
    throw new Error(`${pesan || 'Nilai tidak sama'}: aktual='${aktual}', diharapkan='${diharapkan}'`);
  }
}

function uji(nama: string, fn: () => void | 'BELUM_DIVERIFIKASI'): void {
  totalUji++;
  try {
    const res = fn();
    if (res === 'BELUM_DIVERIFIKASI') {
      totalBelumDiverifikasi++;
      console.log(`  🟡 [BELUM DIVERIFIKASI] ${nama}`);
    } else {
      totalLulus++;
      console.log(`  ✓ [LULUS] ${nama}`);
    }
  } catch (err: any) {
    totalGagal++;
    console.error(`  ✗ [GAGAL] ${nama}`);
    console.error(`    ${err?.message || err}`);
  }
}

/**
 * Pembaca JSON defensif: memeriksa UTF-8 BOM (EF BB BF) hanya di offset 0,
 * melepas BOM secara eksplisit jika ada, lalu mem-parse JSON dengan diagnostik jelas.
 */
export function bacaJsonAman<T = any>(filePath: string, stage: string): T {
  let rawBuf: Buffer;
  try {
    rawBuf = fs.readFileSync(filePath);
  } catch (err: any) {
    throw new Error(`[${stage}] Gagal membaca berkas JSON '${filePath}': ${err?.message || err}`);
  }
  const hasBom =
    rawBuf.length >= 3 && rawBuf[0] === 0xef && rawBuf[1] === 0xbb && rawBuf[2] === 0xbf;
  const cleanText = (hasBom ? rawBuf.subarray(3) : rawBuf).toString('utf-8');
  try {
    return JSON.parse(cleanText) as T;
  } catch (err: any) {
    const previewHex = rawBuf.subarray(0, 8).toString('hex');
    throw new Error(
      `[${stage}] Gagal parse JSON pada '${filePath}' (hasBom=${hasBom}, prefixHex=${previewHex}): ${err?.message || err}`
    );
  }
}

function buildMinimalElf64(arch: 'x86_64' | 'aarch64'): Buffer {
  const buf = Buffer.alloc(128, 0);
  buf[0] = 0x7f;
  buf[1] = 0x45;
  buf[2] = 0x4c;
  buf[3] = 0x46;
  buf[4] = 2; // 64-bit
  buf[5] = 1; // LE
  buf[6] = 1;
  buf.writeUInt16LE(2, 16); // ET_EXEC
  buf.writeUInt16LE(arch === 'aarch64' ? 0xb7 : 0x3e, 18);
  buf.writeUInt32LE(1, 20);
  buf.writeBigUInt64LE(0x401000n, 24);
  return buf;
}

function buildMinimalPe32Plus(arch: 'x86_64' | 'aarch64'): Buffer {
  const buf = Buffer.alloc(512, 0);
  buf[0] = 0x4d;
  buf[1] = 0x5a; // MZ
  buf.writeUInt32LE(0x80, 0x3c); // e_lfanew
  buf[0x80] = 0x50;
  buf[0x81] = 0x45; // PE\0\0
  buf.writeUInt16LE(arch === 'aarch64' ? 0xaa64 : 0x8664, 0x80 + 4);
  buf.writeUInt16LE(1, 0x80 + 6); // NumberOfSections
  buf.writeUInt16LE(240, 0x80 + 20); // SizeOfOptionalHeader
  buf.writeUInt16LE(0x0022, 0x80 + 22); // IMAGE_FILE_EXECUTABLE_IMAGE | LARGE_ADDRESS_AWARE
  const optOff = 0x80 + 24;
  buf.writeUInt16LE(0x020b, optOff); // PE32+
  buf.writeUInt32LE(0x1000, optOff + 16); // AddressOfEntryPoint
  return buf;
}

function buildMinimalMachO64(arch: 'x86_64' | 'aarch64'): Buffer {
  const buf = Buffer.alloc(128, 0);
  buf.writeUInt32LE(0xfeedfacf, 0); // MH_MAGIC_64
  buf.writeUInt32LE(arch === 'aarch64' ? 0x0100000c : 0x01000007, 4);
  buf.writeUInt32LE(2, 12); // MH_EXECUTE
  buf.writeUInt32LE(0, 16);
  buf.writeUInt32LE(0, 20);
  return buf;
}

console.log('=============================================================================');
console.log('  PENGUJIAN RESMI PHASE 23 — BUILD SYSTEM & DISTRIBUSI DESKTOP (v0.23.5)     ');
console.log('=============================================================================');

// -----------------------------------------------------------------------------
// GRUP 1: TARGET MATRIX & CAPABILITY DETECTION
// -----------------------------------------------------------------------------
console.log('\n[GRUP 1] Matriks Target Desktop 6 Platform & Resolusi Triple');

uji('1.1 Resolusi ke-6 target desktop resmi beserta alias warisan', () => {
  const expected: Array<[string, CanonicalDesktopTarget, string]> = [
    ['windows-x64', 'windows-x86_64', 'x86_64-pc-windows-msvc'],
    ['windows-arm64', 'windows-arm64', 'aarch64-pc-windows-msvc'],
    ['linux-x64', 'linux-x86_64', 'x86_64-unknown-linux-gnu'],
    ['linux-arm64', 'linux-arm64', 'aarch64-unknown-linux-gnu'],
    ['macos-x64', 'macos-x86_64', 'x86_64-apple-darwin'],
    ['macos-arm64', 'macos-arm64', 'arm64-apple-darwin'],
  ];

  const all = TargetMatrixManager.getAllCanonicalTargets();
  samaDengan(all.length, 6, 'Harus mendefinisikan tepat 6 target kanonik');

  for (const [alias, canonical, triple] of expected) {
    const strict = TargetTripleManager.resolveStrict(alias);
    pastikan(strict.supported, `Alias '${alias}' wajib didukung`);
    samaDengan(strict.info.targetId, canonical, `Canonical untuk '${alias}'`);
    samaDengan(strict.info.triple, triple, `Triple untuk '${alias}'`);
  }
});

uji('1.2 Penolakan ketat target tidak dikenal atau kosong', () => {
  const emptyCheck = TargetTripleManager.resolveStrict('');
  pastikan(!emptyCheck.supported, 'Target kosong wajib ditolak');

  const bogusCheck = TargetTripleManager.resolveStrict('solaris-sparc64');
  pastikan(!bogusCheck.supported, 'Target tidak dikenal wajib ditolak');
});

uji('1.3 Deteksi kemampuan seluruh 6 target secara jujur sesuai host & SDK', () => {
  const caps = TargetMatrixManager.inspectAllTargets();
  samaDengan(caps.length, 6, 'Harus mengembalikan 6 inspeksi kapabilitas');
  for (const c of caps) {
    pastikan(Boolean(c.canonicalTarget && c.triple && c.recommendedRunner), 'Metadata target harus lengkap');
    pastikan(Array.isArray(c.missingRequirements), 'missingRequirements harus array');
  }
});

// -----------------------------------------------------------------------------
// GRUP 1B: LLVM IR STRING SYMBOL & UTF-8 BYTE LENGTH (PHASE 23.1)
// -----------------------------------------------------------------------------
console.log('\n[GRUP 1B] Konsistensi Simbol String Global LLVM IR & Escape UTF-8');

uji('1B.1 Sebelas skenario string literal menghasilkan simbol @.str.* terdeklarasi & bebas @.str._v*', () => {
  const scenarios: Array<{ nama: string; kode: string }> = [
    {
      nama: 'string_tunggal',
      kode: `program S1\nmulai\ntampilkan("Halo Nusantara")\nselesai`,
    },
    {
      nama: 'multi_arg_inline',
      kode: `program S2\nmulai\ntampilkan("Satu", "Dua", 123, "Tiga")\nselesai`,
    },
    {
      nama: 'interning_duplikat',
      kode: `program S3\nmulai\ntampilkan("Duplikat")\ntampilkan("Duplikat")\nselesai`,
    },
    {
      nama: 'argumen_fungsi',
      kode: `program S4\nfungsi cetak_pesan(p : teks) : kosong\nmulai\ntampilkan("Pesan:", p)\nselesai\nmulai\ncetak_pesan("Aktif")\nselesai`,
    },
    {
      nama: 'percabangan_jika',
      kode: `program S5\nmulai\nn : bilangan = 5\njika n > 3 maka\ntampilkan("Besar")\nselain\ntampilkan("Kecil")\nakhir\nselesai`,
    },
    {
      nama: 'perulangan_selama',
      kode: `program S6\nmulai\ni : bilangan = 0\nselama i < 2 lakukan\ntampilkan("Iterasi")\ni = i + 1\nakhir\nselesai`,
    },
    {
      nama: 'string_kosong',
      kode: `program S7\nmulai\ntampilkan("")\ntampilkan("SesudahKosong")\nselesai`,
    },
    {
      nama: 'escape_quotes',
      kode: `program S8\nmulai\ntampilkan("Baris\\nTab\\t\\"Kutip\\"\\\\Slash")\nselesai`,
    },
    {
      nama: 'utf8_indonesia_unicode',
      kode: `program S9\nmulai\ntampilkan("Bahasa Nusantara — Merdeka 🚀 ✅")\nselesai`,
    },
    {
      nama: 'multi_cetak_bilangan_teks',
      kode: `program S10\nmulai\na : bilangan = 20 + 22\ntampilkan("HASIL=", a)\ntampilkan("SELESAI")\nselesai`,
    },
    {
      nama: 'panggilan_bersarang',
      kode: `program S11\nfungsi prefix() : teks\nmulai\nkembalikan "ID-"\nselesai\nmulai\ntampilkan(prefix(), "OK")\nselesai`,
    },
  ];

  const aot = new AOTCompiler();
  const validator = new LLVMValidator(new LLVMToolchainManager().detect());

  for (const sc of scenarios) {
    const res = aot.compileSource(sc.kode, { optLevel: 'O2', emitLLVMOnly: true });
    pastikan(res.success && Boolean(res.llvmIR), `Skenario ${sc.nama} gagal: ${res.diagnostics.join(' | ')}`);
    const ir = res.optimizedIR || res.llvmIR!;
    pastikan(!/@\.str\._v\d+/.test(ir), `Skenario ${sc.nama} mengandung simbol terlarang @.str._v*`);
    const val = validator.validateIR(ir);
    pastikan(val.valid, `Validator gagal pada ${sc.nama}: ${val.diagnostics.join(' | ')}`);
  }
});

// -----------------------------------------------------------------------------
// GRUP 2: ARCHIVE BUILDER & CHECKSUMS
// -----------------------------------------------------------------------------
console.log('\n[GRUP 2] ArchiveBuilder (PKZIP, POSIX USTAR tar.gz, SHA256SUMS, Security)');

uji('2.1 Pembuatan dan ekstraksi arsip PKZIP (.zip) dengan verifikasi CRC-32', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-zip-'));
  try {
    const zipBytes = ArchiveBuilder.createZip(
      [
        { name: 'app/bin/main', content: 'echo hello\n', mode: 0o755 },
        { name: 'app/config/app.json', content: '{"ok":true}\n', mode: 0o644 },
      ],
      { reproducible: true }
    );
    pastikan(zipBytes[0] === 0x50 && zipBytes[1] === 0x4b, 'Harus berheader PKZIP');
    const outFiles = ArchiveBuilder.extractZip(zipBytes, tmp);
    samaDengan(outFiles.length, 2, 'Harus mengekstrak 2 berkas');
    samaDengan(fs.readFileSync(path.join(tmp, 'app/config/app.json'), 'utf-8'), '{"ok":true}\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('2.2 Pembuatan dan ekstraksi arsip POSIX USTAR (.tar.gz) termasuk jalur panjang > 100 byte', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-tgz-'));
  try {
    const longPath =
      'nusantara-paket-panjang/subdirektori-kesatu/subdirektori-kedua/subdirektori-ketiga/subdirektori-keempat/berkas_konfigurasi_panjang.txt';
    pastikan(longPath.length > 100, 'Jalur uji harus > 100 karakter');
    const tgzBytes = ArchiveBuilder.createTarGz(
      [
        { name: longPath, content: 'USTAR_LONG_OK', mode: 0o644 },
        { name: 'nusantara-paket-panjang/README.txt', content: 'Halo', mode: 0o644 },
      ],
      { reproducible: true }
    );
    const extracted = ArchiveBuilder.extractTarGz(tgzBytes, tmp);
    samaDengan(extracted.length, 2, 'Harus mengekstrak 2 berkas');
    samaDengan(fs.readFileSync(path.join(tmp, longPath), 'utf-8'), 'USTAR_LONG_OK');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('2.3 Verifikasi SHA256SUMS mendeteksi berkas terubah (tamper) dan berkas hilang', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-sha-'));
  try {
    const f1 = path.join(tmp, 'data.txt');
    fs.writeFileSync(f1, 'ASLI', 'utf-8');
    const sums = ArchiveBuilder.formatSha256Sums([
      { sha256: ArchiveBuilder.computeSha256('ASLI'), filename: 'data.txt' },
    ]);
    const okRes = ArchiveBuilder.verifySha256SumsFromDirectory(tmp, sums);
    pastikan(okRes.valid && okRes.checkedCount === 1, 'Checksum asli harus valid');

    fs.writeFileSync(f1, 'TERUBAH', 'utf-8');
    const tamperRes = ArchiveBuilder.verifySha256SumsFromDirectory(tmp, sums);
    pastikan(!tamperRes.valid && tamperRes.mismatches.length === 1, 'Checksum rusak harus ditolak');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('2.4 Proteksi keamanan menolak path traversal dan jalur absolut dalam arsip', () => {
  let rejectedTraversal = false;
  try {
    ArchiveBuilder.resolveSafeSubpath('/tmp/safe', '../../etc/passwd');
  } catch {
    rejectedTraversal = true;
  }
  pastikan(rejectedTraversal, 'Path traversal wajib ditolak');

  let rejectedAbs = false;
  try {
    ArchiveBuilder.resolveSafeSubpath('/tmp/safe', '/etc/shadow');
  } catch {
    rejectedAbs = true;
  }
  pastikan(rejectedAbs, 'Jalur absolut wajib ditolak');
});

// -----------------------------------------------------------------------------
// GRUP 3: NATIVE BUILD PIPELINE & BINARY INSPECTOR
// -----------------------------------------------------------------------------
console.log('\n[GRUP 3] Native Build Pipeline & Inspeksi Biner Ketat');

uji('3.1 BinaryInspector.inspectStrict menolak skrip palsu dan memvalidasi header ELF/PE32+/Mach-O', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-insp-'));
  try {
    const fakeScript = path.join(tmp, 'palsu.sh');
    fs.writeFileSync(fakeScript, '#!/bin/sh\necho palsu\n');
    const resScript = BinaryInspector.inspectStrict(fakeScript);
    pastikan(!resScript.isValidExecutable && resScript.binaryType === 'SCRIPT', 'Skrip shell wajib ditolak');

    const elfPath = path.join(tmp, 'ok.elf');
    fs.writeFileSync(elfPath, buildMinimalElf64('x86_64'));
    const resElf = BinaryInspector.inspectStrict(elfPath);
    pastikan(Boolean(resElf.isValidExecutable) && resElf.format === 'ELF' && resElf.architecture === 'x86_64', 'ELF64 sah harus lolos');

    const pePath = path.join(tmp, 'ok.exe');
    fs.writeFileSync(pePath, buildMinimalPe32Plus('aarch64'));
    const resPe = BinaryInspector.inspectStrict(pePath);
    pastikan(Boolean(resPe.isValidExecutable) && resPe.format === 'COFF' && resPe.architecture === 'aarch64', 'PE32+ ARM64 sah harus lolos');

    const machPath = path.join(tmp, 'ok.macho');
    fs.writeFileSync(machPath, buildMinimalMachO64('aarch64'));
    const resMach = BinaryInspector.inspectStrict(machPath);
    pastikan(Boolean(resMach.isValidExecutable) && resMach.format === 'Mach-O' && resMach.architecture === 'aarch64', 'Mach-O ARM64 sah harus lolos');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('3.2 Kompilasi & eksekusi native end-to-end host saat ini (NUSANTARA_REQUIRE_CLANG=1 wajib Clang)', () => {
  const requireClang = process.env.NUSANTARA_REQUIRE_CLANG === '1';
  const hostTarget = TargetMatrixManager.getHostTargetId() || 'linux-x86_64';
  const cap = TargetMatrixManager.inspectTargetCapability(hostTarget);

  if (!cap.canBuildNative) {
    if (requireClang || cap.clangAvailable) {
      throw new Error(
        `Toolchain host (${hostTarget}) gagal verifikasi build native (clangAvailable=${cap.clangAvailable}, requireClang=${requireClang}): ${cap.missingRequirements.join('; ')}`
      );
    }
    return 'BELUM_DIVERIFIKASI';
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-native-32-'));
  try {
    const src = `
program UjiNativePhase23
mulai
  hasil : bilangan = 20 + 22
  tampilkan("NUSANTARA_NATIVE_CI_OK")
  tampilkan("Pengujian LLVM IR berhasil")
  tampilkan("Bahasa Indonesia")
  tampilkan(hasil)
selesai
`;
    const res = NativeBuildPipeline.build({
      sourceCode: src,
      appName: 'uji_native_p23',
      target: hostTarget,
      outputDirectory: tmp,
      optLevel: 'O2',
      linkingMode: 'auto',
      verifyExecution: true,
    });
    pastikan(res.success, `NativeBuildPipeline gagal (${res.statusCode}): ${res.diagnostics.join(' | ')}`);
    pastikan(Boolean(res.executablePath && fs.existsSync(res.executablePath)), 'Executable hasil build harus ada di disk');
    pastikan(Boolean(res.binaryMetadata?.isValidExecutable), 'BinaryInspector harus memvalidasi executable');
    pastikan(res.executedOnHost && res.executionExitCode === 0, `Eksekusi host harus keluar 0 (exit=${res.executionExitCode})`);
    pastikan(
      Boolean(res.executionStdout && res.executionStdout.includes('NUSANTARA_NATIVE_CI_OK') && res.executionStdout.includes('42')),
      `Stdout native tidak sesuai harapan: '${res.executionStdout}'`
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('3.3 Preflight sysroot, CRT, /usr/lib/*, mismatch arsitektur, & penolakan linker lintas OS tanpa GALAT_KOMPILASI atau fallback palsu', () => {
  const capLinuxX64 = TargetMatrixManager.inspectTargetCapability('linux-x86_64');
  const capLinuxArm = TargetMatrixManager.inspectTargetCapability('linux-arm64');
  for (const cap of [capLinuxX64, capLinuxArm]) {
    pastikan(
      !cap.sysroot || (!cap.sysroot.includes('/usr/lib/') && !cap.sysroot.includes('/lib/')),
      `sysroot Linux tidak boleh menunjuk subdirektori library (${cap.sysroot})`
    );
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-sysroot-check-'));
  try {
    const sampleProgram = 'program S\nmulai\ntampilkan("OK")\nselesai\n';
    const clangStub: LLVMToolchainStatus = {
      available: true,
      useOpaquePointers: true,
      diagnostics: [],
      binaries: {
        clang: { name: 'clang', command: 'clang', found: true },
        llc: { name: 'llc', command: 'llc', found: false },
        opt: { name: 'opt', command: 'opt', found: false },
        llvmAs: { name: 'llvm-as', command: 'llvm-as', found: false },
        llvmDis: { name: 'llvm-dis', command: 'llvm-dis', found: false },
        llvmObjdump: { name: 'llvm-objdump', command: 'llvm-objdump', found: false },
        lld: { name: 'lld', command: 'ld.lld', found: true },
      },
    };
    const noToolchainStub: LLVMToolchainStatus = {
      available: false,
      useOpaquePointers: true,
      diagnostics: ['clang hilang'],
      binaries: {
        clang: { name: 'clang', command: 'clang', found: false },
        llc: { name: 'llc', command: 'llc', found: false },
        opt: { name: 'opt', command: 'opt', found: false },
        llvmAs: { name: 'llvm-as', command: 'llvm-as', found: false },
        llvmDis: { name: 'llvm-dis', command: 'llvm-dis', found: false },
        llvmObjdump: { name: 'llvm-objdump', command: 'llvm-objdump', found: false },
        lld: { name: 'lld', command: 'ld.lld', found: false },
      },
    };
    const crossMissingSdkCap: TargetCapability = {
      ...capLinuxX64,
      isCross: true,
      canBuildNative: false,
      canExecuteOnHost: false,
      toolchainAvailable: true,
      clangAvailable: true,
      lldAvailable: true,
      sdkAvailable: false,
      linkerProbeVerified: false,
      missingRequirements: ['Linux cross-sysroot / CRT tidak tersedia pada host non-Linux'],
      diagnosticMessage: 'Cross-SDK Linux tidak tersedia di host saat ini',
    };

    // A. Sysroot tanpa stdio.h harus ditolak preflight sebelum IR/eksekusi (GALAT_LINKER, bukan GALAT_KOMPILASI)
    const fakeLibOnlySysroot = path.join(tmp, 'lib_only_sysroot');
    fs.mkdirSync(fakeLibOnlySysroot, { recursive: true });
    const out1 = path.join(tmp, 'out1');
    const invalidSysrootRes = NativeBuildPipeline.build(
      {
        sourceCode: sampleProgram,
        appName: 'uji_bad_sysroot',
        target: 'linux-x86_64',
        outputDirectory: out1,
        sysroot: fakeLibOnlySysroot,
      },
      { toolchain: clangStub, capability: { ...capLinuxX64, clangAvailable: true, toolchainAvailable: true } }
    );
    pastikan(!invalidSysrootRes.success, 'Sysroot tanpa stdio.h wajib gagal secara eksplisit');
    pastikan(
      invalidSysrootRes.statusCode === 'GALAT_LINKER' || invalidSysrootRes.statusCode === 'CROSS_SDK_TIDAK_TERSEDIA',
      `Status gagal harus GALAT_LINKER/CROSS_SDK_TIDAK_TERSEDIA (aktual: ${invalidSysrootRes.statusCode})`
    );
    pastikan(!invalidSysrootRes.executablePath && !invalidSysrootRes.llvmIRPath, 'Preflight gagal tidak boleh menghasilkan executable atau .ll');

    // B. Sysroot menunjuk /usr/lib/* (baik path literal maupun direktori lokal) wajib ditolak GALAT_LINKER
    const fakeUsrLibDir = path.join(tmp, 'usr', 'lib', 'x86_64-linux-gnu');
    fs.mkdirSync(fakeUsrLibDir, { recursive: true });
    for (const badUsrLibSysroot of ['/usr/lib/x86_64-linux-gnu', fakeUsrLibDir]) {
      const rUsrLib = NativeBuildPipeline.build(
        {
          sourceCode: sampleProgram,
          appName: 'uji_usr_lib',
          target: 'linux-x86_64',
          outputDirectory: path.join(tmp, 'out_usrlib'),
          sysroot: badUsrLibSysroot,
        },
        { toolchain: clangStub, capability: { ...capLinuxX64, clangAvailable: true, toolchainAvailable: true } }
      );
      samaDengan(rUsrLib.statusCode, 'GALAT_LINKER', `Sysroot '${badUsrLibSysroot}' wajib berstatus GALAT_LINKER`);
      pastikan(!rUsrLib.executablePath && !rUsrLib.llvmIRPath, 'Dilarang menghasilkan fallback/IR untuk sysroot /usr/lib/*');
    }

    // C. Sysroot tidak ditemukan di disk wajib gagal preflight CROSS_SDK_TIDAK_TERSEDIA
    const missingSysRes = NativeBuildPipeline.build(
      {
        sourceCode: sampleProgram,
        appName: 'uji_missing_sysroot',
        target: 'linux-x86_64',
        outputDirectory: path.join(tmp, 'out_missing'),
        sysroot: path.join(tmp, 'tidak_ada_sama_sekali'),
      },
      { toolchain: clangStub, capability: { ...capLinuxX64, clangAvailable: true, toolchainAvailable: true } }
    );
    samaDengan(missingSysRes.statusCode, 'CROSS_SDK_TIDAK_TERSEDIA', 'Sysroot non-eksisten wajib berstatus CROSS_SDK_TIDAK_TERSEDIA');
    pastikan(!missingSysRes.executablePath && !missingSysRes.llvmIRPath, 'Tidak boleh menghasilkan output untuk sysroot hilang');

    // D. Sysroot memiliki stdio.h namun tanpa CRT/libc (crt1.o/Scrt1.o/libc.so) wajib ditolak preflight
    const stdioNoCrtSysroot = path.join(tmp, 'stdio_no_crt');
    fs.mkdirSync(path.join(stdioNoCrtSysroot, 'usr', 'include'), { recursive: true });
    fs.writeFileSync(path.join(stdioNoCrtSysroot, 'usr', 'include', 'stdio.h'), '/* stub */\n', 'utf-8');
    const noCrtRes = NativeBuildPipeline.build(
      {
        sourceCode: sampleProgram,
        appName: 'uji_no_crt',
        target: 'linux-x86_64',
        outputDirectory: path.join(tmp, 'out_nocrt'),
        sysroot: stdioNoCrtSysroot,
      },
      { toolchain: clangStub, capability: { ...capLinuxX64, clangAvailable: true, toolchainAvailable: true } }
    );
    pastikan(!noCrtRes.success, 'Sysroot tanpa CRT/libc wajib gagal');
    pastikan(
      noCrtRes.statusCode === 'CROSS_SDK_TIDAK_TERSEDIA' || noCrtRes.statusCode === 'GALAT_LINKER',
      `Status gagal CRT hilang wajib CROSS_SDK_TIDAK_TERSEDIA/GALAT_LINKER (aktual: ${noCrtRes.statusCode})`
    );
    pastikan(!noCrtRes.executablePath && !noCrtRes.llvmIRPath, 'Sysroot tanpa CRT tidak boleh lanjut ke IR/linking');

    // E. Validasi simulasi host macOS/Windows menarget Linux tanpa sysroot (wajib CROSS_SDK_TIDAK_TERSEDIA, bukan GALAT_KOMPILASI!)
    const macHostCrossRes = NativeBuildPipeline.build(
      {
        sourceCode: sampleProgram,
        appName: 'uji_cross_sdk_missing',
        target: 'linux-x86_64',
        outputDirectory: path.join(tmp, 'out_cross_sdk'),
      },
      { toolchain: clangStub, capability: crossMissingSdkCap }
    );
    samaDengan(
      macHostCrossRes.statusCode,
      'CROSS_SDK_TIDAK_TERSEDIA',
      'Cross-build Linux pada host dengan Clang tanpa Linux SDK wajib menghasilkan CROSS_SDK_TIDAK_TERSEDIA (bukan GALAT_KOMPILASI)'
    );
    pastikan(!macHostCrossRes.executablePath && !macHostCrossRes.llvmIRPath, 'Cross-SDK hilang tidak boleh menghasilkan file fallback');

    // F. Toolchain compiler/linker tidak tersedia wajib TOOLCHAIN_TIDAK_TERSEDIA via DI
    const noToolRes = NativeBuildPipeline.build(
      {
        sourceCode: sampleProgram,
        appName: 'uji_no_toolchain',
        target: 'linux-x86_64',
        outputDirectory: path.join(tmp, 'out_notool'),
      },
      {
        toolchain: noToolchainStub,
        capability: {
          ...capLinuxX64,
          canBuildNative: false,
          clangAvailable: false,
          llcAvailable: false,
          toolchainAvailable: false,
        },
      }
    );
    samaDengan(noToolRes.statusCode, 'TOOLCHAIN_TIDAK_TERSEDIA', 'Tanpa compiler/linker wajib menghasilkan TOOLCHAIN_TIDAK_TERSEDIA');

    // G. NativeBuildPipeline menolak libraryPaths arsitektur salah (x86_64 -> arm64 DAN arm64 -> x86_64)
    const pipeBadLibArm = NativeBuildPipeline.build(
      {
        sourceCode: sampleProgram,
        appName: 'uji_lib_arm',
        target: 'linux-arm64',
        outputDirectory: path.join(tmp, 'out_libarm'),
        libraryPaths: ['/usr/lib/x86_64-linux-gnu'],
      },
      { toolchain: clangStub, capability: { ...capLinuxArm, clangAvailable: true, toolchainAvailable: true, canBuildNative: true } }
    );
    samaDengan(pipeBadLibArm.statusCode, 'GALAT_LINKER', 'x86_64 lib untuk linux-arm64 wajib GALAT_LINKER');
    pastikan(pipeBadLibArm.diagnostics.some((d) => d.includes('LIBRARY_TARGET_SALAH')), 'Harus mencantumkan LIBRARY_TARGET_SALAH');

    const pipeBadLibX64 = NativeBuildPipeline.build(
      {
        sourceCode: sampleProgram,
        appName: 'uji_lib_x64',
        target: 'linux-x86_64',
        outputDirectory: path.join(tmp, 'out_libx64'),
        libraryPaths: ['/usr/lib/aarch64-linux-gnu'],
      },
      { toolchain: clangStub, capability: { ...capLinuxX64, clangAvailable: true, toolchainAvailable: true, canBuildNative: true } }
    );
    samaDengan(pipeBadLibX64.statusCode, 'GALAT_LINKER', 'aarch64 lib untuk linux-x86_64 wajib GALAT_LINKER');
    pastikan(pipeBadLibX64.diagnostics.some((d) => d.includes('LIBRARY_TARGET_SALAH')), 'Harus mencantumkan LIBRARY_TARGET_SALAH');

    // H. DynamicLinker & StaticLinker menolak kedua arah mismatch library & sysroot cacat (meski tanpa explicitSysrootOverride)
    const objFake = path.join(tmp, 'dummy.o');
    fs.writeFileSync(objFake, Buffer.from([0x7f, 0x45, 0x4c, 0x46]));

    for (const [label, linkFn] of [
      [
        'DynamicLinker(x86_64 lib -> aarch64)',
        () =>
          new DynamicLinker(clangStub, TargetTripleManager.resolve('aarch64-unknown-linux-gnu')).linkDynamic({
            objectFiles: [objFake],
            outputExecutable: path.join(tmp, 'dyn_arm64'),
            libraryPaths: ['/usr/lib/x86_64-linux-gnu'],
          }),
      ],
      [
        'DynamicLinker(aarch64 lib -> x86_64)',
        () =>
          new DynamicLinker(clangStub, TargetTripleManager.resolve('x86_64-unknown-linux-gnu')).linkDynamic({
            objectFiles: [objFake],
            outputExecutable: path.join(tmp, 'dyn_x64'),
            libraryPaths: ['/usr/lib/aarch64-linux-gnu'],
          }),
      ],
      [
        'StaticLinker(x86_64 lib -> aarch64)',
        () =>
          new StaticLinker(clangStub, TargetTripleManager.resolve('aarch64-unknown-linux-gnu')).linkStatic({
            objectFiles: [objFake],
            outputExecutable: path.join(tmp, 'stat_arm64'),
            libraryPaths: ['/usr/lib/x86_64-linux-gnu'],
          }),
      ],
      [
        'StaticLinker(aarch64 lib -> x86_64)',
        () =>
          new StaticLinker(clangStub, TargetTripleManager.resolve('x86_64-unknown-linux-gnu')).linkStatic({
            objectFiles: [objFake],
            outputExecutable: path.join(tmp, 'stat_x64'),
            libraryPaths: ['/usr/lib/aarch64-linux-gnu'],
          }),
      ],
    ] as const) {
      const r = linkFn();
      pastikan(!r.success, `${label} wajib gagal`);
      pastikan(
        r.diagnostics.some((d) => d.includes('LIBRARY_TARGET_SALAH')),
        `${label} wajib melaporkan LIBRARY_TARGET_SALAH (aktual: ${r.diagnostics.join(' | ')})`
      );
    }

    const dynBadSysroot = new DynamicLinker(clangStub, TargetTripleManager.resolve('x86_64-unknown-linux-gnu'));
    const sysrootErr = dynBadSysroot.linkDynamic({
      objectFiles: [objFake],
      outputExecutable: path.join(tmp, 'out_x64'),
      sysroot: fakeLibOnlySysroot,
    });
    pastikan(!sysrootErr.success, 'DynamicLinker wajib gagal jika sysroot tidak memiliki stdio.h');
    pastikan(
      sysrootErr.diagnostics.some((d) => d.includes('SYSROOT_TIDAK_VALID')),
      `Wajib melaporkan kode SYSROOT_TIDAK_VALID (aktual: ${sysrootErr.diagnostics.join(' | ')})`
    );

    const statNoCrtErr = new StaticLinker(clangStub, TargetTripleManager.resolve('x86_64-unknown-linux-gnu')).linkStatic({
      objectFiles: [objFake],
      outputExecutable: path.join(tmp, 'stat_nocrt'),
      sysroot: stdioNoCrtSysroot,
    });
    pastikan(!statNoCrtErr.success, 'StaticLinker wajib gagal jika sysroot tanpa CRT');
    pastikan(
      statNoCrtErr.diagnostics.some((d) => d.includes('SYSROOT_CRT_TIDAK_DITEMUKAN')),
      `StaticLinker wajib melaporkan SYSROOT_CRT_TIDAK_DITEMUKAN (aktual: ${statNoCrtErr.diagnostics.join(' | ')})`
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// GRUP 4: DESKTOP DISTRIBUTION PACKAGER & CLI
// -----------------------------------------------------------------------------
console.log('\n[GRUP 4] Pengemas Distribusi Desktop & Reproducible Build');

uji('4.1 DesktopDistributionPackager menghasilkan arsip deterministik & manifest lengkap', () => {
  const tmp1 = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-dist1-'));
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-dist2-'));
  try {
    const r1 = DesktopDistributionPackager.packageTarget({
      appName: 'demoapp',
      appVersion: 'v0.23.5',
      target: 'linux-x86_64',
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: tmp1,
      reproducible: true,
    });
    const r2 = DesktopDistributionPackager.packageTarget({
      appName: 'demoapp',
      appVersion: 'v0.23.5',
      target: 'linux-x86_64',
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: tmp2,
      reproducible: true,
    });
    pastikan(r1.success && r1.artifacts.length === 2, 'Harus menghasilkan zip dan tar.gz untuk Linux');
    samaDengan(r1.artifacts[0].sha256, r2.artifacts[0].sha256, 'Arsip ZIP reproducible harus identik');
    samaDengan(r1.artifacts[1].sha256, r2.artifacts[1].sha256, 'Arsip TAR.GZ reproducible harus identik');
  } finally {
    fs.rmSync(tmp1, { recursive: true, force: true });
    fs.rmSync(tmp2, { recursive: true, force: true });
  }
});

uji('4.2 CLI nusantara bangun menulis arsip, release-manifest.json, dan SHA256SUMS', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cli-build-'));
  try {
    const logs: string[] = [];
    const cli = new NusantaraCLI({ log: (m) => logs.push(m) });
    const code = cli.jalankan(['bangun', '--mode', 'release', '--target', 'windows-x64,linux-x64', '--out', tmp, '--json']);
    samaDengan(code, 0, 'CLI bangun harus sukses');
    const jsonOut = JSON.parse(logs.join('\n'));
    pastikan(jsonOut.sukses && jsonOut.artefak.length === 3, 'windows-x64 (zip) + linux-x64 (zip,tar.gz) = 3 artefak');
    pastikan(fs.existsSync(path.join(tmp, 'release-manifest.json')), 'release-manifest.json harus ada');
    pastikan(fs.existsSync(path.join(tmp, 'SHA256SUMS')), 'SHA256SUMS harus ada');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// GRUP 5: INSTALLER, SANDBOX LIFECYCLE, & UTF-8 BOM DEFENSIVE PARSING
// -----------------------------------------------------------------------------
console.log('\n[GRUP 5] Generator Pemasang, Penanganan JSON UTF-8 Tanpa BOM, & Sandbox Lifecycle');

uji('5.1 Skrip installer Windows memakai .NET SHA256::Create() (tanpa Get-FileHash) & UTF8Encoding($false)', () => {
  const winBundle = DesktopInstallerGenerator.generate({
    appName: 'nusa_demo',
    appVersion: 'v0.23.5',
    target: 'windows-x86_64',
    os: 'windows',
    binRelativePath: 'bin/nusa_demo.exe',
  });
  const names = winBundle.files.map((f) => f.name);
  pastikan(names.includes('install.ps1') && names.includes('uninstall.ps1'), 'Wajib ada install.ps1 & uninstall.ps1');
  pastikan(names.includes('install.bat') && names.includes('uninstall.bat'), 'Wajib ada install.bat & uninstall.bat');

  const ps1 = winBundle.files.find((f) => f.name === 'install.ps1')!.content;
  pastikan(!ps1.includes('Get-FileHash'), 'Dilarang memakai cmdlet Get-FileHash yang bermasalah di CI Windows');
  pastikan(ps1.includes('System.Security.Cryptography.SHA256'), 'Wajib memakai .NET SHA256');
  pastikan(ps1.includes('UTF8Encoding($false)'), 'Wajib menulis receipt JSON UTF-8 tanpa BOM menggunakan UTF8Encoding($false)');
  pastikan(!/Set-Content\s+.*-Encoding\s+UTF8/i.test(ps1), 'Dilarang memakai Set-Content -Encoding UTF8 yang menulis BOM di PS 5.1');

  const linuxBundle = DesktopInstallerGenerator.generate({
    appName: 'nusa_demo',
    appVersion: 'v0.23.5',
    target: 'linux-x86_64',
    os: 'linux',
    binRelativePath: 'bin/nusa_demo',
  });
  pastikan(linuxBundle.files.some((f) => f.name === 'install.sh') && linuxBundle.files.some((f) => f.name === 'uninstall.sh'), 'Wajib ada install.sh & uninstall.sh');
});

uji('5.1b Pembaca JSON defensif (bacaJsonAman) menangani JSON tanpa BOM, dengan BOM, dan menolak JSON rusak', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-bom-test-'));
  try {
    // A. UTF-8 tanpa BOM
    const noBomPath = path.join(tmp, 'clean.json');
    fs.writeFileSync(noBomPath, Buffer.from('{"appName":"nusa_demo","ok":true}', 'utf-8'));
    const parsedA = bacaJsonAman(noBomPath, 'test-no-bom');
    samaDengan(parsedA.appName, 'nusa_demo');
    samaDengan(parsedA.ok, true);

    // B. UTF-8 dengan BOM (EF BB BF) di offset 0
    const withBomPath = path.join(tmp, 'bom.json');
    const bomPrefix = Buffer.from([0xef, 0xbb, 0xbf]);
    const payloadBuf = Buffer.from('{"appName":"nusa_bom","verified":2}', 'utf-8');
    fs.writeFileSync(withBomPath, Buffer.concat([bomPrefix, payloadBuf]));
    const parsedB = bacaJsonAman(withBomPath, 'test-with-bom');
    samaDengan(parsedB.appName, 'nusa_bom');
    samaDengan(parsedB.verified, 2);

    // C. JSON rusak tetap wajib gagal dengan konteks diagnostik
    const corruptPath = path.join(tmp, 'corrupt.json');
    fs.writeFileSync(corruptPath, Buffer.concat([bomPrefix, Buffer.from('{bad json', 'utf-8')]));
    let threw = false;
    try {
      bacaJsonAman(corruptPath, 'test-corrupt');
    } catch (e: any) {
      threw = true;
      pastikan(
        String(e.message).includes('test-corrupt') && String(e.message).includes('corrupt.json'),
        'Error JSON rusak wajib menyertakan tahap dan nama berkas'
      );
    }
    pastikan(threw, 'JSON tidak valid wajib melempar galat');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('5.2 Sandbox lifecycle POSIX installer (install.sh -> verifikasi -> tamper rejection -> uninstall.sh)', () => {
  if (process.platform === 'win32') {
    return 'BELUM_DIVERIFIKASI';
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-posix-sbx-'));
  try {
    const outDir = path.join(tmp, 'pkg');
    const prefixDir = path.join(tmp, 'prefix');
    const fakeHome = path.join(tmp, 'home');
    fs.mkdirSync(fakeHome, { recursive: true });

    const pkg = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_posix_demo',
      appVersion: 'v0.23.5',
      target: process.platform === 'darwin' ? 'macos-arm64' : 'linux-x86_64',
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: outDir,
    });

    const installRes = DesktopInstallerGenerator.runPosixScriptInSandbox(
      pkg.packageDirectory,
      'install.sh',
      prefixDir,
      fakeHome
    );
    pastikan(installRes.success, `install.sh gagal: ${installRes.stderr}`);
    pastikan(fs.existsSync(path.join(prefixDir, 'bin/nusa_posix_demo')), 'Biner harus terpasang di prefix');

    const profileText = fs.readFileSync(path.join(fakeHome, '.profile'), 'utf-8');
    pastikan(profileText.includes('NUSANTARA nusa_posix_demo PATH'), 'RC PATH marker harus ditulis');

    // Tamper test
    const tamperedBin = path.join(pkg.packageDirectory, 'bin/nusa_posix_demo');
    const origContent = fs.readFileSync(tamperedBin);
    fs.writeFileSync(tamperedBin, '#!/bin/sh\necho TAMPERED\n');
    const tamperRes = DesktopInstallerGenerator.runPosixScriptInSandbox(
      pkg.packageDirectory,
      'install.sh',
      prefixDir,
      fakeHome
    );
    pastikan(!tamperRes.success, 'install.sh wajib menolak paket jika checksum berubah');
    fs.writeFileSync(tamperedBin, origContent);

    const uninstRes = DesktopInstallerGenerator.runPosixScriptInSandbox(
      pkg.packageDirectory,
      'uninstall.sh',
      prefixDir,
      fakeHome
    );
    pastikan(uninstRes.success, `uninstall.sh gagal: ${uninstRes.stderr}`);
    pastikan(!fs.existsSync(path.join(prefixDir, 'bin/nusa_posix_demo')), 'Biner harus terhapus setelah uninstall');
    const cleanedProfile = fs.readFileSync(path.join(fakeHome, '.profile'), 'utf-8');
    pastikan(!cleanedProfile.includes('NUSANTARA nusa_posix_demo PATH'), 'RC marker harus dibersihkan setelah uninstall');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('5.3 Sandbox lifecycle PowerShell installer untuk paket script-launcher (.cmd) & JSON receipt bebas BOM', () => {
  const ps = DesktopInstallerGenerator.detectWindowsPowerShell();
  if (!ps.found) {
    return 'BELUM_DIVERIFIKASI';
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-win-ps-53-'));
  try {
    const pkgOut = path.join(tmp, 'dist');
    const prefixDir = path.join(tmp, 'prefix');

    // 1. Package script-launcher v1
    const pkgV1 = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_demo_win',
      appVersion: 'v0.23.5',
      target: 'windows-x86_64',
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: pkgOut,
    });
    const cmdBin = path.join(pkgV1.packageDirectory, 'bin/nusa_demo_win.cmd');
    pastikan(fs.existsSync(cmdBin), 'Paket script-launcher Windows harus menghasilkan bin/nusa_demo_win.cmd');

    // 2. Jalankan install.ps1
    const inst1 = DesktopInstallerGenerator.runWindowsScriptInSandbox(
      pkgV1.packageDirectory,
      'install.ps1',
      prefixDir,
      { noPath: true }
    );
    pastikan(inst1.success, `install.ps1 v1 gagal (exit=${inst1.exitCode}): ${inst1.stderr || inst1.stdout}`);

    const installedCmd = path.join(prefixDir, 'bin', 'nusa_demo_win.cmd');
    const installedManifest = path.join(prefixDir, 'share', 'nusa_demo_win', 'manifest.json');
    const receiptPath = path.join(prefixDir, '.nusa_demo_win-install-manifest.json');
    pastikan(fs.existsSync(installedCmd), 'bin/nusa_demo_win.cmd harus terpasang di prefix');
    pastikan(fs.existsSync(installedManifest), 'share/nusa_demo_win/manifest.json harus terpasang');
    pastikan(fs.existsSync(receiptPath), '.nusa_demo_win-install-manifest.json harus terbentuk');

    // 3. Verifikasi receipt JSON bebas BOM UTF-8 secara ketat di disk & dapat di-parse langsung
    const receiptBytes = fs.readFileSync(receiptPath);
    const hasBom =
      receiptBytes.length >= 3 &&
      receiptBytes[0] === 0xef &&
      receiptBytes[1] === 0xbb &&
      receiptBytes[2] === 0xbf;
    pastikan(!hasBom, 'Receipt JSON hasil install.ps1 tidak boleh diawali UTF-8 BOM (EF BB BF)');
    const receiptData = bacaJsonAman(receiptPath, 'test-5.3-install');
    samaDengan(receiptData.appName, 'nusa_demo_win');
    samaDengan(receiptData.appVersion, 'v0.23.5');
    pastikan(receiptData.verifiedFilesCount > 0, 'verifiedFilesCount harus > 0');

    // 4. Upgrade v2 -> manifest & receipt diperbarui bersih
    const pkgOut2 = path.join(tmp, 'dist2');
    const pkgV2 = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_demo_win',
      appVersion: 'v0.23.6',
      target: 'windows-x86_64',
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: pkgOut2,
    });
    const inst2 = DesktopInstallerGenerator.runWindowsScriptInSandbox(
      pkgV2.packageDirectory,
      'install.ps1',
      prefixDir,
      { noPath: true }
    );
    pastikan(inst2.success, `Upgrade install.ps1 gagal: ${inst2.stderr || inst2.stdout}`);
    const receiptV2 = bacaJsonAman(receiptPath, 'test-5.3-upgrade');
    samaDengan(receiptV2.appVersion, 'v0.23.6');

    // 5. Tamper check -> install.ps1 wajib gagal tanpa merusak bin terpasang
    const targetToTamper = path.join(pkgV2.packageDirectory, 'bin', 'nusa_demo_win.cmd');
    const savedBytes = fs.readFileSync(targetToTamper);
    fs.writeFileSync(targetToTamper, '@echo TAMPERED\r\n');
    const tamperRes = DesktopInstallerGenerator.runWindowsScriptInSandbox(
      pkgV2.packageDirectory,
      'install.ps1',
      prefixDir,
      { noPath: true }
    );
    pastikan(!tamperRes.success, 'install.ps1 wajib menolak paket dengan checksum SHA-256 tidak cocok');
    fs.writeFileSync(targetToTamper, savedBytes);

    // 6. Uninstall -> hapus biner, share manifest, dan receipt
    const uninst = DesktopInstallerGenerator.runWindowsScriptInSandbox(
      pkgV2.packageDirectory,
      'uninstall.ps1',
      prefixDir,
      { noPath: true }
    );
    pastikan(uninst.success, `uninstall.ps1 gagal: ${uninst.stderr || uninst.stdout}`);
    pastikan(!fs.existsSync(installedCmd), 'bin/nusa_demo_win.cmd harus terhapus setelah uninstall');
    pastikan(!fs.existsSync(receiptPath), 'Receipt manifest harus terhapus setelah uninstall');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('5.4 Sandbox lifecycle PowerShell installer untuk executable native PE32+ x86_64 nyata (nusa_demo_win.exe)', () => {
  const ps = DesktopInstallerGenerator.detectWindowsPowerShell();
  const capWin = TargetMatrixManager.inspectTargetCapability('windows-x86_64');
  if (process.platform !== 'win32' || !ps.found || !capWin.canBuildNative) {
    return 'BELUM_DIVERIFIKASI';
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-win-ps-54-'));
  try {
    const buildDir = path.join(tmp, 'build');
    const pkgOut = path.join(tmp, 'dist');
    const prefixDir = path.join(tmp, 'prefix');

    const src = `
program DemoWinNative
mulai
  tampilkan("NUSANTARA_WIN_PE_INSTALLER_OK")
selesai
`;
    const buildRes = NativeBuildPipeline.build({
      sourceCode: src,
      appName: 'nusa_demo_win',
      target: 'windows-x86_64',
      outputDirectory: buildDir,
      optLevel: 'O2',
      verifyExecution: true,
    });
    pastikan(buildRes.success && Boolean(buildRes.executablePath), `Kompilasi PE32+ gagal: ${buildRes.diagnostics.join(' | ')}`);

    const pkg = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_demo_win',
      appVersion: 'v0.23.5',
      target: 'windows-x86_64',
      mode: 'release',
      packageKind: 'native',
      outputDirectory: pkgOut,
      nativeBuildResult: buildRes,
    });

    const instRes = DesktopInstallerGenerator.runWindowsScriptInSandbox(
      pkg.packageDirectory,
      'install.ps1',
      prefixDir,
      { noPath: true }
    );
    pastikan(instRes.success, `install.ps1 PE32+ gagal: ${instRes.stderr || instRes.stdout}`);

    const installedExe = path.join(prefixDir, 'bin', 'nusa_demo_win.exe');
    const receiptPath = path.join(prefixDir, '.nusa_demo_win-install-manifest.json');
    pastikan(fs.existsSync(installedExe), 'bin/nusa_demo_win.exe harus terpasang');

    const peMeta = BinaryInspector.inspectStrict(installedExe);
    pastikan(
      Boolean(peMeta.isValidExecutable) && peMeta.format === 'COFF' && peMeta.architecture === 'x86_64',
      'Executable terpasang wajib berformat PE32+ x86_64 valid'
    );

    const execOut = safeCP.spawnSync(installedExe, [], { encoding: 'utf-8', timeout: 10000, shell: false });
    samaDengan(execOut.status, 0, 'Executable terpasang wajib berjalan dengan exit 0');
    pastikan(
      (execOut.stdout || '').includes('NUSANTARA_WIN_PE_INSTALLER_OK'),
      `Stdout executable terpasang tidak cocok: '${execOut.stdout}'`
    );

    const receiptBytes = fs.readFileSync(receiptPath);
    pastikan(
      !(receiptBytes.length >= 3 && receiptBytes[0] === 0xef && receiptBytes[1] === 0xbb && receiptBytes[2] === 0xbf),
      'Receipt native .exe tidak boleh memiliki UTF-8 BOM'
    );
    const receiptJson = bacaJsonAman(receiptPath, 'test-5.4-native');
    samaDengan(receiptJson.appName, 'nusa_demo_win');

    const uninst = DesktopInstallerGenerator.runWindowsScriptInSandbox(
      pkg.packageDirectory,
      'uninstall.ps1',
      prefixDir,
      { noPath: true }
    );
    pastikan(uninst.success, `uninstall.ps1 PE32+ gagal: ${uninst.stderr}`);
    pastikan(!fs.existsSync(installedExe), 'nusa_demo_win.exe harus terhapus setelah uninstall');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// GRUP 6: STANDALONE PACKAGER & CLI INFO
// -----------------------------------------------------------------------------
console.log('\n[GRUP 6] StandalonePackager Lintas OS & Informasi CLI');

uji('6.1 StandalonePackager menolak skrip shell jika requireNativeBinary=true', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-sa-reject-'));
  try {
    const fake = path.join(tmp, 'not_native');
    fs.writeFileSync(fake, '#!/bin/sh\necho fake\n');
    const res = StandalonePackager.package({
      appName: 'uji_tolak',
      appVersion: '0.23.5',
      executablePath: fake,
      outputDirectory: tmp,
      requireNativeBinary: true,
    });
    pastikan(!res.success, 'StandalonePackager wajib menolak skrip jika requireNativeBinary=true');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('6.2 StandalonePackager menyertakan skrip installer sesuai target OS (Windows/Linux/macOS)', () => {
  const cases: Array<{ target: string; os: 'windows' | 'linux' | 'darwin'; expectedInstallers: string[] }> = [
    { target: 'windows-x86_64', os: 'windows', expectedInstallers: ['install.ps1', 'uninstall.ps1', 'install.bat', 'uninstall.bat'] },
    { target: 'linux-x86_64', os: 'linux', expectedInstallers: ['install.sh', 'uninstall.sh'] },
    { target: 'macos-arm64', os: 'darwin', expectedInstallers: ['install.sh', 'uninstall.sh'] },
  ];

  for (const c of cases) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `nusa-sa-${c.os}-`));
    try {
      const dummy = path.join(tmp, c.os === 'windows' ? 'app.exe' : 'app');
      fs.writeFileSync(
        dummy,
        c.os === 'windows'
          ? buildMinimalPe32Plus('x86_64')
          : c.os === 'darwin'
          ? buildMinimalMachO64('aarch64')
          : buildMinimalElf64('x86_64')
      );
      const res = StandalonePackager.package({
        appName: `app_${c.os}`,
        appVersion: '0.23.5',
        executablePath: dummy,
        outputDirectory: tmp,
        targetPlatform: c.target,
        requireNativeBinary: true,
        includeInstallers: true,
      });
      pastikan(res.success, `StandalonePackager gagal untuk ${c.target}: ${res.diagnostics.join(' | ')}`);
      samaDengan(res.targetOS, c.os);
      for (const instFile of c.expectedInstallers) {
        pastikan(
          Boolean(res.installerFiles?.includes(instFile)) && fs.existsSync(path.join(res.standaloneDirectory, instFile)),
          `Installer '${instFile}' wajib ada untuk target '${c.target}'`
        );
      }
      pastikan(Boolean(res.sha256sumsPath && fs.existsSync(res.sha256sumsPath)), 'SHA256SUMS wajib ada');
      pastikan(Boolean(res.archivePath && fs.existsSync(res.archivePath)), 'Arsip .tar.gz wajib ada');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
});

uji('6.3 Perintah CLI "nusantara info --json" memuat 6 target kanonik resmi', () => {
  const logs: string[] = [];
  const cli = new NusantaraCLI({ log: (m) => logs.push(m) });
  const code = cli.jalankan(['info', '--json']);
  samaDengan(code, 0);
  const parsed = JSON.parse(logs.join('\n'));
  samaDengan(parsed.targetDidukung.length, 6, 'info --json harus memuat 6 target kanonik');
});

// -----------------------------------------------------------------------------
// GRUP 7: PHASE 23.7 SIX-TARGET CERTIFICATION AGGREGATION & DISTRIBUTION GATE
// -----------------------------------------------------------------------------
console.log('\n[GRUP 7] Gerbang Sertifikasi 6 Target Desktop & Audit Distribusi (Phase 23.7)');

function createValidEvidenceFixture(
  bundleDir: string,
  target: CanonicalDesktopTarget,
  overrideStatus?: 'PASS' | 'NOT_VERIFIED' | 'FAIL'
): Phase23TargetEvidence {
  const artDir = path.join(bundleDir, 'artifacts', target);
  fs.mkdirSync(artDir, { recursive: true });

  const triple = TargetTripleManager.resolve(target).triple;
  const llFile = path.join(artDir, 'app.ll');
  const objFile = path.join(artDir, target.startsWith('windows') ? 'app.obj' : 'app.o');
  const exeFile = path.join(artDir, target.startsWith('windows') ? 'app.exe' : 'app');
  const arcFile = path.join(artDir, target.startsWith('windows') ? `app-${target}.zip` : `app-${target}.tar.gz`);

  fs.writeFileSync(llFile, `; valid ir for ${target} (${triple})\ntarget triple = "${triple}"\n`, 'utf-8');
  const objBytes = Buffer.concat([Buffer.from([0x7f, 0x4f, 0x42, 0x4a]), Buffer.from(target, 'utf-8')]);
  fs.writeFileSync(objFile, objBytes);

  const arch = target.endsWith('arm64') ? 'aarch64' : 'x86_64';
  const format = target.startsWith('windows') ? 'COFF' : target.startsWith('macos') ? 'Mach-O' : 'ELF';
  const rawBin =
    format === 'COFF'
      ? buildMinimalPe32Plus(arch)
      : format === 'Mach-O'
      ? buildMinimalMachO64(arch)
      : buildMinimalElf64(arch);
  // Sisipkan penanda unik per target pada tail biner agar hash SHA-256 setiap target berbeda
  const binBytes = Buffer.concat([rawBin, Buffer.from(`NUSA_FIXTURE_${target}_${triple}`, 'utf-8')]);
  fs.writeFileSync(exeFile, binBytes);

  const arcBytes = target.startsWith('windows')
    ? ArchiveBuilder.createZip([{ name: `app-${target}/bin/app.exe`, content: binBytes, mode: 0o755 }], { reproducible: true })
    : ArchiveBuilder.createTarGz([{ name: `app-${target}/bin/app`, content: binBytes, mode: 0o755 }], { reproducible: true });
  fs.writeFileSync(arcFile, arcBytes);

  const llSha = ArchiveBuilder.computeSha256(fs.readFileSync(llFile));
  const objSha = ArchiveBuilder.computeSha256(objBytes);
  const binSha = ArchiveBuilder.computeSha256(binBytes);
  const arcSha = ArchiveBuilder.computeSha256(arcBytes);

  const llRel = `artifacts/${target}/app.ll`;
  const objRel = `artifacts/${target}/${path.basename(objFile)}`;
  const exeRel = `artifacts/${target}/${path.basename(exeFile)}`;
  const arcRel = `artifacts/${target}/${path.basename(arcFile)}`;

  const isRosetta = target === 'macos-x86_64';
  const hostOS = target.startsWith('windows') ? 'windows' : target.startsWith('macos') ? 'darwin' : 'linux';
  const hostArchitecture = isRosetta ? 'aarch64' : arch;
  const executionMode = isRosetta ? 'rosetta2' : 'native';
  const status: 'PASS' | 'NOT_VERIFIED' | 'FAIL' = overrideStatus || 'PASS';

  return {
    schemaVersion: '2.0',
    phase: 'Phase 23',
    generatedAt: '2026-11-16T00:00:00.000Z',
    target,
    targetTriple: triple,
    triple,
    hostOS,
    hostOs: hostOS === 'windows' ? 'win32' : hostOS,
    hostArchitecture,
    hostArch: hostArchitecture === 'aarch64' ? 'arm64' : 'x64',
    recommendedRunner:
      target === 'windows-x86_64'
        ? 'windows-latest'
        : target === 'windows-arm64'
        ? 'windows-11-arm'
        : target === 'linux-x86_64'
        ? 'ubuntu-latest'
        : target === 'linux-arm64'
        ? 'ubuntu-24.04-arm'
        : 'macos-latest',
    isCross: isRosetta,
    compiler: 'clang',
    compilerVersion: 'clang version 18.1.8',
    compilerDetails: { name: 'clang', available: true, version: 'clang version 18.1.8' },
    linker: format === 'COFF' ? 'lld-link' : format === 'Mach-O' ? 'ld' : 'lld',
    linkerVersion: 'LLD 18.1.8',
    linkerDetails: { name: format === 'COFF' ? 'lld-link' : 'lld', lldAvailable: true, version: 'LLD 18.1.8' },
    sysroot: hostOS === 'darwin' ? '/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk' : '/usr/lib',
    emulator: isRosetta
      ? { used: true, command: 'arch -x86_64', version: 'Rosetta 2' }
      : { used: false },
    sdk: { name: 'SDK', available: true, linkerProbeVerified: true, missingRequirements: [] },
    llvmIR: { path: llRel, sha256: llSha },
    objectFile: { path: objRel, sha256: objSha },
    objectFiles: [objRel],
    objectHashes: { [objRel]: objSha },
    binaryPath: exeRel,
    binaryFormat: format,
    binaryArchitecture: arch,
    binarySha256: binSha,
    executable: {
      path: exeRel,
      sha256: binSha,
      sizeBytes: binBytes.length,
    },
    binaryMetadata: {
      format,
      architecture: arch,
      binaryType: 'EXECUTABLE',
      isValidExecutable: true,
    },
    buildExitCode: 0,
    executionMode,
    executionExitCode: 0,
    executionSentinel: PHASE23_CERTIFICATION_SENTINEL,
    execution: {
      required: true,
      executed: true,
      mode: executionMode,
      exitCode: 0,
      stdout: `${PHASE23_CERTIFICATION_SENTINEL}\n42\n`,
      sentinelExpected: PHASE23_CERTIFICATION_SENTINEL,
      sentinelMatched: true,
    },
    distributionManifest: {
      appName: `nusa_cert_${target}`,
      appVersion: '0.23.7',
      target,
      legacyTarget: target,
      triple,
      operatingSystem: hostOS,
      architecture: arch,
      mode: 'release',
      packageKind: 'native',
      binaryFormat: format,
      linkingMode: 'auto',
      actualStaticLink: false,
      executable: `bin/${path.basename(exeFile)}`,
      executableSha256: binSha,
      installers: hostOS === 'windows' ? ['install.ps1', 'uninstall.ps1'] : ['install.sh', 'uninstall.sh'],
      dependencies: [],
      builtAt: '2026-11-16T00:00:00.000Z',
    },
    distributionArchivePath: arcRel,
    archiveSha256: arcSha,
    installResult: {
      status: 'PASS',
      exitCode: 0,
      installedBinaryPath: `/sandbox/${target}/bin/${path.basename(exeFile)}`,
      installedExecutionSentinel: PHASE23_CERTIFICATION_SENTINEL,
      upgradeVerified: true,
      tamperRejected: true,
    },
    uninstallResult: {
      status: 'PASS',
      exitCode: 0,
      leftoversDetected: false,
    },
    verificationStatus: status,
    status,
    statusCode: 'BERHASIL',
    diagnostics: [],
  };
}

function writeAll6Fixtures(
  bundleDir: string,
  mutator?: (target: CanonicalDesktopTarget, ev: Phase23TargetEvidence, evDir: string) => boolean | void
): string {
  const evDir = path.join(bundleDir, 'evidence');
  fs.mkdirSync(evDir, { recursive: true });
  for (const t of DESKTOP_CANONICAL_TARGETS) {
    const ev = createValidEvidenceFixture(bundleDir, t, 'PASS');
    const keep = mutator ? mutator(t, ev, evDir) : true;
    if (keep !== false) {
      fs.writeFileSync(path.join(evDir, `${t}.json`), JSON.stringify(ev, null, 2), 'utf-8');
    }
  }
  return evDir;
}

uji('7.1 Gerbang menolak jika ada target hilang (TARGET_HILANG)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-71-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t) => (t === 'windows-arm64' ? false : true));
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    samaDengan(agg.exitCode, 1);
    pastikan(agg.findings.some((f) => f.code === 'TARGET_HILANG' && f.target === 'windows-arm64'), 'Harus mencatat TARGET_HILANG');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.2 Gerbang menolak JSON rusak (JSON_RUSAK)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-72-'));
  try {
    const evDir = writeAll6Fixtures(tmp);
    fs.writeFileSync(path.join(evDir, 'linux-arm64.json'), '{CORRUPT_JSON', 'utf-8');
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    samaDengan(agg.exitCode, 1);
    pastikan(agg.findings.some((f) => f.code === 'JSON_RUSAK' && f.target === 'linux-arm64'), 'Harus mencatat JSON_RUSAK');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.3 Target NOT_VERIFIED menghasilkan PARTIAL & exitCode 1 (tidak boleh lulus)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-73-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'windows-arm64') {
        ev.status = 'NOT_VERIFIED';
        ev.verificationStatus = 'NOT_VERIFIED';
        ev.reason = 'MSVC ARM64 libs belum terpasang';
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'PARTIAL');
    samaDengan(agg.exitCode, 1);
    samaDengan(agg.counts.notVerified, 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.4 Target FAIL menghasilkan FAILED & exitCode 1', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-74-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'macos-x86_64') {
        ev.status = 'FAIL';
        ev.verificationStatus = 'FAIL';
        ev.reason = 'Linker error';
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    samaDengan(agg.exitCode, 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.5 Ketidakcocokan SHA-256 artefak di disk terdeteksi (SHA256_TIDAK_COCOK)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-75-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'linux-x86_64') {
        ev.binarySha256 = '0'.repeat(64);
        ev.executable.sha256 = '0'.repeat(64);
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    pastikan(agg.findings.some((f) => f.code === 'SHA256_TIDAK_COCOK'), 'Wajib mendeteksi mismatch SHA-256');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.6 Salah arsitektur biner executable terdeteksi (ARSITEKTUR_BINER_SALAH)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-76-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'linux-arm64') {
        // Tulis ELF x86_64 padahal targetnya linux-arm64, dengan hash yang valid untuk byte itu
        const wrongBin = Buffer.concat([buildMinimalElf64('x86_64'), Buffer.from('WRONG_ARCH_PAYLOAD')]);
        const diskPath = path.join(tmp, ev.binaryPath);
        fs.writeFileSync(diskPath, wrongBin);
        const wrongSha = ArchiveBuilder.computeSha256(wrongBin);
        ev.binarySha256 = wrongSha;
        ev.executable.sha256 = wrongSha;
        if (ev.distributionManifest) {
          (ev.distributionManifest as any).executableSha256 = wrongSha;
        }
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    pastikan(agg.findings.some((f) => f.code === 'ARSITEKTUR_BINER_SALAH'), 'Wajib mendeteksi salah arsitektur');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.7 Bukti eksekusi gagal atau sentinel hilang/palsu terdeteksi (EKSEKUSI_GAGAL)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-77-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'macos-arm64') {
        ev.execution.sentinelMatched = false;
        ev.execution.stdout = 'wrong output';
        ev.executionSentinel = '';
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    pastikan(agg.findings.some((f) => f.code === 'EKSEKUSI_GAGAL'), 'Wajib mendeteksi kegagalan sentinel eksekusi');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.8 Enam target PASS lintas OS (Windows, macOS + Rosetta 2, Linux + ARM64) di agregator Linux -> CERTIFIED', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-78-'));
  try {
    const evDir = writeAll6Fixtures(tmp);
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'CERTIFIED', `Temuan: ${JSON.stringify(agg.findings)}`);
    samaDengan(agg.exitCode, 0);
    samaDengan(agg.counts.pass, 6);
    pastikan(agg.markdownReport.includes('CERTIFIED'), 'Laporan Markdown wajib mencantumkan CERTIFIED');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.9 Gerbang menolak klaim eksekusi native tidak jujur pada target cross atau Rosetta', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-79-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'macos-x86_64') {
        ev.hostOS = 'darwin';
        ev.hostOs = 'darwin';
        ev.hostArchitecture = 'aarch64';
        ev.hostArch = 'arm64';
        ev.isCross = true;
        ev.executionMode = 'native';
        ev.execution.mode = 'native';
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    samaDengan(agg.exitCode, 1);
    pastikan(agg.findings.some((f) => f.code === 'EKSEKUSI_GAGAL' && f.target === 'macos-x86_64'), 'Wajib menolak klaim native pada target cross');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.10 package-lock.json menyertakan binding native lintas platform (Rolldown, Tailwind Oxide, LightningCSS, TS7)', () => {
  const lockPath = path.resolve('package-lock.json');
  pastikan(fs.existsSync(lockPath), 'package-lock.json wajib ada');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
  const requiredBindings = [
    'node_modules/@rolldown/binding-win32-x64-msvc',
    'node_modules/@rolldown/binding-win32-arm64-msvc',
    'node_modules/@rolldown/binding-darwin-arm64',
    'node_modules/@rolldown/binding-darwin-x64',
    'node_modules/@rolldown/binding-linux-arm64-gnu',
    'node_modules/@rolldown/binding-linux-x64-gnu',
    'node_modules/@tailwindcss/oxide-win32-x64-msvc',
    'node_modules/@tailwindcss/oxide-darwin-arm64',
    'node_modules/@tailwindcss/oxide-linux-x64-gnu',
    'node_modules/lightningcss-win32-x64-msvc',
    'node_modules/lightningcss-darwin-arm64',
    'node_modules/@typescript/typescript-win32-x64',
    'node_modules/@typescript/typescript-darwin-arm64',
  ];
  for (const pkgKey of requiredBindings) {
    const ent = lock.packages?.[pkgKey];
    pastikan(
      Boolean(ent && ent.version && ent.resolved && ent.integrity),
      `package-lock.json kehilangan entri/resolved/integrity untuk '${pkgKey}'`
    );
  }
});

uji('7.11 Siklus end-to-end arsip distribusi: package -> verify SHA256SUMS -> extract sandbox -> uninstall', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-dist-e2e-'));
  try {
    const distDir = path.join(tmp, 'dist');
    const extractDir = path.join(tmp, 'extract');
    const pkg = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_e2e_dist',
      appVersion: '0.23.7',
      target: 'linux-x86_64',
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: distDir,
      reproducible: true,
      includeInstallers: true,
    });
    const tgz = pkg.artifacts.find((a) => a.format === 'tar.gz');
    pastikan(Boolean(tgz && fs.existsSync(tgz.filePath)), 'Arsip .tar.gz harus terbentuk');
    ArchiveBuilder.extractTarGz(fs.readFileSync(tgz!.filePath), extractDir);
    const extractedPkgDir = path.join(extractDir, path.basename(pkg.packageDirectory));
    const sums = fs.readFileSync(path.join(extractedPkgDir, 'SHA256SUMS'), 'utf-8');
    const shaCheck = ArchiveBuilder.verifySha256SumsFromDirectory(extractedPkgDir, sums);
    pastikan(shaCheck.valid && shaCheck.checkedCount > 0, 'Berkas hasil ekstraksi arsip wajib lulus SHA256SUMS');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.12 Linux ARM64 via QEMU user-mode pada host x86_64 diterima hanya jika metadata emulator lengkap -> CERTIFIED', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-712-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'linux-arm64') {
        ev.hostOS = 'linux';
        ev.hostOs = 'linux';
        ev.hostArchitecture = 'x86_64';
        ev.hostArch = 'x64';
        ev.isCross = true;
        ev.executionMode = 'qemu-user';
        ev.execution.mode = 'qemu-user';
        ev.emulator = { used: true, command: 'qemu-aarch64', version: 'qemu-aarch64 version 8.2.2' };
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'CERTIFIED', `Temuan: ${JSON.stringify(agg.findings)}`);
    samaDengan(agg.exitCode, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.13 Gerbang menolak triple target salah (JSON_RUSAK)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-713-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'windows-arm64') {
        ev.targetTriple = 'x86_64-unknown-linux-gnu';
        ev.triple = 'x86_64-unknown-linux-gnu';
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    samaDengan(agg.exitCode, 1);
    pastikan(agg.findings.some((f) => f.code === 'JSON_RUSAK' && f.target === 'windows-arm64'), 'Triple salah wajib ditolak');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.14 Gerbang menolak evidence duplikat lintas target (DUPLIKAT_EVIDENCE)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-714-'));
  try {
    const evDir = writeAll6Fixtures(tmp);
    const winX64 = JSON.parse(fs.readFileSync(path.join(evDir, 'windows-x86_64.json'), 'utf-8')) as Phase23TargetEvidence;
    const linuxX64 = JSON.parse(fs.readFileSync(path.join(evDir, 'linux-x86_64.json'), 'utf-8')) as Phase23TargetEvidence;
    // Tiru jalur biner & sha256 yang sama persis lintas target
    linuxX64.binarySha256 = winX64.binarySha256;
    linuxX64.executable.sha256 = winX64.binarySha256;
    linuxX64.binaryPath = winX64.binaryPath;
    linuxX64.executable.path = winX64.binaryPath;
    fs.writeFileSync(path.join(evDir, 'linux-x86_64.json'), JSON.stringify(linuxX64, null, 2), 'utf-8');

    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    samaDengan(agg.exitCode, 1);
    pastikan(agg.findings.some((f) => f.code === 'DUPLIKAT_EVIDENCE'), 'Wajib mendeteksi duplikasi evidence lintas target');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.15 Gerbang menolak metadata compiler atau linker kosong (METADATA_TOOLCHAIN_KOSONG)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-715-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'linux-x86_64') {
        ev.compilerVersion = '';
        ev.linker = 'none';
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    pastikan(agg.findings.some((f) => f.code === 'METADATA_TOOLCHAIN_KOSONG'), 'Wajib menolak metadata toolchain kosong');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.16 Gerbang menolak sentinel palsu saat stdout eksekusi tidak memuat sentinel (EKSEKUSI_GAGAL)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-716-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'windows-x86_64') {
        ev.execution.sentinelMatched = true;
        ev.executionSentinel = PHASE23_CERTIFICATION_SENTINEL;
        ev.execution.stdout = 'hello without sentinel\n';
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    pastikan(agg.findings.some((f) => f.code === 'EKSEKUSI_GAGAL' && f.target === 'windows-x86_64'), 'Wajib menolak sentinel palsu');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.17 Gerbang menolak eksekusi qemu-user tanpa metadata emulator command/version (EKSEKUSI_GAGAL)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-717-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'linux-arm64') {
        ev.hostArchitecture = 'x86_64';
        ev.isCross = true;
        ev.executionMode = 'qemu-user';
        ev.execution.mode = 'qemu-user';
        ev.emulator = { used: true };
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    pastikan(agg.findings.some((f) => f.code === 'EKSEKUSI_GAGAL' && f.target === 'linux-arm64'), 'Wajib menolak qemu-user tanpa versi emulator');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.18 Gerbang menolak paket distribusi korup / archiveSha256 mismatch (SHA256_TIDAK_COCOK / DISTRIBUSI_GAGAL)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-718-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'linux-x86_64' && ev.distributionArchivePath) {
        fs.writeFileSync(path.join(tmp, ev.distributionArchivePath), Buffer.from('CORRUPT_ARCHIVE_BYTES'));
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    pastikan(
      agg.findings.some((f) => f.target === 'linux-x86_64' && (f.code === 'SHA256_TIDAK_COCOK' || f.code === 'DISTRIBUSI_GAGAL')),
      'Arsip distribusi korup wajib digagalkan'
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.19 Gerbang menolak install FAIL atau uninstall meninggalkan sisa berkas (DISTRIBUSI_GAGAL)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-719-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'windows-x86_64') {
        ev.installResult.status = 'FAIL';
      }
      if (t === 'macos-arm64') {
        ev.uninstallResult.leftoversDetected = true;
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    pastikan(agg.findings.some((f) => f.code === 'DISTRIBUSI_GAGAL' && f.target === 'windows-x86_64'), 'Install FAIL wajib ditolak');
    pastikan(agg.findings.some((f) => f.code === 'DISTRIBUSI_GAGAL' && f.target === 'macos-arm64'), 'Uninstall dengan leftovers wajib ditolak');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.20 Gerbang menolak paket upgrade tidak valid atau gagal menolak tamper (DISTRIBUSI_GAGAL)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-720-'));
  try {
    const evDir = writeAll6Fixtures(tmp, (t, ev) => {
      if (t === 'linux-arm64') {
        ev.installResult.upgradeVerified = false;
      }
      if (t === 'macos-x86_64') {
        ev.installResult.tamperRejected = false;
      }
    });
    const agg = Phase23CertificationEngine.aggregateEvidence(evDir, { baseDir: tmp });
    samaDengan(agg.overallStatus, 'FAILED');
    pastikan(agg.findings.some((f) => f.code === 'DISTRIBUSI_GAGAL' && f.target === 'linux-arm64'), 'Upgrade belum terverifikasi wajib ditolak');
    pastikan(agg.findings.some((f) => f.code === 'DISTRIBUSI_GAGAL' && f.target === 'macos-x86_64'), 'Tamper tidak ditolak wajib ditolak');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.21 Siklus upgrade v2 korup pada sandbox POSIX gagal tanpa merusak biner terpasang v1', () => {
  if (process.platform === 'win32') {
    return 'BELUM_DIVERIFIKASI';
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-upgrade-tamper-'));
  try {
    const prefixDir = path.join(tmp, 'prefix');
    const fakeHome = path.join(tmp, 'home');
    fs.mkdirSync(fakeHome, { recursive: true });

    const target = process.platform === 'darwin' ? 'macos-arm64' : 'linux-x86_64';
    const pkgV1 = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_upg_guard',
      appVersion: '0.23.7',
      target,
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: path.join(tmp, 'd1'),
    });
    const inst1 = DesktopInstallerGenerator.runPosixScriptInSandbox(pkgV1.packageDirectory, 'install.sh', prefixDir, fakeHome);
    pastikan(inst1.success, `Install v1 gagal: ${inst1.stderr}`);
    const installedBin = path.join(prefixDir, 'bin/nusa_upg_guard');
    const shaV1 = ArchiveBuilder.computeSha256(fs.readFileSync(installedBin));

    // Paket upgrade v2 dirusak checksum binernya sebelum diinstal
    const pkgV2 = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_upg_guard',
      appVersion: '0.23.8',
      target,
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: path.join(tmp, 'd2'),
    });
    fs.writeFileSync(path.join(pkgV2.packageDirectory, 'bin/nusa_upg_guard'), '#!/bin/sh\necho CORRUPT_UPGRADE\n');
    const upgRes = DesktopInstallerGenerator.runPosixScriptInSandbox(pkgV2.packageDirectory, 'install.sh', prefixDir, fakeHome);
    pastikan(!upgRes.success, 'Upgrade v2 korup wajib ditolak oleh install.sh');
    samaDengan(ArchiveBuilder.computeSha256(fs.readFileSync(installedBin)), shaV1, 'Biner v1 terpasang tidak boleh rusak saat upgrade korup ditolak');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.22 Keamanan arsip menolak entri symlink pada ZIP dan TAR.GZ', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-symlink-sec-'));
  try {
    // 1. Uji penolakan symlink ZIP (unixMode 0o120777)
    const zipBytes = Buffer.from(
      ArchiveBuilder.createZip([{ name: 'evil-link', content: '/etc/passwd', mode: 0o644 }])
    );
    // Ubah external file attributes di Central Directory menjadi S_IFLNK (0o120777 << 16)
    const cdSig = zipBytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    pastikan(cdSig >= 0, 'Central Directory ZIP harus ditemukan');
    zipBytes.writeUInt32LE(((0o120777 & 0xffff) << 16) >>> 0, cdSig + 38);

    let zipSymlinkRejected = false;
    try {
      ArchiveBuilder.extractZip(zipBytes, path.join(tmp, 'out-zip'));
    } catch (err: any) {
      zipSymlinkRejected = String(err?.message || err).toLowerCase().includes('symlink');
    }
    pastikan(zipSymlinkRejected, 'ArchiveBuilder.extractZip wajib menolak entri symlink');

    // 2. Uji penolakan symlink TAR.GZ (typeFlag '2')
    const validTgz = ArchiveBuilder.createTarGz([{ name: 'evil-tar-link', content: 'target', mode: 0o644 }]);
    const tarBuf = Buffer.from(zlib.gunzipSync(Buffer.from(validTgz)));
    tarBuf[156] = '2'.charCodeAt(0); // symlink typeFlag
    tarBuf.fill(0x20, 148, 156);
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += tarBuf[i];
    tarBuf.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
    const maliciousTgz = zlib.gzipSync(tarBuf);

    let tarSymlinkRejected = false;
    try {
      ArchiveBuilder.extractTarGz(maliciousTgz, path.join(tmp, 'out-tar'));
    } catch (err: any) {
      tarSymlinkRejected = String(err?.message || err).toLowerCase().includes('symlink');
    }
    pastikan(tarSymlinkRejected, 'ArchiveBuilder.extractTarGz wajib menolak entri symlink');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.23 Perlindungan archive bomb menolak payload dekompresi berlebih pada ZIP & TAR.GZ', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-bomb-sec-'));
  try {
    // Buat data sangat repetitif 256 KB yang terkompresi menjadi < 1 KB (rasio > 250x)
    const repetitive = Buffer.alloc(256 * 1024, 0x41);
    const bombZip = ArchiveBuilder.createZip([{ name: 'bomb.bin', content: repetitive, mode: 0o644 }]);
    const bombTgz = ArchiveBuilder.createTarGz([{ name: 'bomb.bin', content: repetitive, mode: 0o644 }]);

    let zipBombBlocked = false;
    try {
      ArchiveBuilder.extractZip(bombZip, path.join(tmp, 'zip-bomb'), {
        maxEntryBytes: 64 * 1024,
        maxTotalBytes: 64 * 1024,
      });
    } catch (err: any) {
      zipBombBlocked = String(err?.message || err).toLowerCase().includes('archive bomb');
    }
    pastikan(zipBombBlocked, 'ArchiveBuilder.extractZip wajib memblokir archive bomb melebihi batas');

    let tarBombBlocked = false;
    try {
      ArchiveBuilder.extractTarGz(bombTgz, path.join(tmp, 'tar-bomb'), {
        maxEntryBytes: 64 * 1024,
        maxTotalBytes: 64 * 1024,
      });
    } catch (err: any) {
      tarBombBlocked = String(err?.message || err).toLowerCase().includes('archive bomb');
    }
    pastikan(tarBombBlocked, 'ArchiveBuilder.extractTarGz wajib memblokir archive bomb melebihi batas');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.24 Ekstraksi arsip mempertahankan izin file executable POSIX (0o755)', () => {
  if (process.platform === 'win32') {
    return 'BELUM_DIVERIFIKASI';
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-perm-sec-'));
  try {
    const entries = [{ name: 'bin/nusa_exec', content: '#!/bin/sh\necho OK\n', mode: 0o755 }];
    const zipBytes = ArchiveBuilder.createZip(entries);
    const tgzBytes = ArchiveBuilder.createTarGz(entries);

    const zipOut = path.join(tmp, 'zip-out');
    const tgzOut = path.join(tmp, 'tgz-out');
    ArchiveBuilder.extractZip(zipBytes, zipOut);
    ArchiveBuilder.extractTarGz(tgzBytes, tgzOut);

    const zipMode = fs.statSync(path.join(zipOut, 'bin/nusa_exec')).mode & 0o777;
    const tgzMode = fs.statSync(path.join(tgzOut, 'bin/nusa_exec')).mode & 0o777;
    pastikan((zipMode & 0o111) !== 0, `ZIP harus mempertahankan bit eksekusi (got 0o${zipMode.toString(8)})`);
    pastikan((tgzMode & 0o111) !== 0, `TAR.GZ harus mempertahankan bit eksekusi (got 0o${tgzMode.toString(8)})`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.25 Rollback atomik saat instalasi/upgrade gagal memulihkan biner dan manifest v1 tanpa sisa file sementara', () => {
  if (process.platform === 'win32') {
    return 'BELUM_DIVERIFIKASI';
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-rollback-atomic-'));
  try {
    const prefixDir = path.join(tmp, 'prefix');
    const fakeHome = path.join(tmp, 'home');
    fs.mkdirSync(fakeHome, { recursive: true });
    const target = process.platform === 'darwin' ? 'macos-arm64' : 'linux-x86_64';

    const pkgV1 = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_rb_app',
      appVersion: '0.23.9',
      target,
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: path.join(tmp, 'd1'),
    });
    const inst1 = DesktopInstallerGenerator.runPosixScriptInSandbox(pkgV1.packageDirectory, 'install.sh', prefixDir, fakeHome);
    pastikan(inst1.success, `Install v1 wajib sukses: ${inst1.stderr}`);

    const installedBin = path.join(prefixDir, 'bin/nusa_rb_app');
    const installedManifest = path.join(prefixDir, 'share/nusa_rb_app/manifest.json');
    const v1BinSha = ArchiveBuilder.computeSha256(fs.readFileSync(installedBin));
    const v1MfSha = ArchiveBuilder.computeSha256(fs.readFileSync(installedManifest));

    // Simulasikan gangguan tengah-jalan saat upgrade v2: uninstall.sh hilang tapi masuk SHA256SUMS, atau manifest dir-konflik
    const pkgV2 = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_rb_app',
      appVersion: '0.23.10',
      target,
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: path.join(tmp, 'd2'),
    });
    // Ganti share/nusa_rb_app/uninstall.sh dengan direktori baca-saja agar `cp -f` gagal SETELAH memindahkan biner!
    const destUninstall = path.join(prefixDir, 'share/nusa_rb_app/uninstall.sh');
    fs.unlinkSync(destUninstall);
    fs.mkdirSync(destUninstall, { recursive: true });

    const failUpg = DesktopInstallerGenerator.runPosixScriptInSandbox(pkgV2.packageDirectory, 'install.sh', prefixDir, fakeHome);
    pastikan(!failUpg.success, 'Upgrade v2 yang gagal di tengah langkah wajib mengembalikan exit non-zero dan memicu rollback');
    samaDengan(ArchiveBuilder.computeSha256(fs.readFileSync(installedBin)), v1BinSha, 'Rollback atomik wajib memulihkan biner v1 secara utuh');
    samaDengan(ArchiveBuilder.computeSha256(fs.readFileSync(installedManifest)), v1MfSha, 'Rollback atomik wajib memulihkan manifest v1 secara utuh');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.26 Uninstall bersih hanya menghapus berkas paket dan menjaga berkas pengguna lain tetap utuh', () => {
  if (process.platform === 'win32') {
    return 'BELUM_DIVERIFIKASI';
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-uninst-preserve-'));
  try {
    const prefixDir = path.join(tmp, 'prefix');
    const fakeHome = path.join(tmp, 'home');
    fs.mkdirSync(path.join(prefixDir, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(prefixDir, 'share', 'custom_user_app'), { recursive: true });
    fs.mkdirSync(fakeHome, { recursive: true });

    const userBin = path.join(prefixDir, 'bin', 'other_user_tool');
    const userShare = path.join(prefixDir, 'share', 'custom_user_app', 'config.txt');
    const userProfile = path.join(fakeHome, '.profile');
    fs.writeFileSync(userBin, '#!/bin/sh\necho USER_TOOL\n', { mode: 0o755 });
    fs.writeFileSync(userShare, 'KEEP_ME=1\n');
    fs.writeFileSync(userProfile, 'export USER_CUSTOM_ENV=preserved\n');

    const target = process.platform === 'darwin' ? 'macos-arm64' : 'linux-x86_64';
    const pkg = DesktopDistributionPackager.packageTarget({
      appName: 'nusa_clean_uninst',
      appVersion: '0.23.10',
      target,
      mode: 'release',
      packageKind: 'script-launcher',
      outputDirectory: path.join(tmp, 'dist'),
    });

    const instRes = DesktopInstallerGenerator.runPosixScriptInSandbox(pkg.packageDirectory, 'install.sh', prefixDir, fakeHome);
    pastikan(instRes.success, `Install gagal: ${instRes.stderr}`);
    pastikan(fs.readFileSync(userProfile, 'utf-8').includes('NUSANTARA nusa_clean_uninst PATH'), '.profile harus memuat blok PATH saat terpasang');

    const uninstRes = DesktopInstallerGenerator.runPosixScriptInSandbox(pkg.packageDirectory, 'uninstall.sh', prefixDir, fakeHome);
    pastikan(uninstRes.success, `Uninstall gagal: ${uninstRes.stderr}`);

    pastikan(!fs.existsSync(path.join(prefixDir, 'bin', 'nusa_clean_uninst')), 'Biner paket harus terhapus');
    pastikan(!fs.existsSync(path.join(prefixDir, 'share', 'nusa_clean_uninst')), 'Direktori share paket harus terhapus');
    pastikan(fs.existsSync(userBin), 'Biner milik pengguna di prefix/bin tidak boleh terhapus');
    samaDengan(fs.readFileSync(userShare, 'utf-8'), 'KEEP_ME=1\n', 'Data aplikasi pengguna di prefix/share tidak boleh terhapus');
    const postProfile = fs.readFileSync(userProfile, 'utf-8');
    pastikan(!postProfile.includes('NUSANTARA nusa_clean_uninst PATH'), 'Blok PATH paket harus bersih dari .profile');
    pastikan(postProfile.includes('export USER_CUSTOM_ENV=preserved'), 'Konfigurasi .profile milik pengguna harus tetap utuh');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

uji('7.27 TargetTripleManager menyediakan metadata ABI, CPU default, dan flag CPU untuk seluruh 6 target', () => {
  const checks: Array<{ target: CanonicalDesktopTarget; expectedAbi: string; expectedCpu: string }> = [
    { target: 'linux-x86_64', expectedAbi: 'gnu', expectedCpu: 'x86-64' },
    { target: 'linux-arm64', expectedAbi: 'gnu', expectedCpu: 'generic' },
    { target: 'windows-x86_64', expectedAbi: 'msvc', expectedCpu: 'x86-64' },
    { target: 'windows-arm64', expectedAbi: 'msvc', expectedCpu: 'generic' },
    { target: 'macos-x86_64', expectedAbi: 'darwin-macho', expectedCpu: 'x86-64' },
    { target: 'macos-arm64', expectedAbi: 'darwin-macho', expectedCpu: 'apple-m1' },
  ];
  for (const item of checks) {
    const info = TargetTripleManager.resolve(item.target);
    samaDengan(info.abi, item.expectedAbi, `ABI untuk ${item.target}`);
    samaDengan(info.defaultCpu, item.expectedCpu, `defaultCpu untuk ${item.target}`);
    pastikan(Array.isArray(info.cpuFlags) && info.cpuFlags.length > 0, `cpuFlags wajib terisi untuk ${item.target}`);
  }
});

uji('7.28 BinaryInspector tidak memalsukan simbol/library pada stub minimal dan menolak ELF e_shoff korup', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-insp-honest-'));
  try {
    // 1. Minimal synthetic ELF64 tanpa section/import tidak boleh mengarang printf/libc.so.6 palsu
    const minElf = path.join(tmp, 'min.elf');
    fs.writeFileSync(minElf, buildMinimalElf64('x86_64'));
    const metaMin = BinaryInspector.inspectStrict(minElf);
    pastikan(Boolean(metaMin.isValidExecutable), 'ELF64 header minimal harus valid');
    samaDengan(metaMin.importedSymbols.length, 0, 'Stub ELF tanpa symtab tidak boleh mengarang importedSymbols');
    samaDengan(metaMin.dynamicLibraries.length, 0, 'Stub ELF tanpa dynamic section tidak boleh mengarang dynamicLibraries');

    // 2. ELF64 dengan e_shoff/e_shnum di luar ukuran berkas wajib ditolak inspectStrict
    const badShElf = path.join(tmp, 'bad_sh.elf');
    const badBuf = buildMinimalElf64('x86_64');
    badBuf.writeBigUInt64LE(4096n, 40); // e_shoff di luar ukuran 128 byte
    badBuf.writeUInt16LE(64, 58); // e_shentsize
    badBuf.writeUInt16LE(2, 60); // e_shnum
    fs.writeFileSync(badShElf, badBuf);
    const badMeta = BinaryInspector.inspectStrict(badShElf);
    pastikan(!badMeta.isValidExecutable, 'ELF dengan section header table terpotong wajib ditolak inspectStrict');

    // 3. Jika host Linux memiliki biner nyata di disk (process.execPath), inspeksi membaca seksi nyata
    if (process.platform === 'linux' && fs.existsSync(process.execPath)) {
      const hostMeta = BinaryInspector.inspectStrict(process.execPath);
      pastikan(Boolean(hostMeta.isValidExecutable), 'Biner ELF host nyata wajib valid');
      pastikan(hostMeta.sections.length > 0, 'Parser native/readelf wajib mengekstrak seksi ELF nyata dari biner host');
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// REKAPITULASI
// -----------------------------------------------------------------------------
console.log('\n=============================================================================');
console.log(
  `HASIL PENGUJIAN PHASE 23: ${totalLulus} LULUS, ${totalGagal} GAGAL, ${totalBelumDiverifikasi} BELUM DIVERIFIKASI (Total: ${totalUji})`
);
console.log('=============================================================================');

if (totalGagal > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
