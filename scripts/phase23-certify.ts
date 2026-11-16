/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Skrip CLI Sertifikasi 6 Target Desktop — Phase 23.2 - Phase 23.7
 * Pemakaian:
 *   npx tsx scripts/phase23-certify.ts generate --target <target> --bundle-dir <dir> [--fail-on-missing-clang] [--skip-dist]
 *   npx tsx scripts/phase23-certify.ts verify-dist --target <target> [--out-dir <dir>] [--fail-on-missing-clang]
 *   npx tsx scripts/phase23-certify.ts aggregate --evidence-dir <dir> --report-out <mdPath> [--json-out <jsonPath>] [--step-summary] [--allow-incomplete]
 *   npx tsx scripts/phase23-certify.ts local-snapshot --bundle-dir artifacts/phase23
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  CanonicalDesktopTarget,
  DESKTOP_CANONICAL_TARGETS,
  DistributionE2EVerifier,
  Phase23CertificationEngine,
  TargetMatrixManager,
} from '../src/build';
import { TargetTripleManager } from '../src/compiler/llvm/target-triple';

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

function runGenerate(args: string[]): number {
  const rawTarget = getArg(args, '--target');
  const bundleDir = path.resolve(getArg(args, '--bundle-dir') || 'artifacts/phase23');
  const failOnMissingClang = hasFlag(args, '--fail-on-missing-clang');
  const skipDist = hasFlag(args, '--skip-dist');

  if (!rawTarget || !DESKTOP_CANONICAL_TARGETS.includes(rawTarget as CanonicalDesktopTarget)) {
    console.error(`[GALAT] Target harus salah satu dari: ${DESKTOP_CANONICAL_TARGETS.join(', ')}`);
    return 1;
  }

  const target = rawTarget as CanonicalDesktopTarget;
  const evidenceDir = path.join(bundleDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `nusa-cert-${target}-`));
  try {
    const cap = TargetMatrixManager.inspectTargetCapability(target);
    const ev = Phase23CertificationEngine.generateTargetEvidence({
      target,
      outputDir: workDir,
      artifactBundleDir: bundleDir,
      failOnMissingToolchain: failOnMissingClang && cap.supported,
      requireExecution: true,
      verifyDistribution: !skipDist,
    });

    const outJson = path.join(evidenceDir, `${target}.json`);
    fs.writeFileSync(outJson, JSON.stringify(ev, null, 2), 'utf-8');

    console.log(`[PHASE 23.7] Evidence ditulis: ${outJson}`);
    console.log(
      `[PHASE 23.7] Target=${target} Status=${ev.verificationStatus} Mode=${ev.executionMode} DistInstall=${ev.installResult?.status} DistUninstall=${ev.uninstallResult?.status}`
    );
    if (ev.reason) {
      console.log(`[PHASE 23.7] Alasan: ${ev.reason}`);
    }

    if (ev.verificationStatus === 'FAIL') {
      console.error(`[FAIL] Target ${target} gagal sertifikasi.`);
      return 1;
    }
    return 0;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function runVerifyDist(args: string[]): number {
  const rawTarget = getArg(args, '--target');
  const outDir = path.resolve(getArg(args, '--out-dir') || 'dist-native/dist-verify');
  const failOnMissingClang = hasFlag(args, '--fail-on-missing-clang');

  if (!rawTarget) {
    console.error('[GALAT] Wajib menyertakan --target <target>.');
    return 1;
  }

  const strict = TargetTripleManager.resolveStrict(rawTarget);
  if (!strict.supported || !strict.info.targetId) {
    console.error(`[GALAT] Target distribusi tidak valid '${rawTarget}': ${strict.error}`);
    return 1;
  }

  const report = DistributionE2EVerifier.verify({
    target: rawTarget,
    outDir,
    failOnMissingClang,
  });

  const reportDir = path.join(outDir, 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const rptPath = path.join(reportDir, `dist-verify-${report.targetTerdeteksi}.json`);
  fs.writeFileSync(rptPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('-----------------------------------------------------------------------------');
  console.log(`[DIST-VERIFY] targetDiminta=${rawTarget} -> targetTerdeteksi=${report.targetTerdeteksi} (${report.triple})`);
  console.log(
    `[DIST-VERIFY] statusAkhir=${report.statusAkhir} manifest=${report.hasilManifest} sha256=${report.hasilSha256} extract=${report.hasilEkstraksiArsip} dep=${report.hasilDependency}`
  );
  console.log(
    `[DIST-VERIFY] install=${report.hasilSandboxInstall} run=${report.hasilEksekusiInstalled} upgrade=${report.hasilUpgrade} tamper=${report.hasilPenolakanTamper} uninstall=${report.hasilSandboxUninstall} sisa=${report.hasilSisaUninstall}`
  );
  console.log(`[DIST-VERIFY] laporan=${rptPath}`);
  if (report.reason) {
    console.log(`[DIST-VERIFY] Alasan: ${report.reason}`);
  }
  if (report.daftarError.length > 0) {
    for (const e of report.daftarError) {
      console.error(`[DIST-VERIFY][ERROR] ${e}`);
    }
  }
  console.log('-----------------------------------------------------------------------------');
  return report.exitCode;
}

function runAggregate(args: string[]): number {
  const evidenceDir = path.resolve(getArg(args, '--evidence-dir') || 'artifacts/phase23/evidence');
  const reportOut = path.resolve(getArg(args, '--report-out') || 'artifacts/phase23/PHASE-23-CERTIFICATION-REPORT.md');
  const jsonOut = getArg(args, '--json-out');
  const writeStepSummary = hasFlag(args, '--step-summary');
  const allowIncomplete = hasFlag(args, '--allow-incomplete');

  const result = Phase23CertificationEngine.aggregateEvidence(evidenceDir, {
    baseDir: path.dirname(evidenceDir),
    ciContext: {
      serverUrl: process.env.GITHUB_SERVER_URL,
      repository: process.env.GITHUB_REPOSITORY,
      runId: process.env.GITHUB_RUN_ID,
      commitSha: process.env.GITHUB_SHA,
      refName: process.env.GITHUB_REF_NAME,
    },
  });

  fs.mkdirSync(path.dirname(reportOut), { recursive: true });
  fs.writeFileSync(reportOut, result.markdownReport, 'utf-8');

  if (jsonOut) {
    const absJson = path.resolve(jsonOut);
    fs.mkdirSync(path.dirname(absJson), { recursive: true });
    fs.writeFileSync(absJson, JSON.stringify(result, null, 2), 'utf-8');
  }

  if (writeStepSummary && process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${result.markdownReport}\n`, 'utf-8');
  }

  console.log('=============================================================================');
  console.log(`PHASE 23 CERTIFICATION GATE: ${result.overallStatus}`);
  console.log(
    `PASS=${result.counts.pass} | NOT_VERIFIED=${result.counts.notVerified} | FAIL=${result.counts.fail} | MISSING=${result.counts.missing} | CORRUPT=${result.counts.corrupt}`
  );
  console.log(`Laporan: ${reportOut}`);
  console.log('=============================================================================');

  for (const f of result.findings) {
    console.log(`  [${f.severity.toUpperCase()}][${f.code}] ${f.target}: ${f.message}`);
  }

  if (allowIncomplete) {
    return 0;
  }
  return result.exitCode;
}

function runLocalSnapshot(args: string[]): number {
  const bundleDir = path.resolve(getArg(args, '--bundle-dir') || 'artifacts/phase23');
  const evidenceDir = path.join(bundleDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });

  for (const target of DESKTOP_CANONICAL_TARGETS) {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `nusa-local-${target}-`));
    try {
      const ev = Phase23CertificationEngine.generateTargetEvidence({
        target,
        outputDir: workDir,
        artifactBundleDir: bundleDir,
        failOnMissingToolchain: false,
        requireExecution: true,
        verifyDistribution: true,
      });
      fs.writeFileSync(path.join(evidenceDir, `${target}.json`), JSON.stringify(ev, null, 2), 'utf-8');
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }

  return runAggregate([
    '--evidence-dir',
    evidenceDir,
    '--report-out',
    path.join(bundleDir, 'PHASE-23-CERTIFICATION-REPORT.md'),
    '--allow-incomplete',
  ]);
}

const [, , subcmd, ...rest] = process.argv;

let exitCode = 0;
if (subcmd === 'generate') {
  exitCode = runGenerate(rest);
} else if (subcmd === 'verify-dist') {
  exitCode = runVerifyDist(rest);
} else if (subcmd === 'aggregate') {
  exitCode = runAggregate(rest);
} else if (subcmd === 'local-snapshot') {
  exitCode = runLocalSnapshot(rest);
} else {
  console.error('Subperintah tidak dikenali. Gunakan: generate | verify-dist | aggregate | local-snapshot');
  exitCode = 1;
}

process.exit(exitCode);
