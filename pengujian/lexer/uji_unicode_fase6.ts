import assert from 'node:assert/strict';
import { Lexer, JenisToken } from '../../src/lexer';

let total = 0;
function uji(nama: string, fn: () => void): void {
  fn();
  total++;
  console.log('✓ ' + nama);
}

uji('String mempertahankan scalar Unicode supplementary', () => {
  const { token, galat } = new Lexer('"😀"').tokenisasi();
  assert.equal(galat.length, 0);
  assert.equal(token[0].jenis, JenisToken.LITERAL_TEKS);
  assert.equal(token[0].nilai, '😀');
});

uji('Literal karakter menerima satu scalar Unicode supplementary', () => {
  const { token, galat } = new Lexer("'😀'").tokenisasi();
  assert.equal(galat.length, 0);
  assert.equal(token[0].jenis, JenisToken.LITERAL_KARAKTER);
  assert.equal(token[0].nilai, '😀');
});

uji('Kolom token menghitung scalar, bukan unit UTF-16', () => {
  const { token } = new Lexer('"😀" nama').tokenisasi();
  assert.equal(token[1].nilai, 'nama');
  assert.equal(token[1].kolom, 5);
});

uji('Rentang indeks tetap menggunakan offset UTF-16 yang benar', () => {
  const { token } = new Lexer("'😀' x").tokenisasi();
  assert.equal(token[0].posisi.akhir.indeks, 4);
  assert.equal(token[1].posisi.awal.indeks, 5);
});

uji('Literal karakter kosong ditolak', () => {
  const { token, galat } = new Lexer("''").tokenisasi();
  assert.equal(token[0].jenis, JenisToken.ILEGAL);
  assert.equal(galat.length, 1);
});

uji('Literal karakter dengan lebih dari satu scalar ditolak', () => {
  const { token, galat } = new Lexer("'ab'").tokenisasi();
  assert.equal(token[0].jenis, JenisToken.ILEGAL);
  assert.equal(galat.length, 1);
  assert.equal(token.at(-1)?.jenis, JenisToken.EOF);
});

uji('Urutan escape belum diizinkan pada literal karakter', () => {
  const { token, galat } = new Lexer(String.fromCharCode(39, 92, 110, 39)).tokenisasi();
  assert.equal(token[0].jenis, JenisToken.ILEGAL);
  assert.equal(galat.length, 1);
});

uji('Token setelah scalar supplementary tetap dapat dipindai', () => {
  const { token, galat } = new Lexer('"😀" + 1').tokenisasi();
  assert.equal(galat.length, 0);
  assert.equal(token[1].jenis, JenisToken.OP_TAMBAH);
  assert.equal(token[2].nilai, '1');
});

console.log(`Phase 6 Unicode: ${total}/8 lulus.`);
