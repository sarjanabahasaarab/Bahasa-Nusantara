/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 29 Test Suite
 * Pengujian Komprehensif Database API & Data Access (SQLite Adapter, Prepared Statements,
 * Transaksi, Parameter Binding, SQL Injection Prevention, dan Integrasi Modul Nusantara).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { AdaptorSQLite } from '../../src/database/sqlite';
import { JenisGalatBasisdata, GalatBasisdata } from '../../src/database/jenis';
import {
  KATALOG_MODUL_STANDAR,
  apakahModulStandar,
  dapatkanSemuaModulStandar,
  buatEksporBasisdata,
} from '../../src/stdlib';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { JenisNilaiRuntime, NilaiPeta, NilaiFungsiBawaan } from '../../src/interpreter/nilai';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;

function uji(deskripsi: string, fn: () => void) {
  totalUji++;
  try {
    fn();
    totalLulus++;
    console.log(`  ✓ ${deskripsi}`);
  } catch (err) {
    totalGagal++;
    console.error(`  ✗ ${deskripsi}`);
    console.error(`    ${(err as Error).message}`);
  }
}

function pastikan(kondisi: boolean, pesan: string = 'Penegasan gagal') {
  if (!kondisi) {
    throw new Error(pesan);
  }
}

function pastikanSama(aktual: any, diharapkan: any, pesan?: string) {
  if (aktual !== diharapkan) {
    throw new Error(
      pesan || `Diharapkan ${JSON.stringify(diharapkan)}, tetapi didapat ${JSON.stringify(aktual)}`
    );
  }
}

console.log('=== PENGUJIAN KOMPREHENSIF DATABASE API & DATA ACCESS (PHASE 29) ===\n');

// ----------------------------------------------------------------------------
// 1. REGISTRI MODUL STANDAR (basisdata & database)
// ----------------------------------------------------------------------------
console.log('1. Pengujian Registri dan Katalog Modul Standar Fase 29:');

uji("Modul 'basisdata' dan alias 'database' terdaftar di katalog stdlib", () => {
  pastikan(KATALOG_MODUL_STANDAR['basisdata'] !== undefined, "Modul 'basisdata' harus ada di katalog");
  pastikan(KATALOG_MODUL_STANDAR['database'] !== undefined, "Alias 'database' harus ada di katalog");
  pastikanSama(KATALOG_MODUL_STANDAR['basisdata'].nama, 'basisdata');
  pastikanSama(KATALOG_MODUL_STANDAR['database'].nama, 'database');
});

uji('apakahModulStandar mengenali basisdata, database, dan format prefix std:', () => {
  pastikan(apakahModulStandar('basisdata'), 'basisdata harus dikenali');
  pastikan(apakahModulStandar('database'), 'database harus dikenali');
  pastikan(apakahModulStandar('std:basisdata'), 'std:basisdata harus dikenali');
  pastikan(apakahModulStandar('stdlib:database'), 'stdlib:database harus dikenali');
  pastikan(apakahModulStandar('nusantara:basisdata'), 'nusantara:basisdata harus dikenali');
});

uji('dapatkanSemuaModulStandar memuat modul Fase 29', () => {
  const semua = dapatkanSemuaModulStandar();
  pastikan(semua.includes('basisdata'), 'Daftar harus memuat basisdata');
  pastikan(semua.includes('database'), 'Daftar harus memuat database');
});

// ----------------------------------------------------------------------------
// 2. ADAPTOR SQLITE IN-MEMORY & FILE STORAGE
// ----------------------------------------------------------------------------
console.log('\n2. Pengujian Adaptor SQLite (In-Memory & Persistensi Berkas):');

uji('Buka dan tutup koneksi SQLite in-memory (:memory:)', () => {
  const db = new AdaptorSQLite();
  pastikan(!db.apakahTerbuka(), 'Sebelum dibuka, status harus belum terbuka');
  db.buka({ jalur: ':memory:' });
  pastikan(db.apakahTerbuka(), 'Setelah dibuka, status harus terbuka');
  pastikanSama(db.namaDriver, 'sqlite');
  pastikan(db.versiDriver.includes('SQLite 3'), 'Versi driver harus menyebut SQLite 3');
  db.tutup();
  pastikan(!db.apakahTerbuka(), 'Setelah ditutup, status harus tidak terbuka');
});

uji('Persistensi data pada berkas SQLite lokal', () => {
  const berkasDb = path.join(process.cwd(), 'temp_uji_fase29.db');
  if (fs.existsSync(berkasDb)) {
    try {
      fs.unlinkSync(berkasDb);
    } catch {
      // Abaikan
    }
  }

  try {
    // Sesi 1: Tulis data
    const db1 = new AdaptorSQLite();
    db1.buka({ jalur: berkasDb });
    db1.eksekusi('CREATE TABLE konfigurasi (kunci TEXT PRIMARY KEY, nilai TEXT)');
    db1.eksekusi('INSERT INTO konfigurasi (kunci, nilai) VALUES (?, ?)', ['versi_app', '1.0.0']);
    db1.tutup();

    pastikan(fs.existsSync(berkasDb), 'Berkas database harus tercipta di disk');

    // Sesi 2: Baca kembali data yang tersimpan
    const db2 = new AdaptorSQLite();
    db2.buka({ jalur: berkasDb });
    const nilai = db2.ambilNilai<string>('SELECT nilai FROM konfigurasi WHERE kunci = ?', ['versi_app']);
    pastikanSama(nilai, '1.0.0', 'Data harus persisten setelah database ditutup dan dibuka kembali');
    db2.tutup();
  } finally {
    if (fs.existsSync(berkasDb)) {
      try {
        fs.unlinkSync(berkasDb);
      } catch {
        // Abaikan
      }
    }
  }
});

// ----------------------------------------------------------------------------
// 3. DDL & DML, PREPARED STATEMENTS, PARAMETER BINDING
// ----------------------------------------------------------------------------
console.log('\n3. Pengujian DDL, DML, Prepared Statements, dan Parameter Binding:');

uji('Eksekusi DDL, Insert, Update, Delete dengan barisTerpengaruh dan idTerakhir', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });

  // DDL
  const hasilDDL = db.eksekusi(
    'CREATE TABLE karyawan (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL, divisi TEXT, gaji REAL)'
  );
  pastikan(hasilDDL.sukses, 'Pembuatan tabel harus sukses');

  // Insert Positional
  const ins1 = db.eksekusi('INSERT INTO karyawan (nama, divisi, gaji) VALUES (?, ?, ?)', [
    'Rahmat Hidayat',
    'Teknologi',
    12500000.5,
  ]);
  pastikanSama(ins1.barisTerpengaruh, 1);
  pastikanSama(ins1.idTerakhir, 1);

  const ins2 = db.eksekusi('INSERT INTO karyawan (nama, divisi, gaji) VALUES (?, ?, ?)', [
    'Dewi Sartika',
    'Desain',
    9500000.0,
  ]);
  pastikanSama(ins2.barisTerpengaruh, 1);
  pastikanSama(ins2.idTerakhir, 2);

  // Update
  const upd = db.eksekusi('UPDATE karyawan SET gaji = ? WHERE id = ?', [13500000.0, 1]);
  pastikanSama(upd.barisTerpengaruh, 1);

  // Delete
  const del = db.eksekusi('DELETE FROM karyawan WHERE id = ?', [2]);
  pastikanSama(del.barisTerpengaruh, 1);

  // Ambil sisa data
  const sisa = db.ambilSemua('SELECT * FROM karyawan');
  pastikanSama(sisa.length, 1);
  pastikanSama((sisa[0] as any).nama, 'Rahmat Hidayat');

  db.tutup();
});

uji('Named Parameter Binding (:nama, @divisi, $gaji)', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });

  db.eksekusi('CREATE TABLE produk (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT, stok INTEGER, harga REAL)');

  // Menggunakan objek parameter
  const hasil = db.eksekusi('INSERT INTO produk (nama, stok, harga) VALUES (:nama, :stok, :harga)', {
    nama: 'Batik Tulis Nusantara',
    stok: 25,
    harga: 350000.0,
  });
  pastikanSama(hasil.barisTerpengaruh, 1);

  const row = db.ambilSatu<any>('SELECT * FROM produk WHERE nama = :nama', { nama: 'Batik Tulis Nusantara' });
  pastikan(row !== null, 'Baris data harus ditemukan');
  pastikanSama(row.stok, 25);
  pastikanSama(row.harga, 350000.0);

  db.tutup();
});

// ----------------------------------------------------------------------------
// 4. QUERY API: ambilSemua, ambilSatu, ambilNilai
// ----------------------------------------------------------------------------
console.log('\n4. Pengujian Query API (ambilSemua, ambilSatu, ambilNilai):');

uji('ambilSemua mengembalikan daftar baris lengkap', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  db.eksekusi('CREATE TABLE angka (val INTEGER)');
  for (let i = 1; i <= 5; i++) {
    db.eksekusi('INSERT INTO angka (val) VALUES (?)', [i]);
  }

  const baris = db.ambilSemua<{ val: number }>('SELECT val FROM angka ORDER BY val ASC');
  pastikanSama(baris.length, 5);
  pastikanSama(baris[0].val, 1);
  pastikanSama(baris[4].val, 5);
  db.tutup();
});

uji('ambilSatu mengembalikan satu baris atau null jika tidak ada', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  db.eksekusi('CREATE TABLE kota (id INTEGER PRIMARY KEY, nama TEXT)');
  db.eksekusi('INSERT INTO kota (nama) VALUES (?)', ['Nusantara']);

  const ada = db.ambilSatu<{ id: number; nama: string }>('SELECT * FROM kota WHERE nama = ?', ['Nusantara']);
  pastikan(ada !== null, 'Harus mengembalikan baris');
  pastikanSama(ada?.nama, 'Nusantara');

  const nihil = db.ambilSatu('SELECT * FROM kota WHERE nama = ?', ['Atlantis']);
  pastikanSama(nihil, null, 'Harus mengembalikan null jika data tidak ditemukan');
  db.tutup();
});

uji('ambilNilai mengembalikan nilai kolom pertama baris pertama atau null', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  db.eksekusi('CREATE TABLE skor (poin REAL)');
  db.eksekusi('INSERT INTO skor (poin) VALUES (?)', [98.5]);
  db.eksekusi('INSERT INTO skor (poin) VALUES (?)', [75.0]);

  const maks = db.ambilNilai<number>('SELECT MAX(poin) FROM skor');
  pastikanSama(maks, 98.5);

  const jumlah = db.ambilNilai<number>('SELECT COUNT(*) FROM skor');
  pastikanSama(jumlah, 2);

  const kosong = db.ambilNilai('SELECT poin FROM skor WHERE poin > 100');
  pastikanSama(kosong, null);
  db.tutup();
});

// ----------------------------------------------------------------------------
// 5. PENCEGAHAN SQL INJECTION & VALIDASI KEAMANAN
// ----------------------------------------------------------------------------
console.log('\n5. Pengujian Pencegahan SQL Injection & Keamanan Jalur:');

uji('Prepared statements mencegah SQL injection secara menyeluruh', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  db.eksekusi('CREATE TABLE akun (username TEXT, password TEXT)');
  db.eksekusi('INSERT INTO akun (username, password) VALUES (?, ?)', ['admin', 'rahasia123']);

  // Serangan klasik ' OR '1'='1' --
  const injeksi = "' OR '1'='1' --";
  const hasil = db.ambilSemua('SELECT * FROM akun WHERE username = ? AND password = ?', [
    injeksi,
    'sembarang',
  ]);

  pastikanSama(hasil.length, 0, 'SQL injection harus gagal total karena parameter diperlakukan sebagai literal');
  db.tutup();
});

uji('Proteksi path traversal menolak akses direktori berbahaya di luar sandbox', () => {
  const db = new AdaptorSQLite();
  let tertangkap = false;
  try {
    db.buka({
      jalur: '../../../../../../etc/passwd.db',
      direktoriAman: path.join(process.cwd(), 'sandbox_aman'),
    });
  } catch (err) {
    tertangkap = true;
    pastikan(err instanceof GalatBasisdata, 'Harus melemparkan GalatBasisdata');
    pastikanSama(
      (err as GalatBasisdata).jenis,
      JenisGalatBasisdata.AKSES_JALUR_ILEGAL,
      'Jenis galat harus AKSES_JALUR_ILEGAL'
    );
  }
  pastikan(tertangkap, 'Path traversal harus ditolak');
});

// ----------------------------------------------------------------------------
// 6. MANAJEMEN TRANSAKSI (mulaiTransaksi, commit, rollback)
// ----------------------------------------------------------------------------
console.log('\n6. Pengujian Manajemen Transaksi:');

uji('Transaksi rollback membatalkan perubahan', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  db.eksekusi('CREATE TABLE catatan (teks TEXT)');

  db.mulaiTransaksi();
  pastikan(db.dalamTransaksi(), 'Harus dalam status transaksi');
  db.eksekusi('INSERT INTO catatan (teks) VALUES (?)', ['Catatan sementara']);
  db.rollback();
  pastikan(!db.dalamTransaksi(), 'Harus keluar dari status transaksi');

  const hitung = db.ambilNilai<number>('SELECT COUNT(*) FROM catatan');
  pastikanSama(hitung, 0, 'Data yang di-rollback tidak boleh tersimpan');
  db.tutup();
});

uji('Transaksi commit menyimpan perubahan secara permanen', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  db.eksekusi('CREATE TABLE rekening (pemilik TEXT, saldo REAL)');
  db.eksekusi('INSERT INTO rekening (pemilik, saldo) VALUES (?, ?)', ['A', 1000.0]);
  db.eksekusi('INSERT INTO rekening (pemilik, saldo) VALUES (?, ?)', ['B', 500.0]);

  // Transfer dana dalam transaksi
  db.mulaiTransaksi();
  db.eksekusi('UPDATE rekening SET saldo = saldo - 200 WHERE pemilik = ?', ['A']);
  db.eksekusi('UPDATE rekening SET saldo = saldo + 200 WHERE pemilik = ?', ['B']);
  db.commit();

  const saldoA = db.ambilNilai<number>('SELECT saldo FROM rekening WHERE pemilik = ?', ['A']);
  const saldoB = db.ambilNilai<number>('SELECT saldo FROM rekening WHERE pemilik = ?', ['B']);
  pastikanSama(saldoA, 800.0);
  pastikanSama(saldoB, 700.0);
  db.tutup();
});

// ----------------------------------------------------------------------------
// 7. DIAGNOSTIK GALAT BAHASA INDONESIA
// ----------------------------------------------------------------------------
console.log('\n7. Pengujian Pesan Diagnostik Galat Berbahasa Indonesia:');

uji('Galat pelanggaran UNIQUE constraint diterjemahkan ke Bahasa Indonesia', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  db.eksekusi('CREATE TABLE email_list (email TEXT UNIQUE)');
  db.eksekusi('INSERT INTO email_list (email) VALUES (?)', ['info@nusantara.id']);

  let kenaGalat = false;
  try {
    db.eksekusi('INSERT INTO email_list (email) VALUES (?)', ['info@nusantara.id']);
  } catch (err) {
    kenaGalat = true;
    pastikan(err instanceof GalatBasisdata);
    pastikanSama((err as GalatBasisdata).jenis, JenisGalatBasisdata.KEKANGAN_TERLANGGAR);
    pastikan(
      (err as Error).message.includes('Pelanggaran kekangan unik'),
      'Pesan galat harus berbahasa Indonesia'
    );
  }
  pastikan(kenaGalat, 'Duplikasi data harus memicu galat');
  db.tutup();
});

uji('Galat sintaks SQL diterjemahkan ke Bahasa Indonesia', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });

  let kenaGalat = false;
  try {
    db.eksekusi('SELECTT DARI tabel_palsu');
  } catch (err) {
    kenaGalat = true;
    pastikan(err instanceof GalatBasisdata);
    pastikanSama((err as GalatBasisdata).jenis, JenisGalatBasisdata.SINTAKS_SQL);
    pastikan(
      (err as Error).message.includes('Kesalahan sintaks SQL'),
      'Pesan galat sintaks harus berbahasa Indonesia'
    );
  }
  pastikan(kenaGalat, 'Sintaks salah harus memicu galat');
  db.tutup();
});

uji('Operasi pada koneksi yang sudah ditutup menghasilkan KONEKSI_TUTUP', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  db.tutup();

  let kenaGalat = false;
  try {
    db.eksekusi('SELECT 1');
  } catch (err) {
    kenaGalat = true;
    pastikan(err instanceof GalatBasisdata);
    pastikanSama((err as GalatBasisdata).jenis, JenisGalatBasisdata.KONEKSI_TUTUP);
  }
  pastikan(kenaGalat, 'Eksekusi pada koneksi tertutup harus memicu galat');
});

// ----------------------------------------------------------------------------
// 8. PABRIK EKSPOR STDLIB NUSANTARA: basisdata
// ----------------------------------------------------------------------------
console.log('\n8. Pengujian Pabrik Ekspor Standard Library basisdata:');

uji('Ekspor modul basisdata menyediakan bukaKoneksi, bukaMemori, dan versiDriver', () => {
  const ekspor = buatEksporBasisdata();
  pastikan(ekspor.has('bukaKoneksi'), 'Harus mengekspor bukaKoneksi');
  pastikan(ekspor.has('bukaMemori'), 'Harus mengekspor bukaMemori');
  pastikan(ekspor.has('versiDriver'), 'Harus mengekspor versiDriver');
  pastikan(ekspor.has('apakahTersedia'), 'Harus mengekspor apakahTersedia');

  const fnVersi = ekspor.get('versiDriver') as NilaiFungsiBawaan;
  const hasilVersi = fnVersi.eksekusi([]);
  pastikanSama(hasilVersi.jenis, JenisNilaiRuntime.TEKS);
  pastikan((hasilVersi as any).nilai.includes('SQLite 3'));
});

uji('bukaMemori menghasilkan objek koneksi Nusantara lengkap dengan method-method bawaan', () => {
  const ekspor = buatEksporBasisdata();
  const fnBukaMemori = ekspor.get('bukaMemori') as NilaiFungsiBawaan;
  const koneksi = fnBukaMemori.eksekusi([]) as NilaiPeta;

  pastikanSama(koneksi.jenis, JenisNilaiRuntime.PETA);
  pastikan(koneksi.nilai.has('eksekusi'), 'Koneksi harus memiliki method eksekusi');
  pastikan(koneksi.nilai.has('ambilSemua'), 'Koneksi harus memiliki method ambilSemua');
  pastikan(koneksi.nilai.has('ambilSatu'), 'Koneksi harus memiliki method ambilSatu');
  pastikan(koneksi.nilai.has('ambilNilai'), 'Koneksi harus memiliki method ambilNilai');
  pastikan(koneksi.nilai.has('mulaiTransaksi'), 'Koneksi harus memiliki method mulaiTransaksi');
  pastikan(koneksi.nilai.has('commit'), 'Koneksi harus memiliki method commit');
  pastikan(koneksi.nilai.has('rollback'), 'Koneksi harus memiliki method rollback');
  pastikan(koneksi.nilai.has('tutup'), 'Koneksi harus memiliki method tutup');

  // Tutup koneksi
  const fnTutup = koneksi.nilai.get('tutup') as NilaiFungsiBawaan;
  fnTutup.eksekusi([]);
});

// ----------------------------------------------------------------------------
// 9. INTEGRASI PENUH INTERPRETER DENGAN PROGRAM .nusantara
// ----------------------------------------------------------------------------
console.log('\n9. Pengujian Integrasi Penuh Interpreter dengan Modul basisdata:');

function jalankanProgram(kode: string): string {
  const buffer = new PenulisOutputBuffer();
  const interpreter = new Interpreter(buffer);
  interpreter.jalankanKode(kode);
  return buffer.dapatkanSeluruhTeks().join('\n');
}

uji('Program NUSANTARA: Buka DB in-memory, DDL, Insert, Query, dan Tampilkan Hasil', () => {
  const kode = `program UjiDatabaseDasar
gunakan "basisdata" sebagai db
gunakan "koleksi" sebagai koleksi

mulai
    koneksi : peta = db.bukaMemori()
    koneksi.eksekusi("CREATE TABLE siswa (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT, nilai REAL)")
    
    koneksi.eksekusi("INSERT INTO siswa (nama, nilai) VALUES (?, ?)", ["Ahmad", 92.5])
    koneksi.eksekusi("INSERT INTO siswa (nama, nilai) VALUES (?, ?)", ["Siti", 97.0])
    
    total : bilangan = koneksi.ambilNilai("SELECT COUNT(*) FROM siswa")
    tampilkan("Total Siswa:", total)
    
    siswaSatu : peta = koneksi.ambilSatu("SELECT * FROM siswa WHERE nama = ?", ["Ahmad"])
    namaSiswa : teks = siswaSatu["nama"]
    tampilkan("Nama Pertama:", namaSiswa)
    
    semuaSiswa : daftar = koneksi.ambilSemua("SELECT * FROM siswa ORDER BY nilai DESC")
    tampilkan("Jumlah Daftar:", koleksi.panjang(semuaSiswa))
    
    koneksi.tutup()
selesai
`;

  const logs = jalankanProgram(kode);
  pastikan(logs.includes('Total Siswa: 2'), 'Harus menampilkan total siswa 2');
  pastikan(logs.includes('Nama Pertama: Ahmad'), 'Harus menampilkan nama pertama Ahmad');
  pastikan(logs.includes('Jumlah Daftar: 2'), 'Harus menampilkan jumlah daftar 2');
});

uji('Program NUSANTARA: Transaksi Rollback dan Commit dalam Program', () => {
  const kode = `program UjiTransaksi
gunakan "basisdata" sebagai db

mulai
    koneksi : peta = db.bukaMemori()
    koneksi.eksekusi("CREATE TABLE dompet (nama TEXT, koin INTEGER)")
    koneksi.eksekusi("INSERT INTO dompet (nama, koin) VALUES (?, ?)", ["Budi", 100])
    
    koneksi.mulaiTransaksi()
    koneksi.eksekusi("UPDATE dompet SET koin = 50 WHERE nama = ?", ["Budi"])
    koneksi.rollback()
    
    koinSetelahRollback : bilangan = koneksi.ambilNilai("SELECT koin FROM dompet WHERE nama = ?", ["Budi"])
    tampilkan("Koin Rollback:", koinSetelahRollback)
    
    koneksi.mulaiTransaksi()
    koneksi.eksekusi("UPDATE dompet SET koin = 250 WHERE nama = ?", ["Budi"])
    koneksi.commit()
    
    koinSetelahCommit : bilangan = koneksi.ambilNilai("SELECT koin FROM dompet WHERE nama = ?", ["Budi"])
    tampilkan("Koin Commit:", koinSetelahCommit)
    
    koneksi.tutup()
selesai
`;

  const logs = jalankanProgram(kode);
  pastikan(logs.includes('Koin Rollback: 100'), 'Harus menampilkan Koin Rollback: 100');
  pastikan(logs.includes('Koin Commit: 250'), 'Harus menampilkan Koin Commit: 250');
});

// ----------------------------------------------------------------------------
// REKAPITULASI
// ----------------------------------------------------------------------------
console.log('\n=============================================================================');
console.log(`HASIL PENGUJIAN PHASE 29: ${totalLulus} Lulus, ${totalGagal} Gagal dari ${totalUji} Uji.`);
console.log('=============================================================================');

if (totalGagal > 0) {
  process.exit(1);
}
