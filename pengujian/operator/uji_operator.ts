/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { GalatRuntime, JenisGalatRuntime } from '../../src/interpreter/galat';
import { PemeriksaTipe } from '../../src/tipe/pemeriksaTipe';
import { GalatTipe } from '../../src/tipe/galatTipe';
import { Parser } from '../../src/parser/parser';

let lulusHitung = 0;
let gagalHitung = 0;

function uji(nama: string, fn: () => void) {
  try {
    fn();
    console.log(`  [✓ LULUS] ${nama}`);
    lulusHitung++;
  } catch (err: any) {
    console.error(`  [✗ GAGAL] ${nama}`);
    console.error(`    Alasan: ${err.message || err}`);
    if (err.stack) {
      console.error(`    ${err.stack.split('\n').slice(1, 4).join('\n    ')}`);
    }
    gagalHitung++;
  }
}

function eksekusi(kode: string): string[] {
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kode);
  return buffer.dapatkanSeluruhTeks();
}

function periksaTipeKode(kode: string): void {
  const parser = new Parser(kode);
  const ast = parser.parse();
  const pemeriksa = new PemeriksaTipe();
  const galat = pemeriksa.periksa(ast);
  if (galat.length > 0) {
    throw galat[0];
  }
}

console.log('=============================================================================');
console.log('PENGUJIAN KOMPREHENSIF SISTEM OPERATOR BAHASA NUSANTARA (Phase 10)');
console.log('Target Milestone: v0.10.0');
console.log('=============================================================================');

// -----------------------------------------------------------------------------
// KELOMPOK 1: OPERATOR ARITMATIKA (+, -, *, /, %)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 1: Operator Aritmatika ---');

uji('Aritmatika bilangan bulat (+, -, *, %, /)', () => {
  const kode = `
program UjiAritmatika
mulai
    a : bilangan = 10
    b : bilangan = 3
    tampilkan(a + b)
    tampilkan(a - b)
    tampilkan(a * b)
    tampilkan(a % b)
    tampilkan(9 / 3)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== '13') throw new Error(`Diharapkan 13, diterima ${output[0]}`);
  if (output[1] !== '7') throw new Error(`Diharapkan 7, diterima ${output[1]}`);
  if (output[2] !== '30') throw new Error(`Diharapkan 30, diterima ${output[2]}`);
  if (output[3] !== '1') throw new Error(`Diharapkan 1, diterima ${output[3]}`);
  if (output[4] !== '3') throw new Error(`Diharapkan 3, diterima ${output[4]}`);
});

uji('Aritmatika angka desimal presisi', () => {
  const kode = `
program UjiDesimal
mulai
    x : desimal = 10.5
    y : desimal = 2.5
    tampilkan(x + y)
    tampilkan(x - y)
    tampilkan(x * y)
    tampilkan(7 / 2)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== '13') throw new Error(`Diharapkan 13, diterima ${output[0]}`);
  if (output[1] !== '8') throw new Error(`Diharapkan 8, diterima ${output[1]}`);
  if (output[2] !== '26.25') throw new Error(`Diharapkan 26.25, diterima ${output[2]}`);
  if (output[3] !== '3.5') throw new Error(`Diharapkan 3.5, diterima ${output[3]}`);
});

uji('Penggabungan teks (String Concatenation)', () => {
  const kode = `
program UjiKonkatenasi
mulai
    salam : teks = "Halo " + "Nusantara"
    pesan : teks = "Versi: " + 10
    tampilkan(salam)
    tampilkan(pesan)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== 'Halo Nusantara') throw new Error(`Diharapkan 'Halo Nusantara', diterima ${output[0]}`);
  if (output[1] !== 'Versi: 10') throw new Error(`Diharapkan 'Versi: 10', diterima ${output[1]}`);
});

// -----------------------------------------------------------------------------
// KELOMPOK 2: OPERATOR PERBANDINGAN (==, !=, <, >, <=, >=)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 2: Operator Perbandingan ---');

uji('Perbandingan kesetaraan (== dan !=)', () => {
  const kode = `
program UjiKesetaraan
mulai
    tampilkan(10 == 10)
    tampilkan(10 == 20)
    tampilkan(10 != 20)
    tampilkan("Nusantara" == "Nusantara")
    tampilkan("A" != "B")
    tampilkan(5 == 5.0)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[0]}`);
  if (output[1] !== 'salah') throw new Error(`Diharapkan salah, diterima ${output[1]}`);
  if (output[2] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[2]}`);
  if (output[3] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[3]}`);
  if (output[4] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[4]}`);
  if (output[5] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[5]}`);
});

uji('Perbandingan relasional (<, <=, >, >=)', () => {
  const kode = `
program UjiRelasional
mulai
    tampilkan(5 < 10)
    tampilkan(10 <= 10)
    tampilkan(15 > 20)
    tampilkan(20 >= 20)
    tampilkan("apel" < "jeruk")
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[0]}`);
  if (output[1] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[1]}`);
  if (output[2] !== 'salah') throw new Error(`Diharapkan salah, diterima ${output[2]}`);
  if (output[3] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[3]}`);
  if (output[4] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[4]}`);
});

// -----------------------------------------------------------------------------
// KELOMPOK 3: OPERATOR LOGIKA (dan, atau, tidak)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 3: Operator Logika ---');

uji('Operasi logika dan, atau, dan negasi tidak', () => {
  const kode = `
program UjiLogika
mulai
    tampilkan(benar dan benar)
    tampilkan(benar dan salah)
    tampilkan(salah atau benar)
    tampilkan(salah atau salah)
    tampilkan(tidak benar)
    tampilkan(tidak salah)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[0]}`);
  if (output[1] !== 'salah') throw new Error(`Diharapkan salah, diterima ${output[1]}`);
  if (output[2] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[2]}`);
  if (output[3] !== 'salah') throw new Error(`Diharapkan salah, diterima ${output[3]}`);
  if (output[4] !== 'salah') throw new Error(`Diharapkan salah, diterima ${output[4]}`);
  if (output[5] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[5]}`);
});

// -----------------------------------------------------------------------------
// KELOMPOK 4: OPERATOR UNARI (- dan tidak)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 4: Operator Unari ---');

uji('Operator unari numerik dan logika', () => {
  const kode = `
program UjiUnari
mulai
    a : bilangan = 42
    negA : bilangan = -a
    posA : bilangan = -negA
    tampilkan(negA)
    tampilkan(posA)

    aktif : logika = benar
    tampilkan(tidak aktif)
    tampilkan(tidak tidak aktif)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== '-42') throw new Error(`Diharapkan -42, diterima ${output[0]}`);
  if (output[1] !== '42') throw new Error(`Diharapkan 42, diterima ${output[1]}`);
  if (output[2] !== 'salah') throw new Error(`Diharapkan salah, diterima ${output[2]}`);
  if (output[3] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[3]}`);
});

// -----------------------------------------------------------------------------
// KELOMPOK 5: EVALUASI PRESEDENSI OPERATOR (8 TINGKAT RESMI)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 5: Evaluasi Presedensi Operator ---');

uji('Presedensi: Perkalian lebih tinggi dari Penjumlahan (2 + 3 * 4 == 14)', () => {
  const kode = `
program UjiPresedensi
mulai
    hasil : bilangan = 2 + 3 * 4
    tampilkan(hasil)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== '14') throw new Error(`Diharapkan 14, diterima ${output[0]}`);
});

uji('Presedensi: Relasional dan Kesetaraan terhadap Logika', () => {
  const kode = `
program UjiPresedensiLogika
mulai
    kondisi : logika = 5 > 2 dan 10 == 10
    tampilkan(kondisi)
    tampilkan(3 + 2 * 2 == 7)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[0]}`);
  if (output[1] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[1]}`);
});

// -----------------------------------------------------------------------------
// KELOMPOK 6: ASOSIATIVITAS OPERATOR (KIRI-KE-KANAN vs KANAN-KE-KIRI)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 6: Evaluasi Asosiativitas ---');

uji('Asosiativitas kiri-ke-kanan pengurangan: 10 - 5 - 2 == 3', () => {
  const kode = `
program UjiAsosiasiPengurangan
mulai
    hasil : bilangan = 10 - 5 - 2
    tampilkan(hasil)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== '3') throw new Error(`Diharapkan 3, diterima ${output[0]}`);
});

uji('Asosiativitas kanan-ke-kiri untuk operator unari: - - 15 == 15', () => {
  const kode = `
program UjiAsosiasiUnari
mulai
    x : bilangan = - - 15
    b : logika = tidak tidak benar
    tampilkan(x)
    tampilkan(b)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== '15') throw new Error(`Diharapkan 15, diterima ${output[0]}`);
  if (output[1] !== 'benar') throw new Error(`Diharapkan benar, diterima ${output[1]}`);
});

// -----------------------------------------------------------------------------
// KELOMPOK 7: TANDA KURUNG PENGELOMPOKAN
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 7: Tanda Kurung Pengelompokan ---');

uji('Tanda kurung mengubah urutan presedensi: (2 + 3) * 4 == 20', () => {
  const kode = `
program UjiKurung
mulai
    hasil : bilangan = (2 + 3) * 4
    tampilkan(hasil)
    hasil2 : bilangan = 10 - (5 - 2)
    tampilkan(hasil2)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== '20') throw new Error(`Diharapkan 20, diterima ${output[0]}`);
  if (output[1] !== '7') throw new Error(`Diharapkan 7, diterima ${output[1]}`);
});

// -----------------------------------------------------------------------------
// KELOMPOK 8: TYPE CHECKING OPERATOR (INTEGRASI SISTEM TIPE PHASE 9)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 8: Validasi Type System Operator ---');

uji('Menolak operator logika dan pada operan teks dan bilangan', () => {
  const kode = `
program UjiTypeCheckLogika
mulai
    nama : teks = "Budi"
    hasil : logika = nama dan benar
selesai
  `;
  let tertangkap = false;
  try {
    periksaTipeKode(kode);
  } catch (err: any) {
    if (err instanceof GalatTipe && err.message.includes("membutuhkan operan bertipe logika")) {
      tertangkap = true;
    }
  }
  if (!tertangkap) throw new Error('Harus menghasilkan GalatTipe operator logika');
});

uji('Menolak operasi pengurangan antara teks dan bilangan', () => {
  const kode = `
program UjiTypeCheckAritmatika
mulai
    s : teks = "Halo"
    x : bilangan = 5
    hasil : teks = s - x
selesai
  `;
  let tertangkap = false;
  try {
    periksaTipeKode(kode);
  } catch (err: any) {
    if (err instanceof GalatTipe && err.message.includes("tidak didukung")) {
      tertangkap = true;
    }
  }
  if (!tertangkap) throw new Error('Harus menghasilkan GalatTipe operasi tidak didukung');
});

uji('Menolak operator unari tidak pada bilangan', () => {
  const kode = `
program UjiTypeCheckUnari
mulai
    n : bilangan = 10
    hasil : logika = tidak n
selesai
  `;
  let tertangkap = false;
  try {
    periksaTipeKode(kode);
  } catch (err: any) {
    if (err instanceof GalatTipe && err.message.includes("membutuhkan operan bertipe logika")) {
      tertangkap = true;
    }
  }
  if (!tertangkap) throw new Error('Harus menghasilkan GalatTipe operator unari tidak valid');
});

// -----------------------------------------------------------------------------
// KELOMPOK 9: EVALUASI HUBUNG SINGKAT (SHORT-CIRCUIT EVALUATION)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 9: Evaluasi Hubung Singkat (Short-circuit) ---');

uji('Memastikan cabang kanan tidak dievaluasi saat hubung singkat terjadi', () => {
  const kode = `
fungsi tesKanan() : logika
mulai
    tampilkan("KANAN_TERPANGGIL")
    kembalikan benar
selesai

program UjiShortCircuit
mulai
    // 1. dan: jika kiri salah, kanan TIDAK boleh dipanggil
    k1 : logika = salah dan tesKanan()
    tampilkan(k1)

    // 2. atau: jika kiri benar, kanan TIDAK boleh dipanggil
    k2 : logika = benar atau tesKanan()
    tampilkan(k2)

    // 3. dan: jika kiri benar, kanan HARUS dipanggil
    k3 : logika = benar dan tesKanan()
    tampilkan(k3)

    // 4. atau: jika kiri salah, kanan HARUS dipanggil
    k4 : logika = salah atau tesKanan()
    tampilkan(k4)

    // 5. Hubung singkat menjaga keamanan eksekusi pembagian dengan nol
    aman1 : logika = salah dan (10 / 0 == 0)
    tampilkan(aman1)

    aman2 : logika = benar atau (10 / 0 == 0)
    tampilkan(aman2)
selesai
  `;
  const output = eksekusi(kode);
  // output index:
  // 0: 'salah' (dari k1, tanpa KANAN_TERPANGGIL)
  // 1: 'benar' (dari k2, tanpa KANAN_TERPANGGIL)
  // 2: 'KANAN_TERPANGGIL' (dari k3)
  // 3: 'benar' (dari k3)
  // 4: 'KANAN_TERPANGGIL' (dari k4)
  // 5: 'benar' (dari k4)
  // 6: 'salah' (dari aman1)
  // 7: 'benar' (dari aman2)
  if (output[0] !== 'salah') throw new Error(`Langkah 1 gagal: diharapkan 'salah', didapat '${output[0]}'`);
  if (output[1] !== 'benar') throw new Error(`Langkah 2 gagal: diharapkan 'benar', didapat '${output[1]}'`);
  if (output[2] !== 'KANAN_TERPANGGIL') throw new Error(`Langkah 3 gagal: fungsi kanan seharusnya terpanggil`);
  if (output[3] !== 'benar') throw new Error(`Langkah 3 nilai gagal`);
  if (output[4] !== 'KANAN_TERPANGGIL') throw new Error(`Langkah 4 gagal: fungsi kanan seharusnya terpanggil`);
  if (output[5] !== 'benar') throw new Error(`Langkah 4 nilai gagal`);
  if (output[6] !== 'salah') throw new Error(`Langkah 5 gagal: hubung singkat pembagian nol dan`);
  if (output[7] !== 'benar') throw new Error(`Langkah 6 gagal: hubung singkat pembagian nol atau`);
});

// -----------------------------------------------------------------------------
// KELOMPOK 10: PROTEKSI PEMBAGIAN & MODULO DENGAN NOL
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 10: Penanganan Pembagian & Modulo dengan Nol ---');

uji('Menangani runtime error pada pembagian dengan nol', () => {
  const kode = `
program UjiBagiNol
mulai
    tampilkan(10 / 0)
selesai
  `;
  let tertangkap = false;
  try {
    eksekusi(kode);
  } catch (err: any) {
    if (err instanceof GalatRuntime && err.jenis === JenisGalatRuntime.PEMBAGIAN_NOL) {
      tertangkap = true;
    }
  }
  if (!tertangkap) throw new Error('Harus membangkitkan GalatRuntime.PEMBAGIAN_NOL');
});

uji('Menangani runtime error pada modulo dengan nol', () => {
  const kode = `
program UjiModuloNol
mulai
    tampilkan(10 % 0)
selesai
  `;
  let tertangkap = false;
  try {
    eksekusi(kode);
  } catch (err: any) {
    if (err instanceof GalatRuntime && err.jenis === JenisGalatRuntime.PEMBAGIAN_NOL) {
      tertangkap = true;
    }
  }
  if (!tertangkap) throw new Error('Harus membangkitkan GalatRuntime.PEMBAGIAN_NOL untuk modulo 0');
});

// -----------------------------------------------------------------------------
// KELOMPOK 11: PENANGANAN OPERATOR ILEGAL
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 11: Penanganan Operator Ilegal ---');

uji('Menolak simbol ilegal pada tahap Lexer/Parser secara aman', () => {
  const kode = `
program UjiIlegal
mulai
    x : bilangan = 10 @ 5
selesai
  `;
  let tertangkap = false;
  try {
    eksekusi(kode);
  } catch (err: any) {
    tertangkap = true;
  }
  if (!tertangkap) throw new Error('Simbol @ ilegal harus ditolak oleh parser/interpreter');
});

// -----------------------------------------------------------------------------
// KELOMPOK 12: INFORMASI KOORDINAT BARIS & KOLOM PADA GALAT OPERATOR
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 12: Presisi Lokasi Baris & Kolom pada Galat ---');

uji('Galat runtime pembagian dengan nol mencatat baris dan kolom yang tepat', () => {
  const kode = `
program UjiLokasiGalat
mulai
    a : bilangan = 100
    b : bilangan = 0
    c : desimal = a / b
selesai
  `;
  try {
    eksekusi(kode);
    throw new Error('Harusnya gagal');
  } catch (err: any) {
    if (err instanceof GalatRuntime) {
      if (!err.posisi || err.posisi.baris !== 6) {
        throw new Error(`Diharapkan baris 6, diterima baris ${err.posisi?.baris}`);
      }
    } else {
      throw err;
    }
  }
});

// -----------------------------------------------------------------------------
// KELOMPOK 13: PROGRAM INTEGRASI PENUH (Lexer -> Parser -> AST -> Type System -> Interpreter)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 13: Program Integrasi Penuh Pipeline Nyata ---');

uji('Menjalankan Program Kasir & Validasi Diskon dengan Seluruh Kategori Operator', () => {
  const kode = `
program KasirToko
mulai
    hargaSatuan : bilangan = 25000
    jumlahBeli   : bilangan = 4
    totalKotor   : bilangan = hargaSatuan * jumlahBeli
    diskonPersen : desimal  = 0.1
    apakahMember : logika   = benar

    // Uji operator perbandingan dan logika majemuk
    dapatDiskon : logika = (totalKotor >= 100000) dan apakahMember

    tampilkan(totalKotor)
    tampilkan(dapatDiskon)

    totalBayar : desimal = totalKotor - (totalKotor * diskonPersen)
    tampilkan(totalBayar)

    // Uji sisa bagi
    sisaPoin : bilangan = totalKotor % 10000
    tampilkan(sisaPoin)
selesai
  `;
  const output = eksekusi(kode);
  if (output[0] !== '100000') throw new Error(`Diharapkan totalKotor 100000, diterima ${output[0]}`);
  if (output[1] !== 'benar') throw new Error(`Diharapkan dapatDiskon benar, diterima ${output[1]}`);
  if (output[2] !== '90000') throw new Error(`Diharapkan totalBayar 90000, diterima ${output[2]}`);
  if (output[3] !== '0') throw new Error(`Diharapkan sisaPoin 0, diterima ${output[3]}`);
});

console.log('-----------------------------------------------------------------------------');
console.log(`Hasil Pengujian Sistem Operator: ${lulusHitung} Uji LULUS, ${gagalHitung} Uji GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (gagalHitung > 0) {
  process.exit(1);
} else {
  console.log('STATUS: SELURUH PENGUJIAN SISTEM OPERATOR NUSANTARA BERHASIL 100%.');
}
