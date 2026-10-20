/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Parser } from '../../src/parser/parser';
import {
  JenisNodeAST,
  NodeEkspresiBiner,
  NodeDeklarasiVariabel,
  NodePercabanganJika,
  NodePerulanganUntuk,
  NodePerulanganSelama,
  NodeDeklarasiFungsi,
} from '../../src/parser/ast';
import { ASTPrinter } from '../../src/parser/astPrinter';

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
console.log('PENGUJIAN KOMPREHENSIF PARSER & AST BAHASA NUSANTARA (Phase 7)');
console.log('Target Milestone: v0.7.0');
console.log('=============================================================================\n');

// 1. UJI STRUKTUR PROGRAM DASAR
console.log('--- Kelompok 1: Program Dasar & Root Node ---');
uji('Membangun NodeProgram dari struktur program sederhana', () => {
  const sumber = `program Halo\nmulai\nselesai`;
  const parser = new Parser(sumber);
  const ast = parser.parse();

  samaDengan(ast.jenis, JenisNodeAST.PROGRAM);
  samaDengan(ast.namaProgram, 'Halo');
  samaDengan(ast.tubuhUtama.length, 0);
  samaDengan(parser.dapatkanDaftarGalat().length, 0);
});

// 2. UJI LITERAL & NILAI TERURAI
console.log('\n--- Kelompok 2: Literal & Nilai Terurai ---');
uji('Menangani berbagai tipe literal dengan nilai terurai yang tepat', () => {
  const sumber = `
  program UjiLiteral
  mulai
      s = "teks halo"
      b = 42
      d = 3.14
      l = benar
      k = kosong
  selesai`;
  const parser = new Parser(sumber);
  const ast = parser.parse();

  samaDengan(ast.tubuhUtama.length, 5);
  const stmt0 = ast.tubuhUtama[0] as any;
  samaDengan(stmt0.nilai.nilaiTerurai, 'teks halo');
  const stmt1 = ast.tubuhUtama[1] as any;
  samaDengan(stmt1.nilai.nilaiTerurai, 42);
  const stmt2 = ast.tubuhUtama[2] as any;
  samaDengan(stmt2.nilai.nilaiTerurai, 3.14);
  const stmt3 = ast.tubuhUtama[3] as any;
  samaDengan(stmt3.nilai.nilaiTerurai, true);
  const stmt4 = ast.tubuhUtama[4] as any;
  samaDengan(stmt4.nilai.nilaiTerurai, null);
});

// 3. UJI PRESEDENSI OPERATOR
console.log('\n--- Kelompok 3: Presedensi Operator & Pengelompokan ---');
uji('Presedensi: a + b * c harus dipahami sebagai a + (b * c)', () => {
  const sumber = `program Uji\nmulai\n    x = a + b * c\nselesai`;
  const parser = new Parser(sumber);
  const ast = parser.parse();

  const penugasan = ast.tubuhUtama[0] as any;
  const expr = penugasan.nilai as NodeEkspresiBiner;

  samaDengan(expr.jenis, JenisNodeAST.EKSPRESI_BINER);
  samaDengan(expr.operator, '+', 'Akar ekspresi harus operator tambah +');
  samaDengan(expr.kiri.jenis, JenisNodeAST.PENGIDENTIFIKASI);

  const kanan = expr.kanan as NodeEkspresiBiner;
  samaDengan(kanan.jenis, JenisNodeAST.EKSPRESI_BINER);
  samaDengan(kanan.operator, '*', 'Cabang kanan harus operator kali *');
});

uji('Pengelompokan kurung: (a + b) * c harus dipahami dengan * di akar', () => {
  const sumber = `program Uji\nmulai\n    x = (a + b) * c\nselesai`;
  const parser = new Parser(sumber);
  const ast = parser.parse();

  const penugasan = ast.tubuhUtama[0] as any;
  const expr = penugasan.nilai as NodeEkspresiBiner;

  samaDengan(expr.operator, '*', 'Akar ekspresi harus operator kali *');
  samaDengan(expr.kiri.jenis, JenisNodeAST.EKSPRESI_PENGELOMPOKAN);
});

// 4. UJI DEKLARASI VARIABEL & TETAP
console.log('\n--- Kelompok 4: Deklarasi Variabel & Tetap ---');
uji('Parsing deklarasi variabel gaya ringkas dan eksplisit', () => {
  const sumber = `
  program UjiVar
  mulai
      nama : teks = "Ahmad"
      variabel umur : bilangan = 20
      tetap PHI : desimal = 3.14
  selesai`;
  const parser = new Parser(sumber);
  const ast = parser.parse();

  samaDengan(ast.tubuhUtama.length, 3);
  samaDengan(ast.tubuhUtama[0].jenis, JenisNodeAST.DEKLARASI_VARIABEL);
  const v1 = ast.tubuhUtama[0] as NodeDeklarasiVariabel;
  samaDengan(v1.nama, 'nama');
  samaDengan(v1.tipeData, 'teks');

  samaDengan(ast.tubuhUtama[1].jenis, JenisNodeAST.DEKLARASI_VARIABEL);
  const v2 = ast.tubuhUtama[1] as NodeDeklarasiVariabel;
  samaDengan(v2.nama, 'umur');
  samaDengan(v2.tipeData, 'bilangan');

  samaDengan(ast.tubuhUtama[2].jenis, JenisNodeAST.DEKLARASI_TETAP);
});

// 5. UJI PERCABANGAN JIKA
console.log('\n--- Kelompok 5: Percabangan Jika-Maka-Selain ---');
uji('Parsing percabangan jika lengkap dengan selain', () => {
  const sumber = `
  program UjiJika
  mulai
      jika nilai >= 75 maka
          tampilkan("Lulus")
      selain
          tampilkan("Remedial")
      akhir
  selesai`;
  const parser = new Parser(sumber);
  const ast = parser.parse();

  const jika = ast.tubuhUtama[0] as NodePercabanganJika;
  samaDengan(jika.jenis, JenisNodeAST.PERCABANGAN_JIKA);
  samaDengan(jika.cabangMaka.length, 1);
  samaDengan(jika.cabangSelain?.length, 1);
});

// 6. UJI PERULANGAN UNTUK & SELAMA
console.log('\n--- Kelompok 6: Perulangan Untuk & Selama ---');
uji('Parsing perulangan untuk rentang dan perulangan selama', () => {
  const sumber = `
  program UjiLoop
  mulai
      untuk i dari 1 sampai 10 lakukan
          jika i == 5 maka
              lanjutkan
          akhir
          hentikan
      akhir

      selama aktif lakukan
          tampilkan(1)
      akhir
  selesai`;
  const parser = new Parser(sumber);
  const ast = parser.parse();

  const untuk = ast.tubuhUtama[0] as NodePerulanganUntuk;
  samaDengan(untuk.jenis, JenisNodeAST.PERULANGAN_UNTUK);
  samaDengan(untuk.variabelPenghitung, 'i');
  samaDengan(untuk.tubuh.length, 2);

  const selama = ast.tubuhUtama[1] as NodePerulanganSelama;
  samaDengan(selama.jenis, JenisNodeAST.PERULANGAN_SELAMA);
  samaDengan(selama.tubuh.length, 1);
});

// 7. UJI DEKLARASI FUNGSI
console.log('\n--- Kelompok 7: Deklarasi Fungsi Modular ---');
uji('Parsing deklarasi fungsi dengan parameter bertipe dan nilai kembali', () => {
  const sumber = `
  fungsi kali(a : bilangan, b : bilangan) : bilangan
  mulai
      kembalikan a * b
  selesai

  program UjiFn
  mulai
      hasil = kali(3, 4)
  selesai`;
  const parser = new Parser(sumber);
  const ast = parser.parse();

  samaDengan(ast.daftarFungsi.length, 1);
  const fn = ast.daftarFungsi[0] as NodeDeklarasiFungsi;
  samaDengan(fn.nama, 'kali');
  samaDengan(fn.parameter.length, 2);
  samaDengan(fn.parameter[0].nama, 'a');
  samaDengan(fn.parameter[0].tipeData, 'bilangan');
  samaDengan(fn.tipeKembalian, 'bilangan');
  samaDengan(fn.tubuh.length, 1);
});

// 8. UJI AST PRINTER
console.log('\n--- Kelompok 8: Visualisasi AST Printer ---');
uji('Menghasilkan pohon teks berindentasi rapi dari AST', () => {
  const sumber = `program Halo\nmulai\n    tampilkan("Halo Dunia!")\nselesai`;
  const parser = new Parser(sumber);
  const ast = parser.parse();
  const cetakan = ASTPrinter.cetak(ast);

  samaDengan(cetakan.includes('Program: Halo'), true);
  samaDengan(cetakan.includes('PemanggilanFungsi: tampilkan()'), true);
  samaDengan(cetakan.includes('Literal (teks): "Halo Dunia!"'), true);
});

// 9. UJI PENANGANAN KESALAHAN SINTAKSIS & DIAGNOSTIK
console.log('\n--- Kelompok 9: Penanganan Kesalahan Sintaksis ---');
uji('Menghasilkan galat diagnostik bahasa Indonesia saat kata kunci tidak lengkap', () => {
  const sumber = `program Rusak\nmulai\n    jika nilai >= 75\n        tampilkan("Lulus")\n    akhir\nselesai`;
  const parser = new Parser(sumber);
  parser.parse();
  const galat = parser.dapatkanDaftarGalat();

  samaDengan(galat.length > 0, true, 'Harus mencatat minimal 1 galat');
  samaDengan(galat[0].message.includes('diharapkan'), true, 'Pesan harus memuat keterangan harapan token');
});

// 10. UJI INTEGRASI KODE CONTOH RESMI
console.log('\n--- Kelompok 10: Integrasi Penuh Program Contoh Resmi ---');
uji('Integrasi Program Kasir Toko', () => {
  const sumber = `
  program Kasir
  mulai
      harga : bilangan = 50000
      jumlah : bilangan = 2
      total : bilangan = harga * jumlah
      tampilkan(total)
  selesai`;
  const parser = new Parser(sumber);
  const ast = parser.parse();

  samaDengan(parser.dapatkanDaftarGalat().length, 0);
  samaDengan(ast.tubuhUtama.length, 4);
});

// REKAPITULASI HASIL
console.log('\n-----------------------------------------------------------------------------');
const jumlahLulus = daftarHasil.filter(h => h.lulus).length;
const jumlahGagal = daftarHasil.filter(h => !h.lulus).length;
console.log(`Hasil Pengujian Parser: ${jumlahLulus} Uji LULUS, ${jumlahGagal} Uji GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (jumlahGagal === 0) {
  console.log('STATUS: SELURUH PENGUJIAN PARSER NUSANTARA BERHASIL 100%.');
  process.exit(0);
} else {
  console.error('STATUS: TERDAPAT PENGUJIAN PARSER YANG GAGAL.');
  process.exit(1);
}
