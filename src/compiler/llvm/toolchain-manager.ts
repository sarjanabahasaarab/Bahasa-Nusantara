/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA LLVM BACKEND - Manajemen Toolchain LLVM
 * Target Milestone: Phase 44 (v0.44.0)
 */

import { safeCP, safeFS, safePath } from './node-compat';

export interface LLVMToolchainBinary {
  name: string;
  command: string;
  found: boolean;
  path?: string;
  version?: string;
}

export interface LLVMToolchainStatus {
  available: boolean;
  version?: string;
  majorVersion?: number;
  useOpaquePointers: boolean;
  binaries: {
    clang: LLVMToolchainBinary;
    llc: LLVMToolchainBinary;
    opt: LLVMToolchainBinary;
    llvmAs: LLVMToolchainBinary;
    llvmDis: LLVMToolchainBinary;
    llvmObjdump: LLVMToolchainBinary;
    lld: LLVMToolchainBinary;
  };
  customPath?: string;
  diagnostics: string[];
}

export class LLVMToolchainManager {
  private customBinDir?: string;

  constructor(customBinDir?: string) {
    this.customBinDir = customBinDir || process.env.NUSANTARA_LLVM_PATH || process.env.LLVM_PATH;
  }

  public setCustomPath(binDir: string): void {
    this.customBinDir = binDir;
  }

  public detect(): LLVMToolchainStatus {
    const binaries = {
      clang: this.checkBinary('clang'),
      llc: this.checkBinary('llc'),
      opt: this.checkBinary('opt'),
      llvmAs: this.checkBinary('llvm-as'),
      llvmDis: this.checkBinary('llvm-dis'),
      llvmObjdump: this.checkBinary('llvm-objdump'),
      lld: this.checkBinary('lld'),
    };

    const diagnostics: string[] = [];
    const mainFound = binaries.clang.found || binaries.llc.found || binaries.llvmAs.found;

    let versionStr: string | undefined;
    let majorVersion: number | undefined;

    // Ambil versi dari clang atau llc
    const versionSource = binaries.clang.found ? binaries.clang : binaries.llc.found ? binaries.llc : undefined;
    if (versionSource && versionSource.version) {
      versionStr = versionSource.version;
      const match = versionStr.match(/version\s+([0-9]+)\.([0-9]+)/i);
      if (match) {
        majorVersion = parseInt(match[1], 10);
      }
    }

    // LLVM >= 15 default ke opaque pointers
    const useOpaquePointers = majorVersion !== undefined ? majorVersion >= 15 : true;

    if (!mainFound) {
      diagnostics.push(
        'Toolchain LLVM tidak ditemukan di sistem PATH atau direktori yang dikonfigurasi.'
      );
      diagnostics.push(
        'Untuk mengompilasi biner native langsung dari Nusantara, silakan pasang LLVM Toolchain:'
      );
      diagnostics.push('  - Ubuntu/Debian : sudo apt install clang lld llvm');
      diagnostics.push('  - Fedora/RHEL   : sudo dnf install clang lld llvm');
      diagnostics.push('  - macOS (Homebrew): brew install llvm');
      diagnostics.push('  - Windows       : winget install LLVM.LLVM atau pasang dari LLVM Releases');
      diagnostics.push(
        'Atau konfigurasikan lokasi LLVM menggunakan NUSANTARA_LLVM_PATH="/path/to/llvm/bin".'
      );
    } else {
      diagnostics.push(
        `Toolchain LLVM terdeteksi (versi: ${versionStr || 'tidak diketahui'}, Mayor: ${majorVersion || 'N/A'}).`
      );
    }

    return {
      available: mainFound,
      version: versionStr,
      majorVersion,
      useOpaquePointers,
      binaries,
      customPath: this.customBinDir,
      diagnostics,
    };
  }

  private checkBinary(tool: string): LLVMToolchainBinary {
    const candidatePaths: string[] = [];

    if (this.customBinDir) {
      candidatePaths.push(safePath.join(this.customBinDir, tool));
      if (typeof process !== 'undefined' && process.platform === 'win32') {
        candidatePaths.push(safePath.join(this.customBinDir, `${tool}.exe`));
      }
    } else {
      // Default PATH, hanya jika jalur kustom tidak dikonfigurasi
      candidatePaths.push(tool);
    }

    for (const p of candidatePaths) {
      try {
        const res = safeCP.spawnSync(p, ['--version'], {
          encoding: 'utf-8',
          timeout: 4000,
          shell: false,
        });

        if (res.status === 0 && res.stdout) {
          const firstLine = res.stdout.split('\n')[0].trim();
          return {
            name: tool,
            command: p,
            found: true,
            path: p.includes('/') || p.includes('\\') ? safePath.resolve(p) : p,
            version: firstLine,
          };
        }
      } catch {
        // Abaikan kegagalan
      }
    }

    return {
      name: tool,
      command: tool,
      found: false,
    };
  }

  public static detectToolchain(customBinDir?: string): LLVMToolchainStatus {
    return new LLVMToolchainManager(customBinDir).detect();
  }
}
