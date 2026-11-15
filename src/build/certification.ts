/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Sertifikasi Enam Target Desktop & Hardening Evidence CI (Phase 23.2)
 * Menghasilkan JSON evidence per target tanpa rahasia, memvalidasi SHA-256 & metadata biner,
 * dan mengagregasi status keseluruhan (CERTIFIED / PARTIAL / FAILED).
 */

import { BinaryInspector } from '../compiler/executable/binary-inspector';
import { safeFS, safeOS, safePath } from '../compiler/llvm/node-compat';
import { TargetTripleManager } from '../compiler/llvm/target-triple';
import { LLVMToolchainManager } from '../compiler/llvm/toolchain-manager';
import { ArchiveBuilder } from './archive-builder';
import { NativeBuildPipeline } from './native-pipeline';
import { DESKTOP_CANONICAL_TARGETS, TargetMatrixManager } from './target-matrix';
import { CanonicalDesktopTarget, ExecutionVerificationResult } from './types';

export type Phase23TargetStatus = 'PASS' | 'FAIL' | 'NOT_VERIFIED';
export type Phase23OverallStatus = 'CERTIFIED' | 'PARTIAL' | 'FAILED';

export type Phase23FindingCode =
  | 'TARGET_HILANG'
  | 'JSON_RUSAK'
  | 'SKEMA_TIDAK_SAH'
  | 'TARGET_FAIL'
  | 'TARGET_NOT_VERIFIED'
  | 'SHA256_TIDAK_COCOK'
  | 'ARSITEKTUR_BINER_SALAH'
  | 'FORMAT_BINER_SALAH'
  | 'EKSEKUSI_GAGAL'
  | 'DEPENDENSI_HILANG'
  | 'KEBOCORAN_RAHASIA';

export interface Phase23Finding {
  code: Phase23FindingCode;
  target: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface Phase23TargetEvidence {
  schemaVersion: '1.0.0';
  target: CanonicalDesktopTarget;
  triple: string;
  hostOs: string;
  hostArch: string;
  compiler: {
    name: string;
    version: string;
    command?: string;
  };
  linker: {
    name: string;
    version: string;
    command?: string;
  };
  sdk: {
    name: string;
    sysroot?: string;
    available: boolean;
    linkerProbeVerified?: boolean;
    missingRequirements: string[];
  };
  llvmIR: {
    path?: string;
    sha256?: string;
    validationTool?: string;
    verified: boolean;
  };
  objectFile: {
    path?: string;
    sha256?: string;
  };
  executable: {
    path?: string;
    sha256?: string;
    sizeBytes?: number;
  };
  binaryMetadata: {
    format?: string;
    architecture?: string;
    operatingSystem?: string;
    binaryType?: string;
    isValidExecutable: boolean;
  };
  dependencyValidation: {
    allResolved: boolean;
    inspectedFromDisk: boolean;
    dependencies: Array<{ name: string; found: boolean; isSystemLib: boolean }>;
    missingLibraries: string[];
  };
  execution: {
    executed: boolean;
    mode: NonNullable<ExecutionVerificationResult['executionMode']>;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    expectedSentinels: string[];
    expectedOutputsMatched: boolean;
  };
  status: Phase23TargetStatus;
  reason: string;
  generatedAt: string;
}

export interface Phase23CIContext {
  serverUrl?: string;
  repository?: string;
  runId?: string;
  commitSha?: string;
  refName?: string;
}

export interface Phase23AggregationResult {
  overallStatus: Phase23OverallStatus;
  exitCode: number;
  totalExpectedTargets: number;
  counts: {
    pass: number;
    fail: number;
    notVerified: number;
    missing: number;
    corrupt: number;
  };
  targets: Partial<Record<CanonicalDesktopTarget, Phase23TargetEvidence>>;
  missingTargets: CanonicalDesktopTarget[];
  findings: Phase23Finding[];
  markdownReport: string;
  generatedAt: string;
}

export const DEFAULT_PHASE23_CERTIFICATION_SENTINELS = [
  'NUSANTARA_NATIVE_CI_OK',
  'Pengujian LLVM IR berhasil',
  'Bahasa Indonesia',
  '42',
];

export const DEFAULT_PHASE23_CERTIFICATION_SOURCE = `program UjiNativePhase23
mulai
  hasil : bilangan = 20 + 22
  tampilkan("NUSANTARA_NATIVE_CI_OK")
  tampilkan("Pengujian LLVM IR berhasil")
  tampilkan("Bahasa Indonesia")
  tampilkan(hasil)
selesai
`;

const EXPECTED_FORMAT_BY_TARGET: Record<CanonicalDesktopTarget, 'ELF' | 'COFF' | 'Mach-O'> = {
  'windows-x86_64': 'COFF',
  'windows-arm64': 'COFF',
  'linux-x86_64': 'ELF',
  'linux-arm64': 'ELF',
  'macos-x86_64': 'Mach-O',
  'macos-arm64': 'Mach-O',
};

const EXPECTED_ARCH_BY_TARGET: Record<CanonicalDesktopTarget, 'x86_64' | 'aarch64'> = {
  'windows-x86_64': 'x86_64',
  'windows-arm64': 'aarch64',
  'linux-x86_64': 'x86_64',
  'linux-arm64': 'aarch64',
  'macos-x86_64': 'x86_64',
  'macos-arm64': 'aarch64',
};

const SECRET_PATTERNS = [
  /ghp_[a-zA-Z0-9]{25,}/,
  /github_pat_[a-zA-Z0-9_]{30,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
];

export class Phase23CertificationEngine {
  public static getExpectedFormat(target: CanonicalDesktopTarget): 'ELF' | 'COFF' | 'Mach-O' {
    return EXPECTED_FORMAT_BY_TARGET[target];
  }

  public static getExpectedArch(target: CanonicalDesktopTarget): 'x86_64' | 'aarch64' {
    return EXPECTED_ARCH_BY_TARGET[target];
  }

  public static isValidSha256(val: unknown): val is string {
    return typeof val === 'string' && /^[a-f0-9]{64}$/i.test(val);
  }

  public static sanitizeString(text: string): string {
    let clean = text;
    for (const pat of SECRET_PATTERNS) {
      clean = clean.replace(new RegExp(pat.source, 'g'), '[REDACTED]');
    }
    return clean;
  }

  public static generateTargetEvidence(options: {
    target: CanonicalDesktopTarget;
    outputDir: string;
    artifactBundleDir?: string;
    sourceCode?: string;
    appName?: string;
    customToolchainPath?: string;
    sysrootOverride?: string;
    failOnMissingToolchain?: boolean;
    requireExecution?: boolean;
    expectedSentinels?: string[];
  }): Phase23TargetEvidence {
    const appName = options.appName || 'uji_ci_native';
    const sentinels = options.expectedSentinels || [...DEFAULT_PHASE23_CERTIFICATION_SENTINELS];
    const requireExecution = options.requireExecution !== false;
    const hostOs = typeof process !== 'undefined' ? process.platform : safeOS.platform();
    const hostArch = typeof process !== 'undefined' ? process.arch : 'unknown';

    const cap = TargetMatrixManager.inspectTargetCapability(options.target, {
      customToolchainPath: options.customToolchainPath,
      sysrootOverride: options.sysrootOverride,
    });
    const toolchain = new LLVMToolchainManager(options.customToolchainPath).detect();

    const baseEvidence = (): Phase23TargetEvidence => ({
      schemaVersion: '1.0.0',
      target: options.target,
      triple: cap.triple || TargetTripleManager.resolve(options.target).triple,
      hostOs,
      hostArch,
      compiler: {
        name: toolchain.binaries.clang.found
          ? toolchain.binaries.clang.command
          : toolchain.binaries.llc.found
          ? toolchain.binaries.llc.command
          : 'none',
        version: toolchain.version || 'N/A',
        command: toolchain.binaries.clang.found ? toolchain.binaries.clang.command : undefined,
      },
      linker: {
        name: cap.crossCompilerCommand || (toolchain.binaries.lld.found ? toolchain.binaries.lld.command : 'none'),
        version: 'N/A',
      },
      sdk: {
        name: cap.sdkName || (cap.isCross ? `${options.target} cross-SDK` : 'host system SDK'),
        sysroot: cap.sysrootPath,
        available: cap.isCross ? cap.crossSdkAvailable : cap.toolchainAvailable,
        linkerProbeVerified: cap.linkerProbeVerified,
        missingRequirements: [...cap.missingRequirements],
      },
      llvmIR: {
        verified: false,
      },
      objectFile: {},
      executable: {},
      binaryMetadata: {
        isValidExecutable: false,
      },
      dependencyValidation: {
        allResolved: false,
        inspectedFromDisk: false,
        dependencies: [],
        missingLibraries: [],
      },
      execution: {
        executed: false,
        mode: cap.isCross ? 'cross-compiled-not-executed' : 'not-executed',
        exitCode: null,
        stdout: '',
        stderr: '',
        expectedSentinels: sentinels,
        expectedOutputsMatched: false,
      },
      status: 'NOT_VERIFIED',
      reason: '',
      generatedAt: new Date().toISOString(),
    });

    // Kasus 1: Toolchain dasar tidak tersedia
    if (!cap.toolchainAvailable) {
      const ev = baseEvidence();
      ev.status = options.failOnMissingToolchain ? 'FAIL' : 'NOT_VERIFIED';
      ev.reason = this.sanitizeString(
        cap.missingRequirements.join('; ') || 'Toolchain LLVM/Clang tidak terpasang di runner ini.'
      );
      return ev;
    }

    // Kasus 2: Cross-SDK atau linker probe target (mis. windows-arm64) tidak tersedia
    if (!cap.canBuildNative) {
      const ev = baseEvidence();
      ev.status = 'NOT_VERIFIED';
      ev.reason = this.sanitizeString(
        cap.missingRequirements.join('; ') ||
          `Cross-SDK/linker target '${options.target}' tidak tersedia di host ${hostOs}/${hostArch}.`
      );
      return ev;
    }

    // Kasus 3: Jalankan kompilasi nyata lewat NativeBuildPipeline
    if (!safeFS.existsSync(options.outputDir)) {
      safeFS.mkdirSync(options.outputDir, { recursive: true });
    }

    const res = NativeBuildPipeline.build({
      sourceCode: options.sourceCode || DEFAULT_PHASE23_CERTIFICATION_SOURCE,
      appName,
      target: options.target,
      outputDirectory: options.outputDir,
      linkingMode: 'dynamic',
      strip: true,
      customToolchainPath: options.customToolchainPath,
      sysrootOverride: options.sysrootOverride,
      verifyExecution: true,
    });

    const ev = baseEvidence();
    if (res.compilerInfo) {
      ev.compiler = {
        name: res.compilerInfo.name,
        version: res.compilerInfo.version || toolchain.version || 'N/A',
        command: res.compilerInfo.command,
      };
    }
    if (res.linkerInfo) {
      ev.linker = {
        name: res.linkerInfo.name,
        version: res.linkerInfo.version || 'N/A',
        command: res.linkerInfo.commandExecuted ? this.sanitizeString(res.linkerInfo.commandExecuted) : undefined,
      };
    }

    // Salin artefak nyata ke bundleDir bila disediakan agar aggregate job bisa memverifikasi hash & header ulang
    const bundleFilesDir = options.artifactBundleDir
      ? safePath.join(options.artifactBundleDir, 'files', options.target)
      : undefined;
    if (bundleFilesDir && !safeFS.existsSync(bundleFilesDir)) {
      safeFS.mkdirSync(bundleFilesDir, { recursive: true });
    }

    const storeFile = (srcPath: string | undefined, fallbackName: string): string | undefined => {
      if (!srcPath || !safeFS.existsSync(srcPath)) return undefined;
      if (bundleFilesDir && options.artifactBundleDir) {
        const destAbs = safePath.join(bundleFilesDir, safePath.basename(srcPath) || fallbackName);
        safeFS.writeFileSync(destAbs, safeFS.readFileBufferSync(srcPath));
        return safePath.relative(options.artifactBundleDir, destAbs).replace(/\\/g, '/');
      }
      return srcPath;
    };

    ev.llvmIR = {
      path: storeFile(res.llvmIRPath, `${appName}.ll`),
      sha256: res.llvmIRSha256,
      validationTool: res.llvmValidationTool || (toolchain.binaries.llvmAs.found ? 'llvm-as' : 'static-verifier'),
      verified: Boolean(res.llvmIRSha256 && res.statusCode !== 'GALAT_KOMPILASI'),
    };
    ev.objectFile = {
      path: storeFile(res.objectPath, `${appName}${cap.targetInfo?.objectExtension || '.o'}`),
      sha256: res.objectSha256,
    };
    ev.executable = {
      path: storeFile(res.executablePath, `${appName}${cap.targetInfo?.executableExtension || ''}`),
      sha256: res.executableSha256,
      sizeBytes:
        res.executablePath && safeFS.existsSync(res.executablePath)
          ? safeFS.readFileBufferSync(res.executablePath).length
          : undefined,
    };

    if (res.binaryMetadata) {
      ev.binaryMetadata = {
        format: res.binaryMetadata.format,
        architecture: res.binaryMetadata.architecture,
        operatingSystem: res.binaryMetadata.operatingSystem,
        binaryType: res.binaryMetadata.binaryType,
        isValidExecutable: Boolean(res.binaryMetadata.isValidExecutable),
      };
    }

    if (res.dependencyReport) {
      ev.dependencyValidation = {
        allResolved: res.dependencyReport.allResolved,
        inspectedFromDisk: Boolean(res.dependencyReport.inspectedFromDisk),
        dependencies: res.dependencyReport.dependencies.map((d) => ({
          name: d.name,
          found: d.found,
          isSystemLib: d.isSystemLib,
        })),
        missingLibraries: [...(res.dependencyReport.missingLibraries || [])],
      };
    }

    if (res.executionVerification) {
      const stdout = res.executionVerification.stdout || '';
      const matched =
        res.executionVerification.executed &&
        res.executionVerification.success &&
        sentinels.every((s) => stdout.includes(s));
      ev.execution = {
        executed: res.executionVerification.executed,
        mode:
          res.executionVerification.executionMode ||
          (cap.isCross ? 'cross-compiled-not-executed' : 'not-executed'),
        exitCode: res.executionVerification.exitCode,
        stdout: this.sanitizeString(stdout),
        stderr: this.sanitizeString(res.executionVerification.stderr || ''),
        expectedSentinels: sentinels,
        expectedOutputsMatched: matched,
      };
    }

    if (!res.success) {
      if (res.statusCode === 'CROSS_SDK_TIDAK_TERSEDIA') {
        ev.status = 'NOT_VERIFIED';
      } else {
        ev.status = 'FAIL';
      }
      ev.reason = this.sanitizeString(res.diagnostics.slice(-4).join(' | ') || res.statusCode);
      return ev;
    }

    // Cek konsistensi eksekusi bila diwajibkan
    if (!ev.execution.executed) {
      ev.status = requireExecution ? 'NOT_VERIFIED' : 'PASS';
      ev.reason = requireExecution
        ? `Cross-compiled (${ev.binaryMetadata.format}/${ev.binaryMetadata.architecture}) berhasil & SHA-256 tervalidasi, tetapi eksekusi tidak tersedia pada host ${hostOs}/${hostArch} (${ev.execution.mode}).`
        : 'Kompilasi dan inspeksi biner berhasil tanpa eksekusi.';
      return ev;
    }

    if (ev.execution.exitCode !== 0 || !ev.execution.expectedOutputsMatched) {
      ev.status = 'FAIL';
      const missing = sentinels.filter((s) => !ev.execution.stdout.includes(s));
      ev.reason = `Eksekusi gagal (exit=${ev.execution.exitCode}) atau output sentinel tidak lengkap: [${missing.join(', ')}]`;
      return ev;
    }

    ev.status = 'PASS';
    ev.reason = `Kompilasi LLVM IR, linking, inspeksi biner (${ev.binaryMetadata.format}/${ev.binaryMetadata.architecture}), dependensi, dan eksekusi (${ev.execution.mode}) berhasil.`;
    return ev;
  }

  public static aggregateEvidence(
    evidenceDir: string,
    options: {
      baseDir?: string;
      ciContext?: Phase23CIContext;
      expectedSentinels?: string[];
    } = {}
  ): Phase23AggregationResult {
    const sentinels = options.expectedSentinels || [...DEFAULT_PHASE23_CERTIFICATION_SENTINELS];
    const baseDir = options.baseDir || safePath.dirname(safePath.resolve(evidenceDir));
    const findings: Phase23Finding[] = [];
    const targets: Partial<Record<CanonicalDesktopTarget, Phase23TargetEvidence>> = {};
    const missingTargets: CanonicalDesktopTarget[] = [];

    let pass = 0;
    let fail = 0;
    let notVerified = 0;
    let corrupt = 0;

    for (const target of DESKTOP_CANONICAL_TARGETS) {
      const filePath = safePath.join(evidenceDir, `${target}.json`);
      if (!safeFS.existsSync(filePath)) {
        missingTargets.push(target);
        findings.push({
          code: 'TARGET_HILANG',
          target,
          severity: 'error',
          message: `Berkas evidence '${target}.json' tidak ditemukan di ${evidenceDir}.`,
        });
        continue;
      }

      let rawText = '';
      let parsed: any;
      try {
        rawText = safeFS.readFileSync(filePath, 'utf-8');
        parsed = JSON.parse(rawText);
      } catch (err: any) {
        corrupt++;
        findings.push({
          code: 'JSON_RUSAK',
          target,
          severity: 'error',
          message: `Berkas evidence '${target}.json' bukan JSON yang sah: ${err?.message || err}`,
        });
        continue;
      }

      // Cek secret leakage pada teks mentah JSON
      if (SECRET_PATTERNS.some((pat) => pat.test(rawText))) {
        corrupt++;
        findings.push({
          code: 'KEBOCORAN_RAHASIA',
          target,
          severity: 'error',
          message: `Evidence '${target}.json' terindikasi mengandung pola rahasia/token yang tidak diperbolehkan.`,
        });
        continue;
      }

      // Validasi skema dasar
      const schemaErrors = this.validateEvidenceSchema(parsed, target);
      if (schemaErrors.length > 0) {
        corrupt++;
        findings.push({
          code: 'SKEMA_TIDAK_SAH',
          target,
          severity: 'error',
          message: `Skema '${target}.json' tidak sah: ${schemaErrors.join('; ')}`,
        });
        continue;
      }

      const ev = parsed as Phase23TargetEvidence;
      targets[target] = ev;

      // Evaluasi ulang status & keabsahan artefak untuk status PASS
      let targetHasIntegrityError = false;

      if (ev.status === 'FAIL') {
        fail++;
        findings.push({
          code: 'TARGET_FAIL',
          target,
          severity: 'error',
          message: ev.reason || `Target '${target}' melaporkan status FAIL.`,
        });
        continue;
      }

      // Cek inkonsistensi jika execution.executed = true tetapi gagal / sentinel hilang
      if (ev.execution.executed) {
        const missingSents = sentinels.filter((s) => !(ev.execution.stdout || '').includes(s));
        if (ev.execution.exitCode !== 0 || !ev.execution.expectedOutputsMatched || missingSents.length > 0) {
          targetHasIntegrityError = true;
          findings.push({
            code: 'EKSEKUSI_GAGAL',
            target,
            severity: 'error',
            message: `Eksekusi target '${target}' gagal (exit=${ev.execution.exitCode}, missingSentinels=[${missingSents.join(', ')}]).`,
          });
        }
      }

      // Validasi SHA-256, arsitektur, format, dependensi & eksekusi wajib jika mengklaim PASS
      if (ev.status === 'PASS') {
        if (!this.isValidSha256(ev.llvmIR?.sha256) || !this.isValidSha256(ev.objectFile?.sha256) || !this.isValidSha256(ev.executable?.sha256)) {
          targetHasIntegrityError = true;
          findings.push({
            code: 'SHA256_TIDAK_COCOK',
            target,
            severity: 'error',
            message: `Target '${target}' berstatus PASS tetapi hash SHA-256 (.ll/.o/executable) hilang atau format tidak valid.`,
          });
        } else {
          // Jika file artefak ikut diunggah di disk, hitung ulang SHA-256 nyata dari disk
          const hashChecks: Array<{ label: string; relOrAbs?: string; expected: string }> = [
            { label: 'llvmIR', relOrAbs: ev.llvmIR.path, expected: ev.llvmIR.sha256! },
            { label: 'objectFile', relOrAbs: ev.objectFile.path, expected: ev.objectFile.sha256! },
            { label: 'executable', relOrAbs: ev.executable.path, expected: ev.executable.sha256! },
          ];

          for (const hc of hashChecks) {
            const diskPath = this.resolveArtifactDiskPath(hc.relOrAbs, evidenceDir, baseDir);
            if (diskPath && safeFS.existsSync(diskPath)) {
              const actualHash = ArchiveBuilder.computeSha256(safeFS.readFileBufferSync(diskPath));
              if (actualHash.toLowerCase() !== hc.expected.toLowerCase()) {
                targetHasIntegrityError = true;
                findings.push({
                  code: 'SHA256_TIDAK_COCOK',
                  target,
                  severity: 'error',
                  message: `SHA-256 ${hc.label} untuk '${target}' tidak cocok! JSON=${hc.expected}, disk=${actualHash}.`,
                });
              }
            }
          }
        }

        // Validasi format & arsitektur biner
        const expectedFmt = EXPECTED_FORMAT_BY_TARGET[target];
        const expectedArch = EXPECTED_ARCH_BY_TARGET[target];

        if (!ev.binaryMetadata?.isValidExecutable || ev.binaryMetadata.format !== expectedFmt) {
          targetHasIntegrityError = true;
          findings.push({
            code: 'FORMAT_BINER_SALAH',
            target,
            severity: 'error',
            message: `Format biner '${target}' tidak cocok: aktual='${ev.binaryMetadata?.format}', diharapkan='${expectedFmt}', valid=${ev.binaryMetadata?.isValidExecutable}.`,
          });
        }
        if (ev.binaryMetadata?.architecture !== expectedArch) {
          targetHasIntegrityError = true;
          findings.push({
            code: 'ARSITEKTUR_BINER_SALAH',
            target,
            severity: 'error',
            message: `Arsitektur biner '${target}' salah: aktual='${ev.binaryMetadata?.architecture}', diharapkan='${expectedArch}'.`,
          });
        }

        // Jika biner executable ada di disk, inspeksi ulang lewat BinaryInspector.inspectStrict
        const exeDiskPath = this.resolveArtifactDiskPath(ev.executable.path, evidenceDir, baseDir);
        if (exeDiskPath && safeFS.existsSync(exeDiskPath)) {
          const diskMeta = BinaryInspector.inspectStrict(exeDiskPath);
          if (
            !diskMeta.isValidExecutable ||
            diskMeta.format !== expectedFmt ||
            diskMeta.architecture !== expectedArch
          ) {
            targetHasIntegrityError = true;
            findings.push({
              code: 'ARSITEKTUR_BINER_SALAH',
              target,
              severity: 'error',
              message: `Inspeksi ulang biner di disk '${target}' gagal: format=${diskMeta.format}, arch=${diskMeta.architecture}, valid=${diskMeta.isValidExecutable}.`,
            });
          }
        }

        if (!ev.dependencyValidation?.allResolved) {
          targetHasIntegrityError = true;
          findings.push({
            code: 'DEPENDENSI_HILANG',
            target,
            severity: 'error',
            message: `Dependensi executable '${target}' belum terpenuhi: ${ev.dependencyValidation?.missingLibraries?.join(', ') || 'unknown'}.`,
          });
        }

        if (!ev.execution?.executed) {
          targetHasIntegrityError = true;
          findings.push({
            code: 'EKSEKUSI_GAGAL',
            target,
            severity: 'error',
            message: `Target '${target}' mengklaim PASS tanpa bukti eksekusi (mode=${ev.execution?.mode}).`,
          });
        }

        if (targetHasIntegrityError) {
          fail++;
        } else {
          pass++;
        }
        continue;
      }

      if (ev.status === 'NOT_VERIFIED') {
        if (targetHasIntegrityError) {
          fail++;
        } else {
          notVerified++;
          findings.push({
            code: 'TARGET_NOT_VERIFIED',
            target,
            severity: 'warning',
            message: ev.reason || `Target '${target}' berstatus NOT_VERIFIED.`,
          });
        }
      }
    }

    let overallStatus: Phase23OverallStatus;
    if (fail > 0 || corrupt > 0 || missingTargets.length > 0) {
      overallStatus = 'FAILED';
    } else if (notVerified > 0 || pass < DESKTOP_CANONICAL_TARGETS.length) {
      overallStatus = 'PARTIAL';
    } else {
      overallStatus = 'CERTIFIED';
    }

    const generatedAt = new Date().toISOString();
    const result: Phase23AggregationResult = {
      overallStatus,
      exitCode: overallStatus === 'CERTIFIED' ? 0 : 1,
      totalExpectedTargets: DESKTOP_CANONICAL_TARGETS.length,
      counts: {
        pass,
        fail,
        notVerified,
        missing: missingTargets.length,
        corrupt,
      },
      targets,
      missingTargets,
      findings,
      markdownReport: '',
      generatedAt,
    };

    result.markdownReport = this.renderMarkdownReport(result, options.ciContext);
    return result;
  }

  public static renderMarkdownReport(
    report: Phase23AggregationResult,
    ciContext: Phase23CIContext = {}
  ): string {
    const lines: string[] = [];
    const badge =
      report.overallStatus === 'CERTIFIED'
        ? 'CERTIFIED (6/6 PASS)'
        : report.overallStatus === 'PARTIAL'
        ? 'PARTIAL (BELUM LENGKAP)'
        : 'FAILED';

    lines.push('# Laporan Sertifikasi Desktop 6 Target — Phase 23 (NUSANTARA)');
    lines.push('');
    lines.push(`- **Status Keseluruhan:** \`${report.overallStatus}\` — ${badge}`);
    lines.push(`- **Total Target Wajib:** ${report.totalExpectedTargets}`);
    lines.push(
      `- **Ringkasan Hitungan:** PASS=${report.counts.pass}, NOT_VERIFIED=${report.counts.notVerified}, FAIL=${report.counts.fail}, MISSING=${report.counts.missing}, CORRUPT=${report.counts.corrupt}`
    );
    lines.push(`- **Waktu Agregasi:** ${report.generatedAt}`);

    if (ciContext.repository && ciContext.runId) {
      const server = ciContext.serverUrl || 'https://github.com';
      const runUrl = `${server}/${ciContext.repository}/actions/runs/${ciContext.runId}`;
      lines.push(`- **GitHub Actions Run:** [${ciContext.runId}](${runUrl})`);
      lines.push(`- **Artefak CI:** [${runUrl}#artifacts](${runUrl}#artifacts)`);
    }
    if (ciContext.commitSha) {
      lines.push(`- **Commit SHA:** \`${ciContext.commitSha}\``);
    }

    lines.push('');
    lines.push('## Matriks Sertifikasi Enam Target');
    lines.push('');
    lines.push(
      '| Target | Triple | Host | Compiler / Linker | Format / Arch | SHA-256 Executable | Mode Eksekusi | Status | Keterangan |'
    );
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |');

    for (const target of DESKTOP_CANONICAL_TARGETS) {
      const ev = report.targets[target];
      if (!ev) {
        const missingErr = report.findings.find((f) => f.target === target);
        lines.push(
          `| \`${target}\` | \`${TargetTripleManager.resolve(target).triple}\` | - | - | - | - | - | **${
            report.missingTargets.includes(target) ? 'MISSING' : 'INVALID'
          }** | ${missingErr?.message || 'Evidence tidak tersedia'} |`
        );
        continue;
      }

      const fmtArch = ev.binaryMetadata?.format
        ? `${ev.binaryMetadata.format} / ${ev.binaryMetadata.architecture}`
        : 'N/A';
      const shaShort = ev.executable?.sha256 ? `\`${ev.executable.sha256.slice(0, 12)}...\`` : '-';
      const compLink = `${ev.compiler.name} / ${ev.linker.name}`;
      const statusLabel = ev.status;
      const reasonClean = (ev.reason || '-').replace(/\|/g, '/').replace(/\r?\n/g, ' ');

      lines.push(
        `| \`${target}\` | \`${ev.triple}\` | ${ev.hostOs}/${ev.hostArch} | ${compLink} | ${fmtArch} | ${shaShort} | \`${ev.execution.mode}\` | **${statusLabel}** | ${reasonClean} |`
      );
    }

    if (report.findings.length > 0) {
      lines.push('');
      lines.push('## Temuan Audit & Integritas');
      lines.push('');
      for (const f of report.findings) {
        lines.push(`- **[${f.severity.toUpperCase()} / ${f.code}]** \`${f.target}\`: ${f.message}`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push(
      report.overallStatus === 'CERTIFIED'
        ? 'Seluruh 6 target desktop telah lolos build LLVM IR nyata, validasi SHA-256, inspeksi header biner, dan eksekusi terverifikasi.'
        : 'Gerbang sertifikasi Phase 23 belum berstatus CERTIFIED; Phase 23 tetap berstatus SELESAI SEBAGIAN hingga seluruh 6 target berstatus PASS.'
    );
    lines.push('');

    return this.sanitizeString(lines.join('\n'));
  }

  private static validateEvidenceSchema(obj: any, expectedTarget: CanonicalDesktopTarget): string[] {
    const errs: string[] = [];
    if (!obj || typeof obj !== 'object') {
      return ['Bukan objek JSON'];
    }
    if (obj.target !== expectedTarget) {
      errs.push(`target='${obj.target}' tidak cocok dengan '${expectedTarget}'`);
    }
    if (typeof obj.triple !== 'string' || !obj.triple) errs.push('triple hilang');
    if (typeof obj.hostOs !== 'string' || typeof obj.hostArch !== 'string') errs.push('hostOs/hostArch hilang');
    if (!obj.compiler || typeof obj.compiler.name !== 'string') errs.push('compiler tidak valid');
    if (!obj.linker || typeof obj.linker.name !== 'string') errs.push('linker tidak valid');
    if (!obj.sdk || typeof obj.sdk.available !== 'boolean') errs.push('sdk tidak valid');
    if (!obj.llvmIR || typeof obj.llvmIR.verified !== 'boolean') errs.push('llvmIR tidak valid');
    if (!obj.objectFile || typeof obj.objectFile !== 'object') errs.push('objectFile tidak valid');
    if (!obj.executable || typeof obj.executable !== 'object') errs.push('executable tidak valid');
    if (!obj.binaryMetadata || typeof obj.binaryMetadata.isValidExecutable !== 'boolean') {
      errs.push('binaryMetadata tidak valid');
    }
    if (!obj.dependencyValidation || typeof obj.dependencyValidation.allResolved !== 'boolean') {
      errs.push('dependencyValidation tidak valid');
    }
    if (!obj.execution || typeof obj.execution.executed !== 'boolean') errs.push('execution tidak valid');
    if (obj.status !== 'PASS' && obj.status !== 'FAIL' && obj.status !== 'NOT_VERIFIED') {
      errs.push(`status '${obj.status}' tidak valid (harus PASS/FAIL/NOT_VERIFIED)`);
    }
    return errs;
  }

  private static resolveArtifactDiskPath(
    artifactPath: string | undefined,
    evidenceDir: string,
    baseDir: string
  ): string | undefined {
    if (!artifactPath) return undefined;
    if (safePath.isAbsolute(artifactPath)) return artifactPath;
    const fromBase = safePath.resolve(baseDir, artifactPath);
    if (safeFS.existsSync(fromBase)) return fromBase;
    const fromEvidence = safePath.resolve(evidenceDir, artifactPath);
    if (safeFS.existsSync(fromEvidence)) return fromEvidence;
    return fromBase;
  }
}
