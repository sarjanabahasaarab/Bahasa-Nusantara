/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rangkaian Pengujian Resmi CI/CD, Alur Kerja GitHub Actions & Release NUSANTARA (Phase 24)
 * Target Milestone: v0.24.0
 */

import {
  ValidatorAlurKerjaGitHub,
  MesinCI,
} from '../../src/cicd';
import {
  VERSI_NUSANTARA,
  LABEL_VERSI_NUSANTARA,
  dapatkanBannerCLI,
  dapatkanInfoHost,
} from '../../src/konstanta/versi';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { PembacaBerkasMemori, PembacaBerkasNode } from '../../src/modul/pembacaBerkas';
import { NusantaraCLI } from '../../src/paket/cli';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;

function uji(nama: string, fn: () => void): void {
  totalUji++;
  try {
    fn();
    totalLulus++;
    console.log(`  [✓ LULUS] ${nama}`);
  } catch (err: any) {
    totalGagal++;
    console.error(`  [✗ GAGAL] ${nama}`);
    console.error(`            ${err.message}`);
  }
}

function samaDengan<T>(aktual: T, diharapkan: T, pesan?: string): void {
  if (aktual !== diharapkan) {
    throw new Error(
      `${pesan || 'Nilai tidak sama'}: ditemukan '${aktual}', diharapkan '${diharapkan}'`
    );
  }
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) throw new Error(`Penegasan gagal: ${pesan}`);
}

console.log('=============================================================================');
console.log('PENGUJIAN CI/CD & ALUR KERJA GITHUB ACTIONS BAHASA NUSANTARA (PHASE 24)');
console.log(`Target Milestone: ${LABEL_VERSI_NUSANTARA}`);
console.log('=============================================================================\n');

const pembacaReal = new PembacaBerkasNode();
const validator = new ValidatorAlurKerjaGitHub(pembacaReal);

// -----------------------------------------------------------------------------
// GRUP 1: Validasi Sintaks & Struktur YAML GitHub Actions
// -----------------------------------------------------------------------------
console.log('=== [GRUP 1: Validasi Sintaks & Struktur YAML GitHub Actions] ===');

uji('1.1 Berkas .github/workflows/ci.yml ada dan berstruktur valid', () => {
  const hasil = validator.validasiBerkas('.github/workflows/ci.yml');
  pastikan(hasil.valid, 'ci.yml harus berstatus valid');
  samaDengan(hasil.namaWorkflow, 'NUSANTARA Continuous Integration');
  pastikan(hasil.daftarTrigger.includes('push'), 'ci.yml harus merespons push');
  pastikan(hasil.daftarTrigger.includes('pull_request'), 'ci.yml harus merespons pull_request');
});

uji('1.2 Berkas .github/workflows/release.yml ada dan berstruktur valid', () => {
  const hasil = validator.validasiBerkas('.github/workflows/release.yml');
  pastikan(hasil.valid, 'release.yml harus berstatus valid');
  samaDengan(hasil.namaWorkflow, 'NUSANTARA Automated Release & Distribution');
  pastikan(hasil.daftarTrigger.includes('workflow_dispatch'), 'release.yml harus merespons workflow_dispatch');
});

uji('1.3 ci.yml mendefinisikan job-job wajib pipeline CI', () => {
  const hasil = validator.validasiBerkas('.github/workflows/ci.yml');
  const jobIds = hasil.daftarJob.map((j) => j.id);
  pastikan(jobIds.includes('static-checks'), 'Harus memiliki job static-checks');
  pastikan(jobIds.includes('test-suite'), 'Harus memiliki job test-suite');
  pastikan(jobIds.includes('quality-gate'), 'Harus memiliki job quality-gate');
  pastikan(jobIds.includes('build-matrix-validation'), 'Harus memiliki job build-matrix-validation');
  pastikan(jobIds.includes('ci-summary'), 'Harus memiliki job ci-summary');
});

uji('1.4 release.yml mendefinisikan tahapan rilis yang ketat dan terurut', () => {
  const hasil = validator.validasiBerkas('.github/workflows/release.yml');
  const jobIds = hasil.daftarJob.map((j) => j.id);
  pastikan(jobIds.includes('verify-release-approval'), 'Harus memiliki verifikasi persetujuan');
  pastikan(jobIds.includes('test-and-gate'), 'Harus memiliki pengujian sebelum rilis');
  pastikan(jobIds.includes('build-release-artifacts'), 'Harus memiliki kompilasi artefak');
  pastikan(jobIds.includes('compile-release-bundle'), 'Harus memiliki kompilasi SHA256 & manifest');
  pastikan(jobIds.includes('publish-release'), 'Harus memiliki publikasi rilis');
});

// -----------------------------------------------------------------------------
// GRUP 2: Audit Keamanan Permission (Least Privilege)
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 2: Audit Keamanan Permission (Least Privilege)] ===');

uji('2.1 ci.yml menerapkan Least Privilege (permissions: contents: read)', () => {
  const hasil = validator.validasiBerkas('.github/workflows/ci.yml');
  samaDengan(hasil.leastPrivilegeTercapai, true, 'ci.yml harus least privilege');
});

uji('2.2 release.yml menerapkan permissions contents: read di root', () => {
  const hasil = validator.validasiBerkas('.github/workflows/release.yml');
  samaDengan(hasil.leastPrivilegeTercapai, true, 'release.yml harus least privilege di root');
});

uji('2.3 Tidak ada rahasia/token bocor di dalam berkas workflow', () => {
  const hasilCI = validator.validasiBerkas('.github/workflows/ci.yml');
  const hasilRel = validator.validasiBerkas('.github/workflows/release.yml');
  samaDengan(hasilCI.adaRahasiaBocor, false, 'Tidak boleh ada rahasia di ci.yml');
  samaDengan(hasilRel.adaRahasiaBocor, false, 'Tidak boleh ada rahasia di release.yml');
});

// -----------------------------------------------------------------------------
// GRUP 3: Validasi Trigger & Concurrency Control
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 3: Validasi Trigger & Concurrency Control] ===');

uji('3.1 Concurrency control ci.yml membatalkan build lama hanya pada PR', () => {
  const hasil = validator.validasiBerkas('.github/workflows/ci.yml');
  samaDengan(hasil.concurrencyAman, true);
});

uji('3.2 Concurrency control release.yml melarang pembatalan di tengah jalan', () => {
  const hasil = validator.validasiBerkas('.github/workflows/release.yml');
  samaDengan(hasil.concurrencyAman, true);
});

// -----------------------------------------------------------------------------
// GRUP 4: Gerbang Persetujuan Rilis (Release Approval Protection)
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 4: Gerbang Persetujuan Rilis (Release Approval Protection)] ===');

uji('4.1 release.yml mewajibkan parameter persetujuan manual eksplisit (confirm_release)', () => {
  const hasil = validator.validasiBerkas('.github/workflows/release.yml');
  samaDengan(hasil.persetujuanRilisAman, true, 'Wajib mewajibkan confirm_release');
});

uji('4.2 Job publish-release bergantung secara ketat pada pengujian dan build lulus', () => {
  const hasil = validator.validasiBerkas('.github/workflows/release.yml');
  const jobPublish = hasil.daftarJob.find((j) => j.id === 'publish-release');
  pastikan(Boolean(jobPublish), 'Job publish-release harus ditemukan');
  pastikan(
    jobPublish!.needs.includes('compile-release-bundle'),
    'Job publish harus bergantung pada compile-release-bundle'
  );
});

// -----------------------------------------------------------------------------
// GRUP 5: Matriks Platform & Runner Support
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 5: Matriks Platform & Runner Support] ===');

uji('5.1 ci.yml dan release.yml mendefinisikan target matriks 4 platform resmi', () => {
  const kontenCI = pembacaReal.baca('.github/workflows/ci.yml');
  pastikan(kontenCI.includes('windows-x64'), 'Harus mencakup windows-x64');
  pastikan(kontenCI.includes('linux-x64'), 'Harus mencakup linux-x64');
  pastikan(kontenCI.includes('macos-x64'), 'Harus mencakup macos-x64');
  pastikan(kontenCI.includes('macos-arm64'), 'Harus mencakup macos-arm64');
});

uji('5.2 Runner GitHub Actions CI dan release dipetakan ke arsitektur native yang tepat', () => {
  // Git checkout Windows dapat menyajikan YAML dengan CRLF; normalisasi agar
  // pemeriksaan pemetaan runner tidak bergantung pada line ending host.
  const kontenCI = pembacaReal.baca('.github/workflows/ci.yml').replace(/\r\n/g, '\n');
  const kontenRelease = pembacaReal.baca('.github/workflows/release.yml').replace(/\r\n/g, '\n');
  pastikan(kontenCI.includes('windows-latest'), 'Runner Windows sah');
  pastikan(kontenCI.includes('ubuntu-latest'), 'Runner Linux sah');
  pastikan(kontenCI.includes('os: macos-15-intel'), 'Runner macOS x64 CI harus memakai runner Intel native');
  pastikan(kontenCI.includes('macos-latest'), 'Runner macOS ARM64 CI sah');
  pastikan(kontenRelease.includes('target: macos-x86_64\n            os: macos-15-intel'), 'Release macOS x64 harus memakai runner Intel native');
  pastikan(kontenRelease.includes('target: macos-arm64\n            os: macos-latest'), 'Release macOS ARM64 harus memakai runner Apple Silicon');
  pastikan(kontenRelease.includes('Validasi arsitektur runner macOS native'), 'Release wajib menolak translasi Rosetta sebagai bukti native');
});

uji('5.3 ci.yml mendeteksi provider QEMU apt secara dinamis & memverifikasi binding native + verify-dist', () => {
  const kontenCI = pembacaReal.baca('.github/workflows/ci.yml');
  pastikan(kontenCI.includes('apt-cache policy'), 'ci.yml wajib memeriksa kandidat nyata paket QEMU via apt-cache policy');
  pastikan(kontenCI.includes('@rolldown/binding-win32-x64-msvc') && kontenCI.includes('@rolldown/binding-darwin-arm64'), 'ci.yml wajib memeriksa native binding lintas platform');
  pastikan(kontenCI.includes('phase23-certify.ts verify-dist'), 'ci.yml wajib menjalankan verify-dist end-to-end per target');
});

uji('5.4 ci.yml memisahkan runner ARM64 native, dry-run QEMU aman, & isolasi artefak evidence 6 target', () => {
  const kontenCI = pembacaReal.baca('.github/workflows/ci.yml');
  pastikan(kontenCI.includes('windows-11-arm'), 'ci.yml wajib memakai runner Windows ARM64 native (windows-11-arm)');
  pastikan(kontenCI.includes('ubuntu-24.04-arm'), 'ci.yml wajib memakai runner Linux ARM64 native (ubuntu-24.04-arm)');
  pastikan(kontenCI.includes('apt-get install -s --no-install-recommends'), 'ci.yml wajib memeriksa konflik QEMU via dry-run apt-get');
  pastikan(
    kontenCI.includes('artifacts/phase23/evidence/${{ matrix.target }}.json'),
    'ci.yml wajib mengunggah hanya JSON evidence milik matrix.target terkait'
  );
  pastikan(
    kontenCI.includes('rm -rf artifacts/phase23'),
    'ci.yml wajib membersihkan sisa evidence lokal sebelum generate & download-artifact'
  );
});

uji('5.5 ci.yml memasang C runtime Ubuntu pada test-suite, verifikasi stdio.h/lld, & menjaga needs + diagnostik skipped', () => {
  const kontenCI = pembacaReal.baca('.github/workflows/ci.yml');
  const parsed = validator.validasiBerkas('.github/workflows/ci.yml');
  pastikan(kontenCI.includes("runner.os == 'Linux'"), 'Instalasi apt Ubuntu wajib bersyarat hanya pada runner Linux');
  for (const pkg of ['build-essential', 'libc6-dev', 'clang', 'lld', 'llvm', 'binutils']) {
    pastikan(kontenCI.includes(pkg), `ci.yml wajib menyertakan paket native '${pkg}'`);
  }
  pastikan(kontenCI.includes('ld.lld --version'), 'ci.yml wajib memverifikasi linker ld.lld');
  pastikan(kontenCI.includes('#include <stdio.h>'), 'ci.yml wajib menguji kompilasi & linking nyata header stdio.h');
  pastikan(kontenCI.includes('Diagnostik Prasyarat yang Dilewati (Skipped)'), 'ci.yml wajib menjelaskan prasyarat job yang skipped');

  const qg = parsed.daftarJob.find((j) => j.id === 'quality-gate');
  const bm = parsed.daftarJob.find((j) => j.id === 'build-matrix-validation');
  const gate = parsed.daftarJob.find((j) => j.id === 'phase23-certification-gate');
  pastikan(Boolean(qg && qg.needs.includes('test-suite')), 'quality-gate wajib bergantung pada test-suite');
  pastikan(Boolean(bm && bm.needs.includes('quality-gate')), 'build-matrix-validation wajib bergantung pada quality-gate');
  pastikan(Boolean(gate && gate.needs.includes('build-matrix-validation')), 'phase23-certification-gate wajib bergantung pada build-matrix-validation');
});

uji('5.6 ci.yml mencakup job Phase 36–42, timeout-minutes, demo-terpadu artifact, & unified-certification-gate', () => {
  const kontenCI = pembacaReal.baca('.github/workflows/ci.yml');
  const parsedCI = validator.validasiBerkas('.github/workflows/ci.yml');
  const jobIds = parsedCI.daftarJob.map((j) => j.id);

  for (const jobWajib of [
    'phase36-gui-matrix',
    'phase37-42-android-sdk',
    'phase37-42-apple',
    'phase39-42-tls-ota',
    'unified-certification-gate',
  ]) {
    pastikan(jobIds.includes(jobWajib), `ci.yml wajib memiliki job '${jobWajib}'`);
  }

  pastikan(!/^\s*os:\s*macos-13\b/m.test(kontenCI), 'ci.yml dilarang memakai runner retired macos-13 pada matriks build');
  pastikan(kontenCI.includes('xvfb-run -a'), 'ci.yml wajib memvalidasi GUI Linux melalui xvfb-run');
  pastikan(kontenCI.includes('demo-terpadu-artifacts'), 'ci.yml wajib mengunggah artefak demo-terpadu');
  pastikan(kontenCI.includes('scripts/certification-gate.ts evaluate'), 'ci.yml wajib memanggil gerbang sertifikasi terpusat');
  pastikan(kontenCI.includes('timeout-minutes:'), 'ci.yml wajib menetapkan timeout-minutes pada job');
});

uji('5.7 release.yml, kernel-boot-qemu.yml, & nusantara-os-ci.yml bebas runner retired/hardcoded date & terlindungi gate', () => {
  const kontenRel = pembacaReal.baca('.github/workflows/release.yml');
  const parsedRel = validator.validasiBerkas('.github/workflows/release.yml');
  const parsedQemu = validator.validasiBerkas('.github/workflows/kernel-boot-qemu.yml');
  const parsedOs = validator.validasiBerkas('.github/workflows/nusantara-os-ci.yml');

  pastikan(parsedQemu.valid && parsedQemu.leastPrivilegeTercapai && parsedQemu.concurrencyAman, 'kernel-boot-qemu.yml wajib valid & least-privilege');
  pastikan(parsedOs.valid && parsedOs.leastPrivilegeTercapai && parsedOs.concurrencyAman, 'nusantara-os-ci.yml wajib valid & least-privilege');

  pastikan(!/^\s*os:\s*macos-13\b/m.test(kontenRel) && !kontenRel.includes('macos-13'), 'release.yml dilarang memakai runner retired macos-13');
  pastikan(!kontenRel.includes('2026-10-25T00:00:00.000Z'), 'release.yml dilarang memakai timestamp rilis hardcoded');
  pastikan(kontenRel.includes('default: true'), 'release.yml dry_run wajib default true agar tidak rilis tidak sengaja');
  pastikan(kontenRel.includes('scripts/certification-gate.ts evaluate'), 'release.yml wajib memeriksa certification gate');

  const jobCertGate = parsedRel.daftarJob.find((j) => j.id === 'verify-certification-gate');
  const jobPublish = parsedRel.daftarJob.find((j) => j.id === 'publish-release');
  pastikan(Boolean(jobCertGate), 'release.yml wajib memiliki job verify-certification-gate');
  pastikan(
    Boolean(jobPublish && jobPublish.needs.includes('verify-certification-gate')),
    'publish-release wajib bergantung pada verify-certification-gate'
  );
});

// -----------------------------------------------------------------------------
// GRUP 6: Mesin Eksekusi CI Lokal & Step Summary
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 6: Mesin Eksekusi CI Lokal & Step Summary] ===');

uji('6.1 MesinCI mengeksekusi pipeline validasi deterministik lokal', () => {
  const fsMem = new PembacaBerkasMemori();
  // Gandakan workflow & toml ke memori
  fsMem.tulisBerkas('.github/workflows/ci.yml', pembacaReal.baca('.github/workflows/ci.yml'));
  fsMem.tulisBerkas('.github/workflows/release.yml', pembacaReal.baca('.github/workflows/release.yml'));
  fsMem.tulisBerkas('nusantara.toml', `[nusantara]\nnama = "nusantara"\nversi = "${VERSI_NUSANTARA}"\n`);

  const mesin = new MesinCI({
    pembaca: fsMem,
    direktoriBasis: '.',
    targetPlatforms: ['linux-x64', 'windows-x64'],
  });

  const lap = mesin.jalankan();
  samaDengan(lap.statusAkhir, 'PASS');
  pastikan(lap.langkah.length >= 5, 'Harus menyelesaikan minimal 5 langkah tahapan CI');
  pastikan(lap.matriksPlatform.length === 2, 'Harus memproses 2 platform target uji');
  pastikan(lap.ringkasanMarkdown.includes('NUSANTARA CI SUMMARY'), 'Harus memuat Markdown Summary');
});

uji('6.2 MesinCI membatalkan rilis jika tidak memiliki persetujuan eksplisit', () => {
  const fsMem = new PembacaBerkasMemori();
  fsMem.tulisBerkas('.github/workflows/ci.yml', pembacaReal.baca('.github/workflows/ci.yml'));
  fsMem.tulisBerkas('.github/workflows/release.yml', pembacaReal.baca('.github/workflows/release.yml'));
  fsMem.tulisBerkas('nusantara.toml', `[nusantara]\nnama = "nusantara"\nversi = "${VERSI_NUSANTARA}"\n`);

  const mesin = new MesinCI({
    pembaca: fsMem,
    simulasikanRilis: true,
    persetujuanRilis: false, // TIDAK DISETUJUI
  });

  const lap = mesin.jalankan();
  samaDengan(lap.statusRilis, 'READY FOR APPROVAL');
  pastikan(lap.ringkasanTeks.includes('READY FOR APPROVAL'), 'Harus berstatus menunggu persetujuan');
});

uji('6.3 MesinCI menggunakan nusantara.toml nyata di disk & 6 target kanonik dengan diagnostik lengkap', () => {
  const mesin = new MesinCI({
    pembaca: pembacaReal,
    targetPlatforms: [
      'windows-x86_64',
      'windows-arm64',
      'linux-x86_64',
      'linux-arm64',
      'macos-x86_64',
      'macos-arm64',
    ],
  });

  const lap = mesin.jalankan();
  samaDengan(lap.statusAkhir, 'PASS', `MesinCI disk nyata gagal: ${lap.daftarError.join('; ')}`);
  samaDengan(lap.daftarError.length, 0, 'daftarError harus kosong saat PASS');
  samaDengan(lap.matriksPlatform.length, 6, 'Harus memproses 6 target kanonik');
  pastikan(
    lap.diagnostikDistribusi?.hasilManifest === 'PASS' && lap.diagnostikDistribusi?.hasilSha256 === 'PASS',
    'Diagnostik distribusi harus mencatat manifest & sha256 PASS'
  );
});

// -----------------------------------------------------------------------------
// GRUP 7: Integrasi CLI NUSANTARA (Phase 24)
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 7: Integrasi CLI NUSANTARA (Phase 24)] ===');

uji('7.1 CLI nusantara versi menampilkan banner v0.24.0 resmi', () => {
  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembaca: pembacaReal,
    log: (m) => logList.push(m),
  });

  const code = cli.jalankan(['versi']);
  samaDengan(code, 0);
  const out = logList.join('\n');
  pastikan(out.includes(LABEL_VERSI_NUSANTARA), `Harus memuat ${LABEL_VERSI_NUSANTARA}`);
  pastikan(out.includes('CI/CD'), 'Harus mencantumkan CI/CD di banner');
});

uji('7.2 CLI nusantara ci periksa-workflow memvalidasi workflow Actions', () => {
  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembaca: pembacaReal,
    log: (m) => logList.push(m),
  });

  const code = cli.jalankan(['ci', 'periksa-workflow']);
  samaDengan(code, 0);
  const out = logList.join('\n');
  pastikan(out.includes('.github/workflows/ci.yml'), 'Harus memvalidasi ci.yml');
  pastikan(out.includes('[✓ VALID]'), 'Harus menyatakan valid');
});

uji('7.3 CLI nusantara info menampilkan fase 24 dan versi 0.24.0', () => {
  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembaca: pembacaReal,
    log: (m) => logList.push(m),
  });

  const code = cli.jalankan(['info']);
  samaDengan(code, 0);
  const out = logList.join('\n');
  pastikan(out.includes(VERSI_NUSANTARA), 'Harus memuat versi resmi');
  pastikan(out.includes('CI/CD'), 'Harus memuat nama fase CI/CD');
});

// -----------------------------------------------------------------------------
// GRUP 8: Regresi Phase 1–23
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 8: Regresi Phase 1–23] ===');

uji('8.1 Program NUSANTARA tetap berjalan mulus dengan interpreter dan standard library', () => {
  const kode = `
program UjiRegresiPhase24
gunakan "matematika" sebagai mtk
gunakan "sistem" sebagai sys

mulai
    akar : desimal = mtk.akar(64.0)
    ver : teks = sys.versi()
    tampilkan("Hasil:", akar, "Versi:", ver)
selesai
`;
  const buf = new PenulisOutputBuffer();
  const interp = new Interpreter(buf);
  interp.jalankanKode(kode);

  const out = buf.dapatkanSeluruhTeks().join('\n').trim();
  samaDengan(out, `Hasil: 8 Versi: ${VERSI_NUSANTARA}`);
});

uji('8.2 Matriks build lintas platform CI tetap menghasilkan artefak bersih dan SHA-256 sah', () => {
  const fsMem = new PembacaBerkasMemori();
  const ci = new MesinCI({ pembaca: fsMem, targetPlatforms: ['linux-x64'] });
  const laporan = ci.jalankan();

  pastikan(laporan.artefak.length > 0, 'Harus menghasilkan artefak');
  pastikan(Boolean(laporan.sha256sums && laporan.sha256sums.includes(`nusantara-${LABEL_VERSI_NUSANTARA}-linux-x64`)), 'SHA256SUMS memuat artefak Linux');
});

uji('8.3 CLI nusantara bangun (Phase 23) menghasilkan arsip .zip/.tar.gz nyata & SHA256SUMS sah', () => {
  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'nusantara-p23-'));
  try {
    const logList: string[] = [];
    const cli = new NusantaraCLI({
      pembaca: pembacaReal,
      log: (m) => logList.push(m),
    });
    const code = cli.jalankan(['bangun', '--mode', 'release', '--target', 'linux-x64', '--out', tmpOut, '--json']);
    samaDengan(code, 0, 'nusantara bangun harus keluar 0');
    const parsed = JSON.parse(logList.join('\n'));
    pastikan(parsed.sukses === true && parsed.artefak.length === 2, 'Harus menghasilkan zip dan tar.gz untuk linux-x64');

    const zipPath = path.join(tmpOut, `nusantara-${LABEL_VERSI_NUSANTARA}-linux-x64.zip`);
    const tgzPath = path.join(tmpOut, `nusantara-${LABEL_VERSI_NUSANTARA}-linux-x64.tar.gz`);
    pastikan(fs.existsSync(zipPath) && fs.existsSync(tgzPath), 'Berkas arsip rilis harus tertulis ke disk');

    const zipBuf = fs.readFileSync(zipPath);
    pastikan(zipBuf[0] === 0x50 && zipBuf[1] === 0x4b && zipBuf[2] === 0x03 && zipBuf[3] === 0x04, 'Header ZIP harus PK\\x03\\x04');

    const actualSha = crypto.createHash('sha256').update(zipBuf).digest('hex');
    const zipArtifact = parsed.artefak.find((a: any) => a.format === 'zip');
    samaDengan(zipArtifact.sha256, actualSha, 'SHA-256 pada manifest harus cocok dengan byte arsip ZIP');
  } finally {
    fs.rmSync(tmpOut, { recursive: true, force: true });
  }
});

console.log('\n============================================================');
console.log('RINGKASAN PENGUJIAN PHASE 24: CI/CD & GITHUB WORKFLOW');
console.log(`Total Pengujian : ${totalUji}`);
console.log(`Lulus           : ${totalLulus}`);
console.log(`Gagal           : ${totalGagal}`);
console.log('============================================================\n');

if (totalGagal > 0) {
  console.error(`Terdapat ${totalGagal} pengujian yang GAGAL.`);
  process.exit(1);
} else {
  console.log('Seluruh pengujian Phase 24 LULUS DENGAN SEMPURNA! (100% Pass)\n');
}
