/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatTeks,
  buatKosong,
  buatDaftar,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';

export const VERSI_NUSANTARA = '0.17.0';

export const simbolEksporSistem: Map<string, InfoSimbolModul> = new Map([
  [
    'VERSI',
    {
      nama: 'VERSI',
      kategori: 'tetap',
      tipeData: 'teks',
      tetap: true,
    },
  ],
  [
    'versi',
    {
      nama: 'versi',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'teks',
    },
  ],
  [
    'platform',
    {
      nama: 'platform',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'teks',
    },
  ],
  [
    'arsitektur',
    {
      nama: 'arsitektur',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'teks',
    },
  ],
  [
    'argumen',
    {
      nama: 'argumen',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'daftar',
    },
  ],
  [
    'ambilEnv',
    {
      nama: 'ambilEnv',
      kategori: 'fungsi',
      parameter: [{ nama: 'kunci', tipe: 'teks' }],
      tipeKembalian: 'apapun',
    },
  ],
  [
    'waktuOperasi',
    {
      nama: 'waktuOperasi',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'keluar',
    {
      nama: 'keluar',
      kategori: 'fungsi',
      parameter: [{ nama: 'kode', tipe: 'bilangan' }],
      tipeKembalian: 'kosong',
    },
  ],
]);

export function buatEksporSistem(
  argumenCLI: string[] = [],
  envOverrides: Record<string, string> = {}
): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  ekspor.set('VERSI', buatTeks(VERSI_NUSANTARA));

  const fnVersi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'versi',
    eksekusi: () => buatTeks(VERSI_NUSANTARA),
  };
  ekspor.set('versi', fnVersi);

  const fnPlatform: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'platform',
    eksekusi: () => {
      if (typeof process !== 'undefined' && process.platform) {
        return buatTeks(process.platform);
      }
      return buatTeks('peramban');
    },
  };
  ekspor.set('platform', fnPlatform);

  const fnArsitektur: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'arsitektur',
    eksekusi: () => {
      if (typeof process !== 'undefined' && process.arch) {
        return buatTeks(process.arch);
      }
      return buatTeks('web');
    },
  };
  ekspor.set('arsitektur', fnArsitektur);

  const fnArgumen: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'argumen',
    eksekusi: () => {
      const args =
        argumenCLI.length > 0
          ? argumenCLI
          : typeof process !== 'undefined' && process.argv
          ? process.argv.slice(2)
          : [];
      return buatDaftar(args.map(a => buatTeks(a)));
    },
  };
  ekspor.set('argumen', fnArgumen);

  const fnAmbilEnv: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambilEnv',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'sistem.ambilEnv' membutuhkan 1 argumen bertipe teks (nama variabel lingkungan).`
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
  ekspor.set('ambilEnv', fnAmbilEnv);

  const fnWaktuOperasi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'waktuOperasi',
    eksekusi: () => {
      if (typeof process !== 'undefined' && process.uptime) {
        return buatBilangan(Math.floor(process.uptime()));
      }
      return buatBilangan(0);
    },
  };
  ekspor.set('waktuOperasi', fnWaktuOperasi);

  const fnKeluar: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'keluar',
    eksekusi: (args: NilaiRuntime[]) => {
      const kode = args.length > 0 && args[0].jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 0;
      if (typeof process !== 'undefined' && process.exit) {
        // Jangan menghentikan proses test suite jika kode 0 dalam test runner
        if (typeof process.env.NODE_ENV !== 'undefined' && process.env.NODE_ENV === 'test') {
          return buatKosong();
        }
        process.exit(kode);
      }
      return buatKosong();
    },
  };
  ekspor.set('keluar', fnKeluar);

  return ekspor;
}
