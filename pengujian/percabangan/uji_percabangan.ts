/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Parser } from '../../src/parser/parser';
import { PemeriksaTipe } from '../../src/tipe/pemeriksaTipe';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { JenisGalatTipe } from '../../src/tipe/galatTipe';
import { JenisNodeAST, NodePercabanganJika } from '../../src/parser/ast';
import { JenisGalatParser } from '../../src/parser/galat';

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

function jalankanProgram(sumber: string): string[] {
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(sumber);
  return buffer.dapatkanSeluruhTeks();
}

function periksaTipeProgram(sumber: string) {
  const parser = new Parser(sumber);
  const ast = parser.parse();
  const pemeriksa = new PemeriksaTipe();
  return pemeriksa.periksa(ast);
}

console.log('=============================================================================');
console.log('PENGUJIAN KOMPREHENSIF PERCABANGAN BAHASA NUSANTARA (Phase 11)');
console.log('Target Milestone: v0.11.0');
console.log('=============================================================================\n');

// 1. UJI PERCABANGAN JIKA TANPA SELAIN
console.log('--- Kelompok 1: Percabangan Jika Tanpa Selain ---');
uji('Kondisi benar mengeksekusi blok maka', () => {
  const sumber = `
  program TesJikaBenar
  mulai
      nilai : bilangan = 85
      jika nilai >= 75 maka
          tampilkan("Memenuhi syarat")
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.length, 1);
  samaDengan(output[0], 'Memenuhi syarat');
});

uji('Kondisi salah melewatkan blok maka tanpa galat', () => {
  const sumber = `
  program TesJikaSalah
  mulai
      nilai : bilangan = 60
      jika nilai >= 75 maka
          tampilkan("Harusnya tidak tercetak")
      akhir
      tampilkan("Selesai periksa")
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.length, 1);
  samaDengan(output[0], 'Selesai periksa');
});

// 2. UJI PERCABANGAN JIKA DENGAN SELAIN
console.log('\n--- Kelompok 2: Percabangan Jika dengan Selain ---');
uji('Kondisi benar memilih cabang maka dan mengabaikan selain', () => {
  const sumber = `
  program KelulusanLulus
  mulai
      nilai : bilangan = 85
      jika nilai >= 75 maka
          tampilkan("Lulus")
      selain
          tampilkan("Belum lulus")
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.length, 1);
  samaDengan(output[0], 'Lulus');
});

uji('Kondisi salah memilih cabang selain dan mengabaikan maka', () => {
  const sumber = `
  program KelulusanGagal
  mulai
      nilai : bilangan = 50
      jika nilai >= 75 maka
          tampilkan("Lulus")
      selain
          tampilkan("Belum lulus")
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.length, 1);
  samaDengan(output[0], 'Belum lulus');
});

// 3. UJI PERCABANGAN BERTINGKAT (NESTED)
console.log('\n--- Kelompok 3: Percabangan Bertingkat (Nested Branching) ---');
uji('Percabangan bersarang di dalam blok selain mengevaluasi cabang yang tepat', () => {
  const sumber = `
  program KategoriNilai
  mulai
      nilai : bilangan = 85
      jika nilai >= 90 maka
          tampilkan("Sangat baik")
      selain
          jika nilai >= 75 maka
              tampilkan("Baik")
          selain
              tampilkan("Perlu perbaikan")
          akhir
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.length, 1);
  samaDengan(output[0], 'Baik');
});

uji('Percabangan bersarang di dalam blok maka', () => {
  const sumber = `
  program BersarangMaka
  mulai
      usia : bilangan = 25
      punyaKTP : logika = benar
      jika usia >= 17 maka
          jika punyaKTP maka
              tampilkan("Boleh memilih")
          selain
              tampilkan("Wajib buat KTP dulu")
          akhir
      selain
          tampilkan("Di bawah umur")
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.length, 1);
  samaDengan(output[0], 'Boleh memilih');
});

uji('Tiga tingkat percabangan bersarang mempertahankan pasangan blok akhir secara akurat', () => {
  const sumber = `
  program TigaTingkat
  mulai
      x : bilangan = 15
      jika x > 0 maka
          jika x > 10 maka
              jika x == 15 maka
                  tampilkan("Tepat 15")
              selain
                  tampilkan("Bukan 15")
              akhir
          akhir
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.length, 1);
  samaDengan(output[0], 'Tepat 15');
});

// 4. UJI STRUKTUR AST PERCABANGAN
console.log('\n--- Kelompok 4: Struktur AST Percabangan ---');
uji('Parser menghasilkan NodePercabanganJika dengan kondisi, cabangMaka, dan cabangSelain yang terisi', () => {
  const sumber = `
  program UjiAST
  mulai
      jika benar maka
          tampilkan(1)
      selain
          tampilkan(2)
      akhir
  selesai`;

  const parser = new Parser(sumber);
  const ast = parser.parse();
  samaDengan(parser.dapatkanDaftarGalat().length, 0);

  const jikaNode = ast.tubuhUtama[0] as NodePercabanganJika;
  samaDengan(jikaNode.jenis, JenisNodeAST.PERCABANGAN_JIKA);
  samaDengan(jikaNode.cabangMaka.length, 1);
  samaDengan(jikaNode.cabangSelain !== undefined, true);
  samaDengan(jikaNode.cabangSelain!.length, 1);
});

uji('Parser menghasilkan cabangSelain undefined jika selain ditiadakan', () => {
  const sumber = `
  program UjiASTTanpaSelain
  mulai
      jika benar maka
          tampilkan(1)
      akhir
  selesai`;

  const parser = new Parser(sumber);
  const ast = parser.parse();
  samaDengan(parser.dapatkanDaftarGalat().length, 0);

  const jikaNode = ast.tubuhUtama[0] as NodePercabanganJika;
  samaDengan(jikaNode.jenis, JenisNodeAST.PERCABANGAN_JIKA);
  samaDengan(jikaNode.cabangSelain, undefined);
});

// 5. UJI KONDISI DENGAN OPERATOR PHASE 10
console.log('\n--- Kelompok 5: Kondisi dengan Operator & Logika Kompleks ---');
uji('Kondisi perbandingan numerik dan kesetaraan', () => {
  const sumber = `
  program TesPerbandingan
  mulai
      a : bilangan = 10
      b : bilangan = 20
      jika a < b dan b == 20 maka
          tampilkan("Kondisi terpenuhi")
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Kondisi terpenuhi');
});

uji('Kondisi dengan negasi logika tidak', () => {
  const sumber = `
  program TesTidak
  mulai
      terkunci : logika = salah
      jika tidak terkunci maka
          tampilkan("Pintu terbuka")
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Pintu terbuka');
});

uji('Short-circuit evaluation bekerja aman dalam kondisi jika', () => {
  const sumber = `
  program TesShortCircuit
  mulai
      ada : logika = salah
      // Jika short-circuit tidak bekerja, 10 / 0 akan memicu runtime error
      jika ada dan (10 / 0 == 1) maka
          tampilkan("Harusnya tidak masuk")
      selain
          tampilkan("Short circuit berhasil melindungi runtime")
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Short circuit berhasil melindungi runtime');
});

// 6. UJI INTEGRASI LINGKUP & RUANG NAMA (SCOPING)
console.log('\n--- Kelompok 6: Integritas Lingkup & Penugasan Luar ---');
uji('Penugasan ulang ke variabel luar di dalam blok jika mengubah nilai variabel luar', () => {
  const sumber = `
  program UjiMutasi
  mulai
      status : teks = "Awal"
      kondisi : logika = benar
      jika kondisi maka
          status = "Diperbarui"
      selain
          status = "Gagal"
      akhir
      tampilkan(status)
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Diperbarui');
});

uji('Variabel yang dideklarasikan di dalam blok jika bersifat lokal dan terisolasi', () => {
  const sumber = `
  program UjiIsolasi
  mulai
      x : bilangan = 100
      jika benar maka
          lokal : bilangan = 50
          tampilkan(x + lokal)
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], '150');
});

// 7. UJI TYPE SYSTEM VALIDATION UNTUK KONDISI
console.log('\n--- Kelompok 7: Validasi Type System untuk Percabangan ---');
uji('Menolak kondisi percabangan bertipe bilangan', () => {
  const sumber = `
  program UjiTipeBilangan
  mulai
      jika 123 maka
          tampilkan("Salah")
      akhir
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Harus mendeteksi kondisi bertipe bilangan');
  samaDengan(galat[0].jenis, JenisGalatTipe.KETIDAKCOCOKAN_TIPE);
  samaDengan(galat[0].message.includes('logika'), true);
});

uji('Menolak kondisi percabangan bertipe teks', () => {
  const sumber = `
  program UjiTipeTeks
  mulai
      jika "halo" maka
          tampilkan("Salah")
      akhir
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Harus mendeteksi kondisi bertipe teks');
  samaDengan(galat[0].jenis, JenisGalatTipe.KETIDAKCOCOKAN_TIPE);
});

uji('Mendeteksi variabel pada kondisi percabangan yang belum dideklarasikan', () => {
  const sumber = `
  program UjiVarGaib
  mulai
      jika variabelBelumAda maka
          tampilkan("Harusnya dicegah")
      akhir
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Harus mendeteksi variabel belum dideklarasikan');
  samaDengan(galat[0].jenis, JenisGalatTipe.VARIABEL_BELUM_DIDEKLARASIKAN);
});

// 8. UJI DIAGNOSTIK KESALAHAN SINTAKSIS PARSER
console.log('\n--- Kelompok 8: Diagnostik Sintaksis Parser ---');
uji('Menolak kondisi percabangan kosong sebelum kata kunci maka', () => {
  const sumber = `
  program KondisiKosong
  mulai
      jika maka
          tampilkan(1)
      akhir
  selesai`;

  const parser = new Parser(sumber);
  parser.parse();
  const galat = parser.dapatkanDaftarGalat();
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatParser.EKSPRESI_TIDAK_LENGKAP);
});

uji('Menolak percabangan jika tanpa penutup akhir sebelum selesai', () => {
  const sumber = `
  program LupaAkhir
  mulai
      jika benar maka
          tampilkan(1)
  selesai`;

  const parser = new Parser(sumber);
  parser.parse();
  const galat = parser.dapatkanDaftarGalat();
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatParser.BLOK_TIDAK_DITUTUP);
});

uji('Menolak kata kunci selain yang muncul di luar blok jika', () => {
  const sumber = `
  program SelainNyasar
  mulai
      tampilkan(1)
      selain
      tampilkan(2)
  selesai`;

  const parser = new Parser(sumber);
  parser.parse();
  const galat = parser.dapatkanDaftarGalat();
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatParser.TOKEN_TAK_TERDUGA);
});

uji('Menolak kata kunci akhir yang muncul tanpa blok pembuka', () => {
  const sumber = `
  program AkhirNyasar
  mulai
      tampilkan(1)
      akhir
  selesai`;

  const parser = new Parser(sumber);
  parser.parse();
  const galat = parser.dapatkanDaftarGalat();
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatParser.TOKEN_TAK_TERDUGA);
});

// 9. UJI INTEGRASI PROGRAM CONTOH RESMI PROMPT
console.log('\n--- Kelompok 9: Integrasi Program Contoh Spesifikasi ---');
uji('Program Kelulusan resmi berjalan melalui pipeline penuh', () => {
  const sumber = `
  program Kelulusan
  mulai
      nilai : bilangan = 85

      jika nilai >= 75 maka
          tampilkan("Lulus")
      selain
          tampilkan("Belum lulus")
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Lulus');
});

uji('Program Kondisi resmi berjalan melalui pipeline penuh', () => {
  const sumber = `
  program Kondisi
  mulai
      umur : bilangan = 20

      jika umur >= 18 maka
          tampilkan("Dewasa")
      selain
          tampilkan("Belum dewasa")
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Dewasa');
});

uji('Program Seleksi kompleks dengan operator dan berjalan melalui pipeline penuh', () => {
  const sumber = `
  program Seleksi
  mulai
      nilai : bilangan = 85
      hadir : logika = benar

      jika nilai >= 75 dan hadir maka
          tampilkan("Memenuhi syarat")
      selain
          tampilkan("Belum memenuhi syarat")
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Memenuhi syarat');
});

// 10. REKAPITULASI HASIL
console.log('\n-----------------------------------------------------------------------------');
const jumlahLulus = daftarHasil.filter(h => h.lulus).length;
const jumlahGagal = daftarHasil.filter(h => !h.lulus).length;
console.log(`Hasil Pengujian Percabangan: ${jumlahLulus} Uji LULUS, ${jumlahGagal} Uji GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (jumlahGagal === 0) {
  console.log('STATUS: SELURUH PENGUJIAN PERCABANGAN NUSANTARA BERHASIL 100%.');
  process.exit(0);
} else {
  console.error('STATUS: TERDAPAT PENGUJIAN PERCABANGAN YANG GAGAL.');
  process.exit(1);
}
