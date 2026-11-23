/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLI Gerbang Sertifikasi Terpusat & Validasi Integritas Artefak NUSANTARA (Phase 23 & Phase 36–42)
 * Pemakaian:
 *   npx tsx scripts/certification-gate.ts verify-artifacts --dir artifacts/demo-terpadu [--min-artifacts 10]
 *   npx tsx scripts/certification-gate.ts probe-toolchains --out artifacts/certification/toolchains.json
 *   npx tsx scripts/certification-gate.ts evaluate [opsi]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  deteksiVersiToolchainHost,
  StatusSertifikasiFase,
  muatDanEvaluasiDariDisk,
  validasiIntegritasBundelArtefak,
} from '../src/cicd';

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function cmdVerifyArtifacts(args: string[]): number {
  const dir = path.resolve(getArg(args, '--dir') || 'artifacts/demo-terpadu');
  const minRaw = getArg(args, '--min-artifacts');
  const minArtifacts = minRaw ? Number(minRaw) : 10;

  const res = validasiIntegritasBundelArtefak(dir, {
    strictStructuralSeparation: true,
    minimumArtifacts: Number.isFinite(minArtifacts) ? minArtifacts : 10,
  });

  console.log('======================================================================');
  console.log(`  VALIDASI INTEGRITAS ARTEFAK: ${res.direktori}`);
  console.log('======================================================================');
  console.log(`  manifest.json : ${res.manifestAda ? 'ADA' : 'HILANG'} (totalManifest=${res.totalManifest})`);
  console.log(`  SHA256SUMS    : ${res.sha256SumsAda ? 'ADA' : 'HILANG'} (totalDisk=${res.totalDisk})`);
  console.log(`  Klasifikasi   : structural=${res.jumlahStruktural}, nativeBinary=${res.jumlahNativeBinary}`);
  console.log(`  Status        : ${res.valid ? 'PASS' : 'FAIL'}`);
  if (res.temuan.length > 0) {
    for (const t of res.temuan) {
      console.error(`  [ERROR][${t.kode}] ${t.jalur || '-'}: ${t.pesan}`);
    }
  }
  console.log('======================================================================');
  return res.valid ? 0 : 1;
}

function cmdProbeToolchains(args: string[]): number {
  const outPath = getArg(args, '--out');
  const versions = deteksiVersiToolchainHost();
  const payload = {
    schemaVersion: '1.0',
    probedAt: new Date().toISOString(),
    platform: `${process.platform}-${process.arch}`,
    runner: process.env.RUNNER_OS || `${process.platform}-${process.arch}`,
    toolchains: versions,
  };
  if (outPath) {
    const abs = path.resolve(outPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, JSON.stringify(payload, null, 2), 'utf-8');
  }
  console.log(JSON.stringify(payload, null, 2));
  return 0;
}

function getStatusArg(args: string[], flag: string): StatusSertifikasiFase | undefined {
  const value = getArg(args, flag);
  if (value === undefined) return undefined;
  const allowed: StatusSertifikasiFase[] = ['PASS', 'FAIL', 'SKIPPED', 'NOT_VERIFIED', 'BLOCKED'];
  if (!allowed.includes(value as StatusSertifikasiFase)) {
    throw new Error(`Nilai ${flag} tidak valid: ${value}`);
  }
  return value as StatusSertifikasiFase;
}

function cmdEvaluate(args: string[]): number {
  const phase23SummaryPath = getArg(args, '--phase23-summary');
  const phase23EvidenceDir = getArg(args, '--phase23-evidence-dir');
  const demoBundleDir = getArg(args, '--demo-dir');
  const evidenceDir = getArg(args, '--evidence-dir');
  const jsonOut = getArg(args, '--json-out');
  const mdOut = getArg(args, '--md-out');
  const stepSummary = hasFlag(args, '--step-summary');
  const snapshotOnly = hasFlag(args, '--snapshot');
  const dryRun = hasFlag(args, '--dry-run');
  const requireCiProvenance = hasFlag(args, '--require-ci-provenance');
  const maxAgeRaw = getArg(args, '--max-age-hours');
  const maxAgeHours = maxAgeRaw ? Number(maxAgeRaw) : undefined;
  const maxEvidenceAgeMs =
    typeof maxAgeHours === 'number' && Number.isFinite(maxAgeHours) && maxAgeHours > 0
      ? maxAgeHours * 60 * 60 * 1000
      : undefined;

  const { report, corruptEvidenceFiles } = muatDanEvaluasiDariDisk({
    phase23SummaryPath: phase23SummaryPath ? path.resolve(phase23SummaryPath) : undefined,
    phase23EvidenceDir: phase23EvidenceDir ? path.resolve(phase23EvidenceDir) : undefined,
    demoBundleDir: demoBundleDir ? path.resolve(demoBundleDir) : undefined,
    evidenceDir: evidenceDir ? path.resolve(evidenceDir) : undefined,
    commitSha: getArg(args, '--commit') || process.env.GITHUB_SHA,
    workflowRunId: getArg(args, '--run-id') || process.env.GITHUB_RUN_ID,
    runner: getArg(args, '--runner') || process.env.RUNNER_OS,
    dryRun,
    requireCiProvenance,
    maxEvidenceAgeMs,
    testSuiteStatuses: {
      staticChecks: getStatusArg(args, '--static-checks-status'),
      testSuite: getStatusArg(args, '--test-suite-status'),
      qualityGate: getStatusArg(args, '--quality-gate-status'),
    },
  });

  if (jsonOut) {
    const absJson = path.resolve(jsonOut);
    fs.mkdirSync(path.dirname(absJson), { recursive: true });
    fs.writeFileSync(absJson, JSON.stringify(report, null, 2), 'utf-8');
  }
  if (mdOut) {
    const absMd = path.resolve(mdOut);
    fs.mkdirSync(path.dirname(absMd), { recursive: true });
    fs.writeFileSync(absMd, report.markdownReport + '\n', 'utf-8');
  }
  if (stepSummary && process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report.markdownReport}\n`, 'utf-8');
  }

  console.log('======================================================================');
  console.log(`  CENTRALIZED CERTIFICATION GATE (PHASE 23 & 36–42)`);
  console.log('======================================================================');
  console.log(`  Verdict : ${report.certificationVerdict} (overallStatus=${report.overallStatus}, gatePassed=${report.gatePassed})`);
  console.log(
    `  Counts  : PASS=${report.counts.pass}/${report.counts.totalPhases} | NOT_VERIFIED=${report.counts.notVerified} | SKIPPED=${report.counts.skipped} | BLOCKED=${report.counts.blocked} | FAIL=${report.counts.fail}`
  );
  if (corruptEvidenceFiles.length > 0) {
    console.error(`  Corrupt Evidence Files: ${corruptEvidenceFiles.join(', ')}`);
  }
  if (report.blockers.length > 0) {
    console.log('  Blockers:');
    for (const b of report.blockers) {
      console.log(`    - ${b}`);
    }
  }
  console.log('======================================================================');

  if (snapshotOnly) {
    return 0;
  }
  if (dryRun) {
    // Dalam mode dry-run, fail hanya jika ditemukan korupsi/FAIL nyata (bukan karena status belum native-certified penuh),
    // agar simulasi non-produksi bisa memeriksa metadata tanpa mengizinkan rilis resmi.
    return report.overallStatus === 'FAIL' ? 1 : 0;
  }
  return report.exitCode;
}

const [, , subcmd, ...rest] = process.argv;

let code = 0;
if (subcmd === 'verify-artifacts') {
  code = cmdVerifyArtifacts(rest);
} else if (subcmd === 'probe-toolchains') {
  code = cmdProbeToolchains(rest);
} else if (subcmd === 'evaluate') {
  code = cmdEvaluate(rest);
} else {
  console.error('Subperintah tidak dikenali. Gunakan: verify-artifacts | probe-toolchains | evaluate');
  code = 1;
}

process.exit(code);
