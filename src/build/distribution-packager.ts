/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Pengemas Distribusi Desktop (ZIP / .tar.gz / Installer / SHA256SUMS)
 * Target Milestone: Phase 23 (v0.23.0)
 */

import { safeFS, safePath } from '../compiler/llvm/node-compat';
import { ArchiveBuilder } from './archive-builder';
import { DesktopInstallerGenerator } from './installers';
import { DESKTOP_LEGACY_ALIAS_MAP, TargetMatrixManager } from './target-matrix';
import {
  ArchiveEntryInput,
  CanonicalDesktopTarget,
  DesktopDistributionArtifact,
  DesktopDistributionOptions,
  DesktopDistributionResult,
  DesktopPackageManifest,
  Sha256SumEntry,
} from './types';

export class DesktopDistributionPackager {
  public static packageTarget(options: DesktopDistributionOptions): DesktopDistributionResult {
    const diagnostics: string[] = [];
    const cap = TargetMatrixManager.inspectTargetCapability(options.target);
    if (!cap.canonicalTarget || cap.os === 'unknown' || cap.arch === 'unknown') {
      throw new Error(`Target distribusi tidak didukung atau tidak valid: '${options.target}'.`);
    }
    const canonical: CanonicalDesktopTarget = cap.canonicalTarget;
    const legacyTarget = cap.legacyAlias || DESKTOP_LEGACY_ALIAS_MAP[canonical];
    const targetOs: 'windows' | 'linux' | 'darwin' =
      cap.os === 'unknown' ? 'linux' : cap.os;
    const targetArch: 'x86_64' | 'aarch64' =
      cap.arch === 'unknown' ? 'x86_64' : cap.arch;

    const cleanApp = options.appName.replace(/[^A-Za-z0-9._-]/g, '_');
    if (!cleanApp || !/^[vV]?\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$/.test(options.appVersion)) {
      throw new Error('Nama aplikasi dan versi SemVer wajib valid untuk membuat paket distribusi.');
    }
    const baseName = `${cleanApp}-${options.appVersion}-${legacyTarget}`;
    const outRoot = safePath.resolve(options.outputDirectory);
    const pkgDir = safePath.join(outRoot, baseName);
    const binDir = safePath.join(pkgDir, 'bin');
    const libDir = safePath.join(pkgDir, 'lib');

    safeFS.mkdirSync(binDir, { recursive: true });
    safeFS.mkdirSync(libDir, { recursive: true });

    const archiveEntries: ArchiveEntryInput[] = [];
    const shaEntries: Sha256SumEntry[] = [];
    const recordedPaths = new Set<string>();

    const writeAndRecord = (relPath: string, content: string | Uint8Array, mode = 0o644) => {
      const normalizedRelPath = relPath.replace(/\\/g, '/');
      const pathKey = normalizedRelPath.toLowerCase();
      if (!normalizedRelPath || pathKey === 'sha256sums' || recordedPaths.has(pathKey)) {
        throw new Error(`Jalur berkas duplikat atau dicadangkan dalam paket: '${relPath}'.`);
      }
      // Memastikan jalur tetap berada di dalam direktori paket, termasuk pada
      // host Windows yang memakai pemisah jalur berbeda.
      const dest = ArchiveBuilder.resolveSafeSubpath(pkgDir, normalizedRelPath);
      recordedPaths.add(pathKey);
      safeFS.mkdirSync(safePath.dirname(dest), { recursive: true });
      const bytes = typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content);
      safeFS.writeFileSync(dest, bytes);
      if (typeof process !== 'undefined' && process.platform !== 'win32') {
        try {
          safeFS.chmodSync(dest, mode);
        } catch {
          // abaikan
        }
      }
      archiveEntries.push({ name: `${baseName}/${normalizedRelPath}`, content: bytes, mode });
      shaEntries.push({ sha256: ArchiveBuilder.computeSha256(bytes), filename: normalizedRelPath });
      return bytes;
    };

    const packageKind: 'native' | 'script-launcher' =
      options.packageKind || (options.nativeBuildResult?.executablePath ? 'native' : 'script-launcher');

    const exeExt = targetOs === 'windows' ? (packageKind === 'native' ? '.exe' : '.cmd') : '';
    const exeName = `${cleanApp}${exeExt}`;
    const binRelPath = `bin/${exeName}`;
    let exeSha256 = '';
    let binaryFormat = 'SCRIPT';

    if (
      packageKind === 'native' &&
      options.nativeBuildResult?.executablePath &&
      safeFS.existsSync(options.nativeBuildResult.executablePath)
    ) {
      const rawBin = safeFS.readFileBufferSync(options.nativeBuildResult.executablePath);
      writeAndRecord(binRelPath, rawBin, 0o755);
      exeSha256 = ArchiveBuilder.computeSha256(rawBin);
      binaryFormat = options.nativeBuildResult.binaryMetadata?.format || 'NATIVE';
      diagnostics.push(`Biner native '${binRelPath}' dikemas (${rawBin.byteLength} bytes).`);
    } else {
      const launcherScript =
        targetOs === 'windows'
          ? `@echo off\r\necho NUSANTARA ${cleanApp} ${options.appVersion} (${canonical})\r\n`
          : `#!/bin/sh\necho "NUSANTARA ${cleanApp} ${options.appVersion} (${canonical})"\n`;
      const bytes = writeAndRecord(binRelPath, launcherScript, 0o755);
      exeSha256 = ArchiveBuilder.computeSha256(bytes);
      diagnostics.push(`Peluncur '${binRelPath}' dikemas dalam mode script-launcher.`);
    }

    if (options.extraFiles) {
      for (const ef of options.extraFiles) {
        const normalized = ef.relativePath.replace(/\\/g, '/');
        if (normalized === 'manifest.json' || normalized === 'SHA256SUMS') {
          throw new Error(`Berkas tambahan tidak boleh menimpa metadata paket: '${normalized}'.`);
        }
        writeAndRecord(normalized, ef.content, ef.mode ?? 0o644);
      }
    }

    writeAndRecord(
      'LISENSI.txt',
      `Apache License 2.0\nNUSANTARA Programming Language (${options.appVersion})\n`,
      0o644
    );
    writeAndRecord(
      'BACA-SAYA.txt',
      `Aplikasi: ${options.appName}\nVersi: ${options.appVersion}\nTarget: ${canonical} (${cap.triple})\nMode: ${options.mode}\n`,
      0o644
    );

    const installers: string[] = [];
    if (options.includeInstallers !== false) {
      const bundle = DesktopInstallerGenerator.generate({
        appName: cleanApp,
        appVersion: options.appVersion,
        target: canonical,
        os: targetOs,
        binRelativePath: binRelPath,
      });
      for (const f of bundle.files) {
        writeAndRecord(f.name, f.content, f.mode);
        installers.push(f.name);
      }
    }

    const depNames =
      options.nativeBuildResult?.dependencyReport?.dependencies.map((d) => d.name) || [];

    const manifestObj: DesktopPackageManifest = {
      appName: cleanApp,
      appVersion: options.appVersion,
      target: canonical,
      legacyTarget,
      triple: cap.triple,
      operatingSystem: targetOs,
      architecture: targetArch,
      mode: options.mode,
      packageKind,
      binaryFormat,
      linkingMode: options.linkingMode || 'auto',
      actualStaticLink: Boolean(options.nativeBuildResult?.actualStaticLink),
      executable: binRelPath,
      executableSha256: exeSha256,
      installers,
      dependencies: depNames,
      builtAt: options.reproducible !== false ? '1970-01-01T00:00:00.000Z' : new Date().toISOString(),
    };

    const manifestJson = JSON.stringify(manifestObj, null, 2) + '\n';
    writeAndRecord('manifest.json', manifestJson, 0o644);
    const manifestPath = safePath.join(pkgDir, 'manifest.json');

    const sha256sumsContent = ArchiveBuilder.formatSha256Sums(shaEntries);
    const sha256sumsPath = safePath.join(pkgDir, 'SHA256SUMS');
    safeFS.writeFileSync(sha256sumsPath, sha256sumsContent, 'utf-8');
    archiveEntries.push({
      name: `${baseName}/SHA256SUMS`,
      content: Buffer.from(sha256sumsContent, 'utf-8'),
      mode: 0o644,
    });

    const artifacts: DesktopDistributionArtifact[] = [];
    const formats: Array<'zip' | 'tar.gz'> = targetOs === 'windows' ? ['zip'] : ['zip', 'tar.gz'];

    for (const fmt of formats) {
      const filename = `${baseName}.${fmt}`;
      const filePath = safePath.join(outRoot, filename);
      const archiveBytes =
        fmt === 'zip'
          ? ArchiveBuilder.createZip(archiveEntries, { reproducible: options.reproducible !== false })
          : ArchiveBuilder.createTarGz(archiveEntries, { reproducible: options.reproducible !== false });
      safeFS.writeFileSync(filePath, archiveBytes);
      artifacts.push({
        canonicalTarget: canonical,
        legacyTargetName: legacyTarget,
        format: fmt,
        filename,
        filePath,
        sizeBytes: archiveBytes.byteLength,
        sha256: ArchiveBuilder.computeSha256(archiveBytes),
      });
    }

    return {
      success: true,
      target: canonical,
      packageDirectory: pkgDir,
      manifestPath,
      sha256sumsPath,
      artifacts,
      installers,
      diagnostics,
    };
  }

  public static buildLauncherDistributionMatrix(options: {
    outputDirectory: string;
    targets: string[];
    mode: 'debug' | 'release';
    reproducible?: boolean;
    appVersion: string;
    appName?: string;
  }): {
    artifacts: DesktopDistributionArtifact[];
    manifestPath: string;
    sha256sumsPath: string;
    sha256sums: string;
  } {
    const outRoot = safePath.resolve(options.outputDirectory);
    safeFS.mkdirSync(outRoot, { recursive: true });
    const appName = options.appName || 'nusantara';
    const allArtifacts: DesktopDistributionArtifact[] = [];

    for (const rawT of options.targets) {
      const pkgRes = this.packageTarget({
        appName,
        appVersion: options.appVersion,
        target: rawT,
        mode: options.mode,
        packageKind: 'script-launcher',
        outputDirectory: outRoot,
        reproducible: options.reproducible,
        includeInstallers: true,
      });
      allArtifacts.push(...pkgRes.artifacts);
    }

    const sha256sums = ArchiveBuilder.formatSha256Sums(
      allArtifacts.map((a) => ({ sha256: a.sha256, filename: a.filename }))
    ).trimEnd();
    const sha256sumsPath = safePath.join(outRoot, 'SHA256SUMS');
    safeFS.writeFileSync(sha256sumsPath, sha256sums ? sha256sums + '\n' : '', 'utf-8');

    const manifestPath = safePath.join(outRoot, 'release-manifest.json');
    const releaseManifest = {
      nama: appName,
      versi: options.appVersion.replace(/^v/, ''),
      mode: options.mode,
      packageKind: 'script-launcher',
      waktuBuild:
        options.reproducible !== false ? '1970-01-01T00:00:00.000Z' : new Date().toISOString(),
      artefak: allArtifacts.map((a) => ({
        platform: a.legacyTargetName,
        canonicalTarget: a.canonicalTarget,
        format: a.format,
        namaBerkas: a.filename,
        jalurKeluaran: a.filePath,
        ukuranByte: a.sizeBytes,
        sha256: a.sha256,
      })),
      sha256sums,
    };
    safeFS.writeFileSync(manifestPath, JSON.stringify(releaseManifest, null, 2) + '\n', 'utf-8');

    return {
      artifacts: allArtifacts,
      manifestPath,
      sha256sumsPath,
      sha256sums,
    };
  }
}
