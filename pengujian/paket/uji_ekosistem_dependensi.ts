/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rangkaian 48 Uji Komprehensif Ekosistem Paket & Dependency Management NUSANTARA (Phase 27)
 * Target Milestone: v0.27.0
 */

import {
  PengelolaPaket,
  ManajerCachePaket,
  GalatIntegritasCache,
  GrafDependensi,
  GalatKetergantunganMelingkar,
  GalatKonflikVersi,
  bacaManifest,
  tulisManifest,
  buatManifestAwal,
  bacaLock,
  tulisLock,
  hitungChecksum,
  apakahKompatibel,
  uraiVersi,
  bandingkanVersi,
  NusantaraCLI,
  buatArsipPaket,
  uraiArsipPaket,
  ValidatorPaket,
  RegistriLokal,
} from '../../src/paket';
import { PembacaBerkasMemori } from '../../src/modul';
import { Parser } from '../../src/parser/parser';
import {
  VERSI_NUSANTARA,
  LABEL_VERSI_NUSANTARA,
  FASE_TERAKHIR,
  NAMA_FASE_TERAKHIR,
} from '../../src/konstanta/versi';

let lulus = 0;
let gagal = 0;

function uji(nama: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${nama}`);
    lulus++;
  } catch (err: any) {
    console.error(`  ✗ ${nama}`);
    console.error(`    Alasan: ${err.message || err}`);
    gagal++;
  }
}

function pastikan(kondisi: boolean, pesan: string) {
  if (!kondisi) {
    throw new Error(pesan);
  }
}

function pastikanSama(aktual: any, ekspektasi: any, pesan: string) {
  if (aktual !== ekspektasi) {
    throw new Error(`${pesan}: Diharapkan [${ekspektasi}], namun diterima [${aktual}]`);
  }
}

console.log('\n================================================================================');
console.log(`  PENGUJIAN EKOSISTEM PAKET & DEPENDENCY MANAGEMENT NUSANTARA (${LABEL_VERSI_NUSANTARA})`);
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// 1. SINGLE SOURCE OF TRUTH & MILESTONE v0.27.0
// -----------------------------------------------------------------------------
console.log('--- 1. SINGLE SOURCE OF TRUTH & MILESTONE v0.27.0 ---');

uji('1.1 Versi resmi harus v0.27.0 Phase 27 atau lebih baru', () => {
  pastikan(FASE_TERAKHIR >= 27, 'FASE_TERAKHIR harus >= 27');
  pastikan(VERSI_NUSANTARA >= '0.27.0', 'VERSI_NUSANTARA harus >= 0.27.0');
});

// -----------------------------------------------------------------------------
// 2. PROJECT MANIFEST & SEMVER CONSTRAINTS
// -----------------------------------------------------------------------------
console.log('\n--- 2. PROJECT MANIFEST & SEMVER CONSTRAINTS ---');

uji('2.1 Pembuatan dan penulisan manifest nusantara.toml', () => {
  const m = buatManifestAwal('proyek-uji', {
    versi: '0.1.0',
    deskripsi: 'Proyek uji dependency',
    lisensi: 'MIT',
    penulis: 'Developer Nusantara',
  });
  const toml = tulisManifest(m);
  pastikan(toml.includes('nama = "proyek-uji"'), 'Manifest TOML harus memuat nama paket');
  pastikan(toml.includes('versi = "0.1.0"'), 'Manifest TOML harus memuat versi paket');

  const dibaca = bacaManifest(toml);
  pastikanSama(dibaca.nusantara.nama, 'proyek-uji', 'Nama paket parsed harus cocok');
  pastikanSama(dibaca.nusantara.versi, '0.1.0', 'Versi paket parsed harus cocok');
});

uji('2.2 Evaluasi batasan SemVer: exact, caret (^), tilde (~), wildcard (*)', () => {
  // Caret ^1.2.0 kompatibel dengan 1.2.0, 1.2.5, 1.9.0; tidak dengan 2.0.0 atau 1.1.0
  pastikan(apakahKompatibel('1.2.0', '^1.2.0'), '^1.2.0 harus kompatibel dengan 1.2.0');
  pastikan(apakahKompatibel('1.5.0', '^1.2.0'), '^1.2.0 harus kompatibel dengan 1.5.0');
  pastikan(!apakahKompatibel('2.0.0', '^1.2.0'), '^1.2.0 tidak boleh kompatibel dengan 2.0.0');

  // Tilde ~1.2.0 kompatibel dengan patch 1.2.x, tidak dengan 1.3.0
  pastikan(apakahKompatibel('1.2.4', '~1.2.0'), '~1.2.0 harus kompatibel dengan 1.2.4');
  pastikan(!apakahKompatibel('1.3.0', '~1.2.0'), '~1.2.0 tidak boleh kompatibel dengan 1.3.0');

  // Wildcard *
  pastikan(apakahKompatibel('9.9.9', '*'), '* harus kompatibel dengan versi apa pun');

  // Exact
  pastikan(apakahKompatibel('1.0.0', '1.0.0'), 'Exact match harus kompatibel');
  pastikan(!apakahKompatibel('1.0.1', '1.0.0'), 'Exact match tidak boleh kompatibel dengan beda patch');
});

uji('2.3 Perbandingan SemVer terurut', () => {
  const v1 = uraiVersi('1.0.0');
  const v2 = uraiVersi('1.2.0');
  const v3 = uraiVersi('2.0.0');
  pastikan(bandingkanVersi(v1, v2) < 0, '1.0.0 < 1.2.0');
  pastikan(bandingkanVersi(v3, v2) > 0, '2.0.0 > 1.2.0');
  pastikan(bandingkanVersi(v1, v1) === 0, '1.0.0 === 1.0.0');
});

// -----------------------------------------------------------------------------
// 3. DEPENDENCY GRAPH & RESOLVER
// -----------------------------------------------------------------------------
console.log('\n--- 3. DEPENDENCY GRAPH & RESOLVER ---');

uji('3.1 Resolusi urutan topologis dependensi asiklik', () => {
  const graf = new GrafDependensi();
  graf.tambahSimpul({
    nama: 'app',
    versi: '1.0.0',
    sumber: 'akar',
    dependensi: { 'lib-b': '^1.0.0', 'lib-c': '^1.0.0' },
  });
  graf.tambahSimpul({
    nama: 'lib-b',
    versi: '1.0.0',
    sumber: 'registri',
    dependensi: { 'lib-c': '^1.0.0' },
  });
  graf.tambahSimpul({
    nama: 'lib-c',
    versi: '1.0.0',
    sumber: 'registri',
    dependensi: {},
  });

  const urutan = graf.urutanTopologis();
  pastikan(urutan.indexOf('lib-c') < urutan.indexOf('lib-b'), 'lib-c harus sebelum lib-b');
  pastikan(urutan.indexOf('lib-b') < urutan.indexOf('app'), 'lib-b harus sebelum app');
});

uji('3.2 Deteksi siklus ketergantungan melingkar (Circular Dependency)', () => {
  const graf = new GrafDependensi();
  graf.tambahSimpul({
    nama: 'paket-a',
    versi: '1.0.0',
    sumber: 'akar',
    dependensi: { 'paket-b': '^1.0.0' },
  });
  graf.tambahSimpul({
    nama: 'paket-b',
    versi: '1.0.0',
    sumber: 'registri',
    dependensi: { 'paket-c': '^1.0.0' },
  });
  graf.tambahSimpul({
    nama: 'paket-c',
    versi: '1.0.0',
    sumber: 'registri',
    dependensi: { 'paket-a': '^1.0.0' },
  });

  const siklus = graf.deteksiSiklus('paket-a');
  pastikan(siklus !== null, 'Siklus harus terdeteksi');
  pastikan(siklus!.includes('paket-a') && siklus!.includes('paket-b'), 'Rantai siklus harus memuat paket terlibat');
});

uji('3.3 Deteksi konflik versi antar paket dependensi', () => {
  const graf = new GrafDependensi();
  graf.tambahSimpul({
    nama: 'app',
    versi: '1.0.0',
    sumber: 'akar',
    dependensi: { 'shared-lib': '^1.0.0', 'feature-x': '^1.0.0' },
  });
  graf.tambahSimpul({
    nama: 'shared-lib',
    versi: '1.2.0',
    sumber: 'registri',
    dependensi: {},
  });
  graf.tambahSimpul({
    nama: 'feature-x',
    versi: '1.0.0',
    sumber: 'registri',
    dependensi: { 'shared-lib': '^2.0.0' }, // Meminta v2.0.0 padahal shared-lib v1.2.0
  });

  const konflik = graf.deteksiKonflikVersi();
  pastikan(konflik.length > 0, 'Konflik versi harus terdeteksi');
  pastikanSama(konflik[0].namaPaket, 'shared-lib', 'Paket konflik harus shared-lib');
});

uji('3.4 Pembuatan visualisasi format pohon dependensi konsol', () => {
  const graf = new GrafDependensi();
  graf.tambahSimpul({
    nama: 'proyek-utama',
    versi: '1.0.0',
    sumber: 'akar',
    dependensi: { 'matematika': '^1.0.0', 'string-util': '^2.0.0' },
  });
  graf.tambahSimpul({
    nama: 'matematika',
    versi: '1.0.0',
    sumber: 'registri',
    dependensi: { 'util-dasar': '^0.5.0' },
  });
  graf.tambahSimpul({
    nama: 'string-util',
    versi: '2.0.0',
    sumber: 'registri',
    dependensi: {},
  });
  graf.tambahSimpul({
    nama: 'util-dasar',
    versi: '0.5.0',
    sumber: 'registri',
    dependensi: {},
  });

  const pohon = graf.formatPohon('proyek-utama');
  pastikan(pohon.includes('proyek-utama@1.0.0'), 'Pohon harus memuat akar proyek');
  pastikan(pohon.includes('matematika@1.0.0'), 'Pohon harus memuat anak matematika');
  pastikan(pohon.includes('util-dasar@0.5.0'), 'Pohon harus memuat cucu util-dasar');
  pastikan(pohon.includes('string-util@2.0.0'), 'Pohon harus memuat cabang string-util');
});

uji('3.5 Audit keamanan struktur graf', () => {
  const graf = new GrafDependensi();
  graf.tambahSimpul({
    nama: 'proyek-bersih',
    versi: '1.0.0',
    sumber: 'akar',
    dependensi: { 'helper': '^1.0.0' },
  });
  graf.tambahSimpul({
    nama: 'helper',
    versi: '1.0.0',
    sumber: 'registri',
    dependensi: {},
  });

  const audit = graf.auditKeamanan();
  pastikan(audit.aman, 'Graf tanpa siklus atau konflik harus aman');
  pastikanSama(audit.totalPaket, 2, 'Total paket harus 2');
  pastikanSama(audit.adaSiklus, false, 'Tidak boleh ada siklus');
});

// -----------------------------------------------------------------------------
// 4. PACKAGE CACHE SYSTEM & INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- 4. PACKAGE CACHE SYSTEM & INTEGRITY ---');

uji('4.1 Penyimpanan dan pengambilan paket di cache lokal', () => {
  const mem = new PembacaBerkasMemori();
  const cache = new ManajerCachePaket(mem, '/cache');

  const berkas = {
    'nusantara.toml': '[nusantara]\nnama = "kalkulator"\nversi = "1.0.0"\n',
    'src/kalkulator.nusantara': 'fungsi tambah(a: bilangan, b: bilangan): bilangan\nmulai\n    kembalikan a + b\nselesai\n',
  };

  const entri = cache.simpan('kalkulator', '1.0.0', berkas);
  pastikan(entri.checksumSha256.startsWith('sha256-'), 'Checksum SHA-256 harus berawalan sha256-');
  pastikan(cache.apakahAda('kalkulator', '1.0.0'), 'Paket harus terdaftar di cache');

  const ambil = cache.ambil('kalkulator', '1.0.0');
  pastikan(ambil.ditemukan, 'Paket harus ditemukan di cache');
  pastikan(ambil.integritasValid, 'Integritas cache harus valid');
  pastikanSama(ambil.berkas!['src/kalkulator.nusantara'], berkas['src/kalkulator.nusantara'], 'Konten berkas harus persis sama');
});

uji('4.2 Deteksi manipulasi data cache (Tamper Detection)', () => {
  const mem = new PembacaBerkasMemori();
  const cache = new ManajerCachePaket(mem, '/cache');

  const berkas = {
    'nusantara.toml': '[nusantara]\nnama = "keamanan"\nversi = "1.0.0"\n',
    'src/utama.nusantara': 'tampilkan("Aman")\n',
  };

  const entri = cache.simpan('keamanan', '1.0.0', berkas);

  // Manipulasi salah satu berkas di disk secara langsung
  const jalurBerkasCache = mem.gabungJalur('/cache', 'keamanan', '1.0.0', 'src', 'utama.nusantara');
  mem.tulisBerkas(jalurBerkasCache, 'tampilkan("Dimanipulasi!")\n');

  // Ambil dari cache dengan checksum harapan asli
  const ambil = cache.ambil('keamanan', '1.0.0', entri.checksumSha256);
  pastikan(ambil.ditemukan, 'Entri ditemukan');
  pastikan(!ambil.integritasValid, 'Integritas HARUS dideteksi tidak valid setelah manipulasi');
  pastikan(ambil.pesan!.includes('Checksum cache tidak sesuai'), 'Pesan peringatan harus informatif');
});

uji('4.3 Pembersihan cache paket (bersihkanSemua)', () => {
  const mem = new PembacaBerkasMemori();
  const cache = new ManajerCachePaket(mem, '/cache');

  cache.simpan('pkg-a', '1.0.0', { 'a.txt': 'A' });
  cache.simpan('pkg-b', '1.0.0', { 'b.txt': 'B' });
  pastikanSama(cache.dapatkanSemuaEntri().length, 2, 'Sebelum dibersihkan harus ada 2 entri');

  const hasilBersih = cache.bersihkanSemua();
  pastikanSama(hasilBersih.jumlahDihapus, 2, '2 paket harus dilaporkan dihapus');
  pastikanSama(cache.dapatkanSemuaEntri().length, 0, 'Setelah dibersihkan harus 0 entri');
});

// -----------------------------------------------------------------------------
// 5. PACKAGE MANAGER OPERATIONS & LOCKFILE REPRODUCIBILITY
// -----------------------------------------------------------------------------
console.log('\n--- 5. PACKAGE MANAGER OPERATIONS & LOCKFILE REPRODUCIBILITY ---');

uji('5.1 nusantara buat: menginisialisasi proyek baru dengan struktur standar', () => {
  const mem = new PembacaBerkasMemori();
  const pengelola = new PengelolaPaket({
    direktoriProyek: '/workspace',
    pembacaBerkas: mem,
  });

  const res = pengelola.buat('klien-baru');
  pastikan(res.sukses, 'Pembuatan paket harus sukses');
  pastikan(mem.apakahAda('/workspace/klien-baru/nusantara.toml'), 'nusantara.toml harus dibuat');
  pastikan(mem.apakahAda('/workspace/klien-baru/src/utama.nusantara'), 'src/utama.nusantara harus dibuat');
  pastikan(mem.apakahAda('/workspace/klien-baru/README.md'), 'README.md harus dibuat');

  // Pastikan kode .nusantara yang dihasilkan valid grammar
  const parser = new Parser(mem.baca('/workspace/klien-baru/src/utama.nusantara'));
  const ast = parser.parse();
  pastikanSama(parser.dapatkanDaftarGalat().length, 0, 'Kode utama.nusantara harus valid tata bahasa');
  pastikan(ast !== null, 'AST harus terbentuk');
});

uji('5.2 Registri Lokal: penerbitan dan unduhan bundle immutable', () => {
  const mem = new PembacaBerkasMemori();
  const reg = new RegistriLokal({
    pembacaBerkas: mem,
    direktoriBasis: '/registri',
  });

  const m = buatManifestAwal('aritmatika', {
    versi: '1.0.0',
    deskripsi: 'Paket kalkulasi aritmatika',
    lisensi: 'MIT',
  });
  const arsip = buatArsipPaket(m, {
    'nusantara.toml': tulisManifest(m),
    'src/aritmatika.nusantara': 'fungsi kali(a: bilangan, b: bilangan): bilangan\nmulai\n    kembalikan a * b\nselesai\n',
  });

  const hasilTerbit = reg.terbitkan(arsip);
  pastikan(hasilTerbit.sukses, 'Penerbitan harus sukses');
  pastikanSama(hasilTerbit.nama, 'aritmatika', 'Nama paket terbit harus aritmatika');

  // Coba unduh dari registri
  const unduh = reg.unduh('aritmatika', '1.0.0');
  pastikanSama(unduh.header.nama, 'aritmatika', 'Bundle terunduh harus valid');
  pastikanSama(unduh.checksum, hasilTerbit.checksum, 'Checksum harus identik');
});

uji('5.3 nusantara tambah & pasang: instalasi dependensi dan pembuatan nusantara.lock', () => {
  const mem = new PembacaBerkasMemori();
  const reg = new RegistriLokal({
    pembacaBerkas: mem,
    direktoriBasis: '/registri',
  });

  // Siapkan paket di registri
  const m = buatManifestAwal('geometri', {
    versi: '1.0.0',
    deskripsi: 'Paket geometri',
    lisensi: 'MIT',
  });
  reg.terbitkan(
    buatArsipPaket(m, {
      'nusantara.toml': tulisManifest(m),
      'src/geometri.nusantara': 'fungsi luas_persegi(sisi: bilangan): bilangan\nmulai\n    kembalikan sisi * sisi\nselesai\n',
    })
  );

  // Buat proyek konsumen
  const pengelola = new PengelolaPaket({
    direktoriProyek: '/proyek-konsumen',
    pembacaBerkas: mem,
    registriLokal: reg,
  });
  pengelola.buat('proyek-konsumen', '/proyek-konsumen');

  // Tambah dependensi geometri
  const resTambah = pengelola.tambah('geometri', '^1.0.0');
  pastikan(resTambah.sukses, 'Tambah dependensi harus sukses');

  // Periksa keberadaan berkas fisik terpasang
  pastikan(mem.apakahAda('/proyek-konsumen/.nusantara/paket/geometri/src/geometri.nusantara'), 'Berkas geometri harus terpasang di .nusantara/paket/');
  pastikan(mem.apakahAda('/proyek-konsumen/nusantara.lock'), 'nusantara.lock harus dibuat');

  // Periksa isi lockfile
  const lock = bacaLock(mem.baca('/proyek-konsumen/nusantara.lock'));
  pastikanSama(lock.paket.length, 1, 'Harus ada 1 paket dalam lock');
  pastikanSama(lock.paket[0]?.nama, 'geometri', 'Nama paket di lockfile harus geometri');
  pastikanSama(lock.paket[0]?.versi, '1.0.0', 'Versi di lockfile harus 1.0.0');
  pastikan(Boolean(lock.paket[0]?.integritas?.startsWith('sha256-')), 'Integritas SHA-256 harus diawali sha256-');
});

uji('5.4 nusantara pasang --terkunci: instalasi reproduktif dan verifikasi integritas', () => {
  const mem = new PembacaBerkasMemori();
  const reg = new RegistriLokal({
    pembacaBerkas: mem,
    direktoriBasis: '/registri',
  });

  const m = buatManifestAwal('logika-util', {
    versi: '1.0.0',
    deskripsi: 'Logika utilitas',
    lisensi: 'MIT',
  });
  reg.terbitkan(
    buatArsipPaket(m, {
      'nusantara.toml': tulisManifest(m),
      'src/logika-util.nusantara': 'fungsi dan_dua(a: logika, b: logika): logika\nmulai\n    kembalikan a dan b\nselesai\n',
    })
  );

  const pengelola = new PengelolaPaket({
    direktoriProyek: '/proyek-repro',
    pembacaBerkas: mem,
    registriLokal: reg,
  });
  pengelola.buat('proyek-repro', '/proyek-repro');
  pengelola.tambah('logika-util', '^1.0.0');

  // Eksekusi pasang ulang dengan flag terkunci
  const resPasangTerkunci = pengelola.pasang({ terkunci: true });
  pastikan(resPasangTerkunci.sukses, 'Pasang dengan --terkunci harus berhasil');

  // Uji kegagalan integritas jika lockfile dimanipulasi
  const jalurLock = '/proyek-repro/nusantara.lock';
  const lockAsli = bacaLock(mem.baca(jalurLock));
  lockAsli.paket[0].integritas = '0000000000000000000000000000000000000000000000000000000000000000';
  mem.tulisBerkas(jalurLock, tulisLock(lockAsli));

  let errorIntegritasTertangkap = false;
  try {
    pengelola.pasang({ terkunci: true });
  } catch (err: any) {
    errorIntegritasTertangkap = true;
    pastikan(err.message.includes('Verifikasi integritas GAGAL'), 'Pesan error harus tentang integritas');
  }
  pastikan(errorIntegritasTertangkap, 'Harus melempar error saat integritas lockfile tidak cocok');
});

uji('5.5 nusantara hapus: menghapus dependensi dan memperbarui manifest serta lockfile', () => {
  const mem = new PembacaBerkasMemori();
  const reg = new RegistriLokal({
    pembacaBerkas: mem,
    direktoriBasis: '/registri',
  });

  const m = buatManifestAwal('modul-sementara', {
    versi: '1.0.0',
    deskripsi: 'Modul sementara',
    lisensi: 'MIT',
  });
  reg.terbitkan(
    buatArsipPaket(m, {
      'nusantara.toml': tulisManifest(m),
      'src/modul-sementara.nusantara': 'fungsi halo(): teks\nmulai\n    kembalikan "halo"\nselesai\n',
    })
  );

  const pengelola = new PengelolaPaket({
    direktoriProyek: '/proyek-hapus',
    pembacaBerkas: mem,
    registriLokal: reg,
  });
  pengelola.buat('proyek-hapus', '/proyek-hapus');
  pengelola.tambah('modul-sementara', '^1.0.0');

  pastikanSama(pengelola.daftar().length, 1, 'Sebelum dihapus ada 1 dependensi');

  const resHapus = pengelola.hapus('modul-sementara');
  pastikan(resHapus.sukses, 'Hapus dependensi harus sukses');
  pastikanSama(pengelola.daftar().length, 0, 'Setelah dihapus harus 0 dependensi');
});

uji('5.6 nusantara audit & pohonDependensi', () => {
  const mem = new PembacaBerkasMemori();
  const reg = new RegistriLokal({
    pembacaBerkas: mem,
    direktoriBasis: '/registri',
  });

  const m = buatManifestAwal('vektor', {
    versi: '1.0.0',
    deskripsi: 'Paket vektor',
    lisensi: 'MIT',
  });
  reg.terbitkan(
    buatArsipPaket(m, {
      'nusantara.toml': tulisManifest(m),
      'src/vektor.nusantara': 'fungsi panjang(x: bilangan, y: bilangan): bilangan\nmulai\n    kembalikan x + y\nselesai\n',
    })
  );

  const pengelola = new PengelolaPaket({
    direktoriProyek: '/proyek-audit',
    pembacaBerkas: mem,
    registriLokal: reg,
  });
  pengelola.buat('proyek-audit', '/proyek-audit');
  pengelola.tambah('vektor', '^1.0.0');

  const audit = pengelola.audit();
  pastikan(audit.aman, 'Audit proyek harus berstatus aman');
  pastikan(audit.integritasLockValid, 'Integritas lockfile harus valid');

  const pohon = pengelola.dapatkanPohonDependensi();
  pastikan(pohon.includes('proyek-audit@0.1.0'), 'Pohon harus mencantumkan proyek akar');
  pastikan(pohon.includes('vektor@1.0.0'), 'Pohon harus mencantumkan paket vektor');
});

// -----------------------------------------------------------------------------
// 6. CLI INTEGRATION & END-TO-END WORKFLOWS
// -----------------------------------------------------------------------------
console.log('\n--- 6. CLI INTEGRATION & END-TO-END WORKFLOWS ---');

uji('6.1 Eksekusi CLI: nusantara versi', () => {
  const output: string[] = [];
  const cli = new NusantaraCLI({
    log: msg => output.push(msg),
  });

  const code = cli.jalankan(['versi']);
  pastikanSama(code, 0, 'Exit code harus 0');
  const gabungan = output.join('\n');
  pastikan(gabungan.includes('0.27.0'), 'Output banner CLI harus memuat 0.27.0');
});

uji('6.2 Eksekusi CLI: nusantara buat, tambah, pohon, audit, bersihkan-cache', () => {
  const mem = new PembacaBerkasMemori();
  const reg = new RegistriLokal({
    pembacaBerkas: mem,
    direktoriBasis: '/registri',
  });

  const m = buatManifestAwal('alat-teks', {
    versi: '1.0.0',
    deskripsi: 'Alat teks',
    lisensi: 'MIT',
  });
  reg.terbitkan(
    buatArsipPaket(m, {
      'nusantara.toml': tulisManifest(m),
      'src/alat-teks.nusantara': 'fungsi kapital(s: teks): teks\nmulai\n    kembalikan s\nselesai\n',
    })
  );

  const output: string[] = [];
  const pengelola = new PengelolaPaket({
    direktoriProyek: '/workspace/cli-proyek',
    pembacaBerkas: mem,
    registriLokal: reg,
  });

  const cli = new NusantaraCLI({
    pembaca: mem,
    pengelola,
    log: msg => output.push(msg),
  });

  // 1. Buat paket
  const exitBuat = cli.jalankan(['buat', 'cli-proyek', '/workspace/cli-proyek']);
  pastikanSama(exitBuat, 0, 'nusantara buat harus berhasil');

  // 2. Tambah dependensi
  const exitTambah = cli.jalankan(['tambah', 'alat-teks', '^1.0.0']);
  pastikanSama(exitTambah, 0, 'nusantara tambah harus berhasil');

  // 3. Pohon dependensi
  output.length = 0;
  const exitPohon = cli.jalankan(['pohon']);
  pastikanSama(exitPohon, 0, 'nusantara pohon harus berhasil');
  pastikan(output.join('\n').includes('alat-teks'), 'Pohon harus mencantumkan alat-teks');

  // 4. Audit dependensi
  output.length = 0;
  const exitAudit = cli.jalankan(['audit']);
  pastikanSama(exitAudit, 0, 'nusantara audit harus berhasil');
  pastikan(output.join('\n').includes('[✓ AMAN]'), 'Audit harus menyatakan aman');

  // 5. Bersihkan cache
  output.length = 0;
  const exitCache = cli.jalankan(['bersihkan-cache']);
  pastikanSama(exitCache, 0, 'nusantara bersihkan-cache harus berhasil');
  pastikan(output.join('\n').includes('Cache paket NUSANTARA berhasil dibersihkan'), 'Pesan pembersihan cache harus muncul');
});

// -----------------------------------------------------------------------------
// 7. PATH DEPENDENCIES, MULTI-VERSION CACHE & ADVANCED CONSTRAINTS
// -----------------------------------------------------------------------------
console.log('\n--- 7. PATH DEPENDENCIES, MULTI-VERSION CACHE & ADVANCED CONSTRAINTS ---');

uji('7.1 Path dependency: resolusi dependensi folder lokal', () => {
  const mem = new PembacaBerkasMemori();

  // Buat pustaka lokal
  mem.tulisBerkas(
    '/workspace/pustaka-lokal/nusantara.toml',
    '[nusantara]\nnama = "pustaka-lokal"\nversi = "1.0.0"\ndeskripsi = "Pustaka lokal"\nlisensi = "MIT"\n'
  );
  mem.tulisBerkas('/workspace/pustaka-lokal/src/pustaka-lokal.nusantara', 'fungsi bantu(): teks\nmulai\n    kembalikan "bantu"\nselesai\n');

  // Buat aplikasi pemanggil
  const pengelola = new PengelolaPaket({
    direktoriProyek: '/workspace/app-lokal',
    pembacaBerkas: mem,
  });
  pengelola.buat('app-lokal', '/workspace/app-lokal');

  // Pasang menggunakan path relatif
  const res = pengelola.tambah('pustaka-lokal', undefined, { path: '../pustaka-lokal' });
  pastikan(res.sukses, 'Tambah path dependency harus sukses');
  pastikan(mem.apakahAda('/workspace/app-lokal/.nusantara/paket/pustaka-lokal/src/pustaka-lokal.nusantara'), 'Berkas pustaka lokal harus disalin');
});

uji('7.2 Cache multi-versi: mendukung versi berbeda paket yang sama secara bersamaan', () => {
  const mem = new PembacaBerkasMemori();
  const cache = new ManajerCachePaket(mem, '/cache-multi');

  cache.simpan('kalkulator', '1.0.0', { 'konten.txt': 'v1' });
  cache.simpan('kalkulator', '2.0.0', { 'konten.txt': 'v2' });

  pastikanSama(cache.dapatkanSemuaEntri().length, 2, 'Harus ada 2 entri versi berbeda');
  const ambil1 = cache.ambil('kalkulator', '1.0.0');
  const ambil2 = cache.ambil('kalkulator', '2.0.0');
  pastikanSama(ambil1.berkas!['konten.txt'], 'v1', 'Versi 1.0.0 harus sesuai');
  pastikanSama(ambil2.berkas!['konten.txt'], 'v2', 'Versi 2.0.0 harus sesuai');

  // Hapus hanya versi 1.0.0
  cache.hapus('kalkulator', '1.0.0');
  pastikan(!cache.apakahAda('kalkulator', '1.0.0'), 'Versi 1.0.0 harus terhapus');
  pastikan(cache.apakahAda('kalkulator', '2.0.0'), 'Versi 2.0.0 harus tetap ada');
});

uji('7.3 Validasi nama paket: menolak karakter ilegal dan nama kosong', () => {
  let tertangkap = false;
  try {
    const mem = new PembacaBerkasMemori();
    const p = new PengelolaPaket({ pembacaBerkas: mem });
    p.buat('Nama_Paket_Ilegal$$');
  } catch (err: any) {
    tertangkap = true;
    pastikan(err.message.includes('Nama paket'), 'Harus menolak karakter ilegal');
  }
  pastikan(tertangkap, 'Harus melempar galat untuk nama paket tidak valid');
});

uji('7.4 Eksekusi CLI: nusantara audit --json dan nusantara info --json terstruktur', () => {
  const mem = new PembacaBerkasMemori();
  mem.tulisBerkas(
    '/workspace/json-proyek/nusantara.toml',
    '[nusantara]\nnama = "json-proyek"\nversi = "0.27.0"\ndeskripsi = "Uji JSON"\nlisensi = "MIT"\n\n[dependensi]\n'
  );
  mem.tulisBerkas(
    '/workspace/json-proyek/nusantara.lock',
    'versi_format = 1\n'
  );

  const output: string[] = [];
  const pengelola = new PengelolaPaket({
    direktoriProyek: '/workspace/json-proyek',
    pembacaBerkas: mem,
  });

  const cli = new NusantaraCLI({
    pembaca: mem,
    pengelola,
    log: msg => output.push(msg),
  });

  const exitAudit = cli.jalankan(['audit', '--json']);
  pastikanSama(exitAudit, 0, 'Audit --json harus exit code 0');
  const jsonAudit = JSON.parse(output[output.length - 1]);
  pastikan(jsonAudit.aman === true, 'JSON audit harus memuat property aman: true');
  pastikan(typeof jsonAudit.totalPaket === 'number', 'JSON audit harus memuat totalPaket');
});

// -----------------------------------------------------------------------------
// 8. KEPATUHAN TATA BAHASA & PARSER NUSANTARA AKTUAL
// -----------------------------------------------------------------------------
console.log('\n--- 8. KEPATUHAN TATA BAHASA & PARSER NUSANTARA AKTUAL ---');

uji('8.1 Kode modul paket harus dapat diparse 100% oleh Parser resmi', () => {
  const kodeSumber = `// Modul Pustaka Aritmatika Resmi NUSANTARA
fungsi tambah(a : bilangan, b : bilangan) : bilangan
mulai
    kembalikan a + b
selesai

fungsi hitung_faktorial(n : bilangan) : bilangan
mulai
    jika n <= 1 maka
        kembalikan 1
    selain
        kembalikan n * hitung_faktorial(n - 1)
    akhir
selesai

program PustakaAritmatika
mulai
    variabel hasil : bilangan = tambah(10, 20)
    tampilkan("Hasil: " + teks(hasil))
selesai
`;

  const parser = new Parser(kodeSumber);
  const ast = parser.parse();
  const daftarGalat = parser.dapatkanDaftarGalat();

  pastikanSama(daftarGalat.length, 0, `Tidak boleh ada galat sintaksis: ${daftarGalat.map(g => g.message).join(', ')}`);
  pastikan(ast !== null, 'AST harus terbentuk');
  pastikanSama(ast.namaProgram, 'PustakaAritmatika', 'Nama program AST harus PustakaAritmatika');
});

// -----------------------------------------------------------------------------
// RINGKASAN AKHIR
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`  RINGKASAN PENGUJIAN PHASE 27: ${lulus} LULUS, ${gagal} GAGAL (TOTAL: ${lulus + gagal})`);
console.log('================================================================================\n');

if (gagal > 0) {
  process.exit(1);
}
