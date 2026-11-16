/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Skrip CLI Sertifikasi 6 Target Desktop — Phase 23.2 & Phase 23.6
 * Pemakaian:
 *   npx tsx scripts/phase23-certify.ts generate --target <target> --bundle-dir <dir> [--fail-on-missing-clang]
 *   npx tsx scripts/phase23-certify.ts verify-dist --target <target> [--out-dir <dir>] [--fail-on-missing-clang]
 *   npx tsx scripts/phase23-certify.ts aggregate --evidence-dir <dir> --report-out <mdPath> [--json-out <jsonPath>] [--step-summary] [--allow-incomplete]
 *   npx tsx scripts/phase23-certify.ts local-snapshot --bundle-dir artifacts/phase23
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  ArchiveBuilder,
  CanonicalDesktopTarget,
  DESKTOP_CANONICAL_TARGETS,
  DesktopDistributionPackager,
  DesktopInstallerGenerator,
  NativeBuildPipeline,
  Phase23CertificationEngine,
  TargetMatrixManager,
} from '../src/build';
import { BinaryInspector } from '../src/compiler/executable/binary-inspector';
import { safeCP } from '../src/compiler/llvm/node-compat';
import { TargetTripleManager } from '../src/compiler/llvm/target-triple';
import { VERSI_NUSANTARA } from '../src/konstanta/versi';

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function readJsonNoBomStrict(filePath: string): { hasBom: boolean; data: any } {
  const buf = fs.readFileSync(filePath);
  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  const text = (hasBom ? buf.subarray(3) : buf).toString('utf-8');
  return { hasBom, data: JSON.parse(text) };
}

function runGenerate(args: string[]): number {
  const rawTarget = getArg(args, '--target');
  const bundleDir = path.resolve(getArg(args, '--bundle-dir') || 'artifacts/phase23');
  const failOnMissingClang = hasFlag(args, '--fail-on-missing-clang');

  if (!rawTarget || !DESKTOP_CANONICAL_TARGETS.includes(rawTarget as CanonicalDesktopTarget)) {
    console.error(`[GALAT] Target harus salah satu dari: ${DESKTOP_CANONICAL_TARGETS.join(', ')}`);
    return 1;
  }

  const target = rawTarget as CanonicalDesktopTarget;
  const evidenceDir = path.join(bundleDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `nusa-cert-${target}-`));
  try {
    const cap = TargetMatrixManager.inspectTargetCapability(target);
    const ev = Phase23CertificationEngine.generateTargetEvidence({
      target,
      outputDir: workDir,
      artifactBundleDir: bundleDir,
      failOnMissingToolchain: failOnMissingClang && cap.supported,
      requireExecution: true,
    });

    const outJson = path.join(evidenceDir, `${target}.json`);
    fs.writeFileSync(outJson, JSON.stringify(ev, null, 2), 'utf-8');

    console.log(`[PHASE 23.2] Evidence ditulis: ${outJson}`);
    console.log(`[PHASE 23.2] Target=${target} Status=${ev.status} Mode=${ev.execution.mode}`);
    if (ev.reason) {
      console.log(`[PHASE 23.2] Alasan: ${ev.reason}`);
    }

    if (ev.status === 'FAIL') {
      console.error(`[FAIL] Target ${target} gagal sertifikasi.`);
      return 1;
    }
    return 0;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function runVerifyDist(args: string[]): number {
  const rawTarget = getArg(args, '--target');
  const outDir = path.resolve(getArg(args, '--out-dir') || 'dist-native/dist-verify');
  const failOnMissingClang = hasFlag(args, '--fail-on-missing-clang');

  const strict = TargetTripleManager.resolveStrict(rawTarget);
  if (!strict.supported || !strict.info.targetId) {
    console.error(`[GALAT] Target distribusi tidak valid '${rawTarget}': ${strict.error}`);
    return 1;
  }

  const canonical = strict.info.targetId as CanonicalDesktopTarget;
  const cap = TargetMatrixManager.inspectTargetCapability(canonical);
  const reportDir = path.join(outDir, 'reports');
  fs.mkdirSync(reportDir, { recursive: true });

  const errors: string[] = [];
  const report: Record<string, any> = {
    schemaVersion: '1.0',
    checkedAt: new Date().toISOString(),
    targetDiminta: rawTarget,
    targetTerdeteksi: canonical,
    triple: cap.triple,
    hostOs: process.platform,
    hostArch: process.arch,
    isCross: cap.isCross,
    executionMode: cap.executionMode,
    emulatorCommand: cap.emulatorCommand || null,
    pathOutput: [] as string[],
    hasilPemeriksaanExecutable: null,
    hasilSha256: 'NOT_RUN',
    hasilManifest: 'NOT_RUN',
    hasilEkstraksiArsip: 'NOT_RUN',
    hasilSandboxInstall: 'NOT_RUN',
    hasilEksekusiInstalled: 'NOT_RUN',
    hasilSandboxUninstall: 'NOT_RUN',
    statusAkhir: 'FAIL',
    daftarError: errors,
    exitCode: 1,
  };

  if (!cap.canBuildNative) {
    if (failOnMissingClang && !cap.toolchainAvailable) {
      report.statusAkhir = 'FAIL';
      errors.push(`Toolchain LLVM/Clang tidak terpasang untuk '${canonical}': ${cap.missingRequirements.join('; ')}`);
      report.exitCode = 1;
    } else {
      report.statusAkhir = 'NOT_VERIFIED';
      report.reason = `Target '${canonical}' tidak dapat di-build di host ini (${cap.missingRequirements.join('; ') || cap.diagnosticMessage}).`;
      report.exitCode = 0;
    }
    const rptPath = path.join(reportDir, `dist-verify-${canonical}.json`);
    fs.writeFileSync(rptPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`[DIST-VERIFY] Target=${canonical} Status=${report.statusAkhir} Laporan=${rptPath}`);
    if (errors.length > 0) {
      console.error(`[DIST-VERIFY] daftarError: ${errors.join(' | ')}`);
    } else {
      console.log(`[DIST-VERIFY] Alasan: ${report.reason}`);
    }
    return report.exitCode;
  }

  const workTmp = fs.mkdtempSync(path.join(os.tmpdir(), `nusa-dist-verify-${canonical}-`));
  try {
    const sentinel = 'NUSANTARA_DIST_E2E_OK';
    const src = `
program UjiDistribusiNyata
mulai
  hasil : bilangan = 20 + 22
  tampilkan("${sentinel}")
  tampilkan(hasil)
selesai
`;
    const buildDir = path.join(workTmp, 'build');
    const distOut = path.join(outDir, 'packages', canonical);
    fs.mkdirSync(distOut, { recursive: true });

    const buildRes = NativeBuildPipeline.build({
      sourceCode: src,
      appName: 'nusantara_dist_check',
      target: canonical,
      outputDirectory: buildDir,
      optLevel: 'O2',
      linkingMode: 'auto',
      verifyExecution: true,
    });

    if (!buildRes.success || !buildRes.executablePath || !fs.existsSync(buildRes.executablePath)) {
      errors.push(`Build native gagal (${buildRes.statusCode}): ${buildRes.diagnostics.join(' | ')}`);
    } else {
      const exeMeta = BinaryInspector.inspectStrict(buildRes.executablePath);
      const expectedFormat = cap.objectFormat;
      const expectedArch = cap.arch;
      report.hasilPemeriksaanExecutable = {
        path: buildRes.executablePath,
        sha256: buildRes.executableSha256,
        format: exeMeta.format,
        architecture: exeMeta.architecture,
        binaryType: exeMeta.binaryType,
        isValidExecutable: exeMeta.isValidExecutable,
      };
      if (!exeMeta.isValidExecutable || exeMeta.format !== expectedFormat || exeMeta.architecture !== expectedArch) {
        errors.push(`Header executable tidak valid untuk '${canonical}' (${exeMeta.format}/${exeMeta.architecture}).`);
      }

      if (errors.length === 0) {
        const pkg = DesktopDistributionPackager.packageTarget({
          appName: 'nusantara_dist_check',
          appVersion: VERSI_NUSANTARA,
          target: canonical,
          mode: 'release',
          packageKind: 'native',
          outputDirectory: distOut,
          nativeBuildResult: buildRes,
          reproducible: true,
          includeInstallers: true,
        });

        report.pathOutput = [pkg.manifestPath, pkg.sha256sumsPath, ...pkg.artifacts.map((a) => a.filePath)];

        // 1. Validasi manifest.json (tanpa BOM + kecocokan field)
        try {
          const { hasBom, data: mf } = readJsonNoBomStrict(pkg.manifestPath);
          if (hasBom) {
            errors.push(`manifest.json mengandung UTF-8 BOM tidak sah: ${pkg.manifestPath}`);
            report.hasilManifest = 'FAIL';
          } else if (
            mf.target !== canonical ||
            mf.triple !== cap.triple ||
            mf.packageKind !== 'native' ||
            mf.executableSha256 !== buildRes.executableSha256
          ) {
            errors.push(`manifest.json tidak konsisten untuk '${canonical}'`);
            report.hasilManifest = 'FAIL';
          } else {
            report.hasilManifest = 'PASS';
          }
        } catch (err: any) {
          errors.push(`Gagal parse manifest.json: ${err?.message || err}`);
          report.hasilManifest = 'FAIL';
        }

        // 2. Validasi SHA256SUMS direktori paket
        const sumsText = fs.readFileSync(pkg.sha256sumsPath, 'utf-8');
        const shaCheck = ArchiveBuilder.verifySha256SumsFromDirectory(pkg.packageDirectory, sumsText);
        if (!shaCheck.valid) {
          errors.push(`Verifikasi SHA256SUMS gagal: mismatches=[${shaCheck.mismatches.join(', ')}] missing=[${shaCheck.missingFiles.join(', ')}]`);
          report.hasilSha256 = 'FAIL';
        } else {
          report.hasilSha256 = 'PASS';
        }

        // 3. Validasi byte arsip & ekstraksi ke sandbox
        const preferredFormat = cap.os === 'windows' ? 'zip' : 'tar.gz';
        const targetArchive = pkg.artifacts.find((a) => a.format === preferredFormat) || pkg.artifacts[0];
        if (!targetArchive || !fs.existsSync(targetArchive.filePath)) {
          errors.push(`Arsip distribusi (${preferredFormat}) tidak ditemukan.`);
          report.hasilEkstraksiArsip = 'FAIL';
        } else {
          const arcBytes = fs.readFileSync(targetArchive.filePath);
          const actualArcSha = ArchiveBuilder.computeSha256(arcBytes);
          const validMagic =
            targetArchive.format === 'zip'
              ? arcBytes[0] === 0x50 && arcBytes[1] === 0x4b
              : arcBytes[0] === 0x1f && arcBytes[1] === 0x8b;
          if (!validMagic || actualArcSha !== targetArchive.sha256) {
            errors.push(`Arsip '${targetArchive.filename}' gagal validasi magic/SHA-256.`);
            report.hasilEkstraksiArsip = 'FAIL';
          } else {
            const extractDir = path.join(workTmp, 'extract');
            try {
              if (targetArchive.format === 'zip') {
                ArchiveBuilder.extractZip(arcBytes, extractDir);
              } else {
                ArchiveBuilder.extractTarGz(arcBytes, extractDir);
              }
              const extractedPkgDir = path.join(extractDir, path.basename(pkg.packageDirectory));
              const extractedSums = fs.readFileSync(path.join(extractedPkgDir, 'SHA256SUMS'), 'utf-8');
              const extractedShaOk = ArchiveBuilder.verifySha256SumsFromDirectory(extractedPkgDir, extractedSums);
              if (!extractedShaOk.valid) {
                errors.push('Berkas hasil ekstraksi arsip gagal verifikasi SHA256SUMS.');
                report.hasilEkstraksiArsip = 'FAIL';
              } else {
                report.hasilEkstraksiArsip = 'PASS';

                // 4. Jalankan installer nyata pada sandbox jika OS host cocok dengan target OS
                const hostOsMapped = process.platform === 'win32' ? 'windows' : process.platform;
                if (hostOsMapped === cap.os) {
                  const prefixDir = path.join(workTmp, 'sandbox-prefix');
                  const fakeHome = path.join(workTmp, 'sandbox-home');
                  fs.mkdirSync(fakeHome, { recursive: true });

                  const installRes =
                    cap.os === 'windows'
                      ? DesktopInstallerGenerator.runWindowsScriptInSandbox(extractedPkgDir, 'install.ps1', prefixDir, { noPath: true, quiet: true })
                      : DesktopInstallerGenerator.runPosixScriptInSandbox(extractedPkgDir, 'install.sh', prefixDir, fakeHome);

                  if (!installRes.success) {
                    errors.push(`Installer sandbox gagal (${cap.os}): ${installRes.stderr || installRes.stdout}`);
                    report.hasilSandboxInstall = 'FAIL';
                  } else {
                    report.hasilSandboxInstall = 'PASS';
                    const installedBinName = cap.os === 'windows' ? 'nusantara_dist_check.exe' : 'nusantara_dist_check';
                    const installedBinPath = path.join(prefixDir, 'bin', installedBinName);
                    if (!fs.existsSync(installedBinPath)) {
                      errors.push(`Executable terpasang tidak ditemukan di sandbox: ${installedBinPath}`);
                      report.hasilEksekusiInstalled = 'FAIL';
                    } else if (cap.canExecuteOnHost) {
                      let runCmd = installedBinPath;
                      let runArgs: string[] = [];
                      if (cap.executionMode === 'qemu-user' && cap.emulatorCommand) {
                        runCmd = cap.emulatorCommand;
                        runArgs = cap.sysroot && fs.existsSync(cap.sysroot)
                          ? ['-L', cap.sysroot, installedBinPath]
                          : [installedBinPath];
                      } else if (cap.executionMode === 'rosetta2') {
                        runCmd = 'arch';
                        runArgs = ['-x86_64', installedBinPath];
                      }
                      const runOut = safeCP.spawnSync(runCmd, runArgs, { encoding: 'utf-8', timeout: 15000, shell: false });
                      const stdout = runOut.stdout || '';
                      if (runOut.status !== 0 || !stdout.includes(sentinel) || !stdout.includes('42')) {
                        errors.push(`Eksekusi biner terpasang gagal (exit=${runOut.status}, mode=${cap.executionMode}): stdout='${stdout}' stderr='${runOut.stderr || ''}'`);
                        report.hasilEksekusiInstalled = 'FAIL';
                      } else {
                        report.hasilEksekusiInstalled = `PASS (${cap.executionMode})`;
                      }
                    } else {
                      report.hasilEksekusiInstalled = 'NOT_EXECUTED_CROSS';
                    }

                    const uninstRes =
                      cap.os === 'windows'
                        ? DesktopInstallerGenerator.runWindowsScriptInSandbox(extractedPkgDir, 'uninstall.ps1', prefixDir, { noPath: true, quiet: true })
                        : DesktopInstallerGenerator.runPosixScriptInSandbox(extractedPkgDir, 'uninstall.sh', prefixDir, fakeHome);
                    if (!uninstRes.success || fs.existsSync(installedBinPath)) {
                      errors.push(`Uninstall sandbox gagal atau biner masih tersisa: ${uninstRes.stderr || uninstRes.stdout}`);
                      report.hasilSandboxUninstall = 'FAIL';
                    } else {
                      report.hasilSandboxUninstall = 'PASS';
                    }
                  }
                } else {
                  report.hasilSandboxInstall = 'SKIPPED_CROSS_OS';
                  report.hasilEksekusiInstalled = 'SKIPPED_CROSS_OS';
                  report.hasilSandboxUninstall = 'SKIPPED_CROSS_OS';
                }
              }
            } catch (err: any) {
              errors.push(`Gagal mengekstrak arsip distribusi: ${err?.message || err}`);
              report.hasilEkstraksiArsip = 'FAIL';
            }
          }
        }
      }
    }

    report.statusAkhir = errors.length === 0 ? 'PASS' : 'FAIL';
    report.exitCode = errors.length === 0 ? 0 : 1;

    const rptPath = path.join(reportDir, `dist-verify-${canonical}.json`);
    fs.writeFileSync(rptPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('-----------------------------------------------------------------------------');
    console.log(`[DIST-VERIFY] targetDiminta=${rawTarget} -> targetTerdeteksi=${canonical} (${cap.triple})`);
    console.log(`[DIST-VERIFY] statusAkhir=${report.statusAkhir} manifest=${report.hasilManifest} sha256=${report.hasilSha256} extract=${report.hasilEkstraksiArsip}`);
    console.log(`[DIST-VERIFY] install=${report.hasilSandboxInstall} run=${report.hasilEksekusiInstalled} uninstall=${report.hasilSandboxUninstall}`);
    console.log(`[DIST-VERIFY] laporan=${rptPath}`);
    if (errors.length > 0) {
      for (const e of errors) {
        console.error(`[DIST-VERIFY][ERROR] ${e}`);
      }
    }
    console.log('-----------------------------------------------------------------------------');
    return report.exitCode;
  } finally {
    fs.rmSync(workTmp, { recursive: true, force: true });
  }
}

function runAggregate(args: string[]): number {
  const evidenceDir = path.resolve(getArg(args, '--evidence-dir') || 'artifacts/phase23/evidence');
  const reportOut = path.resolve(getArg(args, '--report-out') || 'artifacts/phase23/PHASE-23-CERTIFICATION-REPORT.md');
  const jsonOut = getArg(args, '--json-out');
  const writeStepSummary = hasFlag(args, '--step-summary');
  const allowIncomplete = hasFlag(args, '--allow-incomplete');

  const result = Phase23CertificationEngine.aggregateEvidence(evidenceDir, {
    baseDir: path.dirname(evidenceDir),
    ciContext: {
      serverUrl: process.env.GITHUB_SERVER_URL,
      repository: process.env.GITHUB_REPOSITORY,
      runId: process.env.GITHUB_RUN_ID,
      commitSha: process.env.GITHUB_SHA,
      refName: process.env.GITHUB_REF_NAME,
    },
  });

  fs.mkdirSync(path.dirname(reportOut), { recursive: true });
  fs.writeFileSync(reportOut, result.markdownReport, 'utf-8');

  if (jsonOut) {
    const absJson = path.resolve(jsonOut);
    fs.mkdirSync(path.dirname(absJson), { recursive: true });
    fs.writeFileSync(absJson, JSON.stringify(result, null, 2), 'utf-8');
  }

  if (writeStepSummary && process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${result.markdownReport}\n`, 'utf-8');
  }

  console.log('=============================================================================');
  console.log(`PHASE 23 CERTIFICATION GATE: ${result.overallStatus}`);
  console.log(
    `PASS=${result.counts.pass} | NOT_VERIFIED=${result.counts.notVerified} | FAIL=${result.counts.fail} | MISSING=${result.counts.missing} | CORRUPT=${result.counts.corrupt}`
  );
  console.log(`Laporan: ${reportOut}`);
  console.log('=============================================================================');

  for (const f of result.findings) {
    console.log(`  [${f.severity.toUpperCase()}][${f.code}] ${f.target}: ${f.message}`);
  }

  if (allowIncomplete) {
    return 0;
  }
  return result.exitCode;
}

function runLocalSnapshot(args: string[]): number {
  const bundleDir = path.resolve(getArg(args, '--bundle-dir') || 'artifacts/phase23');
  const evidenceDir = path.join(bundleDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });

  for (const target of DESKTOP_CANONICAL_TARGETS) {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `nusa-local-${target}-`));
    try {
      const ev = Phase23CertificationEngine.generateTargetEvidence({
        target,
        outputDir: workDir,
        artifactBundleDir: bundleDir,
        failOnMissingToolchain: false,
        requireExecution: true,
      });
      fs.writeFileSync(path.join(evidenceDir, `${target}.json`), JSON.stringify(ev, null, 2), 'utf-8');
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }

  return runAggregate([
    '--evidence-dir',
    evidenceDir,
    '--report-out',
    path.join(bundleDir, 'PHASE-23-CERTIFICATION-REPORT.md'),
    '--allow-incomplete',
  ]);
}

const [, , subcmd, ...rest] = process.argv;

let exitCode = 0;
if (subcmd === 'generate') {
  exitCode = runGenerate(rest);
} else if (subcmd === 'verify-dist') {
  exitCode = runVerifyDist(rest);
} else if (subcmd === 'aggregate') {
  exitCode = runAggregate(rest);
} else if (subcmd === 'local-snapshot') {
  exitCode = runLocalSnapshot(rest);
} else {
  console.error('Subperintah tidak dikenali. Gunakan: generate | verify-dist | aggregate | local-snapshot');
  exitCode = 1;
}

process.exit(exitCode);
