/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Engine Sertifikasi & Audit Integritas 6 Target Desktop (Phase 23.2)
 * Target Milestone: Phase 23.2 / v0.23.5
 */

import { BinaryInspector } from '../compiler/executable/binary-inspector';
import { safeFS, safePath } from '../compiler/llvm/node-compat';
import { LLVMToolchainManager } from '../compiler/llvm/toolchain-manager';
import { ArchiveBuilder } from './archive-builder';
import { NativeBuildPipeline } from './native-pipeline';
import { DESKTOP_CANONICAL_TARGETS, TargetMatrixManager } from './target-matrix';
import {
  CanonicalDesktopTarget,
  Phase23AggregationResult,
  Phase23CertificationFinding,
  Phase23TargetEvidence,
} from './types';

export const PHASE23_CERTIFICATION_SENTINEL = 'NUSANTARA_NATIVE_CI_OK';

const PHASE23_CERTIFICATION_SOURCE = `
program UjiSertifikasiPhase23
mulai
  hasil : bilangan = 20 + 22
  tampilkan("${PHASE23_CERTIFICATION_SENTINEL}")
  tampilkan(hasil)
selesai
`;

const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /AIza[0-9A-Za-z\-_]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

export class Phase23CertificationEngine {
  public static generateTargetEvidence(options: {
    target: CanonicalDesktopTarget;
    outputDir: string;
    artifactBundleDir?: string;
    failOnMissingToolchain?: boolean;
    requireExecution?: boolean;
  }): Phase23TargetEvidence {
    const toolchain = new LLVMToolchainManager().detect();
    const cap = TargetMatrixManager.inspectTargetCapability(options.target, toolchain);
    const workOut = safePath.resolve(options.outputDir);
    safeFS.mkdirSync(workOut, { recursive: true });

    const buildRes = NativeBuildPipeline.build({
      sourceCode: PHASE23_CERTIFICATION_SOURCE,
      appName: `nusa_cert_${options.target}`,
      target: options.target,
      outputDirectory: workOut,
      optLevel: 'O2',
      linkingMode: 'auto',
      verifyExecution: true,
    });

    const bundleArtifactsDir = options.artifactBundleDir
      ? safePath.join(safePath.resolve(options.artifactBundleDir), 'artifacts', options.target)
      : workOut;
    safeFS.mkdirSync(bundleArtifactsDir, { recursive: true });

    const copyIfPresent = (srcPath?: string): string | undefined => {
      if (!srcPath || !safeFS.existsSync(srcPath)) return undefined;
      if (safePath.resolve(srcPath).startsWith(safePath.resolve(bundleArtifactsDir))) {
        return srcPath;
      }
      const dest = safePath.join(bundleArtifactsDir, safePath.basename(srcPath));
      safeFS.writeFileSync(dest, safeFS.readFileBufferSync(srcPath));
      return dest;
    };

    const llStored = copyIfPresent(buildRes.llvmIRPath);
    const objStored = copyIfPresent(buildRes.objectPath);
    const exeStored = copyIfPresent(buildRes.executablePath);

    const toRel = (abs?: string): string | undefined => {
      if (!abs) return undefined;
      if (options.artifactBundleDir) {
        return safePath.relative(safePath.resolve(options.artifactBundleDir), abs).replace(/\\/g, '/');
      }
      return abs;
    };

    const sentinelMatched = Boolean(
      buildRes.executionStdout && buildRes.executionStdout.includes(PHASE23_CERTIFICATION_SENTINEL)
    );

    let status: Phase23TargetEvidence['status'] = 'FAIL';
    let reason: string | undefined;

    if (!cap.canBuildNative) {
      if (options.failOnMissingToolchain && !cap.toolchainAvailable) {
        status = 'FAIL';
        reason = `Toolchain wajib tidak terpasang untuk '${options.target}': ${cap.missingRequirements.join('; ')}`;
      } else {
        status = 'NOT_VERIFIED';
        reason = `Target '${options.target}' belum dapat diverifikasi pada host ini: ${cap.missingRequirements.join('; ') || cap.diagnosticMessage}`;
      }
    } else if (!buildRes.success) {
      status = 'FAIL';
      reason = buildRes.diagnostics[buildRes.diagnostics.length - 1] || `Build native gagal (${buildRes.statusCode}).`;
    } else if (options.requireExecution && buildRes.executedOnHost && !sentinelMatched) {
      status = 'FAIL';
      reason = `Output stdout eksekusi tidak memuat sentinel '${PHASE23_CERTIFICATION_SENTINEL}'.`;
    } else if (
      options.requireExecution &&
      !buildRes.executedOnHost &&
      buildRes.executionMode === 'cross-compiled-not-executed'
    ) {
      status = 'NOT_VERIFIED';
      reason = `Biner '${options.target}' berhasil dikompilasi dan diinspeksi, tetapi host tidak memiliki emulator untuk mengeksekusi biner cross-arch.`;
    } else {
      status = 'PASS';
    }

    return {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      target: options.target,
      triple: cap.triple,
      hostOs: process.platform,
      hostArch: process.arch,
      recommendedRunner: cap.recommendedRunner,
      isCross: cap.isCross,
      compiler: {
        name: buildRes.compilerToolUsed || (toolchain.binaries.clang.found ? 'clang' : toolchain.binaries.llc.found ? 'llc' : 'none'),
        available: cap.clangAvailable || cap.llcAvailable,
        version: toolchain.version,
        command: toolchain.binaries.clang.found ? toolchain.binaries.clang.command : toolchain.binaries.llc.command,
      },
      linker: {
        name: buildRes.linkerToolUsed || cap.crossCompilerCommand || (toolchain.binaries.clang.found ? 'clang' : 'none'),
        lldAvailable: cap.lldAvailable,
        version: toolchain.binaries.lld.version || toolchain.binaries.clang.version,
        command: buildRes.linkerCommand,
      },
      sdk: {
        name: cap.sdkName,
        sysroot: cap.sysroot,
        available: Boolean(cap.sdkAvailable),
        linkerProbeVerified: Boolean(cap.linkerProbeVerified),
        missingRequirements: cap.missingRequirements,
      },
      llvmIR: {
        path: toRel(llStored),
        sha256: buildRes.llvmIRSha256,
        validationTool: buildRes.llvmValidationTool,
      },
      objectFile: {
        path: toRel(objStored),
        sha256: buildRes.objectSha256,
      },
      executable: {
        path: toRel(exeStored),
        sha256: buildRes.executableSha256,
        sizeBytes: buildRes.executableSizeBytes,
      },
      binaryMetadata: buildRes.binaryMetadata
        ? {
            format: buildRes.binaryMetadata.format,
            architecture: buildRes.binaryMetadata.architecture,
            binaryType: buildRes.binaryMetadata.binaryType || 'UNKNOWN',
            isValidExecutable: Boolean(buildRes.binaryMetadata.isValidExecutable),
            entryPointAddress: buildRes.binaryMetadata.entryPointAddress,
          }
        : undefined,
      dependencyValidation: buildRes.dependencyReport
        ? {
            allResolved: buildRes.dependencyReport.allResolved,
            isStatic: buildRes.dependencyReport.isStatic,
            missingLibraries: buildRes.dependencyReport.missingLibraries,
            dependencies: buildRes.dependencyReport.dependencies.map((d) => d.name),
          }
        : undefined,
      execution: {
        required: Boolean(options.requireExecution),
        executed: buildRes.executedOnHost,
        mode: buildRes.executionMode,
        exitCode: buildRes.executionExitCode,
        stdout: buildRes.executionStdout,
        sentinelExpected: PHASE23_CERTIFICATION_SENTINEL,
        sentinelMatched,
      },
      status,
      statusCode: buildRes.statusCode,
      reason,
      diagnostics: buildRes.diagnostics,
    };
  }

  public static aggregateEvidence(
    evidenceDir: string,
    options: {
      baseDir?: string;
      ciContext?: {
        serverUrl?: string;
        repository?: string;
        runId?: string;
        commitSha?: string;
        refName?: string;
      };
    } = {}
  ): Phase23AggregationResult {
    const absEvDir = safePath.resolve(evidenceDir);
    const absBaseDir = safePath.resolve(options.baseDir || safePath.dirname(absEvDir));

    const targetsMap = {} as Record<CanonicalDesktopTarget, Phase23TargetEvidence | null>;
    const findings: Phase23CertificationFinding[] = [];
    let passCount = 0;
    let notVerifiedCount = 0;
    let failCount = 0;
    let missingCount = 0;
    let corruptCount = 0;

    for (const target of DESKTOP_CANONICAL_TARGETS) {
      const evPath = safePath.join(absEvDir, `${target}.json`);
      if (!safeFS.existsSync(evPath)) {
        targetsMap[target] = null;
        missingCount++;
        findings.push({
          severity: 'error',
          code: 'TARGET_HILANG',
          target,
          message: `Berkas evidence '${target}.json' tidak ditemukan pada '${absEvDir}'.`,
        });
        continue;
      }

      const rawText = safeFS.readFileSync(evPath, 'utf-8');
      for (const pat of SECRET_PATTERNS) {
        if (pat.test(rawText)) {
          corruptCount++;
          targetsMap[target] = null;
          findings.push({
            severity: 'error',
            code: 'RAHASIA_TERDETEKSI',
            target,
            message: `Pola rahasia/token sensitif terdeteksi dalam '${target}.json'.`,
          });
          break;
        }
      }
      if (targetsMap[target] === null && findings.some((f) => f.target === target && f.code === 'RAHASIA_TERDETEKSI')) {
        continue;
      }

      let ev: Phase23TargetEvidence;
      try {
        ev = JSON.parse(rawText) as Phase23TargetEvidence;
      } catch (err: any) {
        corruptCount++;
        targetsMap[target] = null;
        findings.push({
          severity: 'error',
          code: 'JSON_RUSAK',
          target,
          message: `Evidence JSON '${target}.json' tidak valid: ${err?.message || err}`,
        });
        continue;
      }

      if (!ev || ev.target !== target || !ev.triple || !ev.status) {
        corruptCount++;
        targetsMap[target] = null;
        findings.push({
          severity: 'error',
          code: 'JSON_RUSAK',
          target,
          message: `Skema evidence '${target}.json' tidak lengkap atau target tidak cocok.`,
        });
        continue;
      }

      targetsMap[target] = ev;

      if (ev.status === 'FAIL') {
        failCount++;
        findings.push({
          severity: 'error',
          code: 'TARGET_GAGAL',
          target,
          message: ev.reason || `Target '${target}' melaporkan status FAIL.`,
        });
        continue;
      }

      if (ev.status === 'NOT_VERIFIED') {
        notVerifiedCount++;
        findings.push({
          severity: 'warning',
          code: 'TARGET_NOT_VERIFIED',
          target,
          message: ev.reason || `Target '${target}' berstatus NOT_VERIFIED dan belum lulus sertifikasi.`,
        });
        continue;
      }

      // Status PASS: audit mendalam bukti biner, SHA-256 di disk, arsitektur, dan eksekusi!
      let targetValid = true;
      const checkArtifactSha = (relOrAbs: string | undefined, expectedSha: string | undefined, label: string): string | null => {
        if (!relOrAbs || !expectedSha) {
          findings.push({
            severity: 'error',
            code: 'SHA256_TIDAK_COCOK',
            target,
            message: `Metadata path/sha256 untuk ${label} kosong pada target PASS.`,
          });
          targetValid = false;
          return null;
        }
        const resolved = safePath.isAbsolute(relOrAbs)
          ? relOrAbs
          : safePath.resolve(absBaseDir, relOrAbs);
        if (!safeFS.existsSync(resolved)) {
          findings.push({
            severity: 'error',
            code: 'SHA256_TIDAK_COCOK',
            target,
            message: `Berkas artefak ${label} tidak ditemukan di disk: '${resolved}'.`,
          });
          targetValid = false;
          return null;
        }
        const actualSha = ArchiveBuilder.computeSha256(safeFS.readFileBufferSync(resolved));
        if (actualSha !== expectedSha.toLowerCase()) {
          findings.push({
            severity: 'error',
            code: 'SHA256_TIDAK_COCOK',
            target,
            message: `SHA-256 ${label} tidak cocok (diharapkan ${expectedSha}, aktual ${actualSha}).`,
          });
          targetValid = false;
          return null;
        }
        return resolved;
      };

      checkArtifactSha(ev.llvmIR?.path, ev.llvmIR?.sha256, 'LLVM IR');
      checkArtifactSha(ev.objectFile?.path, ev.objectFile?.sha256, 'Object File');
      const exeDiskPath = checkArtifactSha(ev.executable?.path, ev.executable?.sha256, 'Executable');

      const expectedFormat = ev.target.startsWith('windows')
        ? 'COFF'
        : ev.target.startsWith('macos')
        ? 'Mach-O'
        : 'ELF';
      const expectedArch = ev.target.endsWith('arm64') ? 'aarch64' : 'x86_64';

      if (exeDiskPath) {
        const meta = BinaryInspector.inspectStrict(exeDiskPath);
        if (!meta.isValidExecutable || meta.format !== expectedFormat || meta.architecture !== expectedArch) {
          findings.push({
            severity: 'error',
            code: 'ARSITEKTUR_BINER_SALAH',
            target,
            message: `Header biner tidak sesuai target '${target}' (expected ${expectedFormat}/${expectedArch}, aktual ${meta.format}/${meta.architecture}).`,
          });
          targetValid = false;
        }
      } else if (
        ev.binaryMetadata &&
        (!ev.binaryMetadata.isValidExecutable ||
          ev.binaryMetadata.format !== expectedFormat ||
          ev.binaryMetadata.architecture !== expectedArch)
      ) {
        findings.push({
          severity: 'error',
          code: 'ARSITEKTUR_BINER_SALAH',
          target,
          message: `Metadata biner '${target}' tidak cocok (${ev.binaryMetadata.format}/${ev.binaryMetadata.architecture}).`,
        });
        targetValid = false;
      }

      if (
        !ev.execution?.executed ||
        ev.execution.exitCode !== 0 ||
        !ev.execution.sentinelMatched ||
        !(ev.execution.stdout || '').includes(ev.execution.sentinelExpected || PHASE23_CERTIFICATION_SENTINEL)
      ) {
        findings.push({
          severity: 'error',
          code: 'EKSEKUSI_GAGAL',
          target,
          message: `Bukti eksekusi runtime untuk '${target}' tidak valid (executed=${ev.execution?.executed}, exit=${ev.execution?.exitCode}, sentinelMatched=${ev.execution?.sentinelMatched}).`,
        });
        targetValid = false;
      }

      if (targetValid) {
        passCount++;
      } else {
        failCount++;
      }
    }

    const overallStatus: Phase23AggregationResult['overallStatus'] =
      passCount === DESKTOP_CANONICAL_TARGETS.length &&
      notVerifiedCount === 0 &&
      failCount === 0 &&
      missingCount === 0 &&
      corruptCount === 0
        ? 'CERTIFIED'
        : failCount > 0 || missingCount > 0 || corruptCount > 0
        ? 'FAILED'
        : 'PARTIAL';

    const exitCode: 0 | 1 = overallStatus === 'CERTIFIED' ? 0 : 1;

    const lines: string[] = [];
    lines.push('# Laporan Sertifikasi 6 Target Desktop NUSANTARA (Phase 23)');
    lines.push('');
    lines.push(`- **Status Keseluruhan:** \`${overallStatus}\` (exitCode=${exitCode})`);
    lines.push(
      `- **Ringkasan:** PASS=${passCount}/${DESKTOP_CANONICAL_TARGETS.length} | NOT_VERIFIED=${notVerifiedCount} | FAIL=${failCount} | MISSING=${missingCount} | CORRUPT=${corruptCount}`
    );
    if (options.ciContext?.runId) {
      lines.push(
        `- **Konteks CI:** ${options.ciContext.serverUrl || 'https://github.com'}/${options.ciContext.repository || ''}/actions/runs/${options.ciContext.runId} (commit \`${options.ciContext.commitSha || '-'}\`, ref \`${options.ciContext.refName || '-'}\`)`
      );
    }
    lines.push('');
    lines.push('| Target | Triple | Status | Compiler / Linker | Format / Arch | Mode Eksekusi | Keterangan |');
    lines.push('| :--- | :--- | :---: | :--- | :--- | :--- | :--- |');
    for (const target of DESKTOP_CANONICAL_TARGETS) {
      const ev = targetsMap[target];
      if (!ev) {
        lines.push(`| \`${target}\` | - | **MISSING/CORRUPT** | - | - | - | Evidence tidak tersedia atau korup |`);
      } else {
        const fmt = ev.binaryMetadata ? `${ev.binaryMetadata.format}/${ev.binaryMetadata.architecture}` : '-';
        lines.push(
          `| \`${target}\` | \`${ev.triple}\` | **${ev.status}** | ${ev.compiler.name} / ${ev.linker.name} | ${fmt} | ${ev.execution.mode} | ${ev.reason || 'Terverifikasi'} |`
        );
      }
    }
    lines.push('');
    if (findings.length > 0) {
      lines.push('## Temuan Audit');
      for (const f of findings) {
        lines.push(`- **[${f.severity.toUpperCase()}][${f.code}]** \`${f.target}\`: ${f.message}`);
      }
      lines.push('');
    }

    return {
      overallStatus,
      exitCode,
      counts: {
        totalRequired: DESKTOP_CANONICAL_TARGETS.length,
        pass: passCount,
        notVerified: notVerifiedCount,
        fail: failCount,
        missing: missingCount,
        corrupt: corruptCount,
      },
      targets: targetsMap,
      findings,
      markdownReport: lines.join('\n'),
    };
  }
}
