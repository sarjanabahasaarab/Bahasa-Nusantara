/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA NATIVE BUILD PIPELINE (Phase 23)
 * Pipeline Kompilasi Native AOT (.nusantara -> NIR -> LLVM IR -> Object -> Executable -> BinaryInspector.inspectStrict)
 */

import { AOTCompiler } from '../compiler/aot/aot-compiler';
import { BinaryInspector } from '../compiler/executable/binary-inspector';
import { safeCP, safeFS, safePath } from '../compiler/llvm/node-compat';
import { ArchiveBuilder } from './archive-builder';
import { TargetMatrixManager } from './target-matrix';
import { NativeBuildOptions, NativeBuildResult } from './types';

export class NativeBuildPipeline {
  public static build(options: NativeBuildOptions): NativeBuildResult {
    const diagnostics: string[] = [];
    const cap = TargetMatrixManager.inspectTargetCapability(
      options.target,
      options.customToolchainPath
    );

    if (!cap.supported || !cap.canonicalTarget) {
      diagnostics.push(...cap.diagnostics);
      return {
        success: false,
        statusCode: 'TARGET_TIDAK_DIDUKUNG',
        target: options.target || 'unknown',
        targetTriple: cap.triple,
        isCross: cap.isCross,
        compiler: 'none',
        compilerVersion: '',
        linker: 'none',
        linkerVersion: '',
        executionMode: 'not-executed',
        executionExitCode: null,
        executionSentinelMatched: false,
        capability: cap,
        diagnostics,
      };
    }

    // Muat kode sumber Nusantara
    let sourceCode = options.sourceCode;
    if (!sourceCode && options.sourceFilePath) {
      if (!safeFS.existsSync(options.sourceFilePath)) {
        diagnostics.push(`Berkas sumber .nusantara tidak ditemukan: ${options.sourceFilePath}`);
        return {
          success: false,
          statusCode: 'GALAT_KOMPILASI',
          target: cap.canonicalTarget,
          targetTriple: cap.triple,
          isCross: cap.isCross,
          compiler: cap.compilerName,
          compilerVersion: cap.compilerVersion,
          linker: cap.linkerName,
          linkerVersion: cap.linkerVersion,
          executionMode: 'not-executed',
          executionExitCode: null,
          executionSentinelMatched: false,
          capability: cap,
          diagnostics,
        };
      }
      sourceCode = safeFS.readFileSync(options.sourceFilePath, 'utf-8');
    }

    if (!sourceCode || !sourceCode.trim()) {
      diagnostics.push('Kode sumber .nusantara kosong.');
      return {
        success: false,
        statusCode: 'GALAT_KOMPILASI',
        target: cap.canonicalTarget,
        targetTriple: cap.triple,
        isCross: cap.isCross,
        compiler: cap.compilerName,
        compilerVersion: cap.compilerVersion,
        linker: cap.linkerName,
        linkerVersion: cap.linkerVersion,
        executionMode: 'not-executed',
        executionExitCode: null,
        executionSentinelMatched: false,
        capability: cap,
        diagnostics,
      };
    }

    safeFS.mkdirSync(options.outputDirectory, { recursive: true });
    const safeApp = options.appName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'nusantara_app';
    const llPath = safePath.join(options.outputDirectory, `${safeApp}.ll`);

    const aot = new AOTCompiler(options.customToolchainPath);

    // Tahap 1: Selalu bangkitkan & validasi LLVM IR bahkan bila sysroot/clang belum siap
    const irOnly = aot.compileSource(sourceCode, {
      targetTriple: cap.triple,
      optLevel: options.optLevel || 'O2',
      debug: options.debug,
      emitLLVM: true,
      emitLLVMOnly: true,
      outputPath: llPath,
      customToolchainPath: options.customToolchainPath,
    });
    diagnostics.push(...irOnly.diagnostics);

    const llvmIRText = irOnly.optimizedIR || irOnly.llvmIR;
    const llvmIRSha256 = llvmIRText ? ArchiveBuilder.computeSha256(llvmIRText) : undefined;
    if (!irOnly.success || !llvmIRText) {
      return {
        success: false,
        statusCode: 'GALAT_KOMPILASI',
        target: cap.canonicalTarget,
        targetTriple: cap.triple,
        isCross: cap.isCross,
        compiler: cap.compilerName,
        compilerVersion: cap.compilerVersion,
        linker: cap.linkerName,
        linkerVersion: cap.linkerVersion,
        llvmIRPath: safeFS.existsSync(llPath) ? llPath : undefined,
        llvmIRSha256,
        executionMode: 'not-executed',
        executionExitCode: null,
        executionSentinelMatched: false,
        capability: cap,
        diagnostics,
      };
    }

    // Tahap 2: Preflight toolchain & sysroot lintas OS
    if (!cap.canCompileAndLink) {
      diagnostics.push(
        `[TIDAK TERSEDIA: TOOLCHAIN_TIDAK_TERSEDIA] Target '${cap.canonicalTarget}' belum siap pada host ini: ${cap.missingRequirements.join(' ')}`
      );
      return {
        success: false,
        statusCode: 'TOOLCHAIN_TIDAK_TERSEDIA',
        target: cap.canonicalTarget,
        targetTriple: cap.triple,
        isCross: cap.isCross,
        compiler: cap.compilerName,
        compilerVersion: cap.compilerVersion,
        linker: cap.linkerName,
        linkerVersion: cap.linkerVersion,
        llvmIRPath: llPath,
        llvmIRSha256,
        executionMode: 'not-executed',
        executionExitCode: null,
        executionSentinelMatched: false,
        capability: cap,
        diagnostics,
      };
    }

    // Tahap 3: Kompilasi native utuh via AOTCompiler
    const exePath = safePath.join(
      options.outputDirectory,
      `${safeApp}${cap.executableExtension}`
    );
    const fullCompile = aot.compileSource(sourceCode, {
      targetTriple: cap.triple,
      optLevel: options.optLevel || 'O2',
      debug: options.debug,
      outputPath: exePath,
      customToolchainPath: options.customToolchainPath,
    });
    diagnostics.push(...fullCompile.diagnostics);

    const objectPath = fullCompile.objectPath;
    const objectSha256 =
      objectPath && safeFS.existsSync(objectPath)
        ? ArchiveBuilder.computeSha256(safeFS.readFileBufferSync(objectPath))
        : undefined;

    if (!fullCompile.success || !fullCompile.executablePath || !safeFS.existsSync(fullCompile.executablePath)) {
      return {
        success: false,
        statusCode: 'GALAT_LINKING',
        target: cap.canonicalTarget,
        targetTriple: cap.triple,
        isCross: cap.isCross,
        compiler: cap.compilerName,
        compilerVersion: cap.compilerVersion,
        linker: cap.linkerName,
        linkerVersion: cap.linkerVersion,
        llvmIRPath: llPath,
        llvmIRSha256,
        objectPath,
        objectSha256,
        executionMode: 'not-executed',
        executionExitCode: null,
        executionSentinelMatched: false,
        capability: cap,
        diagnostics,
      };
    }

    // Tahap 4: Validasi biner mesin secara ketat (ELF64 / PE32+ / Mach-O 64)
    const meta = BinaryInspector.inspectStrict(fullCompile.executablePath);
    if (!meta.isValidExecutable) {
      diagnostics.push(...(meta.validationErrors || ['Biner keluaran gagal verifikasi BinaryInspector.inspectStrict.']));
      return {
        success: false,
        statusCode: 'GALAT_VERIFIKASI_BINER',
        target: cap.canonicalTarget,
        targetTriple: cap.triple,
        isCross: cap.isCross,
        compiler: cap.compilerName,
        compilerVersion: cap.compilerVersion,
        linker: cap.linkerName,
        linkerVersion: cap.linkerVersion,
        llvmIRPath: llPath,
        llvmIRSha256,
        objectPath,
        objectSha256,
        executablePath: fullCompile.executablePath,
        binaryMetadata: meta,
        executionMode: 'not-executed',
        executionExitCode: null,
        executionSentinelMatched: false,
        capability: cap,
        diagnostics,
      };
    }

    const exeSha = ArchiveBuilder.computeSha256(safeFS.readFileBufferSync(fullCompile.executablePath));
    let executionMode: NativeBuildResult['executionMode'] = 'not-executed';
    let executionExitCode: number | null = null;
    let executionStdout = '';
    let sentinelMatched = false;

    // Tahap 5: Eksekusi opsional (native atau emulator cross resmi)
    if (options.verifyExecution) {
      let runCmd = fullCompile.executablePath;
      let runArgs: string[] = [];

      if (!cap.isCross) {
        executionMode = 'native';
      } else if (cap.emulatorAvailable && cap.emulatorName === 'rosetta2') {
        executionMode = 'rosetta2';
        runCmd = 'arch';
        runArgs = ['-x86_64', fullCompile.executablePath];
      } else if (cap.emulatorAvailable && cap.emulatorName) {
        executionMode = 'qemu-user';
        runCmd = cap.emulatorName;
        runArgs = [fullCompile.executablePath];
      }

      if (executionMode !== 'not-executed') {
        const execRes = safeCP.spawnSync(runCmd, runArgs, {
          encoding: 'utf-8',
          timeout: 15000,
          shell: false,
        });
        executionExitCode = execRes.status;
        executionStdout = (execRes.stdout || '').trim();
        sentinelMatched = options.expectedSentinel
          ? executionStdout.includes(options.expectedSentinel)
          : execRes.status === 0;
        if (execRes.status !== 0 || !sentinelMatched) {
          diagnostics.push(
            `Eksekusi biner gagal (mode=${executionMode}, exit=${execRes.status}, stdout='${executionStdout}').`
          );
          return {
            success: false,
            statusCode: 'GALAT_EKSEKUSI',
            target: cap.canonicalTarget,
            targetTriple: cap.triple,
            isCross: cap.isCross,
            compiler: cap.compilerName,
            compilerVersion: cap.compilerVersion,
            linker: cap.linkerName,
            linkerVersion: cap.linkerVersion,
            llvmIRPath: llPath,
            llvmIRSha256,
            objectPath,
            objectSha256,
            executablePath: fullCompile.executablePath,
            executableSha256: exeSha,
            binaryMetadata: meta,
            executionMode,
            executionExitCode,
            executionStdout,
            executionSentinelMatched: false,
            capability: cap,
            diagnostics,
          };
        }
      }
    }

    return {
      success: true,
      statusCode: 'BERHASIL',
      target: cap.canonicalTarget,
      targetTriple: cap.triple,
      isCross: cap.isCross,
      compiler: cap.compilerName,
      compilerVersion: cap.compilerVersion,
      linker: cap.linkerName,
      linkerVersion: cap.linkerVersion,
      llvmIRPath: llPath,
      llvmIRSha256,
      objectPath,
      objectSha256,
      executablePath: fullCompile.executablePath,
      executableSha256: exeSha,
      binaryMetadata: meta,
      executionMode,
      executionExitCode,
      executionStdout,
      executionSentinelMatched: sentinelMatched,
      capability: cap,
      diagnostics,
    };
  }
}
