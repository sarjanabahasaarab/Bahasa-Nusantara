/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA AOT COMPILER - Pipeline Kompilasi Lengkap Ahead-of-Time
 * Target Milestone: Phase 44 (v0.44.0)
 */

import { safeFS, safeOS, safePath } from '../llvm/node-compat';
import { ASTToNIRLowering } from '../nir/lowering/ast-to-nir';
import { NIRModule } from '../nir/module';
import { NIRPassManager } from '../nir/optimizer/pipeline';
import { NIRVerifier } from '../nir/verifier';
import { LLVMDiagnosticsManager } from '../llvm/diagnostics';
import { NativeLinker } from '../llvm/linker';
import { LLVMIRGenerator } from '../llvm/llvm-ir-generator';
import { LLVMOptLevel, LLVMOptimizer } from '../llvm/llvm-optimizer';
import { LLVMValidator } from '../llvm/llvm-validator';
import { ObjectGenerator } from '../llvm/object-generator';
import { TargetPlatformInfo, TargetTripleManager } from '../llvm/target-triple';
import { LLVMToolchainManager, LLVMToolchainStatus } from '../llvm/toolchain-manager';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { PemeriksaTipe } from '../../tipe/pemeriksaTipe';

export interface AOTCompileOptions {
  targetTriple?: string;
  optLevel?: LLVMOptLevel;
  debug?: boolean;
  emitLLVM?: boolean;
  emitObject?: boolean;
  outputPath?: string;
  customToolchainPath?: string;
}

export interface AOTCompileResult {
  success: boolean;
  nirModule?: NIRModule;
  llvmIR?: string;
  optimizedIR?: string;
  objectPath?: string;
  executablePath?: string;
  toolchain: LLVMToolchainStatus;
  llvmValidationTool?: string;
  diagnostics: string[];
}

export class AOTCompiler {
  private readonly toolchainManager: LLVMToolchainManager;
  private readonly diag: LLVMDiagnosticsManager;

  constructor(customToolchainPath?: string) {
    this.toolchainManager = new LLVMToolchainManager(customToolchainPath);
    this.diag = new LLVMDiagnosticsManager();
  }

  public compileSource(sourceCode: string, options: AOTCompileOptions = {}): AOTCompileResult {
    const diagReport: string[] = [];
    const toolchainStatus = this.toolchainManager.detect();

    // 1. Parsing AST
    const parser = new Parser(sourceCode);
    const ast = parser.parse();
    const galatParser = parser.dapatkanDaftarGalat();
    if (galatParser.length > 0) {
      return {
        success: false,
        toolchain: toolchainStatus,
        diagnostics: galatParser.map((g) => `[Parser] ${g.message}`),
      };
    }

    // 2. Lowering AST ke NIR (Phase 43)
    const lowering = new ASTToNIRLowering(ast.namaProgram || 'ProgramNusantara');
    const nirMod = lowering.lower(ast);

    // 3. Verifikasi NIR
    const verifRes = NIRVerifier.verifyModule(nirMod);
    if (!verifRes.valid) {
      return {
        success: false,
        nirModule: nirMod,
        toolchain: toolchainStatus,
        diagnostics: verifRes.errors.map((e) => `[NIR Verifier] ${e}`),
      };
    }

    // 5. Optimasi NIR (O2 pipeline Phase 43)
    const nirOptimizer = NIRPassManager.createO2Pipeline();
    nirOptimizer.run(nirMod);

    // 6. Penentuan Target Triple
    const targetInfo = TargetTripleManager.resolve(options.targetTriple);

    // 7. Generasi LLVM IR (Phase 44)
    const irGen = new LLVMIRGenerator(targetInfo, toolchainStatus.useOpaquePointers, this.diag);
    const rawLLVM = irGen.generate(nirMod);

    // 8. Validasi LLVM IR
    const validator = new LLVMValidator(toolchainStatus, this.diag);
    const valRes = validator.validateIR(rawLLVM);
    if (!valRes.valid) {
      return {
        success: false,
        nirModule: nirMod,
        llvmIR: rawLLVM,
        toolchain: toolchainStatus,
        llvmValidationTool: valRes.toolUsed,
        diagnostics: valRes.diagnostics,
      };
    }

    // 9. Optimasi LLVM IR via opt
    const llvmOpt = new LLVMOptimizer(toolchainStatus, this.diag);
    const optRes = llvmOpt.optimize(rawLLVM, options.optLevel || 'O2');
    const finalIR = optRes.optimizedIR;

    // Simpan file .ll jika diminta
    if (options.emitLLVM && options.outputPath) {
      const llPath = options.outputPath.endsWith('.ll')
        ? options.outputPath
        : `${options.outputPath}.ll`;
      safeFS.writeFileSync(llPath, finalIR, 'utf-8');
      diagReport.push(`LLVM IR berhasil ditulis ke: ${llPath}`);
    }

    // 10. Jika toolchain LLVM tidak tersedia, laporkan bahwa AOT tidak dapat melanjutkan ke object/biner
    if (!toolchainStatus.available) {
      diagReport.push(...toolchainStatus.diagnostics);
      return {
        success: true,
        nirModule: nirMod,
        llvmIR: rawLLVM,
        optimizedIR: finalIR,
        toolchain: toolchainStatus,
        llvmValidationTool: valRes.toolUsed,
        diagnostics: diagReport,
      };
    }

    // 11. Generasi Berkas Objek (.o / .obj)
    const tempDir = safeFS.mkdtempSync(safePath.join(safeOS.tmpdir(), 'nusantara-aot-build-'));
    const objExt = targetInfo.objectExtension;
    const objPath = options.emitObject && options.outputPath
      ? options.outputPath
      : safePath.join(tempDir, `program${objExt}`);

    const objGen = new ObjectGenerator(toolchainStatus, targetInfo, this.diag);
    const objRes = objGen.generateObject(finalIR, objPath);

    if (!objRes.success) {
      diagReport.push(...objRes.diagnostics);
      return {
        success: false,
        nirModule: nirMod,
        llvmIR: rawLLVM,
        optimizedIR: finalIR,
        toolchain: toolchainStatus,
        llvmValidationTool: valRes.toolUsed,
        diagnostics: diagReport,
      };
    }
    diagReport.push(...objRes.diagnostics);

    if (options.emitObject) {
      return {
        success: true,
        nirModule: nirMod,
        llvmIR: rawLLVM,
        optimizedIR: finalIR,
        objectPath: objPath,
        toolchain: toolchainStatus,
        llvmValidationTool: valRes.toolUsed,
        diagnostics: diagReport,
      };
    }

    // 12. Linking Menjadi Executable Native
    const binExt = targetInfo.executableExtension;
    const binPath = options.outputPath || safePath.join(tempDir, `program${binExt}`);
    const linker = new NativeLinker(toolchainStatus, targetInfo, this.diag);
    const linkRes = linker.link(objPath, binPath, { debug: options.debug });

    diagReport.push(...linkRes.diagnostics);

    return {
      success: linkRes.success,
      nirModule: nirMod,
      llvmIR: rawLLVM,
      optimizedIR: finalIR,
      objectPath: objPath,
      executablePath: linkRes.success ? binPath : undefined,
      toolchain: toolchainStatus,
      llvmValidationTool: valRes.toolUsed,
      diagnostics: diagReport,
    };
  }
}
