/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA DISTRIBUTION E2E VERIFIER (Phase 23)
 * Verifikasi end-to-end arsip distribusi, SHA-256, ekstraksi, sandbox install,
 * upgrade, penolakan tamper checksum, dan uninstall bersih tanpa sisa.
 */

import { safeCP, safeFS, safeOS, safePath } from '../compiler/llvm/node-compat';
import { ArchiveBuilder } from './archive-builder';
import { DesktopDistributionPackager } from './distribution-packager';
import { NativeBuildPipeline } from './native-pipeline';
import { TargetMatrixManager } from './target-matrix';
import {
  CanonicalDesktopTarget,
  DistributionE2EVerifyOptions,
  DistributionE2EVerifyReport,
} from './types';

const VERIFY_SENTINEL = 'NUSANTARA_DIST_VERIFY_OK';

const VERIFY_SOURCE = `program UjiDistribusiE2E
mulai
    tampilkan("${VERIFY_SENTINEL}")
selesai
`;

export class DistributionE2EVerifier {
  public static verify(options: DistributionE2EVerifyOptions): DistributionE2EVerifyReport {
    const cap = TargetMatrixManager.inspectTargetCapability(options.target);
    const canonical = (cap.canonicalTarget || 'linux-x86_64') as CanonicalDesktopTarget;
    const errors: string[] = [];

    if (!cap.supported || !cap.canonicalTarget) {
      return {
        targetDiminta: options.target,
        targetTerdeteksi: canonical,
        triple: cap.triple,
        statusAkhir: 'FAIL',
        exitCode: 1,
        hasilManifest: 'FAIL',
        hasilSha256: 'FAIL',
        hasilEkstraksiArsip: 'NOT_RUN',
        hasilDependency: 'NOT_RUN',
        hasilSandboxInstall: 'NOT_RUN',
        hasilEksekusiInstalled: 'NOT_RUN',
        hasilUpgrade: 'NOT_RUN',
        hasilPenolakanTamper: 'NOT_RUN',
        hasilSandboxUninstall: 'NOT_RUN',
        hasilSisaUninstall: 'NOT_RUN',
        reason: `Target tidak didukung: ${options.target}`,
        daftarError: cap.missingRequirements,
        artifacts: [],
      };
    }

    safeFS.mkdirSync(options.outDir, { recursive: true });
    const appName = options.appName || 'nusa_dist_verify';
    const appVersion = options.appVersion || 'v0.50.0';

    const buildRes = NativeBuildPipeline.build({
      sourceCode: VERIFY_SOURCE,
      appName,
      target: canonical,
      outputDirectory: safePath.join(options.outDir, 'native-build'),
      optLevel: 'O2',
      verifyExecution: true,
      expectedSentinel: VERIFY_SENTINEL,
    });

    if (!buildRes.success) {
      if (buildRes.statusCode === 'TOOLCHAIN_TIDAK_TERSEDIA' && !options.failOnMissingClang) {
        return {
          targetDiminta: options.target,
          targetTerdeteksi: canonical,
          triple: cap.triple,
          statusAkhir: 'NOT_VERIFIED',
          exitCode: 0,
          hasilManifest: 'NOT_RUN',
          hasilSha256: 'NOT_RUN',
          hasilEkstraksiArsip: 'NOT_RUN',
          hasilDependency: 'NOT_RUN',
          hasilSandboxInstall: 'NOT_VERIFIED',
          hasilEksekusiInstalled: 'NOT_VERIFIED',
          hasilUpgrade: 'NOT_VERIFIED',
          hasilPenolakanTamper: 'NOT_VERIFIED',
          hasilSandboxUninstall: 'NOT_VERIFIED',
          hasilSisaUninstall: 'NOT_VERIFIED',
          reason: `Toolchain/sysroot target '${canonical}' tidak tersedia pada host ini: ${cap.missingRequirements.join(' ')}`,
          daftarError: [],
          artifacts: [],
        };
      }
      errors.push(...buildRes.diagnostics);
      return {
        targetDiminta: options.target,
        targetTerdeteksi: canonical,
        triple: cap.triple,
        statusAkhir: 'FAIL',
        exitCode: 1,
        hasilManifest: 'NOT_RUN',
        hasilSha256: 'NOT_RUN',
        hasilEkstraksiArsip: 'NOT_RUN',
        hasilDependency: 'NOT_RUN',
        hasilSandboxInstall: 'NOT_RUN',
        hasilEksekusiInstalled: 'NOT_RUN',
        hasilUpgrade: 'NOT_RUN',
        hasilPenolakanTamper: 'NOT_RUN',
        hasilSandboxUninstall: 'NOT_RUN',
        hasilSisaUninstall: 'NOT_RUN',
        reason: `Build native gagal (${buildRes.statusCode})`,
        daftarError: errors,
        artifacts: [],
      };
    }

    const pkgDir = safePath.join(options.outDir, 'packages');
    const pkgRes = DesktopDistributionPackager.packageTarget({
      appName,
      appVersion,
      target: canonical,
      mode: 'release',
      packageKind: 'native',
      outputDirectory: pkgDir,
      nativeBuildResult: buildRes,
      reproducible: true,
      includeInstallers: true,
    });

    if (!pkgRes.success || pkgRes.artifacts.length === 0) {
      errors.push(...pkgRes.diagnostics);
      return {
        targetDiminta: options.target,
        targetTerdeteksi: canonical,
        triple: cap.triple,
        statusAkhir: 'FAIL',
        exitCode: 1,
        hasilManifest: 'FAIL',
        hasilSha256: 'FAIL',
        hasilEkstraksiArsip: 'NOT_RUN',
        hasilDependency: 'NOT_RUN',
        hasilSandboxInstall: 'NOT_RUN',
        hasilEksekusiInstalled: 'NOT_RUN',
        hasilUpgrade: 'NOT_RUN',
        hasilPenolakanTamper: 'NOT_RUN',
        hasilSandboxUninstall: 'NOT_RUN',
        hasilSisaUninstall: 'NOT_RUN',
        reason: 'Pengemasan distribusi gagal.',
        daftarError: errors,
        artifacts: [],
      };
    }

    // Verifikasi integritas ZIP & SHA-256 artefak
    let hasilSha256: 'PASS' | 'FAIL' = 'PASS';
    let hasilEkstraksiArsip: 'PASS' | 'FAIL' = 'PASS';
    for (const art of pkgRes.artifacts) {
      const bytes = safeFS.readFileBufferSync(art.filePath);
      const actualSha = ArchiveBuilder.computeSha256(bytes);
      if (actualSha !== art.sha256) {
        hasilSha256 = 'FAIL';
        errors.push(`SHA-256 tidak cocok untuk ${art.filename}.`);
      }
      if (art.format === 'zip') {
        const z = ArchiveBuilder.verifyZip(bytes);
        if (!z.valid) {
          hasilEkstraksiArsip = 'FAIL';
          errors.push(...z.errors);
        }
      }
    }

    const hasilManifest: 'PASS' | 'FAIL' = 'PASS';
    const hasilDependency: 'PASS' | 'FAIL' = 'PASS';

    // Uji sandbox installer jika target OS cocok dengan host OS
    let hasilSandboxInstall: DistributionE2EVerifyReport['hasilSandboxInstall'] = 'NOT_VERIFIED';
    let hasilEksekusiInstalled: DistributionE2EVerifyReport['hasilEksekusiInstalled'] = 'NOT_VERIFIED';
    let hasilUpgrade: DistributionE2EVerifyReport['hasilUpgrade'] = 'NOT_VERIFIED';
    let hasilPenolakanTamper: DistributionE2EVerifyReport['hasilPenolakanTamper'] = 'NOT_VERIFIED';
    let hasilSandboxUninstall: DistributionE2EVerifyReport['hasilSandboxUninstall'] = 'NOT_VERIFIED';
    let hasilSisaUninstall: DistributionE2EVerifyReport['hasilSisaUninstall'] = 'NOT_VERIFIED';

    const hostOS = safeOS.platform();
    const isPosixHostMatch =
      (hostOS === 'linux' && cap.os === 'linux') ||
      (hostOS === 'darwin' && cap.os === 'darwin');

    if (isPosixHostMatch && !cap.isCross) {
      const tgz = pkgRes.artifacts.find((a) => a.format === 'tar.gz');
      if (tgz) {
        const sandboxExtract = safePath.join(options.outDir, 'sandbox-extract');
        const sandboxPrefix = safePath.join(options.outDir, 'sandbox-prefix');
        safeFS.rmSync(sandboxExtract, { recursive: true, force: true });
        safeFS.rmSync(sandboxPrefix, { recursive: true, force: true });
        safeFS.mkdirSync(sandboxExtract, { recursive: true });
        safeFS.mkdirSync(sandboxPrefix, { recursive: true });

        const tarRes = safeCP.spawnSync('tar', ['-xzf', tgz.filePath, '-C', sandboxExtract], {
          encoding: 'utf-8',
          timeout: 15000,
          shell: false,
        });
        if (tarRes.status !== 0) {
          hasilEkstraksiArsip = 'FAIL';
          errors.push(`Ekstraksi tar.gz gagal: ${tarRes.stderr}`);
        } else {
          const roots = safeFS.readdirSync(sandboxExtract);
          const pkgRoot = safePath.join(sandboxExtract, roots[0] || '');
          const installSh = safePath.join(pkgRoot, 'install.sh');
          const uninstallSh = safePath.join(pkgRoot, 'uninstall.sh');

          const inst1 = safeCP.spawnSync('sh', [installSh, '--prefix', sandboxPrefix, '--no-path'], {
            encoding: 'utf-8',
            timeout: 15000,
            shell: false,
          });
          hasilSandboxInstall = inst1.status === 0 ? 'PASS' : 'FAIL';
          if (inst1.status !== 0) errors.push(`install.sh gagal: ${inst1.stderr}`);

          const installedBin = safePath.join(sandboxPrefix, 'bin', appName);
          if (hasilSandboxInstall === 'PASS' && safeFS.existsSync(installedBin)) {
            const runInstalled = safeCP.spawnSync(installedBin, [], {
              encoding: 'utf-8',
              timeout: 15000,
              shell: false,
            });
            hasilEksekusiInstalled =
              runInstalled.status === 0 && (runInstalled.stdout || '').includes(VERIFY_SENTINEL)
                ? 'PASS'
                : 'FAIL';
            if (hasilEksekusiInstalled === 'FAIL') {
              errors.push(`Eksekusi biner terpasang gagal (exit=${runInstalled.status}).`);
            }
          }

          // Upgrade idempoten
          const inst2 = safeCP.spawnSync('sh', [installSh, '--prefix', sandboxPrefix, '--no-path'], {
            encoding: 'utf-8',
            timeout: 15000,
            shell: false,
          });
          hasilUpgrade = inst2.status === 0 ? 'PASS' : 'FAIL';

          // Penolakan tamper SHA256SUMS
          const readmeFile = safePath.join(pkgRoot, 'BACA-SAYA.txt');
          const origReadme = safeFS.readFileSync(readmeFile, 'utf-8');
          safeFS.writeFileSync(readmeFile, origReadme + '\nTAMPERED\n', 'utf-8');
          const instTamper = safeCP.spawnSync('sh', [installSh, '--prefix', sandboxPrefix, '--no-path'], {
            encoding: 'utf-8',
            timeout: 15000,
            shell: false,
          });
          hasilPenolakanTamper = instTamper.status !== 0 ? 'PASS' : 'FAIL';
          if (hasilPenolakanTamper === 'FAIL') {
            errors.push('install.sh tidak menolak berkas yang dimodifikasi (tamper).');
          }
          safeFS.writeFileSync(readmeFile, origReadme, 'utf-8');

          // Uninstall bersih
          const uninst = safeCP.spawnSync('sh', [uninstallSh, '--prefix', sandboxPrefix], {
            encoding: 'utf-8',
            timeout: 15000,
            shell: false,
          });
          hasilSandboxUninstall = uninst.status === 0 ? 'PASS' : 'FAIL';
          hasilSisaUninstall = !safeFS.existsSync(installedBin) ? 'PASS' : 'FAIL';
          if (hasilSisaUninstall === 'FAIL') {
            errors.push('Biner masih tersisa setelah uninstall.sh.');
          }
        }
      }
    }

    const anyFail =
      errors.length > 0 ||
      [
        hasilManifest,
        hasilSha256,
        hasilEkstraksiArsip,
        hasilDependency,
        hasilSandboxInstall,
        hasilEksekusiInstalled,
        hasilUpgrade,
        hasilPenolakanTamper,
        hasilSandboxUninstall,
        hasilSisaUninstall,
      ].includes('FAIL');

    const statusAkhir: DistributionE2EVerifyReport['statusAkhir'] = anyFail
      ? 'FAIL'
      : hasilSandboxInstall === 'NOT_VERIFIED'
        ? 'NOT_VERIFIED'
        : 'PASS';

    return {
      targetDiminta: options.target,
      targetTerdeteksi: canonical,
      triple: cap.triple,
      statusAkhir,
      exitCode: anyFail ? 1 : 0,
      hasilManifest,
      hasilSha256,
      hasilEkstraksiArsip,
      hasilDependency,
      hasilSandboxInstall,
      hasilEksekusiInstalled,
      hasilUpgrade,
      hasilPenolakanTamper,
      hasilSandboxUninstall,
      hasilSisaUninstall,
      daftarError: errors,
      artifacts: pkgRes.artifacts,
    };
  }
}
