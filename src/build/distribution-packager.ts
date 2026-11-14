/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Pengemas Distribusi Desktop Resmi
 * Menghasilkan paket siap distribusi (.zip & .tar.gz), SHA256SUMS, manifest, lisensi, dan skrip pemasang.
 */

import { safeFS, safePath } from '../compiler/llvm/node-compat';
import { TargetTripleManager } from '../compiler/llvm/target-triple';
import { VERSI_NUSANTARA } from '../konstanta/versi';
import { ArchiveBuilder } from './archive-builder';
import { DesktopInstallerGenerator } from './installers';
import { TargetMatrixManager } from './target-matrix';
import {
  ArchiveEntryInput,
  ArchiveFormat,
  DesktopDistributionArtifact,
  DesktopDistributionOptions,
  DesktopDistributionResult,
  DesktopPackageManifest,
  PackageKind,
  Sha256SumEntry,
} from './types';

export class DesktopDistributionPackager {
  public static packageTarget(options: DesktopDistributionOptions): DesktopDistributionResult {
    const diag: string[] = [];
    const mode = options.mode || 'release';
    const packageKind: PackageKind = options.packageKind || 'native';
    const reproducible = options.reproducible ?? true;
    const includeInstallers = options.includeInstallers ?? true;

    const targetCap = TargetMatrixManager.inspectTargetCapability(options.target);
    if (!targetCap.supported || !targetCap.canonicalTarget || !targetCap.targetInfo) {
      throw new Error(
        targetCap.missingRequirements[0] || `Target tidak didukung: '${options.target}'`
      );
    }

    if (options.appName.includes('..') || options.appName.includes('/') || options.appName.includes('\\')) {
      throw new Error(`Nama aplikasi tidak aman: '${options.appName}'`);
    }

    const targetId = targetCap.canonicalTarget;
    const legacyName = TargetMatrixManager.toLegacyAlias(targetId);
    const osType = targetCap.os === 'unknown' ? 'linux' : targetCap.os;
    const exeExt = targetCap.targetInfo.executableExtension;
    const rootFolderName = `nusantara-${options.appVersion}-${legacyName}`;
    const stagingDir = safePath.join(options.outputDirectory, rootFolderName);

    const binDir = safePath.join(stagingDir, 'bin');
    const libDir = safePath.join(stagingDir, 'lib');
    const resDir = safePath.join(stagingDir, 'resources');
    const confDir = safePath.join(stagingDir, 'config');
    safeFS.mkdirSync(binDir, { recursive: true });
    safeFS.mkdirSync(libDir, { recursive: true });
    safeFS.mkdirSync(resDir, { recursive: true });
    safeFS.mkdirSync(confDir, { recursive: true });

    const archiveEntries: ArchiveEntryInput[] = [];
    const shaEntries: Sha256SumEntry[] = [];

    const addFile = (relPath: string, content: string | Uint8Array, fileMode = 0o644) => {
      const fullPath = safePath.join(stagingDir, relPath);
      safeFS.mkdirSync(safePath.dirname(fullPath), { recursive: true });
      safeFS.writeFileSync(fullPath, content);
      if (typeof process !== 'undefined' && process.platform !== 'win32') {
        safeFS.chmodSync(fullPath, fileMode);
      }
      const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
      const hash = ArchiveBuilder.computeSha256(bytes);
      archiveEntries.push({
        name: `${rootFolderName}/${relPath}`,
        content: bytes,
        mode: fileMode,
      });
      if (relPath !== 'SHA256SUMS') {
        shaEntries.push({ sha256: hash, filename: relPath });
      }
      return { fullPath, hash, size: bytes.byteLength };
    };

    // 1. Tentukan biner utama
    let exeRelPath = '';
    let exeFormat = 'UNKNOWN';
    let exeSha256: string | undefined;
    let dependencies: Array<{ name: string; found: boolean; isSystemLib: boolean }> = [];
    const linkingMode = options.nativeBuildResult?.linkingMode || options.linkingMode || 'auto';

    if (packageKind === 'native') {
      const sourceExePath = options.nativeBuildResult?.executablePath || options.executablePath;
      if (!sourceExePath || !safeFS.existsSync(sourceExePath)) {
        throw new Error(
          `Paket mode native memerlukan berkas executable nyata untuk target '${targetId}', tetapi berkas tidak ditemukan.`
        );
      }
      const exeBytes = safeFS.readFileBufferSync(sourceExePath);
      const binFileName = `${options.appName}${exeExt}`;
      exeRelPath = `bin/${binFileName}`;
      const recorded = addFile(exeRelPath, exeBytes, 0o755);
      exeSha256 = recorded.hash;
      exeFormat = options.nativeBuildResult?.binaryMetadata?.format || targetCap.targetInfo.objectFormat;
      dependencies = (options.nativeBuildResult?.dependencyReport?.dependencies || []).map((d) => ({
        name: d.name,
        found: d.found,
        isSystemLib: d.isSystemLib,
      }));
    } else {
      // Jujur mendistribusikan launcher runtime berbasis Node/tsx (untuk CLI/CI)
      const binFileName = osType === 'windows' ? `${options.appName}.cmd` : options.appName;
      exeRelPath = `bin/${binFileName}`;
      const launcherScript =
        osType === 'windows'
          ? `@echo off\r\nnpx tsx "%~dp0..\\src\\index.ts" %*\r\n`
          : `#!/usr/bin/env sh\nexec npx tsx "$(dirname "$0")/../src/index.ts" "$@"\n`;
      const recorded = addFile(exeRelPath, launcherScript, 0o755);
      exeSha256 = recorded.hash;
      exeFormat = 'SCRIPT';
    }

    // 2. Berkas ekstra (lib, config, resources)
    for (const f of options.extraLibraryFiles || []) {
      addFile(`lib/${safePath.basename(f.name)}`, f.content, 0o644);
    }
    for (const f of options.extraConfigFiles || []) {
      addFile(`config/${safePath.basename(f.name)}`, f.content, 0o644);
    }
    for (const f of options.extraResourceFiles || []) {
      addFile(`resources/${safePath.basename(f.name)}`, f.content, 0o644);
    }

    // 3. Lisensi & README
    const licenseContent =
      options.licenseText ||
      'Apache License Version 2.0 (SPDX-License-Identifier: Apache-2.0)\nCopyright (c) NUSANTARA Contributors.\n';
    addFile('LISENSI.txt', licenseContent, 0o644);

    const readmeContent =
      options.readmeText ||
      [
        `Paket Distribusi Resmi ${options.appName} (${options.appVersion})`,
        `Target       : ${targetId} (${targetCap.triple})`,
        `Jenis Paket  : ${packageKind === 'native' ? 'Executable Native' : 'Launcher Runtime (CLI/Node)'}`,
        `Format Biner : ${exeFormat}`,
        `Mode Tautan  : ${linkingMode}`,
        '',
        'Cara Memasang:',
        osType === 'windows'
          ? '  Jalankan install.bat atau powershell -File install.ps1'
          : '  Jalankan ./install.sh (atau bash install.sh --prefix "$HOME/.nusantara")',
        '',
        'Cara Mencopot:',
        osType === 'windows'
          ? '  Jalankan uninstall.bat atau powershell -File uninstall.ps1'
          : '  Jalankan ./uninstall.sh',
        '',
        'Verifikasi Integritas:',
        osType === 'linux' ? '  sha256sum -c SHA256SUMS' : '  shasum -a 256 -c SHA256SUMS',
      ].join('\n') + '\n';
    addFile('BACA-SAYA.txt', readmeContent, 0o644);

    // 4. Skrip Pemasang & Pencopot Desktop
    const installerFiles: string[] = [];
    if (includeInstallers) {
      const bundle = DesktopInstallerGenerator.generate({
        appName: options.appName,
        appVersion: options.appVersion,
        target: targetId,
        os: osType,
        binRelativePath: exeRelPath,
        hasLibDir: (options.extraLibraryFiles || []).length > 0,
      });
      for (const f of bundle.files) {
        addFile(f.name, f.content, f.mode ?? 0o644);
        installerFiles.push(f.name);
      }
    }

    // 5. Manifest Paket
    const manifest: DesktopPackageManifest = {
      nama: options.appName,
      versi: options.appVersion,
      mode,
      packageKind,
      target: targetId,
      targetTriple: targetCap.triple,
      architecture: targetCap.arch,
      operatingSystem: osType,
      linkingMode,
      executable: exeRelPath,
      executableFormat: exeFormat,
      executableSha256: exeSha256,
      dependencies,
      installerFiles,
      internalChecksumsFile: 'SHA256SUMS',
      reproducible,
      packagedAt: reproducible ? '1970-01-01T00:00:00.000Z' : new Date().toISOString(),
    };
    const manifestPath = addFile('manifest.json', JSON.stringify(manifest, null, 2) + '\n', 0o644).fullPath;

    // 6. SHA256SUMS internal paket (mencakup semua berkas paket termasuk manifest dan installer)
    shaEntries.sort((a, b) => a.filename.localeCompare(b.filename));
    const internalSumsContent = ArchiveBuilder.formatSha256Sums(shaEntries);
    const sha256sumsPath = safePath.join(stagingDir, 'SHA256SUMS');
    safeFS.writeFileSync(sha256sumsPath, internalSumsContent, 'utf-8');
    archiveEntries.push({
      name: `${rootFolderName}/SHA256SUMS`,
      content: internalSumsContent,
      mode: 0o644,
    });

    // 7. Buat arsip .zip dan/atau .tar.gz nyata di outputDirectory
    const formats: ArchiveFormat[] =
      options.formats || (osType === 'windows' ? ['zip'] : ['zip', 'tar.gz']);
    const artifacts: DesktopDistributionArtifact[] = [];

    for (const fmt of formats) {
      const archiveFilename = `${options.appName}-${options.appVersion}-${legacyName}.${fmt}`;
      const archiveOutPath = safePath.join(options.outputDirectory, archiveFilename);
      const bytes =
        fmt === 'zip'
          ? ArchiveBuilder.createZip(archiveEntries)
          : ArchiveBuilder.createTarGz(archiveEntries, { reproducible });

      safeFS.writeFileSync(archiveOutPath, bytes);
      const sha256 = ArchiveBuilder.computeSha256(bytes);

      artifacts.push({
        target: targetId,
        legacyTargetName: legacyName,
        format: fmt,
        filename: archiveFilename,
        filePath: archiveOutPath,
        sizeBytes: bytes.byteLength,
        sha256,
        packageKind,
      });
      diag.push(`Arsip ${fmt.toUpperCase()} ditulis: ${archiveOutPath} (${bytes.byteLength} bytes)`);
    }

    return {
      success: true,
      statusCode: 'SUKSES',
      target: targetCap,
      packageKind,
      stagingDirectory: stagingDir,
      manifestPath,
      manifest,
      artifacts,
      sha256sumsPath,
      diagnostics: diag,
    };
  }

  /**
   * Membangun paket launcher distribusi multi-target untuk rilis CLI standar (kompatibel CI Phase 24).
   */
  public static buildLauncherDistributionMatrix(options: {
    outputDirectory: string;
    targets: string[];
    mode?: 'debug' | 'release';
    reproducible?: boolean;
    appVersion?: string;
    appName?: string;
  }): {
    artifacts: DesktopDistributionArtifact[];
    sha256sums: string;
    manifestPath: string;
    sha256sumsPath: string;
  } {
    const version = options.appVersion || `v${VERSI_NUSANTARA}`;
    const appName = options.appName || 'nusantara';
    const mode = options.mode || 'release';
    const reproducible = options.reproducible ?? true;

    if (!safeFS.existsSync(options.outputDirectory)) {
      safeFS.mkdirSync(options.outputDirectory, { recursive: true });
    }

    const allArtifacts: DesktopDistributionArtifact[] = [];
    for (const rawTarget of options.targets) {
      const info = TargetTripleManager.resolveStrict(rawTarget);
      if (!info.supported || !info.info.targetId) {
        throw new Error(info.error || `Target distribusi tidak valid: '${rawTarget}'`);
      }
      const isWin = info.info.os === 'windows';
      const res = this.packageTarget({
        appName,
        appVersion: version,
        target: rawTarget,
        mode,
        packageKind: 'script-launcher',
        outputDirectory: options.outputDirectory,
        formats: isWin ? ['zip'] : ['zip', 'tar.gz'],
        reproducible,
        includeInstallers: true,
      });
      allArtifacts.push(...res.artifacts);
    }

    const sumsText = ArchiveBuilder.formatSha256Sums(
      allArtifacts.map((a) => ({ sha256: a.sha256, filename: a.filename }))
    );

    const releaseManifest = {
      nama: appName,
      versi: VERSI_NUSANTARA,
      mode,
      packageKind: 'script-launcher' as PackageKind,
      reproducible,
      waktuBuild: reproducible ? '1970-01-01T00:00:00.000Z' : new Date().toISOString(),
      artefak: allArtifacts.map((a) => ({
        platform: a.legacyTargetName,
        targetCanonical: a.target,
        format: a.format,
        namaBerkas: a.filename,
        jalurKeluaran: a.filePath,
        ukuranByte: a.sizeBytes,
        sha256: a.sha256,
        packageKind: a.packageKind,
      })),
      sha256sums: sumsText.trimEnd(),
    };

    const manifestPath = safePath.join(options.outputDirectory, 'release-manifest.json');
    const sha256sumsPath = safePath.join(options.outputDirectory, 'SHA256SUMS');
    safeFS.writeFileSync(manifestPath, JSON.stringify(releaseManifest, null, 2) + '\n', 'utf-8');
    safeFS.writeFileSync(sha256sumsPath, sumsText, 'utf-8');

    return {
      artifacts: allArtifacts,
      sha256sums: sumsText.trimEnd(),
      manifestPath,
      sha256sumsPath,
    };
  }
}
