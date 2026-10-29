/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Modul Standar: orm (alias: migrasi, migration)
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatDesimal,
  buatLogika,
  buatTeks,
  buatKosong,
  buatDaftar,
  buatPeta,
  NilaiFungsiBawaan,
  NilaiPeta,
  NilaiDaftar,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';
import { AdaptorBasisdata, GalatBasisdata } from '../database/jenis';
import { AdaptorSQLite } from '../database/sqlite';
import { QueryBuilder } from '../database/queryBuilder';
import { definisiModel, tetapkanAdaptorGlobalORM, dapatkanAdaptorGlobalORM } from '../orm/model';
import { SchemaBuilder, CetakBiruTabel } from '../migration/schemaBuilder';
import { PelariMigrasi } from '../migration/migrationRunner';
import { PelariSeeder } from '../seeder/seederRunner';
import {
  konversiKeNilaiRuntime,
  konversiDariNilaiRuntime,
} from './basisdata';

export const simbolEksporORM: Map<string, InfoSimbolModul> = new Map([
  [
    'tetapkanKoneksi',
    {
      nama: 'tetapkanKoneksi',
      kategori: 'fungsi',
      parameter: [{ nama: 'koneksi', tipe: 'peta' }],
      tipeKembalian: 'kosong',
    },
  ],
  [
    'buatKueri',
    {
      nama: 'buatKueri',
      kategori: 'fungsi',
      parameter: [
        { nama: 'tabel', tipe: 'teks' },
        { nama: 'koneksi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      variadik: true,
      minParameter: 1,
    },
  ],
  [
    'definisiModel',
    {
      nama: 'definisiModel',
      kategori: 'fungsi',
      parameter: [
        { nama: 'namaTabel', tipe: 'teks' },
        { nama: 'skema', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
    },
  ],
  [
    'migrasiSkema',
    {
      nama: 'migrasiSkema',
      kategori: 'fungsi',
      parameter: [
        { nama: 'koneksi', tipe: 'peta' },
        { nama: 'namaMigrasi', tipe: 'teks' },
        { nama: 'aksiNaik', tipe: 'fungsi' },
        { nama: 'aksiTurun', tipe: 'fungsi' },
      ],
      tipeKembalian: 'peta',
      variadik: true,
      minParameter: 2,
    },
  ],
  [
    'statusMigrasi',
    {
      nama: 'statusMigrasi',
      kategori: 'fungsi',
      parameter: [{ nama: 'koneksi', tipe: 'peta' }],
      tipeKembalian: 'daftar',
    },
  ],
  [
    'rollbackMigrasi',
    {
      nama: 'rollbackMigrasi',
      kategori: 'fungsi',
      parameter: [{ nama: 'koneksi', tipe: 'peta' }],
      tipeKembalian: 'peta',
    },
  ],
  [
    'jalankanSeeder',
    {
      nama: 'jalankanSeeder',
      kategori: 'fungsi',
      parameter: [
        { nama: 'koneksi', tipe: 'peta' },
        { nama: 'namaSeeder', tipe: 'teks' },
        { nama: 'aksi', tipe: 'fungsi' },
      ],
      tipeKembalian: 'peta',
    },
  ],
]);

function ekstrakAdaptorDariArgumen(arg: NilaiRuntime): AdaptorBasisdata {
  if (arg.jenis !== JenisNilaiRuntime.PETA) {
    throw new GalatRuntime(
      JenisGalatRuntime.KETIDAKCOCOKAN_TIPE,
      'Argumen koneksi basis data harus berupa objek koneksi hasil bukaKoneksi().'
    );
  }
  const ad = (arg as any).__adaptor || (arg as any).nilai?.__adaptor;
  if (!ad) {
    const globalAd = dapatkanAdaptorGlobalORM();
    if (globalAd) return globalAd;
    throw new GalatRuntime(
      JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
      'Objek koneksi tidak memuat instance AdaptorBasisdata yang valid.'
    );
  }
  return ad;
}

/**
 * Membungkus QueryBuilder menjadi objek Peta NUSANTARA.
 */
export function buatObjekKueriNusantara(qb: QueryBuilder): NilaiPeta {
  const mapKueri = new Map<string, NilaiRuntime>();

  // qb.pilih(...kolom)
  mapKueri.set('pilih', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pilih',
    eksekusi: (args: NilaiRuntime[]) => {
      const cols = args
        .filter((a) => a.jenis === JenisNilaiRuntime.TEKS)
        .map((a: any) => a.nilai);
      qb.select(...cols);
      return buatPeta(mapKueri);
    },
  });

  // qb.diMana(kolom, opAtauNilai, nilai?)
  mapKueri.set('diMana', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'diMana',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Method 'diMana' membutuhkan minimal 2 argumen: kolom dan nilai."
        );
      }
      const col = konversiDariNilaiRuntime(args[0]);
      if (args.length >= 3) {
        const op = konversiDariNilaiRuntime(args[1]);
        const val = konversiDariNilaiRuntime(args[2]);
        qb.where(col, op, val);
      } else {
        const val = konversiDariNilaiRuntime(args[1]);
        qb.where(col, val);
      }
      return buatPeta(mapKueri);
    },
  });

  // qb.atauDiMana(kolom, opAtauNilai, nilai?)
  mapKueri.set('atauDiMana', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'atauDiMana',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Method 'atauDiMana' membutuhkan minimal 2 argumen."
        );
      }
      const col = konversiDariNilaiRuntime(args[0]);
      if (args.length >= 3) {
        const op = konversiDariNilaiRuntime(args[1]);
        const val = konversiDariNilaiRuntime(args[2]);
        qb.orWhere(col, op, val);
      } else {
        const val = konversiDariNilaiRuntime(args[1]);
        qb.orWhere(col, val);
      }
      return buatPeta(mapKueri);
    },
  });

  // qb.urutkan(kolom, arah?)
  mapKueri.set('urutkan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'urutkan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Method 'urutkan' membutuhkan nama kolom."
        );
      }
      const col = konversiDariNilaiRuntime(args[0]);
      const arah = args[1] && args[1].jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : 'ASC';
      qb.orderBy(col, arah as any);
      return buatPeta(mapKueri);
    },
  });

  // qb.batas(n)
  mapKueri.set('batas', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'batas',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0 || args[0].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Method 'batas' membutuhkan argumen bilangan bulat."
        );
      }
      qb.limit(args[0].nilai);
      return buatPeta(mapKueri);
    },
  });

  // qb.lewat(n)
  mapKueri.set('lewat', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'lewat',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0 || args[0].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Method 'lewat' membutuhkan argumen bilangan bulat."
        );
      }
      qb.offset(args[0].nilai);
      return buatPeta(mapKueri);
    },
  });

  // qb.ambil() -> daftar peta
  mapKueri.set('ambil', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambil',
    eksekusi: () => {
      const data = qb.get();
      return konversiKeNilaiRuntime(data);
    },
  });

  // qb.pertama() -> peta | kosong
  mapKueri.set('pertama', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pertama',
    eksekusi: () => {
      const data = qb.first();
      return konversiKeNilaiRuntime(data);
    },
  });

  // qb.hitung() -> bilangan
  mapKueri.set('hitung', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'hitung',
    eksekusi: () => {
      return buatBilangan(qb.count());
    },
  });

  // qb.ada() -> logika
  mapKueri.set('ada', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ada',
    eksekusi: () => {
      return buatLogika(qb.exists());
    },
  });

  // qb.tambah(data: peta)
  mapKueri.set('tambah', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tambah',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Method 'tambah' membutuhkan data berupa peta."
        );
      }
      const data = konversiDariNilaiRuntime(args[0]);
      const res = qb.insert(data);
      const m = new Map<string, NilaiRuntime>();
      m.set('terpengaruh', buatBilangan(res.barisTerpengaruh));
      m.set('idTerakhir', res.idTerakhir !== undefined ? buatBilangan(Number(res.idTerakhir)) : buatKosong());
      m.set('sukses', buatLogika(res.sukses));
      return buatPeta(m);
    },
  });

  // qb.perbarui(data: peta)
  mapKueri.set('perbarui', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'perbarui',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Method 'perbarui' membutuhkan data berupa peta."
        );
      }
      const data = konversiDariNilaiRuntime(args[0]);
      const res = qb.update(data);
      const m = new Map<string, NilaiRuntime>();
      m.set('terpengaruh', buatBilangan(res.barisTerpengaruh));
      m.set('sukses', buatLogika(res.sukses));
      return buatPeta(m);
    },
  });

  // qb.hapus()
  mapKueri.set('hapus', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'hapus',
    eksekusi: () => {
      const res = qb.delete();
      const m = new Map<string, NilaiRuntime>();
      m.set('terpengaruh', buatBilangan(res.barisTerpengaruh));
      m.set('sukses', buatLogika(res.sukses));
      return buatPeta(m);
    },
  });

  return buatPeta(mapKueri);
}

/**
 * Pabrik Ekspor Modul `orm`.
 */
export function buatEksporORM(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  // orm.tetapkanKoneksi(koneksi: peta)
  ekspor.set('tetapkanKoneksi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tetapkanKoneksi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'tetapkanKoneksi' membutuhkan argumen objek koneksi basisdata."
        );
      }
      const ad = ekstrakAdaptorDariArgumen(args[0]);
      tetapkanAdaptorGlobalORM(ad);
      return buatKosong();
    },
  });

  // orm.buatKueri(tabel: teks, koneksi?: peta) -> objek kueri
  ekspor.set('buatKueri', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatKueri',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'buatKueri' membutuhkan nama tabel berupa teks."
        );
      }
      const tabel = args[0].nilai;
      let ad: AdaptorBasisdata | null = null;
      if (args.length > 1) {
        ad = ekstrakAdaptorDariArgumen(args[1]);
      } else {
        ad = dapatkanAdaptorGlobalORM();
      }

      if (!ad) {
        throw new GalatRuntime(
          JenisGalatRuntime.INTERNAL,
          "Tidak ada koneksi aktif untuk 'buatKueri'. Berikan koneksi atau panggil tetapkanKoneksi()."
        );
      }

      const qb = new QueryBuilder(ad, tabel);
      return buatObjekKueriNusantara(qb);
    },
  });

  // orm.migrasiSkema(koneksi: peta, nama: teks, aksiNaik: fungsi, aksiTurun?: fungsi)
  ekspor.set('migrasiSkema', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'migrasiSkema',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'migrasiSkema' membutuhkan koneksi dan nama migrasi."
        );
      }
      const ad = ekstrakAdaptorDariArgumen(args[0]);
      const nama = konversiDariNilaiRuntime(args[1]);
      const pelari = new PelariMigrasi(ad);

      pelari.daftarkan({
        nama: String(nama),
        naik: (skema, db) => {
          if (args.length >= 3 && args[2].jenis === JenisNilaiRuntime.FUNGSI_BAWAAN) {
            // Panggil aksi fungsi runtime jika ada
            (args[2] as NilaiFungsiBawaan).eksekusi([]);
          }
        },
        turun: (skema, db) => {
          if (args.length >= 4 && args[3].jenis === JenisNilaiRuntime.FUNGSI_BAWAAN) {
            (args[3] as NilaiFungsiBawaan).eksekusi([]);
          }
        },
      });

      const res = pelari.migrasi();
      const m = new Map<string, NilaiRuntime>();
      m.set('sukses', buatLogika(true));
      m.set('batch', buatBilangan(res.batch));
      m.set('pesan', buatTeks(res.pesan));
      return buatPeta(m);
    },
  });

  // orm.statusMigrasi(koneksi: peta) -> daftar peta
  ekspor.set('statusMigrasi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'statusMigrasi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'statusMigrasi' membutuhkan koneksi basis data."
        );
      }
      const ad = ekstrakAdaptorDariArgumen(args[0]);
      const pelari = new PelariMigrasi(ad);
      const st = pelari.status();
      return konversiKeNilaiRuntime(st);
    },
  });

  // orm.rollbackMigrasi(koneksi: peta) -> peta hasil
  ekspor.set('rollbackMigrasi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'rollbackMigrasi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'rollbackMigrasi' membutuhkan koneksi basis data."
        );
      }
      const ad = ekstrakAdaptorDariArgumen(args[0]);
      const pelari = new PelariMigrasi(ad);
      const res = pelari.rollback();
      const m = new Map<string, NilaiRuntime>();
      m.set('dibatalkan', konversiKeNilaiRuntime(res.dibatalkan));
      m.set('batch', buatBilangan(res.batch));
      m.set('pesan', buatTeks(res.pesan));
      return buatPeta(m);
    },
  });

  return ekspor;
}
