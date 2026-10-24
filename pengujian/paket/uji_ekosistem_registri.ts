/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pengujian Ekosistem Paket & Registri NUSANTARA (Phase 22)
 * Target Versi: v0.22.0
 */

import {
  buatArsipPaket,
  uraiArsipPaket,
  ekstrakArsipPaket,
  validasiJalurArsip,
  apakahHarusDiabaikan,
  GalatArsipPaket,
} from '../../src/paket/arsip';
import {
  ValidatorPaket,
  LaporanValidasiPaket,
} from '../../src/paket/validasi';
import {
  RegistriLokal,
  RegistriJarakJauh,
  GalatImmutabilitasPaket,
  GalatRegistri,
  MetadataPaketRegistri,
} from '../../src/paket/registri';
import {
  PengelolaPaket,
  NusantaraCLI,
  bacaManifest,
  tulisManifest,
  bacaLock,
  buatManifestAwal,
} from '../../src/paket';
import { PembacaBerkasMemori } from '../../src/modul';

interface HasilUji {
  grup: string;
  nama: string;
  lulus: boolean;
  pesan?: string;
}

const daftarHasil: HasilUji[] = [];
let grupSaatIni = 'Umum';

function setGrup(nama: string) {
  grupSaatIni = nama;
  console.log(`\n=== [GRUP: ${nama}] ===`);
}

function uji(nama: string, fn: () => void | Promise<void>) {
  try {
    const hasil = fn();
    if (hasil && typeof (hasil as any).then === 'function') {
      (hasil as Promise<void>)
        .then(() => {
          daftarHasil.push({ grup: grupSaatIni, nama, lulus: true });
          console.log(`  [✓ LULUS] ${nama}`);
        })
        .catch((err: any) => {
          daftarHasil.push({ grup: grupSaatIni, nama, lulus: false, pesan: err.message });
          console.error(`  [✗ GAGAL] ${nama}: ${err.message}`);
        });
    } else {
      daftarHasil.push({ grup: grupSaatIni, nama, lulus: true });
      console.log(`  [✓ LULUS] ${nama}`);
    }
  } catch (error: any) {
    daftarHasil.push({ grup: grupSaatIni, nama, lulus: false, pesan: error.message });
    console.error(`  [✗ GAGAL] ${nama}: ${error.message}`);
  }
}

function samaDengan(aktual: any, ekspektasi: any, pesan?: string) {
  if (aktual !== ekspektasi) {
    throw new Error(pesan || `Ekspektasi '${ekspektasi}', namun mendapatkan '${aktual}'`);
  }
}

function harusBenar(kondisi: boolean, pesan?: string) {
  if (!kondisi) {
    throw new Error(pesan || 'Kondisi bernilai salah, seharusnya benar.');
  }
}

function harusSalah(kondisi: boolean, pesan?: string) {
  if (kondisi) {
    throw new Error(pesan || 'Kondisi bernilai benar, seharusnya salah.');
  }
}

function harusGalat(fn: () => void, pesanEkspektasi?: string) {
  let melempar = false;
  try {
    fn();
  } catch (err: any) {
    melempar = true;
    if (pesanEkspektasi && !err.message.toLowerCase().includes(pesanEkspektasi.toLowerCase())) {
      throw new Error(`Galat dilempar namun pesan '${err.message}' tidak memuat '${pesanEkspektasi}'`);
    }
  }
  if (!melempar) {
    throw new Error('Ekspektasi melempar galat, namun operasi berhasil.');
  }
}

// ============================================================================
// GRUP 1: ARSIP PAKET (.NPK) & PERLINDUNGAN KEAMANAN PATH TRAVERSAL
// ============================================================================
setGrup('Grup 1: Arsip Paket (.npk) & Keamanan Path Traversal');

uji('Validasi jalur arsip menolak path traversal (../)', () => {
  harusGalat(() => validasiJalurArsip('../berbahaya.txt'), 'Archive Traversal');
  harusGalat(() => validasiJalurArsip('src/../../rahasia.key'), 'Archive Traversal');
  harusGalat(() => validasiJalurArsip('..\\windows\\system32'), 'Archive Traversal');
});

uji('Validasi jalur arsip menolak jalur absolut dan karakter kontrol', () => {
  harusGalat(() => validasiJalurArsip('/etc/passwd'), 'jalur absolut');
  harusGalat(() => validasiJalurArsip('C:\\Windows\\cmd.exe'), 'jalur absolut');
  harusGalat(() => validasiJalurArsip('berkas\0injeksi.txt'), 'null byte');
});

uji('Filter berkas arsip mengabaikan file git, cache, lockfile, dan arsip build', () => {
  harusBenar(apakahHarusDiabaikan('.git/config'));
  harusBenar(apakahHarusDiabaikan('.nusantara/cache/obj.json'));
  harusBenar(apakahHarusDiabaikan('paket.npk'));
  harusBenar(apakahHarusDiabaikan('.env'));
  harusSalah(apakahHarusDiabaikan('src/matematika.nusantara'));
  harusSalah(apakahHarusDiabaikan('nusantara.toml'));
  harusSalah(apakahHarusDiabaikan('README.md'));
});

uji('Pembuatan dan penguraian arsip bundle .npk berhasil', () => {
  const manifest = buatManifestAwal('matematika-ekstra', {
    versi: '1.2.0',
    deskripsi: 'Paket matematika ekstensi untuk NUSANTARA',
    lisensi: 'MIT',
  });

  const daftarBerkas: Record<string, string> = {
    'nusantara.toml': tulisManifest(manifest),
    'src/matematika.nusantara': 'fungsi kuadrat(x: bilangan): bilangan\nmulai\n    kembalikan x * x\nselesai\n',
    'README.md': '# Matematika Ekstra',
    'LICENSE': 'MIT License',
  };

  const arsip = buatArsipPaket(manifest, daftarBerkas);
  samaDengan(arsip.header.format, 'nusantara-npk-v1');
  samaDengan(arsip.header.nama, 'matematika-ekstra');
  samaDengan(arsip.header.versi, '1.2.0');
  samaDengan(arsip.header.totalBerkas, 4);
  harusBenar(arsip.checksum.startsWith('sha256-'), 'Checksum harus berformat sha256-...');

  // Urai kembali arsip serial
  const hasilUrai = uraiArsipPaket(arsip.kontenSerial);
  samaDengan(hasilUrai.header.nama, 'matematika-ekstra');
  samaDengan(hasilUrai.header.versi, '1.2.0');
  harusBenar(hasilUrai.berkas['src/matematika.nusantara'].includes('fungsi kuadrat'));
  samaDengan(hasilUrai.checksum, arsip.checksum);
});

uji('Ekstraksi arsip ke sistem berkas memori', () => {
  const memori = new PembacaBerkasMemori();
  const manifest = buatManifestAwal('util-string', { versi: '0.5.0' });
  const berkas = {
    'nusantara.toml': tulisManifest(manifest),
    'src/string.nusantara': 'fungsi kapital(s: teks): teks\nmulai\n    kembalikan s\nselesai\n',
  };
  const arsip = buatArsipPaket(manifest, berkas);

  ekstrakArsipPaket(arsip, memori, '/tujuan/paket');
  harusBenar(memori.apakahAda('/tujuan/paket/nusantara.toml'));
  harusBenar(memori.apakahAda('/tujuan/paket/src/string.nusantara'));
  samaDengan(memori.baca('/tujuan/paket/src/string.nusantara'), berkas['src/string.nusantara']);
});

// ============================================================================
// GRUP 2: INTEGRITAS & CHECKSUM KRIPTOGRAFIS SHA-256
// ============================================================================
setGrup('Grup 2: Integritas & Checksum SHA-256');

uji('Deteksi manipulasi data arsip (Tamper detection)', () => {
  const manifest = buatManifestAwal('aman', { versi: '1.0.0' });
  const arsip = buatArsipPaket(manifest, {
    'nusantara.toml': tulisManifest(manifest),
    'src/utama.nusantara': 'tampilkan("aman")\n',
  });

  // Manipulasi isi berkas di serial JSON tanpa memperbarui checksum
  const data = JSON.parse(arsip.kontenSerial);
  data.berkas['src/utama.nusantara'] = 'tampilkan("bobol")\n';
  const kontenPalsu = JSON.stringify(data);

  harusGalat(() => {
    uraiArsipPaket(kontenPalsu);
  }, 'Verifikasi integritas arsip gagal');
});

// ============================================================================
// GRUP 3: MESIN VALIDASI PAKET (PACKAGE VALIDATION ENGINE)
// ============================================================================
setGrup('Grup 3: Validasi Paket NUSANTARA');

uji('Validator paket meluluskan paket yang lengkap, valid, dan lulus test', () => {
  const memori = new PembacaBerkasMemori();
  memori.tulisBerkas(
    '/proyek/matematika/nusantara.toml',
    `[nusantara]
nama = "matematika"
versi = "1.0.0"
deskripsi = "Pustaka matematika"
lisensi = "MIT"
`
  );
  memori.tulisBerkas(
    '/proyek/matematika/src/matematika.nusantara',
    `fungsi tambah(a: bilangan, b: bilangan): bilangan
mulai
    kembalikan a + b
selesai
`
  );
  memori.tulisBerkas(
    '/proyek/matematika/tests/matematika.uji.nusantara',
    `pastikan(benar)
pastikan_sama(2 + 3, 5)
`
  );
  memori.tulisBerkas('/proyek/matematika/README.md', '# Matematika\n');

  const validator = new ValidatorPaket(memori);
  const laporan = validator.validasi('/proyek/matematika');

  harusBenar(laporan.valid, `Harus valid, galat: ${laporan.daftarGalat.join(', ')}`);
  samaDengan(laporan.nama, 'matematika');
  samaDengan(laporan.versi, '1.0.0');
  samaDengan(laporan.totalBerkasSumber, 1);
  samaDengan(laporan.totalUji, 1);
  samaDengan(laporan.daftarGalat.length, 0);
});

uji('Validator paket menolak nama paket tidak valid atau semver malformed', () => {
  const memori = new PembacaBerkasMemori();
  memori.tulisBerkas(
    '/proyek/bad-pkg/nusantara.toml',
    `[nusantara]
nama = "Paket_Huruf_Besar"
versi = "bukan-semver"
deskripsi = "Paket uji"
lisensi = "MIT"
`
  );
  memori.tulisBerkas('/proyek/bad-pkg/src/main.nusantara', 'tampilkan("halo")\n');

  const validator = new ValidatorPaket(memori);
  const laporan = validator.validasi('/proyek/bad-pkg');

  harusSalah(laporan.valid);
  harusBenar(laporan.daftarGalat.some(g => g.includes('huruf kecil') || g.includes('Semantic Versioning')));
});

uji('Validator paket menolak sintaksis kode sumber yang salah', () => {
  const memori = new PembacaBerkasMemori();
  memori.tulisBerkas(
    '/proyek/sintaks-salah/nusantara.toml',
    `[nusantara]
nama = "sintaks-salah"
versi = "0.1.0"
deskripsi = "Uji sintaks salah"
lisensi = "MIT"
`
  );
  memori.tulisBerkas('/proyek/sintaks-salah/src/rusak.nusantara', 'fungsi rusak(\n');

  const validator = new ValidatorPaket(memori);
  const laporan = validator.validasi('/proyek/sintaks-salah');

  harusSalah(laporan.valid);
  harusBenar(laporan.daftarGalat.some(g => g.includes('Sintaksis') || g.includes('rusak.nusantara')));
});

uji('Validator paket menggagalkan paket jika test suite NUSANTARA gagal', () => {
  const memori = new PembacaBerkasMemori();
  memori.tulisBerkas(
    '/proyek/test-gagal/nusantara.toml',
    `[nusantara]
nama = "test-gagal"
versi = "0.2.0"
deskripsi = "Uji test gagal"
lisensi = "MIT"
`
  );
  memori.tulisBerkas(
    '/proyek/test-gagal/src/logika.nusantara',
    'fungsi benar(): logika\nmulai\n    kembalikan salah\nselesai\n'
  );
  memori.tulisBerkas(
    '/proyek/test-gagal/tests/logika.uji.nusantara',
    'pastikan(1 == 2, "1 harus sama dengan 2")\n'
  );

  const validator = new ValidatorPaket(memori);
  const laporan = validator.validasi('/proyek/test-gagal');

  harusSalah(laporan.valid);
  harusBenar(laporan.daftarGalat.some(g => g.includes('Pengujian') || g.includes('gagal')));
});

uji('Validator paket mendeteksi kebocoran kredensial rahasia / api key', () => {
  const memori = new PembacaBerkasMemori();
  memori.tulisBerkas(
    '/proyek/bocor/nusantara.toml',
    `[nusantara]
nama = "bocor"
versi = "0.1.0"
deskripsi = "Uji kebocoran"
lisensi = "MIT"
`
  );
  memori.tulisBerkas('/proyek/bocor/src/kunci.nusantara', 'variabel rahasia = "ghp_1234567890abcdef1234567890abcdef"\n');

  const validator = new ValidatorPaket(memori);
  const laporan = validator.validasi('/proyek/bocor');

  harusSalah(laporan.valid);
  harusBenar(laporan.daftarGalat.some(g => g.includes('kredensial') || g.includes('rahasia')));
});

// ============================================================================
// GRUP 4: REGISTRI LOKAL & IMMUTABILITY ATURAN RILIS
// ============================================================================
setGrup('Grup 4: Registri Lokal & Aturan Immutabilitas');

uji('Penerbitan paket ke Registri Lokal dan pemeriksaan direktori registri', () => {
  const memori = new PembacaBerkasMemori();
  const registri = new RegistriLokal({
    pembacaBerkas: memori,
    direktoriBasis: '/registri-lokal',
  });

  const manifest = buatManifestAwal('kalkulator', {
    versi: '1.0.0',
    deskripsi: 'Paket kalkulator ilmiah',
    lisensi: 'Apache-2.0',
    penulis: 'Tim Nusantara',
  });
  const arsip = buatArsipPaket(manifest, {
    'nusantara.toml': tulisManifest(manifest),
    'src/kalkulator.nusantara': 'fungsi tambah(a: bilangan, b: bilangan): bilangan\nmulai\n    kembalikan a + b\nselesai\n',
  });

  const hasil = registri.terbitkan(arsip);
  harusBenar(hasil.sukses);
  samaDengan(hasil.nama, 'kalkulator');
  samaDengan(hasil.versi, '1.0.0');

  // Periksa berkas fisik di registri
  harusBenar(memori.apakahAda('/registri-lokal/index.json'));
  harusBenar(memori.apakahAda('/registri-lokal/metadata/kalkulator.json'));
  harusBenar(memori.apakahAda('/registri-lokal/packages/kalkulator/kalkulator-1.0.0.npk'));
});

uji('Registri menolak penerbitan ulang versi yang sama (Immutabilitas Release)', () => {
  const memori = new PembacaBerkasMemori();
  const registri = new RegistriLokal({ pembacaBerkas: memori, direktoriBasis: '/registri' });

  const manifest = buatManifestAwal('pustaka-uji', { versi: '1.0.0' });
  const arsip = buatArsipPaket(manifest, { 'nusantara.toml': tulisManifest(manifest) });

  registri.terbitkan(arsip);

  // Coba terbitkan lagi versi 1.0.0 yang sama
  harusGalat(() => {
    registri.terbitkan(arsip);
  }, 'sudah pernah diterbitkan');
});

uji('Registri mendukung banyak versi berbeda secara urut SemVer', () => {
  const memori = new PembacaBerkasMemori();
  const registri = new RegistriLokal({ pembacaBerkas: memori, direktoriBasis: '/registri' });

  const m1 = buatManifestAwal('logger', { versi: '1.0.0' });
  const m11 = buatManifestAwal('logger', { versi: '1.1.0' });
  const m2 = buatManifestAwal('logger', { versi: '2.0.0' });

  registri.terbitkan(buatArsipPaket(m1, { 'nusantara.toml': tulisManifest(m1) }));
  registri.terbitkan(buatArsipPaket(m2, { 'nusantara.toml': tulisManifest(m2) }));
  registri.terbitkan(buatArsipPaket(m11, { 'nusantara.toml': tulisManifest(m11) }));

  const meta = registri.dapatkanMetadata('logger');
  harusBenar(meta !== null);
  samaDengan(meta!.versiTerbaru, '2.0.0');
  samaDengan(Object.keys(meta!.daftarVersi).length, 3);
  harusBenar(memori.apakahAda('/registri/packages/logger/logger-1.0.0.npk'));
  harusBenar(memori.apakahAda('/registri/packages/logger/logger-1.1.0.npk'));
  harusBenar(memori.apakahAda('/registri/packages/logger/logger-2.0.0.npk'));
});

// ============================================================================
// GRUP 5: PENCARIAN & METADATA REGISTRI
// ============================================================================
setGrup('Grup 5: Pencarian & Metadata Registri');

uji('Pencarian paket berdasarkan nama, kata kunci, dan deskripsi', () => {
  const memori = new PembacaBerkasMemori();
  const registri = new RegistriLokal({ pembacaBerkas: memori, direktoriBasis: '/registri' });

  const m1 = buatManifestAwal('matematika-dasar', {
    versi: '1.0.0',
    deskripsi: 'Kumpulan fungsi aritmatika dan aljabar',
  });
  const m2 = buatManifestAwal('pengolah-kata', {
    versi: '0.9.0',
    deskripsi: 'Utilitas manipulasi teks dan string',
  });

  registri.terbitkan(buatArsipPaket(m1, { 'nusantara.toml': tulisManifest(m1) }));
  registri.terbitkan(buatArsipPaket(m2, { 'nusantara.toml': tulisManifest(m2) }));

  // Cari 'matematika'
  const hasilMate = registri.cari('matematika');
  samaDengan(hasilMate.length, 1);
  samaDengan(hasilMate[0].nama, 'matematika-dasar');

  // Cari 'teks' (ada di deskripsi pengolah-kata)
  const hasilTeks = registri.cari('teks');
  samaDengan(hasilTeks.length, 1);
  samaDengan(hasilTeks[0].nama, 'pengolah-kata');

  // Kueri tidak ditemukan
  const hasilKosong = registri.cari('kecerdasan-buatan-xyz');
  samaDengan(hasilKosong.length, 0);
});

// ============================================================================
// GRUP 6: PEMASANGAN PAKET DARI REGISTRI LOKAL & CACHE OFFLINE
// ============================================================================
setGrup('Grup 6: Instalasi Paket & Cache');

uji('Pemasangan paket dari Registri Lokal ke Proyek NUSANTARA', () => {
  const memori = new PembacaBerkasMemori();
  const registri = new RegistriLokal({ pembacaBerkas: memori, direktoriBasis: '/registri' });

  // 1. Publikasikan paket dependensi 'aritmatika'
  const manifestDep = buatManifestAwal('aritmatika', {
    versi: '1.0.0',
    deskripsi: 'Modul aritmatika',
    lisensi: 'MIT',
  });
  registri.terbitkan(
    buatArsipPaket(manifestDep, {
      'nusantara.toml': tulisManifest(manifestDep),
      'src/aritmatika.nusantara': 'fungsi kali(a: bilangan, b: bilangan): bilangan\nmulai\n    kembalikan a * b\nselesai\n',
    })
  );

  // 2. Buat proyek utama yang akan menginstal dependensi
  memori.tulisBerkas(
    '/proyekku/nusantara.toml',
    `[nusantara]
nama = "proyekku"
versi = "0.1.0"
deskripsi = "Aplikasi proyekku"
lisensi = "MIT"

[dependensi]
`
  );

  const pengelola = new PengelolaPaket({
    direktoriProyek: '/proyekku',
    pembacaBerkas: memori,
    registriLokal: registri,
  });

  const hasilPasang = pengelola.pasangPaket('aritmatika');
  harusBenar(hasilPasang.sukses);

  // Verifikasi paket terpasang di .nusantara/paket/aritmatika/
  harusBenar(memori.apakahAda('/proyekku/.nusantara/paket/aritmatika/nusantara.toml'));
  harusBenar(memori.apakahAda('/proyekku/.nusantara/paket/aritmatika/src/aritmatika.nusantara'));

  // Verifikasi nusantara.toml proyek diperbarui
  const manifestProyek = bacaManifest(memori.baca('/proyekku/nusantara.toml'));
  samaDengan(manifestProyek.dependensi['aritmatika'], '^1.0.0');

  // Verifikasi nusantara.lock diperbarui dengan checksum integritas
  const lockProyek = bacaLock(memori.baca('/proyekku/nusantara.lock'));
  const entriAritmatika = lockProyek.paket.find(p => p.nama === 'aritmatika');
  harusBenar(entriAritmatika !== undefined);
  samaDengan(entriAritmatika!.versi, '1.0.0');
  harusBenar(entriAritmatika!.integritas!.startsWith('sha256-'));
});

uji('Pemasangan paket dalam mode offline menggunakan cache', () => {
  const memori = new PembacaBerkasMemori();
  const registri = new RegistriLokal({ pembacaBerkas: memori, direktoriBasis: '/registri' });

  const manifest = buatManifestAwal('cache-pkg', {
    versi: '1.0.0',
    deskripsi: 'Paket cache offline',
    lisensi: 'MIT',
  });
  registri.terbitkan(
    buatArsipPaket(manifest, {
      'nusantara.toml': tulisManifest(manifest),
      'src/utama.nusantara': 'tampilkan("dari cache")\n',
    })
  );

  memori.tulisBerkas(
    '/app/nusantara.toml',
    `[nusantara]
nama = "app"
versi = "1.0.0"
deskripsi = "Aplikasi cache"
lisensi = "MIT"
`
  );

  const pengelola = new PengelolaPaket({
    direktoriProyek: '/app',
    pembacaBerkas: memori,
    registriLokal: registri,
  });

  // Pasang pertama (mengisi cache)
  pengelola.pasangPaket('cache-pkg');

  // Pasang kedua dengan opsi offline: true
  const hasilOffline = pengelola.pasangPaket('cache-pkg', { offline: true });
  harusBenar(hasilOffline.sukses);
  harusBenar(memori.apakahAda('/app/.nusantara/paket/cache-pkg/src/utama.nusantara'));
});

// ============================================================================
// GRUP 7: ABSTRAKSI REGISTRI JARAK JAUH (REMOTE REGISTRY CLIENT)
// ============================================================================
setGrup('Grup 7: Abstraksi Registri Jarak Jauh');

uji('RegistriJarakJauh membuat konfigurasi token dan memformat endpoint', () => {
  const remote = new RegistriJarakJauh({
    urlBasis: 'https://registri.nusantara-lang.org/api/v1',
    token: 'nusa_token_secret_123',
  });

  samaDengan(remote.nama, 'registri-jarak-jauh');
  samaDengan(remote.urlBasis, 'https://registri.nusantara-lang.org/api/v1');
});

uji('RegistriJarakJauh menangani galat jaringan secara aman', async () => {
  const remote = new RegistriJarakJauh({
    urlBasis: 'http://127.0.0.1:54321/tidak-ada-server',
    waktuTungguMs: 100,
  });

  try {
    await remote.dapatkanMetadata('paket-apapun');
  } catch (err: any) {
    harusBenar(err.message.includes('jaringan') || err.message.includes('fetch') || err.message.includes('koneksi'));
  }
});

// ============================================================================
// GRUP 8: INTEGRASI CLI & ALUR KERJA (BANGUN, CEK, TERBIT, CARI, INFO, PASANG)
// ============================================================================
setGrup('Grup 8: Integrasi CLI NUSANTARA');

uji("CLI 'nusantara versi' menampilkan v0.22.0 dan Package Ecosystem", () => {
  const logOutputs: string[] = [];
  const memori = new PembacaBerkasMemori();
  const cli = new NusantaraCLI({
    pembaca: memori,
    penulisLog: msg => logOutputs.push(msg),
  });

  const kode = cli.jalankan(['versi']);
  samaDengan(kode, 0);
  const out = logOutputs.join('\n');
  harusBenar(out.includes('v0.22.0'), `Harus mengandung v0.22.0, output: ${out}`);
  harusBenar(out.includes('Package Ecosystem & Registry'));
});

uji("CLI 'nusantara paket buat' dan 'nusantara paket cek'", () => {
  const memori = new PembacaBerkasMemori();
  const logOutputs: string[] = [];
  const pengelola = new PengelolaPaket({
    direktoriProyek: '/workspace',
    pembacaBerkas: memori,
  });
  const cli = new NusantaraCLI({
    pembaca: memori,
    pengelola: pengelola,
    penulisLog: msg => logOutputs.push(msg),
  });

  // 1. Buat paket
  const kodeBuat = cli.jalankan(['paket', 'buat', 'proyek-baru']);
  samaDengan(kodeBuat, 0);
  harusBenar(memori.apakahAda('/workspace/proyek-baru/nusantara.toml'));

  // 2. Cek paket
  const kodeCek = cli.jalankan(['paket', 'cek', '/workspace/proyek-baru']);
  samaDengan(kodeCek, 0);
  harusBenar(logOutputs.some(l => l.includes('[✓ VALID]')));
});

uji("CLI 'nusantara paket bangun' dan 'nusantara paket terbit'", () => {
  const memori = new PembacaBerkasMemori();
  const logOutputs: string[] = [];
  const registri = new RegistriLokal({ pembacaBerkas: memori, direktoriBasis: '/registri' });
  const pengelola = new PengelolaPaket({
    direktoriProyek: '/proyek-uji',
    pembacaBerkas: memori,
    registriLokal: registri,
  });
  const cli = new NusantaraCLI({
    pembaca: memori,
    pengelola: pengelola,
    penulisLog: msg => logOutputs.push(msg),
  });

  memori.tulisBerkas(
    '/proyek-uji/nusantara.toml',
    `[nusantara]
nama = "aljabar"
versi = "1.0.0"
deskripsi = "Pustaka aljabar linier"
lisensi = "MIT"
`
  );
  memori.tulisBerkas(
    '/proyek-uji/src/aljabar.nusantara',
    'fungsi titik(a: bilangan, b: bilangan): bilangan\nmulai\n    kembalikan a * b\nselesai\n'
  );
  memori.tulisBerkas('/proyek-uji/README.md', '# Aljabar\n');

  // Bangun arsip (.npk)
  const kodeBangun = cli.jalankan(['paket', 'bangun']);
  samaDengan(kodeBangun, 0);
  harusBenar(memori.apakahAda('/proyek-uji/.nusantara/dist/aljabar-1.0.0.npk'));

  // Terbitkan ke registri
  const kodeTerbit = cli.jalankan(['paket', 'terbit']);
  samaDengan(kodeTerbit, 0);
  harusBenar(memori.apakahAda('/registri/metadata/aljabar.json'));
});

uji("CLI 'nusantara paket cari' dan 'nusantara paket info'", () => {
  const memori = new PembacaBerkasMemori();
  const logOutputs: string[] = [];
  const registri = new RegistriLokal({ pembacaBerkas: memori, direktoriBasis: '/registri' });

  // Publikasikan paket ke registri
  const manifest = buatManifestAwal('fisika', {
    versi: '2.1.0',
    deskripsi: 'Simulasi mekanika fisika',
    lisensi: 'MIT',
    penulis: 'Albert',
  });
  registri.terbitkan(
    buatArsipPaket(manifest, {
      'nusantara.toml': tulisManifest(manifest),
      'README.md': '# Fisika\n',
    })
  );

  const pengelola = new PengelolaPaket({
    direktoriProyek: '/client',
    pembacaBerkas: memori,
    registriLokal: registri,
  });
  const cli = new NusantaraCLI({
    pembaca: memori,
    pengelola: pengelola,
    penulisLog: msg => logOutputs.push(msg),
  });

  // Cari
  const kodeCari = cli.jalankan(['paket', 'cari', 'fisika']);
  samaDengan(kodeCari, 0);
  harusBenar(logOutputs.some(l => l.includes('fisika') && l.includes('2.1.0')));

  // Info
  logOutputs.length = 0;
  const kodeInfo = cli.jalankan(['paket', 'info', 'fisika']);
  samaDengan(kodeInfo, 0);
  harusBenar(logOutputs.some(l => l.includes('Albert')));
  harusBenar(logOutputs.some(l => l.includes('SHA-256')));
});

uji("CLI 'nusantara paket pasang' menginstal paket dari registri", () => {
  const memori = new PembacaBerkasMemori();
  const logOutputs: string[] = [];
  const registri = new RegistriLokal({ pembacaBerkas: memori, direktoriBasis: '/registri' });

  // Publikasikan paket 'grafika'
  const manifestGrafika = buatManifestAwal('grafika', {
    versi: '1.0.0',
    deskripsi: 'Pustaka grafika',
    lisensi: 'MIT',
  });
  registri.terbitkan(
    buatArsipPaket(manifestGrafika, {
      'nusantara.toml': tulisManifest(manifestGrafika),
      'src/grafika.nusantara': 'fungsi gambar(): bilangan\nmulai\n    kembalikan 1\nselesai\n',
    })
  );

  memori.tulisBerkas(
    '/app/nusantara.toml',
    `[nusantara]
nama = "app"
versi = "0.1.0"
deskripsi = "Aplikasi grafika"
lisensi = "MIT"

[dependensi]
`
  );

  const pengelola = new PengelolaPaket({
    direktoriProyek: '/app',
    pembacaBerkas: memori,
    registriLokal: registri,
  });
  const cli = new NusantaraCLI({
    pembaca: memori,
    pengelola: pengelola,
    penulisLog: msg => logOutputs.push(msg),
  });

  const kodePasang = cli.jalankan(['paket', 'pasang', 'grafika']);
  samaDengan(kodePasang, 0);
  harusBenar(memori.apakahAda('/app/.nusantara/paket/grafika/src/grafika.nusantara'));
  harusBenar(memori.apakahAda('/app/nusantara.lock'));
});

// ============================================================================
// RINGKASAN HASIL PENGUJIAN
// ============================================================================
setTimeout(() => {
  const total = daftarHasil.length;
  const lulus = daftarHasil.filter(h => h.lulus).length;
  const gagal = total - lulus;

  console.log('\n============================================================');
  console.log(`RINGKASAN PENGUJIAN PHASE 22: PACKAGE ECOSYSTEM & REGISTRY`);
  console.log(`Total Pengujian : ${total}`);
  console.log(`Lulus           : ${lulus}`);
  console.log(`Gagal           : ${gagal}`);
  console.log('============================================================\n');

  if (gagal > 0) {
    console.error('Pengujian Phase 22 GAGAL!');
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    }
  } else {
    console.log('Seluruh pengujian Phase 22 LULUS DENGAN SEMPURNA! (100% Pass)');
  }
}, 50);
