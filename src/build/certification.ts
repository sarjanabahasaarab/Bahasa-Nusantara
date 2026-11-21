/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Engine Sertifikasi & Audit Integritas 6 Target Desktop (Phase 23.2 - 23.7)
 * Target Milestone: Phase 23.7 / v0.23.7
 */

import { BinaryInspector } from '../compiler/executable/binary-inspector';
import { safeCP, safeFS, safePath } from '../compiler/llvm/node-compat';
import { TargetTripleManager } from '../compiler/llvm/target-triple';
import { LLVMToolchainManager } from '../compiler/llvm/toolchain-manager';
import { ArchiveBuilder } from './archive-builder';
import { DistributionE2EVerifier } from './distribution-verifier';
import { NativeBuildPipeline } from './native-pipeline';
import { DESKTOP_CANONICAL_TARGETS, TargetMatrixManager } from './target-matrix';
import {
  CanonicalDesktopTarget,
  Phase23AggregationResult,
  Phase23CertificationFinding,
  Phase23TargetEvidence,
  TargetCertificationStatus,
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

const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;

const REQUIRED_EVIDENCE_KEYS: ReadonlyArray<keyof Phase23TargetEvidence> = [
  'schemaVersion',
  'phase',
  'target',
  'targetTriple',
  'hostOS',
  'hostArchitecture',
  'compiler',
  'compilerVersion',
  'linker',
  'linkerVersion',
  'binaryPath',
  'binaryFormat',
  'binaryArchitecture',
  'binarySha256',
  'objectFiles',
  'objectHashes',
  'buildExitCode',
  'executionMode',
  'executionExitCode',
  'executionSentinel',
  'distributionManifest',
  'archiveSha256',
  'installResult',
  'uninstallResult',
  'generatedAt',
  'verificationStatus',
];

function normalizeHostOs(raw: string): 'windows' | 'linux' | 'darwin' | 'unknown' {
  const lower = (raw || '').toLowerCase();
  if (lower === 'win32' || lower === 'windows') return 'windows';
  if (lower === 'darwin' || lower === 'macos') return 'darwin';
  if (lower === 'linux') return 'linux';
  return 'unknown';
}

function normalizeHostArch(raw: string): 'x86_64' | 'aarch64' | 'unknown' {
  const lower = (raw || '').toLowerCase();
  if (lower === 'x64' || lower === 'x86_64' || lower === 'amd64') return 'x86_64';
  if (lower === 'arm64' || lower === 'aarch64') return 'aarch64';
  return 'unknown';
}

function queryCommandVersion(cmd?: string): string | undefined {
  if (!cmd) return undefined;
  try {
    const res = safeCP.spawnSync(cmd, ['--version'], {
      encoding: 'utf-8',
      timeout: 4000,
      shell: false,
    });
    const txt = (res.stdout || res.stderr || '').trim();
    if (res.status === 0 && txt) {
      return txt.split(/\r?\n/)[0].trim();
    }
  } catch {
    // abaikan
  }
  return undefined;
}

export class Phase23CertificationEngine {
  public static generateTargetEvidence(options: {
    target: CanonicalDesktopTarget;
    outputDir: string;
    artifactBundleDir?: string;
    failOnMissingToolchain?: boolean;
    requireExecution?: boolean;
    verifyDistribution?: boolean;
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
      const root = safePath.resolve(bundleArtifactsDir);
      const source = safePath.resolve(srcPath);
      const relative = safePath.relative(root, source);
      const beradaDiDalamBundle =
        relative === '' ||
        (relative !== '..' &&
          !relative.startsWith(`..${safePath.sep}`) &&
          !safePath.isAbsolute(relative));
      if (beradaDiDalamBundle) {
        return source;
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

    const objRel = toRel(objStored);
    const exeRel = toRel(exeStored);
    const objectFiles: string[] = objRel ? [objRel] : [];
    const objectHashes: Record<string, string> = {};
    if (objRel && buildRes.objectSha256) {
      objectHashes[objRel] = buildRes.objectSha256;
    }

    const sentinelMatched = Boolean(
      buildRes.executionStdout && buildRes.executionStdout.includes(PHASE23_CERTIFICATION_SENTINEL)
    );

    const compilerName =
      buildRes.compilerToolUsed ||
      (toolchain.binaries.clang.found ? 'clang' : toolchain.binaries.llc.found ? 'llc' : 'none');
    const compilerVersion =
      toolchain.version ||
      (compilerName === 'llc' ? toolchain.binaries.llc.version : toolchain.binaries.clang.version) ||
      '';
    const linkerName =
      buildRes.linkerToolUsed ||
      cap.crossCompilerCommand ||
      (toolchain.binaries.clang.found ? 'clang' : 'none');
    const linkerVersion =
      toolchain.binaries.lld.version ||
      queryCommandVersion(cap.crossCompilerCommand) ||
      toolchain.binaries.clang.version ||
      '';

    const emulatorVersion = cap.emulatorCommand ? queryCommandVersion(cap.emulatorCommand) : undefined;
    const emulatorUsed = buildRes.executionMode === 'qemu-user' || buildRes.executionMode === 'rosetta2';

    let status: TargetCertificationStatus = 'FAIL';
    let reason: string | undefined;
    const extraDiagnostics: string[] = [...buildRes.diagnostics];

    let distributionManifest: Record<string, any> | null = null;
    let distributionArchivePath: string | undefined;
    let archiveSha256 = '';
    let installResult: Phase23TargetEvidence['installResult'] = {
      status: 'NOT_RUN',
      exitCode: null,
    };
    let uninstallResult: Phase23TargetEvidence['uninstallResult'] = {
      status: 'NOT_RUN',
      exitCode: null,
    };

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

    // Jalankan verifikasi distribusi end-to-end 18 langkah saat build & eksekusi lulus
    if (status === 'PASS' && options.verifyDistribution !== false) {
      const distOutDir = safePath.join(workOut, 'dist-e2e');
      const distRes = DistributionE2EVerifier.verify({
        target: options.target,
        outDir: distOutDir,
        failOnMissingClang: options.failOnMissingToolchain,
        archiveCopyDir: bundleArtifactsDir,
      });

      distributionManifest = distRes.distributionManifest;
      archiveSha256 = distRes.archiveSha256 || '';
      distributionArchivePath = toRel(distRes.archivePath);
      installResult = distRes.installResult;
      uninstallResult = distRes.uninstallResult;

      if (distRes.statusAkhir !== 'PASS') {
        status = distRes.statusAkhir === 'NOT_VERIFIED' ? 'NOT_VERIFIED' : 'FAIL';
        reason = distRes.reason || `Verifikasi distribusi end-to-end gagal: ${distRes.daftarError.join(' | ')}`;
        extraDiagnostics.push(...distRes.daftarError);
      }
    }

    const hostOsNorm = normalizeHostOs(process.platform);
    const hostArchNorm = normalizeHostArch(process.arch);
    const buildExitCode = buildRes.success ? 0 : 1;
    const executionExitCode = buildRes.executionExitCode ?? null;
    const executionSentinel = sentinelMatched ? PHASE23_CERTIFICATION_SENTINEL : '';

    return {
      schemaVersion: '2.0',
      phase: 'Phase 23',
      generatedAt: new Date().toISOString(),
      target: options.target,
      targetTriple: cap.triple,
      triple: cap.triple,
      hostOS: hostOsNorm === 'unknown' ? process.platform : hostOsNorm,
      hostOs: process.platform,
      hostArchitecture: hostArchNorm === 'unknown' ? process.arch : hostArchNorm,
      hostArch: process.arch,
      recommendedRunner: cap.recommendedRunner,
      isCross: cap.isCross,
      compiler: compilerName,
      compilerVersion,
      compilerDetails: {
        name: compilerName,
        available: cap.clangAvailable || cap.llcAvailable,
        version: compilerVersion || undefined,
        command: toolchain.binaries.clang.found ? toolchain.binaries.clang.command : toolchain.binaries.llc.command,
      },
      linker: linkerName,
      linkerVersion,
      linkerDetails: {
        name: linkerName,
        lldAvailable: cap.lldAvailable,
        version: linkerVersion || undefined,
        command: buildRes.linkerCommand,
      },
      sysroot: cap.sysroot,
      emulator: {
        used: emulatorUsed,
        command: cap.emulatorCommand || (buildRes.executionMode === 'rosetta2' ? 'arch -x86_64' : undefined),
        version: emulatorVersion || (buildRes.executionMode === 'rosetta2' ? 'Rosetta 2' : undefined),
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
        path: objRel,
        sha256: buildRes.objectSha256,
      },
      objectFiles,
      objectHashes,
      binaryPath: exeRel || '',
      binaryFormat: buildRes.binaryMetadata?.format || 'UNKNOWN',
      binaryArchitecture: buildRes.binaryMetadata?.architecture || 'UNKNOWN',
      binarySha256: buildRes.executableSha256 || '',
      executable: {
        path: exeRel,
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
      buildExitCode,
      executionMode: buildRes.executionMode,
      executionExitCode,
      executionSentinel,
      execution: {
        required: Boolean(options.requireExecution),
        executed: buildRes.executedOnHost,
        mode: buildRes.executionMode,
        exitCode: buildRes.executionExitCode,
        stdout: buildRes.executionStdout,
        sentinelExpected: PHASE23_CERTIFICATION_SENTINEL,
        sentinelMatched,
      },
      distributionManifest,
      distributionArchivePath,
      archiveSha256,
      installResult,
      uninstallResult,
      verificationStatus: status,
      status,
      statusCode: buildRes.statusCode,
      reason,
      diagnostics: extraDiagnostics,
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

    // Pelacak anti-duplikasi lintas 6 target
    const seenBinaryShas = new Map<string, string>();
    const seenBinaryPaths = new Map<string, string>();
    const seenArchiveShas = new Map<string, string>();
    const seenIrShas = new Map<string, string>();

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
      let secretDetected = false;
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
          secretDetected = true;
          break;
        }
      }
      if (secretDetected) {
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

      // Validasi schema ketat: pastikan seluruh field wajib ada
      const missingKeys: string[] = [];
      if (!ev || typeof ev !== 'object' || Array.isArray(ev)) {
        corruptCount++;
        targetsMap[target] = null;
        findings.push({
          severity: 'error',
          code: 'JSON_RUSAK',
          target,
          message: `Isi evidence '${target}.json' bukan objek JSON valid.`,
        });
        continue;
      }
      for (const k of REQUIRED_EVIDENCE_KEYS) {
        if (!(k in ev)) {
          missingKeys.push(String(k));
        }
      }
      if (missingKeys.length > 0) {
        corruptCount++;
        targetsMap[target] = null;
        findings.push({
          severity: 'error',
          code: 'JSON_RUSAK',
          target,
          message: `Skema evidence '${target}.json' tidak lengkap; field wajib hilang: ${missingKeys.join(', ')}.`,
        });
        continue;
      }

      const declaredStatus: TargetCertificationStatus = ev.verificationStatus || ev.status;
      const declaredTriple = ev.targetTriple || ev.triple;
      if (
        ev.target !== target ||
        !declaredTriple ||
        !['PASS', 'NOT_VERIFIED', 'FAIL'].includes(declaredStatus) ||
        (ev.status && ev.verificationStatus && ev.status !== ev.verificationStatus) ||
        (ev.triple && ev.targetTriple && ev.triple !== ev.targetTriple) ||
        Number.isNaN(Date.parse(ev.generatedAt))
      ) {
        corruptCount++;
        targetsMap[target] = null;
        findings.push({
          severity: 'error',
          code: 'JSON_RUSAK',
          target,
          message: `Metadata inti evidence '${target}.json' tidak konsisten atau rusak.`,
        });
        continue;
      }

      const expectedTriple = TargetTripleManager.resolve(target).triple;
      if (declaredTriple !== expectedTriple && !(target === 'macos-arm64' && declaredTriple === 'aarch64-apple-darwin')) {
        corruptCount++;
        targetsMap[target] = null;
        findings.push({
          severity: 'error',
          code: 'JSON_RUSAK',
          target,
          message: `Triple target tidak cocok untuk '${target}' (diharapkan ${expectedTriple}, aktual ${declaredTriple}).`,
        });
        continue;
      }

      targetsMap[target] = ev;

      if (declaredStatus === 'FAIL') {
        failCount++;
        findings.push({
          severity: 'error',
          code: 'TARGET_GAGAL',
          target,
          message: ev.reason || `Target '${target}' melaporkan status FAIL.`,
        });
        continue;
      }

      if (declaredStatus === 'NOT_VERIFIED') {
        notVerifiedCount++;
        findings.push({
          severity: 'warning',
          code: 'TARGET_NOT_VERIFIED',
          target,
          message: ev.reason || `Target '${target}' berstatus NOT_VERIFIED dan belum lulus sertifikasi.`,
        });
        continue;
      }

      // Status PASS: audit mendalam seluruh klaim runner secara independen (TANPA cek toolchain lokal agregator!)
      let targetValid = true;

      // 1. Tolak evidence duplikat lintas target
      const binSha = (ev.binarySha256 || ev.executable?.sha256 || '').toLowerCase();
      const binPathStr = ev.binaryPath || ev.executable?.path || '';
      const arcSha = (ev.archiveSha256 || '').toLowerCase();
      const irSha = (ev.llvmIR?.sha256 || '').toLowerCase();

      if (binSha && seenBinaryShas.has(binSha)) {
        findings.push({
          severity: 'error',
          code: 'DUPLIKAT_EVIDENCE',
          target,
          message: `SHA-256 biner '${target}' identik dengan target '${seenBinaryShas.get(binSha)}' (${binSha}).`,
        });
        targetValid = false;
      } else if (binSha) {
        seenBinaryShas.set(binSha, target);
      }

      if (binPathStr && seenBinaryPaths.has(binPathStr)) {
        findings.push({
          severity: 'error',
          code: 'DUPLIKAT_EVIDENCE',
          target,
          message: `Jalur biner '${binPathStr}' pada '${target}' duplikat dengan '${seenBinaryPaths.get(binPathStr)}'.`,
        });
        targetValid = false;
      } else if (binPathStr) {
        seenBinaryPaths.set(binPathStr, target);
      }

      if (arcSha && seenArchiveShas.has(arcSha)) {
        findings.push({
          severity: 'error',
          code: 'DUPLIKAT_EVIDENCE',
          target,
          message: `SHA-256 arsip distribusi '${target}' duplikat dengan '${seenArchiveShas.get(arcSha)}'.`,
        });
        targetValid = false;
      } else if (arcSha) {
        seenArchiveShas.set(arcSha, target);
      }

      if (irSha && seenIrShas.has(irSha)) {
        findings.push({
          severity: 'error',
          code: 'DUPLIKAT_EVIDENCE',
          target,
          message: `SHA-256 LLVM IR '${target}' duplikat dengan '${seenIrShas.get(irSha)}' (target triple di IR seharusnya berbeda).`,
        });
        targetValid = false;
      } else if (irSha) {
        seenIrShas.set(irSha, target);
      }

      // 2. Validasi metadata compiler, linker, dan SDK (berdasarkan laporan runner)
      const compilerStr = typeof ev.compiler === 'string' ? ev.compiler : '';
      const linkerStr = typeof ev.linker === 'string' ? ev.linker : '';
      if (
        !compilerStr ||
        compilerStr === 'none' ||
        !ev.compilerVersion ||
        !ev.compilerVersion.trim() ||
        !linkerStr ||
        linkerStr === 'none' ||
        !ev.linkerVersion ||
        !ev.linkerVersion.trim() ||
        ev.buildExitCode !== 0
      ) {
        findings.push({
          severity: 'error',
          code: 'METADATA_TOOLCHAIN_KOSONG',
          target,
          message: `Metadata compiler/linker/buildExitCode tidak valid untuk '${target}' (compiler='${compilerStr}', linker='${linkerStr}', buildExit=${ev.buildExitCode}).`,
        });
        targetValid = false;
      }

      if (ev.sdk && ev.sdk.available === false) {
        findings.push({
          severity: 'error',
          code: 'TARGET_GAGAL',
          target,
          message: `Target '${target}' mengklaim PASS padahal sdk.available=false.`,
        });
        targetValid = false;
      }

      // 3. Validasi kejujuran hostOS / hostArchitecture / executionMode / emulator
      const expectedOs = target.startsWith('windows')
        ? 'windows'
        : target.startsWith('macos')
        ? 'darwin'
        : 'linux';
      const expectedArch = target.endsWith('arm64') ? 'aarch64' : 'x86_64';
      const normHostOs = normalizeHostOs(ev.hostOS || ev.hostOs || '');
      const normHostArch = normalizeHostArch(ev.hostArchitecture || ev.hostArch || '');
      const isHostCross = normHostOs !== expectedOs || normHostArch !== expectedArch;
      const execMode = ev.executionMode;

      if (!execMode || (ev.execution?.mode && ev.execution.mode !== execMode)) {
        findings.push({
          severity: 'error',
          code: 'EKSEKUSI_GAGAL',
          target,
          message: `executionMode tidak konsisten pada '${target}' (${execMode} vs ${ev.execution?.mode}).`,
        });
        targetValid = false;
      } else if (execMode === 'cross-compiled-not-executed' || execMode === 'not-executed') {
        findings.push({
          severity: 'error',
          code: 'EKSEKUSI_GAGAL',
          target,
          message: `Target '${target}' tidak dieksekusi (mode=${execMode}), tidak boleh berstatus PASS.`,
        });
        targetValid = false;
      } else if (
        (isHostCross && execMode === 'native') ||
        (ev.isCross && execMode === 'native') ||
        (target === 'macos-x86_64' && normHostArch === 'aarch64' && execMode === 'native') ||
        (execMode === 'rosetta2' && (target !== 'macos-x86_64' || normHostOs !== 'darwin'))
      ) {
        findings.push({
          severity: 'error',
          code: 'EKSEKUSI_GAGAL',
          target,
          message: `Klaim mode eksekusi tidak jujur pada '${target}' (host=${normHostOs}/${normHostArch}, isCross=${ev.isCross}, mode=${execMode}).`,
        });
        targetValid = false;
      } else if (execMode === 'qemu-user') {
        if (normHostOs !== 'linux' || !ev.emulator?.command || !ev.emulator?.version) {
          findings.push({
            severity: 'error',
            code: 'EKSEKUSI_GAGAL',
            target,
            message: `Eksekusi qemu-user pada '${target}' wajib menyertakan metadata command & version emulator pada host Linux.`,
          });
          targetValid = false;
        }
      }

      // 4. Verifikasi berkas artefak & hash SHA-256 di disk
      const checkArtifactSha = (relOrAbs: string | undefined, expectedSha: string | undefined, label: string): string | null => {
        if (!relOrAbs || !expectedSha || !SHA256_HEX_RE.test(expectedSha)) {
          findings.push({
            severity: 'error',
            code: 'SHA256_TIDAK_COCOK',
            target,
            message: `Metadata path/sha256 untuk ${label} kosong atau tidak valid pada target PASS.`,
          });
          targetValid = false;
          return null;
        }
        const isAbsolutePath = safePath.isAbsolute(relOrAbs);
        const resolved = isAbsolutePath
          ? safePath.resolve(relOrAbs)
          : safePath.resolve(absBaseDir, relOrAbs);
        if (!isAbsolutePath) {
          const relativeToBase = safePath.relative(absBaseDir, resolved);
          if (
            relativeToBase === '..' ||
            (relativeToBase.startsWith('../') || relativeToBase.startsWith('..\\\\')) ||
            safePath.isAbsolute(relativeToBase)
          ) {
            findings.push({
              severity: 'error',
              code: 'SHA256_TIDAK_COCOK',
              target,
              message: `Jalur artefak relatif ${label} keluar dari direktori evidence: '${relOrAbs}'.`,
            });
            targetValid = false;
            return null;
          }
        }
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

      if (!Array.isArray(ev.objectFiles) || ev.objectFiles.length === 0 || !ev.objectHashes || typeof ev.objectHashes !== 'object') {
        findings.push({
          severity: 'error',
          code: 'SHA256_TIDAK_COCOK',
          target,
          message: `objectFiles atau objectHashes kosong pada target '${target}'.`,
        });
        targetValid = false;
      } else {
        for (const objRelPath of ev.objectFiles) {
          checkArtifactSha(objRelPath, ev.objectHashes[objRelPath], `Object File (${objRelPath})`);
        }
      }

      if (ev.executable?.sha256 && ev.binarySha256 && ev.executable.sha256.toLowerCase() !== ev.binarySha256.toLowerCase()) {
        findings.push({
          severity: 'error',
          code: 'SHA256_TIDAK_COCOK',
          target,
          message: `Ketidakcocokan antara binarySha256 dan executable.sha256 pada '${target}'.`,
        });
        targetValid = false;
      }

      const exeDiskPath = checkArtifactSha(binPathStr, binSha, 'Executable');

      const expectedFormat = expectedOs === 'windows' ? 'COFF' : expectedOs === 'darwin' ? 'Mach-O' : 'ELF';

      if (ev.binaryFormat !== expectedFormat || ev.binaryArchitecture !== expectedArch) {
        findings.push({
          severity: 'error',
          code: 'ARSITEKTUR_BINER_SALAH',
          target,
          message: `Metadata binaryFormat/binaryArchitecture '${target}' tidak cocok (expected ${expectedFormat}/${expectedArch}, aktual ${ev.binaryFormat}/${ev.binaryArchitecture}).`,
        });
        targetValid = false;
      }

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
      }

      // 5. Validasi sentinel & hasil eksekusi (tolak sentinel palsu)
      const expectedSentinel = ev.execution?.sentinelExpected || PHASE23_CERTIFICATION_SENTINEL;
      const stdoutText = ev.execution?.stdout || '';
      if (
        !ev.execution?.executed ||
        ev.executionExitCode !== 0 ||
        ev.execution.exitCode !== 0 ||
        !ev.execution.sentinelMatched ||
        ev.executionSentinel !== PHASE23_CERTIFICATION_SENTINEL ||
        !stdoutText.includes(expectedSentinel)
      ) {
        findings.push({
          severity: 'error',
          code: 'EKSEKUSI_GAGAL',
          target,
          message: `Bukti eksekusi runtime / sentinel untuk '${target}' tidak valid (executed=${ev.execution?.executed}, exit=${ev.executionExitCode}, sentinel='${ev.executionSentinel}', matched=${ev.execution?.sentinelMatched}).`,
        });
        targetValid = false;
      }

      // 6. Validasi distribusi end-to-end (manifest, arsip SHA-256, install & uninstall)
      const mf = ev.distributionManifest;
      if (
        !SHA256_HEX_RE.test(ev.archiveSha256 || '') ||
        !mf ||
        typeof mf !== 'object' ||
        mf.target !== target ||
        mf.packageKind !== 'native' ||
        !SHA256_HEX_RE.test(String(mf.executableSha256 || ''))
      ) {
        findings.push({
          severity: 'error',
          code: 'DISTRIBUSI_GAGAL',
          target,
          message: `Manifest distribusi atau archiveSha256 tidak valid untuk '${target}'.`,
        });
        targetValid = false;
      } else if (ev.distributionArchivePath) {
        checkArtifactSha(ev.distributionArchivePath, ev.archiveSha256, 'Distribution Archive');
      }

      if (
        !ev.installResult ||
        ev.installResult.status !== 'PASS' ||
        ev.installResult.exitCode !== 0 ||
        !ev.installResult.upgradeVerified ||
        !ev.installResult.tamperRejected
      ) {
        findings.push({
          severity: 'error',
          code: 'DISTRIBUSI_GAGAL',
          target,
          message: `Bukti instalasi/upgrade/penolakan tamper distribusi tidak lulus pada '${target}' (status=${ev.installResult?.status}).`,
        });
        targetValid = false;
      }

      if (
        !ev.uninstallResult ||
        ev.uninstallResult.status !== 'PASS' ||
        ev.uninstallResult.exitCode !== 0 ||
        ev.uninstallResult.leftoversDetected !== false
      ) {
        findings.push({
          severity: 'error',
          code: 'DISTRIBUSI_GAGAL',
          target,
          message: `Bukti uninstall distribusi tidak lulus atau masih menyisakan berkas pada '${target}' (status=${ev.uninstallResult?.status}).`,
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
    lines.push('| Target | Triple | Status | Host OS/Arch | Compiler / Linker | Format / Arch | Mode Eksekusi | Distribusi | Keterangan |');
    lines.push('| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :---: | :--- |');
    for (const target of DESKTOP_CANONICAL_TARGETS) {
      const ev = targetsMap[target];
      if (!ev) {
        lines.push(`| \`${target}\` | - | **MISSING/CORRUPT** | - | - | - | - | - | Evidence tidak tersedia atau korup |`);
      } else {
        const fmt = ev.binaryFormat && ev.binaryFormat !== 'UNKNOWN' ? `${ev.binaryFormat}/${ev.binaryArchitecture}` : '-';
        const hostDesc = `${ev.hostOS}/${ev.hostArchitecture}`;
        const distStatus =
          ev.installResult?.status === 'PASS' && ev.uninstallResult?.status === 'PASS'
            ? 'PASS'
            : ev.installResult?.status || 'NOT_RUN';
        lines.push(
          `| \`${target}\` | \`${ev.targetTriple || ev.triple}\` | **${ev.verificationStatus || ev.status}** | ${hostDesc} | ${ev.compiler} / ${ev.linker} | ${fmt} | ${ev.executionMode} | ${distStatus} | ${ev.reason || 'Terverifikasi'} |`
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
