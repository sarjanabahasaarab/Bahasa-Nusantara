/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gerbang Sertifikasi Terpusat NUSANTARA — Phase 23 & Phase 36–42
 * Target Milestone: Phase 23.16
 */

import * as cp from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Phase23CertificationEngine } from '../build/certification';
import { Phase23AggregationResult } from '../build/types';
import {
  HasilValidasiBundelArtefak,
  validasiIntegritasBundelArtefak,
} from './artifactValidator';

export type StatusSertifikasiFase = 'PASS' | 'FAIL' | 'SKIPPED' | 'NOT_VERIFIED' | 'BLOCKED';
export type IdFaseSertifikasi = '23' | '36' | '37' | '38' | '39' | '40' | '41' | '42';

export interface KriteriaSertifikasi {
  id: string;
  deskripsi: string;
  wajibNative: boolean;
  status: StatusSertifikasiFase;
  catatan?: string;
}

export interface LaporanFaseSertifikasi {
  phase: IdFaseSertifikasi;
  name: string;
  status: StatusSertifikasiFase;
  unitTestStatus: StatusSertifikasiFase;
  nativeVerificationStatus: StatusSertifikasiFase;
  criteria: KriteriaSertifikasi[];
  blockers: string[];
  evidenceFiles: string[];
}

export interface EvidenceJobCI {
  schemaVersion?: number;
  jobId: string;
  phase: string;
  runner: string;
  os: string;
  arch: string;
  targetPlatform?: string;
  status: StatusSertifikasiFase;
  isNativeHardware?: boolean;
  displayMode?: 'xvfb-virtual' | 'win32-desktop' | 'cocoa-desktop' | 'headless' | string;
  unitTestStatus?: StatusSertifikasiFase;
  nativeCheckStatus?: StatusSertifikasiFase;
  toolchains?: Record<string, string | null>;
  details?: Record<string, any>;
  blockers?: string[];
  generatedAt?: string;
}

export interface RingkasanUjiSertifikasi {
  id: string;
  phase: string;
  name: string;
  status: StatusSertifikasiFase;
  runner?: string;
  isNativeExecution?: boolean;
  details: string;
  sourceFile?: string;
}

export interface ReferensiArtefakSertifikasi {
  name: string;
  path: string;
  exists: boolean;
  verified: boolean;
  totalEntries?: number;
  structuralOnlyCount?: number;
  sha256?: string;
}

export interface LaporanGerbangSertifikasiTerpusat {
  schemaVersion: '1.0';
  generatedAt: string;
  commitSha: string;
  workflowRunId: string;
  runner: string;
  targetPlatform: string;
  dryRun: boolean;
  toolchainVersions: Record<string, string | null>;
  testResults: RingkasanUjiSertifikasi[];
  artifactReferences: ReferensiArtefakSertifikasi[];
  checksums: Record<string, string>;
  phases: Record<IdFaseSertifikasi, LaporanFaseSertifikasi>;
  counts: {
    totalPhases: number;
    pass: number;
    fail: number;
    skipped: number;
    notVerified: number;
    blocked: number;
  };
  overallStatus: 'PASS' | 'PARTIAL' | 'BLOCKED' | 'FAIL';
  certificationVerdict: 'CERTIFIED' | 'PARTIAL' | 'BLOCKED' | 'FAILED';
  gatePassed: boolean;
  exitCode: 0 | 1;
  blockers: string[];
  markdownReport: string;
}

export interface InputEvaluasiGerbangSertifikasi {
  commitSha?: string;
  workflowRunId?: string;
  runner?: string;
  targetPlatform?: string;
  dryRun?: boolean;
  toolchainVersions?: Record<string, string | null>;
  phase23Summary?: Phase23AggregationResult | null;
  phase23EvidenceDir?: string;
  demoBundleDir?: string;
  demoBundleValidation?: HasilValidasiBundelArtefak | null;
  jobEvidences?: EvidenceJobCI[];
  jobEvidenceFiles?: string[];
  testSuiteStatuses?: {
    staticChecks?: StatusSertifikasiFase;
    testSuite?: StatusSertifikasiFase;
    qualityGate?: StatusSertifikasiFase;
    releaseTagPolicyBlocked?: boolean;
  };
}

export const PHASE_METADATA_REGISTRY: ReadonlyArray<{ id: IdFaseSertifikasi; name: string }> = [
  { id: '23', name: 'Build System & Desktop Distribution' },
  { id: '36', name: 'Desktop GUI Framework' },
  { id: '37', name: 'Mobile Framework' },
  { id: '38', name: 'Native Device API' },
  { id: '39', name: 'Mobile Networking' },
  { id: '40', name: 'Mobile Application Distribution' },
  { id: '41', name: 'Store Publishing & Digital Signing' },
  { id: '42', name: 'OTA Updates & Secure Update System' },
];

const ALL_STATUSES: ReadonlyArray<StatusSertifikasiFase> = [
  'PASS',
  'FAIL',
  'SKIPPED',
  'NOT_VERIFIED',
  'BLOCKED',
];

function isValidStatus(v: any): v is StatusSertifikasiFase {
  return ALL_STATUSES.includes(v);
}

function probeCmdVersion(bin: string, args: string[]): string | null {
  try {
    const r = cp.spawnSync(bin, args, { encoding: 'utf-8', timeout: 3000, shell: false });
    const txt = (r.stdout || r.stderr || '').trim();
    if (r.status === 0 && txt) {
      return txt.split(/\r?\n/)[0].trim();
    }
  } catch {
    // Abaikan jika perintah tidak ada
  }
  return null;
}

export function deteksiVersiToolchainHost(): Record<string, string | null> {
  return {
    node: process.version || null,
    npm: probeCmdVersion('npm', ['--version']),
    openssl: probeCmdVersion('openssl', ['version']),
    clang: probeCmdVersion('clang', ['--version']),
    lld: probeCmdVersion('ld.lld', ['--version']),
    llc: probeCmdVersion('llc', ['--version']),
    aarch64CrossGcc: probeCmdVersion('aarch64-linux-gnu-gcc', ['--version']),
    xvfbRun: fs.existsSync('/usr/bin/xvfb-run') ? 'installed (/usr/bin/xvfb-run)' : null,
    pkgConfigGtk3: probeCmdVersion('pkg-config', ['--modversion', 'gtk+-3.0']),
    java: probeCmdVersion('java', ['-version']),
    gradle: probeCmdVersion('gradle', ['--version']),
    adb: probeCmdVersion('adb', ['--version']),
    apksigner: probeCmdVersion('apksigner', ['version']),
    bundletool: process.env.BUNDLETOOL_JAR && fs.existsSync(process.env.BUNDLETOOL_JAR) ? 'configured' : null,
    androidSdkRoot:
      process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)
        ? process.env.ANDROID_HOME
        : process.env.ANDROID_SDK_ROOT && fs.existsSync(process.env.ANDROID_SDK_ROOT)
        ? process.env.ANDROID_SDK_ROOT
        : null,
    kvmDevice: fs.existsSync('/dev/kvm') ? 'available (/dev/kvm)' : null,
    xcodebuild: process.platform === 'darwin' ? probeCmdVersion('xcodebuild', ['-version']) : null,
    codesign: process.platform === 'darwin' && fs.existsSync('/usr/bin/codesign') ? 'installed (/usr/bin/codesign)' : null,
  };
}

function sha256FileIfExists(p?: string): string | undefined {
  if (!p || !fs.existsSync(p) || !fs.statSync(p).isFile()) return undefined;
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function computeWorstStatus(statuses: StatusSertifikasiFase[]): StatusSertifikasiFase {
  if (statuses.includes('FAIL')) return 'FAIL';
  if (statuses.includes('BLOCKED')) return 'BLOCKED';
  if (statuses.includes('NOT_VERIFIED')) return 'NOT_VERIFIED';
  if (statuses.includes('SKIPPED')) return 'SKIPPED';
  if (statuses.length > 0 && statuses.every((s) => s === 'PASS')) return 'PASS';
  return 'NOT_VERIFIED';
}

function readJsonSafe<T>(filePath?: string): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function readAllJobEvidencesFromDir(dirPath?: string): { evidences: EvidenceJobCI[]; files: string[]; corruptFiles: string[] } {
  const evidences: EvidenceJobCI[] = [];
  const files: string[] = [];
  const corruptFiles: string[] = [];
  if (!dirPath || !fs.existsSync(dirPath)) {
    return { evidences, files, corruptFiles };
  }
  const walk = (cur: string) => {
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile() && ent.name.endsWith('.json')) {
        files.push(full);
        const parsed = readJsonSafe<EvidenceJobCI>(full);
        if (parsed && typeof parsed === 'object' && parsed.jobId && isValidStatus(parsed.status)) {
          evidences.push(parsed);
        } else {
          corruptFiles.push(full);
        }
      }
    }
  };
  walk(path.resolve(dirPath));
  return { evidences, files, corruptFiles };
}

/**
 * Mengevaluasi Gerbang Sertifikasi Terpusat untuk Phase 23 dan Phase 36–42.
 * Aturan ketat:
 * - FAIL selalu menggagalkan gerbang (exitCode = 1).
 * - NOT_VERIFIED, SKIPPED, dan BLOCKED TIDAK PERNAH dihitung PASS.
 * - PARTIAL BUKAN full pass (gatePassed = false, exitCode = 1).
 * - Status akhir hanya PASS/CERTIFIED bila SELURUH kriteria native & unit Phase 23 + 36–42 benar-benar PASS.
 */
export function evaluasiGerbangSertifikasi(
  input: InputEvaluasiGerbangSertifikasi = {}
): LaporanGerbangSertifikasiTerpusat {
  const generatedAt = new Date().toISOString();
  const commitSha = input.commitSha || process.env.GITHUB_SHA || 'unavailable-no-git-metadata';
  const workflowRunId = input.workflowRunId || process.env.GITHUB_RUN_ID || 'local-run';
  const targetPlatform = input.targetPlatform || `${process.platform}-${process.arch}`;
  const runner = input.runner || process.env.RUNNER_OS || targetPlatform;
  const dryRun = Boolean(input.dryRun);
  const toolchainVersions = input.toolchainVersions || deteksiVersiToolchainHost();

  const jobEvidences = [...(input.jobEvidences || [])];
  const jobEvidenceFiles = [...(input.jobEvidenceFiles || [])];

  // 1. Validasi Demo Terpadu Artifacts (jika direktori diberikan / ada)
  const demoDir = input.demoBundleDir;
  let demoValidation: HasilValidasiBundelArtefak | null = input.demoBundleValidation ?? null;
  if (!demoValidation && demoDir && fs.existsSync(demoDir)) {
    demoValidation = validasiIntegritasBundelArtefak(demoDir, {
      strictStructuralSeparation: true,
      minimumArtifacts: 1,
    });
  }

  // 2. Kumpulkan Phase 23 Aggregation Summary
  let p23Summary: Phase23AggregationResult | null = input.phase23Summary ?? null;
  if (!p23Summary && input.phase23EvidenceDir && fs.existsSync(input.phase23EvidenceDir)) {
    p23Summary = Phase23CertificationEngine.aggregateEvidence(input.phase23EvidenceDir, {
      baseDir: path.dirname(path.resolve(input.phase23EvidenceDir)),
    });
  }

  const checksums: Record<string, string> = {};
  const artifactReferences: ReferensiArtefakSertifikasi[] = [];
  const testResults: RingkasanUjiSertifikasi[] = [];
  const globalBlockers: string[] = [];

  if (demoValidation) {
    if (demoValidation.sha256Manifest) checksums['artifacts/demo-terpadu/manifest.json'] = demoValidation.sha256Manifest;
    if (demoValidation.sha256SumsFile) checksums['artifacts/demo-terpadu/SHA256SUMS'] = demoValidation.sha256SumsFile;
    artifactReferences.push({
      name: 'demo-terpadu-bundle',
      path: demoValidation.direktori,
      exists: demoValidation.manifestAda && demoValidation.sha256SumsAda,
      verified: demoValidation.valid,
      totalEntries: demoValidation.totalManifest,
      structuralOnlyCount: demoValidation.jumlahStruktural,
      sha256: demoValidation.sha256SumsFile,
    });
    testResults.push({
      id: 'demo-terpadu-integrity',
      phase: '23,36-42',
      name: 'Integritas Artefak & SHA256SUMS Demo Terpadu',
      status: demoValidation.valid ? 'PASS' : 'FAIL',
      runner,
      isNativeExecution: false,
      details: demoValidation.valid
        ? `${demoValidation.totalManifest} artefak tervalidasi SHA-256 & bebas traversal (${demoValidation.jumlahStruktural} struktural, ${demoValidation.jumlahNativeBinary} native).`
        : `Temuan integritas artefak: ${demoValidation.temuan.map((t) => `[${t.kode}] ${t.pesan}`).join('; ')}`,
    });
    if (!demoValidation.valid) {
      globalBlockers.push(
        `Demo terpadu gagal validasi integritas: ${demoValidation.temuan.map((t) => t.kode).join(', ')}`
      );
    }
  } else if (demoDir) {
    artifactReferences.push({
      name: 'demo-terpadu-bundle',
      path: demoDir,
      exists: false,
      verified: false,
    });
    testResults.push({
      id: 'demo-terpadu-integrity',
      phase: '23,36-42',
      name: 'Integritas Artefak & SHA256SUMS Demo Terpadu',
      status: 'NOT_VERIFIED',
      runner,
      isNativeExecution: false,
      details: `Bundel demo terpadu tidak ditemukan di '${demoDir}'.`,
    });
  }

  // Record top-level CI steps if provided
  if (input.testSuiteStatuses?.staticChecks) {
    testResults.push({
      id: 'ci-static-checks',
      phase: '23,36-42',
      name: 'Static Checks & TypeScript Lint',
      status: input.testSuiteStatuses.staticChecks,
      runner,
      isNativeExecution: false,
      details: `Status static-checks: ${input.testSuiteStatuses.staticChecks}`,
    });
  }
  if (input.testSuiteStatuses?.testSuite) {
    testResults.push({
      id: 'ci-test-suite',
      phase: '23,36-42',
      name: 'Automated Test Suite (Phase 1–50)',
      status: input.testSuiteStatuses.testSuite,
      runner,
      isNativeExecution: false,
      details: `Status test-suite: ${input.testSuiteStatuses.testSuite}`,
    });
  }
  if (input.testSuiteStatuses?.qualityGate) {
    testResults.push({
      id: 'ci-quality-gate',
      phase: '23,36-42',
      name: 'NUSANTARA Quality Gate',
      status: input.testSuiteStatuses.qualityGate,
      runner,
      isNativeExecution: false,
      details: `Status quality-gate: ${input.testSuiteStatuses.qualityGate}`,
    });
  }

  for (const ev of jobEvidences) {
    testResults.push({
      id: ev.jobId,
      phase: ev.phase,
      name: `Job CI: ${ev.jobId} (${ev.os}/${ev.arch})`,
      status: ev.status,
      runner: ev.runner,
      isNativeExecution: Boolean(ev.isNativeHardware),
      details: ev.blockers && ev.blockers.length > 0 ? ev.blockers.join('; ') : `Mode=${ev.displayMode || 'standard'}, status=${ev.status}`,
    });
  }

  const findJobs = (prefixOrMatch: string): EvidenceJobCI[] =>
    jobEvidences.filter((j) => j.jobId.includes(prefixOrMatch) || j.phase.split(',').includes(prefixOrMatch));

  const phases = {} as Record<IdFaseSertifikasi, LaporanFaseSertifikasi>;

  // ---- PHASE 23: Build System & Desktop Distribution (6-Target Matrix) ----
  {
    const criteria: KriteriaSertifikasi[] = [];
    const blockers: string[] = [];
    let unitStatus: StatusSertifikasiFase =
      input.testSuiteStatuses?.testSuite || (demoValidation?.valid ? 'PASS' : 'NOT_VERIFIED');
    let nativeStatus: StatusSertifikasiFase = 'NOT_VERIFIED';

    if (p23Summary) {
      const counts = p23Summary.counts;
      if (counts.fail > 0 || counts.corrupt > 0 || counts.missing > 0) {
        nativeStatus = 'FAIL';
        blockers.push(
          `Matriks 6 target Phase 23 gagal/korup/hilang (FAIL=${counts.fail}, CORRUPT=${counts.corrupt}, MISSING=${counts.missing}).`
        );
      } else if (counts.notVerified > 0 || counts.pass < counts.totalRequired) {
        nativeStatus = 'NOT_VERIFIED';
        blockers.push(
          `Baru ${counts.pass}/${counts.totalRequired} target desktop terverifikasi native; ${counts.notVerified} target masih NOT_VERIFIED.`
        );
      } else {
        nativeStatus = 'PASS';
      }
      for (const [targetName, ev] of Object.entries(p23Summary.targets)) {
        const st: StatusSertifikasiFase =
          !ev ? 'FAIL' : ev.verificationStatus === 'PASS' ? 'PASS' : ev.verificationStatus === 'FAIL' ? 'FAIL' : 'NOT_VERIFIED';
        criteria.push({
          id: `p23-target-${targetName}`,
          deskripsi: `Native compile, execute sentinel & verify-dist target ${targetName}`,
          wajibNative: true,
          status: st,
          catatan: ev?.reason || (st === 'PASS' ? `${ev?.compiler}/${ev?.linker} (${ev?.executionMode})` : 'Evidence hilang'),
        });
      }
      testResults.push({
        id: 'phase23-six-target-matrix',
        phase: '23',
        name: 'Phase 23 Six-Target Native Matrix',
        status: nativeStatus,
        runner,
        isNativeExecution: nativeStatus === 'PASS',
        details: `PASS=${counts.pass}/6, NOT_VERIFIED=${counts.notVerified}, FAIL=${counts.fail}, MISSING=${counts.missing}, CORRUPT=${counts.corrupt}`,
      });
    } else {
      blockers.push('Ringkasan sertifikasi 6 target Phase 23 (certification-summary.json / evidence) belum tersedia.');
      criteria.push({
        id: 'p23-six-target-matrix',
        deskripsi: 'Agregasi 6 target desktop native (Windows/Linux/macOS x86_64 & ARM64)',
        wajibNative: true,
        status: 'NOT_VERIFIED',
        catatan: 'Evidence 6 target tidak ditemukan.',
      });
    }

    if (demoValidation && !demoValidation.valid) {
      unitStatus = 'FAIL';
      blockers.push('Validasi bundel artefak demo terpadu gagal.');
    }

    const phaseStatus = computeWorstStatus([unitStatus, nativeStatus]);
    phases['23'] = {
      phase: '23',
      name: 'Build System & Desktop Distribution',
      status: phaseStatus,
      unitTestStatus: unitStatus,
      nativeVerificationStatus: nativeStatus,
      criteria,
      blockers,
      evidenceFiles: [...jobEvidenceFiles.filter((f) => f.includes('phase23'))],
    };
  }

  // ---- PHASE 36: Desktop GUI Framework ----
  {
    const guiJobs = findJobs('phase36');
    const blockers: string[] = [];
    const criteria: KriteriaSertifikasi[] = [];

    const unitJobStatuses = guiJobs.map((j) => j.unitTestStatus || j.status);
    let unitStatus: StatusSertifikasiFase =
      unitJobStatuses.length > 0
        ? computeWorstStatus(unitJobStatuses)
        : input.testSuiteStatuses?.testSuite || (demoValidation?.valid ? 'PASS' : 'NOT_VERIFIED');

    const xvfbJob = guiJobs.find((j) => j.os === 'Linux' || j.jobId.includes('linux'));
    const winJob = guiJobs.find((j) => j.os === 'Windows' || j.jobId.includes('windows'));
    const macJob = guiJobs.find((j) => j.os === 'macOS' || j.jobId.includes('macos'));

    const xvfbStatus: StatusSertifikasiFase = xvfbJob ? xvfbJob.status : 'NOT_VERIFIED';
    criteria.push({
      id: 'p36-linux-xvfb-gtk3',
      deskripsi: 'Linux Xvfb + GTK3 rendering, window lifecycle & event probe (virtual headless)',
      wajibNative: true,
      status: xvfbStatus,
      catatan: xvfbJob ? `DisplayMode=${xvfbJob.displayMode || 'xvfb-virtual'}` : 'Job CI phase36 Linux Xvfb belum dijalankan.',
    });

    const winStatus: StatusSertifikasiFase = winJob ? winJob.status : 'NOT_VERIFIED';
    criteria.push({
      id: 'p36-windows-win32',
      deskripsi: 'Windows Win32 / WebView2 window lifecycle verification',
      wajibNative: true,
      status: winStatus,
      catatan: winJob ? (winJob.blockers?.join('; ') || `DisplayMode=${winJob.displayMode}`) : 'Job CI phase36 Windows belum dijalankan.',
    });

    const macStatus: StatusSertifikasiFase = macJob ? macJob.status : 'NOT_VERIFIED';
    criteria.push({
      id: 'p36-macos-cocoa',
      deskripsi: 'macOS Cocoa NSWindow lifecycle verification',
      wajibNative: true,
      status: macStatus,
      catatan: macJob ? (macJob.blockers?.join('; ') || `DisplayMode=${macJob.displayMode}`) : 'Job CI phase36 macOS belum dijalankan.',
    });

    // Separate Xvfb headless tests from physical hardware display tests
    const hasPhysicalDisplay = guiJobs.some((j) => j.isNativeHardware === true && j.status === 'PASS');
    criteria.push({
      id: 'p36-physical-display-hardware',
      deskripsi: 'Rendering GUI & input interaktif pada layar desktop fisik (non-headless)',
      wajibNative: true,
      status: hasPhysicalDisplay ? 'PASS' : 'NOT_VERIFIED',
      catatan: hasPhysicalDisplay
        ? 'Perangkat layar fisik terverifikasi.'
        : 'Pengujian CI menggunakan Xvfb virtual/headless; uji display desktop fisik belum dijalankan.',
    });

    const nativeStatus = computeWorstStatus(criteria.map((c) => c.status));
    if (nativeStatus !== 'PASS') {
      for (const c of criteria) {
        if (c.status !== 'PASS') blockers.push(`[${c.id}] ${c.status}: ${c.catatan}`);
      }
    }

    phases['36'] = {
      phase: '36',
      name: 'Desktop GUI Framework',
      status: computeWorstStatus([unitStatus, nativeStatus]),
      unitTestStatus: unitStatus,
      nativeVerificationStatus: nativeStatus,
      criteria,
      blockers,
      evidenceFiles: jobEvidenceFiles.filter((f) => f.includes('phase36')),
    };
  }

  // Gather mobile SDK job evidences (Android & Apple)
  const androidJob = jobEvidences.find((j) => j.jobId.includes('android'));
  const appleJob = jobEvidences.find((j) => j.jobId.includes('apple') || j.jobId.includes('ios'));
  const tlsOtaJob = jobEvidences.find((j) => j.jobId.includes('tls-ota') || j.jobId.includes('phase39'));

  // ---- PHASE 37: Mobile Framework ----
  {
    const androidCompileOk: StatusSertifikasiFase =
      androidJob?.details?.apkCompiledWithDex === true && androidJob?.details?.emulatorBooted === true
        ? 'PASS'
        : androidJob?.status === 'FAIL'
        ? 'FAIL'
        : 'NOT_VERIFIED';
    const appleCompileOk: StatusSertifikasiFase =
      appleJob?.details?.machOCompiled === true && appleJob?.details?.simulatorLaunched === true
        ? 'PASS'
        : appleJob?.status === 'FAIL'
        ? 'FAIL'
        : 'NOT_VERIFIED';
    const unitStatus: StatusSertifikasiFase =
      androidJob?.unitTestStatus || appleJob?.unitTestStatus || input.testSuiteStatuses?.testSuite || 'NOT_VERIFIED';

    const criteria: KriteriaSertifikasi[] = [
      {
        id: 'p37-android-gradle-emulator',
        deskripsi: 'Kompilasi APK dengan Android SDK (Gradle/D8) & eksekusi di Android Emulator',
        wajibNative: true,
        status: androidCompileOk,
        catatan: androidJob
          ? `apkCompiledWithDex=${Boolean(androidJob.details?.apkCompiledWithDex)}, emulatorBooted=${Boolean(androidJob.details?.emulatorBooted)}`
          : 'Job CI phase37-42-android-sdk belum tersedia.',
      },
      {
        id: 'p37-ios-xcode-simulator',
        deskripsi: 'Kompilasi .app Mach-O via xcodebuild & peluncuran pada iOS Simulator',
        wajibNative: true,
        status: appleCompileOk,
        catatan: appleJob
          ? `machOCompiled=${Boolean(appleJob.details?.machOCompiled)}, simulatorLaunched=${Boolean(appleJob.details?.simulatorLaunched)}`
          : 'Job CI phase37-42-apple belum tersedia.',
      },
    ];
    const nativeStatus = computeWorstStatus(criteria.map((c) => c.status));
    const blockers = criteria.filter((c) => c.status !== 'PASS').map((c) => `[${c.id}] ${c.status}: ${c.catatan}`);

    phases['37'] = {
      phase: '37',
      name: 'Mobile Framework',
      status: computeWorstStatus([unitStatus, nativeStatus]),
      unitTestStatus: unitStatus,
      nativeVerificationStatus: nativeStatus,
      criteria,
      blockers,
      evidenceFiles: jobEvidenceFiles.filter((f) => f.includes('android') || f.includes('apple')),
    };
  }

  // ---- PHASE 38: Native Device API ----
  {
    const unitStatus: StatusSertifikasiFase =
      androidJob?.unitTestStatus || appleJob?.unitTestStatus || input.testSuiteStatuses?.testSuite || 'NOT_VERIFIED';
    const hwVerified: StatusSertifikasiFase =
      androidJob?.details?.physicalDeviceHardwareVerified === true || appleJob?.details?.physicalDeviceHardwareVerified === true
        ? 'PASS'
        : androidJob?.status === 'FAIL' || appleJob?.status === 'FAIL'
        ? 'FAIL'
        : 'NOT_VERIFIED';
    const criteria: KriteriaSertifikasi[] = [
      {
        id: 'p38-device-hardware',
        deskripsi: 'Verifikasi kamera, GPS GNSS, IMU, BLE & biometrik TEE/Secure Enclave pada perangkat nyata',
        wajibNative: true,
        status: hwVerified,
        catatan:
          hwVerified === 'PASS'
            ? 'Perangkat fisik/sensor nyata terverifikasi.'
            : 'Emulator/kontainer CI tidak memiliki sensor perangkat keras ponsel fisik.',
      },
    ];
    const nativeStatus = computeWorstStatus(criteria.map((c) => c.status));
    const blockers = criteria.filter((c) => c.status !== 'PASS').map((c) => `[${c.id}] ${c.status}: ${c.catatan}`);
    phases['38'] = {
      phase: '38',
      name: 'Native Device API',
      status: computeWorstStatus([unitStatus, nativeStatus]),
      unitTestStatus: unitStatus,
      nativeVerificationStatus: nativeStatus,
      criteria,
      blockers,
      evidenceFiles: jobEvidenceFiles.filter((f) => f.includes('android') || f.includes('apple')),
    };
  }

  // ---- PHASE 39: Mobile Networking ----
  {
    const loopbackTlsStatus: StatusSertifikasiFase =
      tlsOtaJob?.status === 'FAIL'
        ? 'FAIL'
        : tlsOtaJob?.details?.tlsLoopbackStatus && isValidStatus(tlsOtaJob.details.tlsLoopbackStatus)
        ? tlsOtaJob.details.tlsLoopbackStatus
        : tlsOtaJob
        ? tlsOtaJob.status
        : input.testSuiteStatuses?.testSuite || 'NOT_VERIFIED';
    const prodSpkiStatus: StatusSertifikasiFase =
      tlsOtaJob?.status === 'FAIL'
        ? 'FAIL'
        : tlsOtaJob?.details?.nativeSpkiPinningVerified === true
        ? 'PASS'
        : 'NOT_VERIFIED';

    const criteria: KriteriaSertifikasi[] = [
      {
        id: 'p39-loopback-openssl-tls',
        deskripsi: 'Loopback HTTPS OpenSSL X.509 (untrusted CA, expired, SAN mismatch, socket drop, retry, offline queue)',
        wajibNative: false,
        status: loopbackTlsStatus,
        catatan: 'Terpisah tegas sebagai uji TLS loopback OpenSSL, bukan jaringan seluler produksi.',
      },
      {
        id: 'p39-native-spki-cellular',
        deskripsi: 'Pinning SPKI OkHttp/URLSession & BackgroundSession pada perangkat mobile nyata',
        wajibNative: true,
        status: prodSpkiStatus,
        catatan:
          prodSpkiStatus === 'PASS'
            ? 'Native mobile TLS SPKI terverifikasi.'
            : 'Uji OkHttp/URLSession native di perangkat mobile belum dijalankan.',
      },
    ];
    const nativeStatus = computeWorstStatus([prodSpkiStatus, loopbackTlsStatus]);
    const blockers = criteria.filter((c) => c.status !== 'PASS').map((c) => `[${c.id}] ${c.status}: ${c.catatan}`);
    phases['39'] = {
      phase: '39',
      name: 'Mobile Networking',
      status: computeWorstStatus([loopbackTlsStatus, nativeStatus]),
      unitTestStatus: loopbackTlsStatus,
      nativeVerificationStatus: nativeStatus,
      criteria,
      blockers,
      evidenceFiles: jobEvidenceFiles.filter((f) => f.includes('phase39') || f.includes('tls')),
    };
  }

  // ---- PHASE 40: Mobile Application Distribution ----
  {
    const unitStatus: StatusSertifikasiFase =
      androidJob?.unitTestStatus || appleJob?.unitTestStatus || input.testSuiteStatuses?.testSuite || 'NOT_VERIFIED';

    const androidDexStatus: StatusSertifikasiFase =
      androidJob?.details?.apkCompiledWithDex === true &&
      androidJob?.details?.aabBuiltWithBundletool === true &&
      androidJob?.details?.apksignerVerified === true
        ? 'PASS'
        : androidJob?.status === 'FAIL'
        ? 'FAIL'
        : 'NOT_VERIFIED';
    const iosIpaStatus: StatusSertifikasiFase =
      appleJob?.details?.machOCompiled === true &&
      appleJob?.details?.xcarchiveBuilt === true &&
      appleJob?.details?.ipaProduced === true
        ? 'PASS'
        : appleJob?.status === 'FAIL'
        ? 'FAIL'
        : 'NOT_VERIFIED';

    const criteria: KriteriaSertifikasi[] = [
      {
        id: 'p40-android-dex-aab-apksigner',
        deskripsi: 'Kompilasi real APK (classes.dex), real AAB (bundletool), verifikasi apksigner & install emulator',
        wajibNative: true,
        status: androidDexStatus,
        catatan:
          androidDexStatus === 'PASS'
            ? 'APK ber-classes.dex & AAB terverifikasi apksigner.'
            : 'Artefak saat ini hanya kontainer PKZIP struktural (tanpa classes.dex / .aab native / apksigner pass).',
      },
      {
        id: 'p40-ios-xcarchive-macho-ipa',
        deskripsi: 'Arsip .xcarchive berisi biner Mach-O .app & ekspor .ipa via xcodebuild',
        wajibNative: true,
        status: iosIpaStatus,
        catatan:
          iosIpaStatus === 'PASS'
            ? '.xcarchive Mach-O & .ipa terverifikasi.'
            : 'Belum ada .app Mach-O maupun .ipa nyata (baru Info.plist struktural).',
      },
    ];
    const nativeStatus = computeWorstStatus(criteria.map((c) => c.status));
    const blockers = criteria.filter((c) => c.status !== 'PASS').map((c) => `[${c.id}] ${c.status}: ${c.catatan}`);
    phases['40'] = {
      phase: '40',
      name: 'Mobile Application Distribution',
      status: computeWorstStatus([unitStatus, nativeStatus]),
      unitTestStatus: unitStatus,
      nativeVerificationStatus: nativeStatus,
      criteria,
      blockers,
      evidenceFiles: jobEvidenceFiles.filter((f) => f.includes('android') || f.includes('apple')),
    };
  }

  // ---- PHASE 41: Store Publishing & Digital Signing ----
  {
    const unitStatus: StatusSertifikasiFase =
      androidJob?.unitTestStatus || appleJob?.unitTestStatus || input.testSuiteStatuses?.testSuite || 'NOT_VERIFIED';
    const sandboxSignOk: StatusSertifikasiFase =
      androidJob?.details?.ephemeralKeystoreSigned === true && appleJob?.details?.adHocOrDevSigned === true
        ? 'PASS'
        : androidJob?.status === 'FAIL' || appleJob?.status === 'FAIL'
        ? 'FAIL'
        : 'NOT_VERIFIED';
    const productionPublishPolicy: StatusSertifikasiFase =
      input.testSuiteStatuses?.releaseTagPolicyBlocked ? 'BLOCKED' : sandboxSignOk;

    const criteria: KriteriaSertifikasi[] = [
      {
        id: 'p41-ephemeral-signing-sandbox',
        deskripsi: 'Penandatanganan native (apksigner/codesign) & validasi metadata unggah sandbox non-produksi',
        wajibNative: true,
        status: sandboxSignOk,
        catatan:
          sandboxSignOk === 'PASS'
            ? 'Signing biner uji non-produksi terverifikasi.'
            : 'Belum menjalankan signing native apksigner & codesign pada APK/IPA terkompilasi.',
      },
      {
        id: 'p41-no-auto-store-publish',
        deskripsi: 'Kebijakan aman: tidak ada auto-publish ke Play Store / App Store produksi',
        wajibNative: false,
        status: input.testSuiteStatuses?.releaseTagPolicyBlocked ? 'BLOCKED' : 'PASS',
        catatan: 'Publikasi produksi tetap memerlukan approval manual eksplisit & kredensial toko.',
      },
    ];
    const nativeStatus = computeWorstStatus([sandboxSignOk, productionPublishPolicy]);
    const blockers = criteria.filter((c) => c.status !== 'PASS').map((c) => `[${c.id}] ${c.status}: ${c.catatan}`);
    phases['41'] = {
      phase: '41',
      name: 'Store Publishing & Digital Signing',
      status: computeWorstStatus([unitStatus, nativeStatus]),
      unitTestStatus: unitStatus,
      nativeVerificationStatus: nativeStatus,
      criteria,
      blockers,
      evidenceFiles: jobEvidenceFiles.filter((f) => f.includes('android') || f.includes('apple')),
    };
  }

  // ---- PHASE 42: OTA Updates & Secure Update System ----
  {
    const otaRegressionStatus: StatusSertifikasiFase =
      tlsOtaJob?.status === 'FAIL'
        ? 'FAIL'
        : tlsOtaJob?.details?.otaRegressionStatus && isValidStatus(tlsOtaJob.details.otaRegressionStatus)
        ? tlsOtaJob.details.otaRegressionStatus
        : tlsOtaJob
        ? tlsOtaJob.status
        : input.testSuiteStatuses?.testSuite || 'NOT_VERIFIED';
    const mobileNativeStoreOta: StatusSertifikasiFase =
      tlsOtaJob?.status === 'FAIL'
        ? 'FAIL'
        : tlsOtaJob?.details?.playCoreAndStoreKitVerified === true
        ? 'PASS'
        : 'NOT_VERIFIED';

    const criteria: KriteriaSertifikasi[] = [
      {
        id: 'p42-ed25519-rotation-rollback',
        deskripsi: 'Ed25519 signing, pencabutan kunci, rotasi multi-generasi, anti-replay, abort parsial & rollback atomik',
        wajibNative: false,
        status: otaRegressionStatus,
        catatan: 'Diperiksa melalui suite regresi test:pembaruan-v42 & loop HTTP OTA.',
      },
      {
        id: 'p42-native-playcore-storekit',
        deskripsi: 'Integrasi Play Core In-App Updates SDK, StoreKit iOS, & CDN HTTPS pada perangkat nyata',
        wajibNative: true,
        status: mobileNativeStoreOta,
        catatan:
          mobileNativeStoreOta === 'PASS'
            ? 'Play Core / StoreKit / CDN nyata terverifikasi.'
            : 'Belum dieksekusi terhadap Play Core SDK, StoreKit, & CDN jarak jauh di perangkat fisik.',
      },
    ];
    const nativeStatus = computeWorstStatus([otaRegressionStatus, mobileNativeStoreOta]);
    const blockers = criteria.filter((c) => c.status !== 'PASS').map((c) => `[${c.id}] ${c.status}: ${c.catatan}`);
    phases['42'] = {
      phase: '42',
      name: 'OTA Updates & Secure Update System',
      status: computeWorstStatus([otaRegressionStatus, nativeStatus]),
      unitTestStatus: otaRegressionStatus,
      nativeVerificationStatus: nativeStatus,
      criteria,
      blockers,
      evidenceFiles: jobEvidenceFiles.filter((f) => f.includes('phase39') || f.includes('ota')),
    };
  }

  // Aggregate counts across all 8 required phases
  let pass = 0;
  let fail = 0;
  let skipped = 0;
  let notVerified = 0;
  let blocked = 0;

  for (const meta of PHASE_METADATA_REGISTRY) {
    const p = phases[meta.id];
    if (p.status === 'PASS') pass++;
    else if (p.status === 'FAIL') fail++;
    else if (p.status === 'SKIPPED') skipped++;
    else if (p.status === 'BLOCKED') blocked++;
    else notVerified++;

    for (const b of p.blockers) {
      globalBlockers.push(`[Phase ${meta.id}] ${b}`);
    }
  }

  // Enforce strict rule: FAIL fails gate; NOT_VERIFIED / SKIPPED / BLOCKED NEVER count as PASS; PARTIAL != full pass
  const anyDemoFail = Boolean(demoValidation && !demoValidation.valid);
  const anyTopStepFail = Object.values(input.testSuiteStatuses || {}).some((s) => s === 'FAIL');
  const anyTopStepBlocked = Boolean(input.testSuiteStatuses?.releaseTagPolicyBlocked);

  let overallStatus: LaporanGerbangSertifikasiTerpusat['overallStatus'];
  let certificationVerdict: LaporanGerbangSertifikasiTerpusat['certificationVerdict'];
  let gatePassed = false;

  if (fail > 0 || anyDemoFail || anyTopStepFail) {
    overallStatus = 'FAIL';
    certificationVerdict = 'FAILED';
  } else if (blocked > 0 || anyTopStepBlocked) {
    overallStatus = 'BLOCKED';
    certificationVerdict = 'BLOCKED';
  } else if (
    pass === PHASE_METADATA_REGISTRY.length &&
    notVerified === 0 &&
    skipped === 0 &&
    fail === 0 &&
    blocked === 0
  ) {
    overallStatus = 'PASS';
    certificationVerdict = 'CERTIFIED';
    gatePassed = true;
  } else {
    overallStatus = 'PARTIAL';
    certificationVerdict = 'PARTIAL';
  }

  const exitCode: 0 | 1 = gatePassed ? 0 : 1;

  const md: string[] = [];
  md.push('# Laporan Gerbang Sertifikasi Terpusat NUSANTARA (Phase 23 & Phase 36–42)');
  md.push('');
  md.push(`- **Verdict Sertifikasi:** \`${certificationVerdict}\` (\`overallStatus=${overallStatus}\`, \`gatePassed=${gatePassed}\`, \`exitCode=${exitCode}\`)`);
  md.push(`- **Waktu Evaluasi:** \`${generatedAt}\``);
  md.push(`- **Commit SHA:** \`${commitSha}\` | **Workflow Run ID:** \`${workflowRunId}\` | **Runner:** \`${runner}\` (\`${targetPlatform}\`)`);
  md.push(
    `- **Ringkasan 8 Fase:** PASS=\`${pass}\` | NOT_VERIFIED=\`${notVerified}\` | SKIPPED=\`${skipped}\` | BLOCKED=\`${blocked}\` | FAIL=\`${fail}\``
  );
  md.push('');
  md.push('| Fase | Nama | Unit/Loopback | Native/Hardware/SDK | Status Akhir |');
  md.push('| :---: | :--- | :---: | :---: | :---: |');
  for (const meta of PHASE_METADATA_REGISTRY) {
    const p = phases[meta.id];
    md.push(`| **${p.phase}** | ${p.name} | \`${p.unitTestStatus}\` | \`${p.nativeVerificationStatus}\` | **${p.status}** |`);
  }
  md.push('');
  if (globalBlockers.length > 0) {
    md.push('## Alasan Belum CERTIFIED / Blockers');
    for (const b of globalBlockers) {
      md.push(`- ${b}`);
    }
    md.push('');
  }

  return {
    schemaVersion: '1.0',
    generatedAt,
    commitSha,
    workflowRunId,
    runner,
    targetPlatform,
    dryRun,
    toolchainVersions,
    testResults,
    artifactReferences,
    checksums,
    phases,
    counts: {
      totalPhases: PHASE_METADATA_REGISTRY.length,
      pass,
      fail,
      skipped,
      notVerified,
      blocked,
    },
    overallStatus,
    certificationVerdict,
    gatePassed,
    exitCode,
    blockers: globalBlockers,
    markdownReport: md.join('\n'),
  };
}

/**
 * Memuat file ringkasan Phase 23, direktori evidence job CI, dan bundel demo terpadu dari disk,
 * lalu mengevaluasi Gerbang Sertifikasi Terpusat secara deterministik.
 */
export function muatDanEvaluasiDariDisk(options: {
  phase23SummaryPath?: string;
  phase23EvidenceDir?: string;
  demoBundleDir?: string;
  evidenceDir?: string;
  commitSha?: string;
  workflowRunId?: string;
  runner?: string;
  dryRun?: boolean;
}): { report: LaporanGerbangSertifikasiTerpusat; corruptEvidenceFiles: string[] } {
  const phase23Summary = readJsonSafe<Phase23AggregationResult>(options.phase23SummaryPath);
  const { evidences, files, corruptFiles } = readAllJobEvidencesFromDir(options.evidenceDir);

  if (options.phase23SummaryPath && fs.existsSync(options.phase23SummaryPath)) {
    const sha = sha256FileIfExists(options.phase23SummaryPath);
    if (sha) files.push(options.phase23SummaryPath);
  }

  const report = evaluasiGerbangSertifikasi({
    commitSha: options.commitSha,
    workflowRunId: options.workflowRunId,
    runner: options.runner,
    dryRun: options.dryRun,
    phase23Summary,
    phase23EvidenceDir: options.phase23EvidenceDir,
    demoBundleDir: options.demoBundleDir,
    jobEvidences: evidences,
    jobEvidenceFiles: files,
  });

  if (corruptFiles.length > 0) {
    report.blockers.push(`Berkas evidence job CI rusak/tidak valid: ${corruptFiles.join(', ')}`);
    report.overallStatus = 'FAIL';
    report.certificationVerdict = 'FAILED';
    report.gatePassed = false;
    report.exitCode = 1;
  }

  return { report, corruptEvidenceFiles: corruptFiles };
}
