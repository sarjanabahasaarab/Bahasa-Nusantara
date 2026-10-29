/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rangkaian Pengujian Resmi NUSANTARA CLI Application Generator (Phase 33)
 * Target Milestone: v0.33.0
 */

import {
  validasiNamaProyek,
  validasiJalurTujuan,
  periksaJalurBerkasAman,
  renderKontenTemplate,
  kePascalCase,
  keSnakeCase,
  TemplateRegistry,
  ValidatorProyek,
  ProjectGenerator,
} from '../../src/generator';
import { PembacaBerkasMemori } from '../../src/modul/pembacaBerkas';
import { NusantaraCLI } from '../../src/paket/cli';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { bacaManifest } from '../../src/paket/manifest';
import { VERSI_NUSANTARA } from '../../src/konstanta/versi';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;

function uji(nama: string, fn: () => void): void {
  totalUji++;
  try {
    fn();
    totalLulus++;
    console.log(`  [✓ LULUS] ${nama}`);
  } catch (err: any) {
    totalGagal++;
    console.error(`  [✗ GAGAL] ${nama}`);
    console.error(`            ${err.message}`);
  }
}

function samaDengan<T>(aktual: T, diharapkan: T, pesan?: string): void {
  if (aktual !== diharapkan) {
    throw new Error(
      `${pesan || 'Nilai tidak sama'}: ditemukan '${aktual}', diharapkan '${diharapkan}'`
    );
  }
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) {
    throw new Error(`Penegasan gagal: ${pesan}`);
  }
}

console.log('=============================================================================');
console.log('PENGUJIAN KOMPREHENSIF CLI APPLICATION GENERATOR (PHASE 33) — v0.33.0');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// GRUP 1: Validasi Nama Proyek
// -----------------------------------------------------------------------------
console.log('=== [GRUP 1: Validasi Nama Proyek & Keamanan Reserved Name / Traversal] ===');

uji('1.1 Menolak nama proyek kosong atau whitespace', () => {
  const hasil1 = validasiNamaProyek('');
  pastikan(!hasil1.valid, 'Nama kosong harus ditolak');

  const hasil2 = validasiNamaProyek('   ');
  pastikan(!hasil2.valid, 'Whitespace harus ditolak');
});

uji('1.2 Menolak spasi, tab, dan newline dalam nama proyek', () => {
  const hasilSpasi = validasiNamaProyek('aplikasi saya');
  pastikan(!hasilSpasi.valid, 'Spasi harus ditolak');
  pastikan(hasilSpasi.pesan!.includes('tidak boleh mengandung spasi'), 'Pesan harus informatif');

  const hasilTab = validasiNamaProyek('aplikasi\tsaya');
  pastikan(!hasilTab.valid, 'Tab harus ditolak');
});

uji('1.3 Menolak path traversal dan pemisah direktori', () => {
  const kasus = ['../proyek', 'proyek/jahat', 'proyek\\jahat', '..', '.proyek', 'proyek.'];
  for (const k of kasus) {
    const hasil = validasiNamaProyek(k);
    pastikan(!hasil.valid, `Nama berbahaya '${k}' harus ditolak`);
    pastikan(hasil.pesan!.includes('path traversal') || hasil.pesan!.includes('konvensi'), 'Pesan harus menjelaskan traversal');
  }
});

uji('1.4 Menolak nama tereservasi sistem operasi (Windows & internal)', () => {
  const tereservasi = ['con', 'CON', 'prn', 'aux', 'nul', 'com1', 'lpt1', 'node_modules', 'nusantara'];
  for (const t of tereservasi) {
    const hasil = validasiNamaProyek(t);
    pastikan(!hasil.valid, `Nama tereservasi '${t}' harus ditolak`);
    pastikan(hasil.pesan!.includes('tereservasi sistem'), `Pesan untuk '${t}' harus menyebut reserved name`);
  }
});

uji('1.5 Menerima nama proyek yang sah dan mengembalikan nama bersih', () => {
  const sah = ['aplikasi-saya', 'web_server', 'api2026', 'nusantara-proyek-keren'];
  for (const s of sah) {
    const hasil = validasiNamaProyek(s);
    pastikan(hasil.valid, `Nama '${s}' harus diterima`);
    samaDengan(hasil.namaBersih, s.toLowerCase());
  }
});

// -----------------------------------------------------------------------------
// GRUP 2: Validasi Jalur Tujuan & Keamanan Sistem Berkas
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 2: Validasi Jalur Tujuan & Keamanan Direktori] ===');

uji('2.1 Menolak direktori target sistem berbahaya', () => {
  const fs = new PembacaBerkasMemori({}, '/');
  const hasil = validasiJalurTujuan(fs, '/', 'etc');
  pastikan(!hasil.valid, 'Direktori /etc harus dilarang');
  pastikan(hasil.pesan!.includes('dilarang'), 'Pesan larangan direktori sistem');
});

uji('2.2 Menolak penimpaan direktori target yang sudah ada dan tidak kosong tanpa force', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/ada/berkas.txt': 'konten',
  }, '/proyek');

  const hasil = validasiJalurTujuan(fs, '/proyek', 'ada', { force: false });
  pastikan(!hasil.valid, 'Direktori non-kosong harus ditolak tanpa force');
  pastikan(hasil.pesan!.includes('--force'), 'Harus menyarankan flag --force');
});

uji('2.3 Mengizinkan penimpaan direktori non-kosong jika opsi force bernilai benar', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/ada/berkas.txt': 'konten lama',
  }, '/proyek');

  const hasil = validasiJalurTujuan(fs, '/proyek', 'ada', { force: true });
  pastikan(hasil.valid, 'Direktori boleh digunakan jika force: true');
});

uji('2.4 Memblokir berkas template yang mencoba keluar dari batas direktori proyek', () => {
  const fs = new PembacaBerkasMemori({}, '/proyek');
  let tertolak = false;
  try {
    periksaJalurBerkasAman(fs, '/proyek/app', '../keluar.txt');
  } catch (err: any) {
    tertolak = true;
    pastikan(err.message.includes('path traversal'), 'Harus mendeteksi traversal');
  }
  pastikan(tertolak, 'Path traversal berkas harus memicu galat');
});

// -----------------------------------------------------------------------------
// GRUP 3: Template Renderer & Whitelist Placeholder
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 3: Template Renderer & Whitelist Placeholder] ===');

uji('3.1 Mengonversi nama ke PascalCase dan snake_case secara benar', () => {
  samaDengan(kePascalCase('aplikasi-saya'), 'AplikasiSaya');
  samaDengan(kePascalCase('web_layanan_api'), 'WebLayananApi');
  samaDengan(keSnakeCase('Aplikasi-Saya'), 'aplikasi_saya');
});

uji('3.2 Merender placeholder whitelisted tanpa mengeksekusi kode berbahaya', () => {
  const templat = 'program {{PASCAL_NAME}}\n// Proyek: {{NAMA_PROYEK}} (v{{VERSI_PROYEK}})\n';
  const konteks = {
    NAMA_PROYEK: 'demo-app',
    PASCAL_NAME: 'DemoApp',
    SNAKE_NAME: 'demo_app',
    DESKRIPSI_PROYEK: 'Aplikasi Demo',
    VERSI_PROYEK: '1.2.3',
    PENULIS: 'Pengembang Nusantara',
    TAHUN: '2026',
    VERSI_NUSANTARA: '0.33.0',
    LISENSI: 'Apache-2.0',
  };

  const hasil = renderKontenTemplate(templat, konteks);
  pastikan(hasil.includes('program DemoApp'), 'Placeholder PASCAL_NAME harus terisi');
  pastikan(hasil.includes('Proyek: demo-app (v1.2.3)'), 'NAMA_PROYEK & VERSI_PROYEK harus terisi');
});

uji('3.3 Menolak placeholder yang tidak terdaftar dalam whitelist', () => {
  const templatIlegal = 'Halo {{KODE_EVAL_BERBAHAYA}}!';
  const konteks: any = {
    NAMA_PROYEK: 'uji',
    KODE_EVAL_BERBAHAYA: 'rm -rf /',
  };

  let tertolak = false;
  try {
    renderKontenTemplate(templatIlegal, konteks);
  } catch (err: any) {
    tertolak = true;
    pastikan(err.message.includes('tidak diizinkan'), 'Harus menolak placeholder non-whitelist');
  }
  pastikan(tertolak, 'Placeholder tidak dikenal harus digagalkan');
});

// -----------------------------------------------------------------------------
// GRUP 4: Template Registry
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 4: Template Registry & Metadata Template] ===');

uji('4.1 Seluruh 6 template resmi terdaftar lengkap dalam registry', () => {
  const registry = new TemplateRegistry();
  const daftarId = registry.dapatkanDaftarId();
  const diharapkan = ['basic', 'library', 'web', 'api', 'database', 'console'];

  for (const id of diharapkan) {
    pastikan(daftarId.includes(id), `Template '${id}' harus terdaftar`);
    const t = registry.dapatkan(id);
    pastikan(t !== undefined, `Template '${id}' harus memiliki definisi`);
    pastikan(t!.status === 'siap', `Template '${id}' harus bertaraf siap`);
    pastikan(t!.berkas.length > 0, `Template '${id}' harus memiliki berkas template`);
  }
});

uji('4.2 Setiap template menyertakan metadata runtime dan petunjuk jalankan', () => {
  const registry = new TemplateRegistry();
  const webTmpl = registry.dapatkan('web')!;
  samaDengan(webTmpl.kategori, 'layanan');
  pastikan(webTmpl.petunjukJalankan.length > 0, 'Harus ada petunjuk eksekusi');
  pastikan(webTmpl.persyaratanRuntime.includes('serverHTTP'), 'Harus menyertakan serverHTTP');
});

// -----------------------------------------------------------------------------
// GRUP 5: Eksekusi Generator Proyek
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 5: Eksekusi Generator Proyek] ===');

uji('5.1 Membuat proyek lengkap dengan template basic', () => {
  const fs = new PembacaBerkasMemori({}, '/proyek');
  const generator = new ProjectGenerator(fs);

  const hasil = generator.buatProyek({
    namaProyek: 'aplikasi-perdana',
    templateId: 'basic',
    direktoriBasis: '/proyek',
    deskripsi: 'Aplikasi Pertama Saya',
    penulis: 'Nusantara Dev',
  });

  pastikan(hasil.sukses, `Pembuatan proyek harus sukses: ${hasil.pesan}`);
  samaDengan(hasil.templateDigunakan, 'basic');
  samaDengan(hasil.namaProyek, 'aplikasi-perdana');

  // Periksa berkas-berkas yang tercipta
  pastikan(fs.apakahAda('/proyek/aplikasi-perdana/src/utama.nusantara'), 'src/utama.nusantara harus tercipta');
  pastikan(fs.apakahAda('/proyek/aplikasi-perdana/nusantara.toml'), 'nusantara.toml harus tercipta');
  pastikan(fs.apakahAda('/proyek/aplikasi-perdana/nusantara-project.json'), 'nusantara-project.json harus tercipta');
  pastikan(fs.apakahAda('/proyek/aplikasi-perdana/README.md'), 'README.md harus tercipta');

  // Periksa isi toml
  const toml = fs.baca('/proyek/aplikasi-perdana/nusantara.toml');
  const manifest = bacaManifest(toml);
  samaDengan(manifest.nusantara.nama, 'aplikasi-perdana');
  samaDengan(manifest.nusantara.versi, '0.1.0');

  // Periksa isi kode sumber
  const kode = fs.baca('/proyek/aplikasi-perdana/src/utama.nusantara');
  pastikan(kode.includes('program AplikasiPerdana'), 'Program name harus di-PascalCase');
  pastikan(kode.includes('aplikasi-perdana'), 'Kode harus menyertakan nama proyek');
});

uji('5.2 Membuat proyek menggunakan setiap template terdaftar', () => {
  const templates = ['library', 'web', 'api', 'database', 'console'];
  for (const t of templates) {
    const fs = new PembacaBerkasMemori({}, '/ruang-kerja');
    const generator = new ProjectGenerator(fs);

    const hasil = generator.buatProyek({
      namaProyek: `proyek-${t}`,
      templateId: t,
      direktoriBasis: '/ruang-kerja',
    });

    pastikan(hasil.sukses, `Pembuatan proyek '${t}' harus sukses: ${hasil.pesan}`);
    pastikan(fs.apakahAda(`/ruang-kerja/proyek-${t}/nusantara.toml`), 'nusantara.toml harus ada');
    pastikan(fs.apakahAda(`/ruang-kerja/proyek-${t}/nusantara-project.json`), 'nusantara-project.json harus ada');
  }
});

uji('5.3 Pembersihan berkas pada saat terjadi kegagalan (Rollback / Safe Cleanup)', () => {
  const fs = new PembacaBerkasMemori({}, '/proyek');
  const generator = new ProjectGenerator(fs);

  // Buat kegagalan dengan memodifikasi template agar memiliki placeholder ilegal
  const registry = generator.dapatkanRegistry();
  registry.daftarkan({
    id: 'rusak',
    nama: 'Template Cacat',
    kategori: 'aplikasi',
    deskripsi: 'Uji Rollback',
    versi: '1.0.0',
    versiMinimumNusantara: '0.1.0',
    persyaratanRuntime: [],
    dependensi: {},
    status: 'siap',
    petunjukJalankan: [],
    batasan: [],
    berkas: [
      { jalur: 'berkas1.txt', konten: 'isi aman' },
      { jalur: 'berkas2.txt', konten: 'isi dengan {{PLACEHOLDER_ILEGAL}}' },
    ],
  });

  const hasil = generator.buatProyek({
    namaProyek: 'proyek-gagal',
    templateId: 'rusak',
    direktoriBasis: '/proyek',
  });

  pastikan(!hasil.sukses, 'Proyek cacat harus gagal');
  pastikan(!fs.apakahAda('/proyek/proyek-gagal/berkas1.txt'), 'berkas1.txt yang sempat tertulis harus dibersihkan secara aman');
});

// -----------------------------------------------------------------------------
// GRUP 6: Validator Proyek (ValidatorProyek & nusantara check)
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 6: Validator Proyek] ===');

uji('6.1 ValidatorProyek memvalidasi proyek yang sehat', () => {
  const fs = new PembacaBerkasMemori({}, '/proyek');
  const generator = new ProjectGenerator(fs);
  generator.buatProyek({ namaProyek: 'proyek-sehat', templateId: 'basic', direktoriBasis: '/proyek' });

  const validator = new ValidatorProyek(fs);
  const hasil = validator.periksa('/proyek/proyek-sehat');
  pastikan(hasil.valid, 'Proyek sehat harus dinyatakan valid');
  pastikan(hasil.adaManifest, 'Harus mendeteksi manifest');
  pastikan(hasil.adaEntryPoint, 'Harus mendeteksi entry point');
  pastikan(hasil.berkasSumberValid, 'Seluruh berkas sumber harus valid sintaks');
});

uji('6.2 ValidatorProyek menolak direktori tanpa manifest', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/acak/catatan.txt': 'hanya catatan biasa',
  }, '/proyek');

  const validator = new ValidatorProyek(fs);
  const hasil = validator.periksa('/proyek/acak');
  pastikan(!hasil.valid, 'Direktori tanpa manifest harus dinyatakan tidak valid');
  pastikan(!hasil.adaManifest, 'adaManifest harus bernilai false');
});

uji('6.3 ValidatorProyek mendeteksi kesalahan sintaks pada berkas .nusantara', () => {
  const fs = new PembacaBerkasMemori({
    '/proyek/rusak/nusantara.toml': '[nusantara]\nnama = "rusak"\nversi = "0.1.0"\ndeskripsi = "Uji"\nlisensi = "MIT"\n',
    '/proyek/rusak/src/utama.nusantara': 'program IniRusak\nmulai\n    tampilkan(  // Sintaks belum selesai\n',
  }, '/proyek');

  const validator = new ValidatorProyek(fs);
  const hasil = validator.periksa('/proyek/rusak');
  pastikan(!hasil.valid, 'Proyek dengan kesalahan sintaks harus tidak valid');
  pastikan(!hasil.berkasSumberValid, 'berkasSumberValid harus false');
  pastikan(hasil.detail.kesalahanSintaks !== undefined, 'Harus mencantumkan rincian kesalahan sintaks');
});

// -----------------------------------------------------------------------------
// GRUP 7: Integrasi Perintah CLI (nusantara new, templates, check)
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 7: Integrasi Perintah CLI] ===');

uji('7.1 Perintah CLI nusantara new membuat proyek dengan exit code 0', () => {
  const fs = new PembacaBerkasMemori({}, '/workspace');
  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembaca: fs,
    log: (m) => logList.push(m),
    error: (m) => logList.push(m),
  });

  const exitCode = cli.jalankan(['new', 'web-app', '--template', 'web', '--deskripsi', 'Situs Web Baru']);
  samaDengan(exitCode, 0, 'Exit code harus 0');

  const out = logList.join('\n');
  pastikan(out.includes('NUSANTARA Project Generator'), 'Harus menampilkan header generator');
  pastikan(out.includes('web-app'), 'Harus memuat nama proyek');
  pastikan(out.includes('Template    : web'), 'Harus menggunakan template web');
  pastikan(fs.apakahAda('/workspace/web-app/src/utama.nusantara'), 'File sumber web-app harus ada');
});

uji('7.2 Perintah CLI nusantara new tanpa nama proyek gagal dengan exit code 1', () => {
  const fs = new PembacaBerkasMemori({}, '/workspace');
  const errorList: string[] = [];
  const cli = new NusantaraCLI({
    pembaca: fs,
    error: (m) => errorList.push(m),
  });

  const exitCode = cli.jalankan(['new']);
  samaDengan(exitCode, 1, 'Exit code harus 1 saat nama proyek tidak diberikan');
  pastikan(errorList.join('\n').includes('memerlukan argumen <nama-proyek>'), 'Pesan error harus jelas');
});

uji('7.3 Perintah CLI nusantara new menolak template yang tidak dikenal', () => {
  const fs = new PembacaBerkasMemori({}, '/workspace');
  const errorList: string[] = [];
  const cli = new NusantaraCLI({
    pembaca: fs,
    error: (m) => errorList.push(m),
  });

  const exitCode = cli.jalankan(['new', 'proyek-baru', '--template', 'fiktif']);
  samaDengan(exitCode, 1, 'Harus gagal jika template tidak dikenal');
  pastikan(errorList.join('\n').includes("Template 'fiktif' tidak dikenal"), 'Harus menyebutkan template tidak dikenal');
});

uji('7.4 Perintah CLI nusantara templates menampilkan seluruh daftar template', () => {
  const fs = new PembacaBerkasMemori({}, '/workspace');
  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembaca: fs,
    log: (m) => logList.push(m),
  });

  const exitCode = cli.jalankan(['templates']);
  samaDengan(exitCode, 0, 'Exit code templates harus 0');
  const out = logList.join('\n');
  pastikan(out.includes('basic'), 'Daftar harus memuat basic');
  pastikan(out.includes('web'), 'Daftar harus memuat web');
  pastikan(out.includes('api'), 'Daftar harus memuat api');
  pastikan(out.includes('database'), 'Daftar harus memuat database');
  pastikan(out.includes('library'), 'Daftar harus memuat library');
  pastikan(out.includes('console'), 'Daftar harus memuat console');
});

uji('7.5 Perintah CLI nusantara template info menampilkan rincian template', () => {
  const fs = new PembacaBerkasMemori({}, '/workspace');
  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembaca: fs,
    log: (m) => logList.push(m),
  });

  const exitCode = cli.jalankan(['template', 'info', 'database']);
  samaDengan(exitCode, 0, 'Exit code template info harus 0');
  const out = logList.join('\n');
  pastikan(out.includes('INFORMASI TEMPLATE'), 'Harus menampilkan judul informasi');
  pastikan(out.includes('Aplikasi Basis Data & ORM'), 'Harus menampilkan nama template');
  pastikan(out.includes('nusantara db migrasi'), 'Harus menampilkan petunjuk db migrasi');
});

uji('7.6 Perintah CLI nusantara check pada proyek yang baru di-generate', () => {
  const fs = new PembacaBerkasMemori({}, '/workspace');
  const logList: string[] = [];
  const cli = new NusantaraCLI({
    pembaca: fs,
    log: (m) => logList.push(m),
  });

  // Buat proyek dahulu
  cli.jalankan(['new', 'aplikasi-api', '--template', 'api']);

  // Jalankan check pada proyek tersebut
  const exitCode = cli.jalankan(['check', '/workspace/aplikasi-api']);
  samaDengan(exitCode, 0, 'nusantara check harus exit 0 pada proyek yang valid');
  pastikan(logList.join('\n').includes('Proyek valid'), 'Pesan harus menyatakan proyek valid');
});

// -----------------------------------------------------------------------------
// GRUP 8: Eksekusi Kode Nyata Program Hasil Generator
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 8: Eksekusi Kode Nyata Program Hasil Generator] ===');

uji('8.1 Program utama dari template basic dapat dieksekusi oleh Interpreter NUSANTARA', () => {
  const fs = new PembacaBerkasMemori({}, '/workspace');
  const generator = new ProjectGenerator(fs);
  generator.buatProyek({
    namaProyek: 'halo-dunia',
    templateId: 'basic',
    direktoriBasis: '/workspace',
  });

  const kodeSumber = fs.baca('/workspace/halo-dunia/src/utama.nusantara');

  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kodeSumber);

  const output = buffer.dapatkanSeluruhTeks().join('\n');
  pastikan(output.includes('Halo Dunia dari bahasa NUSANTARA!'), 'Harus mencetak salam pembuka');
  pastikan(output.includes('halo-dunia'), 'Harus mencetak nama proyek');
});

uji('8.2 Program utama dari template database dapat dieksekusi dengan ORM dan SQLite', () => {
  const fs = new PembacaBerkasMemori({}, '/workspace');
  const generator = new ProjectGenerator(fs);
  generator.buatProyek({
    namaProyek: 'manajemen-toko',
    templateId: 'database',
    direktoriBasis: '/workspace',
  });

  const kodeSumber = fs.baca('/workspace/manajemen-toko/src/utama.nusantara');

  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kodeSumber);

  const output = buffer.dapatkanSeluruhTeks().join('\n');
  pastikan(output.includes("Menginisialisasi basis data untuk proyek 'manajemen-toko'"), 'Harus menginisialisasi');
  pastikan(output.includes('Total komoditas dalam stok: 2'), 'Harus menemukan 2 komoditas');
  pastikan(output.includes('Komoditas pertama: Kopi Mandailing'), 'Komoditas pertama harus Kopi Mandailing');
});

// -----------------------------------------------------------------------------
// REKAPITULASI
// -----------------------------------------------------------------------------
console.log('\n=============================================================================');
console.log(`HASIL PENGUJIAN PHASE 33: ${totalLulus} Lulus, ${totalGagal} Gagal dari ${totalUji} Uji.`);
console.log('=============================================================================');

if (totalGagal > 0) {
  process.exit(1);
}
