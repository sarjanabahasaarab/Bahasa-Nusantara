/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Parser } from '../../src/parser/parser';
import { JenisNodeAST } from '../../src/parser/ast';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { PemeriksaTipe } from '../../src/tipe/pemeriksaTipe';
import {
  PembacaBerkasMemori,
  ResolverModul,
  PemuatModul,
  GalatModul,
  JenisGalatModul,
  StatusPemuatanModul,
} from '../../src/modul';
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

function mengandung(teks: string, bagian: string, pesan?: string) {
  if (!teks.includes(bagian)) {
    throw new Error(pesan || `Teks '${teks}' tidak mengandung '${bagian}'`);
  }
}

console.log('=============================================================================');
console.log('PENGUJIAN KOMPREHENSIF SISTEM MODUL BAHASA NUSANTARA (Phase 15)');
console.log('Target Milestone: v0.15.0');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// KELOMPOK 1: RESOLVER MODUL & KEAMANAN JALUR
// -----------------------------------------------------------------------------
console.log('--- Kelompok 1: Resolver Modul & Keamanan Direktori ---');

uji('Resolver menemukan berkas modul berdasarkan nama identifier', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/matematika.nusantara': 'modul matematika',
  });
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const jalur = resolver.selesaikan('matematika');
  samaDengan(jalur, '/proyek/matematika.nusantara');
});

uji('Resolver menemukan berkas modul dengan jalur relatif eksplisit ./', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/utilitas/teks.nusantara': 'modul teks',
  });
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const jalur = resolver.selesaikan('./utilitas/teks');
  samaDengan(jalur, '/proyek/utilitas/teks.nusantara');
});

uji('Resolver menolak nama modul kosong dengan galat NAMA_MODUL_TIDAK_VALID', () => {
  const fs = new PembacaBerkasMemori();
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  let tertangkap = false;
  try {
    resolver.selesaikan('   ');
  } catch (err: any) {
    if (err instanceof GalatModul && err.jenis === JenisGalatModul.NAMA_MODUL_TIDAK_VALID) {
      tertangkap = true;
    }
  }
  samaDengan(tertangkap, true, 'Harus melemparkan GalatModul NAMA_MODUL_TIDAK_VALID');
});

uji('Resolver melempar MODUL_TIDAK_DITEMUKAN dengan daftar lokasi pencarian yang diperiksa', () => {
  const fs = new PembacaBerkasMemori();
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  let pesanGalat = '';
  try {
    resolver.selesaikan('fisika');
  } catch (err: any) {
    pesanGalat = err.message;
  }
  mengandung(pesanGalat, "modul 'fisika' tidak ditemukan");
  mengandung(pesanGalat, 'Lokasi pencarian yang diperiksa:');
  mengandung(pesanGalat, '/proyek/fisika.nusantara');
});

uji('Resolver mendeteksi dan menggagalkan serangan Path Traversal (../)', () => {
  const fs = new PembacaBerkasMemori({
    '/rahasia.nusantara': 'modul rahasia',
    '/proyek/utama.nusantara': 'program utama',
  });
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  let tertangkap = false;
  let pesanGalat = '';
  try {
    resolver.selesaikan('../rahasia');
  } catch (err: any) {
    if (err instanceof GalatModul && err.jenis === JenisGalatModul.JALUR_TIDAK_AMAN) {
      tertangkap = true;
      pesanGalat = err.message;
    }
  }
  samaDengan(tertangkap, true, 'Harus menolak path traversal keluar dari direktori akar');
  mengandung(pesanGalat, 'Pelanggaran keamanan jalur direktori');
});

// -----------------------------------------------------------------------------
// KELOMPOK 2: PARSER & STRUKTUR AST MODUL
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 2: Parser & Struktur AST Sistem Modul ---');

uji('Parser mengenali deklarasi modul (modul NamaModul)', () => {
  const kode = `
  modul matematika
  ekspor fungsi tambah(a : bilangan, b : bilangan) : bilangan
  mulai
      kembalikan a + b
  selesai
  `;
  const parser = new Parser(kode);
  const ast = parser.parse();
  samaDengan(ast.deklarasiModul?.namaModul, 'matematika');
  samaDengan(ast.daftarEkspor.length, 1);
  const exp = ast.daftarEkspor[0];
  samaDengan(exp.jenis, JenisNodeAST.PERNYATAAN_EKSPOR);
  samaDengan(exp.deklarasi?.jenis, JenisNodeAST.DEKLARASI_FUNGSI);
});

uji('Parser mengenali instruksi gunakan modul dan alias sebagai', () => {
  const kode = `
  program Aplikasi
  gunakan matematika sebagai mtk
  gunakan teks
  mulai
      tampilkan(mtk.tambah(1, 2))
  selesai
  `;
  const parser = new Parser(kode);
  const ast = parser.parse();
  samaDengan(ast.daftarImpor.length, 2);
  samaDengan(ast.daftarImpor[0].sumberModul, 'matematika');
  samaDengan(ast.daftarImpor[0].aliasModul, 'mtk');
  samaDengan(ast.daftarImpor[1].sumberModul, 'teks');
  samaDengan(ast.daftarImpor[1].aliasModul, undefined);
});

uji('Parser mengenali destrukturisasi impor (impor { a, b } dari modul)', () => {
  const kode = `
  program Aplikasi
  impor { tambah, kali } dari matematika
  mulai
      tampilkan(tambah(5, 5))
  selesai
  `;
  const parser = new Parser(kode);
  const ast = parser.parse();
  samaDengan(ast.daftarImpor.length, 1);
  const imp = ast.daftarImpor[0];
  samaDengan(imp.sumberModul, 'matematika');
  samaDengan(imp.itemImpor?.length, 2);
  samaDengan(imp.itemImpor?.[0].nama, 'tambah');
  samaDengan(imp.itemImpor?.[1].nama, 'kali');
});

uji('Parser menghasilkan NodeAksesAnggota dan pemanggilan beranggota modul.fungsi()', () => {
  const kode = `
  program UjiAkses
  mulai
      x : bilangan = modulA.nilaiKonstanta
      modulA.jalankan(x)
  selesai
  `;
  const parser = new Parser(kode);
  const ast = parser.parse();
  const stmt1 = ast.tubuhUtama[0] as any;
  samaDengan(stmt1.nilaiAwal.jenis, JenisNodeAST.AKSES_ANGGOTA);
  samaDengan(stmt1.nilaiAwal.anggota, 'nilaiKonstanta');

  const stmt2 = ast.tubuhUtama[1] as any;
  samaDengan(stmt2.ekspresi.jenis, JenisNodeAST.PEMANGGILAN_FUNGSI);
  samaDengan(stmt2.ekspresi.namaFungsi, 'jalankan');
  samaDengan(stmt2.ekspresi.target.jenis, JenisNodeAST.PENGIDENTIFIKASI);
  samaDengan(stmt2.ekspresi.target.nama, 'modulA');
});

// -----------------------------------------------------------------------------
// KELOMPOK 3: VALIDASI SISTEM TIPE (TYPE SYSTEM)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 3: Validasi Sistem Tipe (Type System) ---');

uji('Pemeriksa tipe memvalidasi tipe argumen pemanggilan fungsi modul', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/matematika.nusantara': `
      modul matematika
      ekspor fungsi tambah(a : bilangan, b : bilangan) : bilangan
      mulai
          kembalikan a + b
      selesai
    `,
    '/proyek/utama.nusantara': `
      program Utama
      gunakan matematika
      mulai
          hasil : bilangan = matematika.tambah(10, 20)
      selesai
    `,
  });
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const pemeriksa = new PemeriksaTipe(pemuat);

  const astUtama = new Parser(fs.baca('/proyek/utama.nusantara')).parse();
  const galat = pemeriksa.periksa(astUtama, '/proyek');
  samaDengan(galat.length, 0, 'Harus valid tanpa galat tipe');
});

uji('Pemeriksa tipe menolak tipe argumen salah pada pemanggilan fungsi modul dengan pesan spesifik', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/matematika.nusantara': `
      modul matematika
      ekspor fungsi tambah(a : bilangan, b : bilangan) : bilangan
      mulai
          kembalikan a + b
      selesai
    `,
    '/proyek/salah.nusantara': `
      program Salah
      gunakan matematika
      mulai
          hasil : bilangan = matematika.tambah(10, "teks_salah")
      selesai
    `,
  });
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const pemeriksa = new PemeriksaTipe(pemuat);

  const ast = new Parser(fs.baca('/proyek/salah.nusantara')).parse();
  const galat = pemeriksa.periksa(ast, '/proyek');
  samaDengan(galat.length > 0, true, 'Harus mendeteksi ketidakcocokan tipe argumen');
  mengandung(galat[0].message, "argumen kedua pada 'matematika.tambah' harus bertipe bilangan");
});

uji('Pemeriksa tipe menolak akses ke fungsi atau variabel internal modul', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/rahasia.nusantara': `
      modul rahasia
      fungsi kodeRahasia() : bilangan
      mulai
          kembalikan 12345
      selesai
    `,
    '/proyek/curang.nusantara': `
      program Curang
      gunakan rahasia
      mulai
          tampilkan(rahasia.kodeRahasia())
      selesai
    `,
  });
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const pemeriksa = new PemeriksaTipe(pemuat);

  const ast = new Parser(fs.baca('/proyek/curang.nusantara')).parse();
  const galat = pemeriksa.periksa(ast, '/proyek');
  samaDengan(galat.length > 0, true, 'Harus menolak akses simbol internal');
  mengandung(galat[0].message, "bersifat internal pada modul 'rahasia' dan tidak diekspor");
});

// -----------------------------------------------------------------------------
// KELOMPOK 4: EKSEKUSI RUNTIME INTERPRETER & PENGGUNAAN MODUL
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 4: Eksekusi Runtime Interpreter & Penggunaan Modul ---');

uji('Eksekusi program utama menggunakan modul matematika', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/matematika.nusantara': `
      modul matematika
      ekspor fungsi tambah(a : bilangan, b : bilangan) : bilangan
      mulai
          kembalikan a + b
      selesai
      ekspor fungsi kali(a : bilangan, b : bilangan) : bilangan
      mulai
          kembalikan a * b
      selesai
    `,
    '/proyek/utama.nusantara': `
      program Utama
      gunakan matematika
      mulai
          tampilkan("Hasil tambah:", matematika.tambah(10, 20))
          tampilkan("Hasil kali:", matematika.kali(6, 7))
      selesai
    `,
  });
  const buffer = new PenulisOutputBuffer();
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const interpreter = new Interpreter(buffer, {
    pemuatModul: pemuat,
    resolverModul: resolver,
    pembacaBerkas: fs,
    direktoriBasis: '/proyek',
  });

  interpreter.jalankanKode(fs.baca('/proyek/utama.nusantara'), '/proyek');
  const out = buffer.dapatkanSeluruhTeks();
  samaDengan(out[0], 'Hasil tambah: 30');
  samaDengan(out[1], 'Hasil kali: 42');
});

uji('Eksekusi modul dengan alias namespace (sebagai)', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/matematika.nusantara': `
      modul matematika
      ekspor fungsi kuadrat(n : bilangan) : bilangan
      mulai
          kembalikan n * n
      selesai
    `,
    '/proyek/utama.nusantara': `
      program Utama
      gunakan matematika sebagai mtk
      mulai
          tampilkan("Kuadrat:", mtk.kuadrat(8))
      selesai
    `,
  });
  const buffer = new PenulisOutputBuffer();
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const interpreter = new Interpreter(buffer, {
    pemuatModul: pemuat,
    resolverModul: resolver,
    pembacaBerkas: fs,
    direktoriBasis: '/proyek',
  });

  interpreter.jalankanKode(fs.baca('/proyek/utama.nusantara'), '/proyek');
  const out = buffer.dapatkanSeluruhTeks();
  samaDengan(out[0], 'Kuadrat: 64');
});

uji('Eksekusi destrukturisasi impor (impor { fungsi } dari modul)', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/teks.nusantara': `
      modul teks
      ekspor fungsi kapital(s : teks) : teks
      mulai
          kembalikan "KAPITAL_" + s
      selesai
    `,
    '/proyek/utama.nusantara': `
      program Utama
      impor { kapital } dari teks
      mulai
          tampilkan(kapital("nusantara"))
      selesai
    `,
  });
  const buffer = new PenulisOutputBuffer();
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const interpreter = new Interpreter(buffer, {
    pemuatModul: pemuat,
    resolverModul: resolver,
    pembacaBerkas: fs,
    direktoriBasis: '/proyek',
  });

  interpreter.jalankanKode(fs.baca('/proyek/utama.nusantara'), '/proyek');
  const out = buffer.dapatkanSeluruhTeks();
  samaDengan(out[0], 'KAPITAL_nusantara');
});

uji('Eksekusi modul bertingkat (modul A menggunakan modul B)', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/dasar.nusantara': `
      modul dasar
      ekspor fungsi kaliDua(x : bilangan) : bilangan
      mulai
          kembalikan x * 2
      selesai
    `,
    '/proyek/lanjutan.nusantara': `
      modul lanjutan
      gunakan dasar
      ekspor fungsi kaliEmpat(x : bilangan) : bilangan
      mulai
          kembalikan dasar.kaliDua(dasar.kaliDua(x))
      selesai
    `,
    '/proyek/utama.nusantara': `
      program Utama
      gunakan lanjutan
      mulai
          tampilkan("Hasil:", lanjutan.kaliEmpat(5))
      selesai
    `,
  });
  const buffer = new PenulisOutputBuffer();
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const interpreter = new Interpreter(buffer, {
    pemuatModul: pemuat,
    resolverModul: resolver,
    pembacaBerkas: fs,
    direktoriBasis: '/proyek',
  });

  interpreter.jalankanKode(fs.baca('/proyek/utama.nusantara'), '/proyek');
  const out = buffer.dapatkanSeluruhTeks();
  samaDengan(out[0], 'Hasil: 20');
});

uji('Eksekusi modul yang mengekspor struktur data daftar dan peta', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/sumber_data.nusantara': `
      modul sumber_data
      ekspor fungsi dapatkanDaftar() : daftar
      mulai
          kembalikan [10, 20, 30]
      selesai
      ekspor fungsi dapatkanPeta() : peta
      mulai
          kembalikan {"nama": "Nusantara", "versi": "0.15.0"}
      selesai
    `,
    '/proyek/utama.nusantara': `
      program Utama
      gunakan sumber_data
      mulai
          d : daftar = sumber_data.dapatkanDaftar()
          p : peta = sumber_data.dapatkanPeta()
          tampilkan("Elemen kedua:", d[1])
          tampilkan("Nama:", p["nama"])
      selesai
    `,
  });
  const buffer = new PenulisOutputBuffer();
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const interpreter = new Interpreter(buffer, {
    pemuatModul: pemuat,
    resolverModul: resolver,
    pembacaBerkas: fs,
    direktoriBasis: '/proyek',
  });

  interpreter.jalankanKode(fs.baca('/proyek/utama.nusantara'), '/proyek');
  const out = buffer.dapatkanSeluruhTeks();
  samaDengan(out[0], 'Elemen kedua: 20');
  samaDengan(out[1], 'Nama: Nusantara');
});

// -----------------------------------------------------------------------------
// KELOMPOK 5: CACHE & PEMUATAN TUNGGAL (SINGLETON CACHE)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 5: Cache Modul & Pemuatan Tunggal ---');

uji('Modul dimuat satu kali dan status berubah menjadi SUDAH_DIMUAT', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/matematika.nusantara': `
      modul matematika
      ekspor fungsi halo() : teks
      mulai
          kembalikan "halo"
      selesai
    `,
  });
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);

  const cat1 = pemuat.muatModul('matematika');
  samaDengan(cat1.status, StatusPemuatanModul.SUDAH_DIMUAT);

  // Pemuatan kedua harus mengembalikan referensi objek cache yang identik
  const cat2 = pemuat.muatModul('matematika');
  samaDengan(cat1 === cat2, true, 'Cache harus mengembalikan catatan objek modul yang sama');
});

// -----------------------------------------------------------------------------
// KELOMPOK 6: DETEKSI KETERGANTUNGAN MELINGKAR (CIRCULAR DEPENDENCY)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 6: Deteksi Ketergantungan Melingkar (Circular Dependency) ---');

uji('Deteksi siklus modul A -> B -> A dengan pesan kesalahan terstruktur', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/modul_a.nusantara': `
      modul modul_a
      gunakan modul_b
    `,
    '/proyek/modul_b.nusantara': `
      modul modul_b
      gunakan modul_a
    `,
    '/proyek/utama.nusantara': `
      program Utama
      gunakan modul_a
      mulai
          tampilkan("Selesai")
      selesai
    `,
  });
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);

  let tertangkap = false;
  let pesanGalat = '';
  try {
    pemuat.muatModul('modul_a');
  } catch (err: any) {
    if (err instanceof GalatModul && err.jenis === JenisGalatModul.KETERGANTUNGAN_MELINGKAR) {
      tertangkap = true;
      pesanGalat = err.message;
    }
  }
  samaDengan(tertangkap, true, 'Harus mendeteksi ketergantungan melingkar');
  mengandung(pesanGalat, 'terdeteksi ketergantungan melingkar:');
  mengandung(pesanGalat, 'modul_a\n→ modul_b\n→ modul_a');
});

// -----------------------------------------------------------------------------
// KELOMPOK 7: KONTEKS KESALAHAN RUNTIME DALAM MODUL (ERROR CONTEXT)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 7: Konteks Kesalahan Runtime dalam Modul ---');

uji('Menyajikan informasi modul, baris, dan kolom saat terjadi error pembagian dengan nol di modul', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/matematika.nusantara': `modul matematika

ekspor fungsi bagi(a : bilangan, b : bilangan) : bilangan
mulai
    kembalikan a / b
selesai`,
    '/proyek/utama.nusantara': `program Utama
gunakan matematika
mulai
    hasil : bilangan = matematika.bagi(10, 0)
selesai`,
  });
  const buffer = new PenulisOutputBuffer();
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const interpreter = new Interpreter(buffer, {
    pemuatModul: pemuat,
    resolverModul: resolver,
    pembacaBerkas: fs,
    direktoriBasis: '/proyek',
  });

  let pesanGalat = '';
  try {
    interpreter.jalankanKode(fs.baca('/proyek/utama.nusantara'), '/proyek');
  } catch (err: any) {
    pesanGalat = err.message;
  }

  mengandung(pesanGalat, 'Kesalahan runtime:');
  mengandung(pesanGalat, 'Modul: matematika.nusantara');
  mengandung(pesanGalat, 'Baris: 5');
  mengandung(pesanGalat, 'pembagian dengan nol tidak diperbolehkan');
});

// -----------------------------------------------------------------------------
// KELOMPOK 8: PROGRAM INTEGRASI CONTOH RESMI
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 8: Program Integrasi Penuh Contoh Resmi ---');

uji('Eksekusi Program contoh/07_modul.nusantara dari filesystem memori', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/contoh_matematika.nusantara': `
      modul contoh_matematika
      ekspor fungsi tambah(a : bilangan, b : bilangan) : bilangan
      mulai
          kembalikan a + b
      selesai
    `,
    '/proyek/contoh_teks.nusantara': `
      modul contoh_teks
      ekspor fungsi beriSambutan(nama : teks) : teks
      mulai
          kembalikan "Halo, " + nama + "!"
      selesai
    `,
    '/proyek/07_modul.nusantara': `
      program ProgramUtamaModul
      gunakan contoh_matematika
      gunakan contoh_teks
      mulai
          hasilTambah : bilangan = contoh_matematika.tambah(15, 25)
          tampilkan("Hasil tambah:", hasilTambah)
          pesan : teks = contoh_teks.beriSambutan("Nusantara")
          tampilkan(pesan)
      selesai
    `,
  });
  const buffer = new PenulisOutputBuffer();
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const interpreter = new Interpreter(buffer, {
    pemuatModul: pemuat,
    resolverModul: resolver,
    pembacaBerkas: fs,
    direktoriBasis: '/proyek',
  });

  interpreter.jalankanKode(fs.baca('/proyek/07_modul.nusantara'), '/proyek');
  const out = buffer.dapatkanSeluruhTeks();
  samaDengan(out[0], 'Hasil tambah: 40');
  samaDengan(out[1], 'Halo, Nusantara!');
});

// -----------------------------------------------------------------------------
// KELOMPOK 9: SIKLUS DEPENDENSI MULTI-TINGKAT (A -> B -> C -> A)
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 9: Ketergantungan Melingkar Tiga Tingkat (A -> B -> C -> A) ---');

uji('Deteksi siklus ketergantungan 3 tingkat (modul_x -> modul_y -> modul_z -> modul_x)', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/modul_x.nusantara': 'modul modul_x\ngunakan modul_y',
    '/proyek/modul_y.nusantara': 'modul modul_y\ngunakan modul_z',
    '/proyek/modul_z.nusantara': 'modul modul_z\ngunakan modul_x',
  });
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);

  let tertangkap = false;
  let rantai = '';
  try {
    pemuat.muatModul('modul_x');
  } catch (err: any) {
    if (err instanceof GalatModul && err.jenis === JenisGalatModul.KETERGANTUNGAN_MELINGKAR) {
      tertangkap = true;
      rantai = err.message;
    }
  }
  samaDengan(tertangkap, true, 'Harus mendeteksi siklus 3 tingkat');
  mengandung(rantai, 'modul_x\n→ modul_y\n→ modul_z\n→ modul_x');
});

// -----------------------------------------------------------------------------
// KELOMPOK 10: JEJAK TUMPUKAN ANTAR-MODUL & EKSPOR TETAP
// -----------------------------------------------------------------------------
console.log('\n--- Kelompok 10: Jejak Tumpukan Antar-Modul & Ekspor Tetap ---');

uji('Eksekusi membaca konstanta tetap yang diekspor modul', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/konstanta.nusantara': `
      modul konstanta
      ekspor tetap VERSI : teks = "1.0.0-alpha"
    `,
    '/proyek/utama.nusantara': `
      program Utama
      gunakan konstanta
      mulai
          tampilkan("Versi:", konstanta.VERSI)
      selesai
    `,
  });
  const buffer = new PenulisOutputBuffer();
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const interpreter = new Interpreter(buffer, {
    pemuatModul: pemuat,
    resolverModul: resolver,
    pembacaBerkas: fs,
    direktoriBasis: '/proyek',
  });

  interpreter.jalankanKode(fs.baca('/proyek/utama.nusantara'), '/proyek');
  const out = buffer.dapatkanSeluruhTeks();
  samaDengan(out[0], 'Versi: 1.0.0-alpha');
});

uji('Jejak tumpukan pemanggilan (Stack Trace) mempertahankan riwayat konteks modul pemanggil', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/kalkulator.nusantara': `modul kalkulator

ekspor fungsi hitung(x : bilangan, y : bilangan) : bilangan
mulai
    kembalikan x / y
selesai`,
    '/proyek/layanan.nusantara': `modul layanan
gunakan kalkulator

ekspor fungsi proses(a : bilangan) : bilangan
mulai
    kembalikan kalkulator.hitung(a, 0)
selesai`,
    '/proyek/utama.nusantara': `program Utama
gunakan layanan
mulai
    layanan.proses(50)
selesai`,
  });
  const buffer = new PenulisOutputBuffer();
  const resolver = new ResolverModul(fs, { direktoriAkarProyek: '/proyek' });
  const pemuat = new PemuatModul(resolver, fs);
  const interpreter = new Interpreter(buffer, {
    pemuatModul: pemuat,
    resolverModul: resolver,
    pembacaBerkas: fs,
    direktoriBasis: '/proyek',
  });

  let jejakLengkap = '';
  try {
    interpreter.jalankanKode(fs.baca('/proyek/utama.nusantara'), '/proyek');
  } catch (err: any) {
    if (err instanceof GalatRuntime) {
      jejakLengkap = err.cetakJejakLengkap();
    }
  }

  mengandung(jejakLengkap, 'fungsi hitung');
  mengandung(jejakLengkap, 'fungsi proses');
  mengandung(jejakLengkap, 'program Utama');
});

// -----------------------------------------------------------------------------
// REKAPITULASI HASIL PENGUJIAN
// -----------------------------------------------------------------------------
console.log('\n-----------------------------------------------------------------------------');
const totalUji = daftarHasil.length;
const totalLulus = daftarHasil.filter(h => h.lulus).length;
const totalGagal = daftarHasil.filter(h => !h.lulus).length;

console.log(`Hasil Pengujian Sistem Modul: ${totalLulus} Uji LULUS, ${totalGagal} Uji GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (totalGagal > 0) {
  console.error(`STATUS: ${totalGagal} PENGUJIAN GAGAL DARI TOTAL ${totalUji} PENGUJIAN.`);
  process.exit(1);
} else {
  console.log('STATUS: SELURUH PENGUJIAN SISTEM MODUL NUSANTARA BERHASIL 100%.');
}
