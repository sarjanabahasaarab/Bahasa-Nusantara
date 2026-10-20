/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Parser } from '../../src/parser/parser';
import { PemeriksaTipe } from '../../src/tipe/pemeriksaTipe';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { JenisGalatTipe } from '../../src/tipe/galatTipe';
import { JenisNodeAST, NodeDeklarasiFungsi, NodePemanggilanFungsi } from '../../src/parser/ast';
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
console.log('PENGUJIAN KOMPREHENSIF SISTEM FUNGSI BAHASA NUSANTARA (Phase 13)');
console.log('Target Milestone: v0.13.0');
console.log('=============================================================================\n');

// 1. UJI PARSER & DEKLARASI FUNGSI
console.log('--- Kelompok 1: Deklarasi Fungsi & Parsing AST ---');

uji('Parsing fungsi dengan parameter tunggal dan tipe kembalian', () => {
  const sumber = `
  fungsi kuadrat(x : bilangan) : bilangan
  mulai
      kembalikan x * x
  selesai

  program Uji
  mulai
      tampilkan(kuadrat(4))
  selesai`;

  const parser = new Parser(sumber);
  const ast = parser.parse();
  samaDengan(parser.dapatkanDaftarGalat().length, 0);
  samaDengan(ast.daftarFungsi.length, 1);

  const fn = ast.daftarFungsi[0];
  samaDengan(fn.jenis, JenisNodeAST.DEKLARASI_FUNGSI);
  samaDengan(fn.nama, 'kuadrat');
  samaDengan(fn.parameter.length, 1);
  samaDengan(fn.parameter[0].nama, 'x');
  samaDengan(fn.parameter[0].tipeData, 'bilangan');
  samaDengan(fn.tipeKembalian, 'bilangan');
});

uji('Parsing fungsi dengan banyak parameter dipisahkan koma', () => {
  const sumber = `
  fungsi hitungLuas(panjang : desimal, lebar : desimal) : desimal
  mulai
      kembalikan panjang * lebar
  selesai`;

  const parser = new Parser(sumber);
  const ast = parser.parse();
  samaDengan(parser.dapatkanDaftarGalat().length, 0);
  const fn = ast.daftarFungsi[0];
  samaDengan(fn.nama, 'hitungLuas');
  samaDengan(fn.parameter.length, 2);
  samaDengan(fn.parameter[0].nama, 'panjang');
  samaDengan(fn.parameter[1].nama, 'lebar');
  samaDengan(fn.tipeKembalian, 'desimal');
});

uji('Parsing prosedur (fungsi tanpa anotasi tipe kembalian)', () => {
  const sumber = `
  fungsi sapa(nama : teks)
  mulai
      tampilkan("Halo, " + nama)
  selesai`;

  const parser = new Parser(sumber);
  const ast = parser.parse();
  samaDengan(parser.dapatkanDaftarGalat().length, 0);
  const fn = ast.daftarFungsi[0];
  samaDengan(fn.nama, 'sapa');
  samaDengan(fn.tipeKembalian, undefined);
});

uji('Parsing fungsi tanpa parameter ()', () => {
  const sumber = `
  fungsi dapatkanTahun() : bilangan
  mulai
      kembalikan 2026
  selesai`;

  const parser = new Parser(sumber);
  const ast = parser.parse();
  samaDengan(parser.dapatkanDaftarGalat().length, 0);
  const fn = ast.daftarFungsi[0];
  samaDengan(fn.nama, 'dapatkanTahun');
  samaDengan(fn.parameter.length, 0);
  samaDengan(fn.tipeKembalian, 'bilangan');
});

uji('Struktur AST pemanggilan fungsi dan instruksi kembalikan', () => {
  const sumber = `
  fungsi kaliDua(n : bilangan) : bilangan
  mulai
      kembalikan n * 2
  selesai

  program UjiAST
  mulai
      hasil : bilangan = kaliDua(10)
  selesai`;

  const parser = new Parser(sumber);
  const ast = parser.parse();
  const fn = ast.daftarFungsi[0];
  samaDengan(fn.tubuh[0].jenis, JenisNodeAST.INSTRUKSI_KEMBALIKAN);

  const stmt = ast.tubuhUtama[0] as any;
  samaDengan(stmt.nilaiAwal.jenis, JenisNodeAST.PEMANGGILAN_FUNGSI);
  const call = stmt.nilaiAwal as NodePemanggilanFungsi;
  samaDengan(call.namaFungsi, 'kaliDua');
  samaDengan(call.argumen.length, 1);
});

// 2. DIAGNOSTIK SINTAKSIS PARSER
console.log('\n--- Kelompok 2: Diagnostik Sintaksis Parser ---');

uji('Menolak fungsi yang belum ditutup dengan selesai sebelum EOF', () => {
  const sumber = `
  fungsi bocor() : bilangan
  mulai
      kembalikan 1`;

  const parser = new Parser(sumber);
  parser.parse();
  samaDengan(parser.dapatkanDaftarGalat().length > 0, true);
  samaDengan(parser.dapatkanDaftarGalat()[0].jenis, JenisGalatParser.BLOK_TIDAK_DITUTUP);
});

uji('Menolak koma trailing berlebih pada daftar parameter', () => {
  const sumber = `
  fungsi salahParam(a : bilangan,) : bilangan
  mulai
      kembalikan a
  selesai`;

  const parser = new Parser(sumber);
  parser.parse();
  samaDengan(parser.dapatkanDaftarGalat().length > 0, true);
});

uji('Menolak deklarasi fungsi di dalam blok pernyataan program', () => {
  const sumber = `
  program UjiSarang
  mulai
      fungsi dalam()
      mulai
      selesai
  selesai`;

  const parser = new Parser(sumber);
  parser.parse();
  samaDengan(parser.dapatkanDaftarGalat().length > 0, true);
});

// 3. VALIDASI SISTEM TIPE (TYPE SYSTEM)
console.log('\n--- Kelompok 3: Validasi Sistem Tipe (Type System) ---');

uji('Memvalidasi kecocokan tipe parameter vs argumen', () => {
  const sumber = `
  fungsi gabung(a : teks, b : bilangan) : teks
  mulai
      kembalikan a + b
  selesai

  program UjiTipeCocok
  mulai
      pesan : teks = gabung("Umur: ", 25)
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length, 0);
});

uji('Menolak tipe argumen yang tidak kompatibel', () => {
  const sumber = `
  fungsi tambah(a : bilangan, b : bilangan) : bilangan
  mulai
      kembalikan a + b
  selesai

  program UjiTipeSalah
  mulai
      tambah(10, "dua puluh")
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.KETIDAKCOCOKAN_TIPE);
});

uji('Menolak jumlah argumen yang kurang dari parameter', () => {
  const sumber = `
  fungsi bagi(a : bilangan, b : bilangan) : bilangan
  mulai
      kembalikan a / b
  selesai

  program UjiKurangArg
  mulai
      bagi(100)
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.ARGUMEN_TIDAK_SESUAI);
});

uji('Menolak jumlah argumen yang melebihi parameter', () => {
  const sumber = `
  fungsi cetakSatu(n : bilangan)
  mulai
      tampilkan(n)
  selesai

  program UjiLebihArg
  mulai
      cetakSatu(10, 20)
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.ARGUMEN_TIDAK_SESUAI);
});

uji('Menolak fungsi yang mengembalikan tipe tidak cocok dengan tipe hasil', () => {
  const sumber = `
  fungsi ambilAngka() : bilangan
  mulai
      kembalikan "bukan angka"
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.KEMBALIAN_TIDAK_SESUAI);
});

uji('Menolak fungsi wajib kembali yang tidak memiliki instruksi kembalikan', () => {
  const sumber = `
  fungsi lupaKembalikan() : bilangan
  mulai
      x : bilangan = 10
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.KEMBALIAN_TIDAK_SESUAI);
});

uji('Menolak pemanggilan fungsi yang belum dideklarasikan', () => {
  const sumber = `
  program UjiFungsiGaib
  mulai
      fungsiFiktif(123)
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.FUNGSI_TIDAK_DITEMUKAN);
});

uji('Menolak deklarasi nama parameter ganda pada satu fungsi', () => {
  const sumber = `
  fungsi duplikat(a : bilangan, a : teks)
  mulai
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.DEKLARASI_GANDA);
});

uji('Menolak deklarasi dua fungsi dengan nama yang sama', () => {
  const sumber = `
  fungsi hitung() : bilangan
  mulai
      kembalikan 1
  selesai

  fungsi hitung() : bilangan
  mulai
      kembalikan 2
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.DEKLARASI_GANDA);
});

uji('Menolak pendefinisian fungsi yang bertabrakan dengan nama built-in tampilkan', () => {
  const sumber = `
  fungsi tampilkan(x : teks)
  mulai
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.DEKLARASI_GANDA);
});

uji('Menolak instruksi kembalikan di luar blok fungsi', () => {
  const sumber = `
  program UjiLiar
  mulai
      kembalikan 10
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.KENDALI_DI_LUAR_KONTEKS);
});

// 4. EKSEKUSI RUNTIME & NILAI KEMBALI
console.log('\n--- Kelompok 4: Evaluasi Eksekusi Runtime & Nilai Kembali ---');

uji('Eksekusi fungsi dengan nilai kembali dalam operasi matematika', () => {
  const sumber = `
  fungsi tambah(a : bilangan, b : bilangan) : bilangan
  mulai
      kembalikan a + b
  selesai

  program UjiHitung
  mulai
      total : bilangan = tambah(10, 5) * 2
      tampilkan("Total: " + total)
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Total: 30');
});

uji('Eksekusi prosedur tanpa nilai kembali', () => {
  const sumber = `
  fungsi sambut(nama : teks)
  mulai
      tampilkan("Selamat datang, " + nama + "!")
  selesai

  program UjiSambut
  mulai
      sambut("Nusantara")
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Selamat datang, Nusantara!');
});

uji('Pengembalian nilai awal (early return) dengan percabangan jika', () => {
  const sumber = `
  fungsi periksa(nilai : bilangan) : teks
  mulai
      jika nilai >= 75 maka
          kembalikan "Lulus"
      akhir
      kembalikan "Remedial"
  selesai

  program UjiCabang
  mulai
      tampilkan(periksa(80))
      tampilkan(periksa(60))
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Lulus');
  samaDengan(output[1], 'Remedial');
});

// 5. LINGKUP LEKSIKAL & ISOLASI VARIABEL
console.log('\n--- Kelompok 5: Lingkup Leksikal & Isolasi Variabel ---');

uji('Variabel lokal fungsi terisolasi dan tidak bocor ke luar fungsi', () => {
  const sumber = `
  fungsi proses() : bilangan
  mulai
      lokal : bilangan = 999
      kembalikan lokal
  selesai

  program UjiIsolasi
  mulai
      tampilkan(proses())
      // Mengakses variabel lokal di luar harus gagal
      tampilkan(lokal)
  selesai`;

  let gagal = false;
  try {
    jalankanProgram(sumber);
  } catch (e: any) {
    gagal = true;
  }
  samaDengan(gagal, true, 'Harus gagal karena variabel lokal tidak boleh bocor');
});

uji('Variabel luar dapat dibaca dan dibayangi (shadowing) tanpa merusak nilai luar', () => {
  const sumber = `
  fungsi ujiBayangan(x : bilangan) : bilangan
  mulai
      x = x + 10
      kembalikan x
  selesai

  program UjiShadow
  mulai
      angka : bilangan = 50
      hasil : bilangan = ujiBayangan(angka)
      tampilkan("Hasil: " + hasil)
      tampilkan("Asli: " + angka)
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Hasil: 60');
  samaDengan(output[1], 'Asli: 50');
});

// 6. PEMANGGILAN ANTAR-FUNGSI & REKURSI
console.log('\n--- Kelompok 6: Pemanggilan Antar-Fungsi & Rekursi ---');

uji('Fungsi memanggil fungsi lain secara bertingkat (multi-hop)', () => {
  const sumber = `
  fungsi kuadrat(n : bilangan) : bilangan
  mulai
      kembalikan n * n
  selesai

  fungsi jumlahKuadrat(a : bilangan, b : bilangan) : bilangan
  mulai
      kembalikan kuadrat(a) + kuadrat(b)
  selesai

  program UjiMultiHop
  mulai
      tampilkan(jumlahKuadrat(3, 4))
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], '25'); // 3^2 + 4^2 = 9 + 16 = 25
});

uji('Fungsi rekursif (faktorial) mengeksekusi frame tumpukan terpisah', () => {
  const sumber = `
  fungsi faktorial(n : bilangan) : bilangan
  mulai
      jika n <= 1 maka
          kembalikan 1
      akhir
      kembalikan n * faktorial(n - 1)
  selesai

  program UjiFaktorial
  mulai
      tampilkan("5! = " + faktorial(5))
  selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], '5! = 120');
});

uji('Perlindungan rekursi tak terbatas (Stack Overflow Protection)', () => {
  const sumber = `
  fungsi loopRekursif(n : bilangan) : bilangan
  mulai
      kembalikan loopRekursif(n + 1)
  selesai

  program UjiStackOverflow
  mulai
      loopRekursif(1)
  selesai`;

  let gagal = false;
  try {
    jalankanProgram(sumber);
  } catch (e: any) {
    gagal = true;
    samaDengan(e.jenis, JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI);
  }
  samaDengan(gagal, true, 'Harus mendeteksi stack overflow pada rekursi tak terbatas');
});

// 7. INTEGRASI PIPELINE PENUH
console.log('\n--- Kelompok 7: Program Integrasi Pipeline Nyata ---');

uji('Program resmi FungsiDasar berjalan penuh dari kode mentah hingga output', () => {
  const sumber = `
program FungsiDasar

fungsi tambah(a : bilangan, b : bilangan) : bilangan
mulai
    kembalikan a + b
selesai

mulai
    hasil : bilangan = tambah(10, 5)
    tampilkan("Hasil penjumlahan: " + hasil)
selesai`;

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Hasil penjumlahan: 15');
});

// Ringkasan hasil
console.log('\n-----------------------------------------------------------------------------');
const jumlahLulus = daftarHasil.filter(h => h.lulus).length;
const jumlahGagal = daftarHasil.filter(h => !h.lulus).length;
console.log(`Hasil Pengujian Sistem Fungsi: ${jumlahLulus} Uji LULUS, ${jumlahGagal} Uji GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (jumlahGagal > 0) {
  console.error('STATUS: BEBERAPA PENGUJIAN SISTEM FUNGSI GAGAL.');
  process.exit(1);
} else {
  console.log('STATUS: SELURUH PENGUJIAN SISTEM FUNGSI NUSANTARA BERHASIL 100%.');
}
