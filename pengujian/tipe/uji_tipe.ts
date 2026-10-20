/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Parser } from '../../src/parser/parser';
import { PemeriksaTipe } from '../../src/tipe/pemeriksaTipe';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { JenisGalatTipe } from '../../src/tipe/galatTipe';
import { GalatRuntime } from '../../src/interpreter/galat';

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

function periksaTipeProgram(sumber: string) {
  const parser = new Parser(sumber);
  const ast = parser.parse();
  const pemeriksa = new PemeriksaTipe();
  return pemeriksa.periksa(ast);
}

function jalankanProgram(sumber: string): string[] {
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(sumber);
  return buffer.dapatkanSeluruhTeks();
}

console.log('=============================================================================');
console.log('PENGUJIAN KOMPREHENSIF SISTEM TIPE DATA & VARIABEL NUSANTARA (Phase 9)');
console.log('Target Milestone: v0.9.0');
console.log('=============================================================================\n');

// 1. UJI DEKLARASI VALID TIPE PRIMITIF
console.log('--- Kelompok 1: Deklarasi Tipe Primitif Valid ---');
uji('Deklarasi teks, bilangan, desimal, logika, dan karakter yang sah', () => {
  const sumber = `
  program TipeValid
  mulai
      nama : teks = "NUSANTARA"
      umur : bilangan = 30
      tinggi : desimal = 175.5
      aktif : logika = benar
      simbol : karakter = 'A'
      data : kosong = kosong
      tampilkan(nama, umur, tinggi, aktif, simbol, data)
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length, 0, 'Tidak boleh ada kesalahan tipe');

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'NUSANTARA 30 175.5 benar A kosong');
});

// 2. UJI KETIDAKCOCOKAN TIPE SAAT INISIALISASI
console.log('\n--- Kelompok 2: Penolakan Ketidakcocokan Tipe Inisialisasi ---');
uji('Menolak inisialisasi variabel bilangan dengan teks', () => {
  const sumber = `
  program TipeSalah
  mulai
      umur : bilangan = "tiga puluh"
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Harus mendeteksi ketidakcocokan tipe');
  samaDengan(galat[0].jenis, JenisGalatTipe.KETIDAKCOCOKAN_TIPE);
  samaDengan(galat[0].tipeDiharapkan, 'bilangan');
  samaDengan(galat[0].tipeAktual, 'teks');
});

uji('Menolak inisialisasi variabel logika dengan bilangan', () => {
  const sumber = `
  program LogikaSalah
  mulai
      aktif : logika = 1
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Harus mendeteksi ketidakcocokan tipe logika');
  samaDengan(galat[0].jenis, JenisGalatTipe.KETIDAKCOCOKAN_TIPE);
});

// 3. UJI VALIDASI PENUGASAN (ASSIGNMENT)
console.log('\n--- Kelompok 3: Validasi Penugasan (Assignment) ---');
uji('Penugasan nilai baru dengan tipe yang cocok harus berhasil', () => {
  const sumber = `
  program PenugasanSah
  mulai
      skor : bilangan = 100
      skor = 120
      tampilkan(skor)
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length, 0);

  const output = jalankanProgram(sumber);
  samaDengan(output[0], '120');
});

uji('Menolak penugasan nilai teks ke variabel bilangan', () => {
  const sumber = `
  program PenugasanSalah
  mulai
      skor : bilangan = 100
      skor = "seratus dua puluh"
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Penugasan tipe salah harus ditolak');
  samaDengan(galat[0].jenis, JenisGalatTipe.KETIDAKCOCOKAN_TIPE);
});

// 4. UJI PERLINDUNGAN KONSTANTA TETAP
console.log('\n--- Kelompok 4: Perlindungan Konstanta Tetap ---');
uji('Menolak modifikasi nilai tetap secara statis maupun runtime', () => {
  const sumber = `
  program Tetap
  mulai
      tetap KODE_POS : bilangan = 12345
      KODE_POS = 54321
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Harus menolak modifikasi konstanta');
  samaDengan(galat[0].jenis, JenisGalatTipe.MODIFIKASI_TETAP);
});

// 5. UJI DETEKSI DEKLARASI GANDA DALAM LINGKUP SAMA
console.log('\n--- Kelompok 5: Deteksi Deklarasi Ganda ---');
uji('Menolak deklarasi ulang variabel dengan nama sama di lingkup yang sama', () => {
  const sumber = `
  program Duplikat
  mulai
      nama : teks = "A"
      nama : teks = "B"
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Deklarasi ganda harus ditolak');
  samaDengan(galat[0].jenis, JenisGalatTipe.DEKLARASI_GANDA);
});

// 6. UJI LINGKUP (SCOPE) DAN SHADOWING
console.log('\n--- Kelompok 6: Lingkup & Shadowing Bersarang ---');
uji('Mengizinkan penutupan (shadowing) di lingkup blok bersarang tanpa merusak lingkup luar', () => {
  const sumber = `
  program Shadow
  mulai
      x : bilangan = 10
      jika benar maka
          x : bilangan = 20
          tampilkan("Dalam:", x)
      akhir
      tampilkan("Luar:", x)
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length, 0, 'Shadowing di sub-lingkup diperbolehkan');

  const output = jalankanProgram(sumber);
  samaDengan(output[0], 'Dalam: 20');
  samaDengan(output[1], 'Luar: 10');
});

// 7. UJI PEMERIKSAAN TIPE PARAMETER & KEMBALIAN FUNGSI
console.log('\n--- Kelompok 7: Validasi Tipe Fungsi ---');
uji('Memvalidasi tipe argumen parameter fungsi yang cocok', () => {
  const sumber = `
  fungsi kali(a : bilangan, b : bilangan) : bilangan
  mulai
      kembalikan a * b
  selesai

  program UjiFungsi
  mulai
      tampilkan(kali(6, 7))
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length, 0);

  const output = jalankanProgram(sumber);
  samaDengan(output[0], '42');
});

uji('Menolak pemanggilan fungsi dengan tipe argumen tidak kompatibel', () => {
  const sumber = `
  fungsi kali(a : bilangan, b : bilangan) : bilangan
  mulai
      kembalikan a * b
  selesai

  program UjiFungsiSalah
  mulai
      kali("enam", 7)
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Harus mendeteksi argumen fungsi tidak cocok');
  samaDengan(galat[0].jenis, JenisGalatTipe.KETIDAKCOCOKAN_TIPE);
});

uji('Menolak fungsi yang mengembalikan tipe tidak sesuai dengan deklarasi kembalian', () => {
  const sumber = `
  fungsi ambilNama() : teks
  mulai
      kembalikan 12345
  selesai

  program UjiKembalianSalah
  mulai
      ambilNama()
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Harus menolak nilai kembalian yang tidak sesuai tipe');
  samaDengan(galat[0].jenis, JenisGalatTipe.KEMBALIAN_TIDAK_SESUAI);
});

// 8. UJI OPERATOR DAN KOMPATIBILITAS TIPE
console.log('\n--- Kelompok 8: Aturan Tipe Operator ---');
uji('Menolak operasi pengurangan antara tipe teks dan bilangan', () => {
  const sumber = `
  program OperasiSalah
  mulai
      hasil = "Halo" - 10
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Operasi pengurangan teks dan bilangan harus ditolak');
  samaDengan(galat[0].jenis, JenisGalatTipe.OPERATOR_TIDAK_DIDUKUNG);
});

uji('Menolak perbandingan relasional lebih besar antara teks dan bilangan', () => {
  const sumber = `
  program RelasionalSalah
  mulai
      jika "abc" >= 10 maka
          tampilkan(1)
      akhir
  selesai`;

  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true, 'Perbandingan relasional teks >= bilangan harus ditolak');
  samaDengan(galat[0].jenis, JenisGalatTipe.OPERATOR_TIDAK_DIDUKUNG);
});

// 9. REKAPITULASI HASIL
console.log('\n-----------------------------------------------------------------------------');
const jumlahLulus = daftarHasil.filter(h => h.lulus).length;
const jumlahGagal = daftarHasil.filter(h => !h.lulus).length;
console.log(`Hasil Pengujian Sistem Tipe Data: ${jumlahLulus} Uji LULUS, ${jumlahGagal} Uji GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (jumlahGagal === 0) {
  console.log('STATUS: SELURUH PENGUJIAN SISTEM TIPE DATA NUSANTARA BERHASIL 100%.');
  process.exit(0);
} else {
  console.error('STATUS: TERDAPAT PENGUJIAN TIPE DATA YANG GAGAL.');
  process.exit(1);
}
