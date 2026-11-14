/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM & DESKTOP DISTRIBUTION (Phase 23)
 * Definisi Tipe Data Target, Pipeline Native, Arsip, dan Pemasang Desktop.
 */

import { BinaryMetadata } from '../compiler/executable/binary-metadata';
import { DependencyInspectionReport } from '../compiler/linker/dependency-inspector';
import { DesktopTargetId, TargetPlatformInfo } from '../compiler/llvm/target-triple';
import { LLVMOptLevel } from '../compiler/llvm/llvm-optimizer';

export type CanonicalDesktopTarget = DesktopTargetId;

export type DesktopTargetAlias = 'windows-x64' | 'linux-x64' | 'macos-x64';

export type AnyDesktopTarget = CanonicalDesktopTarget | DesktopTargetAlias;

export type LinkingMode = 'auto' | 'static' | 'dynamic';

export type ArchiveFormat = 'zip' | 'tar.gz';

export type BuildMode = 'debug' | 'release';

export type PackageKind = 'native' | 'script-launcher';

export type BuildStatusCode =
  | 'SUKSES'
  | 'TOOLCHAIN_TIDAK_TERSEDIA'
  | 'CROSS_SDK_TIDAK_TERSEDIA'
  | 'TARGET_TIDAK_DIDUKUNG'
  | 'GALAT_KOMPILASI'
  | 'GALAT_LINKER'
  | 'BINER_TIDAK_SAH'
  | 'GALAT_VALIDASI';

export interface TargetCapability {
  rawInput: string;
  canonicalTarget?: CanonicalDesktopTarget;
  legacyAlias?: string;
  os: 'windows' | 'linux' | 'darwin' | 'unknown';
  arch: 'x86_64' | 'aarch64' | 'unknown';
  triple: string;
  targetInfo?: TargetPlatformInfo;
  supported: boolean;
  isCross: boolean;
  toolchainAvailable: boolean;
  crossSdkAvailable: boolean;
  canBuildNative: boolean;
  sysrootPath?: string;
  crossCompilerCommand?: string;
  recommendedRunner: string;
  missingRequirements: string[];
  diagnostics: string[];
}

export interface NativeBuildOptions {
  sourceFilePath?: string;
  sourceCode?: string;
  appName?: string;
  target?: string;
  outputDirectory: string;
  optLevel?: LLVMOptLevel;
  linkingMode?: LinkingMode;
  debug?: boolean;
  strip?: boolean;
  staticLibraries?: string[];
  sharedLibraries?: string[];
  libraryPaths?: string[];
  customToolchainPath?: string;
  sysrootOverride?: string;
  verifyExecution?: boolean;
  executionArgs?: string[];
  executionTimeoutMs?: number;
}

export interface ExecutionVerificationResult {
  executed: boolean;
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  executionMode?: 'native' | 'qemu-user' | 'not-executed';
  reason?: string;
}

export interface NativeBuildResult {
  success: boolean;
  statusCode: BuildStatusCode;
  target: TargetCapability;
  executablePath?: string;
  objectPath?: string;
  llvmIRPath?: string;
  linkingMode: LinkingMode;
  binaryMetadata?: BinaryMetadata;
  dependencyReport?: DependencyInspectionReport;
  executionVerification?: ExecutionVerificationResult;
  executableSha256?: string;
  durationMs: number;
  diagnostics: string[];
}

export interface ArchiveEntryInput {
  name: string;
  content: string | Uint8Array;
  mode?: number;
}

export interface ExtractedEntryInfo {
  name: string;
  size: number;
  mode: number;
}

export interface Sha256SumEntry {
  sha256: string;
  filename: string;
}

export interface Sha256VerificationResult {
  valid: boolean;
  checkedCount: number;
  mismatches: Array<{ filename: string; expected: string; actual: string | 'MISSING' }>;
  diagnostics: string[];
}

export interface InstallerScriptBundle {
  target: CanonicalDesktopTarget;
  os: 'windows' | 'linux' | 'darwin';
  files: ArchiveEntryInput[];
}

export interface DesktopDistributionOptions {
  appName: string;
  appVersion: string;
  target: string;
  mode?: BuildMode;
  packageKind?: PackageKind;
  outputDirectory: string;
  nativeBuildResult?: NativeBuildResult;
  executablePath?: string;
  formats?: ArchiveFormat[];
  linkingMode?: LinkingMode;
  reproducible?: boolean;
  includeInstallers?: boolean;
  extraConfigFiles?: Array<{ name: string; content: string | Uint8Array }>;
  extraResourceFiles?: Array<{ name: string; content: string | Uint8Array }>;
  extraLibraryFiles?: Array<{ name: string; content: string | Uint8Array }>;
  licenseText?: string;
  readmeText?: string;
}

export interface DesktopDistributionArtifact {
  target: CanonicalDesktopTarget;
  legacyTargetName: string;
  format: ArchiveFormat;
  filename: string;
  filePath: string;
  sizeBytes: number;
  sha256: string;
  packageKind: PackageKind;
}

export interface DesktopPackageManifest {
  nama: string;
  versi: string;
  mode: BuildMode;
  packageKind: PackageKind;
  target: CanonicalDesktopTarget;
  targetTriple: string;
  architecture: string;
  operatingSystem: string;
  linkingMode: LinkingMode;
  executable: string;
  executableFormat: string;
  executableSha256?: string;
  dependencies: Array<{ name: string; found: boolean; isSystemLib: boolean }>;
  installerFiles: string[];
  internalChecksumsFile: string;
  reproducible: boolean;
  packagedAt: string;
}

export interface DesktopDistributionResult {
  success: boolean;
  statusCode: BuildStatusCode;
  target: TargetCapability;
  packageKind: PackageKind;
  stagingDirectory: string;
  manifestPath: string;
  manifest: DesktopPackageManifest;
  artifacts: DesktopDistributionArtifact[];
  sha256sumsPath: string;
  diagnostics: string[];
}

export interface DesktopReleaseManifest {
  nama: string;
  versi: string;
  mode: BuildMode;
  packageKind: PackageKind;
  waktuBuild: string;
  reproducible: boolean;
  artefak: Array<{
    platform: string;
    targetCanonical: CanonicalDesktopTarget;
    format: ArchiveFormat;
    namaBerkas: string;
    jalurKeluaran: string;
    ukuranByte: number;
    sha256: string;
    packageKind: PackageKind;
  }>;
  sha256sums: string;
}

export interface InstallerSandboxResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  prefixDir: string;
  installedBinaryPath?: string;
}
