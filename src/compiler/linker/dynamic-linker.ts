/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA ADVANCED LINKER - Dynamic Linker Engine
 * Target Milestone: Phase 45 (v0.45.0)
 */

import { safeCP, safeFS, safeOS, safePath } from '../llvm/node-compat';
import { LLVMToolchainStatus } from '../llvm/toolchain-manager';
import { TargetPlatformInfo } from '../llvm/target-triple';
import { NativeRuntimeManager } from '../runtime/native-runtime';
import { LinkerDiagnosticsManager } from './linker-diagnostics';
import { LinkingExecutionResult } from './static-linker';

export interface DynamicLinkingOptions {
  objectFiles: string[];
  outputExecutable: string;
  sharedLibraries?: string[];
  libraryPaths?: string[];
  rpaths?: string[];
  isSharedLibraryOutput?: boolean; // Jika menghasilkan .so / .dylib / .dll
  debug?: boolean;
  strip?: boolean;
  sysroot?: string;
  crossCompilerCommand?: string;
  explicitSysrootOverride?: boolean;
}

export class DynamicLinker {
  constructor(
    private readonly toolchain: LLVMToolchainStatus,
    private readonly targetInfo: TargetPlatformInfo,
    private readonly diag: LinkerDiagnosticsManager = new LinkerDiagnosticsManager()
  ) {}

  public linkDynamic(options: DynamicLinkingOptions): LinkingExecutionResult {
    const diagReport: string[] = [];

    if (!options.objectFiles || options.objectFiles.length === 0) {
      this.diag.galat(
        'OBJ_INPUT_KOSONG',
        'Dynamic linking memerlukan minimal satu berkas objek (.o / .obj); daftar objectFiles kosong.'
      );
      return {
        success: false,
        targetTriple: this.targetInfo.triple,
        diagnostics: this.diag.dapatkanPesanFormatted(),
      };
    }

    for (const objPath of options.objectFiles) {
      if (!safeFS.existsSync(objPath)) {
        this.diag.galat('OBJ_TIDAK_DITEMUKAN', `Berkas objek tidak ditemukan di disk: ${objPath}`);
        return {
          success: false,
          targetTriple: this.targetInfo.triple,
          diagnostics: this.diag.dapatkanPesanFormatted(),
        };
      }
      const stat = safeFS.statSync(objPath);
      if (!stat || stat.size <= 0) {
        this.diag.galat('OBJ_KOSONG', `Berkas objek berukuran 0 byte: ${objPath}`);
        return {
          success: false,
          targetTriple: this.targetInfo.triple,
          diagnostics: this.diag.dapatkanPesanFormatted(),
        };
      }
    }

    const useCrossGcc = Boolean(
      options.crossCompilerCommand &&
        options.crossCompilerCommand !== 'clang' &&
        (this.targetInfo.isCross || !this.toolchain.binaries.clang.found)
    );

    const linkerBinary = useCrossGcc
      ? options.crossCompilerCommand
      : this.toolchain.binaries.clang.found
      ? this.toolchain.binaries.clang.command
      : undefined;

    if (!linkerBinary) {
      const lldNote = this.toolchain.binaries.lld.found
        ? ` (LLD terdeteksi: ${this.toolchain.binaries.lld.command}, namun driver Clang/C tetap diperlukan untuk menautkan runtime C dan libc sistem)`
        : '';
      this.diag.galat(
        'TOOLCHAIN_LINKER_HILANG',
        `Tidak ditemukan driver compiler/linker (clang atau cross-gcc) untuk menjalankan dynamic linking${lldNote}.`
      );
      return {
        success: false,
        targetTriple: this.targetInfo.triple,
        diagnostics: this.diag.dapatkanPesanFormatted(),
      };
    }

    const tmpDir = safeFS.mkdtempSync(safePath.join(safeOS.tmpdir(), 'nusantara-dynamic-link-'));
    const runtimeCPath = safePath.join(tmpDir, 'runtime.c');

    try {
      const outParent = safePath.dirname(safePath.resolve(options.outputExecutable));
      if (!safeFS.existsSync(outParent)) {
        safeFS.mkdirSync(outParent, { recursive: true });
      }

      safeFS.writeFileSync(runtimeCPath, NativeRuntimeManager.generateRuntimeCSource(), 'utf-8');

      const args: string[] = [];
      if (!useCrossGcc) {
        args.push('-target', this.targetInfo.triple);
        if (this.targetInfo.isCross && this.targetInfo.os === 'linux' && this.toolchain.binaries.lld.found) {
          args.push('-fuse-ld=lld');
        }
      }
      args.push(...options.objectFiles);

      if (options.sysroot && (!useCrossGcc || options.explicitSysrootOverride)) {
        if (this.targetInfo.os === 'darwin') {
          args.push('-isysroot', options.sysroot);
        } else {
          args.push(`--sysroot=${options.sysroot}`);
        }
      }

      if (!options.isSharedLibraryOutput) {
        args.push(runtimeCPath);
      } else {
        args.push('-shared');
        args.push('-fPIC');
      }

      args.push('-o', options.outputExecutable);

      if (options.debug) {
        args.push('-g');
      }
      if (options.strip && this.targetInfo.os === 'linux') {
        args.push('-s');
      }

      if (options.libraryPaths) {
        for (const lp of options.libraryPaths) {
          args.push(`-L${lp}`);
        }
      }

      if (options.rpaths && options.rpaths.length > 0) {
        for (const rp of options.rpaths) {
          args.push(`-Wl,-rpath,${rp}`);
        }
      } else {
        if (this.targetInfo.os === 'linux') {
          args.push('-Wl,-rpath,$ORIGIN');
          args.push('-Wl,-rpath,$ORIGIN/lib');
        } else if (this.targetInfo.os === 'darwin') {
          args.push('-Wl,-rpath,@executable_path');
          args.push('-Wl,-rpath,@executable_path/../Frameworks');
        }
      }

      if (options.sharedLibraries) {
        for (const lib of options.sharedLibraries) {
          if (lib.endsWith('.so') || lib.endsWith('.dylib') || lib.endsWith('.dll')) {
            args.push(lib);
          } else {
            args.push(`-l${lib}`);
          }
        }
      }

      const cmdStr = `${linkerBinary} ${args.join(' ')}`;

      const res = safeCP.spawnSync(linkerBinary, args, {
        encoding: 'utf-8',
        timeout: 45000,
        shell: false,
      });

      const stdoutText = (res.stdout || '').trim();
      const stderrText = (res.stderr || '').trim();

      if (res.status === 0 && safeFS.existsSync(options.outputExecutable)) {
        diagReport.push(`Dynamic linking berhasil (${this.targetInfo.triple}): ${options.outputExecutable}`);
        return {
          success: true,
          executablePath: options.outputExecutable,
          commandExecuted: cmdStr,
          toolUsed: linkerBinary,
          targetTriple: this.targetInfo.triple,
          exitCode: res.status,
          stdout: stdoutText,
          stderr: stderrText,
          diagnostics: diagReport,
        };
      } else {
        const errMsg = stderrText || stdoutText || `exit code=${res.status}`;
        this.diag.galat(
          'DYNAMIC_LINK_GAGAL',
          `Dynamic linking gagal untuk target '${this.targetInfo.triple}' (exit=${res.status}): ${errMsg}`
        );
        return {
          success: false,
          commandExecuted: cmdStr,
          toolUsed: linkerBinary,
          targetTriple: this.targetInfo.triple,
          exitCode: res.status,
          stdout: stdoutText,
          stderr: stderrText,
          diagnostics: this.diag.dapatkanPesanFormatted(),
        };
      }
    } finally {
      try {
        safeFS.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Abaikan
      }
    }
  }
}
