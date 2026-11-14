/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA LLVM BACKEND - Konfigurasi Target Triple dan Data Layout
 * Target Milestone: Phase 44 (v0.44.0)
 */

export type DesktopTargetId =
  | 'windows-x86_64'
  | 'windows-arm64'
  | 'linux-x86_64'
  | 'linux-arm64'
  | 'macos-x86_64'
  | 'macos-arm64';

export interface TargetPlatformInfo {
  triple: string;
  dataLayout: string;
  os: 'windows' | 'linux' | 'darwin' | 'unknown';
  arch: 'x86_64' | 'aarch64' | 'unknown';
  objectFormat: 'ELF' | 'Mach-O' | 'COFF';
  executableExtension: string;
  objectExtension: string;
  isCross: boolean;
  isSupported?: boolean;
  targetId?: DesktopTargetId;
}

const TARGET_ALIAS_MAP: Record<string, { targetId: DesktopTargetId; triple: string }> = {
  'windows-x86_64': { targetId: 'windows-x86_64', triple: 'x86_64-pc-windows-msvc' },
  'windows-x64': { targetId: 'windows-x86_64', triple: 'x86_64-pc-windows-msvc' },
  'windows-arm64': { targetId: 'windows-arm64', triple: 'aarch64-pc-windows-msvc' },
  'windows-aarch64': { targetId: 'windows-arm64', triple: 'aarch64-pc-windows-msvc' },
  'linux-x86_64': { targetId: 'linux-x86_64', triple: 'x86_64-unknown-linux-gnu' },
  'linux-x64': { targetId: 'linux-x86_64', triple: 'x86_64-unknown-linux-gnu' },
  'linux-arm64': { targetId: 'linux-arm64', triple: 'aarch64-unknown-linux-gnu' },
  'linux-aarch64': { targetId: 'linux-arm64', triple: 'aarch64-unknown-linux-gnu' },
  'macos-x86_64': { targetId: 'macos-x86_64', triple: 'x86_64-apple-darwin' },
  'macos-x64': { targetId: 'macos-x86_64', triple: 'x86_64-apple-darwin' },
  'darwin-x86_64': { targetId: 'macos-x86_64', triple: 'x86_64-apple-darwin' },
  'macos-arm64': { targetId: 'macos-arm64', triple: 'arm64-apple-darwin' },
  'macos-aarch64': { targetId: 'macos-arm64', triple: 'arm64-apple-darwin' },
  'darwin-arm64': { targetId: 'macos-arm64', triple: 'arm64-apple-darwin' },
};

export class TargetTripleManager {
  // Preset data layout resmi LLVM
  public static readonly LAYOUT_X86_64_LINUX =
    'e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128';
  public static readonly LAYOUT_X86_64_DARWIN =
    'e-m:o-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128';
  public static readonly LAYOUT_X86_64_WINDOWS =
    'e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128';
  public static readonly LAYOUT_AARCH64_WINDOWS =
    'e-m:w-p:64:64-i32:32-i64:64-i128:128-n32:64-S128';
  public static readonly LAYOUT_AARCH64_LINUX =
    'e-m:e-i8:8:32-i16:16:32-i64:64-i128:128-n32:64-S128';
  public static readonly LAYOUT_AARCH64_DARWIN =
    'e-m:o-i64:64-i128:128-n32:64-S128';

  public static getHostTriple(): string {
    const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
    if (process.platform === 'win32') {
      return `${arch}-pc-windows-msvc`;
    } else if (process.platform === 'darwin') {
      return `${arch === 'aarch64' ? 'arm64' : 'x86_64'}-apple-darwin`;
    } else {
      return `${arch}-unknown-linux-gnu`;
    }
  }

  public static resolve(targetTripleStr?: string): TargetPlatformInfo {
    const hostTriple = this.getHostTriple();
    const rawInput = targetTripleStr && targetTripleStr.trim() !== '' ? targetTripleStr.trim() : hostTriple;
    const aliasEntry = TARGET_ALIAS_MAP[rawInput.toLowerCase()];
    const triple = aliasEntry ? aliasEntry.triple : rawInput;
    const isCross = this.normalizeTripleKey(triple) !== this.normalizeTripleKey(hostTriple);

    let os: TargetPlatformInfo['os'] = 'unknown';
    let arch: TargetPlatformInfo['arch'] = 'unknown';
    let objectFormat: TargetPlatformInfo['objectFormat'] = 'ELF';
    let executableExtension = '';
    let objectExtension = '.o';
    let dataLayout = this.LAYOUT_X86_64_LINUX;

    const lower = triple.toLowerCase();

    if (lower.includes('x86_64') || lower.includes('amd64') || lower.includes('-x64')) {
      arch = 'x86_64';
    } else if (lower.includes('aarch64') || lower.includes('arm64')) {
      arch = 'aarch64';
    }

    if (lower.includes('linux')) {
      os = 'linux';
      objectFormat = 'ELF';
      executableExtension = '';
      objectExtension = '.o';
      dataLayout = arch === 'aarch64' ? this.LAYOUT_AARCH64_LINUX : this.LAYOUT_X86_64_LINUX;
    } else if (lower.includes('darwin') || lower.includes('apple') || lower.includes('macos')) {
      os = 'darwin';
      objectFormat = 'Mach-O';
      executableExtension = '';
      objectExtension = '.o';
      dataLayout = arch === 'aarch64' ? this.LAYOUT_AARCH64_DARWIN : this.LAYOUT_X86_64_DARWIN;
    } else if (lower.includes('windows') || lower.includes('win32')) {
      os = 'windows';
      objectFormat = 'COFF';
      executableExtension = '.exe';
      objectExtension = '.obj';
      dataLayout = arch === 'aarch64' ? this.LAYOUT_AARCH64_WINDOWS : this.LAYOUT_X86_64_WINDOWS;
    }

    const isSupported = os !== 'unknown' && arch !== 'unknown';
    let targetId: DesktopTargetId | undefined = aliasEntry?.targetId;
    if (!targetId && isSupported) {
      const osKey = os === 'darwin' ? 'macos' : os;
      const archKey = arch === 'aarch64' ? 'arm64' : 'x86_64';
      targetId = `${osKey}-${archKey}` as DesktopTargetId;
    }

    return {
      triple,
      dataLayout,
      os,
      arch,
      objectFormat,
      executableExtension,
      objectExtension,
      isCross,
      isSupported,
      targetId,
    };
  }

  public static resolveStrict(targetOrTriple?: string): {
    supported: boolean;
    info: TargetPlatformInfo;
    error?: string;
  } {
    if (targetOrTriple !== undefined && targetOrTriple.trim() === '') {
      const fallback = this.resolve('unknown-unknown-unknown');
      return {
        supported: false,
        info: fallback,
        error: 'Target tidak boleh kosong. Target desktop resmi: windows-x86_64, windows-arm64, linux-x86_64, linux-arm64, macos-x86_64, macos-arm64.',
      };
    }
    const info = this.resolve(targetOrTriple);
    if (!info.isSupported) {
      return {
        supported: false,
        info,
        error: `Target atau arsitektur tidak didukung: '${targetOrTriple}' (OS=${info.os}, Arch=${info.arch}). Target desktop resmi: windows-x86_64, windows-arm64, linux-x86_64, linux-arm64, macos-x86_64, macos-arm64.`,
      };
    }
    return { supported: true, info };
  }

  private static normalizeTripleKey(triple: string): string {
    return triple.toLowerCase().replace('arm64-apple-darwin', 'aarch64-apple-darwin');
  }
}
