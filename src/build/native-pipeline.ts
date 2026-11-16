/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Pipeline Kompilasi Native Nyata (Phase 23)
 * Target Milestone: v0.23.0 / v0.23.5
 */

import { AOTCompiler } from '../compiler/aot/aot-compiler';
import { BinaryInspector } from '../compiler/executable/binary-inspector';
import { DependencyInspector } from '../compiler/linker/dependency-inspector';
import { LinkerManager } from '../compiler/linker/linker-manager';
import { safeCP, safeFS, safePath } from '../compiler/llvm/node-compat';
import { ObjectGenerator } from '../compiler/llvm/object-generator';
import { TargetTripleManager } from '../compiler/llvm/target-triple';
import { LLVMToolchainManager } from '../compiler/llvm/toolchain-manager';
import { ArchiveBuilder } from './archive-builder';
import { TargetMatrixManager } from './target-matrix';
import { LinkingMode, NativeBuildOptions, NativeBuildResult } from './types';

export class NativeBuildPipeline {
  public static build(options: NativeBuildOptions): NativeBuildResult {
    const diagnostics: string[] = [];
    const requestedTarget = options.target;
    const strictTarget = TargetTripleManager.resolveStrict(requestedTarget);
    const targetInfo = strictTarget.info;
    const linkingMode: LinkingMode = options.linkingMode || 'auto';

    if (!strictTarget.supported || !targetInfo.targetId) {
      const msg = strictTarget.error || `Target build '${requestedTarget}' tidak didukung.`;
      diagnostics.push(msg);
      return {
        success: false,
        statusCode: 'TARGET_TIDAK_DIDUKUNG',
        target: requestedTarget || '(unknown)',
        triple: targetInfo.triple,
        isCross: targetInfo.isCross,
        linkingMode,
        actualStaticLink: false,
        executedOnHost: false,
        executionMode: 'not-executed',
        diagnostics,
      };
    }

    const canonicalTarget = targetInfo.targetId;
    const toolchain = new LLVMToolchainManager(options.customToolchainPath).detect();
    const capability = TargetMatrixManager.inspectTargetCapability(canonicalTarget, toolchain);

    // Ambil kode sumber .nusantara
    let sourceCode = options.sourceCode;
    if (!sourceCode && options.sourceFilePath) {
      if (!safeFS.existsSync(options.sourceFilePath)) {
        diagnostics.push(`Berkas sumber tidak ditemukan: ${options.sourceFilePath}`);
        return {
          success: false,
          statusCode: 'GALAT_KOMPILASI',
          target: canonicalTarget,
          canonicalTarget,
          triple: targetInfo.triple,
          isCross: targetInfo.isCross,
          linkingMode,
          actualStaticLink: false,
          executedOnHost: false,
          executionMode: 'not-executed',
          diagnostics,
        };
      }
      sourceCode = safeFS.readFileSync(options.sourceFilePath, 'utf-8');
    }

    if (!sourceCode) {
      diagnostics.push('Kode sumber (.nusantara) tidak diberikan untuk kompilasi native.');
      return {
        success: false,
        statusCode: 'GALAT_KOMPILASI',
        target: canonicalTarget,
        canonicalTarget,
        triple: targetInfo.triple,
        isCross: targetInfo.isCross,
        linkingMode,
        actualStaticLink: false,
        executedOnHost: false,
        executionMode: 'not-executed',
        diagnostics,
      };
    }

    const outDir = safePath.resolve(options.outputDirectory);
    safeFS.mkdirSync(outDir, { recursive: true });
    const appName =
      options.appName ||
      (options.sourceFilePath
        ? safePath.basename(options.sourceFilePath, safePath.extname(options.sourceFilePath))
        : 'program');

    // Tahap 1 & 2: Parser -> NIR -> Verifier -> LLVM IR (termasuk validasi ketat @.str.*)
    const llPath = safePath.join(outDir, `${appName}.ll`);
    const aot = new AOTCompiler(options.customToolchainPath);
    const irRes = aot.compileSource(sourceCode, {
      targetTriple: targetInfo.triple,
      optLevel: options.optLevel || 'O2',
      emitLLVM: true,
      emitObject: false,
      outputPath: llPath,
      customToolchainPath: options.customToolchainPath,
    });

    // Pastikan berkas .ll benar-benar tertulis meski toolchain LLVM tidak ada
    const finalIRText = irRes.optimizedIR || irRes.llvmIR;
    if (finalIRText && !safeFS.existsSync(llPath)) {
      safeFS.writeFileSync(llPath, finalIRText, 'utf-8');
    }
    const llvmIRSha256 =
      finalIRText && safeFS.existsSync(llPath)
        ? ArchiveBuilder.computeSha256(safeFS.readFileBufferSync(llPath))
        : undefined;

    if (!irRes.success || !finalIRText) {
      diagnostics.push(...irRes.diagnostics);
      return {
        success: false,
        statusCode: 'GALAT_KOMPILASI',
        target: canonicalTarget,
        canonicalTarget,
        triple: targetInfo.triple,
        isCross: targetInfo.isCross,
        linkingMode,
        actualStaticLink: false,
        llvmIRPath: safeFS.existsSync(llPath) ? llPath : undefined,
        llvmIRSha256,
        llvmValidationTool: irRes.llvmValidationTool,
        executedOnHost: false,
        executionMode: 'not-executed',
        diagnostics,
      };
    }

    // Tolak eksplisit sisa simbol @.str._v* sebelum memanggil clang/llc
    if (/@\.str\._v\d+/.test(finalIRText)) {
      diagnostics.push('Terdeteksi referensi string LLVM IR tidak valid (@.str._v*) sebelum generasi objek.');
      return {
        success: false,
        statusCode: 'GALAT_KOMPILASI',
        target: canonicalTarget,
        canonicalTarget,
        triple: targetInfo.triple,
        isCross: targetInfo.isCross,
        linkingMode,
        actualStaticLink: false,
        llvmIRPath: llPath,
        llvmIRSha256,
        llvmValidationTool: irRes.llvmValidationTool,
        executedOnHost: false,
        executionMode: 'not-executed',
        diagnostics,
      };
    }

    // Tahap 3: Cek validitas sysroot kustom (jika diberikan) serta ketersediaan toolchain & C runtime target
    if (options.sysroot) {
      if (!safeFS.existsSync(options.sysroot)) {
        diagnostics.push(`Sysroot kustom tidak ditemukan: ${options.sysroot}`);
        return {
          success: false,
          statusCode: 'CROSS_SDK_TIDAK_TERSEDIA',
          target: canonicalTarget,
          canonicalTarget,
          triple: targetInfo.triple,
          isCross: targetInfo.isCross,
          linkingMode,
          actualStaticLink: false,
          llvmIRPath: llPath,
          llvmIRSha256,
          llvmValidationTool: irRes.llvmValidationTool,
          executedOnHost: false,
          executionMode: 'not-executed',
          diagnostics,
        };
      }
      if (targetInfo.os === 'linux') {
        const hasSysrootStdio =
          options.sysroot === '/'
            ? safeFS.existsSync('/usr/include/stdio.h') || safeFS.existsSync('/usr/local/include/stdio.h')
            : safeFS.existsSync(safePath.join(options.sysroot, 'usr/include/stdio.h')) ||
              safeFS.existsSync(safePath.join(options.sysroot, 'include/stdio.h'));
        if (!hasSysrootStdio) {
          diagnostics.push(
            `Sysroot Linux '${options.sysroot}' tidak memuat header standar C (stdio.h) untuk target '${targetInfo.triple}'.`
          );
          return {
            success: false,
            statusCode: 'GALAT_LINKER',
            target: canonicalTarget,
            canonicalTarget,
            triple: targetInfo.triple,
            isCross: targetInfo.isCross,
            linkingMode,
            actualStaticLink: false,
            llvmIRPath: llPath,
            llvmIRSha256,
            llvmValidationTool: irRes.llvmValidationTool,
            executedOnHost: false,
            executionMode: 'not-executed',
            diagnostics,
          };
        }
      }
    }

    if (!capability.canBuildNative && !options.sysroot) {
      const statusCode =
        !toolchain.available || (!capability.clangAvailable && !capability.llcAvailable)
          ? 'TOOLCHAIN_TIDAK_TERSEDIA'
          : targetInfo.isCross || capability.sdkAvailable === false
          ? 'CROSS_SDK_TIDAK_TERSEDIA'
          : 'TOOLCHAIN_TIDAK_TERSEDIA';

      diagnostics.push(
        `[TIDAK TERSEDIA: ${statusCode}] ${capability.diagnosticMessage}`
      );
      if (capability.missingRequirements.length > 0) {
        diagnostics.push(`Persyaratan hilang: ${capability.missingRequirements.join('; ')}`);
      }
      return {
        success: false,
        statusCode,
        target: canonicalTarget,
        canonicalTarget,
        triple: targetInfo.triple,
        isCross: targetInfo.isCross,
        linkingMode,
        actualStaticLink: false,
        sdkUsed: capability.sdkName,
        llvmIRPath: llPath,
        llvmIRSha256,
        llvmValidationTool: irRes.llvmValidationTool,
        executedOnHost: false,
        executionMode: 'not-executed',
        diagnostics,
      };
    }

    // Tahap 4: Compile LLVM IR -> Object File (.o / .obj)
    const objPath = safePath.join(outDir, `${appName}${targetInfo.objectExtension}`);
    const objGen = new ObjectGenerator(toolchain, targetInfo);
    const objRes = objGen.generateObject(finalIRText, objPath);
    diagnostics.push(...objRes.diagnostics);

    if (!objRes.success || !safeFS.existsSync(objPath)) {
      return {
        success: false,
        statusCode: 'GALAT_KOMPILASI',
        target: canonicalTarget,
        canonicalTarget,
        triple: targetInfo.triple,
        isCross: targetInfo.isCross,
        linkingMode,
        actualStaticLink: false,
        compilerToolUsed: objRes.toolUsed,
        sdkUsed: capability.sdkName,
        llvmIRPath: llPath,
        llvmIRSha256,
        llvmValidationTool: irRes.llvmValidationTool,
        executedOnHost: false,
        executionMode: 'not-executed',
        diagnostics,
      };
    }
    const objectSha256 = ArchiveBuilder.computeSha256(safeFS.readFileBufferSync(objPath));

    // Tahap 5: Tentukan static vs dynamic linking nyata
    let wantStatic = false;
    if (linkingMode === 'static') {
      if (targetInfo.os === 'darwin') {
        diagnostics.push(
          'Mode static penuh (-static) tidak didukung pada user-space macOS/Darwin karena Apple melarang binary tanpa libSystem.B.dylib.'
        );
        return {
          success: false,
          statusCode: 'GALAT_LINKER',
          target: canonicalTarget,
          canonicalTarget,
          triple: targetInfo.triple,
          isCross: targetInfo.isCross,
          linkingMode,
          actualStaticLink: false,
          compilerToolUsed: objRes.toolUsed,
          llvmIRPath: llPath,
          llvmIRSha256,
          objectPath: objPath,
          objectSha256,
          executedOnHost: false,
          executionMode: 'not-executed',
          diagnostics,
        };
      }
      wantStatic = true;
    }

    const exePath = safePath.join(outDir, `${appName}${targetInfo.executableExtension}`);
    const linkerMgr = new LinkerManager({
      targetTriple: targetInfo.triple,
      customToolchainPath: options.customToolchainPath,
    });

    const linkRes = linkerMgr.link({
      objectFiles: [objPath],
      outputExecutable: exePath,
      isStatic: wantStatic,
      debug: options.debug,
      strip: options.strip,
      sysroot: options.sysroot || capability.sysroot,
      targetTriple: targetInfo.triple,
      customToolchainPath: options.customToolchainPath,
      crossCompilerCommand: capability.crossCompilerCommand,
      explicitSysrootOverride: Boolean(options.sysroot),
    });
    diagnostics.push(...linkRes.diagnostics);

    if (!linkRes.success || !safeFS.existsSync(exePath)) {
      return {
        success: false,
        statusCode: 'GALAT_LINKER',
        target: canonicalTarget,
        canonicalTarget,
        triple: targetInfo.triple,
        isCross: targetInfo.isCross,
        linkingMode,
        actualStaticLink: wantStatic,
        compilerToolUsed: objRes.toolUsed,
        linkerToolUsed: linkRes.toolUsed,
        linkerCommand: linkRes.commandExecuted,
        sdkUsed: capability.sdkName,
        llvmIRPath: llPath,
        llvmIRSha256,
        llvmValidationTool: irRes.llvmValidationTool,
        objectPath: objPath,
        objectSha256,
        executedOnHost: false,
        executionMode: 'not-executed',
        diagnostics,
      };
    }

    // Tahap 6: Inspeksi biner ketat (ELF / PE-COFF / Mach-O)
    const meta = BinaryInspector.inspectStrict(exePath);
    const exeBytes = safeFS.readFileBufferSync(exePath);
    const exeSha256 = ArchiveBuilder.computeSha256(exeBytes);

    if (
      !meta.isValidExecutable ||
      meta.format !== targetInfo.objectFormat ||
      meta.architecture !== targetInfo.arch
    ) {
      diagnostics.push(
        `Validasi biner ketat gagal: expected format=${targetInfo.objectFormat}/arch=${targetInfo.arch}, aktual format=${meta.format}/arch=${meta.architecture} (${(meta.validationErrors || []).join('; ')}).`
      );
      return {
        success: false,
        statusCode: 'BINER_TIDAK_VALID',
        target: canonicalTarget,
        canonicalTarget,
        triple: targetInfo.triple,
        isCross: targetInfo.isCross,
        linkingMode,
        actualStaticLink: wantStatic,
        compilerToolUsed: objRes.toolUsed,
        linkerToolUsed: linkRes.toolUsed,
        linkerCommand: linkRes.commandExecuted,
        sdkUsed: capability.sdkName,
        llvmIRPath: llPath,
        llvmIRSha256,
        llvmValidationTool: irRes.llvmValidationTool,
        objectPath: objPath,
        objectSha256,
        executablePath: exePath,
        executableSha256: exeSha256,
        executableSizeBytes: exeBytes.byteLength,
        binaryMetadata: meta,
        executedOnHost: false,
        executionMode: 'not-executed',
        diagnostics,
      };
    }

    const depOs = targetInfo.os === 'unknown' ? 'linux' : targetInfo.os;
    const depReport = new DependencyInspector().inspect(exePath, depOs);
    diagnostics.push(...depReport.diagnostics);

    // Tahap 7: Eksekusi nyata (native / qemu-aarch64-static / rosetta2)
    let executedOnHost = false;
    let executionMode = capability.executionMode;
    let executionExitCode: number | null | undefined;
    let executionStdout: string | undefined;
    let executionStderr: string | undefined;

    const shouldExecute = options.verifyExecution !== false && capability.canExecuteOnHost;
    if (shouldExecute) {
      if (typeof process !== 'undefined' && process.platform !== 'win32') {
        try {
          safeFS.chmodSync(exePath, 0o755);
        } catch {
          // abaikan
        }
      }

      let runCmd = exePath;
      let runArgs: string[] = [];
      if (capability.executionMode === 'qemu-user' && capability.emulatorCommand) {
        runCmd = capability.emulatorCommand;
        if (capability.sysroot && safeFS.existsSync(capability.sysroot)) {
          runArgs = ['-L', capability.sysroot, exePath];
        } else {
          runArgs = [exePath];
        }
      } else if (capability.executionMode === 'rosetta2') {
        runCmd = 'arch';
        runArgs = ['-x86_64', exePath];
      }

      const execRes = safeCP.spawnSync(runCmd, runArgs, {
        encoding: 'utf-8',
        timeout: 15000,
        shell: false,
      });

      executedOnHost = true;
      executionExitCode = execRes.status;
      executionStdout = execRes.stdout || '';
      executionStderr = execRes.stderr || '';

      if (execRes.status !== 0) {
        diagnostics.push(
          `Eksekusi biner gagal (${executionMode}, cmd='${runCmd} ${runArgs.join(' ')}', exit=${execRes.status}): ${executionStderr || executionStdout}`
        );
        return {
          success: false,
          statusCode: 'EKSEKUSI_GAGAL',
          target: canonicalTarget,
          canonicalTarget,
          triple: targetInfo.triple,
          isCross: targetInfo.isCross,
          linkingMode,
          actualStaticLink: Boolean(depReport.isStatic || wantStatic),
          compilerToolUsed: objRes.toolUsed,
          linkerToolUsed: linkRes.toolUsed,
          linkerCommand: linkRes.commandExecuted,
          sdkUsed: capability.sdkName,
          llvmIRPath: llPath,
          llvmIRSha256,
          llvmValidationTool: irRes.llvmValidationTool,
          objectPath: objPath,
          objectSha256,
          executablePath: exePath,
          executableSha256: exeSha256,
          executableSizeBytes: exeBytes.byteLength,
          binaryMetadata: meta,
          dependencyReport: depReport,
          executedOnHost,
          executionMode,
          executionExitCode,
          executionStdout,
          executionStderr,
          diagnostics,
        };
      }
    } else if (!capability.canExecuteOnHost) {
      executionMode = 'cross-compiled-not-executed';
    }

    return {
      success: true,
      statusCode: 'BERHASIL',
      target: canonicalTarget,
      canonicalTarget,
      triple: targetInfo.triple,
      isCross: targetInfo.isCross,
      linkingMode,
      actualStaticLink: Boolean(depReport.isStatic || wantStatic),
      compilerToolUsed: objRes.toolUsed,
      linkerToolUsed: linkRes.toolUsed,
      linkerCommand: linkRes.commandExecuted,
      sdkUsed: capability.sdkName,
      llvmIRPath: llPath,
      llvmIRSha256,
      llvmValidationTool: irRes.llvmValidationTool,
      objectPath: objPath,
      objectSha256,
      executablePath: exePath,
      executableSha256: exeSha256,
      executableSizeBytes: exeBytes.byteLength,
      binaryMetadata: meta,
      dependencyReport: depReport,
      executedOnHost,
      executionMode,
      executionExitCode,
      executionStdout,
      executionStderr,
      diagnostics,
    };
  }
}
