/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA ADVANCED LINKER - Static Linker Engine
 * Target Milestone: Phase 45 (v0.45.0)
 */

import { safeCP, safeFS, safeOS, safePath } from '../llvm/node-compat';
import { LLVMToolchainStatus } from '../llvm/toolchain-manager';
import { TargetPlatformInfo } from '../llvm/target-triple';
import { NativeRuntimeManager } from '../runtime/native-runtime';
import { LinkerDiagnosticsManager } from './linker-diagnostics';

export interface StaticLinkingOptions {
  objectFiles: string[];
  outputExecutable: string;
  staticLibraries?: string[];
  libraryPaths?: string[];
  noDefaultLibraries?: boolean;
  debug?: boolean;
  strip?: boolean;
  sysroot?: string;
  crossCompilerCommand?: string;
  explicitSysrootOverride?: boolean;
}

export interface LinkingExecutionResult {
  success: boolean;
  executablePath?: string;
  commandExecuted?: string;
  toolUsed?: string;
  diagnostics: string[];
}

export class StaticLinker {
  constructor(
    private readonly toolchain: LLVMToolchainStatus,
    private readonly targetInfo: TargetPlatformInfo,
    private readonly diag: LinkerDiagnosticsManager = new LinkerDiagnosticsManager()
  ) {}

  public linkStatic(options: StaticLinkingOptions): LinkingExecutionResult {
    const diagReport: string[] = [];

    const useCrossGcc = Boolean(
      options.crossCompilerCommand &&
        options.crossCompilerCommand !== 'clang' &&
        (this.targetInfo.isCross || !this.toolchain.binaries.clang.found)
    );

    // Periksa ketersediaan tool linker (cross-gcc / clang / lld)
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
        'Tidak ditemukan linker native (clang atau lld) untuk menjalankan static linking.'
      );
      return {
        success: false,
        diagnostics: this.diag.dapatkanPesanFormatted(),
      };
    }

    const tmpDir = safeFS.mkdtempSync(safePath.join(safeOS.tmpdir(), 'nusantara-static-link-'));
    const runtimeCPath = safePath.join(tmpDir, 'runtime.c');

    try {
      // 1. Tulis runtime C stub pendukung
      safeFS.writeFileSync(runtimeCPath, NativeRuntimeManager.generateRuntimeCSource(), 'utf-8');

      // 2. Susun argumen linker secara aman
      const args: string[] = [];
      if (!useCrossGcc) {
        args.push('-target', this.targetInfo.triple);
        if (this.targetInfo.isCross && this.targetInfo.os === 'linux' && this.toolchain.binaries.lld.found) {
          args.push('-fuse-ld=lld');
        }
      }
      args.push('-static'); // Flag static linking

      if (options.sysroot && (!useCrossGcc || options.explicitSysrootOverride)) {
        if (this.targetInfo.os === 'darwin') {
          args.push('-isysroot', options.sysroot);
        } else {
          args.push(`--sysroot=${options.sysroot}`);
        }
      }

      args.push(...options.objectFiles, runtimeCPath, '-o', options.outputExecutable);

      if (options.debug) {
        args.push('-g');
      }

      if (options.strip && this.targetInfo.os === 'linux') {
        args.push('-s');
      }

      if (options.noDefaultLibraries) {
        args.push('-nodefaultlibs');
      }

      // Tambahkan library search paths
      if (options.libraryPaths) {
        for (const lp of options.libraryPaths) {
          args.push(`-L${lp}`);
        }
      }

      // Tambahkan static libraries
      if (options.staticLibraries) {
        for (const lib of options.staticLibraries) {
          if (lib.endsWith('.a') || lib.endsWith('.lib')) {
            args.push(lib);
          } else {
            args.push(`-l${lib}`);
          }
        }
      }

      // 3. Eksekusi linker
      const res = safeCP.spawnSync(linkerBinary, args, {
        encoding: 'utf-8',
        timeout: 45000,
        shell: false,
      });

      if (res.status === 0 && safeFS.existsSync(options.outputExecutable)) {
        diagReport.push(`Static linking berhasil: ${options.outputExecutable}`);
        return {
          success: true,
          executablePath: options.outputExecutable,
          commandExecuted: `${linkerBinary} ${args.join(' ')}`,
          toolUsed: linkerBinary,
          diagnostics: diagReport,
        };
      } else {
        const errMsg = (res.stderr || res.stdout || '').trim();
        this.diag.galat('STATIC_LINK_GAGAL', `Static linking gagal: ${errMsg}`);
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
