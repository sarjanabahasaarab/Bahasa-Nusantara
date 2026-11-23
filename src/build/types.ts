/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM & DESKTOP DISTRIBUTION (Phase 23)
 * Definisi Tipe Kanonik, Matriks 6 Target, Arsip, Installer, Verifikasi & Sertifikasi
 */

import { BinaryMetadata } from '../compiler/executable/binary-metadata';

export const DESKTOP_CANONICAL_TARGETS = [
  'windows-x86_64',
  'windows-arm64',
  'linux-x86_64',
  'linux-arm64',
  'macos-x86_64',
  'macos-arm64',
] as const;

export type CanonicalDesktopTarget = (typeof DESKTOP_CANONICAL_TARGETS)[number];

export type LinkingMode = 'auto' | 'static' | 'dynamic';

export type NativeBuildStatusCode =
  | 'BERHASIL'
  | 'TARGET_TIDAK_DIDUKUNG'
  | 'TOOLCHAIN_TIDAK_TERSEDIA'
  | 'GALAT_KOMPILASI'
  | 'GALAT_LINKING'
  | 'GALAT_VERIFIKASI_BINER'
  | 'GALAT_EKSEKUSI';

export interface ArchiveEntryInput {
  name: string;
  content: string | Uint8Array;
  mode?: number;
  mtime?: number;
}

export interface Sha256SumEntry {
  sha256: string;
  filename: string;
}

export interface TargetCapabilityReport {
  canonicalTarget?: CanonicalDesktopTarget;
  legacyTargetName: string;
  triple: string;
  os: 'windows' | 'linux' | 'darwin' | 'unknown';
  arch: 'x86_64' | 'aarch64' | 'unknown';
  objectFormat: 'ELF' | 'Mach-O' | 'COFF';
  executableExtension: string;
  isCross: boolean;
  supported: boolean;
  canCompileAndLink: boolean;
  recommendedRunner: string;
  sdkName: string;
  sdkAvailable: boolean;
  linkerProbeVerified: boolean;
  compilerName: string;
  compilerAvailable: boolean;
  compilerVersion: string;
  compilerCommand: string;
  linkerName: string;
  linkerAvailable: boolean;
  linkerVersion: string;
  lldAvailable: boolean;
  emulatorAvailable: boolean;
  emulatorName?: string;
  missingRequirements: string[];
  diagnostics: string[];
}

export interface NativeBuildOptions {
  sourceFilePath?: string;
  sourceCode?: string;
  appName: string;
  target?: string;
  outputDirectory: string;
  optLevel?: 'O0' | 'O1' | 'O2' | 'O3' | 'Os';
  linkingMode?: LinkingMode;
  debug?: boolean;
  strip?: boolean;
  verifyExecution?: boolean;
  expectedSentinel?: string;
  customToolchainPath?: string;
}

export interface NativeBuildResult {
  success: boolean;
  statusCode: NativeBuildStatusCode;
  target: CanonicalDesktopTarget | string;
  targetTriple: string;
  isCross: boolean;
  compiler: string;
  compilerVersion: string;
  linker: string;
  linkerVersion: string;
  llvmIRPath?: string;
  llvmIRSha256?: string;
  objectPath?: string;
  objectSha256?: string;
  executablePath?: string;
  executableSha256?: string;
  binaryMetadata?: BinaryMetadata;
  executionMode: 'native' | 'qemu-user' | 'rosetta2' | 'not-executed';
  executionExitCode: number | null;
  executionStdout?: string;
  executionSentinelMatched: boolean;
  capability: TargetCapabilityReport;
  diagnostics: string[];
}

export interface PackagedArtifactInfo {
  canonicalTarget: CanonicalDesktopTarget;
  legacyTargetName: string;
  format: 'zip' | 'tar.gz';
  filename: string;
  filePath: string;
  sizeBytes: number;
  sha256: string;
}

export interface DesktopPackageOptions {
  appName: string;
  appVersion: string;
  target: string;
  mode: 'debug' | 'release';
  packageKind: 'native' | 'script-launcher';
  outputDirectory: string;
  nativeBuildResult?: NativeBuildResult;
  linkingMode?: LinkingMode;
  reproducible?: boolean;
  includeInstallers?: boolean;
  licenseText?: string;
  readmeText?: string;
}

export interface DesktopPackageResult {
  success: boolean;
  canonicalTarget: CanonicalDesktopTarget;
  legacyTargetName: string;
  stagingDirectory: string;
  artifacts: PackagedArtifactInfo[];
  manifestPath?: string;
  sha256sumsPath?: string;
  sha256sums: string;
  installerFiles: string[];
  diagnostics: string[];
}

export interface LauncherMatrixOptions {
  outputDirectory: string;
  targets: string[];
  mode: 'debug' | 'release';
  reproducible?: boolean;
  appVersion: string;
  appName?: string;
}

export interface LauncherMatrixResult {
  success: boolean;
  artifacts: PackagedArtifactInfo[];
  manifestPath: string;
  sha256sumsPath: string;
  sha256sums: string;
  diagnostics: string[];
}

export interface Phase23EvidenceActionResult {
  status: 'PASS' | 'FAIL' | 'NOT_RUN' | 'NOT_VERIFIED';
  exitCode: number | null;
  details?: string;
}

export interface Phase23TargetEvidence {
  schemaVersion: '2.0';
  phase: 'Phase 23';
  generatedAt: string;
  target: CanonicalDesktopTarget;
  targetTriple: string;
  triple?: string;
  hostOS: string;
  hostOs?: string;
  hostArchitecture: string;
  hostArch?: string;
  recommendedRunner?: string;
  isCross?: boolean;
  compiler: string;
  compilerVersion: string;
  compilerDetails?: {
    name: string;
    available: boolean;
    command: string;
  };
  linker: string;
  linkerVersion: string;
  linkerDetails?: {
    name: string;
    lldAvailable: boolean;
  };
  emulator?: {
    used: boolean;
    name?: string;
  };
  sdk?: {
    name: string;
    available: boolean;
    linkerProbeVerified: boolean;
    missingRequirements: string[];
  };
  llvmIR?: {
    path?: string;
    sha256?: string;
  };
  objectFile?: {
    path?: string;
    sha256?: string;
  };
  objectFiles?: string[];
  objectHashes?: Record<string, string>;
  binaryPath?: string;
  binaryFormat?: string;
  binaryArchitecture?: string;
  binarySha256?: string;
  binaryMetadata?: BinaryMetadata;
  dependencyValidation?: {
    checked: boolean;
    passed: boolean;
    libraries: string[];
    issues: string[];
  };
  executable?: {
    path?: string;
    sha256?: string;
    format?: string;
    architecture?: string;
  };
  buildExitCode?: number;
  executionMode: 'native' | 'qemu-user' | 'rosetta2' | 'not-executed';
  executionExitCode?: number | null;
  executionSentinel?: string;
  execution?: {
    required: boolean;
    executed: boolean;
    mode: 'native' | 'qemu-user' | 'rosetta2' | 'not-executed';
    sentinelExpected: string;
    sentinelMatched: boolean;
  };
  distributionManifest?: Record<string, any> | null;
  archiveSha256?: string;
  installResult?: Phase23EvidenceActionResult;
  uninstallResult?: Phase23EvidenceActionResult;
  verificationStatus: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  status?: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  statusCode?: NativeBuildStatusCode | string;
  reason?: string;
  diagnostics?: string[];
}

export interface Phase23AuditFinding {
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
  targets: Partial<Record<CanonicalDesktopTarget, Phase23TargetEvidence | null>>;
  findings: Phase23AuditFinding[];
  markdownReport: string;
}

export interface DistributionE2EVerifyOptions {
  target: string;
  outDir: string;
  failOnMissingClang?: boolean;
  appName?: string;
  appVersion?: string;
}

export interface DistributionE2EVerifyReport {
  targetDiminta: string;
  targetTerdeteksi: CanonicalDesktopTarget;
  triple: string;
  statusAkhir: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  exitCode: 0 | 1;
  hasilManifest: 'PASS' | 'FAIL' | 'NOT_RUN';
  hasilSha256: 'PASS' | 'FAIL' | 'NOT_RUN';
  hasilEkstraksiArsip: 'PASS' | 'FAIL' | 'NOT_RUN';
  hasilDependency: 'PASS' | 'FAIL' | 'NOT_RUN';
  hasilSandboxInstall: 'PASS' | 'FAIL' | 'NOT_RUN' | 'NOT_VERIFIED';
  hasilEksekusiInstalled: 'PASS' | 'FAIL' | 'NOT_RUN' | 'NOT_VERIFIED';
  hasilUpgrade: 'PASS' | 'FAIL' | 'NOT_RUN' | 'NOT_VERIFIED';
  hasilPenolakanTamper: 'PASS' | 'FAIL' | 'NOT_RUN' | 'NOT_VERIFIED';
  hasilSandboxUninstall: 'PASS' | 'FAIL' | 'NOT_RUN' | 'NOT_VERIFIED';
  hasilSisaUninstall: 'PASS' | 'FAIL' | 'NOT_RUN' | 'NOT_VERIFIED';
  reason?: string;
  daftarError: string[];
  artifacts: PackagedArtifactInfo[];
}
