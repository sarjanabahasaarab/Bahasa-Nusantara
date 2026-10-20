/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  uraiVersi,
  apakahVersiValid,
  bandingkanVersi,
  apakahKompatibel,
  validasiNamaPaket,
  periksaKeamananJalurLokal,
  GalatKeamananPaket,
  bacaManifest,
  tulisManifest,
  buatManifestAwal,
  GalatManifest,
  bacaLock,
  tulisLock,
  hitungChecksum,
  GrafDependensi,
  GalatKetergantunganMelingkar,
  GalatKonflikVersi,
  LocalRegistry,
  RemoteRegistry,
  PengelolaPaket,
  NusantaraCLI,
} from '../../src/paket';
import {
  PembacaBerkasMemori,
  ResolverModul,
  PemuatModul,
} from '../../src/modul';
import { Parser } from '../../src/parser/parser';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { PemeriksaTipe } from '../../src/tipe/pemeriksaTipe';

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
console.log('PENGUJIAN KOMPREHENSIF PACKAGE MANAGER NUSANTARA (Phase 16)');
console.log('Target Milestone: v0.16.0');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// KELOMPOK 1: PENGURAI & VALIDASI SEMANTIC VERSIONING (SemVer)
// -----------------------------------------------------------------------------
console.log('--- Kelompok 1: Semantic Versioning (SemVer) ---');

uji('Mengurai versi semantik standar (MAJOR.MINOR.PATCH)', () => {
  const v = uraiVersi('1.2.3');
  samaDengan(v.major, 1);
  samaDengan(v.minor, 2);
  samaDengan(v.patch, 3);
  samaDengan(v.mentah, '1.2.3');
});

uji('Mengurai versi dengan pra-rilis dan metadata build', () => {
  const v = uraiVersi('2.0.0-alpha.1+build.123');
  samaDengan(v.major, 2);
  samaDengan(v.minor, 0);
  samaDengan(v.patch, 0);
  samaDengan(v.praRilis, 'alpha.1');
  samaDengan(v.metadataBuild, 'build.123');
});

uji('Menolak format versi tidak sah dengan pesan Bahasa Indonesia', () => {
  let tertangkap = false;
  try {
    uraiVersi('v1.0');
  } catch (err: any) {
    tertangkap = true;
    mengandung(err.message, 'tidak valid');
    mengandung(err.message, 'Semantic Versioning');
  }
  samaDengan(tertangkap, true);
  samaDengan(apakahVersiValid('bukan-versi'), false);
});

uji('Membandingkan urutan versi (major, minor, patch, pra-rilis)', () => {
  const v1 = uraiVersi('1.0.0');
  const v2 = uraiVersi('1.1.0');
  const v3 = uraiVersi('1.1.1');
  const v4 = uraiVersi('2.0.0');
  const vPre = uraiVersi('2.0.0-rc.1');

  samaDengan(bandingkanVersi(v1, v2) < 0, true);
  samaDengan(bandingkanVersi(v2, v3) < 0, true);
  samaDengan(bandingkanVersi(v3, v4) < 0, true);
  samaDengan(bandingkanVersi(v1, v1), 0);
  samaDengan(bandingkanVersi(vPre, v4) < 0, true); // pra-rilis < rilis
});

uji('Evaluasi kompatibilitas versi (persis, caret ^, tilde ~, wildcard, rentang relasional)', () => {
  // Persis
  samaDengan(apakahKompatibel('1.2.3', '1.2.3'), true);
  samaDengan(apakahKompatibel('1.2.4', '1.2.3'), false);

  // Caret (^)
  samaDengan(apakahKompatibel('1.2.3', '^1.2.0'), true);
  samaDengan(apakahKompatibel('1.9.9', '^1.2.0'), true);
  samaDengan(apakahKompatibel('2.0.0', '^1.2.0'), false);
  samaDengan(apakahKompatibel('1.1.0', '^1.2.0'), false);
  // Caret 0.x
  samaDengan(apakahKompatibel('0.2.5', '^0.2.0'), true);
  samaDengan(apakahKompatibel('0.3.0', '^0.2.0'), false);

  // Tilde (~)
  samaDengan(apakahKompatibel('1.2.5', '~1.2.0'), true);
  samaDengan(apakahKompatibel('1.3.0', '~1.2.0'), false);

  // Wildcard & Rentang
  samaDengan(apakahKompatibel('1.8.0', '1.x'), true);
  samaDengan(apakahKompatibel('2.1.0', '1.x'), false);
  samaDengan(apakahKompatibel('1.5.0', '>=1.0.0 <2.0.0'), true);
  samaDengan(apakahKompatibel('2.0.0', '>=1.0.0 <2.0.0'), false);
  samaDengan(apakahKompatibel('3.0.0', '*'), true);
});

// -----------------------------------------------------------------------------
// KELOMPOK 2: KEAMANAN & SANITASI NAMA/JALUR PAKET
// -----------------------------------------------------------------------------
console.log('--- Kelompok 2: Keamanan & Sanitasi Jalur ---');

uji('Menerima nama paket yang sah sesuai konvensi', () => {
  validasiNamaPaket('matematika');
  validasiNamaPaket('kalkulator_ilmiah');
  validasiNamaPaket('proyek-baru-123');
});

uji('Menolak nama paket dengan spasi atau whitespace', () => {
  let tertangkap = false;
  try {
    validasiNamaPaket('nama dengan spasi');
  } catch (err: any) {
    tertangkap = true;
    samaDengan(err instanceof GalatKeamananPaket, true);
    mengandung(err.message, 'spasi atau karakter whitespace');
  }
  samaDengan(tertangkap, true);
});

uji('Menolak percobaan path traversal pada nama paket (../, /, \\)', () => {
  let tertangkap = false;
  try {
    validasiNamaPaket('../paket-bahaya');
  } catch (err: any) {
    tertangkap = true;
    samaDengan(err instanceof GalatKeamananPaket, true);
    mengandung(err.message, 'path traversal');
  }
  samaDengan(tertangkap, true);
});

uji('Mencegah eskalasi direktori pada pemeriksaan jalur paket lokal', () => {
  const fs = new PembacaBerkasMemori();
  let tertangkap = false;
  try {
    periksaKeamananJalurLokal(fs, '../../../../../../../../../../../../luar', '/proyek');
  } catch (err: any) {
    tertangkap = true;
    samaDengan(err instanceof GalatKeamananPaket, true);
    mengandung(err.message, 'path traversal berlebih');
  }
  samaDengan(tertangkap, true);
});

// -----------------------------------------------------------------------------
// KELOMPOK 3: BERKAS MANIFEST (nusantara.toml)
// -----------------------------------------------------------------------------
console.log('--- Kelompok 3: Berkas Manifest (nusantara.toml) ---');

uji('Mengurai berkas nusantara.toml yang valid dengan metadata lengkap', () => {
  const toml = `
[nusantara]
nama = "kalkulator"
versi = "1.0.0"
deskripsi = "Pustaka kalkulator ilmiah Nusantara"
lisensi = "MIT"
penulis = "Tim Nusantara"

[dependensi]
matematika = "1.2.0"
teks = "^2.0.0"
utilitas = { path = "../utilitas" }
`;
  const m = bacaManifest(toml);
  samaDengan(m.nusantara.nama, 'kalkulator');
  samaDengan(m.nusantara.versi, '1.0.0');
  samaDengan(m.nusantara.deskripsi, 'Pustaka kalkulator ilmiah Nusantara');
  samaDengan(m.nusantara.lisensi, 'MIT');
  samaDengan(m.nusantara.penulis, 'Tim Nusantara');
  samaDengan(m.dependensi['matematika'], '1.2.0');
  samaDengan(m.dependensi['teks'], '^2.0.0');
  samaDengan(typeof m.dependensi['utilitas'], 'object');
});

uji('Menghasilkan teks TOML terstruktur dari objek manifest', () => {
  const m = buatManifestAwal('proyekku', {
    versi: '0.1.0',
    deskripsi: 'Proyek percobaan',
    lisensi: 'Apache-2.0',
  });
  m.dependensi['matematika'] = '^1.0.0';

  const teksTOML = tulisManifest(m);
  mengandung(teksTOML, 'nama = "proyekku"');
  mengandung(teksTOML, 'versi = "0.1.0"');
  mengandung(teksTOML, 'matematika = "^1.0.0"');

  // Pastikan dapat dibaca kembali
  const roundtrip = bacaManifest(teksTOML);
  samaDengan(roundtrip.nusantara.nama, 'proyekku');
});

uji('Menolak berkas nusantara.toml yang tidak menyertakan tabel [nusantara]', () => {
  let tertangkap = false;
  try {
    bacaManifest(`[paket_lain]\nnama = "tes"`);
  } catch (err: any) {
    tertangkap = true;
    samaDengan(err instanceof GalatManifest, true);
    mengandung(err.message, "Bagian '[nusantara]' tidak ditemukan");
  }
  samaDengan(tertangkap, true);
});

uji('Menolak manifest dengan versi bukan SemVer', () => {
  let tertangkap = false;
  try {
    bacaManifest(`[nusantara]\nnama = "tes"\nversi = "satu.nol"\ndeskripsi = "x"\nlisensi = "MIT"`);
  } catch (err: any) {
    tertangkap = true;
    samaDengan(err instanceof GalatManifest, true);
    mengandung(err.message, 'Semantic Versioning');
  }
  samaDengan(tertangkap, true);
});

// -----------------------------------------------------------------------------
// KELOMPOK 4: BERKAS KUNCI & INTEGRITAS (nusantara.lock)
// -----------------------------------------------------------------------------
console.log('--- Kelompok 4: Berkas Kunci & Integritas (nusantara.lock) ---');

uji('Menghitung checksum integritas deterministik berkas paket', () => {
  const hash1 = hitungChecksum('program Utama mulai tampilkan("Hai") selesai');
  const hash2 = hitungChecksum('program Utama mulai tampilkan("Hai") selesai');
  const hash3 = hitungChecksum('program Berbeda');

  samaDengan(hash1, hash2);
  samaDengan(hash1 !== hash3, true);
  samaDengan(typeof hash1 === 'string' && hash1.length > 5, true);
});

uji('Menulis dan membaca berkas nusantara.lock', () => {
  const lockData = {
    versi_format: 1,
    paket: [
      {
        nama: 'matematika',
        versi: '1.2.3',
        sumber: 'registri:matematika@1.2.3',
        integritas: 'sha256-abc123xyz',
        dependensi: { angka: '1.0.0' },
      },
    ],
  };

  const toml = tulisLock(lockData);
  mengandung(toml, '# Berkas Kunci Dependensi NUSANTARA (nusantara.lock)');
  mengandung(toml, 'nama = "matematika"');
  mengandung(toml, 'versi = "1.2.3"');

  const balik = bacaLock(toml);
  samaDengan(balik.paket.length, 1);
  samaDengan(balik.paket[0].nama, 'matematika');
  samaDengan(balik.paket[0].versi, '1.2.3');
  samaDengan(balik.paket[0].integritas, 'sha256-abc123xyz');
});

// -----------------------------------------------------------------------------
// KELOMPOK 5: GRAF DEPENDENSI, DETEKSI SIKLUS & KONFLIK VERSI
// -----------------------------------------------------------------------------
console.log('--- Kelompok 5: Graf Dependensi & Deteksi Anomali ---');

uji('Deteksi ketergantungan melingkar dua tingkat (A → B → A)', () => {
  const graf = new GrafDependensi();
  graf.tambahSimpul({ nama: 'A', versi: '1.0.0', sumber: 'lokal', dependensi: { B: '1.0.0' } });
  graf.tambahSimpul({ nama: 'B', versi: '1.0.0', sumber: 'lokal', dependensi: { A: '1.0.0' } });

  const siklus = graf.deteksiSiklus('A');
  samaDengan(Array.isArray(siklus), true);
  samaDengan(siklus![0], 'A');
  samaDengan(siklus![1], 'B');
  samaDengan(siklus![2], 'A');

  let tertangkap = false;
  try {
    graf.urutanTopologis();
  } catch (err: any) {
    tertangkap = true;
    samaDengan(err instanceof GalatKetergantunganMelingkar, true);
    mengandung(err.message, 'terdeteksi dependency melingkar');
  }
  samaDengan(tertangkap, true);
});

uji('Deteksi ketergantungan melingkar tiga tingkat (A → B → C → A)', () => {
  const graf = new GrafDependensi();
  graf.tambahSimpul({ nama: 'A', versi: '1.0.0', sumber: 'lokal', dependensi: { B: '1.0.0' } });
  graf.tambahSimpul({ nama: 'B', versi: '1.0.0', sumber: 'lokal', dependensi: { C: '1.0.0' } });
  graf.tambahSimpul({ nama: 'C', versi: '1.0.0', sumber: 'lokal', dependensi: { A: '1.0.0' } });

  const siklus = graf.deteksiSiklus('A');
  samaDengan(Array.isArray(siklus), true);
  samaDengan(siklus!.join('->'), 'A->B->C->A');
});

uji('Deteksi konflik versi antar-dependensi (A butuh matematika 1.x, B butuh 2.x)', () => {
  const graf = new GrafDependensi();
  // Simpul matematika yang terpasang adalah 1.5.0
  graf.tambahSimpul({ nama: 'matematika', versi: '1.5.0', sumber: 'lokal', dependensi: {} });
  // Paket A meminta matematika 1.x
  graf.tambahSimpul({ nama: 'A', versi: '1.0.0', sumber: 'lokal', dependensi: { matematika: '1.x' } });
  // Paket B meminta matematika 2.x
  graf.tambahSimpul({ nama: 'B', versi: '1.0.0', sumber: 'lokal', dependensi: { matematika: '2.x' } });

  const konflik = graf.deteksiKonflikVersi();
  samaDengan(konflik.length, 1);
  samaDengan(konflik[0].namaPaket, 'matematika');
  samaDengan(konflik[0].permintaan.length, 2);

  const batasanList = konflik[0].permintaan.map(p => `${p.batasan} (dibutuhkan oleh ${p.peminta})`);
  const err = new GalatKonflikVersi(konflik[0].namaPaket, batasanList);
  mengandung(err.message, 'Kesalahan dependency:');
  mengandung(err.message, "versi package 'matematika' tidak dapat memenuhi");
  mengandung(err.message, '1.x');
  mengandung(err.message, '2.x');
});

uji('Menghasilkan urutan instalasi topologis yang benar (dependency first)', () => {
  const graf = new GrafDependensi();
  graf.tambahSimpul({ nama: 'inti', versi: '1.0.0', sumber: 'lokal', dependensi: {} });
  graf.tambahSimpul({ nama: 'alat', versi: '1.0.0', sumber: 'lokal', dependensi: { inti: '1.0.0' } });
  graf.tambahSimpul({ nama: 'aplikasi', versi: '1.0.0', sumber: 'lokal', dependensi: { alat: '1.0.0' } });

  const urutan = graf.urutanTopologis();
  // 'inti' harus diinstal sebelum 'alat', dan 'alat' sebelum 'aplikasi'
  samaDengan(urutan.indexOf('inti') < urutan.indexOf('alat'), true);
  samaDengan(urutan.indexOf('alat') < urutan.indexOf('aplikasi'), true);
});

// -----------------------------------------------------------------------------
// KELOMPOK 6: ABSTRAKSI REGISTRI (LocalRegistry & RemoteRegistry)
// -----------------------------------------------------------------------------
console.log('--- Kelompok 6: Abstraksi Registri ---');

uji('LocalRegistry menemukan paket pada direktori lokal dan mengambil berkasnya', () => {
  const fs = new PembacaBerkasMemori();
  fs.tulisBerkas(
    '/proyek/paket/matematika/nusantara.toml',
    `[nusantara]\nnama = "matematika"\nversi = "1.2.0"\ndeskripsi = "Paket matematika"\nlisensi = "MIT"\n\n[dependensi]\n`
  );
  fs.tulisBerkas(
    '/proyek/paket/matematika/src/matematika.nusantara',
    `modul matematika\nekspor fungsi tambah(a: bilangan, b: bilangan): bilangan\nmulai\n    kembalikan a + b\nselesai\n`
  );

  const reg = new LocalRegistry(fs, ['/proyek/paket']);
  const info = reg.dapatkanInfo('matematika');
  samaDengan(info !== null, true);
  samaDengan(info?.nama, 'matematika');
  samaDengan(info?.versiTerbaru, '1.2.0');

  const berkas = reg.ambilBerkasPaket('matematika', '1.2.0');
  samaDengan('nusantara.toml' in berkas, true);
  samaDengan('src/matematika.nusantara' in berkas, true);
});

uji('RemoteRegistry melempar pesan terstruktur bahwa remote registry belum aktif di Phase 16', () => {
  const reg = new RemoteRegistry();
  let tertangkap = false;
  try {
    reg.dapatkanInfo('paket-daring');
  } catch (err: any) {
    tertangkap = true;
    mengandung(err.message, 'belum aktif pada Phase 16');
  }
  samaDengan(tertangkap, true);
});

// -----------------------------------------------------------------------------
// KELOMPOK 7: PERINTAH CLI NUSANTARA
// -----------------------------------------------------------------------------
console.log('--- Kelompok 7: Perintah Baris Perintah (CLI) ---');

uji('nusantara buat: membuat struktur paket baru', () => {
  const fs = new PembacaBerkasMemori();
  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembacaBerkas: fs,
    direktoriProyek: '/ruang_kerja',
    penulisLog: m => logList.push(m),
  });

  const exitCode = cli.jalankan(['buat', 'proyek_keren']);
  samaDengan(exitCode, 0);

  // Periksa berkas yang dibuat
  samaDengan(fs.apakahAda('/ruang_kerja/proyek_keren/nusantara.toml'), true);
  samaDengan(fs.apakahAda('/ruang_kerja/proyek_keren/src/utama.nusantara'), true);
  samaDengan(fs.apakahAda('/ruang_kerja/proyek_keren/README.md'), true);

  const manifest = bacaManifest(fs.baca('/ruang_kerja/proyek_keren/nusantara.toml'));
  samaDengan(manifest.nusantara.nama, 'proyek_keren');
  samaDengan(manifest.nusantara.versi, '0.1.0');
});

uji('nusantara info: membaca metadata paket di proyek', () => {
  const fs = new PembacaBerkasMemori();
  fs.tulisBerkas(
    '/ruang_kerja/nusantara.toml',
    `[nusantara]\nnama = "aplikasi_utama"\nversi = "2.1.0"\ndeskripsi = "Aplikasi Utama"\nlisensi = "Apache-2.0"\n\n[dependensi]\nmatematika = "1.0.0"\n`
  );

  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembacaBerkas: fs,
    direktoriProyek: '/ruang_kerja',
    penulisLog: m => logList.push(m),
  });

  const exitCode = cli.jalankan(['info']);
  samaDengan(exitCode, 0);
  const logTeks = logList.join('\n');
  mengandung(logTeks, 'aplikasi_utama');
  mengandung(logTeks, '2.1.0');
  mengandung(logTeks, 'Apache-2.0');
});

uji('nusantara pasang: memasang dependensi lokal dan membuat nusantara.lock', () => {
  const fs = new PembacaBerkasMemori();
  // Siapkan paket lokal matematika
  fs.tulisBerkas(
    '/paket/matematika/nusantara.toml',
    `[nusantara]\nnama = "matematika"\nversi = "1.2.3"\ndeskripsi = "Modul Matematika"\nlisensi = "MIT"\n\n[dependensi]\n`
  );
  fs.tulisBerkas(
    '/paket/matematika/src/matematika.nusantara',
    `modul matematika\nekspor fungsi kuadrat(x: bilangan): bilangan\nmulai\n    kembalikan x * x\nselesai\n`
  );

  // Siapkan proyek aplikasi
  fs.tulisBerkas(
    '/proyek/nusantara.toml',
    `[nusantara]\nnama = "aplikasi"\nversi = "1.0.0"\ndeskripsi = "Aplikasi"\nlisensi = "MIT"\n\n[dependensi]\nmatematika = "^1.0.0"\n`
  );

  const logList: string[] = [];
  const reg = new LocalRegistry(fs, ['/paket']);
  const pengelola = new PengelolaPaket({
    pembacaBerkas: fs,
    direktoriProyek: '/proyek',
    registry: reg,
  });

  const cli = new NusantaraCLI({
    pengelola,
    penulisLog: m => logList.push(m),
  });

  const exitCode = cli.jalankan(['pasang']);
  samaDengan(exitCode, 0);

  // Pastikan berkas lock dibuat
  samaDengan(fs.apakahAda('/proyek/nusantara.lock'), true);
  const lock = bacaLock(fs.baca('/proyek/nusantara.lock'));
  samaDengan(lock.paket.length, 1);
  samaDengan(lock.paket[0].nama, 'matematika');
  samaDengan(lock.paket[0].versi, '1.2.3');

  // Pastikan berkas paket tersalin ke .nusantara/paket/matematika
  samaDengan(fs.apakahAda('/proyek/.nusantara/paket/matematika/src/matematika.nusantara'), true);
});

uji('nusantara pasang --terkunci: memverifikasi lockfile', () => {
  const fs = new PembacaBerkasMemori();
  fs.tulisBerkas(
    '/proyek/nusantara.toml',
    `[nusantara]\nnama = "aplikasi"\nversi = "1.0.0"\ndeskripsi = "Aplikasi"\nlisensi = "MIT"\n\n[dependensi]\n`
  );

  const errorList: string[] = [];
  const cli = new NusantaraCLI({
    pembacaBerkas: fs,
    direktoriProyek: '/proyek',
    penulisGalat: m => errorList.push(m),
  });

  // Gagal jika lockfile tidak ada
  const exitCode = cli.jalankan(['pasang', '--terkunci']);
  samaDengan(exitCode, 1);
  mengandung(errorList.join('\n'), 'nusantara.lock');
});

uji('nusantara daftar: menampilkan daftar dependensi dan status keterpasangan', () => {
  const fs = new PembacaBerkasMemori();
  fs.tulisBerkas(
    '/proyek/nusantara.toml',
    `[nusantara]\nnama = "aplikasi"\nversi = "1.0.0"\ndeskripsi = "Aplikasi"\nlisensi = "MIT"\n\n[dependensi]\nmatematika = "1.2.3"\nteks = "^2.0.0"\n`
  );
  fs.tulisBerkas(
    '/proyek/nusantara.lock',
    `versi_format = 1\n\n[[paket]]\nnama = "matematika"\nversi = "1.2.3"\nsumber = "lokal"\n`
  );
  fs.tulisBerkas('/proyek/.nusantara/paket/matematika/nusantara.toml', `[nusantara]\nnama = "matematika"\nversi = "1.2.3"\ndeskripsi = "x"\nlisensi = "MIT"`);

  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembacaBerkas: fs,
    direktoriProyek: '/proyek',
    penulisLog: m => logList.push(m),
  });

  const exitCode = cli.jalankan(['daftar']);
  samaDengan(exitCode, 0);
  const logTeks = logList.join('\n');
  mengandung(logTeks, 'matematika');
  mengandung(logTeks, 'teks');
  mengandung(logTeks, 'terpasang: 1.2.3');
});

uji('nusantara hapus: menghapus dependensi dari manifest dan sistem lokal', () => {
  const fs = new PembacaBerkasMemori();
  fs.tulisBerkas(
    '/proyek/nusantara.toml',
    `[nusantara]\nnama = "aplikasi"\nversi = "1.0.0"\ndeskripsi = "Aplikasi"\nlisensi = "MIT"\n\n[dependensi]\nmatematika = "1.2.3"\n`
  );
  fs.tulisBerkas(
    '/proyek/nusantara.lock',
    `versi_format = 1\n\n[[paket]]\nnama = "matematika"\nversi = "1.2.3"\nsumber = "lokal"\n`
  );
  fs.tulisBerkas('/proyek/.nusantara/paket/matematika/nusantara.toml', `[nusantara]\nnama = "matematika"\nversi = "1.2.3"\ndeskripsi = "x"\nlisensi = "MIT"`);

  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembacaBerkas: fs,
    direktoriProyek: '/proyek',
    penulisLog: m => logList.push(m),
  });

  const exitCode = cli.jalankan(['hapus', 'matematika']);
  samaDengan(exitCode, 0);

  // Periksa manifest bahwa matematika telah dihapus
  const m = bacaManifest(fs.baca('/proyek/nusantara.toml'));
  samaDengan('matematika' in m.dependensi, false);
});

uji('nusantara perbarui: memperbarui dependensi proyek', () => {
  const fs = new PembacaBerkasMemori();
  fs.tulisBerkas(
    '/proyek/nusantara.toml',
    `[nusantara]\nnama = "aplikasi"\nversi = "1.0.0"\ndeskripsi = "Aplikasi"\nlisensi = "MIT"\n\n[dependensi]\n`
  );
  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembacaBerkas: fs,
    direktoriProyek: '/proyek',
    penulisLog: m => logList.push(m),
  });

  const exitCode = cli.jalankan(['perbarui']);
  samaDengan(exitCode, 0);
});

uji('Menolak perintah CLI yang tidak dikenal dengan pesan bantuan terarah', () => {
  const fs = new PembacaBerkasMemori();
  const errorList: string[] = [];
  const cli = new NusantaraCLI({
    pembacaBerkas: fs,
    penulisGalat: m => errorList.push(m),
  });

  const exitCode = cli.jalankan(['perintah_aneh']);
  samaDengan(exitCode, 1);
  mengandung(errorList.join('\n'), 'tidak dikenal');
  mengandung(errorList.join('\n'), 'nusantara bantuan');
});

// -----------------------------------------------------------------------------
// KELOMPOK 8: INTEGRASI SISTEM MODUL (PHASE 15) & PACKAGE MANAGER (PHASE 16)
// -----------------------------------------------------------------------------
console.log('--- Kelompok 8: Integrasi Penuh Paket Terpasang dengan Modul NUSANTARA ---');

uji('Program NUSANTARA mengeksekusi modul dari paket yang dipasang di .nusantara/paket/', () => {
  const fs = new PembacaBerkasMemori();

  // 1. Siapkan paket 'aljabar' di registry lokal
  fs.tulisBerkas(
    '/katalog_paket/aljabar/nusantara.toml',
    `[nusantara]\nnama = "aljabar"\nversi = "1.0.0"\ndeskripsi = "Paket Aljabar Nusantara"\nlisensi = "Apache-2.0"\n\n[dependensi]\n`
  );
  fs.tulisBerkas(
    '/katalog_paket/aljabar/src/aljabar.nusantara',
    `modul aljabar

ekspor fungsi kaliDua(n: bilangan): bilangan
mulai
    kembalikan n * 2
selesai

ekspor fungsi pangkatTiga(n: bilangan): bilangan
mulai
    kembalikan n * n * n
selesai
`
  );

  // 2. Siapkan proyek konsumen
  fs.tulisBerkas(
    '/proyek_saya/nusantara.toml',
    `[nusantara]\nnama = "proyek_saya"\nversi = "1.0.0"\ndeskripsi = "Proyek Konsumen"\nlisensi = "MIT"\n\n[dependensi]\naljabar = "^1.0.0"\n`
  );

  // 3. Pasang paket menggunakan PengelolaPaket
  const reg = new LocalRegistry(fs, ['/katalog_paket']);
  const pengelola = new PengelolaPaket({
    pembacaBerkas: fs,
    direktoriProyek: '/proyek_saya',
    registry: reg,
  });
  const hasilPasang = pengelola.pasang();
  samaDengan(hasilPasang.sukses, true);

  // 4. Pastikan paket berada di .nusantara/paket/aljabar/src/aljabar.nusantara
  samaDengan(fs.apakahAda('/proyek_saya/.nusantara/paket/aljabar/src/aljabar.nusantara'), true);

  // 5. Buat kode program konsumen NUSANTARA yang menggunakan paket terpasang
  const kodeKonsumen = `
program UjiPaketTerpasang

gunakan aljabar

variabel hasil1: bilangan = aljabar.kaliDua(21)
variabel hasil2: bilangan = aljabar.pangkatTiga(3)

mulai
    tampilkan("Hasil Kali Dua:", hasil1)
    tampilkan("Hasil Pangkat Tiga:", hasil2)
selesai
`;

  // 6. Eksekusi melalui Pipeline Compiler: Parser -> TypeChecker -> ResolverModul -> PemuatModul -> Interpreter
  const parser = new Parser(kodeKonsumen);
  const ast = parser.parse();

  const buffer = new PenulisOutputBuffer();
  const resolver = new ResolverModul(fs, {
    direktoriAkarProyek: '/proyek_saya',
  });
  const pemuat = new PemuatModul(resolver, fs);
  const interpreter = new Interpreter(buffer, {
    pemuatModul: pemuat,
    direktoriBasis: '/proyek_saya',
  });

  const checker = new PemeriksaTipe(pemuat);
  checker.periksa(ast);

  interpreter.interpretasikan(ast);

  const baris = buffer.dapatkanSeluruhTeks();
  samaDengan(baris.length, 2);
  samaDengan(baris[0], 'Hasil Kali Dua: 42');
  samaDengan(baris[1], 'Hasil Pangkat Tiga: 27');
});

uji('Program NUSANTARA menggunakan destrukturisasi impor dari paket dengan ketergantungan jalur lokal (path dependency)', () => {
  const fs = new PembacaBerkasMemori();

  // Siapkan pustaka lokal di folder luar: /pustaka_eksternal/geometri
  fs.tulisBerkas(
    '/pustaka_eksternal/geometri/nusantara.toml',
    `[nusantara]\nnama = "geometri"\nversi = "0.5.0"\ndeskripsi = "Geometri dasar"\nlisensi = "MIT"\n\n[dependensi]\n`
  );
  fs.tulisBerkas(
    '/pustaka_eksternal/geometri/src/geometri.nusantara',
    `modul geometri

ekspor fungsi luasPersegi(sisi: bilangan): bilangan
mulai
    kembalikan sisi * sisi
selesai
`
  );

  // Siapkan proyek dengan path dependency
  fs.tulisBerkas(
    '/aplikasi/nusantara.toml',
    `[nusantara]\nnama = "aplikasi"\nversi = "1.0.0"\ndeskripsi = "Aplikasi"\nlisensi = "MIT"\n\n[dependensi]\ngeometri = { path = "../pustaka_eksternal/geometri" }\n`
  );

  const pengelola = new PengelolaPaket({
    pembacaBerkas: fs,
    direktoriProyek: '/aplikasi',
  });
  pengelola.pasang();

  // Eksekusi program yang mengimpor fungsi spesifik dari modul geometri
  const kodeProgram = `
program ProgramGeometri

impor { luasPersegi } dari geometri

variabel luas: bilangan = luasPersegi(12)

mulai
    tampilkan("Luas Persegi:", luas)
selesai
`;

  const parser = new Parser(kodeProgram);
  const ast = parser.parse();

  const buffer = new PenulisOutputBuffer();
  const resolver = new ResolverModul(fs, {
    direktoriAkarProyek: '/aplikasi',
  });
  const pemuat = new PemuatModul(resolver, fs);
  const interpreter = new Interpreter(buffer, {
    pemuatModul: pemuat,
    direktoriBasis: '/aplikasi',
  });

  const checker = new PemeriksaTipe(pemuat);
  checker.periksa(ast);

  interpreter.interpretasikan(ast);

  const baris = buffer.dapatkanSeluruhTeks();
  samaDengan(baris.length, 1);
  samaDengan(baris[0], 'Luas Persegi: 144');
});

// -----------------------------------------------------------------------------
// REKAPITULASI HASIL PENGUJIAN
// -----------------------------------------------------------------------------
const totalUji = daftarHasil.length;
const totalLulus = daftarHasil.filter(h => h.lulus).length;
const totalGagal = daftarHasil.filter(h => !h.lulus).length;

console.log('-----------------------------------------------------------------------------');
console.log(`Hasil Pengujian Package Manager: ${totalLulus} Uji LULUS, ${totalGagal} Uji GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (totalGagal > 0) {
  console.error(`\nPERINGATAN: Terdapat ${totalGagal} pengujian yang GAGAL!`);
  process.exit(1);
} else {
  console.log('STATUS: SELURUH PENGUJIAN PACKAGE MANAGER NUSANTARA BERHASIL 100%.');
}
