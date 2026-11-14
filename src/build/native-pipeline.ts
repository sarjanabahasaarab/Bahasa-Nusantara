/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Native Build Pipeline
 * Mengorkestrasi AOTCompiler -> ObjectGenerator -> LinkerManager -> BinaryInspector -> DependencyInspector
 * serta eksekusi biner hasil kompilasi secara nyata.
 */

import { AOTCompiler } from '../compiler/aot/aot-compiler';
import { BinaryInspector } from '../compiler/executable/binary-inspector';
import { DependencyInspector } from '../compiler/linker/dependency-inspector';
import { LinkerManager } from '../compiler/linker/linker-manager';
import { safeCP, safeFS, safePath } from '../compiler/llvm/node-compat';
import { ArchiveBuilder } from './archive-builder';
import { TargetMatrixManager } from './target-matrix';
import {
  ExecutionVerificationResult,
  LinkingMode,
  NativeBuildOptions,
  NativeBuildResult,
} from './types';

export class NativeBuildPipeline {
  public static build(options: NativeBuildOptions): NativeBuildResult {
    const start = Date.now();
    const diag: string[] = [];
    const linkingMode: LinkingMode = options.linkingMode || 'auto';

    // 1. Validasi & inspeksi kapabilitas target
    const capability = TargetMatrixManager.inspectTargetCapability(options.target, {
      customToolchainPath: options.customToolchainPath,
      sysrootOverride: options.sysrootOverride,
    });
    diag.push(...capability.diagnostics);

    if (!capability.supported || !capability.targetInfo) {
      return {
        success: false,
        statusCode: 'TARGET_TIDAK_DIDUKUNG',
        target: capability,
        linkingMode,
        durationMs: Date.now() - start,
        diagnostics: [...diag, ...capability.missingRequirements],
      };
    }

    if (!capability.toolchainAvailable) {
      return {
        success: false,
        statusCode: 'TOOLCHAIN_TIDAK_TERSEDIA',
        target: capability,
        linkingMode,
        durationMs: Date.now() - start,
        diagnostics: [...diag, ...capability.missingRequirements],
      };
    }

    if (capability.isCross && !capability.crossSdkAvailable) {
      return {
        success: false,
        statusCode: 'CROSS_SDK_TIDAK_TERSEDIA',
        target: capability,
        linkingMode,
        durationMs: Date.now() - start,
        diagnostics: [...diag, ...capability.missingRequirements],
      };
    }

    // 2. Baca kode sumber
    let sourceCode = options.sourceCode;
    if (!sourceCode && options.sourceFilePath) {
      if (!safeFS.existsSync(options.sourceFilePath)) {
        return {
          success: false,
          statusCode: 'GALAT_KOMPILASI',
          target: capability,
          linkingMode,
          durationMs: Date.now() - start,
          diagnostics: [...diag, `Berkas sumber tidak ditemukan: ${options.sourceFilePath}`],
        };
      }
      sourceCode = safeFS.readFileSync(options.sourceFilePath, 'utf-8');
    }

    if (!sourceCode) {
      return {
        success: false,
        statusCode: 'GALAT_KOMPILASI',
        target: capability,
        linkingMode,
        durationMs: Date.now() - start,
        diagnostics: [...diag, 'Kode sumber NUSANTARA atau jalur berkas .nusantara wajib diberikan.'],
      };
    }

    const outDir = options.outputDirectory || './dist';
    if (!safeFS.existsSync(outDir)) {
      safeFS.mkdirSync(outDir, { recursive: true });
    }

    const rawAppName =
      options.appName ||
      (options.sourceFilePath
        ? safePath.basename(options.sourceFilePath, safePath.extname(options.sourceFilePath))
        : 'program');

    if (rawAppName.includes('..') || rawAppName.includes('/') || rawAppName.includes('\\')) {
      return {
        success: false,
        statusCode: 'GALAT_VALIDASI',
        target: capability,
        linkingMode,
        durationMs: Date.now() - start,
        diagnostics: [...diag, `Nama aplikasi tidak aman: '${rawAppName}'`],
      };
    }

    const objPath = safePath.join(outDir, `${rawAppName}${capability.targetInfo.objectExtension}`);
    const llPath = safePath.join(outDir, `${rawAppName}.ll`);
    const exePath = safePath.join(outDir, `${rawAppName}${capability.targetInfo.executableExtension}`);

    // 3. Kompilasi AST -> NIR -> LLVM IR -> Object (.o/.obj)
    const compiler = new AOTCompiler(options.customToolchainPath);
    const aotRes = compiler.compileSource(sourceCode, {
      targetTriple: capability.triple,
      optLevel: options.optLevel || (options.debug ? 'O0' : 'O2'),
      debug: options.debug,
      emitLLVM: true,
      emitObject: true,
      outputPath: objPath,
      customToolchainPath: options.customToolchainPath,
    });

    diag.push(...aotRes.diagnostics);

    if (!aotRes.success || !aotRes.objectPath) {
      return {
        success: false,
        statusCode: 'GALAT_KOMPILASI',
        target: capability,
        llvmIRPath: safeFS.existsSync(llPath) ? llPath : undefined,
        linkingMode,
        durationMs: Date.now() - start,
        diagnostics: diag,
      };
    }

    // 4. Tautkan object + runtime C menjadi executable native
    const isStatic = linkingMode === 'static';
    if (isStatic && capability.os === 'darwin') {
      diag.push('Catatan: macOS tidak mendukung full static linking user-space (-static) tanpa libSystem.dylib.');
    }

    const linker = new LinkerManager({
      targetTriple: capability.triple,
      customToolchainPath: options.customToolchainPath,
    });

    const linkRes = linker.link({
      objectFiles: [aotRes.objectPath],
      outputExecutable: exePath,
      isStatic,
      staticLibraries: options.staticLibraries,
      sharedLibraries: options.sharedLibraries,
      libraryPaths: options.libraryPaths,
      debug: options.debug,
      strip: options.strip,
      sysroot: capability.sysrootPath,
      targetTriple: capability.triple,
      customToolchainPath: options.customToolchainPath,
    });

    diag.push(...linkRes.diagnostics);

    if (!linkRes.success || !safeFS.existsSync(exePath)) {
      return {
        success: false,
        statusCode: 'GALAT_LINKER',
        target: capability,
        objectPath: aotRes.objectPath,
        llvmIRPath: safeFS.existsSync(llPath) ? llPath : undefined,
        linkingMode,
        durationMs: Date.now() - start,
        diagnostics: diag,
      };
    }

    // Pastikan executable bit pada POSIX
    if (typeof process !== 'undefined' && process.platform !== 'win32') {
      safeFS.chmodSync(exePath, 0o755);
    }

    // 5. Validasi ketat struktur biner executable (ELF64 / PE32+ / Mach-O64)
    const binaryMetadata = BinaryInspector.inspectStrict(exePath);
    const expectedArch = capability.arch;
    const archMismatch =
      binaryMetadata.architecture !== 'UNKNOWN' &&
      expectedArch !== 'unknown' &&
      binaryMetadata.architecture !== expectedArch;
    const osMismatch =
      binaryMetadata.operatingSystem !== 'unknown' && binaryMetadata.operatingSystem !== capability.os;

    if (!binaryMetadata.isValidExecutable || archMismatch || osMismatch) {
      const reasons = [...(binaryMetadata.validationErrors || [])];
      if (archMismatch) {
        reasons.push(
          `Arsitektur biner '${binaryMetadata.architecture}' tidak cocok dengan target '${expectedArch}'.`
        );
      }
      if (osMismatch) {
        reasons.push(
          `OS biner '${binaryMetadata.operatingSystem}' tidak cocok dengan target '${capability.os}'.`
        );
      }
      diag.push(...reasons);
      return {
        success: false,
        statusCode: 'BINER_TIDAK_SAH',
        target: capability,
        executablePath: exePath,
        objectPath: aotRes.objectPath,
        llvmIRPath: safeFS.existsSync(llPath) ? llPath : undefined,
        linkingMode,
        binaryMetadata,
        durationMs: Date.now() - start,
        diagnostics: diag,
      };
    }

    // 6. Inspeksi dependensi runtime nyata pada biner
    const depInspector = new DependencyInspector();
    const depTargetOs = capability.os === 'unknown' ? 'linux' : capability.os;
    const dependencyReport = depInspector.inspect(exePath, depTargetOs);
    diag.push(...dependencyReport.diagnostics);

    if (!dependencyReport.allResolved) {
      return {
        success: false,
        statusCode: 'GALAT_LINKER',
        target: capability,
        executablePath: exePath,
        objectPath: aotRes.objectPath,
        llvmIRPath: safeFS.existsSync(llPath) ? llPath : undefined,
        linkingMode,
        binaryMetadata,
        dependencyReport,
        durationMs: Date.now() - start,
        diagnostics: diag,
      };
    }

    const exeBytes = safeFS.readFileBufferSync(exePath);
    const executableSha256 = ArchiveBuilder.computeSha256(exeBytes);

    // 7. Opsional: Verifikasi eksekusi biner secara nyata bila berjalan di host yang sesuai
    let executionVerification: ExecutionVerificationResult | undefined;
    if (options.verifyExecution) {
      if (capability.isCross) {
        executionVerification = {
          executed: false,
          success: false,
          exitCode: null,
          stdout: '',
          stderr: '',
          timedOut: false,
          reason: `Biner target '${capability.canonicalTarget}' merupakan hasil cross-compile; eksekusi langsung memerlukan runner/perangkat target asli (${capability.recommendedRunner}).`,
        };
      } else {
        executionVerification = this.executeBinary(
          exePath,
          options.executionArgs || [],
          options.executionTimeoutMs || 10000
        );
        if (!executionVerification.success) {
          diag.push(
            `Eksekusi biner verifikasi gagal (exit=${executionVerification.exitCode}): ${executionVerification.stderr}`
          );
          return {
            success: false,
            statusCode: 'BINER_TIDAK_SAH',
            target: capability,
            executablePath: exePath,
            objectPath: aotRes.objectPath,
            llvmIRPath: safeFS.existsSync(llPath) ? llPath : undefined,
            linkingMode,
            binaryMetadata,
            dependencyReport,
            executionVerification,
            executableSha256,
            durationMs: Date.now() - start,
            diagnostics: diag,
          };
        }
      }
    }

    return {
      success: true,
      statusCode: 'SUKSES',
      target: capability,
      executablePath: exePath,
      objectPath: aotRes.objectPath,
      llvmIRPath: safeFS.existsSync(llPath) ? llPath : undefined,
      linkingMode,
      binaryMetadata,
      dependencyReport,
      executionVerification,
      executableSha256,
      durationMs: Date.now() - start,
      diagnostics: diag,
    };
  }

  public static executeBinary(
    executablePath: string,
    args: string[] = [],
    timeoutMs: number = 10000
  ): ExecutionVerificationResult {
    const absPath = safePath.resolve(executablePath);
    if (!safeFS.existsSync(absPath)) {
      return {
        executed: false,
        success: false,
        exitCode: null,
        stdout: '',
        stderr: '',
        timedOut: false,
        reason: `Biner tidak ditemukan: ${absPath}`,
      };
    }

    const res = safeCP.spawnSync(absPath, args, {
      encoding: 'utf-8',
      timeout: timeoutMs,
      shell: false,
    });

    const timedOut = Boolean(res.error && (res.error as any).code === 'ETIMEDOUT');
    return {
      executed: !res.error || timedOut,
      success: res.status === 0 && !timedOut && !res.error,
      exitCode: res.status,
      stdout: res.stdout || '',
      stderr: res.stderr || (res.error ? res.error.message : ''),
      timedOut,
      reason: res.error ? res.error.message : undefined,
    };
  }
}
