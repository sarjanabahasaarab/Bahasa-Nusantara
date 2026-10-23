/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatKode, formatAman, FormatterNUSANTARA } from '../../src/toolchain/formatter';
import { muatKonfigurasiFormatDariTOML } from '../../src/toolchain/konfigurasi';
import { LinterNUSANTARA, KodeAturanLinter } from '../../src/toolchain/linter';
import { PemeriksaProyek } from '../../src/toolchain/pemeriksa';
import { Parser } from '../../src/parser/parser';
import { PembacaBerkasMemori } from '../../src/modul';
import { NusantaraCLI } from '../../src/paket/cli';

let totalUji = 0;
let ujiBerhasil = 0;
let ujiGagal = 0;

function pastikan(kondisi: boolean, pesan: string): void {
  totalUji++;
  if (!kondisi) {
    ujiGagal++;
    console.error(`  ✗ GAGAL: ${pesan}`);
    throw new Error(`Pengujian Gagal: ${pesan}`);
  }
  ujiBerhasil++;
  console.log(`  ✓ ${pesan}`);
}

function pastikanSama<T>(aktual: T, ekspektasi: T, pesan: string): void {
  totalUji++;
  if (aktual !== ekspektasi) {
    ujiGagal++;
    console.error(`  ✗ GAGAL: ${pesan}`);
    console.error(`    Ekspektasi : ${JSON.stringify(ekspektasi)}`);
    console.error(`    Aktual     : ${JSON.stringify(aktual)}`);
    throw new Error(`Pengujian Gagal: ${pesan}`);
  }
  ujiBerhasil++;
  console.log(`  ✓ ${pesan}`);
}

function uji(nama: string, fn: () => void): void {
  try {
    fn();
  } catch (err: any) {
    // Error sudah dicatat di pastikan/pastikanSama
  }
}

console.log('=============================================================================');
console.log('PENGUJIAN TOOLCHAIN & FORMATTER BAHASA NUSANTARA (PHASE 19)');
console.log('Target Milestone: v0.19.0');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// KELOMPOK 1: FORMATTER DASAR & REKONSTRUKSI AST
// -----------------------------------------------------------------------------
console.log('--- Kelompok 1: Formatter Dasar & Rekonstruksi AST ---');

uji('Memformat deklarasi variabel, tetap, dan operator spacing', () => {
  const masukan = `variabel  x:bilangan=10+20*3
tetap   PI:desimal=3.14159`;
  const hasil = formatKode(masukan);
  pastikan(hasil.includes('variabel x: bilangan = 10 + 20 * 3'), 'Spasi variabel dan operator rapi');
  pastikan(hasil.includes('tetap PI: desimal = 3.14159'), 'Spasi konstanta tetap rapi');
});

uji('Memformat fungsi dengan parameter, tipe kembalian, dan indentasi blok', () => {
  const masukan = `fungsi hitungLuas(panjang:bilangan,lebar:bilangan):bilangan
mulai
kembalikan panjang*lebar
selesai`;
  const hasil = formatKode(masukan);
  pastikan(hasil.includes('fungsi hitungLuas(panjang: bilangan, lebar: bilangan): bilangan'), 'Header fungsi rapi');
  pastikan(hasil.includes('    kembalikan panjang * lebar'), 'Tubuh fungsi terindentasi 4 spasi');
  pastikan(hasil.includes('selesai'), 'Kata kunci selesai terjaga');
});

uji('Memformat percabangan jika-maka-selain-akhir', () => {
  const masukan = `jika nilai>=75 maka
tampilkan("Lulus")
selain
tampilkan("Remedial")
akhir`;
  const hasil = formatKode(masukan);
  pastikan(hasil.includes('jika nilai >= 75 maka'), 'Kondisi percabangan rapi');
  pastikan(hasil.includes('    tampilkan("Lulus")'), 'Cabang maka terindentasi');
  pastikan(hasil.includes('    tampilkan("Remedial")'), 'Cabang selain terindentasi');
  pastikan(hasil.includes('akhir'), 'Penutup akhir sejajar');
});

uji('Memformat perulangan selama dan untuk', () => {
  const masukan = `selama i<10 lakukan
i=i+1
akhir
untuk j dari 1 sampai 5 lakukan
total=total+j
akhir`;
  const hasil = formatKode(masukan);
  pastikan(hasil.includes('selama i < 10 lakukan'), 'Header selama rapi');
  pastikan(hasil.includes('    i = i + 1'), 'Tubuh selama terindentasi');
  pastikan(hasil.includes('untuk j dari 1 sampai 5 lakukan'), 'Header untuk rapi');
  pastikan(hasil.includes('    total = total + j'), 'Tubuh untuk terindentasi');
});

uji('Memformat struktur data koleksi daftar dan peta', () => {
  const masukan = `angka=[1,2,3,4]
kamus={"id":101,"nama":"Budi"}`;
  const hasil = formatKode(masukan);
  pastikan(hasil.includes('[1, 2, 3, 4]'), 'Spasi koma pada daftar rapi');
  pastikan(hasil.includes('{"id": 101, "nama": "Budi"}'), 'Spasi pada pasangan peta rapi');
});

uji('Memformat deklarasi modul dan pernyataan impor destrukturisasi', () => {
  const masukan = `modul Akuntansi
impor { catat, hitung } dari utilitas
impor matematika sebagai mtk`;
  const hasil = formatKode(masukan);
  pastikan(hasil.includes('modul Akuntansi'), 'Deklarasi modul rapi');
  pastikan(hasil.includes('impor { catat, hitung } dari utilitas'), 'Destrukturisasi impor rapi');
  pastikan(hasil.includes('impor matematika sebagai mtk'), 'Alias impor rapi');
});

// -----------------------------------------------------------------------------
// KELOMPOK 2: IDEMPOTENSI FORMATTER
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 2: Idempotensi Formatter (format(format(x)) === format(x)) ---');

uji('Idempotensi program lengkap dengan fungsi dan blok utama', () => {
  const program = `fungsi tambah(a: bilangan, b: bilangan): bilangan
mulai
    kembalikan a + b
selesai

program UjiIdempoten
mulai
    variabel hasil: bilangan = tambah(10, 20)
    jika hasil > 20 maka
        tampilkan("Besar")
    akhir
selesai
`;
  const format1 = formatKode(program);
  const format2 = formatKode(format1);
  pastikanSama(format1, format2, 'format(format(kode)) persis sama dengan format(kode)');
});

uji('Idempotensi struktur ekspresi biner bertingkat', () => {
  const kode = `variabel x: bilangan = (a + b) * (c - d) / 2\n`;
  const format1 = formatKode(kode);
  const format2 = formatKode(format1);
  pastikanSama(format1, format2, 'Presedensi tanda kurung identik pada pemformatan ulang');
});

// -----------------------------------------------------------------------------
// KELOMPOK 3: PRESERVASI STRING & KARAKTER LOLOS
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 3: Preservasi Teks Literal & String ---');

uji('Mempertahankan spasi banyak di dalam string', () => {
  const masukan = `variabel teks: teks = "Halo      Dunia     NUSANTARA"`;
  const hasil = formatKode(masukan);
  pastikan(hasil.includes('"Halo      Dunia     NUSANTARA"'), 'Jumlah spasi di dalam string tidak berubah');
});

uji('Mempertahankan urutan karakter lolos (escape sequence)', () => {
  const masukan = `variabel s: teks = "Baris1\\nBaris2\\tKolom2\\"Kutip\\""`;
  const hasil = formatKode(masukan);
  pastikan(hasil.includes('Baris1\\nBaris2'), 'Karakter escape \\n dipertahankan');
  pastikan(hasil.includes('\\"Kutip\\"'), 'Karakter escape kutip dipertahankan');
});

// -----------------------------------------------------------------------------
// KELOMPOK 4: PRESERVASI KOMENTAR KODE SUMBER
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 4: Preservasi Komentar Kode Sumber ---');

uji('Mempertahankan komentar satu baris di awal dan di dalam fungsi', () => {
  const masukan = `// Komentar header file
fungsi kalikan(x: bilangan, y: bilangan): bilangan
mulai
    // Lakukan perkalian dua bilangan
    kembalikan x * y
selesai
`;
  const hasil = formatKode(masukan);
  pastikan(hasil.includes('// Komentar header file'), 'Komentar header tetap ada');
  pastikan(hasil.includes('// Lakukan perkalian dua bilangan'), 'Komentar tubuh fungsi tetap ada');
});

uji('Mempertahankan komentar inline setelah baris instruksi', () => {
  const masukan = `variabel angka: bilangan = 100 // angka awal
tampilkan(angka) // cetak nilai`;
  const hasil = formatKode(masukan);
  pastikan(hasil.includes('// angka awal'), 'Komentar inline baris 1 dipertahankan');
  pastikan(hasil.includes('// cetak nilai'), 'Komentar inline baris 2 dipertahankan');
});

// -----------------------------------------------------------------------------
// KELOMPOK 5: PEMFORMATAN AMAN (formatAman & SAFETY CHECK)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 5: Pemformatan Aman & Verifikasi Reparsing ---');

uji('formatAman berhasil pada kode valid dan mendeteksi perubahan', () => {
  const kodeKotor = `variabel  a:bilangan=1`;
  const res = formatAman(kodeKotor);
  pastikan(res.sukses === true, 'formatAman sukses');
  pastikan(res.apakahBerubah === true, 'Mendeteksi adanya perubahan format');
  pastikan(res.hasil!.includes('variabel a: bilangan = 1'), 'Hasil terformat benar');
});

uji('formatAman menggagalkan kode yang memiliki kesalahan sintaks tanpa merusak', () => {
  const kodeRusak = `variabel a: bilangan = ; // sintaks cacat`;
  const res = formatAman(kodeRusak);
  pastikan(res.sukses === false, 'formatAman gagal pada sintaks cacat');
  pastikan(res.galat !== undefined, 'Menyertakan galat diagnostik parser');
});

// -----------------------------------------------------------------------------
// KELOMPOK 6: LINTER DASAR NUSANTARA (NUS-W001 s/d NUS-W004)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 6: Linter Dasar NUSANTARA ---');

uji('NUS-W001: Mendeteksi variabel dideklarasikan tetapi tidak digunakan', () => {
  const kode = `program UjiLinter
mulai
    variabel tidakTerpakai: bilangan = 42
    variabel dipakai: bilangan = 10
    tampilkan(dipakai)
selesai`;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const linter = new LinterNUSANTARA(kode, 'linter.nusantara');
  const hasil = linter.periksa(ast);

  const warnW001 = hasil.find(h => h.kode === KodeAturanLinter.VARIABEL_TIDAK_DIGUNAKAN);
  pastikan(warnW001 !== undefined, 'Mendeteksi peringatan NUS-W001');
  pastikan(warnW001!.pesan.includes('tidakTerpakai'), 'Menyebutkan nama variabel yang tidak digunakan');
});

uji('NUS-W001: Mengabaikan variabel yang diawali garis bawah (_)', () => {
  const kode = `program UjiAbaikan
mulai
    variabel _diabaikan: bilangan = 99
    variabel x: bilangan = 1
    tampilkan(x)
selesai`;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const linter = new LinterNUSANTARA(kode);
  const hasil = linter.periksa(ast);

  const warnDiabaikan = hasil.find(h => h.pesan.includes('_diabaikan'));
  pastikan(warnDiabaikan === undefined, 'Variabel dengan awalan _ tidak memicu peringatan');
});

uji('NUS-W002: Mendeteksi kode tidak terjangkau setelah kembalikan', () => {
  const kode = `fungsi tes(): bilangan
mulai
    kembalikan 10
    tampilkan("ini tidak akan pernah dipanggil")
selesai`;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const linter = new LinterNUSANTARA(kode);
  const hasil = linter.periksa(ast);

  const warnW002 = hasil.find(h => h.kode === KodeAturanLinter.KODE_TAK_TERJANGKAU);
  pastikan(warnW002 !== undefined, 'Mendeteksi peringatan NUS-W002 kode tak terjangkau');
});

uji('NUS-W003: Mendeteksi perbandingan ekspresi identik', () => {
  const kode = `program UjiSama
mulai
    variabel x: bilangan = 10
    jika x == x maka
        tampilkan("selalu benar")
    akhir
selesai`;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const linter = new LinterNUSANTARA(kode);
  const hasil = linter.periksa(ast);

  const warnW003 = hasil.find(h => h.kode === KodeAturanLinter.PERBANDINGAN_IDENTIK);
  pastikan(warnW003 !== undefined, 'Mendeteksi peringatan NUS-W003 perbandingan identik');
});

uji('NUS-W004: Mendeteksi impor modul yang tidak pernah digunakan', () => {
  const kode = `impor matematika
program UjiImpor
mulai
    tampilkan("tidak memakai matematika")
selesai`;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const linter = new LinterNUSANTARA(kode);
  const hasil = linter.periksa(ast);

  const warnW004 = hasil.find(h => h.kode === KodeAturanLinter.IMPOR_TIDAK_DIGUNAKAN);
  pastikan(warnW004 !== undefined, 'Mendeteksi peringatan NUS-W004 impor tak terpakai');
});

// -----------------------------------------------------------------------------
// KELOMPOK 7: VALIDATOR PROYEK & PEMERIKSA PROYEK
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 7: Validator Proyek & PemeriksaProyek ---');

uji('Memeriksa berkas valid tunggal tanpa kesalahan', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/utama.nusantara': `program Utama
mulai
    variabel angka: bilangan = 10
    tampilkan(angka)
selesai`,
  });

  const pemeriksa = new PemeriksaProyek(fs);
  const hasil = pemeriksa.periksaBerkas('/proyek/utama.nusantara');
  pastikan(hasil.sukses === true, 'Pemeriksaan berkas valid sukses');
  pastikanSama(hasil.galat.length, 0, 'Jumlah galat berkas harus 0');
});

uji('Memvalidasi proyek lengkap (manifest nusantara.toml dan kode sumber)', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/nusantara.toml': `[nusantara]
nama = "aplikasi-keren"
versi = "1.0.0"
deskripsi = "Aplikasi uji"
lisensi = "Apache-2.0"`,
    '/proyek/src/index.nusantara': `program Index
mulai
    variabel pesan: teks = "Halo"
    tampilkan(pesan)
selesai`,
  });

  const pemeriksa = new PemeriksaProyek(fs);
  const hasilProyek = pemeriksa.periksaProyek('/proyek');
  pastikan(hasilProyek.sukses === true, 'Pemeriksaan proyek sukses');
  pastikan(hasilProyek.totalBerkasDiperiksa >= 1, 'Menemukan berkas .nusantara');
});

uji('Mendeteksi manifest rusak pada pemeriksaan proyek', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/nusantara.toml': `[nusantara]\nversi = "bukan_semver"`, // tanpa nama
  });

  const pemeriksa = new PemeriksaProyek(fs);
  const hasilProyek = pemeriksa.periksaProyek('/proyek');
  pastikan(hasilProyek.sukses === false, 'Proyek dengan manifest cacat ditolak');
  pastikan(hasilProyek.galat.length > 0, 'Menghasilkan galat diagnostik manifest');
});

// -----------------------------------------------------------------------------
// KELOMPOK 8: INTEGRASI COMMAND-LINE INTERFACE (CLI)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 8: Integrasi Command-Line Interface (CLI) ---');

uji('CLI nusantara format mencetak kode terformat ke stdout', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/kotor.nusantara': `variabel  a:bilangan=10`,
  });
  let output = '';
  const cli = new NusantaraCLI({
    pembaca: fs,
    penulisLog: (m) => { output += m + '\n'; },
  });

  const status = cli.jalankan(['format', '/proyek/kotor.nusantara']);
  pastikanSama(status, 0, 'Status keluar 0 saat format sukses');
  pastikan(output.includes('variabel a: bilangan = 10'), 'Mencetak output terformat');
});

uji('CLI nusantara format --cek mendeteksi berkas belum terformat', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/kotor.nusantara': `variabel   x:bilangan=5`,
  });
  let output = '';
  const cli = new NusantaraCLI({
    pembaca: fs,
    penulisLog: (m) => { output += m + '\n'; },
  });

  const status = cli.jalankan(['format', '--cek', '/proyek/kotor.nusantara']);
  pastikanSama(status, 1, 'Status keluar 1 saat format cek mendeteksi ketidaksesuaian');
  pastikan(output.includes('File belum mengikuti format standar'), 'Menyatakan belum sesuai standar');
});

uji('CLI nusantara format --tulis memformat berkas langsung (in-place safe write)', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/kotor.nusantara': `variabel   y:bilangan=99`,
  });
  const cli = new NusantaraCLI({
    pembaca: fs,
  });

  const status = cli.jalankan(['format', '--tulis', '/proyek/kotor.nusantara']);
  pastikanSama(status, 0, 'Status keluar 0 saat format tulis berhasil');
  const berkasBaru = fs.baca('/proyek/kotor.nusantara');
  pastikan(berkasBaru.includes('variabel y: bilangan = 99'), 'Berkas asli berhasil diperbarui');
});

uji('CLI nusantara cek memvalidasi proyek dan menghasilkan konfirmasi sukses', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/bersih.nusantara': `program Bersih
mulai
    variabel v: bilangan = 1
    tampilkan(v)
selesai`,
  });
  let log = '';
  const cli = new NusantaraCLI({
    pembaca: fs,
    penulisLog: (m) => { log += m + '\n'; },
  });

  const status = cli.jalankan(['cek', '/proyek/bersih.nusantara']);
  pastikanSama(status, 0, 'nusantara cek berhasil dengan status 0');
  pastikan(log.includes('Tidak ditemukan kesalahan'), 'Menyatakan tidak ada kesalahan');
});

uji('CLI nusantara versi menampilkan target v0.19.0', () => {
  let log = '';
  const cli = new NusantaraCLI({
    penulisLog: (m) => { log += m + '\n'; },
  });

  const status = cli.jalankan(['versi']);
  pastikanSama(status, 0, 'Perintah versi sukses');
  pastikan(log.includes('v0.19.0'), 'Versi resmi adalah v0.19.0');
});

// -----------------------------------------------------------------------------
// REKAPITULASI HASIL PENGUJIAN
// -----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`TOTAL UJI: ${totalUji} | BERHASIL: ${ujiBerhasil} | GAGAL: ${ujiGagal}`);
console.log('======================================================');

if (ujiGagal > 0) {
  console.error('\n[GAGAL] Sebagian pengujian Phase 19 belum memenuhi syarat.');
  process.exit(1);
} else {
  console.log('\n[SUKSES] Seluruh pengujian Toolchain & Formatter NUSANTARA (Phase 19) BERHASIL 100%!');
}
