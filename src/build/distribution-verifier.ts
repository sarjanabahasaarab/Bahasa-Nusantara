/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Verifikator Distribusi End-to-End 18 Tahap (Phase 23.7)
 * Memverifikasi: Source -> NIR -> LLVM IR -> Object -> Native Executable ->
 * BinaryInspector -> DependencyInspector -> Package (ZIP/TAR.GZ) -> Manifest ->
 * SHA256SUMS -> Ekstraksi Sandbox -> Instalasi -> Eksekusi Terpasang ->
 * Upgrade -> Integritas Pasca-Upgrade -> Penolakan Tamper -> Uninstall -> Cek Sisa File.
 */

import { BinaryInspector } from '../compiler/executable/binary-inspector';
import { safeCP, safeFS, safeOS, safePath } from '../compiler/llvm/node-compat';
import { TargetTripleManager } from '../compiler/llvm/target-triple';
import { VERSI_NUSANTARA } from '../konstanta/versi';
import { ArchiveBuilder } from './archive-builder';
import { DesktopDistributionPackager } from './distribution-packager';
import { DesktopInstallerGenerator } from './installers';
import { NativeBuildPipeline } from './native-pipeline';
import { TargetMatrixManager } from './target-matrix';
import {
  CanonicalDesktopTarget,
  DistributionE2EReport,
  NativeBuildResult,
} from './types';

export const PHASE23_DIST_E2E_SENTINEL = 'NUSANTARA_DIST_E2E_OK';
export const PHASE23_DIST_UPGRADE_SENTINEL = 'NUSANTARA_DIST_UPGRADE_V2_OK';

function buildDistSource(extraLine?: string): string {
  return `
program UjiDistribusiNyata
mulai
  hasil : bilangan = 20 + 22
  tampilkan("${PHASE23_DIST_E2E_OK_OR_FALLBACK()}")
  ${extraLine ? `tampilkan("${extraLine}")` : ''}
  tampilkan(hasil)
selesai
`;
}

function PHASE23_DIST_E2E_OK_OR_FALLBACK(): string {
  return PHASE23_DIST_E2E_SENTINEL;
}

function readJsonNoBomStrict(filePath: string): { hasBom: boolean; data: any } {
  const buf = Buffer.from(safeFS.readFileBufferSync(filePath));
  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  const text = (hasBom ? buf.subarray(3) : buf).toString('utf-8');
  return { hasBom, data: JSON.parse(text) };
}

function executeTargetBinary(
  binPath: string,
  executionMode: string,
  emulatorCommand?: string,
  sysroot?: string
): { status: number | null; stdout: string; stderr: string } {
  let runCmd = binPath;
  let runArgs: string[] = [];
  if (executionMode === 'qemu-user' && emulatorCommand) {
    runCmd = emulatorCommand;
    runArgs = sysroot && safeFS.existsSync(sysroot) ? ['-L', sysroot, binPath] : [binPath];
  } else if (executionMode === 'rosetta2') {
    runCmd = 'arch';
    runArgs = ['-x86_64', binPath];
  }
  const res = safeCP.spawnSync(runCmd, runArgs, {
    encoding: 'utf-8',
    timeout: 15000,
    shell: false,
  });
  return {
    status: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
}

export interface DistributionE2EVerifyOptions {
  target: string;
  outDir?: string;
  failOnMissingClang?: boolean;
  appName?: string;
  archiveCopyDir?: string;
}

export class DistributionE2EVerifier {
  public static verify(options: DistributionE2EVerifyOptions): DistributionE2EReport {
    const rawTarget = options.target;
    const strict = TargetTripleManager.resolveStrict(rawTarget);
    if (!strict.supported || !strict.info.targetId) {
      throw new Error(`Target distribusi tidak valid '${rawTarget}': ${strict.error}`);
    }

    const canonical = strict.info.targetId as CanonicalDesktopTarget;
    const cap = TargetMatrixManager.inspectTargetCapability(canonical);
    const outDir = safePath.resolve(options.outDir || 'dist-native/dist-verify');
    const appName = (options.appName || 'nusantara_dist_check').replace(/[^A-Za-z0-9._-]/g, '_');

    const errors: string[] = [];
    const report: DistributionE2EReport = {
      schemaVersion: '2.0',
      checkedAt: new Date().toISOString(),
      targetDiminta: rawTarget,
      targetTerdeteksi: canonical,
      triple: cap.triple,
      hostOs: process.platform,
      hostArch: process.arch,
      isCross: cap.isCross,
      executionMode: cap.executionMode,
      emulatorCommand: cap.emulatorCommand || null,
      pathOutput: [],
      hasilPemeriksaanExecutable: null,
      hasilDependency: 'NOT_RUN',
      hasilSha256: 'NOT_RUN',
      hasilManifest: 'NOT_RUN',
      hasilEkstraksiArsip: 'NOT_RUN',
      hasilSandboxInstall: 'NOT_RUN',
      hasilEksekusiInstalled: 'NOT_RUN',
      hasilUpgrade: 'NOT_RUN',
      hasilPenolakanTamper: 'NOT_RUN',
      hasilSandboxUninstall: 'NOT_RUN',
      hasilSisaUninstall: 'NOT_RUN',
      distributionManifest: null,
      installResult: {
        status: 'NOT_RUN',
        exitCode: null,
      },
      uninstallResult: {
        status: 'NOT_RUN',
        exitCode: null,
      },
      statusAkhir: 'FAIL',
      daftarError: errors,
      exitCode: 1,
    };

    if (!cap.canBuildNative) {
      if (options.failOnMissingClang && !cap.toolchainAvailable) {
        report.statusAkhir = 'FAIL';
        errors.push(`Toolchain LLVM/Clang tidak terpasang untuk '${canonical}': ${cap.missingRequirements.join('; ')}`);
        report.exitCode = 1;
      } else {
        report.statusAkhir = 'NOT_VERIFIED';
        report.reason = `Target '${canonical}' tidak dapat di-build di host ini (${cap.missingRequirements.join('; ') || cap.diagnosticMessage}).`;
        report.exitCode = 0;
      }
      return report;
    }

    const workTmp = safeFS.mkdtempSync(safePath.join(safeOS.tmpdir(), `nusa-dist-verify-${canonical}-`));
    try {
      // 1-5: Source (.nusantara) -> NIR -> LLVM IR -> Object -> Native Executable (v1)
      const buildV1Dir = safePath.join(workTmp, 'build-v1');
      const distOutV1 = safePath.join(outDir, 'packages', canonical);
      safeFS.mkdirSync(distOutV1, { recursive: true });

      const buildRes: NativeBuildResult = NativeBuildPipeline.build({
        sourceCode: buildDistSource(),
        appName,
        target: canonical,
        outputDirectory: buildV1Dir,
        optLevel: 'O2',
        linkingMode: 'auto',
        verifyExecution: true,
      });

      if (!buildRes.success || !buildRes.executablePath || !safeFS.existsSync(buildRes.executablePath)) {
        errors.push(`Build native v1 gagal (${buildRes.statusCode}): ${buildRes.diagnostics.join(' | ')}`);
        return report;
      }

      // 6: Binary inspection
      const exeMeta = BinaryInspector.inspectStrict(buildRes.executablePath);
      report.hasilPemeriksaanExecutable = {
        path: buildRes.executablePath,
        sha256: buildRes.executableSha256,
        format: exeMeta.format,
        architecture: exeMeta.architecture,
        binaryType: exeMeta.binaryType || 'UNKNOWN',
        isValidExecutable: Boolean(exeMeta.isValidExecutable),
      };
      if (!exeMeta.isValidExecutable || exeMeta.format !== cap.objectFormat || exeMeta.architecture !== cap.arch) {
        errors.push(`Header executable tidak valid untuk '${canonical}' (${exeMeta.format}/${exeMeta.architecture}).`);
        return report;
      }

      // 7: Dependency inspection
      if (buildRes.dependencyReport && !buildRes.dependencyReport.allResolved) {
        report.hasilDependency = 'FAIL';
        errors.push(`Dependensi runtime belum terpenuhi: ${buildRes.dependencyReport.missingLibraries.join(', ')}`);
        return report;
      }
      report.hasilDependency = 'PASS';

      if (cap.canExecuteOnHost && !(buildRes.executionStdout || '').includes(PHASE23_DIST_E2E_SENTINEL)) {
        errors.push(`Output eksekusi build native v1 tidak memuat sentinel '${PHASE23_DIST_E2E_SENTINEL}'.`);
        return report;
      }

      // 8-10: Package ZIP / TAR.GZ + Manifest + SHA256SUMS
      const v1Version = VERSI_NUSANTARA;
      const pkg = DesktopDistributionPackager.packageTarget({
        appName,
        appVersion: v1Version,
        target: canonical,
        mode: 'release',
        packageKind: 'native',
        outputDirectory: distOutV1,
        nativeBuildResult: buildRes,
        reproducible: true,
        includeInstallers: true,
      });

      report.pathOutput = [pkg.manifestPath, pkg.sha256sumsPath, ...pkg.artifacts.map((a) => a.filePath)];

      // Validasi manifest.json (strict UTF-8 no-BOM + field konsisten)
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
          report.distributionManifest = mf;
        }
      } catch (err: any) {
        errors.push(`Gagal parse manifest.json: ${err?.message || err}`);
        report.hasilManifest = 'FAIL';
      }

      // Validasi SHA256SUMS direktori paket
      const sumsText = safeFS.readFileSync(pkg.sha256sumsPath, 'utf-8');
      const shaCheck = ArchiveBuilder.verifySha256SumsFromDirectory(pkg.packageDirectory, sumsText);
      if (!shaCheck.valid) {
        errors.push(
          `Verifikasi SHA256SUMS gagal: mismatches=[${shaCheck.mismatches.join(', ')}] missing=[${shaCheck.missingFiles.join(', ')}]`
        );
        report.hasilSha256 = 'FAIL';
      } else {
        report.hasilSha256 = 'PASS';
      }

      // 11: Ekstraksi sandbox dari arsip utama (.zip untuk Windows, .tar.gz untuk Linux/macOS)
      const preferredFormat = cap.os === 'windows' ? 'zip' : 'tar.gz';
      const targetArchive = pkg.artifacts.find((a) => a.format === preferredFormat) || pkg.artifacts[0];
      if (!targetArchive || !safeFS.existsSync(targetArchive.filePath)) {
        errors.push(`Arsip distribusi (${preferredFormat}) tidak ditemukan.`);
        report.hasilEkstraksiArsip = 'FAIL';
        return report;
      }

      const arcBytes = Buffer.from(safeFS.readFileBufferSync(targetArchive.filePath));
      const actualArcSha = ArchiveBuilder.computeSha256(arcBytes);
      const validMagic =
        targetArchive.format === 'zip'
          ? arcBytes[0] === 0x50 && arcBytes[1] === 0x4b
          : arcBytes[0] === 0x1f && arcBytes[1] === 0x8b;
      if (!validMagic || actualArcSha !== targetArchive.sha256) {
        errors.push(`Arsip '${targetArchive.filename}' gagal validasi magic/SHA-256.`);
        report.hasilEkstraksiArsip = 'FAIL';
        return report;
      }

      report.archiveSha256 = actualArcSha;
      if (options.archiveCopyDir) {
        safeFS.mkdirSync(options.archiveCopyDir, { recursive: true });
        const copiedArchive = safePath.join(options.archiveCopyDir, targetArchive.filename);
        safeFS.writeFileSync(copiedArchive, arcBytes);
        report.archivePath = copiedArchive;
      } else {
        report.archivePath = targetArchive.filePath;
      }

      const extractV1Dir = safePath.join(workTmp, 'extract-v1');
      if (targetArchive.format === 'zip') {
        ArchiveBuilder.extractZip(arcBytes, extractV1Dir);
      } else {
        ArchiveBuilder.extractTarGz(arcBytes, extractV1Dir);
      }
      const extractedPkgV1 = safePath.join(extractV1Dir, safePath.basename(pkg.packageDirectory));
      const extractedSumsV1 = safeFS.readFileSync(safePath.join(extractedPkgV1, 'SHA256SUMS'), 'utf-8');
      const extractedShaV1Ok = ArchiveBuilder.verifySha256SumsFromDirectory(extractedPkgV1, extractedSumsV1);
      if (!extractedShaV1Ok.valid) {
        errors.push('Berkas hasil ekstraksi arsip v1 gagal verifikasi SHA256SUMS.');
        report.hasilEkstraksiArsip = 'FAIL';
        return report;
      }
      report.hasilEkstraksiArsip = 'PASS';

      // 12-18: Sandbox Install -> Execute -> Upgrade -> Integrity Post-Upgrade -> Tamper Reject -> Uninstall -> Leftover check
      const hostOsMapped = process.platform === 'win32' ? 'windows' : process.platform;
      if (hostOsMapped !== cap.os) {
        report.hasilSandboxInstall = 'SKIPPED_CROSS_OS';
        report.hasilEksekusiInstalled = 'SKIPPED_CROSS_OS';
        report.hasilUpgrade = 'SKIPPED_CROSS_OS';
        report.hasilPenolakanTamper = 'SKIPPED_CROSS_OS';
        report.hasilSandboxUninstall = 'SKIPPED_CROSS_OS';
        report.hasilSisaUninstall = 'SKIPPED_CROSS_OS';
        report.installResult = {
          status: 'SKIPPED_CROSS_OS',
          exitCode: null,
          details: `Installer OS '${cap.os}' tidak dapat dieksekusi di host '${hostOsMapped}'.`,
        };
        report.uninstallResult = {
          status: 'SKIPPED_CROSS_OS',
          exitCode: null,
          details: `Uninstaller OS '${cap.os}' tidak dapat dieksekusi di host '${hostOsMapped}'.`,
        };
        report.statusAkhir = errors.length === 0 ? 'PASS' : 'FAIL';
        report.exitCode = errors.length === 0 ? 0 : 1;
        return report;
      }

      const prefixDir = safePath.join(workTmp, 'sandbox-prefix');
      const fakeHome = safePath.join(workTmp, 'sandbox-home');
      safeFS.mkdirSync(fakeHome, { recursive: true });

      const installedBinName = cap.os === 'windows' ? `${appName}.exe` : appName;
      const installedBinPath = safePath.join(prefixDir, 'bin', installedBinName);
      const installedShareDir = safePath.join(prefixDir, 'share', appName);
      const installedManifestPath = safePath.join(installedShareDir, 'manifest.json');
      const receiptPath =
        cap.os === 'windows'
          ? safePath.join(prefixDir, `.${appName}-install-manifest.json`)
          : safePath.join(prefixDir, `.nusantara-install-${appName}.manifest`);

      // Step 12: Install v1
      const installV1Res =
        cap.os === 'windows'
          ? DesktopInstallerGenerator.runWindowsScriptInSandbox(extractedPkgV1, 'install.ps1', prefixDir, {
              noPath: true,
              quiet: true,
            })
          : DesktopInstallerGenerator.runPosixScriptInSandbox(extractedPkgV1, 'install.sh', prefixDir, fakeHome);

      if (!installV1Res.success || !safeFS.existsSync(installedBinPath)) {
        report.hasilSandboxInstall = 'FAIL';
        report.installResult = {
          status: 'FAIL',
          exitCode: installV1Res.exitCode,
          details: `Install v1 gagal: ${installV1Res.stderr || installV1Res.stdout}`,
        };
        errors.push(report.installResult.details!);
        return report;
      }

      const installedShaV1 = ArchiveBuilder.computeSha256(safeFS.readFileBufferSync(installedBinPath));
      if (installedShaV1 !== buildRes.executableSha256) {
        report.hasilSandboxInstall = 'FAIL';
        errors.push(`SHA-256 executable terpasang v1 tidak cocok dengan biner build.`);
        return report;
      }
      if (!safeFS.existsSync(receiptPath)) {
        report.hasilSandboxInstall = 'FAIL';
        errors.push(`Receipt manifest instalasi v1 tidak ditemukan: ${receiptPath}`);
        return report;
      }
      const receiptV1 = readJsonNoBomStrict(receiptPath);
      if (receiptV1.hasBom) {
        report.hasilSandboxInstall = 'FAIL';
        errors.push(`Receipt JSON v1 mengandung UTF-8 BOM tidak sah.`);
        return report;
      }
      report.hasilSandboxInstall = 'PASS';

      // Step 13: Execute installed v1 sentinel
      if (cap.canExecuteOnHost) {
        const execV1 = executeTargetBinary(installedBinPath, cap.executionMode, cap.emulatorCommand, cap.sysroot);
        if (
          execV1.status !== 0 ||
          !execV1.stdout.includes(PHASE23_DIST_E2E_SENTINEL) ||
          !execV1.stdout.includes('42')
        ) {
          report.hasilEksekusiInstalled = 'FAIL';
          errors.push(
            `Eksekusi biner terpasang v1 gagal (exit=${execV1.status}, mode=${cap.executionMode}): stdout='${execV1.stdout}' stderr='${execV1.stderr}'`
          );
          return report;
        }
        report.hasilEksekusiInstalled = `PASS (${cap.executionMode})`;
      } else {
        report.hasilEksekusiInstalled = 'NOT_EXECUTED_CROSS';
        errors.push(`Target '${canonical}' tidak dapat dieksekusi di host (${cap.executionMode}).`);
        return report;
      }

      // Step 14 & 15: Build v2 -> Package v2 -> Extract -> Upgrade -> Verify post-upgrade integrity & execution
      const buildV2Dir = safePath.join(workTmp, 'build-v2');
      const distOutV2 = safePath.join(workTmp, 'dist-v2');
      const v2Version = `${v1Version}-upgrade.2`;
      const buildV2Res = NativeBuildPipeline.build({
        sourceCode: buildDistSource(PHASE23_DIST_UPGRADE_SENTINEL),
        appName,
        target: canonical,
        outputDirectory: buildV2Dir,
        optLevel: 'O2',
        linkingMode: 'auto',
        verifyExecution: true,
      });
      if (!buildV2Res.success || !buildV2Res.executablePath) {
        report.hasilUpgrade = 'FAIL';
        errors.push(`Build native v2 untuk uji upgrade gagal: ${buildV2Res.diagnostics.join(' | ')}`);
        return report;
      }
      const pkgV2 = DesktopDistributionPackager.packageTarget({
        appName,
        appVersion: v2Version,
        target: canonical,
        mode: 'release',
        packageKind: 'native',
        outputDirectory: distOutV2,
        nativeBuildResult: buildV2Res,
        reproducible: true,
        includeInstallers: true,
      });
      const arcV2 = pkgV2.artifacts.find((a) => a.format === preferredFormat) || pkgV2.artifacts[0];
      const extractV2Dir = safePath.join(workTmp, 'extract-v2');
      const arcV2Bytes = Buffer.from(safeFS.readFileBufferSync(arcV2.filePath));
      if (arcV2.format === 'zip') {
        ArchiveBuilder.extractZip(arcV2Bytes, extractV2Dir);
      } else {
        ArchiveBuilder.extractTarGz(arcV2Bytes, extractV2Dir);
      }
      const extractedPkgV2 = safePath.join(extractV2Dir, safePath.basename(pkgV2.packageDirectory));

      const upgradeRes =
        cap.os === 'windows'
          ? DesktopInstallerGenerator.runWindowsScriptInSandbox(extractedPkgV2, 'install.ps1', prefixDir, {
              noPath: true,
              quiet: true,
            })
          : DesktopInstallerGenerator.runPosixScriptInSandbox(extractedPkgV2, 'install.sh', prefixDir, fakeHome);
      if (!upgradeRes.success) {
        report.hasilUpgrade = 'FAIL';
        errors.push(`Upgrade v2 gagal: ${upgradeRes.stderr || upgradeRes.stdout}`);
        return report;
      }

      const upgradedSha = ArchiveBuilder.computeSha256(safeFS.readFileBufferSync(installedBinPath));
      const receiptV2 = readJsonNoBomStrict(receiptPath);
      const manifestV2 = readJsonNoBomStrict(installedManifestPath);
      const execV2 = executeTargetBinary(installedBinPath, cap.executionMode, cap.emulatorCommand, cap.sysroot);
      if (
        upgradedSha !== buildV2Res.executableSha256 ||
        receiptV2.hasBom ||
        receiptV2.data?.appVersion !== v2Version ||
        manifestV2.data?.appVersion !== v2Version ||
        execV2.status !== 0 ||
        !execV2.stdout.includes(PHASE23_DIST_E2E_SENTINEL) ||
        !execV2.stdout.includes(PHASE23_DIST_UPGRADE_SENTINEL)
      ) {
        report.hasilUpgrade = 'FAIL';
        errors.push(`Validasi integritas atau eksekusi pasca-upgrade v2 gagal (shaMatch=${upgradedSha === buildV2Res.executableSha256}, exit=${execV2.status}).`);
        return report;
      }
      report.hasilUpgrade = 'PASS';

      // Step 16: Penolakan paket yang dimodifikasi (tamper) tanpa merusak instalasi aktif
      const pkgV2BinInExtract = safePath.join(extractedPkgV2, 'bin', installedBinName);
      const origExtractedBin = Buffer.from(safeFS.readFileBufferSync(pkgV2BinInExtract));
      safeFS.writeFileSync(pkgV2BinInExtract, Buffer.from('TAMPERED_CORRUPT_PAYLOAD'));
      const tamperRes =
        cap.os === 'windows'
          ? DesktopInstallerGenerator.runWindowsScriptInSandbox(extractedPkgV2, 'install.ps1', prefixDir, {
              noPath: true,
              quiet: true,
            })
          : DesktopInstallerGenerator.runPosixScriptInSandbox(extractedPkgV2, 'install.sh', prefixDir, fakeHome);
      safeFS.writeFileSync(pkgV2BinInExtract, origExtractedBin);
      const postTamperInstalledSha = ArchiveBuilder.computeSha256(safeFS.readFileBufferSync(installedBinPath));

      if (tamperRes.success || postTamperInstalledSha !== buildV2Res.executableSha256) {
        report.hasilPenolakanTamper = 'FAIL';
        errors.push(`Installer gagal menolak paket terubah (success=${tamperRes.success}) atau merusak biner terpasang.`);
        return report;
      }
      report.hasilPenolakanTamper = 'PASS';

      report.installResult = {
        status: 'PASS',
        exitCode: upgradeRes.exitCode ?? 0,
        installedBinaryPath: installedBinPath,
        installedExecutionSentinel: PHASE23_DIST_E2E_SENTINEL,
        upgradeVerified: true,
        tamperRejected: true,
        details: `Install v1, execute, upgrade v2 (${v2Version}), post-upgrade integrity & tamper rejection terverifikasi (${cap.executionMode}).`,
      };

      // Step 17 & 18: Uninstall + Pemeriksaan sisa file dan konfigurasi
      const uninstRes =
        cap.os === 'windows'
          ? DesktopInstallerGenerator.runWindowsScriptInSandbox(extractedPkgV2, 'uninstall.ps1', prefixDir, {
              noPath: true,
              quiet: true,
            })
          : DesktopInstallerGenerator.runPosixScriptInSandbox(extractedPkgV2, 'uninstall.sh', prefixDir, fakeHome);

      const leftovers: string[] = [];
      if (safeFS.existsSync(installedBinPath)) leftovers.push(installedBinPath);
      if (safeFS.existsSync(installedShareDir)) leftovers.push(installedShareDir);
      if (safeFS.existsSync(receiptPath)) leftovers.push(receiptPath);
      if (cap.os !== 'windows') {
        const profilePath = safePath.join(fakeHome, '.profile');
        if (safeFS.existsSync(profilePath)) {
          const profText = safeFS.readFileSync(profilePath, 'utf-8');
          if (profText.includes(`NUSANTARA ${appName} PATH`)) {
            leftovers.push(`${profilePath} (PATH marker)`);
          }
        }
      }

      if (!uninstRes.success || leftovers.length > 0) {
        report.hasilSandboxUninstall = uninstRes.success ? 'PASS' : 'FAIL';
        report.hasilSisaUninstall = leftovers.length === 0 ? 'PASS' : 'FAIL';
        report.uninstallResult = {
          status: 'FAIL',
          exitCode: uninstRes.exitCode,
          leftoversDetected: leftovers.length > 0,
          details: `Uninstall gagal atau meninggalkan sisa berkas: ${leftovers.join(', ') || uninstRes.stderr}`,
        };
        errors.push(report.uninstallResult.details!);
        return report;
      }

      report.hasilSandboxUninstall = 'PASS';
      report.hasilSisaUninstall = 'PASS';
      report.uninstallResult = {
        status: 'PASS',
        exitCode: uninstRes.exitCode ?? 0,
        leftoversDetected: false,
        details: 'Uninstall bersih tanpa sisa biner, manifest, receipt, maupun konfigurasi PATH.',
      };

      report.statusAkhir = errors.length === 0 ? 'PASS' : 'FAIL';
      report.exitCode = errors.length === 0 ? 0 : 1;
      return report;
    } finally {
      try {
        safeFS.rmSync(workTmp, { recursive: true, force: true });
      } catch {
        // abaikan
      }
    }
  }
}
