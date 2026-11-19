/**
 * Uji penerimaan Phase 3 — Lisensi & Tata Kelola NUSANTARA.
 * Hanya menggunakan Node.js bawaan; tidak membutuhkan dependensi tambahan.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => {
  const full = path.join(root, p);
  assert.ok(fs.existsSync(full), `Berkas wajib tidak ditemukan: ${p}`);
  assert.ok(fs.statSync(full).isFile(), `Jalur wajib bukan berkas: ${p}`);
  const value = fs.readFileSync(full, 'utf8');
  assert.ok(value.trim().length > 0, `Berkas wajib kosong: ${p}`);
  return value;
};

const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
  console.log(`[LULUS] ${name}`);
}

const license = read('LISENSI');
const licenseGuide = read('dokumentasi/LISENSI.md');
const licensePolicy = read('dokumentasi/KEBIJAKAN-LISENSI.md');
const releasePolicy = read('dokumentasi/KEBIJAKAN-RILIS.md');
const releaseWorkflow = read('.github/workflows/release.yml');
const governance = read('TATA-KELOLA.md');
const githubGuide = read('dokumentasi/PENGATURAN-GITHUB.md');
const security = read('KEAMANAN.md');
const conduct = read('KODE-ETIK.md');
const contribution = read('KONTRIBUSI.md');
const prTemplate = read('.github/PULL_REQUEST_TEMPLATE.md');

check('Berkas lisensi utama memuat teks Apache License 2.0 lengkap', () => {
  assert.match(license, /Apache License\s+Version 2\.0/);
  const numberedSections = license.split('\n').filter((line) => /^\s*[1-9]\. /.test(line));
  assert.equal(numberedSections.length, 9, 'Teks lisensi harus memuat sembilan bagian utama');
  assert.match(license, /END OF TERMS AND CONDITIONS/);
  assert.match(license, /APPENDIX: How to apply the Apache License/);
});
check('Panduan lisensi merujuk berkas legal utama dan menjelaskan kewajiban distribusi', () => {
  assert.match(licenseGuide, /Apache License 2\.0/);
  assert.match(licenseGuide, /\.\.\/LISENSI/);
  assert.match(licenseGuide, /Pemberitahuan Perubahan/);
  assert.match(licenseGuide, /Hibah Paten Timbal Balik/);
});
check('Kebijakan dependensi dan aset memisahkan lisensi proyek dari lisensi pihak ketiga', () => {
  assert.match(licensePolicy, /Apache License 2\.0/);
  assert.match(licensePolicy, /MIT License/);
  assert.match(licensePolicy, /GPLv2, GPLv3, atau AGPL/);
  assert.match(licensePolicy, /provenance/);
  assert.match(licensePolicy, /CC BY 4\.0/);
});
check('Kebijakan SemVer sesuai dengan gerbang publikasi workflow rilis', () => {
  assert.match(releasePolicy, /MAJOR\.MINOR\.PATCH/);
  assert.match(releasePolicy, /Tag Git Beranotasi/);
  assert.match(releasePolicy, /dry_run=false/);
  assert.match(releasePolicy, /confirm_release=true/);
  assert.match(releaseWorkflow, /workflow_dispatch:/);
  assert.match(releaseWorkflow, /confirm_release:/);
  assert.match(releaseWorkflow, /dry_run:/);
  assert.match(releaseWorkflow, /tags:/);
  assert.match(releaseWorkflow, /github\.event_name == 'workflow_dispatch'.*inputs\.dry_run != true.*inputs\.confirm_release == true/);
});
check('Tata kelola mendefinisikan lima peran dan kewajiban tinjauan sejawat', () => {
  for (const role of ['Pengguna', 'Kontributor', 'Peninjau', 'Pemelihara', 'Pengelola Rilis']) {
    assert.ok(governance.includes(role), `Peran tata kelola hilang: ${role}`);
  }
  assert.match(governance, /minimal satu Reviewer independen/);
  assert.match(governance, /praduga tak bersalah|transparan/i);
});
check('Panduan GitHub membedakan kebijakan target dari konfigurasi yang benar-benar aktif', () => {
  assert.match(githubGuide, /panduan konfigurasi manual/i);
  assert.match(githubGuide, /main.*tidak terlindungi|main.*protected: false/i);
  assert.match(githubGuide, /ruleset repositori kosong/i);
  assert.match(githubGuide, /cabang `develop` tidak ditemukan/i);
  assert.match(githubGuide, /NUSANTARA \/ Pemeriksaan Statis/);
  assert.match(githubGuide, /bukan nama status check GitHub/);
  assert.doesNotMatch(githubGuide, /pilih verifikasi CI `periksa_fondasi`/);
});
check('Panduan kontribusi memakai main sebagai target yang tersedia dan menjalankan pengujian nyata', () => {
  assert.match(contribution, /buat cabang kerja dari `main`/);
  assert.match(contribution, /Pull Request menuju cabang `main`/);
  assert.doesNotMatch(contribution, /Pull Request menuju cabang `develop`/);
  assert.match(contribution, /npm run lint/);
  assert.match(contribution, /npm test/);
  assert.match(contribution, /bukan bukti bahwa fitur telah terimplementasi/);
});
check('Kebijakan keamanan tidak mengklaim secret scanning otomatis memblokir setiap komit', () => {
  assert.doesNotMatch(security, /\[EMAIL_ATAU_KANAL_KEAMANAN_PRIVAT\]/);
  assert.match(security, /Private Vulnerability Reporting/);
  assert.match(security, /status pengaktifannya belum dapat diverifikasi/i);
  assert.match(security, /push protection/);
  assert.match(security, /penolakan push hanya terjadi jika/i);
  assert.doesNotMatch(security, /Komit yang memuat rahasia akan ditolak oleh sistem/);
});
check('Kode etik tidak menyisakan placeholder kontak atau janji kerahasiaan yang tidak didukung', () => {
  assert.doesNotMatch(conduct, /\[EMAIL_ATAU_KANAL_PELAPORAN_RESMI\]/);
  assert.match(conduct, /belum ada alamat surel atau kanal privat proyek yang terverifikasi/i);
  assert.match(conduct, /jangan menuliskan data pribadi/i);
  assert.match(conduct, /kerahasiaan penuh sebelum kanal privat tersedia/i);
});
check('Templat kontribusi dan issue tracker tersedia serta mewajibkan pemeriksaan yang relevan', () => {
  for (const file of [
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/ISSUE_TEMPLATE/bug.md',
    '.github/ISSUE_TEMPLATE/fitur.md',
    '.github/ISSUE_TEMPLATE/dokumentasi.md',
    '.github/ISSUE_TEMPLATE/pertanyaan.md',
  ]) {
    assert.ok(fs.existsSync(path.join(root, file)), `Templat hilang: ${file}`);
  }
  assert.match(prTemplate, /npm run lint/);
  assert.match(prTemplate, /npm test/);
  assert.match(prTemplate, /KODE-ETIK.md/);
});

console.log('\nPhase 3: ' + checks.length + '/' + checks.length + ' pemeriksaan lulus.');
