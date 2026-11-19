/**
 * Uji penerimaan Phase 2 — Konstitusi Bahasa NUSANTARA.
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

const konstitusi = read('dokumentasi/KONSTITUSI-BAHASA.md');
const keyword = read('dokumentasi/KEYWORD.md');
const tipe = read('dokumentasi/TIPE-DATA.md');
const nip = read('dokumentasi/nip/NIP-0002.md');
const valid = read('pengujian/spesifikasi/program-valid.nusantara');
const invalid = read('pengujian/spesifikasi/kasus-tidak-valid.md');
const indeks = read('dokumentasi/README.md');
const nip1 = read('dokumentasi/nip/NIP-0001.md');

const prinsip = konstitusi.split('\n').filter((line) => /^\d+\. \*\*/.test(line));
const keywordRows = keyword.split('\n').filter((line) => /^\|\s*`[^`]+`\s*\|/.test(line));
const keywordNames = keywordRows.map((line) => line.match(/^\|\s*`([^`]+)`/)?.[1]);
const established = keywordRows.filter((line) => line.includes('**[DITETAPKAN]**'));
const proposed = keywordRows.filter((line) => line.includes('**[RANCANGAN]**'));
const typeRows = tipe.split('\n').filter((line) => /^\|\s*`[^`]+`\s*\|/.test(line));

check('Konstitusi memuat tepat 10 prinsip yang bernomor', () => {
  assert.equal(prinsip.length, 10);
  assert.match(konstitusi, /Bahasa Indonesia sebagai Bahasa Utama Sintaks/i);
  assert.match(konstitusi, /Tanpa Klaim Palsu/i);
});
check('Ketentuan keterbukaan tidak bertentangan dengan lisensi resmi Apache 2.0', () => {
  assert.match(konstitusi, /Apache License 2\.0/);
  assert.doesNotMatch(konstitusi, /MIT License/i);
  assert.match(konstitusi, /berkas `LISENSI`/);
});
check('Inventaris 32 bentuk kata kunci dan pembagian statusnya konsisten', () => {
  assert.equal(keywordRows.length, 32);
  assert.equal(new Set(keywordNames).size, 32);
  assert.equal(established.length, 21);
  assert.equal(proposed.length, 11);
  assert.match(nip1, /`buat` dan `baru`.*satu kelompok/);
  assert.match(keyword, /`buat` dan `baru` merupakan dua bentuk alternatif/);
});
check('Taksonomi Phase 2 memuat 10 nama tipe dengan status yang eksplisit', () => {
  assert.equal(typeRows.length, 10);
  assert.match(tipe, /`teks`/);
  assert.match(tipe, /`bilangan`/);
  assert.match(tipe, /`desimal`/);
  assert.match(tipe, /`logika`/);
  assert.match(tipe, /`karakter`/);
  assert.match(tipe, /`daftar`/);
  assert.match(tipe, /`peta`/);
  assert.match(tipe, /`tanggal`/);
  assert.match(tipe, /`waktu`/);
  assert.match(tipe, /`kosong`/);
});
check('Definisi karakter dan contoh tanggal/waktu tidak menyiratkan literal yang belum disahkan', () => {
  assert.match(tipe, /satu nilai skalar Unicode/);
  assert.doesNotMatch(tipe, /'🇮🇩'/);
  assert.match(tipe, /`"2026-10-02"` sebagai teks contoh/);
  assert.match(tipe, /`"08:30:00"` sebagai teks contoh/);
  assert.match(tipe, /bentuk literal khusus belum ditetapkan/);
});
check('NIP-0002 diterima dan terhubung ke Phase 2', () => {
  assert.match(nip, /NIP-0002/);
  assert.match(nip, /\*\*Status:\*\* Diterima/);
  assert.match(nip, /Phase 2 \(Konstitusi Bahasa\)/);
  assert.match(nip, /10 prinsip fundamental/);
});
check('Contoh program konstitusi menggunakan struktur program dan blok resmi', () => {
  assert.match(valid, /^program UjiKonstitusi\s+mulai/);
  assert.match(valid, /tetap BATAS_MINIMAL : bilangan = 70/);
  assert.match(valid, /jika skorKelayakan >= BATAS_MINIMAL maka/);
  assert.match(valid, /untuk hitungan dari 1 sampai 3 lakukan/);
  assert.match(valid, /selesai\s*$/);
});
check('Rencana uji NIP-0002 menunjuk berkas nyata dan skrip penerimaan Phase 2', () => {
  assert.match(nip, /pengujian\/spesifikasi\/program-valid\.nusantara/);
  assert.match(nip, /pengujian\/spesifikasi\/kasus-tidak-valid\.md/);
  assert.match(nip, /skrip\/uji_phase2\.js/);
  assert.doesNotMatch(nip, /program-tidak-valid\.md/);
  assert.equal((invalid.match(/^### Kasus \d+:/gm) || []).length, 15);
  assert.ok(fs.existsSync(path.join(root, 'skrip/uji_phase2.js')));
});
check('Indeks dokumentasi memuat seluruh dokumen inti Phase 2', () => {
  for (const link of ['KONSTITUSI-BAHASA.md', 'KEYWORD.md', 'TIPE-DATA.md', 'nip/NIP-0002.md']) {
    assert.ok(indeks.includes(link), `Tautan indeks hilang: ${link}`);
    assert.ok(fs.existsSync(path.join(root, 'dokumentasi', link)), `Target tautan hilang: ${link}`);
  }
});

console.log(`\nPhase 2: ${checks.length}/${checks.length} pemeriksaan lulus.`);
