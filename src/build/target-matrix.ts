/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Manajemen Matriks Target & Deteksi Cross-SDK
 * Mendukung 6 target desktop resmi:
 * windows-x86_64, windows-arm64, linux-x86_64, linux-arm64, macos-x86_64, macos-arm64.
 */

import { safeCP, safeFS } from '../compiler/llvm/node-compat';
import { DesktopTargetId, TargetTripleManager } from '../compiler/llvm/target-triple';
import { LLVMToolchainManager } from '../compiler/llvm/toolchain-manager';
import { CanonicalDesktopTarget, TargetCapability } from './types';

export const DESKTOP_CANONICAL_TARGETS: CanonicalDesktopTarget[] = [
  'windows-x86_64',
  'windows-arm64',
  'linux-x86_64',
  'linux-arm64',
  'macos-x86_64',
  'macos-arm64',
];

export const DESKTOP_LEGACY_ALIAS_MAP: Record<CanonicalDesktopTarget, string> = {
  'windows-x86_64': 'windows-x64',
  'windows-arm64': 'windows-arm64',
  'linux-x86_64': 'linux-x64',
  'linux-arm64': 'linux-arm64',
  'macos-x86_64': 'macos-x64',
  'macos-arm64': 'macos-arm64',
};

export const RUNNER_RECOMMENDATION_MAP: Record<CanonicalDesktopTarget, string> = {
  'windows-x86_64': 'windows-latest',
  'windows-arm64': 'windows-11-arm / windows-latest (+arm64 MSVC/LLVM)',
  'linux-x86_64': 'ubuntu-latest',
  'linux-arm64': 'ubuntu-24.04-arm (atau ubuntu-latest + aarch64-linux-gnu)',
  'macos-x86_64': 'macos-13 (atau macos-latest universal)',
  'macos-arm64': 'macos-latest',
};

export class TargetMatrixManager {
  public static getAllCanonicalTargets(): CanonicalDesktopTarget[] {
    return [...DESKTOP_CANONICAL_TARGETS];
  }

  public static toLegacyAlias(target: CanonicalDesktopTarget): string {
    return DESKTOP_LEGACY_ALIAS_MAP[target] || target;
  }

  public static getHostTargetId(): CanonicalDesktopTarget | undefined {
    const info = TargetTripleManager.resolve();
    return info.targetId;
  }

  public static inspectTargetCapability(
    targetInput?: string,
    options: { customToolchainPath?: string; sysrootOverride?: string } = {}
  ): TargetCapability {
    const rawInput = (targetInput || '').trim() || TargetTripleManager.getHostTriple();
    const strict = TargetTripleManager.resolveStrict(rawInput);

    if (!strict.supported || !strict.info.targetId) {
      return {
        rawInput,
        canonicalTarget: undefined,
        os: strict.info.os,
        arch: strict.info.arch,
        triple: strict.info.triple,
        targetInfo: strict.info,
        supported: false,
        isCross: false,
        toolchainAvailable: false,
        crossSdkAvailable: false,
        canBuildNative: false,
        recommendedRunner: 'TIDAK_TERSEDIA',
        missingRequirements: [
          strict.error || `Target '${rawInput}' tidak didukung oleh matriks desktop NUSANTARA.`,
        ],
        diagnostics: [
          `Target didukung: ${DESKTOP_CANONICAL_TARGETS.join(', ')} (alias: windows-x64, linux-x64, macos-x64).`,
        ],
      };
    }

    const info = strict.info;
    const canonical = info.targetId!;
    const legacyAlias = DESKTOP_LEGACY_ALIAS_MAP[canonical];
    const recommendedRunner = RUNNER_RECOMMENDATION_MAP[canonical];

    const tm = new LLVMToolchainManager(options.customToolchainPath);
    const toolchain = tm.detect();
    const toolchainAvailable = toolchain.available;

    const missingRequirements: string[] = [];
    const diagnostics: string[] = [];

    if (!toolchainAvailable) {
      missingRequirements.push('Toolchain LLVM/Clang tidak ditemukan di PATH atau NUSANTARA_LLVM_PATH.');
      diagnostics.push(...toolchain.diagnostics);
    } else {
      diagnostics.push(`Toolchain LLVM terdeteksi: ${toolchain.version || 'aktif'}`);
    }

    let crossSdkAvailable = true;
    let sysrootPath = options.sysrootOverride;
    let crossCompilerCommand: string | undefined;

    if (!info.isCross) {
      // Native host compilation
      if (info.os === 'darwin' && toolchainAvailable) {
        const sdk = this.detectMacOSSDK(options.sysrootOverride);
        if (sdk) {
          sysrootPath = sdk;
          diagnostics.push(`macOS SDK terdeteksi: ${sdk}`);
        }
      }
      if (toolchainAvailable) {
        diagnostics.push(`Target '${canonical}' cocok dengan host (${info.triple}).`);
      }
    } else {
      // Cross-compilation verification: never silently claim cross-build works without SDK/sysroot
      crossSdkAvailable = false;

      if (info.os === 'linux' && info.arch === 'aarch64') {
        const probe = this.detectLinuxArm64Cross(options.sysrootOverride);
        crossSdkAvailable = probe.available;
        sysrootPath = probe.sysroot;
        crossCompilerCommand = probe.cc;
        if (probe.available) {
          diagnostics.push(`Cross-SDK Linux ARM64 siap (cc=${probe.cc || 'clang'}, sysroot=${probe.sysroot || 'system'}).`);
        } else {
          missingRequirements.push(
            'Cross-SDK Linux ARM64 belum tersedia (pasang gcc-aarch64-linux-gnu / sysroot arm64 atau setel NUSANTARA_SYSROOT_LINUX_ARM64).'
          );
        }
      } else if (info.os === 'linux' && info.arch === 'x86_64') {
        const probe = this.detectLinuxX64Cross(options.sysrootOverride);
        crossSdkAvailable = probe.available;
        sysrootPath = probe.sysroot;
        crossCompilerCommand = probe.cc;
        if (!probe.available) {
          missingRequirements.push(
            'Cross-SDK Linux x86_64 belum tersedia di host ini (setel NUSANTARA_SYSROOT_LINUX_X64 atau gunakan runner ubuntu-latest).'
          );
        }
      } else if (info.os === 'windows') {
        const probe = this.detectWindowsCross(info.arch, options.sysrootOverride);
        crossSdkAvailable = probe.available;
        sysrootPath = probe.sysroot;
        crossCompilerCommand = probe.cc;
        if (probe.available) {
          diagnostics.push(`Cross-SDK Windows (${info.arch}) terdeteksi: ${probe.cc || probe.sysroot}`);
        } else {
          missingRequirements.push(
            `Cross-SDK Windows (${info.arch}) belum tersedia di host ${TargetTripleManager.getHostTriple()} (pasang MinGW-w64/llvm-mingw atau MSVC/Windows SDK di runner Windows).`
          );
        }
      } else if (info.os === 'darwin') {
        if (typeof process !== 'undefined' && process.platform === 'darwin') {
          // Apple Clang/LLVM on macOS natively supports -arch x86_64 and -arch arm64 against MacOSX.sdk
          const sdk = this.detectMacOSSDK(options.sysrootOverride);
          if (sdk && toolchainAvailable) {
            crossSdkAvailable = true;
            sysrootPath = sdk;
            diagnostics.push(`macOS universal cross-compile siap menggunakan SDK: ${sdk}`);
          } else {
            missingRequirements.push('macOS SDK (Xcode Command Line Tools / SDKROOT) tidak ditemukan.');
          }
        } else {
          const osxcross = options.sysrootOverride || process?.env?.OSXCROSS_ROOT || process?.env?.NUSANTARA_SYSROOT_MACOS;
          if (osxcross && safeFS.existsSync(osxcross)) {
            crossSdkAvailable = true;
            sysrootPath = osxcross;
            diagnostics.push(`OSXCross sysroot ditemukan: ${osxcross}`);
          } else {
            missingRequirements.push(
              `Cross-compile ke macOS (${info.arch}) dari ${TargetTripleManager.getHostTriple()} membutuhkan OSXCross/Apple SDK atau runner ${recommendedRunner}.`
            );
          }
        }
      }
    }

    const canBuildNative = toolchainAvailable && (!info.isCross || crossSdkAvailable);

    return {
      rawInput,
      canonicalTarget: canonical,
      legacyAlias,
      os: info.os,
      arch: info.arch,
      triple: info.triple,
      targetInfo: info,
      supported: true,
      isCross: info.isCross,
      toolchainAvailable,
      crossSdkAvailable: info.isCross ? crossSdkAvailable : toolchainAvailable,
      canBuildNative,
      sysrootPath,
      crossCompilerCommand,
      recommendedRunner,
      missingRequirements,
      diagnostics,
    };
  }

  private static commandExists(cmd: string): boolean {
    try {
      const res = safeCP.spawnSync(cmd, ['--version'], {
        encoding: 'utf-8',
        timeout: 3000,
        shell: false,
      });
      return res.status === 0;
    } catch {
      return false;
    }
  }

  private static detectMacOSSDK(override?: string): string | undefined {
    if (override && safeFS.existsSync(override)) return override;
    if (typeof process !== 'undefined' && process.env?.SDKROOT && safeFS.existsSync(process.env.SDKROOT)) {
      return process.env.SDKROOT;
    }
    if (typeof process !== 'undefined' && process.platform === 'darwin') {
      const res = safeCP.spawnSync('xcrun', ['--show-sdk-path'], {
        encoding: 'utf-8',
        timeout: 3000,
      });
      if (res.status === 0 && res.stdout.trim()) {
        return res.stdout.trim();
      }
    }
    return undefined;
  }

  private static detectLinuxArm64Cross(override?: string): { available: boolean; cc?: string; sysroot?: string } {
    if (override && safeFS.existsSync(override)) {
      return { available: true, sysroot: override };
    }
    const envSysroot = typeof process !== 'undefined' ? process.env?.NUSANTARA_SYSROOT_LINUX_ARM64 : undefined;
    if (envSysroot && safeFS.existsSync(envSysroot)) {
      return { available: true, sysroot: envSysroot };
    }
    if (this.commandExists('aarch64-linux-gnu-gcc')) {
      const sysroot = safeFS.existsSync('/usr/aarch64-linux-gnu') ? '/usr/aarch64-linux-gnu' : undefined;
      return { available: true, cc: 'aarch64-linux-gnu-gcc', sysroot };
    }
    return { available: false };
  }

  private static detectLinuxX64Cross(override?: string): { available: boolean; cc?: string; sysroot?: string } {
    if (override && safeFS.existsSync(override)) {
      return { available: true, sysroot: override };
    }
    const envSysroot = typeof process !== 'undefined' ? process.env?.NUSANTARA_SYSROOT_LINUX_X64 : undefined;
    if (envSysroot && safeFS.existsSync(envSysroot)) {
      return { available: true, sysroot: envSysroot };
    }
    if (this.commandExists('x86_64-linux-gnu-gcc')) {
      const sysroot = safeFS.existsSync('/usr/x86_64-linux-gnu') ? '/usr/x86_64-linux-gnu' : undefined;
      return { available: true, cc: 'x86_64-linux-gnu-gcc', sysroot };
    }
    return { available: false };
  }

  private static detectWindowsCross(
    arch: 'x86_64' | 'aarch64' | 'unknown',
    override?: string
  ): { available: boolean; cc?: string; sysroot?: string } {
    if (override && safeFS.existsSync(override)) {
      return { available: true, sysroot: override };
    }
    const envKey = arch === 'aarch64' ? 'NUSANTARA_SYSROOT_WINDOWS_ARM64' : 'NUSANTARA_SYSROOT_WINDOWS_X64';
    const envSysroot = typeof process !== 'undefined' ? process.env?.[envKey] : undefined;
    if (envSysroot && safeFS.existsSync(envSysroot)) {
      return { available: true, sysroot: envSysroot };
    }
    // On Windows host, clang/msvc can target both x64 and arm64 if Windows SDK / MSVC ARM64 libs are present
    if (typeof process !== 'undefined' && process.platform === 'win32') {
      const vcToolsDir = process.env?.VCToolsInstallDir;
      if (arch === 'x86_64' && this.commandExists('clang')) {
        return { available: true, cc: 'clang' };
      }
      if (arch === 'aarch64' && vcToolsDir && safeFS.existsSync(`${vcToolsDir}/lib/arm64`)) {
        return { available: true, cc: 'clang', sysroot: vcToolsDir };
      }
      return { available: false };
    }
    const mingwCmd = arch === 'aarch64' ? 'aarch64-w64-mingw32-gcc' : 'x86_64-w64-mingw32-gcc';
    if (this.commandExists(mingwCmd)) {
      return { available: true, cc: mingwCmd };
    }
    return { available: false };
  }
}
