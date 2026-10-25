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
import { PembacaBerkasMemori, PembacaBerkasNode } from '../../src/modul/pembacaBerkas';
import { NusantaraCLI } from '../../src/paket/cli';
import { MesinBuild } from '../../src/build';
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

uji('5.2 Runner GitHub Actions dipetakan dengan tepat tanpa runner fiktif', () => {
  const kontenCI = pembacaReal.baca('.github/workflows/ci.yml');
  pastikan(kontenCI.includes('windows-latest'), 'Runner Windows sah');
  pastikan(kontenCI.includes('ubuntu-latest'), 'Runner Linux sah');
  pastikan(kontenCI.includes('macos-13'), 'Runner macOS x64 sah');
  pastikan(kontenCI.includes('macos-latest'), 'Runner macOS ARM64 sah');
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

uji('8.2 Build system Phase 23 tetap menghasilkan artefak bersih dan SHA-256 sah', () => {
  const fsMem = new PembacaBerkasMemori();
  const mesin = new MesinBuild(fsMem);
  const hasil = mesin.bangun({
    mode: 'release',
    target: ['linux-x64'],
    tanpaUji: true,
  });

  samaDengan(hasil.sukses, true);
  pastikan(hasil.artefak.length > 0, 'Harus menghasilkan artefak');
  pastikan(Boolean(hasil.sha256sums && hasil.sha256sums.includes('nusantara-v0.24.0-linux-x64')), 'SHA256SUMS memuat artefak Linux');
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
