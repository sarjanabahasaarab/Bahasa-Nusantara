/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Manajemen Matriks Target & Deteksi Cross-SDK
 * Mendukung 6 target desktop resmi:
 * windows-x86_64, windows-arm64, linux-x86_64, linux-arm64, macos-x86_64, macos-arm64.
 */

import { BinaryInspector } from '../compiler/executable/binary-inspector';
import { safeCP, safeFS, safeOS, safePath } from '../compiler/llvm/node-compat';
import { TargetTripleManager } from '../compiler/llvm/target-triple';
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
  'windows-arm64': 'windows-11-arm / windows-latest (+arm64 MSVC CRT & Windows SDK)',
  'linux-x86_64': 'ubuntu-latest',
  'linux-arm64': 'ubuntu-24.04-arm (atau ubuntu-latest + aarch64-linux-gnu + qemu-user-static)',
  'macos-x86_64': 'macos-15-intel / macos-13 (atau macos-latest + Rosetta 2)',
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
    let sdkName: string | undefined;
    let linkerProbeVerified: boolean | undefined;
    let crossCompilerCommand: string | undefined;
    let extraLibraryPaths: string[] | undefined;

    if (!info.isCross) {
      // Native host compilation
      if (info.os === 'darwin' && toolchainAvailable) {
        const sdk = this.detectMacOSSDK(options.sysrootOverride);
        if (sdk) {
          sysrootPath = sdk;
          sdkName = 'MacOSX.sdk';
          diagnostics.push(`macOS SDK terdeteksi: ${sdk}`);
        }
      } else if (info.os === 'windows') {
        sdkName = 'MSVC + Windows SDK';
      } else if (info.os === 'linux') {
        sdkName = 'System GNU libc / ld.so';
      }
      if (toolchainAvailable) {
        linkerProbeVerified = true;
        diagnostics.push(`Target '${canonical}' cocok dengan host (${info.triple}).`);
      }
    } else {
      // Cross-compilation verification: never silently claim cross-build works without SDK/sysroot
      crossSdkAvailable = false;

      if (info.os === 'linux' && info.arch === 'aarch64') {
        const probe = this.detectLinuxArm64Cross(options.sysrootOverride);
        crossSdkAvailable = probe.available;
        sysrootPath = probe.sysroot;
        sdkName = probe.available ? 'aarch64-linux-gnu glibc sysroot' : 'aarch64-linux-gnu (missing)';
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
        sdkName = probe.available ? 'x86_64-linux-gnu sysroot' : 'x86_64-linux-gnu (missing)';
        crossCompilerCommand = probe.cc;
        if (!probe.available) {
          missingRequirements.push(
            'Cross-SDK Linux x86_64 belum tersedia di host ini (setel NUSANTARA_SYSROOT_LINUX_X64 atau gunakan runner ubuntu-latest).'
          );
        }
      } else if (info.os === 'windows') {
        const probe = this.detectWindowsCross(info.arch, {
          override: options.sysrootOverride,
          clangCommand: toolchain.binaries.clang.found ? toolchain.binaries.clang.command : undefined,
        });
        crossSdkAvailable = probe.available;
        sysrootPath = probe.sysroot;
        sdkName = probe.sdkName || `Windows ${info.arch} SDK`;
        linkerProbeVerified = probe.linkerProbeVerified;
        crossCompilerCommand = probe.cc;
        extraLibraryPaths = probe.libraryPaths;
        if (probe.diagnostics.length > 0) {
          diagnostics.push(...probe.diagnostics);
        }
        if (probe.available) {
          diagnostics.push(`Cross-SDK Windows (${info.arch}) tervalidasi: ${probe.cc || probe.sysroot}`);
        } else {
          missingRequirements.push(...probe.missingRequirements);
        }
      } else if (info.os === 'darwin') {
        if (typeof process !== 'undefined' && process.platform === 'darwin') {
          // Apple Clang/LLVM on macOS natively supports -arch x86_64 and -arch arm64 against MacOSX.sdk
          const sdk = this.detectMacOSSDK(options.sysrootOverride);
          if (sdk && toolchainAvailable) {
            crossSdkAvailable = true;
            sysrootPath = sdk;
            sdkName = 'MacOSX.sdk (universal)';
            linkerProbeVerified = true;
            diagnostics.push(`macOS universal cross-compile siap menggunakan SDK: ${sdk}`);
          } else {
            sdkName = 'MacOSX.sdk (missing)';
            missingRequirements.push('macOS SDK (Xcode Command Line Tools / SDKROOT) tidak ditemukan.');
          }
        } else {
          const osxcross = options.sysrootOverride || process?.env?.OSXCROSS_ROOT || process?.env?.NUSANTARA_SYSROOT_MACOS;
          if (osxcross && safeFS.existsSync(osxcross)) {
            crossSdkAvailable = true;
            sysrootPath = osxcross;
            sdkName = 'OSXCross SDK';
            diagnostics.push(`OSXCross sysroot ditemukan: ${osxcross}`);
          } else {
            sdkName = 'Apple SDK / OSXCross (missing)';
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
      sdkName,
      linkerProbeVerified,
      crossCompilerCommand,
      extraLibraryPaths,
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
    options: { override?: string; clangCommand?: string } = {}
  ): {
    available: boolean;
    cc?: string;
    sysroot?: string;
    sdkName?: string;
    linkerProbeVerified?: boolean;
    libraryPaths?: string[];
    missingRequirements: string[];
    diagnostics: string[];
  } {
    const missingRequirements: string[] = [];
    const diagnostics: string[] = [];

    if (options.override && safeFS.existsSync(options.override)) {
      return {
        available: true,
        sysroot: options.override,
        sdkName: 'Custom Windows Sysroot',
        missingRequirements,
        diagnostics,
      };
    }
    const envKey = arch === 'aarch64' ? 'NUSANTARA_SYSROOT_WINDOWS_ARM64' : 'NUSANTARA_SYSROOT_WINDOWS_X64';
    const envSysroot = typeof process !== 'undefined' ? process.env?.[envKey] : undefined;
    if (envSysroot && safeFS.existsSync(envSysroot)) {
      return {
        available: true,
        sysroot: envSysroot,
        sdkName: `Custom ${envKey}`,
        missingRequirements,
        diagnostics,
      };
    }

    // On Windows host, clang/msvc can target arm64 ONLY if BOTH MSVC ARM64 libs AND Windows SDK arm64 libs exist AND real linker probe succeeds
    if (typeof process !== 'undefined' && process.platform === 'win32') {
      const clangCmd = options.clangCommand || (this.commandExists('clang') ? 'clang' : undefined);
      if (arch === 'x86_64' && clangCmd) {
        return {
          available: true,
          cc: clangCmd,
          sdkName: 'MSVC + Windows SDK x64',
          linkerProbeVerified: true,
          missingRequirements,
          diagnostics,
        };
      }

      if (arch === 'aarch64') {
        const vcToolsDir = process.env?.VCToolsInstallDir;
        const winSdkDir =
          process.env?.WindowsSdkDir ||
          (safeFS.existsSync('C:\\Program Files (x86)\\Windows Kits\\10')
            ? 'C:\\Program Files (x86)\\Windows Kits\\10'
            : undefined);
        const discoveredLibPaths: string[] = [];

        const vcArm64Dir = vcToolsDir ? safePath.join(vcToolsDir, 'lib', 'arm64') : undefined;
        const hasVcArm64Crt = Boolean(
          vcArm64Dir &&
            (safeFS.existsSync(safePath.join(vcArm64Dir, 'libcmt.lib')) ||
              safeFS.existsSync(safePath.join(vcArm64Dir, 'msvcrt.lib')))
        );
        if (vcArm64Dir && hasVcArm64Crt) {
          discoveredLibPaths.push(vcArm64Dir);
        } else {
          missingRequirements.push(
            'MSVC ARM64 C runtime libraries (VCToolsInstallDir/lib/arm64/libcmt.lib atau msvcrt.lib) tidak ditemukan.'
          );
        }

        let hasSdkUmArm64 = false;
        let hasSdkUcrtArm64 = false;
        if (winSdkDir && safeFS.existsSync(safePath.join(winSdkDir, 'Lib'))) {
          const libBase = safePath.join(winSdkDir, 'Lib');
          const verCandidates = safeFS
            .readdirSync(libBase)
            .filter((v) => v.startsWith('10.'))
            .sort()
            .reverse();
          for (const ver of verCandidates) {
            const umDir = safePath.join(libBase, ver, 'um', 'arm64');
            const ucrtDir = safePath.join(libBase, ver, 'ucrt', 'arm64');
            if (!hasSdkUmArm64 && safeFS.existsSync(safePath.join(umDir, 'kernel32.lib'))) {
              hasSdkUmArm64 = true;
              discoveredLibPaths.push(umDir);
            }
            if (!hasSdkUcrtArm64 && safeFS.existsSync(safePath.join(ucrtDir, 'libucrt.lib'))) {
              hasSdkUcrtArm64 = true;
              discoveredLibPaths.push(ucrtDir);
            }
            if (hasSdkUmArm64 && hasSdkUcrtArm64) break;
          }
        }
        if (!hasSdkUmArm64) {
          missingRequirements.push('Windows SDK ARM64 library (Lib/*/um/arm64/kernel32.lib) tidak ditemukan.');
        }
        if (!hasSdkUcrtArm64) {
          missingRequirements.push('Windows UCRT ARM64 library (Lib/*/ucrt/arm64/libucrt.lib) tidak ditemukan.');
        }

        if (!clangCmd) {
          missingRequirements.push('Clang driver untuk aarch64-pc-windows-msvc tidak ditemukan.');
        }

        // Buktikan dengan link probe nyata — jangan hanya mengandalkan keberadaan folder!
        if (clangCmd && discoveredLibPaths.length > 0 && missingRequirements.length === 0) {
          const probe = this.probeWindowsArm64Link(clangCmd, discoveredLibPaths);
          if (probe.verified) {
            diagnostics.push('Probe link nyata clang aarch64-pc-windows-msvc berhasil menghasilkan PE32+ ARM64.');
            return {
              available: true,
              cc: clangCmd,
              sysroot: vcToolsDir || winSdkDir,
              sdkName: 'MSVC ARM64 CRT + Windows SDK 10 ARM64',
              linkerProbeVerified: true,
              libraryPaths: discoveredLibPaths,
              missingRequirements,
              diagnostics,
            };
          }
          missingRequirements.push(`Probe linker Windows ARM64 gagal: ${probe.reason}`);
          diagnostics.push(`Detail kegagalan linker probe ARM64: ${probe.reason}`);
          return {
            available: false,
            sdkName: 'MSVC/Windows SDK ARM64 (linker probe gagal)',
            linkerProbeVerified: false,
            missingRequirements,
            diagnostics,
          };
        }

        diagnostics.push(
          'Windows ARM64 belum dapat di-link pada runner ini karena MSVC ARM64 CRT dan/atau Windows SDK ARM64 tidak lengkap.'
        );
        return {
          available: false,
          sdkName: 'MSVC/Windows SDK ARM64 (tidak lengkap)',
          linkerProbeVerified: false,
          missingRequirements,
          diagnostics,
        };
      }

      missingRequirements.push(`Cross-SDK Windows (${arch}) tidak tersedia di host Windows.`);
      return { available: false, sdkName: 'Windows SDK (missing)', missingRequirements, diagnostics };
    }

    const mingwCmd = arch === 'aarch64' ? 'aarch64-w64-mingw32-gcc' : 'x86_64-w64-mingw32-gcc';
    if (this.commandExists(mingwCmd)) {
      return {
        available: true,
        cc: mingwCmd,
        sdkName: `MinGW-w64 (${mingwCmd})`,
        linkerProbeVerified: true,
        missingRequirements,
        diagnostics,
      };
    }

    missingRequirements.push(
      `Cross-SDK Windows (${arch}) belum tersedia di host ${TargetTripleManager.getHostTriple()} (pasang MinGW-w64/llvm-mingw atau MSVC + Windows SDK ARM64 di runner Windows/windows-11-arm).`
    );
    return {
      available: false,
      sdkName: `Windows ${arch} SDK (missing)`,
      linkerProbeVerified: false,
      missingRequirements,
      diagnostics,
    };
  }

  private static probeWindowsArm64Link(
    clangCmd: string,
    libraryPaths: string[]
  ): { verified: boolean; reason: string } {
    const tmpDir = safeFS.mkdtempSync(safePath.join(safeOS.tmpdir(), 'nusa-win-arm64-probe-'));
    try {
      const cFile = safePath.join(tmpDir, 'probe.c');
      const exeFile = safePath.join(tmpDir, 'probe.exe');
      safeFS.writeFileSync(cFile, 'int main(void) { return 0; }\n', 'utf-8');

      const args = ['-target', 'aarch64-pc-windows-msvc', '-fuse-ld=lld', cFile, '-o', exeFile];
      for (const lp of libraryPaths) {
        args.push('-L', lp);
      }

      const res = safeCP.spawnSync(clangCmd, args, {
        encoding: 'utf-8',
        timeout: 20000,
        shell: false,
      });

      if (res.status !== 0 || !safeFS.existsSync(exeFile)) {
        const msg = (res.stderr || res.stdout || res.error?.message || `exit=${res.status}`).trim();
        return { verified: false, reason: msg.slice(0, 500) };
      }

      const meta = BinaryInspector.inspectStrict(exeFile);
      if (!meta.isValidExecutable || meta.format !== 'COFF' || meta.architecture !== 'aarch64') {
        return {
          verified: false,
          reason: `Output probe bukan PE32+ aarch64 sah (format=${meta.format}, arch=${meta.architecture}, valid=${meta.isValidExecutable})`,
        };
      }

      return { verified: true, reason: 'PE32+ aarch64 valid' };
    } catch (err: any) {
      return { verified: false, reason: err?.message || String(err) };
    } finally {
      try {
        safeFS.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // abaikan
      }
    }
  }
}
