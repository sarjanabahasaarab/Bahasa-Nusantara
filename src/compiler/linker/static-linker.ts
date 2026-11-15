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
  targetTriple?: string;
  exitCode?: number | null;
  stdout?: string;
  stderr?: string;
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

    if (!options.objectFiles || options.objectFiles.length === 0) {
      this.diag.galat(
        'OBJ_INPUT_KOSONG',
        'Static linking memerlukan minimal satu berkas objek (.o / .obj); daftar objectFiles kosong.'
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

    if (this.targetInfo.os === 'darwin') {
      this.diag.galat(
        'STATIC_TIDAK_DIDUKUNG_DARWIN',
        `Static linking penuh (-static) tidak didukung pada target macOS/Darwin (${this.targetInfo.triple}) karena Apple tidak menyediakan crt0.o user-space; gunakan dynamic linking dengan libSystem.B.dylib.`
      );
      return {
        success: false,
        targetTriple: this.targetInfo.triple,
        diagnostics: this.diag.dapatkanPesanFormatted(),
      };
    }

    const useCrossGcc = Boolean(
      options.crossCompilerCommand &&
        options.crossCompilerCommand !== 'clang' &&
        (this.targetInfo.isCross || !this.toolchain.binaries.clang.found)
    );

    // Driver compiler (cross-gcc / clang) wajib untuk menautkan runtime.c + berkas objek;
    // lld mentah bukan driver C dan tidak menerima argumen -target / runtime.c.
    const linkerBinary = useCrossGcc
      ? options.crossCompilerCommand
      : this.toolchain.binaries.clang.found
      ? this.toolchain.binaries.clang.command
      : undefined;

    if (!linkerBinary) {
      const lldNote = this.toolchain.binaries.lld.found
        ? ` (LLD terdeteksi: ${this.toolchain.binaries.lld.command}, namun driver Clang/C tetap diperlukan untuk menautkan runtime C)`
        : '';
      this.diag.galat(
        'TOOLCHAIN_LINKER_HILANG',
        `Tidak ditemukan driver compiler/linker (clang atau cross-gcc) untuk menjalankan static linking${lldNote}.`
      );
      return {
        success: false,
        targetTriple: this.targetInfo.triple,
        diagnostics: this.diag.dapatkanPesanFormatted(),
      };
    }

    const tmpDir = safeFS.mkdtempSync(safePath.join(safeOS.tmpdir(), 'nusantara-static-link-'));
    const runtimeCPath = safePath.join(tmpDir, 'runtime.c');

    try {
      const outParent = safePath.dirname(safePath.resolve(options.outputExecutable));
      if (!safeFS.existsSync(outParent)) {
        safeFS.mkdirSync(outParent, { recursive: true });
      }

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
        args.push(`--sysroot=${options.sysroot}`);
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

      if (options.libraryPaths) {
        for (const lp of options.libraryPaths) {
          args.push(`-L${lp}`);
        }
      }

      if (options.staticLibraries) {
        for (const lib of options.staticLibraries) {
          if (lib.endsWith('.a') || lib.endsWith('.lib')) {
            args.push(lib);
          } else {
            args.push(`-l${lib}`);
          }
        }
      }

      const cmdStr = `${linkerBinary} ${args.join(' ')}`;

      // 3. Eksekusi linker
      const res = safeCP.spawnSync(linkerBinary, args, {
        encoding: 'utf-8',
        timeout: 45000,
        shell: false,
      });

      const stdoutText = (res.stdout || '').trim();
      const stderrText = (res.stderr || '').trim();

      if (res.status === 0 && safeFS.existsSync(options.outputExecutable)) {
        diagReport.push(`Static linking berhasil (${this.targetInfo.triple}): ${options.outputExecutable}`);
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
          'STATIC_LINK_GAGAL',
          `Static linking gagal untuk target '${this.targetInfo.triple}' (exit=${res.status}): ${errMsg}`
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
