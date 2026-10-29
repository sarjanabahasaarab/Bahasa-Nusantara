/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rangkaian Pengujian Resmi ORM, Query Builder, Schema & Database Migration (Phase 32)
 * Target Milestone: v0.32.0
 */

import {
  AdaptorSQLite,
  QueryBuilder,
  GalatBasisdata,
  JenisGalatBasisdata,
} from '../../src/database';
import {
  definisiModel,
  kolomId,
  kolomTeks,
  kolomBilangan,
  kolomDesimal,
  kolomLogika,
  kolomWaktu,
  kolomJSON,
  memilikiBanyak,
  milikDari,
  banyakKeBanyak,
  RepositoriModel,
  tetapkanAdaptorGlobalORM,
} from '../../src/orm';
import {
  SchemaBuilder,
  PelariMigrasi,
  DefinisiMigrasi,
} from '../../src/migration';
import { PelariSeeder, DefinisiSeeder } from '../../src/seeder';
import {
  apakahModulStandar,
  normalisasiNamaModulStandar,
  KATALOG_MODUL_STANDAR,
} from '../../src/stdlib';
import { NusantaraCLI } from '../../src/paket/cli';
import { PembacaBerkasMemori } from '../../src/modul/pembacaBerkas';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { PengelolaPassword } from '../../src/autentikasi/password';

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
console.log('PENGUJIAN KOMPREHENSIF ORM, QUERY BUILDER & MIGRATION (PHASE 32) — v0.32.0');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// GRUP 1: Katalog & Registri Modul Standar Fase 32
// -----------------------------------------------------------------------------
console.log('=== [GRUP 1: Katalog & Registri Modul Standar orm] ===');

uji('1.1 Modul orm, migrasi, dan migration terdaftar di katalog stdlib', () => {
  pastikan(apakahModulStandar('orm'), "Modul 'orm' harus terdaftar");
  pastikan(apakahModulStandar('migrasi'), "Modul 'migrasi' harus terdaftar");
  pastikan(apakahModulStandar('migration'), "Modul 'migration' harus terdaftar");
  samaDengan(normalisasiNamaModulStandar('std:orm'), 'orm');
  samaDengan(normalisasiNamaModulStandar('nusantara:migrasi'), 'migrasi');
});

uji('1.2 Pabrik ekspor modul orm menyediakan simbol-simbol resmi', () => {
  const meta = KATALOG_MODUL_STANDAR['orm'];
  pastikan(Boolean(meta), 'Metadata modul orm harus tersedia');
  const ekspor = meta.pabrikEkspor();
  pastikan(ekspor.has('tetapkanKoneksi'), 'Harus memuat tetapkanKoneksi');
  pastikan(ekspor.has('buatKueri'), 'Harus memuat buatKueri');
  pastikan(ekspor.has('migrasiSkema'), 'Harus memuat migrasiSkema');
  pastikan(ekspor.has('statusMigrasi'), 'Harus memuat statusMigrasi');
  pastikan(ekspor.has('rollbackMigrasi'), 'Harus memuat rollbackMigrasi');
});

// -----------------------------------------------------------------------------
// GRUP 2: Schema Builder & DDL Generator
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 2: Schema Builder & DDL Generator] ===');

uji('2.1 SchemaBuilder membuat tabel dengan kolom lengkap dan kunci primer', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });

  const skema = new SchemaBuilder(db);
  skema.buatTabel('kategori', (t) => {
    t.id();
    t.teks('nama', 100, { unique: true });
    t.teksPanjang('deskripsi');
    t.bilangan('urutan', { default: 1 });
    t.logika('aktif', { default: true });
    t.stempelWaktu();
    t.indeks('urutan');
  });

  pastikan(skema.apakahTabelAda('kategori'), "Tabel 'kategori' harus berhasil dibuat");
});

uji('2.2 SchemaBuilder mendukung kunci asing dan penghapusan tabel (DROP TABLE)', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  const skema = new SchemaBuilder(db);

  skema.buatTabel('induk', (t) => {
    t.id();
    t.teks('label');
  });

  skema.buatTabel('anak', (t) => {
    t.id();
    t.bilangan('induk_id');
    t.teks('catatan');
    t.relasiKunciAsing('induk_id', 'induk', 'id', { padaHapus: 'CASCADE' });
  });

  pastikan(skema.apakahTabelAda('anak'), 'Tabel anak harus ada');

  skema.hapusTabel('anak');
  pastikan(!skema.apakahTabelAda('anak'), 'Tabel anak harus berhasil dihapus');
});

// -----------------------------------------------------------------------------
// GRUP 3: Query Builder & Proteksi SQL Injection
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 3: Query Builder & Parameter Binding] ===');

uji('3.1 Query Builder menyusun kueri SELECT dengan parameter terikat', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  const skema = new SchemaBuilder(db);
  skema.buatTabel('produk', (t) => {
    t.id();
    t.teks('nama');
    t.bilangan('harga');
    t.teks('kategori');
  });

  const qb = new QueryBuilder(db, 'produk');
  qb.select('id', 'nama', 'harga')
    .where('harga', '>=', 50000)
    .where('kategori', 'elektronik')
    .orderBy('harga', 'DESC')
    .limit(10)
    .offset(5);

  const { sql, parameter } = qb.toSql();
  pastikan(sql.includes('SELECT "id", "nama", "harga" FROM "produk"'), 'Klausul SELECT valid');
  pastikan(sql.includes('WHERE "harga" >= ? AND "kategori" = ?'), 'Klausul WHERE dengan parameter ?');
  pastikan(sql.includes('ORDER BY "harga" DESC'), 'Klausul ORDER BY valid');
  pastikan(sql.includes('LIMIT ? OFFSET ?'), 'Klausul LIMIT & OFFSET valid');
  samaDengan(parameter.length, 4, 'Harus memuat 4 parameter terikat');
  samaDengan(parameter[0], 50000);
  samaDengan(parameter[1], 'elektronik');
  samaDengan(parameter[2], 10);
  samaDengan(parameter[3], 5);
});

uji('3.2 Query Builder menolak SQL injection pada identifier kolom dan tabel', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });

  let tertolakTabel = false;
  try {
    new QueryBuilder(db, 'produk; DROP TABLE users; --');
  } catch (err: any) {
    tertolakTabel = true;
    pastikan(err instanceof GalatBasisdata, 'Harus melempar GalatBasisdata');
  }
  pastikan(tertolakTabel, 'Identifier tabel jahat harus ditolak');

  const qb = new QueryBuilder(db, 'produk');
  let tertolakKolom = false;
  try {
    qb.where('id = 1 OR 1=1', 'test');
  } catch {
    tertolakKolom = true;
  }
  pastikan(tertolakKolom, 'Identifier kolom jahat harus ditolak');
});

uji('3.3 Query Builder memblokir update dan delete massal tanpa WHERE', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  const skema = new SchemaBuilder(db);
  skema.buatTabel('items', (t) => {
    t.id();
    t.teks('nama');
  });

  const qb = new QueryBuilder(db, 'items');

  let updateTertolak = false;
  try {
    qb.update({ nama: 'Semua' });
  } catch (err: any) {
    updateTertolak = true;
    pastikan(err.message.includes('tanpa klausul WHERE diblokir'), 'Pesan blokir update massal');
  }
  pastikan(updateTertolak, 'Update massal tanpa WHERE harus diblokir');

  let deleteTertolak = false;
  try {
    qb.delete();
  } catch (err: any) {
    deleteTertolak = true;
    pastikan(err.message.includes('tanpa klausul WHERE diblokir'), 'Pesan blokir delete massal');
  }
  pastikan(deleteTertolak, 'Delete massal tanpa WHERE harus diblokir');
});

uji('3.4 Query Builder menjalankan CRUD, count, exists, dan pagination', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  const skema = new SchemaBuilder(db);
  skema.buatTabel('buku', (t) => {
    t.id();
    t.teks('judul');
    t.bilangan('stok');
  });

  const qb = new QueryBuilder(db, 'buku');

  // Insert data
  qb.insert([
    { judul: 'Pemrograman Nusantara', stok: 15 },
    { judul: 'Algoritma & Struktur Data', stok: 8 },
    { judul: 'Arsitektur Basis Data', stok: 20 },
    { judul: 'Jaringan Komputer', stok: 5 },
  ]);

  samaDengan(new QueryBuilder(db, 'buku').count(), 4, 'Total harus 4 buku');
  pastikan(new QueryBuilder(db, 'buku').where('stok', '>=', 10).exists(), 'Harus ada stok >= 10');

  // Paginasi
  const hal = new QueryBuilder(db, 'buku').orderBy('stok', 'DESC').paginate(1, 2);
  samaDengan(hal.total, 4);
  samaDengan(hal.data.length, 2);
  samaDengan(hal.totalHalaman, 2);
  samaDengan(hal.data[0].judul, 'Arsitektur Basis Data');
});

// -----------------------------------------------------------------------------
// GRUP 4: Model ORM Deklaratif & Siklus Hidup Entitas
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 4: Model ORM Deklaratif & CRUD Lifecycle] ===');

uji('4.1 Model ORM membuat, membaca, memperbarui, dan menghapus entitas', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  const skema = new SchemaBuilder(db);

  skema.buatTabel('pelanggan', (t) => {
    t.id();
    t.teks('nama', 100);
    t.teks('email', 100, { unique: true });
    t.bilangan('poin', { default: 0 });
    t.stempelWaktu();
  });

  const Pelanggan = definisiModel({
    namaTabel: 'pelanggan',
    adaptor: db,
    fields: {
      id: kolomId(),
      nama: kolomTeks('nama', { panjangMaksimal: 100 }),
      email: kolomTeks('email', { panjangMaksimal: 100, unique: true }),
      poin: kolomBilangan('poin', { default: 0 }),
    },
    timestamps: true,
  });

  // 1. Buat record baru
  const baru = Pelanggan.buat({
    nama: 'Budi Santoso',
    email: 'budi@nusantara.id',
    poin: 100,
  });

  pastikan(baru.id !== undefined && baru.id !== null, 'Primary key harus terisi otomatis');
  samaDengan(baru.nama, 'Budi Santoso');
  samaDengan(baru.email, 'budi@nusantara.id');

  // 2. Temukan record
  const ditemukan = Pelanggan.temukan(baru.id);
  pastikan(Boolean(ditemukan), 'Harus menemukan pelanggan berdasarkan id');
  samaDengan(ditemukan?.poin, 100);

  // 3. Mutasi dan Simpan
  ditemukan!.poin = 250;
  ditemukan!.simpan();

  const setelahUpdate = Pelanggan.temukan(baru.id);
  samaDengan(setelahUpdate?.poin, 250, 'Poin harus terupdate menjadi 250');

  // 4. Hapus record
  const suksesHapus = setelahUpdate!.hapus();
  pastikan(suksesHapus, 'Hapus harus berhasil');
  samaDengan(Pelanggan.temukan(baru.id), null, 'Record harus sudah hilang dari database');
});

uji('4.2 Model ORM memvalidasi batasan field (panjang maksimal, not null)', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  new SchemaBuilder(db).buatTabel('validasi_uji', (t) => {
    t.id();
    t.teks('kode', 5);
  });

  const ModelUji = definisiModel({
    namaTabel: 'validasi_uji',
    adaptor: db,
    fields: {
      id: kolomId(),
      kode: kolomTeks('kode', { panjangMaksimal: 5 }),
    },
    timestamps: false,
  });

  let tertolak = false;
  try {
    ModelUji.buat({ kode: 'TERLALUPANJANG' });
  } catch (err: any) {
    tertolak = true;
    pastikan(err.message.includes('melebihi batas maksimal'), 'Harus menolak teks terlalu panjang');
  }
  pastikan(tertolak, 'Teks melebihi batas kolom harus digagalkan');
});

// -----------------------------------------------------------------------------
// GRUP 5: Relasi Antarmodel (One-to-Many & Many-to-Many)
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 5: Relasi Antarmodel ORM] ===');

uji('5.1 Relasi One-to-Many (memilikiBanyak & milikDari) bekerja secara efisien', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  const skema = new SchemaBuilder(db);

  skema.buatTabel('penulis', (t) => {
    t.id();
    t.teks('nama');
  });

  skema.buatTabel('artikel', (t) => {
    t.id();
    t.bilangan('penulis_id');
    t.teks('judul');
  });

  let PenulisModel: any;
  let ArtikelModel: any;

  PenulisModel = definisiModel({
    namaTabel: 'penulis',
    adaptor: db,
    fields: {
      id: kolomId(),
      nama: kolomTeks('nama'),
    },
    relasi: {
      artikel: memilikiBanyak('artikel', () => ArtikelModel, 'penulis_id'),
    },
    timestamps: false,
  });

  ArtikelModel = definisiModel({
    namaTabel: 'artikel',
    adaptor: db,
    fields: {
      id: kolomId(),
      penulis_id: kolomBilangan('penulis_id'),
      judul: kolomTeks('judul'),
    },
    relasi: {
      penulis: milikDari('penulis', () => PenulisModel, 'penulis_id'),
    },
    timestamps: false,
  });

  const p = PenulisModel.buat({ nama: 'Pramoedya' });
  ArtikelModel.buat({ penulis_id: p.id, judul: 'Bumi Manusia' });
  ArtikelModel.buat({ penulis_id: p.id, judul: 'Anak Semua Bangsa' });

  // Ambil relasi dari satu ke banyak
  const daftarArtikel = p.muat('artikel');
  samaDengan(daftarArtikel.length, 2, 'Harus memiliki 2 artikel');
  samaDengan(daftarArtikel[0].judul, 'Bumi Manusia');

  // Ambil relasi dari anak ke induk
  const artikelSatu = ArtikelModel.temukan(1);
  const indukPenulis = artikelSatu.muat('penulis');
  samaDengan(indukPenulis.nama, 'Pramoedya');
});

// -----------------------------------------------------------------------------
// GRUP 6: Transaksi Database & Konsistensi Data
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 6: Transaksi Database & Rollback] ===');

uji('6.1 Transaksi Commit menyimpan perubahan, Rollback mengembalikan keadaan semula', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  new SchemaBuilder(db).buatTabel('rekening', (t) => {
    t.id();
    t.teks('nama');
    t.bilangan('saldo');
  });

  const Rekening = definisiModel({
    namaTabel: 'rekening',
    adaptor: db,
    fields: {
      id: kolomId(),
      nama: kolomTeks('nama'),
      saldo: kolomBilangan('saldo'),
    },
    timestamps: false,
  });

  const r1 = Rekening.buat({ nama: 'Ali', saldo: 100000 });
  const r2 = Rekening.buat({ nama: 'Budi', saldo: 50000 });

  // Transaksi transfer yang gagal di tengah jalan
  db.mulaiTransaksi();
  try {
    r1.saldo -= 30000;
    r1.simpan();

    // Simulasi kegagalan
    throw new Error('Jaringan terputus sebelum saldo penerima ditambah!');
  } catch {
    db.rollback();
  }

  // Cek saldo Ali tetap 100000 karena rollback
  const aliPulih = Rekening.temukan(r1.id);
  samaDengan(aliPulih?.saldo, 100000, 'Saldo harus tetap 100000 akibat rollback');
});

// -----------------------------------------------------------------------------
// GRUP 7: Sistem Migrasi & Riwayat (Migration Runner)
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 7: Sistem Migrasi Database] ===');

uji('7.1 PelariMigrasi menerapkan migrasi bertahap, mencatat batch, dan status', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  const pelari = new PelariMigrasi(db);

  pelari.daftarkan([
    {
      nama: '001_buat_tabel_pengguna',
      naik: (skema) => {
        skema.buatTabel('pengguna', (t) => {
          t.id();
          t.teks('username', 50, { unique: true });
        });
      },
      turun: (skema) => {
        skema.hapusTabel('pengguna');
      },
    },
    {
      nama: '002_tambah_tabel_pesan',
      naik: (skema) => {
        skema.buatTabel('pesan', (t) => {
          t.id();
          t.teks('isi');
        });
      },
      turun: (skema) => {
        skema.hapusTabel('pesan');
      },
    },
  ]);

  // Cek status sebelum migrasi
  const stAwal = pelari.status();
  samaDengan(stAwal.filter((s) => s.status === 'tertunda').length, 2);

  // Jalankan migrasi Batch 1
  const hasil = pelari.migrasi();
  samaDengan(hasil.berhasil.length, 2);
  samaDengan(hasil.batch, 1);

  // Cek status setelah migrasi
  const stAkhir = pelari.status();
  samaDengan(stAkhir.filter((s) => s.status === 'diterapkan').length, 2);

  // Idempoten: migrasi ulang tidak melakukan apa-apa
  const hasilUlang = pelari.migrasi();
  samaDengan(hasilUlang.berhasil.length, 0, 'Tidak boleh ada migrasi baru');

  // Rollback Batch 1
  const roll = pelari.rollback();
  samaDengan(roll.dibatalkan.length, 2);
  const stRoll = pelari.status();
  samaDengan(stRoll.filter((s) => s.status === 'tertunda').length, 2);
});

// -----------------------------------------------------------------------------
// GRUP 8: Seeder Data Awal Idempoten
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 8: Database Seeder Idempoten] ===');

uji('8.1 PelariSeeder mengeksekusi seeder secara aman dan idempoten', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  new SchemaBuilder(db).buatTabel('konfigurasi_app', (t) => {
    t.id();
    t.teks('kunci', 50, { unique: true });
    t.teks('nilai');
  });

  const pelari = new PelariSeeder(db);
  pelari.daftarkan({
    nama: 'KonfigurasiAwalSeeder',
    jalankan: (koneksi) => {
      const ada = koneksi.ambilSatu('SELECT id FROM "konfigurasi_app" WHERE "kunci" = ?', ['mode_aplikasi']);
      if (!ada) {
        koneksi.eksekusi('INSERT INTO "konfigurasi_app" ("kunci", "nilai") VALUES (?, ?)', [
          'mode_aplikasi',
          'produksi',
        ]);
      }
    },
  });

  const res1 = pelari.jalankan();
  samaDengan(res1[0].sukses, true);

  // Jalankan seeder kedua kali (idempoten)
  const res2 = pelari.jalankan();
  samaDengan(res2[0].sukses, true);

  const total = db.ambilNilai('SELECT COUNT(*) FROM "konfigurasi_app" WHERE "kunci" = ?', ['mode_aplikasi']);
  samaDengan(total, 1, 'Data konfigurasi tidak boleh duplikat');
});

// -----------------------------------------------------------------------------
// GRUP 9: CLI Integrasi (nusantara db status, migrasi, rollback, seed)
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 9: CLI nusantara db] ===');

uji('9.1 CLI nusantara db status, migrasi, rollback, dan seed berjalan lancar', () => {
  const logList: string[] = [];
  const errorList: string[] = [];
  const fsMem = new PembacaBerkasMemori();

  const cli = new NusantaraCLI({
    pembaca: fsMem,
    log: (m) => logList.push(m),
    error: (m) => errorList.push(m),
  });

  // 1. Status awal
  const codeStatus = cli.jalankan(['db', 'status']);
  samaDengan(codeStatus, 0);

  // 2. Jalankan migrasi
  const codeMigrate = cli.jalankan(['db', 'migrasi']);
  samaDengan(codeMigrate, 0);
  const outMigrate = logList.join('\n');
  pastikan(outMigrate.includes('Berhasil menerapkan'), 'Harus berhasil migrasi');

  // 3. Jalankan seeder
  logList.length = 0;
  const codeSeed = cli.jalankan(['db', 'seed']);
  samaDengan(codeSeed, 0);
  const outSeed = logList.join('\n');
  pastikan(outSeed.includes('PenggunaAwalSeeder'), 'Harus mengeksekusi seeder default');

  // 4. Rollback
  logList.length = 0;
  const codeRoll = cli.jalankan(['db', 'rollback']);
  samaDengan(codeRoll, 0);
  const outRoll = logList.join('\n');
  pastikan(outRoll.includes('Berhasil membatalkan'), 'Harus berhasil rollback');
});

// -----------------------------------------------------------------------------
// GRUP 10: Integrasi Interpreter NUSANTARA & Auth Model (Phase 31 & 32)
// -----------------------------------------------------------------------------
console.log('\n=== [GRUP 10: Integrasi Interpreter & Model Autentikasi] ===');

uji('10.1 Program NUSANTARA menggunakan modul orm untuk kueri berparameter', () => {
  const kode = `
program UjiORM
gunakan "basisdata" sebagai db
gunakan "orm" sebagai o

mulai
    koneksi : peta = db.bukaMemori()
    o.tetapkanKoneksi(koneksi)
    
    // Siapkan tabel percontohan
    koneksi.eksekusi("CREATE TABLE siswa (id INTEGER PRIMARY KEY, nama TEXT, nilai INTEGER);")
    koneksi.eksekusi("INSERT INTO siswa (nama, nilai) VALUES ('Andi', 85);")
    koneksi.eksekusi("INSERT INTO siswa (nama, nilai) VALUES ('Budi', 92);")
    koneksi.eksekusi("INSERT INTO siswa (nama, nilai) VALUES ('Citra', 78);")
    
    // Kueri via QueryBuilder ORM
    kueri : peta = o.buatKueri("siswa", koneksi)
    kueri.diMana("nilai", ">=", 80)
    kueri.urutkan("nilai", "DESC")
    
    daftarJuara : daftar = kueri.ambil()
    tampilkan("Total siswa juara:", panjang(daftarJuara))
    tampilkan("Nama juara 1:", daftarJuara[0]["nama"])
selesai
`;

  const buf = new PenulisOutputBuffer();
  const interp = new Interpreter(buf);
  interp.jalankanKode(kode);

  const out = buf.dapatkanSeluruhTeks().join('\n');
  pastikan(out.includes('Total siswa juara: 2'), 'Harus mendapatkan 2 siswa');
  pastikan(out.includes('Nama juara 1: Budi'), 'Juara 1 harus Budi dengan nilai 92');
});

uji('10.2 Model Pengguna terintegrasi aman dengan hash password Scrypt dari Fase 31', () => {
  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  new SchemaBuilder(db).buatTabel('akun_pengguna', (t) => {
    t.id();
    t.teks('username', 50, { unique: true });
    t.teks('password_hash', 255);
    t.teks('role', 20, { default: 'pengguna' });
  });

  const AkunPengguna = definisiModel({
    namaTabel: 'akun_pengguna',
    adaptor: db,
    fields: {
      id: kolomId(),
      username: kolomTeks('username', { unique: true }),
      password_hash: kolomTeks('password_hash'),
      role: kolomTeks('role', { default: 'pengguna' }),
    },
    timestamps: false,
  });

  const pengelolaPass = new PengelolaPassword({ panjangMinimal: 8 });
  const hash = pengelolaPass.hash('PasswordKuat123!');
  const user = AkunPengguna.buat({
    username: 'santoso',
    password_hash: hash,
    role: 'editor',
  });

  pastikan(!user.password_hash.includes('PasswordKuat123!'), 'Password tidak boleh tersimpan plaintext');
  pastikan(user.password_hash.includes('scrypt'), 'Hash harus berformat Scrypt resmi Phase 31');
});

// -----------------------------------------------------------------------------
// RINGKASAN AKHIR
// -----------------------------------------------------------------------------
console.log('\n=============================================================================');
console.log(`HASIL PENGUJIAN PHASE 32: ${totalLulus} Lulus, ${totalGagal} Gagal dari ${totalUji} Uji.`);
console.log('=============================================================================');

if (totalGagal > 0) {
  process.exit(1);
}
