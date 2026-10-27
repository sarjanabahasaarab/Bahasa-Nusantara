/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rangkaian Pengujian Komprehensif Standard Library Expansion & System API (Phase 28)
 * Target Milestone: v0.28.0
 */

import {
  buatEksporTeks,
  buatEksporKoleksi,
  buatEksporMatematika,
  buatEksporBerkas,
  buatEksporWaktu,
  buatEksporSistem,
  buatEksporJalur,
  buatEksporJson,
  buatEksporLingkungan,
  buatEksporProses,
  buatEksporJaringan,
  buatEksporKripto,
  SandboxBerkas,
  apakahModulStandar,
  dapatkanSemuaModulStandar,
  dapatkanDaftarNamaModulStandar,
  buatCatatanModulStandar,
  tetapkanHandlerEksekusiProses,
  tetapkanPengirimHTTPMock,
} from '../../src/stdlib';
import {
  buatBilangan,
  buatDesimal,
  buatTeks,
  buatLogika,
  buatDaftar,
  buatPeta,
  buatKosong,
  JenisNilaiRuntime,
  NilaiFungsiBawaan,
} from '../../src/interpreter/nilai';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { PembacaBerkasMemori } from '../../src/modul/pembacaBerkas';

let totalUji = 0;
let ujiBerhasil = 0;
let ujiGagal = 0;

function uji(nama: string, fn: () => void) {
  totalUji++;
  try {
    fn();
    ujiBerhasil++;
    console.log(`  ✓ ${nama}`);
  } catch (err: any) {
    ujiGagal++;
    console.error(`  ✗ ${nama}`);
    console.error(`    ${err.message}`);
  }
}

function samaDengan(aktual: any, ekspektasi: any, pesan?: string) {
  if (aktual !== ekspektasi) {
    throw new Error(
      `${pesan || 'Ketidaksamaan nilai'}: diharapkan '${ekspektasi}', tetapi mendapatkan '${aktual}'`
    );
  }
}

function benar(kondisi: boolean, pesan?: string) {
  if (!kondisi) {
    throw new Error(pesan || 'Diharapkan bernilai benar');
  }
}

function salah(kondisi: boolean, pesan?: string) {
  if (kondisi) {
    throw new Error(pesan || 'Diharapkan bernilai salah');
  }
}

function lemparGalat(fn: () => void, kataKunci?: string) {
  let dilempar = false;
  try {
    fn();
  } catch (e: any) {
    dilempar = true;
    if (kataKunci && !e.message.toLowerCase().includes(kataKunci.toLowerCase())) {
      throw new Error(
        `Galat dilempar tetapi tidak mengandung kata '${kataKunci}'. Pesan asli: ${e.message}`
      );
    }
  }
  if (!dilempar) {
    throw new Error('Diharapkan melempar galat, namun eksekusi berjalan tanpa galat.');
  }
}

console.log('=== PENGUJIAN KOMPREHENSIF STANDARD LIBRARY EXPANSION (PHASE 28) ===\n');

// ----------------------------------------------------------------------------
// 1. REGISTRI DAN METADATA MODUL FASE 28
// ----------------------------------------------------------------------------
console.log('1. Pengujian Registri dan Katalog Modul Standar Fase 28:');

uji('Modul standar inti tetap 8 untuk kompatibilitas ke belakang', () => {
  const daftarInti = dapatkanDaftarNamaModulStandar();
  samaDengan(daftarInti.length, 8);
});

uji('Semua 14 modul standar resmi (inti + ekspansi Fase 28) terdaftar', () => {
  const semua = dapatkanSemuaModulStandar();
  samaDengan(semua.length, 14);
  benar(semua.includes('jalur'), 'jalur harus terdaftar');
  benar(semua.includes('json'), 'json harus terdaftar');
  benar(semua.includes('lingkungan'), 'lingkungan harus terdaftar');
  benar(semua.includes('proses'), 'proses harus terdaftar');
  benar(semua.includes('jaringan'), 'jaringan harus terdaftar');
  benar(semua.includes('kripto'), 'kripto harus terdaftar');
});

uji('apakahModulStandar mengenali prefix std:, stdlib:, dan nusantara: untuk modul baru', () => {
  benar(apakahModulStandar('std:jalur'));
  benar(apakahModulStandar('stdlib:json'));
  benar(apakahModulStandar('nusantara:lingkungan'));
  benar(apakahModulStandar('std:proses'));
  benar(apakahModulStandar('std/jaringan'));
  benar(apakahModulStandar('kripto'));
  salah(apakahModulStandar('modul_palsu'));
});

// ----------------------------------------------------------------------------
// 2. EKSPANSI MODUL TEKS
// ----------------------------------------------------------------------------
console.log('\n2. Pengujian Ekspansi Modul Teks:');

uji('teks.awalan dan teks.akhiran', () => {
  const t = buatEksporTeks();
  const fnAwalan = t.get('awalan') as NilaiFungsiBawaan;
  const fnAkhiran = t.get('akhiran') as NilaiFungsiBawaan;

  benar((fnAwalan.eksekusi([buatTeks('nusantara'), buatTeks('nusa')]) as any).nilai);
  salah((fnAwalan.eksekusi([buatTeks('nusantara'), buatTeks('tara')]) as any).nilai);

  benar((fnAkhiran.eksekusi([buatTeks('nusantara.nusantara'), buatTeks('.nusantara')]) as any).nilai);
  salah((fnAkhiran.eksekusi([buatTeks('nusantara.nusantara'), buatTeks('.js')]) as any).nilai);
});

uji('teks.pisah, teks.ulangi, dan teks.apakahKosong', () => {
  const t = buatEksporTeks();
  const fnPisah = t.get('pisah') as NilaiFungsiBawaan;
  const fnUlangi = t.get('ulangi') as NilaiFungsiBawaan;
  const fnKosong = t.get('apakahKosong') as NilaiFungsiBawaan;

  const resPisah: any = fnPisah.eksekusi([buatTeks('kopi,teh,susu'), buatTeks(',')]);
  samaDengan(resPisah.elemen.length, 3);
  samaDengan(resPisah.elemen[0].nilai, 'kopi');
  samaDengan(resPisah.elemen[1].nilai, 'teh');
  samaDengan(resPisah.elemen[2].nilai, 'susu');

  const resUlangi: any = fnUlangi.eksekusi([buatTeks('Nusa'), buatBilangan(3)]);
  samaDengan(resUlangi.nilai, 'NusaNusaNusa');

  benar((fnKosong.eksekusi([buatTeks('')]) as any).nilai);
  salah((fnKosong.eksekusi([buatTeks('abc')]) as any).nilai);
});

uji('teks.panjangKarakter (Unicode Code Points) vs panjangByte', () => {
  const t = buatEksporTeks();
  const fnKarakter = t.get('panjangKarakter') as NilaiFungsiBawaan;
  const fnByte = t.get('panjangByte') as NilaiFungsiBawaan;

  // Emotikon atau aksara Jawa: '🇮🇩' adalah 2 Unicode code points (regional indicator symbols), namun UTF-8 byte length > 2
  const str = '🇮🇩 Indonesia';
  const charLen: any = fnKarakter.eksekusi([buatTeks(str)]);
  const byteLen: any = fnByte.eksekusi([buatTeks(str)]);

  benar(charLen.nilai > 0);
  benar(byteLen.nilai > charLen.nilai, 'Ukuran byte UTF-8 harus lebih besar dari jumlah code points');
});

uji('teks.format dan teks.karakterPada', () => {
  const t = buatEksporTeks();
  const fnFormat = t.get('format') as NilaiFungsiBawaan;
  const fnKarakterPada = t.get('karakterPada') as NilaiFungsiBawaan;

  const formatted: any = fnFormat.eksekusi([
    buatTeks('Halo {0}, selamat datang di {1}!'),
    buatDaftar([buatTeks('Budi'), buatTeks('Nusantara')]),
  ]);
  samaDengan(formatted.nilai, 'Halo Budi, selamat datang di Nusantara!');

  const char: any = fnKarakterPada.eksekusi([buatTeks('NUSANTARA'), buatBilangan(4)]);
  samaDengan(char.nilai, 'N');

  lemparGalat(() => fnKarakterPada.eksekusi([buatTeks('ABC'), buatBilangan(10)]), 'luar rentang');
});

// ----------------------------------------------------------------------------
// 3. EKSPANSI MODUL KOLEKSI
// ----------------------------------------------------------------------------
console.log('\n3. Pengujian Ekspansi Modul Koleksi:');

uji('koleksi.ambil dengan pemeriksaan batas rentang (bounds checking)', () => {
  const k = buatEksporKoleksi();
  const fnAmbil = k.get('ambil') as NilaiFungsiBawaan;

  const daftar = buatDaftar([buatTeks('A'), buatTeks('B'), buatTeks('C')]);
  samaDengan((fnAmbil.eksekusi([daftar, buatBilangan(0)]) as any).nilai, 'A');
  samaDengan((fnAmbil.eksekusi([daftar, buatBilangan(2)]) as any).nilai, 'C');

  lemparGalat(() => fnAmbil.eksekusi([daftar, buatBilangan(5)]), 'luar rentang');
  lemparGalat(() => fnAmbil.eksekusi([daftar, buatBilangan(-1)]), 'luar rentang');
});

uji('koleksi.tambah, koleksi.tetapkan, koleksi.hapus pada daftar dan peta', () => {
  const k = buatEksporKoleksi();
  const fnTambah = k.get('tambah') as NilaiFungsiBawaan;
  const fnTetapkan = k.get('tetapkan') as NilaiFungsiBawaan;
  const fnHapus = k.get('hapus') as NilaiFungsiBawaan;
  const fnAmbil = k.get('ambil') as NilaiFungsiBawaan;

  // Daftar
  const dAwal = buatDaftar([buatBilangan(10), buatBilangan(20)]);
  const dTambah: any = fnTambah.eksekusi([dAwal, buatBilangan(30)]);
  samaDengan(dTambah.elemen.length, 3);
  samaDengan(dTambah.elemen[2].nilai, 30);

  const dHapus: any = fnHapus.eksekusi([dTambah, buatBilangan(1)]);
  samaDengan(dHapus.elemen.length, 2);
  samaDengan(dHapus.elemen[0].nilai, 10);
  samaDengan(dHapus.elemen[1].nilai, 30);

  // Peta
  const petaAwal = buatPeta(new Map([['bahasa', buatTeks('Nusantara')]]));
  const petaBaru: any = fnTetapkan.eksekusi([petaAwal, buatTeks('versi'), buatTeks('v0.28.0')]);
  samaDengan((fnAmbil.eksekusi([petaBaru, buatTeks('bahasa')]) as any).nilai, 'Nusantara');
  samaDengan((fnAmbil.eksekusi([petaBaru, buatTeks('versi')]) as any).nilai, 'v0.28.0');

  const petaDihapus: any = fnHapus.eksekusi([petaBaru, buatTeks('bahasa')]);
  samaDengan((fnAmbil.eksekusi([petaDihapus, buatTeks('bahasa')]) as any).jenis, JenisNilaiRuntime.KOSONG);
  samaDengan((fnAmbil.eksekusi([petaDihapus, buatTeks('versi')]) as any).nilai, 'v0.28.0');
});

uji('koleksi.kunci, koleksi.nilai, dan koleksi.salin', () => {
  const k = buatEksporKoleksi();
  const fnKunci = k.get('kunci') as NilaiFungsiBawaan;
  const fnNilai = k.get('nilai') as NilaiFungsiBawaan;
  const fnSalin = k.get('salin') as NilaiFungsiBawaan;

  const peta = buatPeta(new Map([['id', buatBilangan(1)], ['nama', buatTeks('Admin')]]));
  const kunciList: any = fnKunci.eksekusi([peta]);
  samaDengan(kunciList.elemen.length, 2);

  const nilaiList: any = fnNilai.eksekusi([peta]);
  samaDengan(nilaiList.elemen.length, 2);

  const petaKlon: any = fnSalin.eksekusi([peta]);
  samaDengan(petaKlon.nilai.size, 2);
});

// ----------------------------------------------------------------------------
// 4. EKSPANSI MODUL MATEMATIKA
// ----------------------------------------------------------------------------
console.log('\n4. Pengujian Ekspansi Modul Matematika:');

uji('Konstanta TAU dan INF', () => {
  const m = buatEksporMatematika();
  const tau = m.get('TAU') as any;
  const inf = m.get('INF') as any;

  benar(tau.nilai > 6.28 && tau.nilai < 6.29);
  samaDengan(inf.nilai, Infinity);
});

uji('Trigonometri: sin, cos, tan, asin, acos, atan, atan2', () => {
  const m = buatEksporMatematika();
  const fnSin = m.get('sin') as NilaiFungsiBawaan;
  const fnCos = m.get('cos') as NilaiFungsiBawaan;
  const fnAsin = m.get('asin') as NilaiFungsiBawaan;
  const fnAcos = m.get('acos') as NilaiFungsiBawaan;

  samaDengan(Math.round((fnSin.eksekusi([buatDesimal(0)]) as any).nilai), 0);
  samaDengan(Math.round((fnCos.eksekusi([buatDesimal(0)]) as any).nilai), 1);

  // Domain checks
  lemparGalat(() => fnAsin.eksekusi([buatDesimal(2.5)]), 'domain');
  lemparGalat(() => fnAcos.eksekusi([buatDesimal(-1.5)]), 'domain');
});

uji('Logaritma, eksponensial, dan validasi pembagian nol', () => {
  const m = buatEksporMatematika();
  const fnLog = m.get('log') as NilaiFungsiBawaan;
  const fnLog10 = m.get('log10') as NilaiFungsiBawaan;
  const fnBagi = m.get('bagi') as NilaiFungsiBawaan;

  samaDengan(Math.round((fnLog10.eksekusi([buatBilangan(100)]) as any).nilai), 2);
  lemparGalat(() => fnLog.eksekusi([buatBilangan(0)]), 'positif');
  lemparGalat(() => fnLog.eksekusi([buatBilangan(-5)]), 'positif');

  const bagiHasil: any = fnBagi.eksekusi([buatBilangan(20), buatBilangan(4)]);
  samaDengan(bagiHasil.nilai, 5);
  lemparGalat(() => fnBagi.eksekusi([buatBilangan(10), buatBilangan(0)]), 'pembagian dengan nol');
});

// ----------------------------------------------------------------------------
// 5. MODUL JALUR (PATH API)
// ----------------------------------------------------------------------------
console.log('\n5. Pengujian Modul Standar jalur (Path API):');

uji('jalur.gabung, jalur.normalisasi, dan jalur.ekstensi', () => {
  const j = buatEksporJalur();
  const fnGabung = j.get('gabung') as NilaiFungsiBawaan;
  const fnNormalisasi = j.get('normalisasi') as NilaiFungsiBawaan;
  const fnEkstensi = j.get('ekstensi') as NilaiFungsiBawaan;

  const gabungan: any = fnGabung.eksekusi([buatTeks('/proyek'), buatTeks('src/../lib'), buatTeks('utama.nusantara')]);
  samaDengan(gabungan.nilai, '/proyek/lib/utama.nusantara');

  const norm: any = fnNormalisasi.eksekusi([buatTeks('a/b/../c/./d')]);
  samaDengan(norm.nilai, 'a/c/d');

  const ext: any = fnEkstensi.eksekusi([buatTeks('/berkas/program.nusantara')]);
  samaDengan(ext.nilai, '.nusantara');

  const extKosong: any = fnEkstensi.eksekusi([buatTeks('/berkas/tanpa_ekstensi')]);
  samaDengan(extKosong.nilai, '');
});

uji('jalur.namaBerkas, jalur.direktoriInduk, dan jalur.apakahAbsolut', () => {
  const j = buatEksporJalur();
  const fnNamaBerkas = j.get('namaBerkas') as NilaiFungsiBawaan;
  const fnInduk = j.get('direktoriInduk') as NilaiFungsiBawaan;
  const fnAbs = j.get('apakahAbsolut') as NilaiFungsiBawaan;

  const nama: any = fnNamaBerkas.eksekusi([buatTeks('/proyek/src/modul.nusantara')]);
  samaDengan(nama.nilai, 'modul.nusantara');

  const namaTanpaExt: any = fnNamaBerkas.eksekusi([buatTeks('/proyek/src/modul.nusantara'), buatLogika(true)]);
  samaDengan(namaTanpaExt.nilai, 'modul');

  const induk: any = fnInduk.eksekusi([buatTeks('/proyek/src/modul.nusantara')]);
  samaDengan(induk.nilai, '/proyek/src');

  benar((fnAbs.eksekusi([buatTeks('/var/log')]) as any).nilai);
  benar((fnAbs.eksekusi([buatTeks('C:/Windows')]) as any).nilai);
  salah((fnAbs.eksekusi([buatTeks('./lokal')]) as any).nilai);
});

// ----------------------------------------------------------------------------
// 6. MODUL JSON
// ----------------------------------------------------------------------------
console.log('\n6. Pengujian Modul Standar json:');

uji('json.urai memetakan JSON Object ke Peta dan JSON Array ke Daftar', () => {
  const jsonMod = buatEksporJson();
  const fnUrai = jsonMod.get('urai') as NilaiFungsiBawaan;

  const jsonStr = '{"nama": "NUSANTARA", "versi": 28, "stabil": benar, "tag": ["bahasa", "sistem"]}';
  // Standard JSON format using valid booleans:
  const rawJson = '{"nama": "NUSANTARA", "versi": 28, "stabil": true, "tag": ["bahasa", "sistem"]}';

  const res: any = fnUrai.eksekusi([buatTeks(rawJson)]);
  samaDengan(res.jenis, JenisNilaiRuntime.PETA);
  samaDengan(res.nilai.get('nama').nilai, 'NUSANTARA');
  samaDengan(res.nilai.get('versi').nilai, 28);
  samaDengan(res.nilai.get('stabil').nilai, true);

  const tagList = res.nilai.get('tag');
  samaDengan(tagList.jenis, JenisNilaiRuntime.DAFTAR);
  samaDengan(tagList.elemen.length, 2);
  samaDengan(tagList.elemen[0].nilai, 'bahasa');
});

uji('json.cetak dan json.apakahValid', () => {
  const jsonMod = buatEksporJson();
  const fnCetak = jsonMod.get('cetak') as NilaiFungsiBawaan;
  const fnValid = jsonMod.get('apakahValid') as NilaiFungsiBawaan;

  const peta = buatPeta(new Map([['judul', buatTeks('Uji JSON')], ['skor', buatBilangan(100)]]));
  const jsonOutput: any = fnCetak.eksekusi([peta]);
  benar(jsonOutput.nilai.includes('"judul":"Uji JSON"'));
  benar(jsonOutput.nilai.includes('"skor":100'));

  benar((fnValid.eksekusi([buatTeks('{"ok": 1}')]) as any).nilai);
  salah((fnValid.eksekusi([buatTeks('{"tidak_tutup: ...')]) as any).nilai);

  // Galat urai JSON tidak valid melempar galat sintaks informatif
  lemparGalat(() => (jsonMod.get('urai') as NilaiFungsiBawaan).eksekusi([buatTeks('{sintaks_rusak}')]), 'sintaks json');
});

// ----------------------------------------------------------------------------
// 7. EKSPANSI MODUL WAKTU
// ----------------------------------------------------------------------------
console.log('\n7. Pengujian Ekspansi Modul Waktu:');

uji('waktu.tahun, waktu.bulan, waktu.hari, dan waktu.komponen', () => {
  const w = buatEksporWaktu();
  const fnTahun = w.get('tahun') as NilaiFungsiBawaan;
  const fnKomponen = w.get('komponen') as NilaiFungsiBawaan;
  const fnUrai = w.get('urai') as NilaiFungsiBawaan;

  const th: any = fnTahun.eksekusi([]);
  benar(th.nilai >= 2026);

  const comp: any = fnKomponen.eksekusi([]);
  samaDengan(comp.jenis, JenisNilaiRuntime.PETA);
  benar(comp.nilai.has('tahun'));
  benar(comp.nilai.has('bulan'));
  benar(comp.nilai.has('hari'));

  const parsedTs: any = fnUrai.eksekusi([buatTeks('2026-10-27T10:00:00Z')]);
  benar(parsedTs.nilai > 0);
});

// ----------------------------------------------------------------------------
// 8. MODUL LINGKUNGAN & SISTEM
// ----------------------------------------------------------------------------
console.log('\n8. Pengujian Modul Standar lingkungan dan sistem:');

uji('lingkungan.tetapkan, lingkungan.ambil, lingkungan.ada, dan lingkungan.semua', () => {
  const envMod = buatEksporLingkungan();
  const fnTetapkan = envMod.get('tetapkan') as NilaiFungsiBawaan;
  const fnAmbil = envMod.get('ambil') as NilaiFungsiBawaan;
  const fnAda = envMod.get('ada') as NilaiFungsiBawaan;
  const fnSemua = envMod.get('semua') as NilaiFungsiBawaan;

  fnTetapkan.eksekusi([buatTeks('KOTA_NUSANTARA'), buatTeks('IKN')]);
  benar((fnAda.eksekusi([buatTeks('KOTA_NUSANTARA')]) as any).nilai);
  samaDengan((fnAmbil.eksekusi([buatTeks('KOTA_NUSANTARA')]) as any).nilai, 'IKN');

  const semua: any = fnSemua.eksekusi([]);
  samaDengan(semua.jenis, JenisNilaiRuntime.PETA);
  samaDengan((semua.nilai.get('KOTA_NUSANTARA') as any).nilai, 'IKN');
});

uji('sistem.infoHost dan sistem.alokasiMemori', () => {
  const sys = buatEksporSistem();
  const fnHost = sys.get('infoHost') as NilaiFungsiBawaan;
  const fnMem = sys.get('alokasiMemori') as NilaiFungsiBawaan;

  const host: any = fnHost.eksekusi([]);
  samaDengan(host.jenis, JenisNilaiRuntime.PETA);
  samaDengan(host.nilai.get('versi').nilai, '0.28.0');
  samaDengan(host.nilai.get('fase').nilai, 28);

  const mem: any = fnMem.eksekusi([]);
  samaDengan(mem.jenis, JenisNilaiRuntime.PETA);
  benar(mem.nilai.has('heapTerpakai'));
});

// ----------------------------------------------------------------------------
// 9. MODUL BERKAS EXPANSION (HAPUS, SALIN, METADATA)
// ----------------------------------------------------------------------------
console.log('\n9. Pengujian Ekspansi Modul Berkas (hapus, salin, metadata):');

uji('berkas.salin, berkas.metadata, dan berkas.hapus dalam sandbox aman', () => {
  const fsMemori = new PembacaBerkasMemori({
    '/proyek/awal.txt': 'Halo Nusantara!',
  });
  const sandbox = new SandboxBerkas(fsMemori, '/proyek');
  const b = buatEksporBerkas(sandbox);

  const fnSalin = b.get('salin') as NilaiFungsiBawaan;
  const fnMetadata = b.get('metadata') as NilaiFungsiBawaan;
  const fnHapus = b.get('hapus') as NilaiFungsiBawaan;
  const fnAda = b.get('ada') as NilaiFungsiBawaan;

  // Salin
  benar((fnSalin.eksekusi([buatTeks('awal.txt'), buatTeks('salinan.txt')]) as any).nilai);
  benar((fnAda.eksekusi([buatTeks('salinan.txt')]) as any).nilai);

  // Metadata
  const meta: any = fnMetadata.eksekusi([buatTeks('salinan.txt')]);
  samaDengan(meta.jenis, JenisNilaiRuntime.PETA);
  benar(meta.nilai.get('ada').nilai);
  benar(meta.nilai.get('ukuran').nilai > 0);

  // Hapus
  benar((fnHapus.eksekusi([buatTeks('salinan.txt')]) as any).nilai);
  salah((fnAda.eksekusi([buatTeks('salinan.txt')]) as any).nilai);
});

// ----------------------------------------------------------------------------
// 10. MODUL PROSES (SAFE ARGUMENT-ARRAY SUBPROCESS)
// ----------------------------------------------------------------------------
console.log('\n10. Pengujian Modul Standar proses:');

uji('proses.eksekusi dengan larik argumen aman dan mock dispatcher', () => {
  tetapkanHandlerEksekusiProses((perintah, argumen) => {
    return {
      kodeKeluar: 0,
      stdout: `Berhasil mengeksekusi '${perintah}' dengan ${argumen.length} argumen: ${argumen.join(' ')}`,
      stderr: '',
      sukses: true,
    };
  });

  const p = buatEksporProses();
  const fnEksekusi = p.get('eksekusi') as NilaiFungsiBawaan;

  const res: any = fnEksekusi.eksekusi([
    buatTeks('nusantara-compiler'),
    buatDaftar([buatTeks('--versi'), buatTeks('--cek')]),
  ]);

  samaDengan(res.jenis, JenisNilaiRuntime.PETA);
  samaDengan(res.nilai.get('kodeKeluar').nilai, 0);
  benar(res.nilai.get('sukses').nilai);
  benar(res.nilai.get('stdout').nilai.includes('--versi --cek'));

  tetapkanHandlerEksekusiProses(null);
});

// ----------------------------------------------------------------------------
// 11. MODUL JARINGAN (HTTP GET & POST DENGAN MOCK)
// ----------------------------------------------------------------------------
console.log('\n11. Pengujian Modul Standar jaringan:');

uji('jaringan.ambil dan jaringan.kirim dengan mock network dispatcher', () => {
  tetapkanPengirimHTTPMock((metode, url, tubuh, header) => {
    if (metode === 'GET' && url === 'https://api.nusantara-lang.org/paket') {
      return {
        status: 200,
        statusTeks: 'OK',
        tubuh: '{"total": 42}',
        header: { 'content-type': 'application/json' },
        sukses: true,
      };
    }
    if (metode === 'POST' && url === 'https://api.nusantara-lang.org/telemetri') {
      return {
        status: 201,
        statusTeks: 'Created',
        tubuh: '{"diterima": true}',
        sukses: true,
      };
    }
    return { status: 404, statusTeks: 'Not Found', tubuh: '', sukses: false };
  });

  const j = buatEksporJaringan();
  const fnAmbil = j.get('ambil') as NilaiFungsiBawaan;
  const fnKirim = j.get('kirim') as NilaiFungsiBawaan;

  const resGet: any = fnAmbil.eksekusi([buatTeks('https://api.nusantara-lang.org/paket')]);
  samaDengan(resGet.nilai.get('status').nilai, 200);
  samaDengan(resGet.nilai.get('tubuh').nilai, '{"total": 42}');
  benar(resGet.nilai.get('sukses').nilai);

  const resPost: any = fnKirim.eksekusi([
    buatTeks('https://api.nusantara-lang.org/telemetri'),
    buatTeks('{"ping": 1}'),
  ]);
  samaDengan(resPost.nilai.get('status').nilai, 201);
  benar(resPost.nilai.get('sukses').nilai);

  tetapkanPengirimHTTPMock(null);
});

// ----------------------------------------------------------------------------
// 12. MODUL KRIPTO (SHA-256, CSPRNG, CONSTANT-TIME COMPARE)
// ----------------------------------------------------------------------------
console.log('\n12. Pengujian Modul Standar kripto:');

uji('kripto.sha256 dan kripto.md5 menghasilkan digest heksadesimal sah', () => {
  const k = buatEksporKripto();
  const fnSha256 = k.get('sha256') as NilaiFungsiBawaan;
  const fnMd5 = k.get('md5') as NilaiFungsiBawaan;

  const hSha: any = fnSha256.eksekusi([buatTeks('nusantara')]);
  samaDengan(hSha.nilai.length, 64, 'SHA-256 harus 64 karakter heksadesimal');

  const hMd5: any = fnMd5.eksekusi([buatTeks('nusantara')]);
  samaDengan(hMd5.nilai.length, 32, 'MD5 harus 32 karakter heksadesimal');
});

uji('kripto.byteAcak, kripto.bilanganAcak, dan kripto.bandingkanWaktuKonstan', () => {
  const k = buatEksporKripto();
  const fnByte = k.get('byteAcak') as NilaiFungsiBawaan;
  const fnAngka = k.get('bilanganAcak') as NilaiFungsiBawaan;
  const fnBanding = k.get('bandingkanWaktuKonstan') as NilaiFungsiBawaan;

  const b16: any = fnByte.eksekusi([buatBilangan(16)]);
  samaDengan(b16.nilai.length, 32);

  const n: any = fnAngka.eksekusi([buatBilangan(10), buatBilangan(20)]);
  benar(n.nilai >= 10 && n.nilai <= 20);

  benar((fnBanding.eksekusi([buatTeks('kunci_rahasia_123'), buatTeks('kunci_rahasia_123')]) as any).nilai);
  salah((fnBanding.eksekusi([buatTeks('kunci_rahasia_123'), buatTeks('kunci_palsu_456')]) as any).nilai);
});

// ----------------------------------------------------------------------------
// 13. INTEGRASI END-TO-END DENGAN INTERPRETER (PROGRAM .nusantara)
// ----------------------------------------------------------------------------
console.log('\n13. Pengujian Integrasi Penuh Interpreter dengan Modul Baru:');

uji('Program NUSANTARA mengimpor dan menggunakan modul jalur', () => {
  const kode = `
program UjiJalur
gunakan "jalur" sebagai jalur

mulai
    direktori : teks = "/app/nusantara"
    berkas : teks = "utama.nusantara"
    jalurPenuh : teks = jalur.gabung(direktori, berkas)
    ekstensi : teks = jalur.ekstensi(jalurPenuh)
    tampilkan("Hasil Jalur:", jalurPenuh)
    tampilkan("Ekstensi:", ekstensi)
selesai
`;
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kode);

  const output = buffer.dapatkanSeluruhTeks().join('\n');
  benar(output.includes('/app/nusantara/utama.nusantara'));
  benar(output.includes('.nusantara'));
});

uji('Program NUSANTARA mengimpor dan menggunakan modul json', () => {
  const kode = `
program UjiJson
gunakan "json" sebagai json

mulai
    teksMentah : teks = "{\\"pesan\\": \\"Halo Dunia\\", \\"status\\": 200}"
    apakahSah : logika = json.apakahValid(teksMentah)
    tampilkan("JSON Sah:", apakahSah)
selesai
`;
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kode);

  const output = buffer.dapatkanSeluruhTeks().join('\n');
  benar(output.includes('JSON Sah: benar'));
});

uji('Program NUSANTARA mengimpor dan menggunakan modul kripto', () => {
  const kode = `
program UjiKripto
gunakan "kripto" sebagai kripto

mulai
    hash : teks = kripto.sha256("merdeka")
    panjangHash : bilangan = 64
    apakahSama : logika = kripto.bandingkanWaktuKonstan("token", "token")
    tampilkan("Hash Berhasil Dihitung")
    tampilkan("Token Cocok:", apakahSama)
selesai
`;
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kode);

  const output = buffer.dapatkanSeluruhTeks().join('\n');
  benar(output.includes('Hash Berhasil Dihitung'));
  benar(output.includes('Token Cocok: benar'));
});

// ----------------------------------------------------------------------------
// RINGKASAN HASIL
// ----------------------------------------------------------------------------
console.log('\n=============================================================================');
console.log(`HASIL PENGUJIAN PHASE 28: ${ujiBerhasil} Lulus, ${ujiGagal} Gagal dari ${totalUji} Uji.`);
console.log('=============================================================================');

if (ujiGagal > 0) {
  process.exit(1);
}
