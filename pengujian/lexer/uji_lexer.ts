/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lexer } from '../../src/lexer/lexer';
import { JenisToken } from '../../src/lexer/jenisToken';
import { TokenStream } from '../../src/lexer/tokenStream';

interface HasilUji {
  nama: string;
  lulus: boolean;
  pesan?: string;
}

const daftarHasil: HasilUji[] = [];

function uji(nama: string, fn: () => void) {
  try {
    fn();
    daftarHasil.push({ nama, lulus: true });
    console.log(`  [✓ LULUS] ${nama}`);
  } catch (error: any) {
    daftarHasil.push({ nama, lulus: false, pesan: error.message });
    console.error(`  [✗ GAGAL] ${nama}: ${error.message}`);
  }
}

function samaDengan(aktual: any, ekspektasi: any, pesan?: string) {
  if (aktual !== ekspektasi) {
    throw new Error(pesan || `Ekspektasi '${ekspektasi}', namun mendapatkan '${aktual}'`);
  }
}

console.log('=============================================================================');
console.log('PENGUJIAN KOMPREHENSIF LEXER BAHASA NUSANTARA (Phase 6)');
console.log('Target Milestone: v0.6.0');
console.log('=============================================================================\n');

// 1. UJI KATA KUNCI RESMI (32 Keyword)
console.log('--- Kelompok 1: Pengujian Kata Kunci Resmi ---');
uji('Mengenali 21 kata kunci ditetapkan', () => {
  const sumber = 'program mulai selesai variabel tetap fungsi kembalikan jika maka selain akhir selama untuk dari sampai lakukan hentikan lanjutkan benar salah kosong';
  const lexer = new Lexer(sumber);
  const { token } = lexer.tokenisasi();

  const ekspektasi = [
    JenisToken.KW_PROGRAM, JenisToken.KW_MULAI, JenisToken.KW_SELESAI, JenisToken.KW_VARIABEL,
    JenisToken.KW_TETAP, JenisToken.KW_FUNGSI, JenisToken.KW_KEMBALIKAN, JenisToken.KW_JIKA,
    JenisToken.KW_MAKA, JenisToken.KW_SELAIN, JenisToken.KW_AKHIR, JenisToken.KW_SELAMA,
    JenisToken.KW_UNTUK, JenisToken.KW_DARI, JenisToken.KW_SAMPAI, JenisToken.KW_LAKUKAN,
    JenisToken.KW_HENTIKAN, JenisToken.KW_LANJUTKAN, JenisToken.KW_BENAR, JenisToken.KW_SALAH,
    JenisToken.KW_KOSONG, JenisToken.EOF
  ];

  samaDengan(token.length, ekspektasi.length, 'Jumlah token kata kunci ditetapkan harus 21 + 1 EOF');
  for (let i = 0; i < ekspektasi.length; i++) {
    samaDengan(token[i].jenis, ekspektasi[i], `Token ke-${i} salah`);
  }
});

uji('Mengenali 11 kata kunci rancangan lanjutan', () => {
  const sumber = 'coba tangkap lempar impor buat kelas umum pribadi lindungi baru hapus';
  const lexer = new Lexer(sumber);
  const { token } = lexer.tokenisasi();

  const ekspektasi = [
    JenisToken.KW_COBA, JenisToken.KW_TANGKAP, JenisToken.KW_LEMPAR, JenisToken.KW_IMPOR,
    JenisToken.KW_BUAT, JenisToken.KW_KELAS, JenisToken.KW_UMUM, JenisToken.KW_PRIBADI,
    JenisToken.KW_LINDUNGI, JenisToken.KW_BARU, JenisToken.KW_HAPUS, JenisToken.EOF
  ];

  samaDengan(token.length, ekspektasi.length);
  for (let i = 0; i < ekspektasi.length; i++) {
    samaDengan(token[i].jenis, ekspektasi[i]);
  }
});

// 2. UJI IDENTIFIER
console.log('\n--- Kelompok 2: Pengujian Identifier ---');
uji('Mengenali identifier biasa dan pembeda dari kata kunci', () => {
  const sumber = 'nama umur totalNilai skor_akhir _id x1';
  const lexer = new Lexer(sumber);
  const { token } = lexer.tokenisasi();

  samaDengan(token.length, 7); // 6 identifier + 1 EOF
  token.slice(0, 6).forEach((t) => samaDengan(t.jenis, JenisToken.IDENTIFIER));
  samaDengan(token[0].nilai, 'nama');
  samaDengan(token[4].nilai, '_id');
});

// 3. UJI LITERAL ANGKA & DESIMAL
console.log('\n--- Kelompok 3: Pengujian Literal Angka ---');
uji('Mengenali bilangan bulat positif dan desimal', () => {
  const sumber = '0 42 1000 3.14 0.25 170.5';
  const lexer = new Lexer(sumber);
  const { token } = lexer.tokenisasi();

  samaDengan(token[0].jenis, JenisToken.LITERAL_BILANGAN);
  samaDengan(token[0].nilai, '0');
  samaDengan(token[1].jenis, JenisToken.LITERAL_BILANGAN);
  samaDengan(token[1].nilai, '42');
  samaDengan(token[2].jenis, JenisToken.LITERAL_BILANGAN);
  samaDengan(token[2].nilai, '1000');

  samaDengan(token[3].jenis, JenisToken.LITERAL_DESIMAL);
  samaDengan(token[3].nilai, '3.14');
  samaDengan(token[4].jenis, JenisToken.LITERAL_DESIMAL);
  samaDengan(token[4].nilai, '0.25');
  samaDengan(token[5].jenis, JenisToken.LITERAL_DESIMAL);
  samaDengan(token[5].nilai, '170.5');
});

// 4. UJI LITERAL TEKS & ESCAPE SEQUENCES
console.log('\n--- Kelompok 4: Pengujian Literal Teks ---');
uji('Mengenali string biasa dan escape sequences (\\n, \\t, \\", \\\\)', () => {
  const sumber = `"Halo Dunia" "Baris 1\\nBaris 2\\tTab\\"Kutip\\\\"`;
  const lexer = new Lexer(sumber);
  const { token } = lexer.tokenisasi();

  samaDengan(token[0].jenis, JenisToken.LITERAL_TEKS);
  samaDengan(token[0].nilai, 'Halo Dunia');
  samaDengan(token[1].jenis, JenisToken.LITERAL_TEKS);
  samaDengan(token[1].nilai, 'Baris 1\nBaris 2\tTab"Kutip\\');
});

// 5. UJI OPERATOR & LONGEST MATCH
console.log('\n--- Kelompok 5: Pengujian Operator & Longest Match ---');
uji('Mengenali operator aritmetika dan pembeda operator perbandingan multi-karakter', () => {
  const sumber = '+ - * / % = == != < <= > >= dan atau tidak';
  const lexer = new Lexer(sumber);
  const { token } = lexer.tokenisasi();

  const ekspektasi = [
    JenisToken.OP_TAMBAH, JenisToken.OP_KURANG, JenisToken.OP_KALI, JenisToken.OP_BAGI, JenisToken.OP_MODULO,
    JenisToken.OP_SAMA_DENGAN, JenisToken.OP_KESETARAAN, JenisToken.OP_KETIDAKSAMAAN,
    JenisToken.OP_LEBIH_KECIL, JenisToken.OP_LEBIH_KECIL_SAMA, JenisToken.OP_LEBIH_BESAR, JenisToken.OP_LEBIH_BESAR_SAMA,
    JenisToken.OP_LOGIKA_DAN, JenisToken.OP_LOGIKA_ATAU, JenisToken.OP_LOGIKA_TIDAK,
    JenisToken.EOF
  ];

  samaDengan(token.length, ekspektasi.length);
  for (let i = 0; i < ekspektasi.length; i++) {
    samaDengan(token[i].jenis, ekspektasi[i]);
  }
});

// 6. UJI PEMISAH & TANDA BACA
console.log('\n--- Kelompok 6: Pengujian Pemisah (Separators) ---');
uji('Mengenali kurung, kurawal, siku, koma, titik dua, titik', () => {
  const sumber = '( ) [ ] { } , : .';
  const lexer = new Lexer(sumber);
  const { token } = lexer.tokenisasi();

  const ekspektasi = [
    JenisToken.KURUNG_BUKA, JenisToken.KURUNG_TUTUP,
    JenisToken.SIKU_BUKA, JenisToken.SIKU_TUTUP,
    JenisToken.KURAWAL_BUKA, JenisToken.KURAWAL_TUTUP,
    JenisToken.KOMA, JenisToken.TITIK_DUA, JenisToken.TITIK,
    JenisToken.EOF
  ];

  samaDengan(token.length, ekspektasi.length);
  for (let i = 0; i < ekspektasi.length; i++) {
    samaDengan(token[i].jenis, ekspektasi[i]);
  }
});

// 7. UJI KOMENTAR & WHITESPACE
console.log('\n--- Kelompok 7: Pengujian Komentar & Whitespace ---');
uji('Mengabaikan spasi, tab, dan komentar // secara bersih', () => {
  const sumber = `
    // Komentar di awal
    x = 10 // Komentar di akhir baris
    // Baris komentar lain
    y = 20
  `;
  const lexer = new Lexer(sumber, { sertakanBarisBaru: false });
  const { token } = lexer.tokenisasi();

  samaDengan(token[0].nilai, 'x');
  samaDengan(token[1].nilai, '=');
  samaDengan(token[2].nilai, '10');
  samaDengan(token[3].nilai, 'y');
  samaDengan(token[4].nilai, '=');
  samaDengan(token[5].nilai, '20');
  samaDengan(token[6].jenis, JenisToken.EOF);
});

// 8. UJI POSISI TOKEN
console.log('\n--- Kelompok 8: Pengujian Posisi Baris & Kolom ---');
uji('Melacak baris dan kolom karakter secara presisi', () => {
  const sumber = 'program\n  Halo';
  const lexer = new Lexer(sumber);
  const { token } = lexer.tokenisasi();

  samaDengan(token[0].nilai, 'program');
  samaDengan(token[0].baris, 1);
  samaDengan(token[0].kolom, 1);

  // token[1] adalah BARIS_BARU
  samaDengan(token[2].nilai, 'Halo');
  samaDengan(token[2].baris, 2);
  samaDengan(token[2].kolom, 3); // Indentasi 2 spasi
});

// 9. UJI PENANGANAN GALAT LEKSIKAL (ERROR REPORTING)
console.log('\n--- Kelompok 9: Pengujian Pelaporan Galat Leksikal ---');
uji('Menangani karakter ilegal @ tanpa crash dan mencatat galat', () => {
  const sumber = 'variabel @ = 10';
  const lexer = new Lexer(sumber);
  const { token, galat } = lexer.tokenisasi();

  samaDengan(galat.length, 1);
  samaDengan(galat[0].jenis, 'KARAKTER_TAK_DIKENAL');
  samaDengan(token[1].jenis, JenisToken.ILEGAL);
});

uji('Menangani string tidak ditutup dan mencatat galat ramah', () => {
  const sumber = 'nama : teks = "Budi\ntampilkan(nama)';
  const lexer = new Lexer(sumber);
  const { galat } = lexer.tokenisasi();

  samaDengan(galat.length, 1);
  samaDengan(galat[0].jenis, 'TEKS_TIDAK_DITUTUP');
});

uji('Menangani desimal tidak valid dengan titik ganda (12.3.4)', () => {
  const sumber = 'skor = 12.3.4';
  const lexer = new Lexer(sumber);
  const { galat } = lexer.tokenisasi();

  samaDengan(galat.length, 1);
  samaDengan(galat[0].jenis, 'ANGKA_TIDAK_VALID');
});

// 10. UJI ABSTRAKSI TOKENSTREAM
console.log('\n--- Kelompok 10: Pengujian TokenStream ---');
uji('Mendukung navigasi current, next, peek, dan eof', () => {
  const sumber = 'a = 10';
  const lexer = new Lexer(sumber, { sertakanBarisBaru: false });
  const stream = new TokenStream(lexer);

  samaDengan(stream.current().nilai, 'a');
  samaDengan(stream.peek(1).nilai, '=');
  samaDengan(stream.peek(2).nilai, '10');

  const tok1 = stream.next();
  samaDengan(tok1.nilai, 'a');
  samaDengan(stream.current().nilai, '=');

  stream.next(); // Lewati '='
  stream.next(); // Lewati '10'

  samaDengan(stream.eof(), true);
  samaDengan(stream.current().jenis, JenisToken.EOF);
});

// 11. UJI INTEGRASI KODE PROGRAM RESMI (Phase 5)
console.log('\n--- Kelompok 11: Pengujian Integrasi Program Resmi ---');
uji('Tokenisasi Program Halo Dunia', () => {
  const sumber = `program Halo\n\nmulai\n    tampilkan("Halo Dunia!")\nselesai`;
  const lexer = new Lexer(sumber, { sertakanBarisBaru: false });
  const { token, galat } = lexer.tokenisasi();

  samaDengan(galat.length, 0);
  samaDengan(token[0].jenis, JenisToken.KW_PROGRAM);
  samaDengan(token[1].nilai, 'Halo');
  samaDengan(token[2].jenis, JenisToken.KW_MULAI);
  samaDengan(token[3].nilai, 'tampilkan');
  samaDengan(token[4].jenis, JenisToken.KURUNG_BUKA);
  samaDengan(token[5].jenis, JenisToken.LITERAL_TEKS);
  samaDengan(token[5].nilai, 'Halo Dunia!');
  samaDengan(token[6].jenis, JenisToken.KURUNG_TUTUP);
  samaDengan(token[7].jenis, JenisToken.KW_SELESAI);
  samaDengan(token[8].jenis, JenisToken.EOF);
});

uji('Tokenisasi Program Percabangan & Operator', () => {
  const sumber = `
    jika nilai >= 75 maka
        tampilkan("Lulus")
    selain
        tampilkan("Belum lulus")
    akhir
  `;
  const lexer = new Lexer(sumber, { sertakanBarisBaru: false });
  const { token, galat } = lexer.tokenisasi();

  samaDengan(galat.length, 0);
  samaDengan(token[0].jenis, JenisToken.KW_JIKA);
  samaDengan(token[1].nilai, 'nilai');
  samaDengan(token[2].jenis, JenisToken.OP_LEBIH_BESAR_SAMA);
  samaDengan(token[3].nilai, '75');
  samaDengan(token[4].jenis, JenisToken.KW_MAKA);
});

uji('Tokenisasi Program Perulangan untuk rentang', () => {
  const sumber = `untuk angka dari 1 sampai 10 lakukan\n    tampilkan(angka)\nakhir`;
  const lexer = new Lexer(sumber, { sertakanBarisBaru: false });
  const { token, galat } = lexer.tokenisasi();

  samaDengan(galat.length, 0);
  samaDengan(token[0].jenis, JenisToken.KW_UNTUK);
  samaDengan(token[1].nilai, 'angka');
  samaDengan(token[2].jenis, JenisToken.KW_DARI);
  samaDengan(token[3].nilai, '1');
  samaDengan(token[4].jenis, JenisToken.KW_SAMPAI);
  samaDengan(token[5].nilai, '10');
  samaDengan(token[6].jenis, JenisToken.KW_LAKUKAN);
});

uji('Tokenisasi Program Fungsi Modular', () => {
  const sumber = `fungsi tambah(a : bilangan, b : bilangan) : bilangan\nmulai\n    kembalikan a + b\nselesai`;
  const lexer = new Lexer(sumber, { sertakanBarisBaru: false });
  const { token, galat } = lexer.tokenisasi();

  samaDengan(galat.length, 0);
  samaDengan(token[0].jenis, JenisToken.KW_FUNGSI);
  samaDengan(token[1].nilai, 'tambah');
  samaDengan(token[2].jenis, JenisToken.KURUNG_BUKA);
  samaDengan(token[3].nilai, 'a');
  samaDengan(token[4].jenis, JenisToken.TITIK_DUA);
  samaDengan(token[5].nilai, 'bilangan');
  samaDengan(token[6].jenis, JenisToken.KOMA);
  samaDengan(token[7].nilai, 'b');
  samaDengan(token[8].jenis, JenisToken.TITIK_DUA);
  samaDengan(token[9].nilai, 'bilangan');
  samaDengan(token[10].jenis, JenisToken.KURUNG_TUTUP);
  samaDengan(token[11].jenis, JenisToken.TITIK_DUA);
  samaDengan(token[12].nilai, 'bilangan');
  samaDengan(token[13].jenis, JenisToken.KW_MULAI);
  samaDengan(token[14].jenis, JenisToken.KW_KEMBALIKAN);
  samaDengan(token[15].nilai, 'a');
  samaDengan(token[16].jenis, JenisToken.OP_TAMBAH);
  samaDengan(token[17].nilai, 'b');
  samaDengan(token[18].jenis, JenisToken.KW_SELESAI);
});

// 12. UJI KASUS BATAS (EDGE CASES)
console.log('\n--- Kelompok 12: Pengujian Kasus Batas (Edge Cases) ---');
uji('Kasus batas: string kosong', () => {
  const lexer = new Lexer('');
  const { token, galat } = lexer.tokenisasi();
  samaDengan(galat.length, 0);
  samaDengan(token.length, 1);
  samaDengan(token[0].jenis, JenisToken.EOF);
});

uji('Kasus batas: hanya whitespace dan baris baru berulang', () => {
  const lexer = new Lexer('   \n\n\t\t\r\n   ', { sertakanBarisBaru: false });
  const { token, galat } = lexer.tokenisasi();
  samaDengan(galat.length, 0);
  samaDengan(token.length, 1);
  samaDengan(token[0].jenis, JenisToken.EOF);
});

uji('Kasus batas: hanya komentar beruntun', () => {
  const lexer = new Lexer('// Komentar 1\n// Komentar 2\n// Komentar 3', { sertakanBarisBaru: false });
  const { token, galat } = lexer.tokenisasi();
  samaDengan(galat.length, 0);
  samaDengan(token.length, 1);
  samaDengan(token[0].jenis, JenisToken.EOF);
});

uji('Kasus batas: identifier dan string sangat panjang', () => {
  const idPanjang = 'variabelPanjangSekaliYangMemilikiKarakterBanyakSekali1234567890';
  const stringPanjang = '"' + 'A'.repeat(500) + '"';
  const lexer = new Lexer(`${idPanjang} = ${stringPanjang}`, { sertakanBarisBaru: false });
  const { token, galat } = lexer.tokenisasi();

  samaDengan(galat.length, 0);
  samaDengan(token[0].nilai, idPanjang);
  samaDengan(token[2].nilai, 'A'.repeat(500));
});

// REKAPITULASI HASIL
console.log('\n-----------------------------------------------------------------------------');
const jumlahLulus = daftarHasil.filter(h => h.lulus).length;
const jumlahGagal = daftarHasil.filter(h => !h.lulus).length;
console.log(`Hasil Pengujian Lexer: ${jumlahLulus} Uji LULUS, ${jumlahGagal} Uji GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (jumlahGagal === 0) {
  console.log('STATUS: SELURUH PENGUJIAN LEXER NUSANTARA BERHASIL 100%.');
  process.exit(0);
} else {
  console.error('STATUS: TERDAPAT PENGUJIAN LEXER YANG GAGAL.');
  process.exit(1);
}
