/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA TARGET MATRIX MANAGER (Phase 23)
 * Resolusi 6 Target Desktop Kanonik, Preflight Sysroot/SDK, Probe Linker & Deteksi Emulator
 */

import { safeCP, safeFS, safeOS, safePath } from '../compiler/llvm/node-compat';
import { TargetTripleManager } from '../compiler/llvm/target-triple';
import { LLVMToolchainManager } from '../compiler/llvm/toolchain-manager';
import {
  CanonicalDesktopTarget,
  DESKTOP_CANONICAL_TARGETS,
  TargetCapabilityReport,
} from './types';

export { DESKTOP_CANONICAL_TARGETS };

const CANONICAL_TO_LEGACY: Record<CanonicalDesktopTarget, string> = {
  'windows-x86_64': 'windows-x64',
  'windows-arm64': 'windows-arm64',
  'linux-x86_64': 'linux-x64',
  'linux-arm64': 'linux-arm64',
  'macos-x86_64': 'macos-x64',
  'macos-arm64': 'macos-arm64',
};

const RECOMMENDED_RUNNER: Record<CanonicalDesktopTarget, string> = {
  'windows-x86_64': 'windows-latest',
  'windows-arm64': 'windows-11-arm',
  'linux-x86_64': 'ubuntu-latest',
  'linux-arm64': 'ubuntu-24.04-arm',
  'macos-x86_64': 'macos-latest',
  'macos-arm64': 'macos-latest',
};

function probeTool(bin: string, args: string[] = ['--version']): { available: boolean; version: string } {
  try {
    const res = safeCP.spawnSync(bin, args, { encoding: 'utf-8', timeout: 3000, shell: false });
    if (!res.error && res.status === 0) {
      const firstLine = (res.stdout || res.stderr || '').trim().split(/\r?\n/)[0] || 'available';
      return { available: true, version: firstLine.trim() };
    }
  } catch {
    // Abaikan jika tidak terpasang
  }
  return { available: false, version: '' };
}

function checkLinuxX64Sysroot(): { available: boolean; missing: string[] } {
  const missing: string[] = [];
  const hasStdio =
    safeFS.existsSync('/usr/include/stdio.h') ||
    safeFS.existsSync('/usr/local/include/stdio.h');
  if (!hasStdio) {
    missing.push("Header standar C 'stdio.h' tidak ditemukan (pasang build-essential & libc6-dev).");
  }
  const hasCrt =
    safeFS.existsSync('/usr/lib/x86_64-linux-gnu/crt1.o') ||
    safeFS.existsSync('/usr/lib64/crt1.o') ||
    safeFS.existsSync('/usr/lib/crt1.o');
  if (!hasCrt) {
    missing.push('C runtime startup/libc (x86_64-linux-gnu: crt1.o/libc.so) tidak ditemukan (pasang libc6-dev).');
  }
  return { available: missing.length === 0, missing };
}

function checkLinuxArm64Sysroot(hostArch: string): { available: boolean; missing: string[]; crossGcc: boolean } {
  const missing: string[] = [];
  if (hostArch === 'arm64' || hostArch === 'aarch64') {
    const hasStdio = safeFS.existsSync('/usr/include/stdio.h');
    const hasCrt =
      safeFS.existsSync('/usr/lib/aarch64-linux-gnu/crt1.o') ||
      safeFS.existsSync('/usr/lib64/crt1.o') ||
      safeFS.existsSync('/usr/lib/crt1.o');
    if (!hasStdio) missing.push("Header standar C 'stdio.h' ARM64 tidak ditemukan (pasang libc6-dev).");
    if (!hasCrt) missing.push('C runtime startup ARM64 (crt1.o) tidak ditemukan (pasang libc6-dev).');
    return { available: missing.length === 0, missing, crossGcc: false };
  }
  const crossGcc = probeTool('aarch64-linux-gnu-gcc', ['--version']).available;
  const hasCrossHeader = safeFS.existsSync('/usr/aarch64-linux-gnu/include/stdio.h');
  if (!hasCrossHeader) {
    missing.push('libc6-dev-arm64-cross (/usr/aarch64-linux-gnu/include/stdio.h & CRT) tidak ditemukan.');
  }
  return { available: missing.length === 0 && crossGcc, missing, crossGcc };
}

function checkMacOSSysroot(): { available: boolean; sdkPath?: string; missing: string[] } {
  const res = safeCP.spawnSync('xcrun', ['--show-sdk-path'], { encoding: 'utf-8', timeout: 3000, shell: false });
  if (!res.error && res.status === 0 && res.stdout.trim()) {
    return { available: true, sdkPath: res.stdout.trim(), missing: [] };
  }
  return {
    available: false,
    missing: ['Apple MacOSX.sdk / Xcode Command Line Tools tidak ditemukan (wajib runner macos-latest).'],
  };
}

function checkWindowsMsvcSysroot(targetArch: 'x86_64' | 'aarch64'): {
  available: boolean;
  linkerProbeVerified: boolean;
  missing: string[];
} {
  const hostPlatform = safeOS.platform();
  if (hostPlatform !== 'win32') {
    return {
      available: false,
      linkerProbeVerified: false,
      missing: [
        'MSVC CRT (libcmt.lib/msvcrt.lib) & Windows SDK (kernel32.lib/ucrt.lib) tidak tersedia di host non-Windows.',
      ],
    };
  }
  const libEnv = (typeof process !== 'undefined' && process.env?.LIB) || '';
  const archFolder = targetArch === 'aarch64' ? 'arm64' : 'x64';
  const hasLibPath = libEnv
    .split(';')
    .filter(Boolean)
    .some(
      (dir) =>
        dir.toLowerCase().includes(archFolder) &&
        (safeFS.existsSync(safePath.join(dir, 'libcmt.lib')) ||
          safeFS.existsSync(safePath.join(dir, 'msvcrt.lib')) ||
          safeFS.existsSync(safePath.join(dir, 'kernel32.lib')))
    );

  // Periksa pula lokasi instalasi standar Visual Studio Build Tools bila env LIB belum diekspor
  const vcInstallDir = (typeof process !== 'undefined' && process.env?.VCToolsInstallDir) || '';
  const hasVcArchLib =
    Boolean(vcInstallDir) &&
    safeFS.existsSync(safePath.join(vcInstallDir, 'lib', archFolder, 'libcmt.lib'));

  if (hasLibPath || hasVcArchLib) {
    return { available: true, linkerProbeVerified: true, missing: [] };
  }

  return {
    available: false,
    linkerProbeVerified: false,
    missing: [
      `Pustaka MSVC CRT & Windows SDK untuk arsitektur ${archFolder} tidak ditemukan pada variabel LIB/VCToolsInstallDir.`,
    ],
  };
}

export class TargetMatrixManager {
  public static getAllCanonicalTargets(): CanonicalDesktopTarget[] {
    return [...DESKTOP_CANONICAL_TARGETS];
  }

  public static toLegacyTargetName(target: string): string {
    const resolved = TargetTripleManager.resolve(target);
    if (resolved.targetId && CANONICAL_TO_LEGACY[resolved.targetId as CanonicalDesktopTarget]) {
      return CANONICAL_TO_LEGACY[resolved.targetId as CanonicalDesktopTarget];
    }
    return target;
  }

  public static getHostTargetId(): CanonicalDesktopTarget | null {
    const plat = safeOS.platform();
    const arch = safeOS.arch();
    const isArm = arch === 'arm64' || arch === 'aarch64';
    if (plat === 'win32') return isArm ? 'windows-arm64' : 'windows-x86_64';
    if (plat === 'darwin') return isArm ? 'macos-arm64' : 'macos-x86_64';
    if (plat === 'linux') return isArm ? 'linux-arm64' : 'linux-x86_64';
    return null;
  }

  public static inspectTargetCapability(
    targetOrTriple?: string,
    customToolchainPath?: string
  ): TargetCapabilityReport {
    const strict = TargetTripleManager.resolveStrict(targetOrTriple);
    const info = strict.info;
    const canonical = info.targetId as CanonicalDesktopTarget | undefined;
    const legacyTargetName = canonical ? CANONICAL_TO_LEGACY[canonical] : targetOrTriple || 'unknown';

    if (!strict.supported || !canonical) {
      return {
        canonicalTarget: undefined,
        legacyTargetName,
        triple: info.triple,
        os: info.os,
        arch: info.arch,
        objectFormat: info.objectFormat,
        executableExtension: info.executableExtension,
        isCross: info.isCross,
        supported: false,
        canCompileAndLink: false,
        recommendedRunner: 'ubuntu-latest',
        sdkName: 'unknown',
        sdkAvailable: false,
        linkerProbeVerified: false,
        compilerName: 'none',
        compilerAvailable: false,
        compilerVersion: '',
        compilerCommand: 'clang',
        linkerName: 'none',
        linkerAvailable: false,
        linkerVersion: '',
        lldAvailable: false,
        emulatorAvailable: false,
        missingRequirements: [strict.error || `Target tidak didukung: '${targetOrTriple}'`],
        diagnostics: [strict.error || `Target tidak didukung: '${targetOrTriple}'`],
      };
    }

    const hostOS = safeOS.platform();
    const hostArch = safeOS.arch();
    const toolchain = new LLVMToolchainManager(customToolchainPath).detect();
    const clangProbe = toolchain.binaries?.clang?.found
      ? { available: true, version: toolchain.binaries.clang.version || toolchain.version || 'clang' }
      : probeTool('clang', ['--version']);
    const lldProbe = toolchain.binaries?.lld?.found
      ? { available: true, version: toolchain.binaries.lld.version || 'ld.lld' }
      : probeTool('ld.lld', ['--version']);

    const missing: string[] = [];
    const diagnostics: string[] = [];

    let sdkName = 'System SDK';
    let sdkAvailable = false;
    let linkerProbeVerified = false;
    let linkerName = lldProbe.available ? 'lld' : clangProbe.available ? 'clang' : 'none';
    let linkerAvailable = lldProbe.available || clangProbe.available;
    let linkerVersion = lldProbe.version || clangProbe.version;
    let emulatorAvailable = false;
    let emulatorName: string | undefined;

    if (info.os === 'linux' && info.arch === 'x86_64') {
      sdkName = 'GNU/glibc x86_64 (libc6-dev)';
      if (!clangProbe.available) {
        missing.push('clang (driver compiler + linker C runtime) tidak ditemukan di PATH.');
      }
      if (hostOS === 'linux' && (hostArch === 'x64' || hostArch === 'x86_64')) {
        const sys = checkLinuxX64Sysroot();
        sdkAvailable = sys.available;
        linkerProbeVerified = sys.available && clangProbe.available;
        missing.push(...sys.missing);
      } else {
        sdkAvailable = false;
        missing.push('Cross-compilation linux-x86_64 memerlukan glibc x86_64 sysroot (disarankan runner ubuntu-latest).');
      }
    } else if (info.os === 'linux' && info.arch === 'aarch64') {
      sdkName = 'GNU/glibc AArch64 (libc6-dev-arm64-cross)';
      if (!clangProbe.available) {
        missing.push('llvm / clang (objek generator) tidak tersedia.');
      }
      if (hostOS === 'linux') {
        const sys = checkLinuxArm64Sysroot(hostArch);
        sdkAvailable = sys.available;
        linkerProbeVerified = sys.available && (clangProbe.available || sys.crossGcc);
        if (sys.crossGcc && hostArch !== 'arm64') {
          linkerName = 'aarch64-linux-gnu-gcc';
          linkerAvailable = true;
        }
        missing.push(...sys.missing);
        if (hostArch !== 'arm64') {
          const qStatic = probeTool('qemu-aarch64-static', ['--version']);
          const qUser = qStatic.available ? qStatic : probeTool('qemu-aarch64', ['--version']);
          if (qUser.available) {
            emulatorAvailable = true;
            emulatorName = qStatic.available ? 'qemu-aarch64-static' : 'qemu-aarch64';
          }
        }
      } else {
        missing.push('Target linux-arm64 memerlukan runner Linux x86_64+cross-SDK atau ubuntu-24.04-arm.');
      }
    } else if (info.os === 'windows') {
      sdkName = info.arch === 'aarch64' ? 'MSVC ARM64 + Windows SDK' : 'MSVC x64 + Windows SDK';
      if (hostOS !== 'win32') {
        sdkAvailable = false;
        missing.push('MSVC CRT (libcmt.lib/msvcrt.lib) & Windows SDK (kernel32.lib/ucrt.lib) tidak tersedia di host non-Windows.');
      } else {
        if (!clangProbe.available) {
          missing.push('clang (LLVM untuk Windows) tidak ditemukan di PATH.');
        }
        const msvc = checkWindowsMsvcSysroot(info.arch === 'aarch64' ? 'aarch64' : 'x86_64');
        sdkAvailable = msvc.available;
        linkerProbeVerified = msvc.linkerProbeVerified;
        missing.push(...msvc.missing);
        const lldLink = probeTool('lld-link', ['--version']);
        if (lldLink.available) {
          linkerName = 'lld-link';
          linkerAvailable = true;
          linkerVersion = lldLink.version;
        }
      }
    } else if (info.os === 'darwin') {
      sdkName = 'Apple MacOSX.sdk (Xcode CLT)';
      if (hostOS !== 'darwin') {
        missing.push('clang tidak tersedia; Apple MacOSX.sdk / OSXCross sysroot (wajib runner macos-latest)');
      } else {
        if (!clangProbe.available) {
          missing.push('Apple clang tidak ditemukan di PATH.');
        }
        const mac = checkMacOSSysroot();
        sdkAvailable = mac.available;
        linkerProbeVerified = mac.available && clangProbe.available;
        missing.push(...mac.missing);
        if (hostArch === 'arm64' && info.arch === 'x86_64') {
          const rosetta = safeCP.spawnSync('arch', ['-x86_64', '/usr/bin/true'], {
            encoding: 'utf-8',
            timeout: 2000,
            shell: false,
          });
          if (!rosetta.error && rosetta.status === 0) {
            emulatorAvailable = true;
            emulatorName = 'rosetta2';
          }
        }
      }
    }

    const canCompileAndLink = clangProbe.available && sdkAvailable && missing.length === 0;
    if (!canCompileAndLink && missing.length > 0) {
      diagnostics.push(`Persyaratan hilang untuk '${canonical}': ${missing.join(' ')}`);
    }

    return {
      canonicalTarget: canonical,
      legacyTargetName,
      triple: info.triple,
      os: info.os,
      arch: info.arch,
      objectFormat: info.objectFormat,
      executableExtension: info.executableExtension,
      isCross: info.isCross,
      supported: true,
      canCompileAndLink,
      recommendedRunner: RECOMMENDED_RUNNER[canonical],
      sdkName,
      sdkAvailable,
      linkerProbeVerified,
      compilerName: clangProbe.available ? 'clang' : 'none',
      compilerAvailable: clangProbe.available,
      compilerVersion: clangProbe.version,
      compilerCommand: clangProbe.available ? 'clang' : 'llc',
      linkerName,
      linkerAvailable,
      linkerVersion,
      lldAvailable: lldProbe.available,
      emulatorAvailable,
      emulatorName,
      missingRequirements: missing,
      diagnostics,
    };
  }
}
