/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { GalatRuntime, JenisGalatRuntime } from '../../src/interpreter/galat';

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

/**
 * Helper untuk mengeksekusi kode sumber .nusantara dan menangkap seluruh output teks.
 */
function jalankan(sumber: string): string[] {
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(sumber);
  return buffer.dapatkanSeluruhTeks();
}

console.log('=============================================================================');
console.log('PENGUJIAN KOMPREHENSIF INTERPRETER BAHASA NUSANTARA (Phase 8)');
console.log('Target Milestone: v0.8.0');
console.log('=============================================================================\n');

// 1. UJI PROGRAM PERTAMA: HALO DUNIA
console.log('--- Kelompok 1: Program Pertama & Built-in Tampilkan ---');
uji('Eksekusi Program Halo Dunia', () => {
  const sumber = `
  program Halo
  mulai
      tampilkan("Halo Dunia!")
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output.length, 1);
  samaDengan(output[0], 'Halo Dunia!');
});

// 2. UJI EVALUASI LITERAL & TIPE DATA
console.log('\n--- Kelompok 2: Evaluasi Literal Runtime ---');
uji('Mencetak berbagai tipe data literal', () => {
  const sumber = `
  program UjiLiteral
  mulai
      tampilkan("Teks", 100, 3.14, benar, salah, kosong)
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output[0], 'Teks 100 3.14 benar salah kosong');
});

// 3. UJI ARITMATIKA & PRESEDENSI OPERATOR
console.log('\n--- Kelompok 3: Aritmatika & Presedensi ---');
uji('Evaluasi 10 + 20 * 2 harus menghasilkan 50', () => {
  const sumber = `
  program Hitung
  mulai
      hasil : bilangan = 10 + 20 * 2
      tampilkan(hasil)
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output[0], '50');
});

uji('Pengelompokan (10 + 20) * 2 harus menghasilkan 60', () => {
  const sumber = `
  program HitungKurung
  mulai
      hasil : bilangan = (10 + 20) * 2
      tampilkan(hasil)
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output[0], '60');
});

uji('Operasi modulus % dan pengurangan', () => {
  const sumber = `
  program Modulo
  mulai
      sisa : bilangan = 17 % 5
      selisih : bilangan = 20 - 7
      tampilkan(sisa, selisih)
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output[0], '2 13');
});

// 4. UJI OPERATOR LOGIKA & HUBUNG SINGKAT
console.log('\n--- Kelompok 4: Logika & Hubung Singkat (Short-circuit) ---');
uji('Evaluasi operator dan, atau, dan negasi tidak', () => {
  const sumber = `
  program UjiLogika
  mulai
      tampilkan(benar dan salah)
      tampilkan(benar atau salah)
      tampilkan(tidak benar)
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output[0], 'salah');
  samaDengan(output[1], 'benar');
  samaDengan(output[2], 'salah');
});

// 5. UJI VARIABEL & PENUGASAN
console.log('\n--- Kelompok 5: Variabel & Penugasan ---');
uji('Deklarasi dan mutasi nilai variabel', () => {
  const sumber = `
  program Mutasi
  mulai
      skor : bilangan = 10
      skor = skor + 5
      tampilkan(skor)
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output[0], '15');
});

// 6. UJI PERLINDUNGAN KONSTANTA TETAP
console.log('\n--- Kelompok 6: Perlindungan Nilai Tetap (Immutable) ---');
uji('Mencegah pengubahan nilai konstanta tetap', () => {
  const sumber = `
  program UjiTetap
  mulai
      tetap PHI : desimal = 3.14
      PHI = 3.1415
  selesai`;
  let terjadiGalat = false;
  try {
    jalankan(sumber);
  } catch (e: any) {
    terjadiGalat = true;
    samaDengan(e instanceof GalatRuntime, true);
    samaDengan(e.jenis, JenisGalatRuntime.KONSTANTA_DIUBAH);
  }
  samaDengan(terjadiGalat, true, 'Harus membangkitkan galat saat mengubah nilai tetap');
});

// 7. UJI PERCABANGAN JIKA
console.log('\n--- Kelompok 7: Percabangan Jika-Maka-Selain ---');
uji('Percabangan jika menghasilkan cabang yang sesuai', () => {
  const sumber = `
  program Kelulusan
  mulai
      nilai : bilangan = 80
      jika nilai >= 75 maka
          tampilkan("Lulus")
      selain
          tampilkan("Belum Lulus")
      akhir
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output[0], 'Lulus');
});

// 8. UJI PERULANGAN UNTUK & SELAMA
console.log('\n--- Kelompok 8: Perulangan Untuk & Selama ---');
uji('Perulangan untuk dari 1 sampai 5', () => {
  const sumber = `
  program UjiUntuk
  mulai
      untuk angka dari 1 sampai 3 lakukan
          tampilkan(angka)
      akhir
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output.join(','), '1,2,3');
});

uji('Perulangan selama dengan instruksi hentikan (break)', () => {
  const sumber = `
  program UjiSelama
  mulai
      hitung : bilangan = 1
      selama hitung <= 10 lakukan
          jika hitung == 4 maka
              hentikan
          akhir
          tampilkan(hitung)
          hitung = hitung + 1
      akhir
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output.join(','), '1,2,3');
});

// 9. UJI DEKLARASI & PEMANGGILAN FUNGSI
console.log('\n--- Kelompok 9: Fungsi Modular & Nilai Kembali ---');
uji('Fungsi tambah dengan nilai kembali kembalikan', () => {
  const sumber = `
  fungsi tambah(a : bilangan, b : bilangan) : bilangan
  mulai
      kembalikan a + b
  selesai

  program UjiFungsi
  mulai
      hasil : bilangan = tambah(10, 20)
      tampilkan(hasil)
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output[0], '30');
});

// 10. UJI REKURSI (FAKTORIAL)
console.log('\n--- Kelompok 10: Rekursi ---');
uji('Fungsi rekursif faktorial', () => {
  const sumber = `
  fungsi faktorial(n : bilangan) : bilangan
  mulai
      jika n <= 1 maka
          kembalikan 1
      akhir
      kembalikan n * faktorial(n - 1)
  selesai

  program UjiRekursi
  mulai
      tampilkan(faktorial(5))
  selesai`;
  const output = jalankan(sumber);
  samaDengan(output[0], '120');
});

// 11. UJI PENANGANAN KESALAHAN RUNTIME
console.log('\n--- Kelompok 11: Penanganan Kesalahan Runtime ---');
uji('Menangani pembagian dengan nol', () => {
  const sumber = `
  program BagiNol
  mulai
      x : bilangan = 10 / 0
  selesai`;
  let terjadiGalat = false;
  try {
    jalankan(sumber);
  } catch (e: any) {
    terjadiGalat = true;
    samaDengan(e.jenis, JenisGalatRuntime.PEMBAGIAN_NOL);
  }
  samaDengan(terjadiGalat, true, 'Harus membangkitkan galat saat pembagian dengan nol');
});

uji('Menangani variabel belum didefinisikan', () => {
  const sumber = `
  program TakDikenal
  mulai
      tampilkan(variabelGhaib)
  selesai`;
  let terjadiGalat = false;
  try {
    jalankan(sumber);
  } catch (e: any) {
    terjadiGalat = true;
    samaDengan(e.jenis, JenisGalatRuntime.VARIABEL_TIDAK_DITEMUKAN);
  }
  samaDengan(terjadiGalat, true, 'Harus membangkitkan galat saat variabel tidak ditemukan');
});

// REKAPITULASI HASIL
console.log('\n-----------------------------------------------------------------------------');
const jumlahLulus = daftarHasil.filter(h => h.lulus).length;
const jumlahGagal = daftarHasil.filter(h => !h.lulus).length;
console.log(`Hasil Pengujian Interpreter: ${jumlahLulus} Uji LULUS, ${jumlahGagal} Uji GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (jumlahGagal === 0) {
  console.log('STATUS: SELURUH PENGUJIAN INTERPRETER NUSANTARA BERHASIL 100%.');
  process.exit(0);
} else {
  console.error('STATUS: TERDAPAT PENGUJIAN INTERPRETER YANG GAGAL.');
  process.exit(1);
}
