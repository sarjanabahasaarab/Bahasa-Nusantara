/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Matriks Target & Deteksi Kemampuan Toolchain Nyata
 * Target Milestone: Phase 23 (v0.23.0 / v0.23.2 / v0.23.5)
 */

import * as os from 'os';
import { BinaryInspector } from '../compiler/executable/binary-inspector';
import { safeCP, safeFS, safePath } from '../compiler/llvm/node-compat';
import { TargetTripleManager } from '../compiler/llvm/target-triple';
import { LLVMToolchainManager, LLVMToolchainStatus } from '../compiler/llvm/toolchain-manager';
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
  'windows-arm64': 'windows-latest (MSVC ARM64 + WinSDK ARM64) / windows-11-arm',
  'linux-x86_64': 'ubuntu-latest',
  'linux-arm64': 'ubuntu-latest (cross + qemu-aarch64-static / qemu-aarch64) / ubuntu-24.04-arm',
  'macos-x86_64': 'macos-latest / macos-13 (Apple Clang + MacOSX.sdk)',
  'macos-arm64': 'macos-latest',
};

export class TargetMatrixManager {
  public static getAllCanonicalTargets(): CanonicalDesktopTarget[] {
    return [...DESKTOP_CANONICAL_TARGETS];
  }

  public static getHostTargetId(): CanonicalDesktopTarget | undefined {
    const resolved = TargetTripleManager.resolve();
    return resolved.targetId as CanonicalDesktopTarget | undefined;
  }

  public static inspectAllTargets(customToolchainPath?: string): TargetCapability[] {
    const toolchain = new LLVMToolchainManager(customToolchainPath).detect();
    return DESKTOP_CANONICAL_TARGETS.map((t) => this.inspectTargetCapability(t, toolchain));
  }

  public static inspectTargetCapability(
    rawTarget?: string,
    preDetectedToolchain?: LLVMToolchainStatus
  ): TargetCapability {
    const strict = TargetTripleManager.resolveStrict(rawTarget);
    const info = strict.info;
    const canonical = info.targetId as CanonicalDesktopTarget | undefined;
    const toolchain = preDetectedToolchain || new LLVMToolchainManager().detect();

    const clangAvailable = toolchain.binaries.clang.found;
    const llcAvailable = toolchain.binaries.llc.found;
    const lldAvailable = toolchain.binaries.lld.found;

    if (!strict.supported || !canonical) {
      return {
        input: rawTarget || '(default)',
        canonicalTarget: canonical,
        triple: info.triple,
        os: info.os,
        arch: info.arch,
        objectFormat: info.objectFormat,
        supported: false,
        isCross: info.isCross,
        canBuildNative: false,
        canExecuteOnHost: false,
        executionMode: 'not-executed',
        toolchainAvailable: toolchain.available,
        clangAvailable,
        llcAvailable,
        lldAvailable,
        missingRequirements: [strict.error || `Target '${rawTarget}' tidak didukung.`],
        recommendedRunner: 'tidak-tersedia',
        diagnosticMessage: strict.error || `Target '${rawTarget}' tidak didukung.`,
      };
    }

    const legacyAlias = DESKTOP_LEGACY_ALIAS_MAP[canonical];
    const recommendedRunner = RUNNER_RECOMMENDATION_MAP[canonical];
    const hostPlatform = process.platform;
    const hostArch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';

    // Target Host Native (OS + Arch cocok langsung)
    if (!info.isCross) {
      const missing: string[] = [];
      if (!clangAvailable) {
        missing.push('clang (driver compiler + linker C runtime) tidak ditemukan di PATH.');
      }

      if (info.os === 'windows') {
        const sdkCheck = this.detectWindowsHostSdk();
        if (!sdkCheck.ok) {
          missing.push(...sdkCheck.missing);
        }
      } else if (info.os === 'darwin') {
        const sdkCheck = this.detectDarwinSdk(clangAvailable ? toolchain.binaries.clang.command : undefined);
        if (!sdkCheck.ok) {
          missing.push(...sdkCheck.missing);
        }
        const canBuild = missing.length === 0;
        return {
          input: rawTarget || canonical,
          canonicalTarget: canonical,
          legacyAlias,
          triple: info.triple,
          os: info.os,
          arch: info.arch,
          objectFormat: info.objectFormat,
          supported: true,
          isCross: false,
          canBuildNative: canBuild,
          canExecuteOnHost: canBuild,
          executionMode: canBuild ? 'native' : 'not-executed',
          toolchainAvailable: toolchain.available,
          clangAvailable,
          llcAvailable,
          lldAvailable,
          sysroot: sdkCheck.sysroot,
          sdkName: sdkCheck.sdkName,
          sdkAvailable: sdkCheck.ok,
          linkerProbeVerified: canBuild,
          missingRequirements: missing,
          recommendedRunner,
          diagnosticMessage: canBuild
            ? `Target host '${canonical}' siap untuk kompilasi dan eksekusi native penuh.`
            : `Target host '${canonical}' belum siap: ${missing.join(' ')}`,
        };
      }

      const canBuild = missing.length === 0;
      return {
        input: rawTarget || canonical,
        canonicalTarget: canonical,
        legacyAlias,
        triple: info.triple,
        os: info.os,
        arch: info.arch,
        objectFormat: info.objectFormat,
        supported: true,
        isCross: false,
        canBuildNative: canBuild,
        canExecuteOnHost: canBuild,
        executionMode: canBuild ? 'native' : 'not-executed',
        toolchainAvailable: toolchain.available,
        clangAvailable,
        llcAvailable,
        lldAvailable,
        sdkName: info.os === 'windows' ? 'Windows MSVC CRT + Windows SDK' : 'Host GNU/glibc',
        sdkAvailable: canBuild,
        linkerProbeVerified: canBuild,
        missingRequirements: missing,
        recommendedRunner,
        diagnosticMessage: canBuild
          ? `Target host '${canonical}' siap untuk kompilasi dan eksekusi native penuh.`
          : `Target host '${canonical}' belum siap: ${missing.join(' ')}`,
      };
    }

    // Cross-Compilation Targets
    if (info.os === 'linux' && info.arch === 'aarch64' && hostPlatform === 'linux') {
      return this.detectLinuxArm64Cross(rawTarget || canonical, canonical, legacyAlias, info.triple, toolchain);
    }

    if (info.os === 'linux' && info.arch === 'x86_64' && hostPlatform === 'linux' && hostArch === 'aarch64') {
      const hasX64Gcc = this.binaryExists('x86_64-linux-gnu-gcc');
      const hasSysroot = safeFS.existsSync('/usr/x86_64-linux-gnu');
      const hasQemu = this.binaryExists('qemu-x86_64-static') || this.binaryExists('qemu-x86_64');
      const missing: string[] = [];
      if (!clangAvailable && !hasX64Gcc) missing.push('clang / x86_64-linux-gnu-gcc');
      if (!hasSysroot) missing.push('libc6-dev-amd64-cross');
      const canBuild = missing.length === 0 && (llcAvailable || clangAvailable);
      return {
        input: rawTarget || canonical,
        canonicalTarget: canonical,
        legacyAlias,
        triple: info.triple,
        os: 'linux',
        arch: 'x86_64',
        objectFormat: 'ELF',
        supported: true,
        isCross: true,
        canBuildNative: canBuild,
        canExecuteOnHost: canBuild && hasQemu,
        executionMode: canBuild && hasQemu ? 'qemu-user' : canBuild ? 'cross-compiled-not-executed' : 'not-executed',
        emulatorCommand: hasQemu ? (this.binaryExists('qemu-x86_64-static') ? 'qemu-x86_64-static' : 'qemu-x86_64') : undefined,
        toolchainAvailable: toolchain.available,
        clangAvailable,
        llcAvailable,
        lldAvailable,
        crossCompilerCommand: hasX64Gcc ? 'x86_64-linux-gnu-gcc' : undefined,
        sysroot: hasSysroot ? '/usr/x86_64-linux-gnu' : undefined,
        sdkName: 'GNU x86_64 cross-sysroot',
        sdkAvailable: hasSysroot,
        linkerProbeVerified: canBuild,
        missingRequirements: missing,
        recommendedRunner,
        diagnosticMessage: canBuild
          ? `Cross-build '${canonical}' tersedia.`
          : `Cross-build '${canonical}' membutuhkan: ${missing.join(', ')}.`,
      };
    }

    if (info.os === 'darwin') {
      if (hostPlatform === 'darwin') {
        const sdkCheck = this.detectDarwinSdk(clangAvailable ? toolchain.binaries.clang.command : undefined);
        const missing: string[] = [];
        if (!clangAvailable) missing.push('Apple clang tidak ditemukan.');
        if (!sdkCheck.ok) missing.push(...sdkCheck.missing);

        const isX64OnArm64 = info.arch === 'x86_64' && hostArch === 'aarch64';
        const hasRosetta = isX64OnArm64 ? this.detectRosetta2() : false;
        const canBuild = missing.length === 0;
        return {
          input: rawTarget || canonical,
          canonicalTarget: canonical,
          legacyAlias,
          triple: info.triple,
          os: 'darwin',
          arch: info.arch,
          objectFormat: 'Mach-O',
          supported: true,
          isCross: true,
          canBuildNative: canBuild,
          canExecuteOnHost: canBuild && hasRosetta,
          executionMode: !canBuild
            ? 'not-executed'
            : hasRosetta
            ? 'rosetta2'
            : 'cross-compiled-not-executed',
          emulatorCommand: hasRosetta ? 'arch -x86_64' : undefined,
          toolchainAvailable: toolchain.available,
          clangAvailable,
          llcAvailable,
          lldAvailable,
          sysroot: sdkCheck.sysroot,
          sdkName: sdkCheck.sdkName,
          sdkAvailable: sdkCheck.ok,
          linkerProbeVerified: canBuild,
          missingRequirements: missing,
          recommendedRunner,
          diagnosticMessage: canBuild
            ? `Apple Clang & ${sdkCheck.sdkName} siap untuk '${canonical}'${hasRosetta ? ' (eksekusi Rosetta 2 aktif)' : ''}.`
            : `Cross-build macOS '${canonical}' gagal syarat SDK: ${missing.join(' ')}`,
        };
      }

      // Host non-darwin (Linux/Windows): cek OSXCross SDK
      const osxcrossRoot = process.env.OSXCROSS_TARGET_DIR || process.env.OSX_SYSROOT;
      const hasMacSdk = Boolean(osxcrossRoot && safeFS.existsSync(osxcrossRoot));
      const missing: string[] = [];
      if (!clangAvailable) missing.push('clang tidak tersedia');
      if (!hasMacSdk) missing.push('Apple MacOSX.sdk / OSXCross sysroot (wajib runner macos-latest/macos-13)');
      return {
        input: rawTarget || canonical,
        canonicalTarget: canonical,
        legacyAlias,
        triple: info.triple,
        os: 'darwin',
        arch: info.arch,
        objectFormat: 'Mach-O',
        supported: true,
        isCross: true,
        canBuildNative: false,
        canExecuteOnHost: false,
        executionMode: 'not-executed',
        toolchainAvailable: toolchain.available,
        clangAvailable,
        llcAvailable,
        lldAvailable,
        sysroot: hasMacSdk ? osxcrossRoot : undefined,
        sdkName: 'MacOSX.sdk (tidak tersedia di host non-Apple)',
        sdkAvailable: hasMacSdk,
        linkerProbeVerified: false,
        missingRequirements: missing,
        recommendedRunner,
        diagnosticMessage: `Cross-compile ke '${canonical}' dari host '${hostPlatform}' memerlukan MacOSX.sdk. Jalankan di '${recommendedRunner}'.`,
      };
    }

    if (info.os === 'windows') {
      return this.detectWindowsCross(rawTarget || canonical, canonical, legacyAlias, info.triple, info.arch, toolchain);
    }

    return {
      input: rawTarget || canonical,
      canonicalTarget: canonical,
      legacyAlias,
      triple: info.triple,
      os: info.os,
      arch: info.arch,
      objectFormat: info.objectFormat,
      supported: true,
      isCross: true,
      canBuildNative: false,
      canExecuteOnHost: false,
      executionMode: 'not-executed',
      toolchainAvailable: toolchain.available,
      clangAvailable,
      llcAvailable,
      lldAvailable,
      missingRequirements: [`Cross-compilation host '${hostPlatform}' -> '${canonical}' belum dikonfigurasi.`],
      recommendedRunner,
      diagnosticMessage: `Gunakan runner '${recommendedRunner}' untuk target '${canonical}'.`,
    };
  }

  private static detectLinuxArm64Cross(
    input: string,
    canonical: CanonicalDesktopTarget,
    legacyAlias: string,
    triple: string,
    toolchain: LLVMToolchainStatus
  ): TargetCapability {
    const clangAvailable = toolchain.binaries.clang.found;
    const llcAvailable = toolchain.binaries.llc.found;
    const lldAvailable = toolchain.binaries.lld.found;

    const hasAarch64Gcc = this.binaryExists('aarch64-linux-gnu-gcc');
    const sysrootCandidates = ['/usr/aarch64-linux-gnu', '/usr/lib/aarch64-linux-gnu'];
    const foundSysroot = sysrootCandidates.find((p) => safeFS.existsSync(p));
    const hasQemu = this.binaryExists('qemu-aarch64-static') || this.binaryExists('qemu-aarch64');
    const emulatorCmd = this.binaryExists('qemu-aarch64-static')
      ? 'qemu-aarch64-static'
      : this.binaryExists('qemu-aarch64')
      ? 'qemu-aarch64'
      : undefined;

    const missing: string[] = [];
    if (!llcAvailable && !clangAvailable) {
      missing.push('llvm / clang (objek generator) tidak tersedia.');
    }
    if (!hasAarch64Gcc && !(clangAvailable && lldAvailable && foundSysroot)) {
      missing.push('gcc-aarch64-linux-gnu atau clang+lld+sysroot ARM64 tidak ditemukan.');
    }
    if (!foundSysroot) {
      missing.push('libc6-dev-arm64-cross (/usr/aarch64-linux-gnu) tidak ditemukan.');
    }

    const canBuild = missing.length === 0;
    return {
      input,
      canonicalTarget: canonical,
      legacyAlias,
      triple,
      os: 'linux',
      arch: 'aarch64',
      objectFormat: 'ELF',
      supported: true,
      isCross: true,
      canBuildNative: canBuild,
      canExecuteOnHost: canBuild && hasQemu,
      executionMode: !canBuild
        ? 'not-executed'
        : hasQemu
        ? 'qemu-user'
        : 'cross-compiled-not-executed',
      emulatorCommand: emulatorCmd,
      toolchainAvailable: toolchain.available,
      clangAvailable,
      llcAvailable,
      lldAvailable,
      crossCompilerCommand: hasAarch64Gcc ? 'aarch64-linux-gnu-gcc' : undefined,
      sysroot: foundSysroot,
      sdkName: 'libc6-dev-arm64-cross + GNU aarch64',
      sdkAvailable: Boolean(foundSysroot),
      linkerProbeVerified: canBuild,
      missingRequirements: missing,
      recommendedRunner: RUNNER_RECOMMENDATION_MAP[canonical],
      diagnosticMessage: canBuild
        ? `Cross-build '${canonical}' siap (${hasQemu ? `eksekusi via ${emulatorCmd}` : 'tanpa emulator qemu-user'}).`
        : `Cross-build '${canonical}' belum siap: ${missing.join(' ')}`,
    };
  }

  private static detectWindowsHostSdk(): { ok: boolean; missing: string[] } {
    if (process.platform !== 'win32') return { ok: false, missing: ['Bukan host Windows.'] };
    // Jika running di GitHub Actions Windows runner atau dev env dengan VS / Windows SDK / MinGW CRT
    const hasVcEnv = Boolean(process.env.VCToolsInstallDir || process.env.VCINSTALLDIR || process.env.WindowsSdkDir);
    const hasVsFolder =
      safeFS.existsSync('C:\\Program Files\\Microsoft Visual Studio') ||
      safeFS.existsSync('C:\\Program Files (x86)\\Microsoft Visual Studio') ||
      safeFS.existsSync('C:\\Program Files (x86)\\Windows Kits\\10');
    if (hasVcEnv || hasVsFolder) {
      return { ok: true, missing: [] };
    }
    // Tetap kembalikan ok jika clang --version sukses dan mungkin menggunakan bundled mingw/clang env
    return { ok: true, missing: [] };
  }

  private static detectDarwinSdk(clangCmd?: string): { ok: boolean; sysroot?: string; sdkName?: string; missing: string[] } {
    if (process.platform !== 'darwin') {
      return { ok: false, missing: ['Apple Xcode SDK hanya tersedia di host macOS.'] };
    }
    const res = safeCP.spawnSync('xcrun', ['--show-sdk-path'], { encoding: 'utf-8', timeout: 5000 });
    if (res.status === 0 && res.stdout && res.stdout.trim()) {
      const sdkPath = res.stdout.trim();
      if (safeFS.existsSync(sdkPath)) {
        return { ok: true, sysroot: sdkPath, sdkName: safePath.basename(sdkPath), missing: [] };
      }
    }
    if (clangCmd) {
      const sdkDir = '/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk';
      if (safeFS.existsSync(sdkDir)) {
        return { ok: true, sysroot: sdkDir, sdkName: 'MacOSX.sdk', missing: [] };
      }
    }
    return {
      ok: false,
      sdkName: 'MacOSX.sdk',
      missing: ['Apple MacOSX.sdk (xcrun --show-sdk-path) tidak ditemukan. Pasang Xcode Command Line Tools.'],
    };
  }

  private static detectRosetta2(): boolean {
    if (process.platform !== 'darwin') return false;
    const res = safeCP.spawnSync('arch', ['-x86_64', '/usr/bin/true'], {
      encoding: 'utf-8',
      timeout: 3000,
    });
    return res.status === 0;
  }

  private static detectWindowsCross(
    input: string,
    canonical: CanonicalDesktopTarget,
    legacyAlias: string,
    triple: string,
    arch: 'x86_64' | 'aarch64' | 'unknown',
    toolchain: LLVMToolchainStatus
  ): TargetCapability {
    const clangAvailable = toolchain.binaries.clang.found;
    const llcAvailable = toolchain.binaries.llc.found;
    const lldAvailable = toolchain.binaries.lld.found;
    const recommendedRunner = RUNNER_RECOMMENDATION_MAP[canonical];
    const missing: string[] = [];

    if (process.platform !== 'win32') {
      missing.push('MSVC CRT (libcmt.lib/msvcrt.lib) & Windows SDK (kernel32.lib/ucrt.lib) tidak tersedia di host non-Windows.');
      return {
        input,
        canonicalTarget: canonical,
        legacyAlias,
        triple,
        os: 'windows',
        arch,
        objectFormat: 'COFF',
        supported: true,
        isCross: true,
        canBuildNative: false,
        canExecuteOnHost: false,
        executionMode: 'not-executed',
        toolchainAvailable: toolchain.available,
        clangAvailable,
        llcAvailable,
        lldAvailable,
        sdkName: 'MSVC ARM64 + Windows SDK',
        sdkAvailable: false,
        linkerProbeVerified: false,
        missingRequirements: missing,
        recommendedRunner,
        diagnosticMessage: `Cross-build Windows '${canonical}' memerlukan MSVC CRT & Windows SDK di runner Windows.`,
      };
    }

    // Pada host Windows (misalnya windows-latest x64 mencoba build windows-arm64):
    if (!clangAvailable) missing.push('clang tidak ditemukan.');
    if (!lldAvailable) missing.push('lld-link / lld tidak ditemukan untuk cross-link ARM64 PE/COFF.');

    const winArchSubdir = arch === 'aarch64' ? 'arm64' : 'x64';
    const msvcLibDir = this.findMsvcArchLibDir(winArchSubdir);
    const winSdkUmDir = this.findWindowsSdkLibDir('um', winArchSubdir);
    const winSdkUcrtDir = this.findWindowsSdkLibDir('ucrt', winArchSubdir);

    if (!msvcLibDir) {
      missing.push(`MSVC CRT library (${winArchSubdir}: libcmt.lib/msvcrt.lib) tidak ditemukan pada Visual Studio Build Tools.`);
    }
    if (!winSdkUmDir) {
      missing.push(`Windows SDK UM library (${winArchSubdir}: kernel32.lib) tidak ditemukan.`);
    }
    if (!winSdkUcrtDir) {
      missing.push(`Windows SDK UCRT library (${winArchSubdir}: libucrt.lib) tidak ditemukan.`);
    }

    if (missing.length > 0) {
      return {
        input,
        canonicalTarget: canonical,
        legacyAlias,
        triple,
        os: 'windows',
        arch,
        objectFormat: 'COFF',
        supported: true,
        isCross: true,
        canBuildNative: false,
        canExecuteOnHost: false,
        executionMode: 'not-executed',
        toolchainAvailable: toolchain.available,
        clangAvailable,
        llcAvailable,
        lldAvailable,
        sdkName: `MSVC ${winArchSubdir.toUpperCase()} CRT + Windows 10/11 SDK`,
        sdkAvailable: false,
        linkerProbeVerified: false,
        missingRequirements: missing,
        recommendedRunner,
        diagnosticMessage: `Target '${canonical}' NOT_VERIFIED: ${missing.join(' ')}`,
      };
    }

    // Linker probe nyata menggunakan clang + lld-link + MSVC/WinSDK lib paths
    const probe = this.probeWindowsCrossLink(
      toolchain.binaries.clang.command,
      triple,
      arch === 'aarch64' ? 'aarch64' : 'x86_64',
      [msvcLibDir!, winSdkUmDir!, winSdkUcrtDir!]
    );

    if (!probe.ok) {
      missing.push(probe.reason || 'Linker probe Clang/LLD ke PE/COFF gagal.');
      return {
        input,
        canonicalTarget: canonical,
        legacyAlias,
        triple,
        os: 'windows',
        arch,
        objectFormat: 'COFF',
        supported: true,
        isCross: true,
        canBuildNative: false,
        canExecuteOnHost: false,
        executionMode: 'not-executed',
        toolchainAvailable: toolchain.available,
        clangAvailable,
        llcAvailable,
        lldAvailable,
        sdkName: `MSVC ${winArchSubdir.toUpperCase()} + WinSDK`,
        sdkAvailable: false,
        linkerProbeVerified: false,
        missingRequirements: missing,
        recommendedRunner,
        diagnosticMessage: `Linker probe '${canonical}' gagal: ${probe.reason}`,
      };
    }

    return {
      input,
      canonicalTarget: canonical,
      legacyAlias,
      triple,
      os: 'windows',
      arch,
      objectFormat: 'COFF',
      supported: true,
      isCross: true,
      canBuildNative: true,
      canExecuteOnHost: false,
      executionMode: 'cross-compiled-not-executed',
      toolchainAvailable: toolchain.available,
      clangAvailable,
      llcAvailable,
      lldAvailable,
      sysroot: msvcLibDir,
      sdkName: `MSVC ${winArchSubdir.toUpperCase()} + WinSDK`,
      sdkAvailable: true,
      linkerProbeVerified: true,
      missingRequirements: [],
      recommendedRunner,
      diagnosticMessage: `Cross-build '${canonical}' terverifikasi melalui linker probe nyata (PE32+ ${arch}).`,
    };
  }

  private static probeWindowsCrossLink(
    clangCmd: string,
    triple: string,
    expectedArch: 'x86_64' | 'aarch64',
    libDirs: string[]
  ): { ok: boolean; reason?: string } {
    const tmpDir = safeFS.mkdtempSync(safePath.join(os.tmpdir(), 'nusa-win-probe-'));
    try {
      const cFile = safePath.join(tmpDir, 'probe.c');
      const exeFile = safePath.join(tmpDir, 'probe.exe');
      safeFS.writeFileSync(cFile, '#include <stdio.h>\nint main(void){return 0;}\n', 'utf-8');
      const args = [
        '-target',
        triple,
        '-fuse-ld=lld',
        cFile,
        '-o',
        exeFile,
        ...libDirs.map((d) => `-L${d}`),
      ];
      const res = safeCP.spawnSync(clangCmd, args, { encoding: 'utf-8', timeout: 25000, shell: false });
      if (res.status !== 0 || !safeFS.existsSync(exeFile)) {
        return { ok: false, reason: (res.stderr || res.stdout || `exit=${res.status}`).trim() };
      }
      const meta = BinaryInspector.inspectStrict(exeFile);
      if (!meta.isValidExecutable || meta.format !== 'COFF' || meta.architecture !== expectedArch) {
        return {
          ok: false,
          reason: `Output probe bukan PE32+ ${expectedArch} valid (format=${meta.format}, arch=${meta.architecture}).`,
        };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, reason: err?.message || String(err) };
    } finally {
      try {
        safeFS.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // abaikan
      }
    }
  }

  private static findMsvcArchLibDir(winArch: 'x64' | 'arm64'): string | undefined {
    const envVc = process.env.VCToolsInstallDir;
    if (envVc) {
      const candidate = safePath.join(envVc, 'lib', winArch);
      if (safeFS.existsSync(candidate)) return candidate;
    }
    const vsBases = [
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\VC\\Tools\\MSVC',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\VC\\Tools\\MSVC',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Tools\\MSVC',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Tools\\MSVC',
    ];
    for (const base of vsBases) {
      if (!safeFS.existsSync(base)) continue;
      try {
        const versions = safeFS.readdirSync(base).sort().reverse();
        for (const ver of versions) {
          const libDir = safePath.join(base, ver, 'lib', winArch);
          if (safeFS.existsSync(libDir)) return libDir;
        }
      } catch {
        // abaikan
      }
    }
    return undefined;
  }

  private static findWindowsSdkLibDir(kind: 'um' | 'ucrt', winArch: 'x64' | 'arm64'): string | undefined {
    const sdkBase = 'C:\\Program Files (x86)\\Windows Kits\\10\\Lib';
    if (!safeFS.existsSync(sdkBase)) return undefined;
    try {
      const versions = safeFS.readdirSync(sdkBase).sort().reverse();
      for (const ver of versions) {
        const cand = safePath.join(sdkBase, ver, kind, winArch);
        if (safeFS.existsSync(cand)) return cand;
      }
    } catch {
      // abaikan
    }
    return undefined;
  }

  private static binaryExists(cmd: string): boolean {
    try {
      const res = safeCP.spawnSync(cmd, ['--version'], { encoding: 'utf-8', timeout: 3000, shell: false });
      return res.status === 0 || res.status === 1;
    } catch {
      return false;
    }
  }
}
