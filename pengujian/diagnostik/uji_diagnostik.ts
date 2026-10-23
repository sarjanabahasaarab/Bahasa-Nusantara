/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  KodeGalat,
  METADATA_KODE_GALAT,
  TingkatDiagnostik,
  KategoriDiagnostik,
  Diagnostik,
  GalatNusantara,
  buatCuplikanSumber,
  formatCuplikanTeks,
  hitungJarakLevenshtein,
  cariSaranTerdekat,
  buatPesanSaran,
  formatDiagnostik,
  formatDiagnostikKeJSON,
  MesinDiagnostik,
  mesinDiagnostikDefault,
  deteksiKonteksPaket,
} from '../../src/diagnostik';
import { Lexer } from '../../src/lexer/lexer';
import { GalatLexer, JenisGalatLexer } from '../../src/lexer/galat';
import { Parser } from '../../src/parser/parser';
import { GalatParser, JenisGalatParser } from '../../src/parser/galat';
import { PemeriksaTipe } from '../../src/tipe/pemeriksaTipe';
import { GalatTipe, JenisGalatTipe } from '../../src/tipe/galatTipe';
import { Interpreter } from '../../src/interpreter/interpreter';
import { GalatRuntime, JenisGalatRuntime } from '../../src/interpreter/galat';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { PembacaBerkasMemori, ResolverModul, PemuatModul } from '../../src/modul';
import { GalatModul, JenisGalatModul } from '../../src/modul/galatModul';
import { NusantaraCLI, GalatManifest, GalatKeamananPaket } from '../../src/paket';

let totalUji = 0;
let ujiBerhasil = 0;
let ujiGagal = 0;

function uji(nama: string, fn: () => void) {
  totalUji++;
  try {
    fn();
    console.log(`  ✓ ${nama}`);
    ujiBerhasil++;
  } catch (err: any) {
    console.error(`  ✗ ${nama}`);
    console.error(`    Alasan: ${err.message || err}`);
    ujiGagal++;
  }
}

function pastikan(kondisi: boolean, pesan: string = 'Kondisi bernilai salah') {
  if (!kondisi) {
    throw new Error(pesan);
  }
}

function pastikanSama(aktual: any, diharapkan: any, label: string = 'Nilai tidak sama') {
  if (aktual !== diharapkan) {
    throw new Error(`${label}: diharapkan '${diharapkan}', tetapi menerima '${aktual}'`);
  }
}

console.log('=============================================================================');
console.log('PENGUJIAN SISTEM ERROR & DEBUGGING BAHASA NUSANTARA (PHASE 18)');
console.log('Target Milestone: v0.18.0');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// KELOMPOK 1: KATEGORI & KODE ERROR TERSTRUKTUR
// -----------------------------------------------------------------------------
console.log('--- Kelompok 1: Kategori & Kode Error Terstruktur ---');

uji('Memiliki 12 Kategori Diagnostik resmi Bahasa NUSANTARA', () => {
  const kategoriList = Object.values(KategoriDiagnostik);
  pastikan(kategoriList.includes(KategoriDiagnostik.LEXER), 'Harus memuat LEXER');
  pastikan(kategoriList.includes(KategoriDiagnostik.PARSER), 'Harus memuat PARSER');
  pastikan(kategoriList.includes(KategoriDiagnostik.TIPE), 'Harus memuat TIPE');
  pastikan(kategoriList.includes(KategoriDiagnostik.NAMA), 'Harus memuat NAMA');
  pastikan(kategoriList.includes(KategoriDiagnostik.MODUL), 'Harus memuat MODUL');
  pastikan(kategoriList.includes(KategoriDiagnostik.PAKET), 'Harus memuat PAKET');
  pastikan(kategoriList.includes(KategoriDiagnostik.RUNTIME), 'Harus memuat RUNTIME');
  pastikan(kategoriList.includes(KategoriDiagnostik.BERKAS), 'Harus memuat BERKAS');
  pastikan(kategoriList.includes(KategoriDiagnostik.INDEKS), 'Harus memuat INDEKS');
  pastikan(kategoriList.includes(KategoriDiagnostik.KONVERSI), 'Harus memuat KONVERSI');
  pastikan(kategoriList.includes(KategoriDiagnostik.INTERNAL), 'Harus memuat INTERNAL');
  pastikan(kategoriList.length >= 11, 'Minimal memuat seluruh kategori resmi');
});

uji('Semua Kode Galat memiliki awalan NUS- dan terdaftar di tabel METADATA_KODE_GALAT', () => {
  const semuaKode = Object.values(KodeGalat);
  pastikan(semuaKode.length >= 25, 'Harus mendefinisikan seluruh kode error inti');

  for (const kode of semuaKode) {
    pastikan(kode.startsWith('NUS-'), `Kode '${kode}' harus diawali dengan 'NUS-'`);
    const meta = METADATA_KODE_GALAT[kode];
    pastikan(meta !== undefined, `Metadata untuk kode '${kode}' harus terdaftar`);
    pastikan(meta.judul.length > 0, `Judul untuk kode '${kode}' tidak boleh kosong`);
    pastikan(meta.penjelasan.length > 0, `Penjelasan untuk kode '${kode}' tidak boleh kosong`);
  }
});

// -----------------------------------------------------------------------------
// KELOMPOK 2: SOURCE LOCATION & SOURCE SNIPPET (CARET ^^^^)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 2: Source Location & Source Snippet Visual Caret ---');

uji('Menghasilkan potongan kode baris dan caret ^^^^ yang presisi', () => {
  const kodeSumber = `program Hitung
mulai
    angka : bilangan = 10
    hasil = tambah(angka, "seratus")
selesai`;

  const potongan = buatCuplikanSumber(kodeSumber, 4, 27, 9);
  pastikan(potongan !== undefined, 'Cuplikan harus berhasil dibuat');
  pastikanSama(potongan!.nomorBaris, 4, 'Nomor baris harus 4');
  pastikanSama(potongan!.teksBaris, '    hasil = tambah(angka, "seratus")', 'Teks baris harus cocok');
  pastikan(potongan!.teksCaret.endsWith('^^^^^^^^^'), 'Caret harus memiliki 9 tanda panah');
  pastikanSama(potongan!.panjang, 9, 'Panjang token harus 9');

  const teksFormat = formatCuplikanTeks(potongan!);
  pastikan(teksFormat.includes('4 |     hasil = tambah(angka, "seratus")'), 'Harus menyertakan baris dan pipa');
  pastikan(teksFormat.includes('  |'), 'Harus menyertakan pipa pada baris caret');
});

uji('Menangani batas tepi cuplikan kode sumber dengan aman', () => {
  const kosong = buatCuplikanSumber('', 1, 1, 1);
  pastikanSama(kosong, undefined, 'Sumber kosong harus mengembalikan undefined');

  const kodeSingkat = `x = 1`;
  const diLuarBatas = buatCuplikanSumber(kodeSingkat, 99, 1, 1);
  pastikanSama(diLuarBatas, undefined, 'Baris di luar batas harus mengembalikan undefined');
});

// -----------------------------------------------------------------------------
// KELOMPOK 3: ALGORITMA LEVENSHTEIN & SARAN SALTIK (TYPO)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 3: Rekomendasi Koreksi Saltik (Levenshtein Distance) ---');

uji('Menghitung jarak Levenshtein secara deterministik', () => {
  pastikanSama(hitungJarakLevenshtein('tampilkan', 'tampilkan'), 0, 'Kata identik harus berjarak 0');
  pastikanSama(hitungJarakLevenshtein('tampilkan', 'tampilkann'), 1, 'Kelebihan satu huruf berjarak 1');
  pastikanSama(hitungJarakLevenshtein('panjang', 'pajang'), 1, 'Kekurangan satu huruf berjarak 1');
  pastikanSama(hitungJarakLevenshtein('variabel', 'varibel'), 1, 'Kekurangan huruf tengah berjarak 1');
  pastikanSama(hitungJarakLevenshtein('kucing', 'anjing'), 3, 'kucing dan anjing berjarak 3');
});

uji('Memberikan saran identifier terdekat dari daftar kandidat yang tersedia', () => {
  const kandidat = ['tampilkan', 'masukan', 'panjang', 'hitungTotal', 'daftarNilai'];

  const saran1 = cariSaranTerdekat('tampilkann', kandidat);
  pastikanSama(saran1, 'tampilkan', 'Harus menyarankan tampilkann -> tampilkan');

  const saran2 = cariSaranTerdekat('pajang', kandidat);
  pastikanSama(saran2, 'panjang', 'Harus menyarankan pajang -> panjang');

  const pesanSaran = buatPesanSaran('tampilkann', kandidat);
  pastikan(pesanSaran !== undefined && pesanSaran.includes("'tampilkan'"), 'Pesan saran harus terformat ramah');
});

uji('Menolak memberikan saran jika kata terlalu jauh dari semua kandidat (low confidence)', () => {
  const kandidat = ['tampilkan', 'masukan', 'panjang'];
  const saran = cariSaranTerdekat('xyz123random', kandidat);
  pastikanSama(saran, undefined, 'Tidak boleh memberikan saran jika tingkat keyakinan rendah');
});

// -----------------------------------------------------------------------------
// KELOMPOK 4: TRANSFORMASI GALAT KOMPILATOR KE DIAGNOSTIK RESMI
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 4: Transformasi Galat Kompilator ke Diagnostik Resmi ---');

const mesin = new MesinDiagnostik();

uji('Transformasi Galat Leksikal (Karakter tidak sah & teks tidak ditutup)', () => {
  const lexer = new Lexer('angka = @#$');
  const hasil = lexer.tokenisasi();
  pastikan(hasil.galat.length > 0, 'Harus mendeteksi galat leksikal');
  const tertangkap = hasil.galat[0];
  pastikan(tertangkap instanceof GalatLexer, 'Harus mendapatkan GalatLexer');

  const diag = mesin.ubahKeDiagnostik(tertangkap, {
    kodeSumber: 'angka = @#$',
    namaBerkas: 'uji.nusantara',
  });

  pastikanSama(diag.kategori, KategoriDiagnostik.LEXER, 'Kategori harus LEXER');
  pastikanSama(diag.kode, KodeGalat.LEX_KARAKTER_TAK_DIKENAL, 'Kode harus LEX-001');
  pastikanSama(diag.lokasi?.berkas, 'uji.nusantara', 'Nama berkas harus tercatat');
  pastikan(diag.potonganKode !== undefined, 'Harus membuat cuplikan kode');
});

uji('Transformasi Galat Sintaksis / Parser (Token tak terduga & ekspresi tidak lengkap)', () => {
  const kode = `program UjiSintaks
mulai
    angka = 10 +
selesai`;
  const parser = new Parser(kode);
  parser.parse();
  const daftar = parser.dapatkanDaftarGalat();
  pastikan(daftar.length > 0, 'Parser harus mencatat galat sintaksis');
  const tertangkap = daftar[0];
  pastikan(tertangkap instanceof GalatParser, 'Harus merupakan GalatParser');

  const diag = mesin.ubahKeDiagnostik(tertangkap, {
    kodeSumber: kode,
    namaBerkas: 'sintaks.nusantara',
  });

  pastikanSama(diag.kategori, KategoriDiagnostik.PARSER, 'Kategori harus PARSER');
  pastikan(diag.kode.startsWith('NUS-PAR-'), 'Kode harus diawali NUS-PAR-');
});

uji('Transformasi Galat Sistem Tipe (Ketidakcocokan tipe & deklarasi ganda)', () => {
  const kode = `program UjiTipe
mulai
    x : bilangan = "ini teks"
selesai`;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const checker = new PemeriksaTipe();
  const daftar = checker.periksa(ast);
  pastikan(daftar.length > 0, 'Pemeriksa tipe harus mencatat galat tipe');
  const tertangkap = daftar[0];
  pastikan(tertangkap instanceof GalatTipe, 'Harus merupakan GalatTipe');

  const diag = mesin.ubahKeDiagnostik(tertangkap, {
    kodeSumber: kode,
    namaBerkas: 'tipe.nusantara',
  });

  pastikanSama(diag.kategori, KategoriDiagnostik.TIPE, 'Kategori harus TIPE');
  pastikanSama(diag.kode, KodeGalat.TYP_KETIDAKCOCOKAN_TIPE, 'Kode harus TYP-001');
  pastikan(diag.pesan.includes('bilangan'), 'Pesan harus menjelaskan tipe bilangan');
});

uji('Transformasi Galat Resolusi Nama dengan Saran Simbol yang Mirip', () => {
  const kode = `program UjiNama
mulai
    tampilkann("Halo Dunia")
selesai`;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const checker = new PemeriksaTipe();
  const galatList = checker.periksa(ast);
  pastikan(galatList.length > 0, 'Pemeriksa tipe harus mendeteksi fungsi tidak ditemukan');
  const tertangkap = galatList[0];
  pastikan(tertangkap instanceof GalatTipe, 'Harus berupa GalatTipe');

  const diag = mesin.ubahKeDiagnostik(tertangkap, {
    kodeSumber: kode,
    namaBerkas: 'nama.nusantara',
    kandidatSimbol: ['tampilkan', 'masukan', 'panjang'],
  });

  pastikanSama(diag.kategori, KategoriDiagnostik.NAMA, 'Kategori harus NAMA');
  pastikanSama(diag.kode, KodeGalat.NAM_FUNGSI_TIDAK_DITEMUKAN, 'Kode harus NAM-002');
  pastikan(Boolean(diag.saran?.includes('tampilkan')), 'Harus menyarankan tampilkan');
});


// -----------------------------------------------------------------------------
// KELOMPOK 5: STACK TRACE, FUNCTION FRAMES, & DETEKSI KONTEKS PAKET
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 5: Stack Trace, Function Frames, & Konteks Paket ---');

uji('Menghasilkan Stack Trace multi-fungsi saat runtime error (Pembagian dengan Nol)', () => {
  const kode = `fungsi bagi(a : bilangan, b : bilangan) : bilangan
mulai
    kembalikan a / b
selesai

fungsi kalkulasi(n : bilangan) : bilangan
mulai
    kembalikan bagi(n, 0)
selesai

program UjiStackTrace
mulai
    hasil : bilangan = kalkulasi(100)
selesai`;

  let tertangkap: any;
  try {
    const parser = new Parser(kode);
    const ast = parser.parse();
    const buffer = new PenulisOutputBuffer();
    const interpreter = new Interpreter(buffer);
    interpreter.interpretasikan(ast);
  } catch (e) {
    tertangkap = e;
  }

  pastikan(tertangkap instanceof GalatRuntime, 'Harus melempar GalatRuntime');
  pastikanSama(tertangkap.jenis, JenisGalatRuntime.PEMBAGIAN_NOL, 'Jenis harus PEMBAGIAN_NOL');
  pastikan(tertangkap.jejakTumpukan.length >= 2, 'Harus memuat minimal 2 frame pemanggilan');

  const diag = mesin.ubahKeDiagnostik(tertangkap, {
    kodeSumber: kode,
    namaBerkas: 'utama.nusantara',
  });

  pastikanSama(diag.kode, KodeGalat.RUN_PEMBAGIAN_NOL, 'Kode diagnostik harus RUN-001');
  pastikan(diag.jejakTumpukan !== undefined && diag.jejakTumpukan.length >= 2, 'Jejak tumpukan diagnostik harus terbentuk');

  const namaFungsiList = diag.jejakTumpukan!.map(f => f.namaFungsi);
  pastikan(namaFungsiList.some(n => n.includes('bagi')), 'Harus memuat frame bagi');
  pastikan(namaFungsiList.some(n => n.includes('kalkulasi')), 'Harus memuat frame kalkulasi');
});

uji('Mendeteksi nama paket eksternal dari jalur berkas dependensi (deteksiKonteksPaket)', () => {
  const jalur1 = '/proyek/.nusantara/paket/matematika/src/aljabar.nusantara';
  const info1 = deteksiKonteksPaket(jalur1);
  pastikan(info1 !== undefined, 'Harus mendeteksi paket');
  pastikanSama(info1!.namaPaket, 'matematika', 'Nama paket harus matematika');

  const jalur2 = '/katalog_paket/geometri/modul.nusantara';
  const info2 = deteksiKonteksPaket(jalur2);
  pastikan(info2 !== undefined, 'Harus mendeteksi dari katalog_paket');
  pastikanSama(info2!.namaPaket, 'geometri', 'Nama paket harus geometri');

  const jalurBiasa = '/proyek/src/utama.nusantara';
  const infoBiasa = deteksiKonteksPaket(jalurBiasa);
  pastikanSama(infoBiasa, undefined, 'Berkas proyek biasa tidak memiliki paket luar');
});

uji('Perlindungan batas kedalaman rekursi (Stack Overflow) menghasilkan RUN-003', () => {
  const kode = `fungsi loopTakHenti(x : bilangan) : bilangan
mulai
    kembalikan loopTakHenti(x + 1)
selesai

program RekursiTanpaBatas
mulai
    loopTakHenti(1)
selesai`;

  let tertangkap: any;
  try {
    const parser = new Parser(kode);
    const ast = parser.parse();
    const buffer = new PenulisOutputBuffer();
    const interpreter = new Interpreter(buffer);
    interpreter.interpretasikan(ast);
  } catch (e) {
    tertangkap = e;
  }

  pastikan(tertangkap instanceof GalatRuntime, 'Harus melempar GalatRuntime untuk batas rekursi');
  pastikanSama(tertangkap.jenis, JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI, 'Jenis harus batas iterasi');

  const diag = mesin.ubahKeDiagnostik(tertangkap);
  pastikanSama(diag.kode, KodeGalat.RUN_BATAS_ITERASI_TERLAMPAUI, 'Kode harus RUN-003');
});



// -----------------------------------------------------------------------------
// KELOMPOK 6: FORMAT OUTPUT TEKS TERMINAL & JSON TERSTRUKTUR
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 6: Format Output Teks Terminal & JSON Terstruktur ---');

uji('Format teks ramah manusia Bahasa Indonesia memuat seluruh bagian resmi', () => {
  const diag: Diagnostik = {
    tingkat: TingkatDiagnostik.KESALAHAN,
    kategori: KategoriDiagnostik.TIPE,
    kode: KodeGalat.TYP_KETIDAKCOCOKAN_TIPE,
    pesan: "parameter kedua fungsi 'tambah' membutuhkan bilangan, tetapi menerima teks.",
    lokasi: {
      berkas: 'utama.nusantara',
      baris: 12,
      kolom: 15,
      panjang: 4,
    },
    potonganKode: {
      nomorBaris: 12,
      teksBaris: 'hasil = tambah(10, "20")',
      kolomAwal: 20,
      panjang: 4,
      teksCaret: '                   ^^^^',
    },
    saran: 'Gunakan nilai bertipe bilangan.',
    jejakTumpukan: [
      {
        namaFungsi: 'tambah',
        lokasi: { berkas: 'matematika.nusantara', baris: 5, kolom: 1 },
      },
      {
        namaFungsi: 'utama',
        lokasi: { berkas: 'utama.nusantara', baris: 12, kolom: 15 },
      },
    ],
  };

  const teks = formatDiagnostik(diag, { warna: false, tampilkanJejak: true });
  pastikan(teks.includes('Kesalahan tipe [NUS-TYP-001]'), 'Header harus memuat kategori dan kode');
  pastikan(teks.includes('Lokasi: utama.nusantara:12:15'), 'Harus memuat lokasi berkas:baris:kolom');
  pastikan(teks.includes('12 | hasil = tambah(10, "20")'), 'Harus memuat baris kode sumber');
  pastikan(teks.includes('^^^^'), 'Harus memuat caret penunjuk');
  pastikan(teks.includes('Masalah:'), 'Harus memuat label Masalah');
  pastikan(teks.includes('Saran:'), 'Harus memuat label Saran');
  pastikan(teks.includes('Jejak Pemanggilan (Stack Trace):'), 'Harus memuat label Jejak Pemanggilan');
});

uji('Format JSON terstruktur memuat model diagnostik lengkap untuk IDE/LSP', () => {
  const diag: Diagnostik = {
    tingkat: TingkatDiagnostik.KESALAHAN,
    kategori: KategoriDiagnostik.RUNTIME,
    kode: KodeGalat.RUN_PEMBAGIAN_NOL,
    pesan: 'Pembagian dengan angka nol.',
    lokasi: {
      berkas: 'kalkulator.nusantara',
      baris: 8,
      kolom: 12,
    },
  };

  const jsonStr = formatDiagnostikKeJSON(diag);
  const parsed = JSON.parse(jsonStr);

  pastikanSama(parsed.kode, 'NUS-RUN-001', 'Kode JSON harus sesuai');
  pastikanSama(parsed.kategori, 'RUNTIME', 'Kategori JSON harus RUNTIME');
  pastikanSama(parsed.lokasi.baris, 8, 'Baris JSON harus 8');
  pastikanSama(parsed.lokasi.kolom, 12, 'Kolom JSON harus 12');
});

// -----------------------------------------------------------------------------
// KELOMPOK 7: INTEGRASI COMMAND-LINE INTERFACE (CLI)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 7: Integrasi Command-Line Interface (CLI) ---');

uji('CLI jalankan mengeksekusi program sukses dengan kode status 0', () => {
  const fs = new PembacaBerkasMemori();
  fs.tulisBerkas(
    '/proyek/aplikasi.nusantara',
    `program Halo
mulai
    tampilkan("Halo dari CLI!")
selesai`
  );

  let outputLog = '';
  const cli = new NusantaraCLI({
    pembaca: fs,
    penulisLog: (pesan) => { outputLog += pesan + '\n'; },
  });

  const status = cli.jalankan(['jalankan', '/proyek/aplikasi.nusantara']);
  pastikanSama(status, 0, 'Status harus 0 untuk program valid');
});

uji('CLI jalankan melaporkan kesalahan sintaks dengan diagnostik lengkap ke stderr', () => {
  const fs = new PembacaBerkasMemori();
  fs.tulisBerkas(
    '/proyek/rusak.nusantara',
    `program Rusak
mulai
    angka = 10 + 
selesai`
  );

  let outputErr = '';
  const cli = new NusantaraCLI({
    pembaca: fs,
    penulisGalat: (pesan) => { outputErr += pesan + '\n'; },
  });

  const status = cli.jalankan(['jalankan', '/proyek/rusak.nusantara']);
  pastikanSama(status, 1, 'Status harus 1 untuk program yang error');
  pastikan(outputErr.includes('Kesalahan sintaks') || outputErr.includes('NUS-PAR-'), 'Harus menyajikan kesalahan sintaks terstruktur');
  pastikan(outputErr.includes('rusak.nusantara'), 'Harus menyertakan nama berkas');
});

uji('CLI opsi --json menghasilkan keluaran galat berformat JSON murni ke stderr', () => {
  const fs = new PembacaBerkasMemori();
  fs.tulisBerkas(
    '/proyek/tipe_salah.nusantara',
    `program UjiJSON
mulai
    x : bilangan = "teks"
selesai`
  );

  let outputErr = '';
  const cli = new NusantaraCLI({
    pembaca: fs,
    penulisGalat: (pesan) => { outputErr += pesan; },
  });

  const status = cli.jalankan(['jalankan', '/proyek/tipe_salah.nusantara', '--json']);
  pastikanSama(status, 1, 'Status harus 1 saat galat');

  const parsed = JSON.parse(outputErr);
  pastikanSama(parsed.kategori, 'TIPE', 'JSON output kategori harus TIPE');
  pastikanSama(parsed.kode, 'NUS-TYP-001', 'JSON output kode harus NUS-TYP-001');
});

uji('CLI perintah periksa memvalidasi sintaks dan tipe tanpa mengeksekusi', () => {
  const fs = new PembacaBerkasMemori();
  fs.tulisBerkas(
    '/proyek/valid.nusantara',
    `program UjiPeriksa
mulai
    a : bilangan = 100
selesai`
  );

  let log = '';
  const cli = new NusantaraCLI({
    pembaca: fs,
    penulisLog: (m) => { log += m + '\n'; },
  });

  const status = cli.jalankan(['periksa', '/proyek/valid.nusantara']);
  pastikanSama(status, 0, 'Periksa harus berhasil');
  pastikan(log.includes('[✓ VALID]'), 'Harus memuat konfirmasi validasi sukses');
});

// -----------------------------------------------------------------------------
// REKAPITULASI HASIL PENGUJIAN
// -----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`TOTAL UJI: ${totalUji} | BERHASIL: ${ujiBerhasil} | GAGAL: ${ujiGagal}`);
console.log('======================================================');

if (ujiGagal > 0) {
  console.error('\n[GAGAL] Sebagian pengujian Phase 18 belum memenuhi syarat.');
  process.exit(1);
} else {
  console.log('\n[SUKSES] Seluruh pengujian Sistem Error & Debugging NUSANTARA (Phase 18) BERHASIL 100%!');
}
