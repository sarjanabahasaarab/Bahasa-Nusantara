/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Database API & Data Access (Phase 29)
 * Modul Standar: basisdata (alias: database)
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
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';
import { AdaptorSQLite } from '../database/sqlite';
import { GalatBasisdata } from '../database/jenis';

/**
 * Metadata Simbol Ekspor Resmi Modul `basisdata` (dan alias `database`).
 */
export const simbolEksporBasisdata: Map<string, InfoSimbolModul> = new Map([
  [
    'bukaKoneksi',
    {
      nama: 'bukaKoneksi',
      kategori: 'fungsi',
      parameter: [{ nama: 'jalur', tipe: 'teks' }],
      tipeKembalian: 'peta',
      variadik: true,
      minParameter: 0,
    },
  ],
  [
    'bukaMemori',
    {
      nama: 'bukaMemori',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'peta',
    },
  ],
  [
    'jalankanTransaksi',
    {
      nama: 'jalankanTransaksi',
      kategori: 'fungsi',
      parameter: [
        { nama: 'koneksi', tipe: 'peta' },
        { nama: 'aksi', tipe: 'fungsi' },
      ],
      tipeKembalian: 'apapun',
    },
  ],
  [
    'versiDriver',
    {
      nama: 'versiDriver',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'teks',
    },
  ],
  [
    'apakahTersedia',
    {
      nama: 'apakahTersedia',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'logika',
    },
  ],
]);

/**
 * Konversi nilai JavaScript asli ke NilaiRuntime NUSANTARA.
 */
export function konversiKeNilaiRuntime(val: any): NilaiRuntime {
  if (val === null || val === undefined) {
    return buatKosong();
  }
  if (typeof val === 'boolean') {
    return buatLogika(val);
  }
  if (typeof val === 'number') {
    return Number.isInteger(val) ? buatBilangan(val) : buatDesimal(val);
  }
  if (typeof val === 'bigint') {
    return buatBilangan(Number(val));
  }
  if (typeof val === 'string') {
    return buatTeks(val);
  }
  if (Array.isArray(val)) {
    return buatDaftar(val.map(konversiKeNilaiRuntime));
  }
  if (typeof val === 'object') {
    const peta = new Map<string, NilaiRuntime>();
    for (const [k, v] of Object.entries(val)) {
      peta.set(k, konversiKeNilaiRuntime(v));
    }
    return buatPeta(peta);
  }
  return buatTeks(String(val));
}

/**
 * Konversi NilaiRuntime NUSANTARA ke nilai JavaScript asli untuk driver SQL.
 */
export function konversiDariNilaiRuntime(nilai: NilaiRuntime): any {
  switch (nilai.jenis) {
    case JenisNilaiRuntime.TEKS:
    case JenisNilaiRuntime.KARAKTER:
      return nilai.nilai;
    case JenisNilaiRuntime.BILANGAN:
    case JenisNilaiRuntime.DESIMAL:
      return nilai.nilai;
    case JenisNilaiRuntime.LOGIKA:
      return nilai.nilai ? 1 : 0;
    case JenisNilaiRuntime.KOSONG:
      return null;
    case JenisNilaiRuntime.DAFTAR:
      return nilai.elemen.map(konversiDariNilaiRuntime);
    case JenisNilaiRuntime.PETA: {
      const obj: Record<string, any> = {};
      nilai.nilai.forEach((val, k) => {
        obj[k] = konversiDariNilaiRuntime(val);
      });
      return obj;
    }
    default:
      return null;
  }
}

/**
 * Mengekstrak argumen parameter query SQL dari argumen fungsi NUSANTARA.
 */
function ekstrakParameterBinding(arg: NilaiRuntime | undefined): any[] | Record<string, any> | undefined {
  if (!arg || arg.jenis === JenisNilaiRuntime.KOSONG) {
    return undefined;
  }
  if (arg.jenis === JenisNilaiRuntime.DAFTAR) {
    return arg.elemen.map(konversiDariNilaiRuntime);
  }
  if (arg.jenis === JenisNilaiRuntime.PETA) {
    const hasil: Record<string, any> = {};
    arg.nilai.forEach((val, k) => {
      hasil[k] = konversiDariNilaiRuntime(val);
    });
    return hasil;
  }
  return [konversiDariNilaiRuntime(arg)];
}

/**
 * Membungkus adaptor SQLite ke dalam objek Peta NUSANTARA dengan method-method bawaan.
 */
export function buatObjekKoneksiNusantara(adaptor: AdaptorSQLite): NilaiPeta {
  const mapKoneksi = new Map<string, NilaiRuntime>();

  // koneksi.eksekusi(sql, parameter?) -> { terpengaruh: bilangan, idTerakhir: bilangan, sukses: logika }
  const fnEksekusi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'eksekusi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi koneksi 'eksekusi' membutuhkan minimal 1 argumen perintah SQL."
        );
      }
      const sqlArg = args[0];
      if (sqlArg.jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.KETIDAKCOCOKAN_TIPE,
          "Argumen perintah SQL pada 'eksekusi' harus berupa teks."
        );
      }

      const params = ekstrakParameterBinding(args[1]);
      try {
        const hasil = adaptor.eksekusi(sqlArg.nilai, params);
        const mapHasil = new Map<string, NilaiRuntime>();
        mapHasil.set('terpengaruh', buatBilangan(hasil.barisTerpengaruh));
        mapHasil.set(
          'idTerakhir',
          hasil.idTerakhir !== undefined ? buatBilangan(Number(hasil.idTerakhir)) : buatKosong()
        );
        mapHasil.set('sukses', buatLogika(hasil.sukses));
        return buatPeta(mapHasil);
      } catch (err) {
        if (err instanceof GalatBasisdata) {
          throw new GalatRuntime(JenisGalatRuntime.INTERNAL, err.message);
        }
        throw err;
      }
    },
  };

  // koneksi.ambilSemua(sql, parameter?) -> daftar peta
  const fnAmbilSemua: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambilSemua',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi koneksi 'ambilSemua' membutuhkan minimal 1 argumen query SQL."
        );
      }
      const sqlArg = args[0];
      if (sqlArg.jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.KETIDAKCOCOKAN_TIPE,
          "Argumen query SQL pada 'ambilSemua' harus berupa teks."
        );
      }

      const params = ekstrakParameterBinding(args[1]);
      try {
        const rows = adaptor.ambilSemua<Record<string, any>>(sqlArg.nilai, params);
        const elemenHasil: NilaiRuntime[] = rows.map(r => konversiKeNilaiRuntime(r));
        return buatDaftar(elemenHasil);
      } catch (err) {
        if (err instanceof GalatBasisdata) {
          throw new GalatRuntime(JenisGalatRuntime.INTERNAL, err.message);
        }
        throw err;
      }
    },
  };

  // koneksi.ambilSatu(sql, parameter?) -> peta | kosong
  const fnAmbilSatu: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambilSatu',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi koneksi 'ambilSatu' membutuhkan minimal 1 argumen query SQL."
        );
      }
      const sqlArg = args[0];
      if (sqlArg.jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.KETIDAKCOCOKAN_TIPE,
          "Argumen query SQL pada 'ambilSatu' harus berupa teks."
        );
      }

      const params = ekstrakParameterBinding(args[1]);
      try {
        const row = adaptor.ambilSatu<Record<string, any>>(sqlArg.nilai, params);
        if (!row) {
          return buatKosong();
        }
        return konversiKeNilaiRuntime(row);
      } catch (err) {
        if (err instanceof GalatBasisdata) {
          throw new GalatRuntime(JenisGalatRuntime.INTERNAL, err.message);
        }
        throw err;
      }
    },
  };

  // koneksi.ambilNilai(sql, parameter?) -> skalar | kosong
  const fnAmbilNilai: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambilNilai',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi koneksi 'ambilNilai' membutuhkan minimal 1 argumen query SQL."
        );
      }
      const sqlArg = args[0];
      if (sqlArg.jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.KETIDAKCOCOKAN_TIPE,
          "Argumen query SQL pada 'ambilNilai' harus berupa teks."
        );
      }

      const params = ekstrakParameterBinding(args[1]);
      try {
        const val = adaptor.ambilNilai(sqlArg.nilai, params);
        return konversiKeNilaiRuntime(val);
      } catch (err) {
        if (err instanceof GalatBasisdata) {
          throw new GalatRuntime(JenisGalatRuntime.INTERNAL, err.message);
        }
        throw err;
      }
    },
  };

  // koneksi.mulaiTransaksi()
  const fnMulaiTransaksi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'mulaiTransaksi',
    eksekusi: () => {
      try {
        adaptor.mulaiTransaksi();
        return buatKosong();
      } catch (err) {
        if (err instanceof GalatBasisdata) {
          throw new GalatRuntime(JenisGalatRuntime.INTERNAL, err.message);
        }
        throw err;
      }
    },
  };

  // koneksi.commit()
  const fnCommit: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'commit',
    eksekusi: () => {
      try {
        adaptor.commit();
        return buatKosong();
      } catch (err) {
        if (err instanceof GalatBasisdata) {
          throw new GalatRuntime(JenisGalatRuntime.INTERNAL, err.message);
        }
        throw err;
      }
    },
  };

  // koneksi.rollback()
  const fnRollback: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'rollback',
    eksekusi: () => {
      try {
        adaptor.rollback();
        return buatKosong();
      } catch (err) {
        if (err instanceof GalatBasisdata) {
          throw new GalatRuntime(JenisGalatRuntime.INTERNAL, err.message);
        }
        throw err;
      }
    },
  };

  // koneksi.tutup()
  const fnTutup: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tutup',
    eksekusi: () => {
      adaptor.tutup();
      return buatKosong();
    },
  };

  // koneksi.apakahTerbuka() -> logika
  const fnApakahTerbuka: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'apakahTerbuka',
    eksekusi: () => {
      return buatLogika(adaptor.apakahTerbuka());
    },
  };

  // koneksi.dalamTransaksi() -> logika
  const fnDalamTransaksi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dalamTransaksi',
    eksekusi: () => {
      return buatLogika(adaptor.dalamTransaksi());
    },
  };

  mapKoneksi.set('eksekusi', fnEksekusi);
  mapKoneksi.set('ambilSemua', fnAmbilSemua);
  mapKoneksi.set('ambilSatu', fnAmbilSatu);
  mapKoneksi.set('ambilNilai', fnAmbilNilai);
  mapKoneksi.set('mulaiTransaksi', fnMulaiTransaksi);
  mapKoneksi.set('commit', fnCommit);
  mapKoneksi.set('rollback', fnRollback);
  mapKoneksi.set('tutup', fnTutup);
  mapKoneksi.set('apakahTerbuka', fnApakahTerbuka);
  mapKoneksi.set('dalamTransaksi', fnDalamTransaksi);

  // Akses internal ke instance adaptor untuk utilitas transaksi
  (mapKoneksi as any).__adaptor = adaptor;

  return buatPeta(mapKoneksi);
}

/**
 * Pabrik Ekspor Modul `basisdata`.
 */
export function buatEksporBasisdata(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  // basisdata.bukaKoneksi(jalur?: teks) -> peta koneksi
  const fnBukaKoneksi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'bukaKoneksi',
    eksekusi: (args: NilaiRuntime[]) => {
      let jalur = ':memory:';
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS) {
        jalur = args[0].nilai;
      }
      try {
        const adaptor = new AdaptorSQLite();
        adaptor.buka({ jalur });
        return buatObjekKoneksiNusantara(adaptor);
      } catch (err) {
        if (err instanceof GalatBasisdata) {
          throw new GalatRuntime(JenisGalatRuntime.INTERNAL, err.message);
        }
        throw err;
      }
    },
  };

  // basisdata.bukaMemori() -> peta koneksi in-memory
  const fnBukaMemori: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'bukaMemori',
    eksekusi: () => {
      try {
        const adaptor = new AdaptorSQLite();
        adaptor.buka({ jalur: ':memory:' });
        return buatObjekKoneksiNusantara(adaptor);
      } catch (err) {
        if (err instanceof GalatBasisdata) {
          throw new GalatRuntime(JenisGalatRuntime.INTERNAL, err.message);
        }
        throw err;
      }
    },
  };

  // basisdata.jalankanTransaksi(koneksi: peta, aksi: fungsi) -> hasil
  const fnJalankanTransaksi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'jalankanTransaksi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'jalankanTransaksi' membutuhkan 2 argumen: koneksi basis data dan fungsi callback aksi."
        );
      }
      const koneksiArg = args[0];
      const aksiArg = args[1];

      if (koneksiArg.jenis !== JenisNilaiRuntime.PETA) {
        throw new GalatRuntime(
          JenisGalatRuntime.KETIDAKCOCOKAN_TIPE,
          "Argumen pertama 'jalankanTransaksi' harus berupa objek koneksi basis data."
        );
      }

      const fnMulai = koneksiArg.nilai.get('mulaiTransaksi');
      const fnCommit = koneksiArg.nilai.get('commit');
      const fnRollback = koneksiArg.nilai.get('rollback');

      if (
        !fnMulai ||
        fnMulai.jenis !== JenisNilaiRuntime.FUNGSI_BAWAAN ||
        !fnCommit ||
        fnCommit.jenis !== JenisNilaiRuntime.FUNGSI_BAWAAN ||
        !fnRollback ||
        fnRollback.jenis !== JenisNilaiRuntime.FUNGSI_BAWAAN
      ) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          'Objek koneksi tidak memiliki method transaksi yang valid.'
        );
      }

      // Mulai transaksi
      fnMulai.eksekusi([]);
      try {
        let hasil: NilaiRuntime;
        if (aksiArg.jenis === JenisNilaiRuntime.FUNGSI_BAWAAN) {
          hasil = aksiArg.eksekusi([koneksiArg]);
        } else if (aksiArg.jenis === JenisNilaiRuntime.FUNGSI) {
          // Callback fungsi pengguna ditangani jika dipanggil langsung
          throw new GalatRuntime(
            JenisGalatRuntime.INTERNAL,
            'Pemanggilan fungsi closure pengguna di dalam jalankanTransaksi memerlukan konteks evaluator interpreter.'
          );
        } else {
          throw new GalatRuntime(
            JenisGalatRuntime.KETIDAKCOCOKAN_TIPE,
            "Argumen kedua 'jalankanTransaksi' harus berupa fungsi eksekusi."
          );
        }
        fnCommit.eksekusi([]);
        return hasil;
      } catch (err) {
        try {
          fnRollback.eksekusi([]);
        } catch {
          // Abaikan jika rollback gagal
        }
        throw err;
      }
    },
  };

  // basisdata.versiDriver() -> teks
  const fnVersiDriver: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'versiDriver',
    eksekusi: () => {
      const adaptor = new AdaptorSQLite();
      return buatTeks(adaptor.versiDriver);
    },
  };

  // basisdata.apakahTersedia() -> logika
  const fnApakahTersedia: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'apakahTersedia',
    eksekusi: () => {
      return buatLogika(true);
    },
  };

  ekspor.set('bukaKoneksi', fnBukaKoneksi);
  ekspor.set('bukaMemori', fnBukaMemori);
  ekspor.set('jalankanTransaksi', fnJalankanTransaksi);
  ekspor.set('versiDriver', fnVersiDriver);
  ekspor.set('apakahTersedia', fnApakahTersedia);

  return ekspor;
}
