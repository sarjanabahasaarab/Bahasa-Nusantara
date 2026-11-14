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

    const useCrossGcc = Boolean(
      options.crossCompilerCommand &&
        options.crossCompilerCommand !== 'clang' &&
        (this.targetInfo.isCross || !this.toolchain.binaries.clang.found)
    );

    const linkerBinary = useCrossGcc
      ? options.crossCompilerCommand
      : this.toolchain.binaries.clang.found
      ? this.toolchain.binaries.clang.command
      : this.toolchain.binaries.lld.found
      ? this.toolchain.binaries.lld.command
      : undefined;

    if (!linkerBinary) {
      this.diag.galat(
        'TOOLCHAIN_LINKER_HILANG',
        'Tidak ditemukan linker native (clang atau lld) untuk menjalankan dynamic linking.'
      );
      return {
        success: false,
        diagnostics: this.diag.dapatkanPesanFormatted(),
      };
    }

    const tmpDir = safeFS.mkdtempSync(safePath.join(safeOS.tmpdir(), 'nusantara-dynamic-link-'));
    const runtimeCPath = safePath.join(tmpDir, 'runtime.c');

    try {
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

      // Jika bukan library bersama (.so), sertakan runtime C stub
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

      // Search paths
      if (options.libraryPaths) {
        for (const lp of options.libraryPaths) {
          args.push(`-L${lp}`);
        }
      }

      // RPATH untuk resolusi runtime dynamic libraries
      if (options.rpaths && options.rpaths.length > 0) {
        for (const rp of options.rpaths) {
          args.push(`-Wl,-rpath,${rp}`);
        }
      } else {
        // Default rpath ke lokasi direktori biner executable ($ORIGIN pada Linux atau @executable_path pada macOS)
        if (this.targetInfo.os === 'linux') {
          args.push('-Wl,-rpath,$ORIGIN');
          args.push('-Wl,-rpath,$ORIGIN/lib');
        } else if (this.targetInfo.os === 'darwin') {
          args.push('-Wl,-rpath,@executable_path');
          args.push('-Wl,-rpath,@executable_path/../Frameworks');
        }
      }

      // Shared libraries
      if (options.sharedLibraries) {
        for (const lib of options.sharedLibraries) {
          if (lib.endsWith('.so') || lib.endsWith('.dylib') || lib.endsWith('.dll')) {
            args.push(lib);
          } else {
            args.push(`-l${lib}`);
          }
        }
      }

      const res = safeCP.spawnSync(linkerBinary, args, {
        encoding: 'utf-8',
        timeout: 45000,
        shell: false,
      });

      if (res.status === 0 && safeFS.existsSync(options.outputExecutable)) {
        diagReport.push(`Dynamic linking berhasil: ${options.outputExecutable}`);
        return {
          success: true,
          executablePath: options.outputExecutable,
          commandExecuted: `${linkerBinary} ${args.join(' ')}`,
          toolUsed: linkerBinary,
          diagnostics: diagReport,
        };
      } else {
        const errMsg = (res.stderr || res.stdout || '').trim();
        this.diag.galat('DYNAMIC_LINK_GAGAL', `Dynamic linking gagal: ${errMsg}`);
        return {
          success: false,
          commandExecuted: `${linkerBinary} ${args.join(' ')}`,
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
