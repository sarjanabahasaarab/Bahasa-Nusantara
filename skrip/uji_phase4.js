import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => {
  const full = path.join(root, p);
  assert.ok(fs.existsSync(full), 'Berkas wajib tidak ditemukan: ' + p);
  const value = fs.readFileSync(full, 'utf8');
  assert.ok(value.trim(), 'Berkas wajib kosong: ' + p);
  return value;
};
const grammar = read('dokumentasi/GRAMMAR-EBNF.md');
const syntax = read('dokumentasi/SPESIFIKASI-SINTAKS.md');
const token = read('dokumentasi/TOKEN.md');
const identifier = read('dokumentasi/IDENTIFIER.md');
const literal = read('dokumentasi/LITERAL.md');
const precedence = read('dokumentasi/PRIORITAS-OPERATOR.md');
const blocks = read('dokumentasi/ATURAN-BLOK.md');
const decisions = read('dokumentasi/KEPUTUSAN-TERBUKA.md');
const examples = read('dokumentasi/CONTOH-SINTAKS.md');
const valid = read('pengujian/spesifikasi/kasus-valid.md');
const invalid = read('pengujian/spesifikasi/kasus-tidak-valid.md');
const checks = [];
function check(name, fn) { fn(); checks.push(name); console.log('[LULUS] ' + name); }
check('Grammar memuat satu program utama dan fungsi sebelum program', () => {
  assert.match(grammar, /berkas_nusantara\s*=.*deklarasi_fungsi.*program_utama/s);
  assert.match(grammar, /program_utama\s*=\s*"program"/);
  assert.match(syntax, /tepat \*\*satu unit program utama\*\*/i);
});
check('Identifier ASCII konsisten pada EBNF, token, dan panduan', () => {
  assert.match(grammar, /pengidentifikasi\s*=\s*\( huruf \| "_" \), \{ huruf \| digit \| "_" \} \s*;/);
  assert.match(token, /\[a-zA-Z_\]\[a-zA-Z0-9_\]\*/);
  assert.match(identifier, /\[a-zA-Z_\]\[a-zA-Z0-9_\]\*/);
});
check('Grammar mencantumkan delapan nama tipe yang ditetapkan', () => {
  for (const t of ['teks','bilangan','desimal','logika','karakter','daftar','peta','kosong']) assert.ok(grammar.includes('"' + t + '"'), 'Tipe hilang: ' + t);
});
check('Literal karakter didefinisikan sebagai satu Unicode scalar', () => {
  assert.match(grammar, /literal_karakter\s*=/);
  assert.match(grammar, /tepat satu Unicode scalar value/);
  assert.match(token, /LITERAL_KARAKTER/);
  assert.match(literal, /Unicode scalar value/);
});
check('Literal teks, bilangan, desimal, logika, dan kosong memiliki aturan', () => {
  for (const rule of ['literal_teks','literal_bilangan','literal_desimal','literal_logika','literal_kosong']) assert.ok(grammar.includes(rule));
  for (const sample of ['"Halo"','42','3.14','benar','salah','kosong']) assert.ok(literal.includes(sample));
});
check('Escape sequence mengacu TOKEN dan mencakup carriage return', () => {
  assert.match(grammar, /urutan_lolos\s*=.*TOKEN\.md/);
  for (const e of ['\\n','\\t','\\r','\\\\','\\"']) assert.ok(token.includes(e), 'Escape hilang: ' + e);
  assert.match(literal, /\\r/);
});
check('Komentar tidak mensyaratkan newline setelah akhir berkas', () => {
  assert.match(grammar, /komentar\s*=\s*"\/\/", \{ bukan_baris_baru \} ;/);
  assert.match(token, /KOMENTAR/);
});
check('Urutan produksi ekspresi mengikuti presedensi operator', () => {
  const order = ['ekspresi_logika_atau','ekspresi_logika_dan','ekspresi_kesetaraan','ekspresi_relasional','ekspresi_aditif','ekspresi_multiplikatif','ekspresi_unari','ekspresi_dasar'];
  let last = -1;
  for (const item of order) { const at = grammar.indexOf(item + ' ='); assert.ok(at > last, 'Urutan presedensi salah: ' + item); last = at; }
  assert.match(precedence, /8 \(Terendah\)/);
});
check('Blok kondisi dan perulangan mewajibkan akhir', () => {
  for (const rule of ['percabangan_jika','perulangan_untuk','perulangan_selama']) assert.match(grammar, new RegExp(rule + ' =[^;]*"akhir"', 's'));
  assert.match(blocks, /Penutup.*akhir Wajib/);
});
check('Fungsi memakai parameter bertipe, blok, dan kembalikan', () => {
  assert.match(grammar, /deklarasi_fungsi\s*=.*blok_utama/s);
  assert.match(grammar, /parameter_tunggal\s*=\s*pengidentifikasi, spasi, ":", spasi, nama_tipe/);
  assert.match(grammar, /instruksi_kembalikan\s*=\s*"kembalikan"/);
});
check('Rancangan dan fitur di luar Phase 4 diberi label yang jujur', () => {
  assert.match(decisions, /\[TERBUKA \/ RANCANGAN\]/);
  assert.match(decisions, /Sintaksis Formal Koleksi/);
  assert.match(examples, /DI LUAR GRAMMAR PHASE 4/);
});
check('Katalog kasus valid dan tidak valid tersedia', () => {
  assert.match(valid, /Kasus 1/);
  assert.match(valid, /Kasus 7/);
  assert.match(invalid, /Minimal 15 Kasus/);
  assert.match(invalid, /Aturan Grammar Dilanggar/);
});
console.log('\nPhase 4: ' + checks.length + '/' + checks.length + ' pemeriksaan lulus.');
