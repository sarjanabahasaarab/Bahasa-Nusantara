/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatTeks,
  buatKosong,
  buatLogika,
  buatPeta,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';

/**
 * Modul Standar: lingkungan
 * Mengakses dan memanipulasi variabel lingkungan proses secara aman dan terisolasi.
 */
export const simbolEksporLingkungan: Map<string, InfoSimbolModul> = new Map([
  [
    'ambil',
    {
      nama: 'ambil',
      kategori: 'fungsi',
      parameter: [{ nama: 'kunci', tipe: 'teks' }],
      tipeKembalian: 'apapun',
    },
  ],
  [
    'tetapkan',
    {
      nama: 'tetapkan',
      kategori: 'fungsi',
      parameter: [
        { nama: 'kunci', tipe: 'teks' },
        { nama: 'nilai', tipe: 'teks' },
      ],
      tipeKembalian: 'logika',
    },
  ],
  [
    'ada',
    {
      nama: 'ada',
      kategori: 'fungsi',
      parameter: [{ nama: 'kunci', tipe: 'teks' }],
      tipeKembalian: 'logika',
    },
  ],
  [
    'semua',
    {
      nama: 'semua',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'peta',
    },
  ],
  [
    'direktoriKerja',
    {
      nama: 'direktoriKerja',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'teks',
    },
  ],
]);

export function buatEksporLingkungan(envOverrides: Record<string, string> = {}): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnAmbil: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambil',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'lingkungan.ambil' membutuhkan 1 argumen bertipe teks (kunci variabel lingkungan).`
        );
      }
      const kunci = args[0].nilai;
      if (envOverrides[kunci] !== undefined) {
        return buatTeks(envOverrides[kunci]);
      }
      if (typeof process !== 'undefined' && process.env && process.env[kunci] !== undefined) {
        return buatTeks(process.env[kunci]!);
      }
      return buatKosong();
    },
  };
  ekspor.set('ambil', fnAmbil);

  const fnTetapkan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tetapkan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'lingkungan.tetapkan' membutuhkan 2 argumen bertipe teks (kunci, nilai).`
        );
      }
      const kunci = args[0].nilai;
      const nilai = args[1].nilai;
      envOverrides[kunci] = nilai;
      if (typeof process !== 'undefined' && process.env) {
        process.env[kunci] = nilai;
      }
      return buatLogika(true);
    },
  };
  ekspor.set('tetapkan', fnTetapkan);

  const fnAda: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ada',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'lingkungan.ada' membutuhkan 1 argumen bertipe teks.`
        );
      }
      const kunci = args[0].nilai;
      if (envOverrides[kunci] !== undefined) return buatLogika(true);
      if (typeof process !== 'undefined' && process.env && process.env[kunci] !== undefined) {
        return buatLogika(true);
      }
      return buatLogika(false);
    },
  };
  ekspor.set('ada', fnAda);

  const fnSemua: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'semua',
    eksekusi: () => {
      const map = new Map<string, NilaiRuntime>();
      if (typeof process !== 'undefined' && process.env) {
        for (const [k, v] of Object.entries(process.env)) {
          if (v !== undefined) {
            map.set(k, buatTeks(v));
          }
        }
      }
      for (const [k, v] of Object.entries(envOverrides)) {
        map.set(k, buatTeks(v));
      }
      return buatPeta(map);
    },
  };
  ekspor.set('semua', fnSemua);

  const fnDirektoriKerja: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'direktoriKerja',
    eksekusi: () => {
      const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '/proyek';
      return buatTeks(cwd);
    },
  };
  ekspor.set('direktoriKerja', fnDirektoriKerja);

  return ekspor;
}
