/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA LLVM BACKEND - Object File Generator via llc / clang
 * Target Milestone: Phase 44 (v0.44.0)
 */

import { safeCP, safeFS, safeOS, safePath } from './node-compat';
import { LLVMDiagnosticsManager } from './diagnostics';
import { TargetPlatformInfo } from './target-triple';
import { LLVMToolchainStatus } from './toolchain-manager';

export interface ObjectGenerationResult {
  success: boolean;
  outputPath?: string;
  targetFormat: 'ELF' | 'Mach-O' | 'COFF';
  toolUsed?: string;
  diagnostics: string[];
}

export class ObjectGenerator {
  constructor(
    private readonly toolchain: LLVMToolchainStatus,
    private readonly targetInfo: TargetPlatformInfo,
    private readonly diag: LLVMDiagnosticsManager = new LLVMDiagnosticsManager()
  ) {}

  public generateObject(llvmIR: string, outputFilePath: string): ObjectGenerationResult {
    const targetFormat = this.targetInfo.objectFormat;

    // Coba gunakan llc terlebih dahulu
    if (this.toolchain.binaries.llc.found) {
      const llcCmd = this.toolchain.binaries.llc.command;
      const tmpDir = safeFS.mkdtempSync(safePath.join(safeOS.tmpdir(), 'nusantara-llc-'));
      const irPath = safePath.join(tmpDir, 'input.ll');

      try {
        safeFS.writeFileSync(irPath, llvmIR, 'utf-8');
        const args = [
          `-mtriple=${this.targetInfo.triple}`,
          '-filetype=obj',
          `-o=${outputFilePath}`,
          irPath,
        ];

        const res = safeCP.spawnSync(llcCmd, args, {
          encoding: 'utf-8',
          timeout: 20000,
          shell: false,
        });

        if (res.status === 0 && safeFS.existsSync(outputFilePath)) {
          return {
            success: true,
            outputPath: outputFilePath,
            targetFormat,
            toolUsed: 'llc',
            diagnostics: [`Berkas objek (${targetFormat}) berhasil dihasilkan menggunakan llc.`],
          };
        } else {
          const err = (res.stderr || res.stdout || '').trim();
          this.diag.error('LLC_ERROR', err || 'Gagal menghasilkan berkas objek via llc.');
        }
      } finally {
        try {
          safeFS.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // Abaikan
        }
      }
    }

    // Alternatif: coba gunakan clang -c
    if (this.toolchain.binaries.clang.found) {
      const clangCmd = this.toolchain.binaries.clang.command;
      const tmpDir = safeFS.mkdtempSync(safePath.join(safeOS.tmpdir(), 'nusantara-clang-obj-'));
      const irPath = safePath.join(tmpDir, 'input.ll');

      try {
        safeFS.writeFileSync(irPath, llvmIR, 'utf-8');
        const args = [
          `-target`,
          this.targetInfo.triple,
          '-c',
          irPath,
          '-o',
          outputFilePath,
        ];

        const res = safeCP.spawnSync(clangCmd, args, {
          encoding: 'utf-8',
          timeout: 20000,
          shell: false,
        });

        if (res.status === 0 && safeFS.existsSync(outputFilePath)) {
          return {
            success: true,
            outputPath: outputFilePath,
            targetFormat,
            toolUsed: 'clang',
            diagnostics: [`Berkas objek (${targetFormat}) berhasil dihasilkan menggunakan clang.`],
          };
        } else {
          const err = (res.stderr || res.stdout || '').trim();
          this.diag.error('CLANG_OBJ_ERROR', err || 'Gagal menghasilkan berkas objek via clang.');
          return {
            success: false,
            targetFormat,
            diagnostics: [
              `Gagal menghasilkan berkas objek via clang: ${err || 'galat tidak diketahui'}`,
            ],
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

    return {
      success: false,
      targetFormat,
      diagnostics: [
        `Gagal menghasilkan berkas objek native: Toolchain LLVM (llc atau clang) tidak ditemukan.`,
      ],
    };
  }
}
