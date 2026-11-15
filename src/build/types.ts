/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Definisi Tipe Terpadu (Phase 23)
 * Target Milestone: v0.23.0 / v0.23.5
 */

import { BinaryMetadata } from '../compiler/executable/binary-metadata';
import { DependencyInspectionReport } from '../compiler/linker/dependency-inspector';
import { LLVMOptLevel } from '../compiler/llvm/llvm-optimizer';

export type CanonicalDesktopTarget =
  | 'windows-x86_64'
  | 'windows-arm64'
  | 'linux-x86_64'
  | 'linux-arm64'
  | 'macos-x86_64'
  | 'macos-arm64';

export type LinkingMode = 'static' | 'dynamic' | 'auto';

export type BuildStatusCode =
  | 'BERHASIL'
  | 'TOOLCHAIN_TIDAK_TERSEDIA'
  | 'CROSS_SDK_TIDAK_TERSEDIA'
  | 'TARGET_TIDAK_DIDUKUNG'
  | 'GALAT_KOMPILASI'
  | 'GALAT_LINKER'
  | 'BINER_TIDAK_VALID'
  | 'EKSEKUSI_GAGAL';

export type ExecutionMode =
  | 'native'
  | 'qemu-user'
  | 'rosetta2'
  | 'cross-compiled-not-executed'
  | 'not-executed';

export interface TargetCapability {
  input: string;
  canonicalTarget?: CanonicalDesktopTarget;
  legacyAlias?: string;
  triple: string;
  os: 'windows' | 'linux' | 'darwin' | 'unknown';
  arch: 'x86_64' | 'aarch64' | 'unknown';
  objectFormat: 'ELF' | 'Mach-O' | 'COFF';
  supported: boolean;
  isCross: boolean;
  canBuildNative: boolean;
  canExecuteOnHost: boolean;
  executionMode: ExecutionMode;
  emulatorCommand?: string;
  toolchainAvailable: boolean;
  clangAvailable: boolean;
  llcAvailable: boolean;
  lldAvailable: boolean;
  crossCompilerCommand?: string;
  sysroot?: string;
  sdkName?: string;
  sdkAvailable?: boolean;
  linkerProbeVerified?: boolean;
  missingRequirements: string[];
  recommendedRunner: string;
  diagnosticMessage: string;
}

export interface ArchiveEntryInput {
  name: string;
  content: string | Uint8Array;
  mode?: number;
  mtime?: Date;
}

export interface Sha256SumEntry {
  sha256: string;
  filename: string;
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
  verifyExecution?: boolean;
  sysroot?: string;
  customToolchainPath?: string;
}

export interface NativeBuildResult {
  success: boolean;
  statusCode: BuildStatusCode;
  target: string;
  canonicalTarget?: CanonicalDesktopTarget;
  triple: string;
  isCross: boolean;
  linkingMode: LinkingMode;
  actualStaticLink: boolean;
  compilerToolUsed?: string;
  linkerToolUsed?: string;
  linkerCommand?: string;
  sdkUsed?: string;
  llvmIRPath?: string;
  llvmIRSha256?: string;
  llvmValidationTool?: string;
  objectPath?: string;
  objectSha256?: string;
  executablePath?: string;
  executableSha256?: string;
  executableSizeBytes?: number;
  binaryMetadata?: BinaryMetadata;
  dependencyReport?: DependencyInspectionReport;
  executedOnHost: boolean;
  executionMode: ExecutionMode;
  executionExitCode?: number | null;
  executionStdout?: string;
  executionStderr?: string;
  diagnostics: string[];
}

export interface DesktopDistributionArtifact {
  canonicalTarget: CanonicalDesktopTarget;
  legacyTargetName: string;
  format: 'zip' | 'tar.gz';
  filename: string;
  filePath: string;
  sizeBytes: number;
  sha256: string;
}

export interface DesktopPackageManifest {
  appName: string;
  appVersion: string;
  target: CanonicalDesktopTarget;
  legacyTarget: string;
  triple: string;
  operatingSystem: 'windows' | 'linux' | 'darwin';
  architecture: 'x86_64' | 'aarch64';
  mode: 'debug' | 'release';
  packageKind: 'native' | 'script-launcher';
  binaryFormat: string;
  linkingMode: LinkingMode;
  actualStaticLink: boolean;
  executable: string;
  executableSha256: string;
  installers: string[];
  dependencies: string[];
  builtAt: string;
}

export interface DesktopDistributionOptions {
  appName: string;
  appVersion: string;
  target: string;
  mode: 'debug' | 'release';
  packageKind?: 'native' | 'script-launcher';
  outputDirectory: string;
  nativeBuildResult?: NativeBuildResult;
  linkingMode?: LinkingMode;
  reproducible?: boolean;
  includeInstallers?: boolean;
  extraFiles?: Array<{ relativePath: string; content: string | Uint8Array; mode?: number }>;
}

export interface DesktopDistributionResult {
  success: boolean;
  target: CanonicalDesktopTarget;
  packageDirectory: string;
  manifestPath: string;
  sha256sumsPath: string;
  artifacts: DesktopDistributionArtifact[];
  installers: string[];
  diagnostics: string[];
}

export interface InstallerScriptBundle {
  target: CanonicalDesktopTarget;
  os: 'windows' | 'linux' | 'darwin';
  files: Array<{ name: string; content: string; mode: number }>;
}

export interface InstallerSandboxResult {
  success: boolean;
  skipped?: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  installedExecutablePath?: string;
  manifestPath?: string;
  shellUsed?: string;
  shellVersion?: string;
  reason?: string;
}

export type TargetCertificationStatus = 'PASS' | 'NOT_VERIFIED' | 'FAIL';

export interface Phase23TargetEvidence {
  schemaVersion: string;
  generatedAt: string;
  target: CanonicalDesktopTarget;
  triple: string;
  hostOs: string;
  hostArch: string;
  recommendedRunner: string;
  isCross: boolean;
  compiler: {
    name: string;
    available: boolean;
    version?: string;
    command?: string;
  };
  linker: {
    name: string;
    lldAvailable: boolean;
    version?: string;
    command?: string;
  };
  sdk: {
    name?: string;
    sysroot?: string;
    available: boolean;
    linkerProbeVerified: boolean;
    missingRequirements: string[];
  };
  llvmIR: {
    path?: string;
    sha256?: string;
    validationTool?: string;
  };
  objectFile: {
    path?: string;
    sha256?: string;
  };
  executable: {
    path?: string;
    sha256?: string;
    sizeBytes?: number;
  };
  binaryMetadata?: {
    format: string;
    architecture: string;
    binaryType: string;
    isValidExecutable: boolean;
    entryPointAddress?: string;
  };
  dependencyValidation?: {
    allResolved: boolean;
    isStatic?: boolean;
    missingLibraries: string[];
    dependencies: string[];
  };
  execution: {
    required: boolean;
    executed: boolean;
    mode: ExecutionMode;
    exitCode?: number | null;
    stdout?: string;
    sentinelExpected: string;
    sentinelMatched: boolean;
  };
  status: TargetCertificationStatus;
  statusCode: BuildStatusCode;
  reason?: string;
  diagnostics: string[];
}

export interface Phase23CertificationFinding {
  severity: 'error' | 'warning' | 'info';
  code: string;
  target: string;
  message: string;
}

export interface Phase23AggregationResult {
  overallStatus: 'CERTIFIED' | 'PARTIAL' | 'FAILED';
  exitCode: 0 | 1;
  counts: {
    totalRequired: number;
    pass: number;
    notVerified: number;
    fail: number;
    missing: number;
    corrupt: number;
  };
  targets: Record<CanonicalDesktopTarget, Phase23TargetEvidence | null>;
  findings: Phase23CertificationFinding[];
  markdownReport: string;
}
