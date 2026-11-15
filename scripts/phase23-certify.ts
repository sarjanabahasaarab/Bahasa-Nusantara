/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Skrip CLI Sertifikasi 6 Target Desktop — Phase 23.2
 * Pemakaian:
 *   npx tsx scripts/phase23-certify.ts generate --target <target> --bundle-dir <dir> [--fail-on-missing-clang]
 *   npx tsx scripts/phase23-certify.ts aggregate --evidence-dir <dir> --report-out <mdPath> [--json-out <jsonPath>] [--step-summary] [--allow-incomplete]
 *   npx tsx scripts/phase23-certify.ts local-snapshot --bundle-dir artifacts/phase23
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  CanonicalDesktopTarget,
  DESKTOP_CANONICAL_TARGETS,
  Phase23CertificationEngine,
  TargetMatrixManager,
} from '../src/build';

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
    });

    const outJson = path.join(evidenceDir, `${target}.json`);
    fs.writeFileSync(outJson, JSON.stringify(ev, null, 2), 'utf-8');

    console.log(`[PHASE 23.2] Evidence ditulis: ${outJson}`);
    console.log(`[PHASE 23.2] Target=${target} Status=${ev.status} Mode=${ev.execution.mode}`);
    if (ev.reason) {
      console.log(`[PHASE 23.2] Alasan: ${ev.reason}`);
    }

    if (ev.status === 'FAIL') {
      console.error(`[FAIL] Target ${target} gagal sertifikasi.`);
      return 1;
    }
    return 0;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
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
} else if (subcmd === 'aggregate') {
  exitCode = runAggregate(rest);
} else if (subcmd === 'local-snapshot') {
  exitCode = runLocalSnapshot(rest);
} else {
  console.error('Subperintah tidak dikenali. Gunakan: generate | aggregate | local-snapshot');
  exitCode = 1;
}

process.exit(exitCode);
