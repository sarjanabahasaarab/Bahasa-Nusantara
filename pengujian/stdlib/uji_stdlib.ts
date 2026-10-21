/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  buatEksporTeks,
  buatEksporMatematika,
  buatEksporKonversi,
  buatEksporWaktu,
  buatEksporAcak,
  buatEksporKoleksi,
  buatEksporBerkas,
  buatEksporSistem,
  SandboxBerkas,
  apakahModulStandar,
  dapatkanDaftarNamaModulStandar,
  buatCatatanModulStandar,
} from '../../src/stdlib';
import {
  buatBilangan,
  buatDesimal,
  buatTeks,
  buatLogika,
  buatDaftar,
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
    if (kataKunci && !e.message.includes(kataKunci)) {
      throw new Error(
        `Galat dilempar tetapi tidak mengandung kata '${kataKunci}'. Pesan asli: ${e.message}`
      );
    }
  }
  if (!dilempar) {
    throw new Error('Diharapkan melempar galat, namun eksekusi berjalan tanpa galat.');
  }
}

console.log('=== PENGUJIAN STANDARD LIBRARY NUSANTARA (PHASE 17) ===\n');

// ----------------------------------------------------------------------------
// 1. REGISTRI & METADATA MODUL STANDAR
// ----------------------------------------------------------------------------
console.log('1. Pengujian Registri Standard Library:');

uji('Daftar 8 modul standar resmi lengkap terdaftar', () => {
  const daftar = dapatkanDaftarNamaModulStandar();
  samaDengan(daftar.length, 8);
  benar(daftar.includes('teks'));
  benar(daftar.includes('matematika'));
  benar(daftar.includes('konversi'));
  benar(daftar.includes('waktu'));
  benar(daftar.includes('acak'));
  benar(daftar.includes('koleksi'));
  benar(daftar.includes('berkas'));
  benar(daftar.includes('sistem'));
});

uji('Validasi apakahModulStandar dengan berbagai format prefix', () => {
  benar(apakahModulStandar('teks'));
  benar(apakahModulStandar('"teks"'));
  benar(apakahModulStandar("'matematika'"));
  benar(apakahModulStandar('std:waktu'));
  benar(apakahModulStandar('stdlib:acak'));
  benar(apakahModulStandar('nusantara:koleksi'));
  benar(apakahModulStandar('std/berkas'));
  salah(apakahModulStandar('modul_tidak_dikenal'));
  salah(apakahModulStandar('./teks'));
  salah(apakahModulStandar('../matematika'));
});

uji('Pabrik buatCatatanModulStandar menghasilkan status SUDAH_DIMUAT', () => {
  const cat = buatCatatanModulStandar('matematika');
  samaDengan(cat.nama, 'matematika');
  samaDengan(cat.id, 'stdlib:matematika');
  samaDengan(cat.status, 'SUDAH_DIMUAT');
  benar(cat.ekspor.has('maksimum'));
  benar(cat.simbolEkspor.has('maksimum'));
});

// ----------------------------------------------------------------------------
// 2. MODUL TEKS
// ----------------------------------------------------------------------------
console.log('\n2. Pengujian Modul Standar teks:');

uji('teks.panjang, teks.gabung, dan teks.potong', () => {
  const teksMod = buatEksporTeks();
  const fnPanjang = teksMod.get('panjang') as NilaiFungsiBawaan;
  const fnGabung = teksMod.get('gabung') as NilaiFungsiBawaan;
  const fnPotong = teksMod.get('potong') as NilaiFungsiBawaan;

  const resPanjang = fnPanjang.eksekusi([buatTeks('NUSANTARA')]);
  samaDengan((resPanjang as any).nilai, 9);

  const resGabung = fnGabung.eksekusi([
    buatDaftar([buatTeks('Bahasa'), buatTeks('Pemrograman'), buatTeks('Nusantara')]),
    buatTeks(' '),
  ]);
  samaDengan((resGabung as any).nilai, 'Bahasa Pemrograman Nusantara');

  const resPotong = fnPotong.eksekusi([buatTeks('NUSANTARA'), buatBilangan(0), buatBilangan(4)]);
  samaDengan((resPotong as any).nilai, 'NUSA');
});

uji('teks.cari, teks.kapital, teks.kecil, teks.pangkas, teks.berisi, teks.ganti', () => {
  const teksMod = buatEksporTeks();
  const fnCari = teksMod.get('cari') as NilaiFungsiBawaan;
  const fnKapital = teksMod.get('kapital') as NilaiFungsiBawaan;
  const fnKecil = teksMod.get('kecil') as NilaiFungsiBawaan;
  const fnPangkas = teksMod.get('pangkas') as NilaiFungsiBawaan;
  const fnBerisi = teksMod.get('berisi') as NilaiFungsiBawaan;
  const fnGanti = teksMod.get('ganti') as NilaiFungsiBawaan;

  samaDengan((fnCari.eksekusi([buatTeks('Indonesia Merdeka'), buatTeks('Merdeka')]) as any).nilai, 10);
  samaDengan((fnCari.eksekusi([buatTeks('Indonesia'), buatTeks('xyz')]) as any).nilai, -1);

  samaDengan((fnKapital.eksekusi([buatTeks('nusantara')]) as any).nilai, 'NUSANTARA');
  samaDengan((fnKecil.eksekusi([buatTeks('NUSANTARA')]) as any).nilai, 'nusantara');
  samaDengan((fnPangkas.eksekusi([buatTeks('   halo nusantara   ')]) as any).nilai, 'halo nusantara');

  benar((fnBerisi.eksekusi([buatTeks('garuda pancasila'), buatTeks('pancasila')]) as any).nilai);
  salah((fnBerisi.eksekusi([buatTeks('garuda pancasila'), buatTeks('elang')]) as any).nilai);

  samaDengan(
    (fnGanti.eksekusi([buatTeks('kucing makan ikan kucing'), buatTeks('kucing'), buatTeks('harimau')]) as any)
      .nilai,
    'harimau makan ikan harimau'
  );
});

// ----------------------------------------------------------------------------
// 3. MODUL MATEMATIKA
// ----------------------------------------------------------------------------
console.log('\n3. Pengujian Modul Standar matematika:');

uji('Konstanta matematika PI dan E', () => {
  const mtk = buatEksporMatematika();
  const pi = mtk.get('PI');
  const e = mtk.get('E');
  benar(pi !== undefined && pi.jenis === JenisNilaiRuntime.DESIMAL);
  benar(e !== undefined && e.jenis === JenisNilaiRuntime.DESIMAL);
  benar(Math.abs((pi as any).nilai - 3.14159) < 0.001);
  benar(Math.abs((e as any).nilai - 2.71828) < 0.001);
});

uji('Fungsi absolut, bulat, lantai, dan plafon', () => {
  const mtk = buatEksporMatematika();
  const fnAbs = mtk.get('absolut') as NilaiFungsiBawaan;
  const fnBulat = mtk.get('bulat') as NilaiFungsiBawaan;
  const fnLantai = mtk.get('lantai') as NilaiFungsiBawaan;
  const fnPlafon = mtk.get('plafon') as NilaiFungsiBawaan;

  samaDengan((fnAbs.eksekusi([buatBilangan(-99)]) as any).nilai, 99);
  samaDengan((fnAbs.eksekusi([buatDesimal(-3.5)]) as any).nilai, 3.5);

  samaDengan((fnBulat.eksekusi([buatDesimal(4.6)]) as any).nilai, 5);
  samaDengan((fnBulat.eksekusi([buatDesimal(4.4)]) as any).nilai, 4);

  samaDengan((fnLantai.eksekusi([buatDesimal(7.9)]) as any).nilai, 7);
  samaDengan((fnPlafon.eksekusi([buatDesimal(7.1)]) as any).nilai, 8);
});

uji('Fungsi pangkat, akar, minimum, dan maksimum', () => {
  const mtk = buatEksporMatematika();
  const fnPangkat = mtk.get('pangkat') as NilaiFungsiBawaan;
  const fnAkar = mtk.get('akar') as NilaiFungsiBawaan;
  const fnMin = mtk.get('minimum') as NilaiFungsiBawaan;
  const fnMaks = mtk.get('maksimum') as NilaiFungsiBawaan;

  samaDengan((fnPangkat.eksekusi([buatBilangan(2), buatBilangan(8)]) as any).nilai, 256);
  samaDengan((fnAkar.eksekusi([buatBilangan(81)]) as any).nilai, 9);

  lemparGalat(() => fnAkar.eksekusi([buatBilangan(-16)]), 'akar kuadrat dari bilangan negatif');

  samaDengan((fnMin.eksekusi([buatBilangan(100), buatBilangan(40)]) as any).nilai, 40);
  samaDengan((fnMaks.eksekusi([buatBilangan(100), buatBilangan(40)]) as any).nilai, 100);
});

// ----------------------------------------------------------------------------
// 4. MODUL KONVERSI
// ----------------------------------------------------------------------------
console.log('\n4. Pengujian Modul Standar konversi:');

uji('konversi keTeks, keBilangan, keDesimal, keBulat, dan keLogika', () => {
  const konv = buatEksporKonversi();
  const fnKeTeks = konv.get('keTeks') as NilaiFungsiBawaan;
  const fnKeBil = konv.get('keBilangan') as NilaiFungsiBawaan;
  const fnKeDes = konv.get('keDesimal') as NilaiFungsiBawaan;
  const fnKeBulat = konv.get('keBulat') as NilaiFungsiBawaan;
  const fnKeLogika = konv.get('keLogika') as NilaiFungsiBawaan;

  samaDengan((fnKeTeks.eksekusi([buatBilangan(1234)]) as any).nilai, '1234');
  samaDengan((fnKeTeks.eksekusi([buatLogika(true)]) as any).nilai, 'benar');

  samaDengan((fnKeBil.eksekusi([buatTeks('5678')]) as any).nilai, 5678);
  lemparGalat(() => fnKeBil.eksekusi([buatTeks('bukan_angka')]), 'tidak dapat dikonversi');

  samaDengan((fnKeDes.eksekusi([buatTeks('3.14159')]) as any).nilai, 3.14159);
  samaDengan((fnKeBulat.eksekusi([buatDesimal(9.87)]) as any).nilai, 9);

  samaDengan((fnKeLogika.eksekusi([buatBilangan(1)]) as any).nilai, true);
  samaDengan((fnKeLogika.eksekusi([buatBilangan(0)]) as any).nilai, false);
  samaDengan((fnKeLogika.eksekusi([buatTeks('benar')]) as any).nilai, true);
  samaDengan((fnKeLogika.eksekusi([buatTeks('salah')]) as any).nilai, false);
});

// ----------------------------------------------------------------------------
// 5. MODUL WAKTU
// ----------------------------------------------------------------------------
console.log('\n5. Pengujian Modul Standar waktu:');

uji('Waktu sekarang, tanggal, jam, menit, detik, dan timestamp', () => {
  const wkt = buatEksporWaktu();
  const fnSekarang = wkt.get('sekarang') as NilaiFungsiBawaan;
  const fnTanggal = wkt.get('tanggal') as NilaiFungsiBawaan;
  const fnJam = wkt.get('jam') as NilaiFungsiBawaan;
  const fnTimestamp = wkt.get('timestamp') as NilaiFungsiBawaan;

  const sekarangStr = (fnSekarang.eksekusi([]) as any).nilai;
  benar(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(sekarangStr));

  const tglStr = (fnTanggal.eksekusi([]) as any).nilai;
  benar(/^\d{4}-\d{2}-\d{2}$/.test(tglStr));

  const jamVal = (fnJam.eksekusi([]) as any).nilai;
  benar(jamVal >= 0 && jamVal <= 23);

  const ts = (fnTimestamp.eksekusi([]) as any).nilai;
  benar(ts > 1_600_000_000_000);
});

// ----------------------------------------------------------------------------
// 6. MODUL ACAK
// ----------------------------------------------------------------------------
console.log('\n6. Pengujian Modul Standar acak:');

uji('Pembangkit acak desimal, bilangan dalam rentang, dan pemilihan daftar', () => {
  const acak = buatEksporAcak();
  const fnDesimal = acak.get('desimal') as NilaiFungsiBawaan;
  const fnBilangan = acak.get('bilangan') as NilaiFungsiBawaan;
  const fnPilih = acak.get('pilih') as NilaiFungsiBawaan;

  const d = (fnDesimal.eksekusi([]) as any).nilai;
  benar(d >= 0.0 && d < 1.0);

  for (let i = 0; i < 20; i++) {
    const b = (fnBilangan.eksekusi([buatBilangan(10), buatBilangan(20)]) as any).nilai;
    benar(b >= 10 && b <= 20);
  }

  lemparGalat(
    () => fnBilangan.eksekusi([buatBilangan(50), buatBilangan(10)]),
    'batas minimum'
  );

  const daftarPilihan = [buatTeks('merah'), buatTeks('kuning'), buatTeks('hijau')];
  const itemTerpilih = (fnPilih.eksekusi([buatDaftar(daftarPilihan)]) as any).nilai;
  benar(['merah', 'kuning', 'hijau'].includes(itemTerpilih));
});

// ----------------------------------------------------------------------------
// 7. MODUL KOLEKSI
// ----------------------------------------------------------------------------
console.log('\n7. Pengujian Modul Standar koleksi:');

uji('koleksi.panjang, koleksi.kosong, koleksi.berisi, dan koleksi.cari', () => {
  const kol = buatEksporKoleksi();
  const fnPanjang = kol.get('panjang') as NilaiFungsiBawaan;
  const fnKosong = kol.get('kosong') as NilaiFungsiBawaan;
  const fnBerisi = kol.get('berisi') as NilaiFungsiBawaan;
  const fnCari = kol.get('cari') as NilaiFungsiBawaan;

  const d = buatDaftar([buatBilangan(10), buatBilangan(20), buatBilangan(30)]);

  samaDengan((fnPanjang.eksekusi([d]) as any).nilai, 3);
  salah((fnKosong.eksekusi([d]) as any).nilai);
  benar((fnKosong.eksekusi([buatDaftar([])]) as any).nilai);

  benar((fnBerisi.eksekusi([d, buatBilangan(20)]) as any).nilai);
  salah((fnBerisi.eksekusi([d, buatBilangan(99)]) as any).nilai);

  samaDengan((fnCari.eksekusi([d, buatBilangan(20)]) as any).nilai, 1);
  samaDengan((fnCari.eksekusi([d, buatBilangan(99)]) as any).nilai, -1);
});

uji('koleksi.balik, koleksi.urutkan, koleksi.gabung, dan koleksi.iris', () => {
  const kol = buatEksporKoleksi();
  const fnBalik = kol.get('balik') as NilaiFungsiBawaan;
  const fnUrutkan = kol.get('urutkan') as NilaiFungsiBawaan;
  const fnGabung = kol.get('gabung') as NilaiFungsiBawaan;
  const fnIris = kol.get('iris') as NilaiFungsiBawaan;

  const d = buatDaftar([buatBilangan(3), buatBilangan(1), buatBilangan(4)]);

  const terbalik: any = fnBalik.eksekusi([d]);
  samaDengan(terbalik.elemen[0].nilai, 4);
  samaDengan(terbalik.elemen[2].nilai, 3);

  const terurut: any = fnUrutkan.eksekusi([d]);
  samaDengan(terurut.elemen[0].nilai, 1);
  samaDengan(terurut.elemen[1].nilai, 3);
  samaDengan(terurut.elemen[2].nilai, 4);

  const gabungan: any = fnGabung.eksekusi([buatDaftar([buatBilangan(1)]), buatDaftar([buatBilangan(2)])]);
  samaDengan(gabungan.elemen.length, 2);

  const teriris: any = fnIris.eksekusi([
    buatDaftar([buatBilangan(10), buatBilangan(20), buatBilangan(30), buatBilangan(40)]),
    buatBilangan(1),
    buatBilangan(3),
  ]);
  samaDengan(teriris.elemen.length, 2);
  samaDengan(teriris.elemen[0].nilai, 20);
  samaDengan(teriris.elemen[1].nilai, 30);
});

// ----------------------------------------------------------------------------
// 8. MODUL BERKAS & SANDBOX FILESYSTEM
// ----------------------------------------------------------------------------
console.log('\n8. Pengujian Modul Standar berkas & Sandbox Filesystem:');

uji('Operasi berkas memori: ada, tulis, baca, tambah, ukuran, buatDirektori, daftarDirektori', () => {
  const memFS = new PembacaBerkasMemori();
  const sandbox = new SandboxBerkas(memFS, '/proyek');
  const berkasMod = buatEksporBerkas(sandbox);

  const fnAda = berkasMod.get('ada') as NilaiFungsiBawaan;
  const fnTulis = berkasMod.get('tulis') as NilaiFungsiBawaan;
  const fnBaca = berkasMod.get('baca') as NilaiFungsiBawaan;
  const fnTambah = berkasMod.get('tambah') as NilaiFungsiBawaan;
  const fnUkuran = berkasMod.get('ukuran') as NilaiFungsiBawaan;
  const fnDaftar = berkasMod.get('daftarDirektori') as NilaiFungsiBawaan;

  salah((fnAda.eksekusi([buatTeks('catatan.txt')]) as any).nilai);

  benar((fnTulis.eksekusi([buatTeks('catatan.txt'), buatTeks('Halo Nusantara')]) as any).nilai);
  benar((fnAda.eksekusi([buatTeks('catatan.txt')]) as any).nilai);
  samaDengan((fnBaca.eksekusi([buatTeks('catatan.txt')]) as any).nilai, 'Halo Nusantara');

  benar((fnTambah.eksekusi([buatTeks('catatan.txt'), buatTeks(' Merdeka')]) as any).nilai);
  samaDengan((fnBaca.eksekusi([buatTeks('catatan.txt')]) as any).nilai, 'Halo Nusantara Merdeka');
  samaDengan((fnUkuran.eksekusi([buatTeks('catatan.txt')]) as any).nilai, 22);

  const isiDir: any = fnDaftar.eksekusi([]);
  benar(isiDir.elemen.length > 0);
});

uji('Keamanan Sandbox: penolakan path traversal ekstrem dan berkas sensitif sistem', () => {
  const memFS = new PembacaBerkasMemori();
  const sandbox = new SandboxBerkas(memFS, '/proyek');
  const berkasMod = buatEksporBerkas(sandbox);
  const fnBaca = berkasMod.get('baca') as NilaiFungsiBawaan;

  lemparGalat(
    () => fnBaca.eksekusi([buatTeks('../../../../../../../etc/passwd')]),
    'sandbox'
  );

  lemparGalat(
    () => fnBaca.eksekusi([buatTeks('/etc/shadow')]),
    'sensitif'
  );
});

// ----------------------------------------------------------------------------
// 9. MODUL SISTEM
// ----------------------------------------------------------------------------
console.log('\n9. Pengujian Modul Standar sistem:');

uji('Informasi lingkungan versi, platform, arsitektur, argumen, dan env', () => {
  const sys = buatEksporSistem(['--mode', 'produksi'], { KUNCI_RAHASIA: '12345' });
  const fnVersi = sys.get('versi') as NilaiFungsiBawaan;
  const fnPlatform = sys.get('platform') as NilaiFungsiBawaan;
  const fnArsitektur = sys.get('arsitektur') as NilaiFungsiBawaan;
  const fnArgumen = sys.get('argumen') as NilaiFungsiBawaan;
  const fnAmbilEnv = sys.get('ambilEnv') as NilaiFungsiBawaan;
  const fnUptime = sys.get('waktuOperasi') as NilaiFungsiBawaan;

  samaDengan((fnVersi.eksekusi([]) as any).nilai, '0.17.0');
  benar(typeof (fnPlatform.eksekusi([]) as any).nilai === 'string');
  benar(typeof (fnArsitektur.eksekusi([]) as any).nilai === 'string');

  const args: any = fnArgumen.eksekusi([]);
  samaDengan(args.elemen[0].nilai, '--mode');
  samaDengan(args.elemen[1].nilai, 'produksi');

  samaDengan((fnAmbilEnv.eksekusi([buatTeks('KUNCI_RAHASIA')]) as any).nilai, '12345');
  benar((fnUptime.eksekusi([]) as any).nilai >= 0);
});

// ----------------------------------------------------------------------------
// 10. INTEGRASI PENUH INTERPRETER (END-TO-END .nusantara)
// ----------------------------------------------------------------------------
console.log('\n10. Pengujian Integrasi End-to-End dengan Interpreter NUSANTARA:');

uji('Program NUSANTARA mengimpor dan menggunakan modul teks', () => {
  const kode = `
program UjiTeks
gunakan "teks" sebagai teks

mulai
    s : teks = "nusantara"
    besar : teks = teks.kapital(s)
    potongan : teks = teks.potong(besar, 0, 4)
    tampilkan("Hasil:", potongan)
selesai
`;
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kode);

  samaDengan(buffer.dapatkanSeluruhTeks().join('\n').trim(), 'Hasil: NUSA');
});

uji('Program NUSANTARA mengimpor dan menggunakan modul matematika', () => {
  const kode = `
program UjiMatematika
gunakan "matematika" sebagai mtk

mulai
    maks : bilangan = mtk.maksimum(42, 100)
    pangkatDua : bilangan = mtk.pangkat(3, 4)
    tampilkan("Maks:", maks)
    tampilkan("Pangkat:", pangkatDua)
selesai
`;
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kode);

  benar(buffer.dapatkanSeluruhTeks().join('\n').includes('Maks: 100'));
  benar(buffer.dapatkanSeluruhTeks().join('\n').includes('Pangkat: 81'));
});

uji('Program NUSANTARA menggunakan destrukturisasi impor dari konversi', () => {
  const kode = `
program UjiKonversi
impor { keTeks, keBilangan } dari "konversi"

mulai
    angka : bilangan = keBilangan("789")
    tulisan : teks = keTeks(angka)
    tampilkan("Tulisan:", tulisan)
selesai
`;
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kode);

  samaDengan(buffer.dapatkanSeluruhTeks().join('\n').trim(), 'Tulisan: 789');
});

uji('Program NUSANTARA menggunakan modul koleksi', () => {
  const kode = `
program UjiKoleksi
gunakan "koleksi" sebagai kol

mulai
    daftarAwal : daftar = [50, 10, 40, 20]
    terurut : daftar = kol.urutkan(daftarAwal)
    banyak : bilangan = kol.panjang(terurut)
    adaSepuluh : logika = kol.berisi(terurut, 10)
    tampilkan("Panjang:", banyak)
    tampilkan("Ada 10:", adaSepuluh)
selesai
`;
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kode);

  benar(buffer.dapatkanSeluruhTeks().join('\n').includes('Panjang: 4'));
  benar(buffer.dapatkanSeluruhTeks().join('\n').includes('Ada 10: benar'));
});

uji('Program NUSANTARA menggunakan modul berkas dalam Sandbox Memori', () => {
  const kode = `
program UjiBerkas
gunakan "berkas" sebagai file

mulai
    suksesTulis : logika = file.tulis("halo.txt", "Salam dari Nusantara")
    isiBerkas : teks = file.baca("halo.txt")
    tampilkan("Isi:", isiBerkas)
selesai
`;
  const buffer = new PenulisOutputBuffer();
  const memFS = new PembacaBerkasMemori();
  const sandbox = new SandboxBerkas(memFS, '/proyek');
  const interpreter = new Interpreter(buffer, { sandboxBerkas: sandbox, pembacaBerkas: memFS });
  interpreter.jalankanKode(kode);

  samaDengan(buffer.dapatkanSeluruhTeks().join('\n').trim(), 'Isi: Salam dari Nusantara');
});

uji('Program NUSANTARA menggunakan modul sistem', () => {
  const kode = `
program UjiSistem
gunakan "sistem" sebagai sys

mulai
    ver : teks = sys.versi()
    tampilkan("Versi:", ver)
selesai
`;
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kode);

  samaDengan(buffer.dapatkanSeluruhTeks().join('\n').trim(), 'Versi: 0.17.0');
});

console.log('\n======================================================');
console.log(`TOTAL UJI: ${totalUji} | BERHASIL: ${ujiBerhasil} | GAGAL: ${ujiGagal}`);
console.log('======================================================\n');

if (ujiGagal > 0) {
  process.exit(1);
}
