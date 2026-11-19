/**
 * Uji penerimaan Phase 1 — Identitas & Fondasi NUSANTARA.
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

const prinsip = read('dokumentasi/prinsip-desain.md');
const arsitektur = read('dokumentasi/arsitektur-kompilator.md');
const nip = read('dokumentasi/nip/NIP-0001.md');
const indeks = read('dokumentasi/README.md');
const contohIndeks = read('contoh/README.md');
const halo = read('contoh/01_halo.nusantara');
const kompilator = read('kompilator/README.md');
const runtime = read('runtime/README.md');

check('Identitas resmi NUSANTARA dan ekstensi .nusantara ditetapkan', () => {
  assert.match(nip, /\\*\\*Nama Resmi:\\*\\*\\s*NUSANTARA/);
  assert.match(nip, /\\*\\*Ekstensi Berkas Kode Sumber:\\*\\*\\s*`.nusantara`/);
});
check('Prinsip desain tidak bertentangan dengan lisensi resmi Phase 3', () => {
  assert.match(prinsip, /lisensi resmi ditetapkan secara terpisah pada Phase 3/i);
  assert.doesNotMatch(prinsip, /MIT License/i);
});
check('NIP-0001 memiliki metadata dan status penerimaan', () => {
  assert.match(nip, /NIP-0001/);
  assert.match(nip, /\\*\\*Status:\\*\\*\\s*Diterima/);
  assert.match(nip, /Phase 1 \(Identitas & Fondasi\)/);
});
check('Jumlah kelompok kata kunci awal dijelaskan tanpa hitung ambigu', () => {
  assert.match(nip, /27 entri kelompok kata kunci awal/);
  assert.match(nip, /`buat` dan `baru`.*dua bentuk alternatif/);
});
check('Contoh Halo Dunia mengikuti struktur program dasar', () => {
  assert.match(halo, /^program Halo\s+mulai\s+tampilkan\("Halo Dunia!"\)\s+selesai\s*$/);
  assert.match(contohIndeks, /01_halo\.nusantara/);
});
check('Cetak biru kompilator membedakan rancangan dari implementasi', () => {
  assert.match(arsitektur, /Phase 1/);
  assert.match(arsitektur, /tanpa implementasi kompilator tiruan/);
  assert.match(kompilator, /belum memuat implementasi kode kompilator/i);
  assert.match(runtime, /Belum diimplementasikan/i);
});
check('Peta fase arsitektur selaras dengan milestone lexer, parser, NIR, LLVM, dan linker', () => {
  for (const phase of ['Fase 6', 'Fase 7', 'Phase 43', 'Phase 44', 'Phase 45']) {
    assert.ok(arsitektur.includes(phase), `Pemetaan fase hilang: ${phase}`);
  }
});
check('Indeks dokumentasi menautkan dokumen fondasi utama', () => {
  for (const link of ['prinsip-desain.md', 'arsitektur-kompilator.md', 'nip/NIP-0001.md']) {
    assert.ok(indeks.includes(link), `Tautan indeks hilang: ${link}`);
    assert.ok(fs.existsSync(path.join(root, 'dokumentasi', link)), `Target tautan hilang: ${link}`);
  }
});

console.log(`\nPhase 1: ${checks.length}/${checks.length} pemeriksaan lulus.`);
