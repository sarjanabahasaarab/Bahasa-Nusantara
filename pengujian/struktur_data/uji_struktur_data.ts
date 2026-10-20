/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Parser } from '../../src/parser/parser';
import { PemeriksaTipe } from '../../src/tipe/pemeriksaTipe';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { JenisGalatTipe } from '../../src/tipe/galatTipe';
import { JenisNodeAST } from '../../src/parser/ast';
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
console.log('PENGUJIAN KOMPREHENSIF STRUKTUR DATA NUSANTARA (Phase 14)');
console.log('Target Milestone: v0.14.0');
console.log('=============================================================================\n');

// 1. PEMBUATAN DAFTAR & DAFTAR KOSONG
console.log('--- Kelompok 1: Pembuatan & Inisialisasi Daftar (List) ---');

uji('Pembuatan daftar berisi bilangan', () => {
  const sumber = `
  program UjiDaftarBilangan
  mulai
      angka : daftar = [10, 20, 30]
      tampilkan(angka)
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '[10, 20, 30]');
});

uji('Pembuatan daftar berisi teks dan karakter', () => {
  const sumber = `
  program UjiDaftarTeks
  mulai
      kata : daftar = ["merah", "putih"]
      tampilkan(kata)
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '["merah", "putih"]');
});

uji('Pembuatan daftar kosong', () => {
  const sumber = `
  program UjiDaftarKosong
  mulai
      kosongList : daftar = []
      tampilkan(kosongList)
      tampilkan(panjang(kosongList))
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '[]');
  samaDengan(baris[1], '0');
});

uji('Pembuatan daftar bersarang (matriks 2D)', () => {
  const sumber = `
  program UjiDaftarBersarang
  mulai
      matriks : daftar = [[1, 2], [3, 4]]
      tampilkan(matriks)
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '[[1, 2], [3, 4]]');
});

// 2. AKSES ELEMEN DAFTAR
console.log('\n--- Kelompok 2: Pembacaan Elemen Berdasarkan Indeks (0-Indexed) ---');

uji('Membaca elemen daftar pertama (indeks 0)', () => {
  const sumber = `
  program UjiAksesNol
  mulai
      angka : daftar = [100, 200, 300]
      tampilkan(angka[0])
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '100');
});

uji('Membaca elemen tengah dan akhir', () => {
  const sumber = `
  program UjiAksesElemen
  mulai
      angka : daftar = [10, 20, 30, 40]
      tampilkan(angka[1])
      tampilkan(angka[3])
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '20');
  samaDengan(baris[1], '40');
});

uji('Membaca elemen daftar bersarang dua tingkat', () => {
  const sumber = `
  program UjiAksesMatriks
  mulai
      matriks : daftar = [[11, 22], [33, 44]]
      tampilkan(matriks[0][1])
      tampilkan(matriks[1][0])
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '22');
  samaDengan(baris[1], '33');
});

// 3. MUTASI ELEMEN DAFTAR
console.log('\n--- Kelompok 3: Perubahan Elemen Daftar (List Mutation) ---');

uji('Mengubah elemen pada indeks tertentu', () => {
  const sumber = `
  program UjiUbahDaftar
  mulai
      angka : daftar = [5, 10, 15]
      angka[1] = 99
      tampilkan(angka[1])
      tampilkan(angka)
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '99');
  samaDengan(baris[1], '[5, 99, 15]');
});

uji('Mengubah elemen pada daftar bersarang', () => {
  const sumber = `
  program UjiUbahMatriks
  mulai
      matriks : daftar = [[1, 2], [3, 4]]
      matriks[0][1] = 500
      tampilkan(matriks[0][1])
      tampilkan(matriks)
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '500');
  samaDengan(baris[1], '[[1, 500], [3, 4]]');
});

uji('Menolak modifikasi elemen pada konstanta tetap bertipe daftar', () => {
  const sumber = `
  program UjiTetapDaftar
  mulai
      tetap angka : daftar = [1, 2, 3]
      angka[0] = 100
  selesai
  `;
  let gagal = false;
  try {
    jalankanProgram(sumber);
  } catch (e: any) {
    gagal = true;
    samaDengan(e.jenis, JenisGalatRuntime.KONSTANTA_DIUBAH);
  }
  samaDengan(gagal, true, 'Harus menolak perubahan elemen pada konstanta tetap');
});

// 4. PEMBUATAN PETA & PETA KOSONG
console.log('\n--- Kelompok 4: Pembuatan & Inisialisasi Peta (Map/Dictionary) ---');

uji('Pembuatan peta dengan kunci string', () => {
  const sumber = `
  program UjiPetaDasar
  mulai
      siswa : peta = {"nama": "Ayu", "umur": 20}
      tampilkan(siswa["nama"])
      tampilkan(siswa["umur"])
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], 'Ayu');
  samaDengan(baris[1], '20');
});

uji('Pembuatan peta dengan sintaks kunci pengidentifikasi tanpa kutip', () => {
  const sumber = `
  program UjiPetaIdKey
  mulai
      siswa : peta = {nama: "Budi", nilai: 95}
      tampilkan(siswa["nama"])
      tampilkan(siswa["nilai"])
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], 'Budi');
  samaDengan(baris[1], '95');
});

uji('Pembuatan peta kosong', () => {
  const sumber = `
  program UjiPetaKosong
  mulai
      kamus : peta = {}
      tampilkan(kamus)
      tampilkan(panjang(kamus))
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '{}');
  samaDengan(baris[1], '0');
});

uji('Pembuatan peta bersarang (Nested Map)', () => {
  const sumber = `
  program UjiPetaBersarang
  mulai
      pegawai : peta = {"identitas": {"nama": "Dewi", "posisi": "Insinyur"}}
      tampilkan(pegawai["identitas"]["nama"])
      tampilkan(pegawai["identitas"]["posisi"])
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], 'Dewi');
  samaDengan(baris[1], 'Insinyur');
});

// 5. MUTASI DAN PENAMBAHAN PASANGAN PETA
console.log('\n--- Kelompok 5: Pembaruan & Penambahan Nilai Peta ---');

uji('Pembaruan nilai kunci yang sudah ada pada peta', () => {
  const sumber = `
  program UjiUpdatePeta
  mulai
      data : peta = {"skor": 50}
      data["skor"] = 100
      tampilkan(data["skor"])
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '100');
});

uji('Penambahan pasangan kunci baru ke dalam peta', () => {
  const sumber = `
  program UjiTambahPeta
  mulai
      kamus : peta = {}
      kamus["id"] = "NX-01"
      kamus["aktif"] = benar
      tampilkan(kamus["id"])
      tampilkan(kamus["aktif"])
      tampilkan(panjang(kamus))
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], 'NX-01');
  samaDengan(baris[1], 'benar');
  samaDengan(baris[2], '2');
});

uji('Menolak modifikasi pasangan pada konstanta tetap bertipe peta', () => {
  const sumber = `
  program UjiTetapPeta
  mulai
      tetap konfigurasi : peta = {"tema": "gelap"}
      konfigurasi["tema"] = "terang"
  selesai
  `;
  let gagal = false;
  try {
    jalankanProgram(sumber);
  } catch (e: any) {
    gagal = true;
    samaDengan(e.jenis, JenisGalatRuntime.KONSTANTA_DIUBAH);
  }
  samaDengan(gagal, true, 'Harus menolak perubahan kunci pada peta tetap');
});

// 6. KEAMANAN & PENANGANAN KESALAHAN RUNTIME
console.log('\n--- Kelompok 6: Penanganan Kesalahan Runtime (Diagnostics) ---');

uji('Indeks daftar di luar batas atas melemparkan BATAS_INDEKS_TERLAMPAUI', () => {
  const sumber = `
  program UjiBatasAtas
  mulai
      arr : daftar = [1, 2]
      tampilkan(arr[5])
  selesai
  `;
  let tertangkap = false;
  try {
    jalankanProgram(sumber);
  } catch (e: any) {
    tertangkap = true;
    samaDengan(e.jenis, JenisGalatRuntime.BATAS_INDEKS_TERLAMPAUI);
  }
  samaDengan(tertangkap, true);
});

uji('Indeks daftar negatif melemparkan BATAS_INDEKS_TERLAMPAUI', () => {
  const sumber = `
  program UjiIndeksNegatif
  mulai
      arr : daftar = [1, 2, 3]
      tampilkan(arr[-1])
  selesai
  `;
  let tertangkap = false;
  try {
    jalankanProgram(sumber);
  } catch (e: any) {
    tertangkap = true;
    samaDengan(e.jenis, JenisGalatRuntime.BATAS_INDEKS_TERLAMPAUI);
  }
  samaDengan(tertangkap, true);
});

uji('Kunci peta tidak ditemukan melemparkan KUNCI_TIDAK_DITEMUKAN', () => {
  const sumber = `
  program UjiKunciHilang
  mulai
      m : peta = {"nama": "Ayu"}
      tampilkan(m["umur"])
  selesai
  `;
  let tertangkap = false;
  try {
    jalankanProgram(sumber);
  } catch (e: any) {
    tertangkap = true;
    samaDengan(e.jenis, JenisGalatRuntime.KUNCI_TIDAK_DITEMUKAN);
  }
  samaDengan(tertangkap, true);
});

uji('Indeks daftar bukan bilangan bulat ditolak oleh type checker', () => {
  const sumber = `
  program UjiTipeIndeks
  mulai
      arr : daftar = [1, 2, 3]
      tampilkan(arr["satu"])
  selesai
  `;
  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.INDEKS_TIDAK_SESUAI);
});

uji('Kunci peta bukan teks ditolak oleh type checker', () => {
  const sumber = `
  program UjiTipeKunci
  mulai
      m : peta = {"a": 1}
      tampilkan(m[100])
  selesai
  `;
  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.INDEKS_TIDAK_SESUAI);
});

uji('Akses indeks pada tipe skalar bukan koleksi ditolak oleh type checker', () => {
  const sumber = `
  program UjiBukanKoleksi
  mulai
      angka : bilangan = 42
      tampilkan(angka[0])
  selesai
  `;
  const galat = periksaTipeProgram(sumber);
  samaDengan(galat.length > 0, true);
  samaDengan(galat[0].jenis, JenisGalatTipe.TIPE_BUKAN_KOLEKSI);
});

// 7. OPERATOR KESETARAAN STRUKTUR DATA
console.log('\n--- Kelompok 7: Operator Kesetaraan Struktur Data (==, !=) ---');

uji('Kesetaraan daftar (elemen identik)', () => {
  const sumber = `
  program UjiSamaDaftar
  mulai
      a : daftar = [1, 2, 3]
      b : daftar = [1, 2, 3]
      c : daftar = [1, 2, 4]
      tampilkan(a == b)
      tampilkan(a != c)
      tampilkan(a == c)
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], 'benar');
  samaDengan(baris[1], 'benar');
  samaDengan(baris[2], 'salah');
});

uji('Kesetaraan peta (kunci dan nilai identik)', () => {
  const sumber = `
  program UjiSamaPeta
  mulai
      m1 : peta = {"x": 10, "y": 20}
      m2 : peta = {"x": 10, "y": 20}
      m3 : peta = {"x": 10, "y": 99}
      tampilkan(m1 == m2)
      tampilkan(m1 != m3)
      tampilkan(m1 == m3)
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], 'benar');
  samaDengan(baris[1], 'benar');
  samaDengan(baris[2], 'salah');
});

// 8. PENGGUNAAN STRUKTUR DATA DALAM FUNGSI
console.log('\n--- Kelompok 8: Struktur Data dalam Fungsi & Nilai Kembali ---');

uji('Fungsi menerima parameter daftar dan mengembalikan nilai', () => {
  const sumber = `
  fungsi hitungJumlah(arr : daftar) : bilangan
  mulai
      total : bilangan = 0
      n : bilangan = panjang(arr)
      untuk i dari 0 sampai n - 1 lakukan
          total = total + arr[i]
      akhir
      kembalikan total
  selesai

  program UjiFungsiDaftar
  mulai
      angka : daftar = [10, 20, 30]
      hasil : bilangan = hitungJumlah(angka)
      tampilkan(hasil)
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '60');
});

uji('Fungsi membuat dan mengembalikan daftar', () => {
  const sumber = `
  fungsi buatPasangan(a : bilangan, b : bilangan) : daftar
  mulai
      kembalikan [a, b]
  selesai

  program UjiKembaliDaftar
  mulai
      p : daftar = buatPasangan(7, 8)
      tampilkan(p[0])
      tampilkan(p[1])
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '7');
  samaDengan(baris[1], '8');
});

uji('Fungsi menerima peta dan mengembalikan nilai kunci', () => {
  const sumber = `
  fungsi ambilNama(data : peta) : teks
  mulai
      kembalikan data["nama"]
  selesai

  program UjiFungsiPeta
  mulai
      orang : peta = {"nama": "Kartini", "kota": "Jepara"}
      tampilkan(ambilNama(orang))
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], 'Kartini');
});

// 9. PENGGUNAAN STRUKTUR DATA DALAM PERCABANGAN & PERULANGAN
console.log('\n--- Kelompok 9: Integrasi Struktur Data dalam Kontrol Alur ---');

uji('Iterasi daftar dengan perulangan untuk dan percabangan jika', () => {
  const sumber = `
  program UjiFilterDaftar
  mulai
      angka : daftar = [1, 2, 3, 4, 5, 6]
      n : bilangan = panjang(angka)
      jumlahGenap : bilangan = 0
      untuk i dari 0 sampai n - 1 lakukan
          jika angka[i] % 2 == 0 maka
              jumlahGenap = jumlahGenap + 1
          akhir
      akhir
      tampilkan(jumlahGenap)
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '3');
});

uji('Perulangan selama menelusuri daftar sampai kondisi tertentu', () => {
  const sumber = `
  program UjiSelamaDaftar
  mulai
      item : daftar = [10, 25, 50, 100]
      idx : bilangan = 0
      ditemukan : logika = salah
      selama idx < panjang(item) dan tidak ditemukan lakukan
          jika item[idx] == 50 maka
              ditemukan = benar
          akhir
          idx = idx + 1
      akhir
      tampilkan(ditemukan)
      tampilkan(idx)
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], 'benar');
  samaDengan(baris[1], '3');
});

// 10. PROGRAM CONTOH INTEGRASI RESMI
console.log('\n--- Kelompok 10: Program Integrasi Penuh Contoh Resmi ---');

uji('Program ContohDaftar & ContohPeta dari dokumentasi resmi', () => {
  const sumber = `
  program ContohStrukturData
  mulai
      daftar angka = [10, 20, 30, 40]
      tampilkan(angka[0])
      tampilkan(angka[3])

      peta siswa = {"nama": "Ayu", "umur": 20}
      tampilkan(siswa["nama"])
      tampilkan(siswa["umur"])

      angka[0] = 99
      tampilkan(angka[0])

      siswa["umur"] = 21
      tampilkan(siswa["umur"])
  selesai
  `;
  const baris = jalankanProgram(sumber);
  samaDengan(baris[0], '10');
  samaDengan(baris[1], '40');
  samaDengan(baris[2], 'Ayu');
  samaDengan(baris[3], '20');
  samaDengan(baris[4], '99');
  samaDengan(baris[5], '21');
});

// RINGKASAN
console.log('-----------------------------------------------------------------------------');
const total = daftarHasil.length;
const lulus = daftarHasil.filter(h => h.lulus).length;
const gagal = daftarHasil.filter(h => !h.lulus).length;
console.log(`Hasil Pengujian Struktur Data: ${lulus} Uji LULUS, ${gagal} Uji GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (gagal > 0) {
  process.exit(1);
} else {
  console.log('STATUS: SELURUH PENGUJIAN STRUKTUR DATA NUSANTARA BERHASIL 100%.');
}
