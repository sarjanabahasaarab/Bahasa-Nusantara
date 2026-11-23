/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Finalisasi laporan Phase 50 setelah QEMU nyata dan strict sentinel validator lulus.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type SentinelReport = {
  checkedAt?: string;
  totalRequired?: number;
  sequentialMatchedCount?: number;
  exitCode?: number;
  exitCodeValid?: boolean;
  timedOut?: boolean;
  hasPanic?: boolean;
  missingSentinels?: string[];
  duplicateSentinels?: string[];
  outOfOrderSentinels?: string[];
  violations?: string[];
  overallStatus?: string;
  stages?: Array<{ sentinel?: string; matchedInOrder?: boolean; occurrences?: number }>;
  artifactSha256?: Record<string, string>;
};

function wajib(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main(): void {
  const argIndex = process.argv.indexOf('--artifacts-dir');
  const inlineArg = process.argv.find((arg) => arg.startsWith('--artifacts-dir='));
  const artifactsDir = path.resolve(
    inlineArg ? inlineArg.slice('--artifacts-dir='.length) :
    argIndex >= 0 ? process.argv[argIndex + 1] : 'artifacts/phase50',
  );
  const reportPath = path.join(artifactsDir, 'qemu-sentinel-report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as SentinelReport;

  wajib(report.overallStatus === 'PASS', 'QEMU sentinel report bukan PASS.');
  wajib(report.totalRequired === 18, 'Jumlah sentinel wajib harus tepat 18.');
  wajib(report.sequentialMatchedCount === 18, 'Tidak semua 18 sentinel cocok berurutan.');
  wajib(report.exitCode === 1 && report.exitCodeValid === true, 'Exit code QEMU bukan exit sukses yang diharapkan (1).');
  wajib(report.timedOut === false, 'QEMU mengalami timeout.');
  wajib(report.hasPanic === false, 'Log QEMU mengandung kernel panic.');
  wajib((report.missingSentinels?.length ?? 0) === 0, 'Ada sentinel yang hilang.');
  wajib((report.duplicateSentinels?.length ?? 0) === 0, 'Ada sentinel duplikat.');
  wajib((report.outOfOrderSentinels?.length ?? 0) === 0, 'Ada sentinel di luar urutan.');
  wajib((report.violations?.length ?? 0) === 0, 'Laporan validator memiliki pelanggaran.');
  wajib(report.stages?.length === 18, 'Rincian 18 tahapan sentinel tidak lengkap.');
  wajib(
    report.stages.every((stage) => stage.matchedInOrder === true && stage.occurrences === 1),
    'Setiap sentinel harus muncul tepat satu kali dan berurutan.',
  );

  for (const [relativePath, expectedHash] of Object.entries(report.artifactSha256 ?? {})) {
    const artifactPath = path.join(artifactsDir, relativePath);
    wajib(fs.existsSync(artifactPath), 'Artefak checksum tidak ditemukan: ' + relativePath);
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex');
    wajib(actualHash === expectedHash, 'Checksum artefak tidak cocok: ' + relativePath);
  }

  const runId = process.env.GITHUB_RUN_ID ?? 'local';
  const sha = process.env.GITHUB_SHA ?? 'unknown';
  const repository = process.env.GITHUB_REPOSITORY ?? 'repository-unknown';
  const runUrl = runId !== 'local' && repository !== 'repository-unknown'
    ? 'https://github.com/' + repository + '/actions/runs/' + runId
    : 'Tidak tersedia (eksekusi lokal).';
  const exitText = fs.readFileSync(path.join(artifactsDir, 'qemu-exit-code.txt'), 'utf8');
  wajib(/QEMU_RAW_EXIT_CODE:\\s*1/.test(exitText), 'qemu-exit-code.txt tidak mencatat raw exit code 1.');

  const isoLine = fs.readFileSync(path.join(artifactsDir, 'toolchain-versions.txt'), 'utf8')
    .split('\\n').find((line) => line.startsWith('Status ISO Bootable :')) ??
    'Status ISO Bootable : tidak tercatat';

  const summary = [
    '======================================================================',
    '            RANGKUMAN HASIL BUILD & BOOT PHASE 50 NUSANTARA OS        ',
    '======================================================================',
    '1. Kernel ELF64                  : VALID (ELF64 x86_64 + Multiboot2)',
    '2. User Test ELF                 : VALID',
    '3. User Fault ELF                : VALID',
    '4. GRUB2 ISO                     : ' + isoLine.replace('Status ISO Bootable :', '').trim(),
    '5. QEMU Bare-Metal Boot          : LULUS (eksekusi QEMU nyata)',
    '6. Strict Sentinel               : 18/18 LULUS, berurutan, tanpa duplikasi',
    '7. Ring 3 / Syscall               : PASS',
    '8. Process Isolation / User Fault: PASS',
    '9. QEMU Exit Code                : 1 (EXPECTED_SUCCESS, port 0xF4)',
    '10. Workflow Run                 : ' + runId,
    '11. Commit                       : ' + sha,
    '======================================================================',
  ].join('\\n') + '\\n';
  fs.writeFileSync(path.join(artifactsDir, 'test-report.txt'), summary, 'utf8');
  fs.writeFileSync(path.join(artifactsDir, 'test-results.txt'), summary, 'utf8');

  const markerStart = '<!-- PHASE50-QEMU-CI-EVIDENCE:START -->';
  const markerEnd = '<!-- PHASE50-QEMU-CI-EVIDENCE:END -->';
  const certificationPath = path.join(artifactsDir, 'FINAL-CERTIFICATION.md');
  let certification = fs.readFileSync(certificationPath, 'utf8');
  const start = certification.indexOf(markerStart);
  const end = certification.indexOf(markerEnd);
  if (start !== -1 && end !== -1 && end > start) {
    certification = certification.slice(0, start) +
      certification.slice(end + markerEnd.length).replace(/^\\s*\\n/, '');
  }

  const evidence = [
    markerStart,
    '### Bukti Eksekusi QEMU CI Terverifikasi',
    '',
    '- **Status QEMU CI:** PASS — eksekusi QEMU x86_64 nyata pada runner GitHub Actions.',
    '- **Sentinel:** 18/18 cocok tepat satu kali dalam urutan yang diwajibkan.',
    '- **Boot:** Multiboot2, Long Mode, paging, GDT64, IDT, kernel main, dan Ring 3 teramati pada log UART.',
    '- **Isolasi:** syscall, process exit, process isolation, user fault isolation, dan kernel survival terverifikasi.',
    '- **Exit code:** raw QEMU 1 (EXPECTED_SUCCESS melalui port debug 0xF4).',
    '- **Workflow:** [' + runId + '](' + runUrl + ')',
    '- **Commit:** ' + sha,
    '- **Waktu laporan sentinel:** ' + (report.checkedAt ?? 'tidak tersedia'),
    '',
    'Catatan: status lokal tetap menggambarkan keterbatasan toolchain pada kontainer lokal. Bukti ini secara khusus menyatakan hasil eksekusi CI; bukti CI tidak diklaim sebagai pengujian pada perangkat fisik.',
    markerEnd,
    '',
  ].join('\\n');

  const oldQemuRow =
    '| **Eksekusi QEMU Bare-Metal (18 Sentinel)** | **NOT EXECUTED** (`qemu-system-x86_64` **MISSING**) | **Menunggu Eksekusi `ubuntu-latest`** | Sertifikasi final hanya boleh dinyatakan COMPLETE setelah QEMU keluar `1` dan log serial UART aktual memuat 18 sentinel berurutan. |';
  const newQemuRow =
    '| **Eksekusi QEMU Bare-Metal (18 Sentinel)** | **NOT EXECUTED** (QEMU tidak tersedia di kontainer lokal) | **PASS — 18/18 sentinel** (GitHub Actions run ' + runId + ') | Log UART aktual, exit code 1, anti-timeout, anti-panic, urutan sentinel, dan checksum artefak telah diverifikasi. |';
  certification = certification.replace(oldQemuRow, newQemuRow);

  const insertionPoint = certification.indexOf('---\\n');
  if (insertionPoint >= 0) {
    certification = certification.slice(0, insertionPoint) + evidence +
      certification.slice(insertionPoint);
  } else {
    certification += '\\n' + evidence;
  }
  fs.writeFileSync(certificationPath, certification, 'utf8');

  console.log('[PHASE50_CERTIFICATION_FINALIZED] QEMU PASS; 18/18 sentinel; report and certification synchronized.');
  console.log('Run: ' + runId + ' | Commit: ' + sha + ' | Report: ' + reportPath);
}

try {
  main();
} catch (error) {
  console.error('[PHASE50_CERTIFICATION_FINALIZATION_FAILED]', error);
  process.exit(1);
}
