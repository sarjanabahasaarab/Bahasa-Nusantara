/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Parser } from '../../src/parser/parser';
import { PemeriksaTipe } from '../../src/tipe/pemeriksaTipe';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { JenisGalatTipe } from '../../src/tipe/galatTipe';
import { JenisNodeAST, NodePerulanganSelama, NodePerulanganUntuk } from '../../src/parser/ast';
import { JenisGalatParser } from '../../src/parser/galat';
import { JenisGalatRuntime } from '../../src/interpreter/galat';

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

function jalankanProgram(sumber: string, batasIterasi?: number): string[] {
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer, { maksimalIterasiPerulangan: batasIterasi ?? 100_000 });
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
console.log('PENGUJIAN KOMPREHENSIF SISTEM PERULANGAN NUSANTARA (Phase 12)');
console.log('Target Milestone: v0.12.0');
console.log('=============================================================================\n');

// 1. UJI PERULANGAN SELAMA
console.log('--- Kelompok 1: Perulangan Selama (While Loop) ---');
uji('Perulangan selama berulang dan berhenti normal saat kondisi salah', () => {
  const sumber = `
  program PerulanganSelama
  mulai
      angka : bilangan = 1
      selama angka <= 3 lakukan
          tampilkan(angka)
          angka = angka + 1
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.join(','), '1,2,3');
});

uji('Kondisi selama yang bernilai salah sejak awal dilewati 0 kali', () => {
  const sumber = `
  program SelamaSalah
  mulai
      angka : bilangan = 10
      selama angka < 5 lakukan
          tampilkan(angka)
      akhir
      tampilkan("Selesai")
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.length, 1);
  samaDengan(output[0], 'Selesai');
});

// 2. UJI PERULANGAN UNTUK
console.log('\n--- Kelompok 2: Perulangan Untuk (For-Range Loop) ---');
uji('Perulangan untuk berjalan dengan rentang inklusif (1 sampai 5)', () => {
  const sumber = `
  program PerulanganUntuk
  mulai
      untuk angka dari 1 sampai 5 lakukan
          tampilkan(angka)
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.join(','), '1,2,3,4,5');
});

uji('Perulangan untuk dengan batas awal dan akhir sama berjalan tepat 1 kali', () => {
  const sumber = `
  program UntukSatuKali
  mulai
      untuk i dari 7 sampai 7 lakukan
          tampilkan(i)
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.length, 1);
  samaDengan(output[0], '7');
});

uji('Perulangan untuk dengan rentang kosong (awal > akhir) dilewati tanpa galat', () => {
  const sumber = `
  program RentangKosong
  mulai
      untuk i dari 10 sampai 5 lakukan
          tampilkan(i)
      akhir
      tampilkan("Rentang kosong berhasil dilewati")
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.length, 1);
  samaDengan(output[0], 'Rentang kosong berhasil dilewati');
});

// 3. UJI INSTRUKSI HENTIKAN (BREAK)
console.log('\n--- Kelompok 3: Kendali Aliran Hentikan (Break) ---');
uji('Hentikan menghentikan perulangan selama dan melanjutkan kode setelah akhir', () => {
  const sumber = `
  program HentikanSelama
  mulai
      angka : bilangan = 1
      selama angka <= 10 lakukan
          jika angka == 4 maka
              hentikan
          akhir
          tampilkan(angka)
          angka = angka + 1
      akhir
      tampilkan("Keluar loop")
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.join(','), '1,2,3,Keluar loop');
});

uji('Hentikan menghentikan perulangan untuk terdekat', () => {
  const sumber = `
  program HentikanUntuk
  mulai
      untuk i dari 1 sampai 10 lakukan
          jika i == 3 maka
              hentikan
          akhir
          tampilkan(i)
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.join(','), '1,2');
});

// 4. UJI INSTRUKSI LANJUTKAN (CONTINUE)
console.log('\n--- Kelompok 4: Kendali Aliran Lanjutkan (Continue) ---');
uji('Lanjutkan melompati sisa instruksi iterasi perulangan untuk dan tetap melakukan increment', () => {
  const sumber = `
  program LanjutkanPerulangan
  mulai
      untuk angka dari 1 sampai 5 lakukan
          jika angka == 3 maka
              lanjutkan
          akhir
          tampilkan(angka)
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.join(','), '1,2,4,5');
});

uji('Lanjutkan pada perulangan selama memeriksa kembali kondisi loop', () => {
  const sumber = `
  program LanjutkanSelama
  mulai
      hitung : bilangan = 0
      selama hitung < 4 lakukan
          hitung = hitung + 1
          jika hitung == 2 maka
              lanjutkan
          akhir
          tampilkan(hitung)
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.join(','), '1,3,4');
});

// 5. UJI KOMBINASI PERULANGAN DAN PERCABANGAN
console.log('\n--- Kelompok 5: Kombinasi Perulangan dan Percabangan ---');
uji('Percabangan jika-selain di dalam perulangan untuk (Ganjil / Genap)', () => {
  const sumber = `
  program PerulanganDanPercabangan
  mulai
      untuk angka dari 1 sampai 4 lakukan
          jika angka % 2 == 0 maka
              tampilkan("Genap")
          selain
              tampilkan("Ganjil")
          akhir
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.join(','), 'Ganjil,Genap,Ganjil,Genap');
});

uji('Perulangan di dalam cabang maka percabangan', () => {
  const sumber = `
  program LoopDalamJika
  mulai
      aktif : logika = benar
      jika aktif maka
          untuk i dari 1 sampai 3 lakukan
              tampilkan(i)
          akhir
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.join(','), '1,2,3');
});

// 6. UJI PERULANGAN BERTINGKAT (NESTED LOOPS)
console.log('\n--- Kelompok 6: Perulangan Bertingkat (Nested Loops) ---');
uji('Perulangan bersarang mengeksekusi matriks baris dan kolom', () => {
  const sumber = `
  program PerulanganBertingkat
  mulai
      untuk baris dari 1 sampai 2 lakukan
          untuk kolom dari 1 sampai 2 lakukan
              tampilkan(baris * 10 + kolom)
          akhir
      akhir
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output.join(','), '11,12,21,22');
});

uji('Hentikan pada perulangan dalam hanya membatalkan perulangan dalam', () => {
  const sumber = `
  program HentikanBersarang
  mulai
      untuk i dari 1 sampai 2 lakukan
          untuk j from 1 sampai 5 lakukan
              jika j == 2 maka
                  hentikan
              akhir
              tampilkan(j)
          akhir
          tampilkan(99)
      akhir
  selesai`.replace('from', 'dari');

  const output = jalankanProgram(sumber);
  samaDengan(output.join(','), '1,99,1,99');
});

// 7. UJI STRUKTUR AST PERULANGAN
console.log('\n--- Kelompok 7: Struktur AST Perulangan ---');
uji('Parser menghasilkan NodePerulanganSelama dengan kondisi dan tubuh yang valid', () => {
  const sumber = `
  program UjiASTSelama
  mulai
      selama benar lakukan
          tampilkan(1)
      akhir
  selesai`;

  const parser = new Parser(sumber);
  const ast = parser.parse();
  samaDengan(parser.dapatkanDaftarGalat().length, 0);

  const loopNode = ast.tubuhUtama[0] as NodePerulanganSelama;
  samaDengan(loopNode.jenis, JenisNodeAST.PERULANGAN_SELAMA);
  samaDengan(loopNode.tubuh.length, 1);
});

uji('Parser menghasilkan NodePerulanganUntuk dengan batas dan variabel penghitung', () => {
  const sumber = `
  program UjiASTUntuk
  mulai
      untuk k dari 1 sampai 5 lakukan
          tampilkan(k)
      akhir
  selesai`;

  const parser = new Parser(sumber);
  const ast = parser.parse();
  samaDengan(parser.dapatkanDaftarGalat().length, 0);

  const loopNode = ast.tubuhUtama[0] as NodePerulanganUntuk;
  samaDengan(loopNode.jenis, JenisNodeAST.PERULANGAN_UNTUK);
  samaDengan(loopNode.variabelPenghitung, 'k');
  samaDengan(loopNode.tubuh.length, 1);
});

// 8. UJI TYPE SYSTEM VALIDATION
console.log('\n--- Kelompok 8: Validasi Type System untuk Perulangan ---');
uji('Menolak kondisi perulangan selama bertipe bukan logika (misal bilangan)', () => {
  const sumber = `
  program SelamaTipeSalah
  mulai
      selama 100 lakukan
          tampilkan(1)
      akhir
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.KETIDAKCOCOKAN_TIPE);
});

uji('Menolak batas rentang untuk yang bertipe teks', () => {
  const sumber = `
  program UntukTipeSalah
  mulai
      untuk i dari "satu" sampai 5 lakukan
          tampilkan(i)
      akhir
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.KETIDAKCOCOKAN_TIPE);
});

uji('Mendeteksi variabel rentang untuk yang belum dideklarasikan', () => {
  const sumber = `
  program UntukVarGaib
  mulai
      untuk i dari batasBawahGaib sampai 10 lakukan
          tampilkan(i)
      akhir
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.VARIABEL_BELUM_DIDEKLARASIKAN);
});

uji('Menolak instruksi hentikan yang digunakan di luar blok perulangan', () => {
  const sumber = `
  program HentikanDiLuar
  mulai
      tampilkan(1)
      hentikan
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.KENDALI_DI_LUAR_KONTEKS);
});

uji('Menolak instruksi lanjutkan yang digunakan di luar blok perulangan', () => {
  const sumber = `
  program LanjutkanDiLuar
  mulai
      tampilkan(1)
      lanjutkan
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.KENDALI_DI_LUAR_KONTEKS);
});

// 9. UJI DIAGNOSTIK KESALAHAN SINTAKSIS PARSER
console.log('\n--- Kelompok 9: Diagnostik Sintaksis Parser ---');
uji('Menolak kondisi perulangan selama yang kosong sebelum kata kunci lakukan', () => {
  const sumber = `
  program SelamaKosong
  mulai
      selama lakukan
          tampilkan(1)
      akhir
  selesai`;

  const parser = new Parser(sumber);
  parser.parse();
  const galat = parser.dapatkanDaftarGalat();
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatParser.EKSPRESI_TIDAK_LENGKAP);
});

uji('Menolak nilai batas akhir untuk yang kosong sebelum lakukan', () => {
  const sumber = `
  program BatasUntukKosong
  mulai
      untuk i dari 1 sampai lakukan
          tampilkan(i)
      akhir
  selesai`;

  const parser = new Parser(sumber);
  parser.parse();
  const galat = parser.dapatkanDaftarGalat();
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatParser.EKSPRESI_TIDAK_LENGKAP);
});

uji('Menolak perulangan selama yang lupa ditutup dengan akhir sebelum selesai', () => {
  const sumber = `
  program LupaAkhirSelama
  mulai
      selama benar lakukan
          tampilkan(1)
  selesai`;

  const parser = new Parser(sumber);
  parser.parse();
  const galat = parser.dapatkanDaftarGalat();
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatParser.BLOK_TIDAK_DITUTUP);
});

uji('Menolak kata kunci lakukan di luar konteks perulangan', () => {
  const sumber = `
  program LakukanNyasar
  mulai
      lakukan
      tampilkan(1)
  selesai`;

  const parser = new Parser(sumber);
  parser.parse();
  const galat = parser.dapatkanDaftarGalat();
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatParser.TOKEN_TAK_TERDUGA);
});

// 10. UJI PERLINDUNGAN INFINITE LOOP RUNTIME
console.log('\n--- Kelompok 10: Perlindungan Loop Tak Terbatas (Infinite Loop) ---');
uji('Mencegah loop tak terbatas dengan melempar galat batas iterasi terlampaui', () => {
  const sumber = `
  program LoopAbadi
  mulai
      selama benar lakukan
          // tanpa hentikan
      akhir
  selesai`;

  let terkenaBatas = false;
  try {
    jalankanProgram(sumber, 50); // Batasi 50 iterasi untuk pengujian
  } catch (e: any) {
    terkenaBatas = true;
    samaDengan(e.jenis, JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI);
  }
  samaDengan(terkenaBatas, true, 'Harus mendeteksi loop tak terbatas dan melempar BATAS_ITERASI_TERLAMPAUI');
});

// 11. REKAPITULASI HASIL
console.log('\n-----------------------------------------------------------------------------');
const jumlahLulus = daftarHasil.filter(h => h.lulus).length;
const jumlahGagal = daftarHasil.filter(h => !h.lulus).length;
console.log(`Hasil Pengujian Sistem Perulangan: ${jumlahLulus} Uji LULUS, ${jumlahGagal} Uji GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (jumlahGagal === 0) {
  console.log('STATUS: SELURUH PENGUJIAN SISTEM PERULANGAN NUSANTARA BERHASIL 100%.');
  process.exit(0);
} else {
  console.error('STATUS: TERDAPAT PENGUJIAN PERULANGAN YANG GAGAL.');
  process.exit(1);
}
