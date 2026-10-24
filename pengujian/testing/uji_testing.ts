/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Penegasan,
  GalatPenegasan,
  PenemuUji,
  PelariUji,
  PelaporKonsol,
  PelaporJSON,
  PengukurCakupan,
  GerbangKualitas,
  DirektoriSementara,
  StatusUji,
  pastikan,
  pastikan_sama,
  pastikan_tidak_sama,
  pastikan_benar,
  pastikan_salah,
  pastikan_galat,
} from '../../src/testing';
import { PembacaBerkasMemori } from '../../src/modul';
import { NusantaraCLI } from '../../src/paket/cli';
import { KodeGalat } from '../../src/diagnostik/kode';

let totalUji = 0;
let ujiBerhasil = 0;
let ujiGagal = 0;

function uji(nama: string, fn: () => void | Promise<void>): void {
  totalUji++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      res
        .then(() => {
          ujiBerhasil++;
          console.log(`  ✓ ${nama}`);
        })
        .catch(err => {
          ujiGagal++;
          console.error(`  ✗ ${nama}: ${err.message || err}`);
        });
    } else {
      ujiBerhasil++;
      console.log(`  ✓ ${nama}`);
    }
  } catch (err: any) {
    ujiGagal++;
    console.error(`  ✗ ${nama}: ${err.message || err}`);
  }
}

function tegaskan(kondisi: boolean, pesan: string): void {
  if (!kondisi) {
    throw new Error(`Penegasan Gagal: ${pesan}`);
  }
}

async function jalankanPengujianTestingFramework(): Promise<void> {
  console.log('=============================================================================');
  console.log('PENGUJIAN TESTING FRAMEWORK & QUALITY SYSTEM BAHASA NUSANTARA (PHASE 21)');
  console.log('Target Milestone: v0.21.0');
  console.log('=============================================================================\n');

  // --- KELOMPOK 1: ASSERTION ENGINE ---
  console.log('--- Kelompok 1: Assertion Engine ---');

  uji('1.1 pastikan() berhasil jika kondisi benar', () => {
    const res = pastikan(true, 'kondisi benar');
    tegaskan(res === true, 'pastikan(true) harus mengembalikan true');
  });

  uji('1.2 pastikan() melempar GalatPenegasan jika kondisi salah', () => {
    let dilempar = false;
    try {
      pastikan(false, 'kondisi harus benar');
    } catch (e: any) {
      dilempar = true;
      tegaskan(e instanceof GalatPenegasan, 'Harus melempar GalatPenegasan');
      tegaskan(e.kodeGalat === KodeGalat.TST_PENEGASAN_GAGAL, 'Kode galat harus TST_PENEGASAN_GAGAL');
    }
    tegaskan(dilempar, 'pastikan(false) harus melempar galat');
  });

  uji('1.3 pastikan_sama() bekerja untuk nilai primitif', () => {
    const res = pastikan_sama(42, 42);
    tegaskan(res === true, 'pastikan_sama angka harus mengembalikan true');
    tegaskan(pastikan_sama('halo', 'halo') === true, 'pastikan_sama teks harus true');
  });

  uji('1.4 pastikan_sama() melempar galat dengan nilai temuan dan ekspektasi jika tidak cocok', () => {
    try {
      pastikan_sama(10, 20, 'Angka berbeda');
      tegaskan(false, 'Seharusnya gagal');
    } catch (e: any) {
      tegaskan(e instanceof GalatPenegasan, 'Harus GalatPenegasan');
      tegaskan(e.ditemukan === 10, 'Nilai ditemukan harus 10');
      tegaskan(e.diharapkan === 20, 'Nilai diharapkan harus 20');
      tegaskan(e.kodeGalat === KodeGalat.TST_TIDAK_SAMA, 'Kode galat harus TST_TIDAK_SAMA');
    }
  });

  uji('1.5 pastikan_sama() bekerja secara rekursif (deep equality) untuk larik dan objek', () => {
    const larik1 = [1, 2, [3, 4]];
    const larik2 = [1, 2, [3, 4]];
    tegaskan(pastikan_sama(larik1, larik2) === true, 'Larik bersarang harus setara');

    const obj1 = { a: 1, b: { c: 'nusantara' } };
    const obj2 = { a: 1, b: { c: 'nusantara' } };
    tegaskan(pastikan_sama(obj1, obj2) === true, 'Objek bersarang harus setara');
  });

  uji('1.6 pastikan_tidak_sama() berhasil jika berbeda dan gagal jika identik', () => {
    tegaskan(pastikan_tidak_sama('merah', 'putih') === true, 'Harus true untuk nilai berbeda');
    let gagal = false;
    try {
      pastikan_tidak_sama(5, 5);
    } catch {
      gagal = true;
    }
    tegaskan(gagal, 'Harus melempar galat jika nilai identik');
  });

  uji('1.7 pastikan_benar() dan pastikan_salah() memvalidasi nilai boolean strictly', () => {
    tegaskan(pastikan_benar(true) === true, 'pastikan_benar(true) harus true');
    tegaskan(pastikan_salah(false) === true, 'pastikan_salah(false) harus true');

    let gagalBenar = false;
    try {
      pastikan_benar(1 as any);
    } catch (e: any) {
      gagalBenar = true;
      tegaskan(e.kodeGalat === KodeGalat.TST_BUKAN_BENAR, 'Harus kode TST_BUKAN_BENAR');
    }
    tegaskan(gagalBenar, 'pastikan_benar(1) harus melempar galat karena 1 bukan boolean true');
  });

  uji('1.8 pastikan_galat() memverifikasi eksepsi fungsi', () => {
    const res = pastikan_galat(() => {
      throw new Error('kesalahan yang disengaja');
    });
    tegaskan(res === true, 'pastikan_galat harus true saat fungsi melempar galat');

    let gagal = false;
    try {
      pastikan_galat(() => {
        // tidak melempar apapun
      });
    } catch {
      gagal = true;
    }
    tegaskan(gagal, 'pastikan_galat harus melempar galat saat fungsi tidak melempar eksepsi');
  });

  // --- KELOMPOK 2: ASSERTION DIAGNOSTICS & FORMATTING ---
  console.log('\n--- Kelompok 2: Assertion Diagnostics & Formatting ---');

  uji('2.1 GalatPenegasan menghasilkan diagnostik terstandar Phase 18', () => {
    const galat = new GalatPenegasan({
      pesan: 'Nilai variabel a tidak sesuai',
      lokasi: { berkas: 'tests/matematika.uji.nusantara', baris: 12, kolom: 4 },
      diharapkan: 100,
      ditemukan: 50,
      kodeGalat: KodeGalat.TST_TIDAK_SAMA,
    });

    const diag = galat.keDiagnostik();
    tegaskan(diag.kode === 'NUS-TST-002', 'Kode diagnostik harus NUS-TST-002');
    tegaskan(diag.rentang.awal.baris === 12, 'Baris awal harus 12');
    tegaskan(diag.rentang.awal.kolom === 4, 'Kolom awal harus 4');
    tegaskan(diag.pesan.includes('Nilai variabel a tidak sesuai'), 'Pesan diagnostik harus termuat');
  });

  uji('2.2 formatLaporanTeks() menampilkan lokasi, diharapkan, dan ditemukan', () => {
    const galat = new GalatPenegasan({
      pesan: 'Penjumlahan meleset',
      lokasi: { berkas: 'tests/uji.nusantara', baris: 5, kolom: 3 },
      diharapkan: 'merah',
      ditemukan: 'biru',
    });
    const teks = galat.formatLaporanTeks();
    tegaskan(teks.includes('tests/uji.nusantara:5:3'), 'Harus menyertakan berkas, baris, kolom');
    tegaskan(teks.includes('Diharapkan: "merah"'), 'Harus menampilkan nilai diharapkan');
    tegaskan(teks.includes('Ditemukan : "biru"'), 'Harus menampilkan nilai ditemukan');
  });

  // --- KELOMPOK 3: TEST DISCOVERY ---
  console.log('\n--- Kelompok 3: Test Discovery ---');

  uji('3.1 PenemuUji menemukan berkas *.uji.nusantara dan *_test.nusantara', () => {
    const memori = new PembacaBerkasMemori({
      'tests/matematika.uji.nusantara': 'pastikan(benar)',
      'tests/sub/string_test.nusantara': 'pastikan(benar)',
      'tests/compat.test.nusantara': 'pastikan(benar)',
      'src/utama.nusantara': 'tampilkan("halo")',
      'tests/catatan.txt': 'dokumen',
    });
    const penemu = new PenemuUji(memori);
    const hasil = penemu.temukan('tests');

    tegaskan(hasil.length === 3, `Ditemukan ${hasil.length} berkas, diharapkan 3`);
    tegaskan(hasil.some(b => b.includes('matematika.uji.nusantara')), 'Harus menemukan *.uji.nusantara');
    tegaskan(hasil.some(b => b.includes('string_test.nusantara')), 'Harus menemukan *_test.nusantara');
    tegaskan(hasil.some(b => b.includes('compat.test.nusantara')), 'Harus menemukan *.test.nusantara');
  });

  uji('3.2 PenemuUji mengabaikan direktori terlarang (node_modules, dist, .git)', () => {
    const memori = new PembacaBerkasMemori({
      'node_modules/paket/uji.uji.nusantara': 'pastikan(benar)',
      'dist/out.uji.nusantara': 'pastikan(benar)',
      '.git/config.uji.nusantara': 'pastikan(benar)',
      'tests/valid.uji.nusantara': 'pastikan(benar)',
    });
    const penemu = new PenemuUji(memori);
    const hasil = penemu.temukan('.');

    tegaskan(hasil.length === 1, `Hanya berkas valid yang ditemukan, didapat: ${hasil.length}`);
    tegaskan(hasil[0].includes('valid.uji.nusantara'), 'Hanya valid.uji.nusantara yang diakui');
  });

  uji('3.3 PenemuUji menyaring berkas tunggal yang valid', () => {
    const memori = new PembacaBerkasMemori({
      'tests/spesifik.uji.nusantara': 'pastikan(benar)',
      'src/bukan_uji.nusantara': 'tampilkan("ok")',
    });
    const penemu = new PenemuUji(memori);
    const hasil = penemu.temukan('tests/spesifik.uji.nusantara');
    tegaskan(hasil.length === 1, 'Harus menemukan target spesifik');
    tegaskan(hasil[0] === 'tests/spesifik.uji.nusantara', 'Jalur berkas harus cocok');
  });

  // --- KELOMPOK 4: ISOLATED TEST RUNNER & TIMEOUT ---
  console.log('\n--- Kelompok 4: Isolated Test Runner & Timeout Protection ---');

  uji('4.1 PelariUji mengeksekusi berkas uji yang sukses secara terisolasi', () => {
    const memori = new PembacaBerkasMemori({
      'tests/sukses.uji.nusantara': `
        definisi x = 10
        pastikan_sama(x + 5, 15)
        pastikan_benar(x > 0)
      `,
    });
    const runner = new PelariUji({ pembaca: memori });
    const ringkasan = runner.jalankanSinkron(['tests/sukses.uji.nusantara']);

    tegaskan(ringkasan.totalUji === 1, 'Total berkas uji harus 1');
    tegaskan(ringkasan.lulus === 1, 'Harus lulus 1');
    tegaskan(ringkasan.gagal === 0, 'Gagal harus 0');
    tegaskan(ringkasan.status === StatusUji.LULUS, 'Status ringkasan harus LULUS');
  });

  uji('4.2 PelariUji menangkap kegagalan penegasan tanpa menghentikan runner', () => {
    const memori = new PembacaBerkasMemori({
      'tests/gagal.uji.nusantara': `
        pastikan_sama(2 + 2, 5, "Perhitungan keliru")
      `,
    });
    const runner = new PelariUji({ pembaca: memori });
    const ringkasan = runner.jalankanSinkron(['tests/gagal.uji.nusantara']);

    tegaskan(ringkasan.lulus === 0, 'Lulus harus 0');
    tegaskan(ringkasan.gagal === 1, 'Gagal harus 1');
    tegaskan(ringkasan.status === StatusUji.GAGAL, 'Status ringkasan harus GAGAL');
    const berkasHasil = ringkasan.berkas![0];
    tegaskan(berkasHasil.daftarGalat.length > 0, 'Daftar galat harus terisi');
    tegaskan(berkasHasil.daftarGalat[0].pesan.includes('Perhitungan keliru'), 'Pesan galat harus sesuai');
  });

  uji('4.3 PelariUji mengisolasi variabel antar berkas uji', () => {
    const memori = new PembacaBerkasMemori({
      'tests/satu.uji.nusantara': `
        definisi skor = 99
        pastikan_sama(skor, 99)
      `,
      'tests/dua.uji.nusantara': `
        # Variabel skor tidak boleh ada di lingkungan ini
        definisi skor = 10
        pastikan_sama(skor, 10)
      `,
    });
    const runner = new PelariUji({ pembaca: memori });
    const ringkasan = runner.jalankanSinkron(['tests/satu.uji.nusantara', 'tests/dua.uji.nusantara']);

    tegaskan(ringkasan.totalUji === 2, 'Harus menguji 2 berkas');
    tegaskan(ringkasan.lulus === 2, 'Kedua berkas harus lulus secara independen');
  });

  uji('4.4 PelariUji menangani galat sintaksis dalam berkas uji', () => {
    const memori = new PembacaBerkasMemori({
      'tests/sintaks_rusak.uji.nusantara': `
        fungsi { rusak
      `,
    });
    const runner = new PelariUji({ pembaca: memori });
    const ringkasan = runner.jalankanSinkron(['tests/sintaks_rusak.uji.nusantara']);

    tegaskan(ringkasan.gagal === 1, 'Harus mencatat sebagai berkas gagal');
    tegaskan(ringkasan.berkas![0].daftarGalat.length > 0, 'Harus mencatat diagnostik sintaks');
  });

  // --- KELOMPOK 5: TEMPORARY DIRECTORY MANAGEMENT ---
  console.log('\n--- Kelompok 5: Temporary Directory Management ---');

  uji('5.1 DirektoriSementara membuat direktori acak yang aman', () => {
    const tempDir = new DirektoriSementara('uji-temp');
    tegaskan(tempDir.apakahAdaDirektori(), 'Direktori sementara harus terbentuk');
    tegaskan(tempDir.jalur.includes('uji-temp'), 'Nama prefix harus tercantum');
    tempDir.bersihkan();
  });

  uji('5.2 DirektoriSementara mendukung penulisan berkas dan pembersihan menyeluruh', () => {
    const tempDir = new DirektoriSementara('uji-tulis');
    tempDir.tulisBerkas('data/info.txt', 'Halo NUSANTARA');
    tegaskan(tempDir.apakahAda('data/info.txt'), 'Berkas di dalam subdirektori harus ada');
    tegaskan(tempDir.bacaBerkas('data/info.txt') === 'Halo NUSANTARA', 'Isi berkas harus sesuai');

    tempDir.bersihkan();
    tegaskan(!tempDir.apakahAdaDirektori(), 'Direktori harus terhapus bersih setelah bersihkan()');
  });

  // --- KELOMPOK 6: REPORTING & FILTERING ---
  console.log('\n--- Kelompok 6: Reporting & Filtering ---');

  uji('6.1 PelaporKonsol menghasilkan teks laporan ringkas dan terformat', () => {
    const ringkasan = {
      totalBerkas: 2,
      totalUji: 2,
      lulus: 2,
      gagal: 0,
      dilewati: 0,
      durasiMs: 15,
      status: StatusUji.LULUS,
      berkas: [
        {
          jalur: 'tests/a.uji.nusantara',
          totalPenegasan: 2,
          penegasanLulus: 2,
          penegasanGagal: 0,
          daftarGalat: [],
          durasiMs: 7,
          status: StatusUji.LULUS,
        },
      ],
    };
    const laporan = PelaporKonsol.format(ringkasan as any, { warna: false });
    tegaskan(laporan.includes('LAPORAN PENGUJIAN OTOMATIS NUSANTARA'), 'Harus ada judul laporan');
    tegaskan(laporan.includes('Lulus     : 2 (100.0%)'), 'Harus menampilkan persentase kelulusan');
  });

  uji('6.2 PelaporJSON menghasilkan format JSON valid dan terstruktur', () => {
    const ringkasan = {
      totalBerkas: 1,
      totalUji: 1,
      lulus: 1,
      gagal: 0,
      dilewati: 0,
      durasiMs: 10,
      status: StatusUji.LULUS,
      berkas: [],
    };
    const jsonStr = PelaporJSON.format(ringkasan as any);
    const obj = JSON.parse(jsonStr);
    tegaskan(obj.skema === 'nusantara.testing.v1', 'Skema harus nusantara.testing.v1');
    tegaskan(obj.status === 'LULUS', 'Status JSON harus LULUS');
  });

  uji('6.3 Opsi filter menyaring berkas berdasarkan kata kunci', () => {
    const memori = new PembacaBerkasMemori({
      'tests/matematika.uji.nusantara': 'pastikan_sama(1+1, 2)',
      'tests/string.uji.nusantara': 'pastikan_sama("a"+"b", "ab")',
    });
    const runner = new PelariUji({ pembaca: memori });
    const ringkasan = runner.jalankanSinkron(
      ['tests/matematika.uji.nusantara', 'tests/string.uji.nusantara'],
      { filter: 'string' }
    );

    tegaskan(ringkasan.totalUji === 1, 'Hanya 1 berkas yang cocok dengan filter string');
    tegaskan(ringkasan.berkas![0].jalur.includes('string.uji.nusantara'), 'Berkas harus string.uji.nusantara');
  });

  // --- KELOMPOK 7: CODE COVERAGE FOUNDATION ---
  console.log('\n--- Kelompok 7: Code Coverage Foundation ---');

  uji('7.1 PengukurCakupan menghitung persentase subsistem NUSANTARA', () => {
    const pengukur = new PengukurCakupan();
    pengukur.catatSentuhan('Sintaks & Lexer');
    pengukur.catatSentuhan('Parser & AST');
    pengukur.catatSentuhan('Evaluasi & Interpreter');
    pengukur.catatSentuhan('Testing Framework');

    const hasil = pengukur.dapatkanHasil();
    tegaskan(hasil.totalSubsistem === 11, 'Harus ada 11 subsistem terdaftar');
    tegaskan(hasil.subsistemTersentuh === 4, 'Harus ada 4 subsistem tersentuh');
    tegaskan(hasil.persentase > 30, 'Persentase harus terhitung dengan tepat');
  });

  uji('7.2 PengukurCakupan menghasilkan data subsistem lengkap', () => {
    const pengukur = new PengukurCakupan();
    const subsistem = pengukur.dapatkanDaftarSubsistem();
    tegaskan(subsistem.includes('Sintaks & Lexer'), 'Harus memuat Lexer');
    tegaskan(subsistem.includes('Testing Framework'), 'Harus memuat Testing Framework');
    tegaskan(subsistem.includes('Language Server Protocol (LSP)'), 'Harus memuat LSP');
  });

  // --- KELOMPOK 8: QUALITY GATE & CLI INTEGRATION ---
  console.log('\n--- Kelompok 8: Quality Gate & CLI Integration ---');

  uji('8.1 GerbangKualitas melakukan validasi kelayakan rilis secara deterministik', () => {
    const gerbang = new GerbangKualitas({ ambangBatasCakupan: 80 });
    const hasil = gerbang.jalankanSinkron();

    tegaskan(hasil.totalPemeriksaan === 6, 'Harus ada 6 pemeriksaan di Quality Gate');
    tegaskan(hasil.lulusSemua === true, 'Seluruh kriteria Quality Gate harus lulus');
    tegaskan(hasil.pemeriksaan.some(p => p.nama.includes('Pemformat')), 'Pemeriksaan pemformat harus ada');
    tegaskan(hasil.pemeriksaan.some(p => p.nama.includes('Language Server')), 'Pemeriksaan LSP harus ada');
    tegaskan(hasil.pemeriksaan.some(p => p.nama.includes('Pustaka Standar')), 'Pemeriksaan Stdlib harus ada');
  });

  uji('8.2 NusantaraCLI menangani perintah nusantara versi dengan v0.21.0', () => {
    let luaran = '';
    const cli = new NusantaraCLI(new PembacaBerkasMemori(), {
      log: msg => (luaran += msg + '\n'),
      error: msg => (luaran += msg + '\n'),
    });
    const status = cli.jalankan(['versi']);
    tegaskan(status === 0, 'Exit code harus 0');
    tegaskan(luaran.includes('v0.21.0'), 'Harus memuat v0.21.0');
    tegaskan(luaran.includes('v0.20.0'), 'Harus mempertahankan kompatibilitas v0.20.0');
  });

  uji('8.3 NusantaraCLI menangani perintah nusantara uji dengan target berkas', () => {
    let luaran = '';
    const memori = new PembacaBerkasMemori({
      'tests/aritmetika.uji.nusantara': `
        pastikan_sama(10 * 10, 100)
        pastikan_benar(100 > 50)
      `,
    });
    const cli = new NusantaraCLI(memori, {
      log: msg => (luaran += msg + '\n'),
      error: msg => (luaran += msg + '\n'),
    });
    const status = cli.jalankan(['uji', 'tests/aritmetika.uji.nusantara']);
    tegaskan(status === 0, `Harus exit code 0, luaran: ${luaran}`);
    tegaskan(luaran.includes('Lulus'), 'Harus ada informasi kelulusan');
  });

  uji('8.4 NusantaraCLI mengembalikan exit code 1 jika pengujian gagal', () => {
    let luaran = '';
    const memori = new PembacaBerkasMemori({
      'tests/gagal_total.uji.nusantara': `
        pastikan_sama("nusantara", "rusak", "Tidak sama")
      `,
    });
    const cli = new NusantaraCLI(memori, {
      log: msg => (luaran += msg + '\n'),
      error: msg => (luaran += msg + '\n'),
    });
    const status = cli.jalankan(['uji', 'tests/gagal_total.uji.nusantara']);
    tegaskan(status === 1, 'Harus mengembalikan exit code 1 untuk kegagalan penegasan');
  });

  uji('8.5 NusantaraCLI menangani perintah nusantara uji-semua (Quality Gate)', () => {
    let luaran = '';
    const cli = new NusantaraCLI(new PembacaBerkasMemori(), {
      log: msg => (luaran += msg + '\n'),
      error: msg => (luaran += msg + '\n'),
    });
    const status = cli.jalankan(['uji-semua']);
    tegaskan(status === 0, `Quality gate harus exit 0, didapat: ${status}`);
    tegaskan(luaran.includes('GERBANG KUALITAS'), 'Harus memuat laporan gerbang kualitas');
  });

  console.log('\n=============================================================================');
  console.log(`TOTAL UJI: ${totalUji} | BERHASIL: ${ujiBerhasil} | GAGAL: ${ujiGagal}`);
  console.log('=============================================================================');

  if (ujiGagal > 0) {
    process.exit(1);
  }
}

jalankanPengujianTestingFramework().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
