/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatDesimal,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';

export const simbolEksporAcak: Map<string, InfoSimbolModul> = new Map([
  [
    'desimal',
    {
      nama: 'desimal',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'bilangan',
    {
      nama: 'bilangan',
      kategori: 'fungsi',
      parameter: [
        { nama: 'min', tipe: 'bilangan' },
        { nama: 'maks', tipe: 'bilangan' },
      ],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'pilih',
    {
      nama: 'pilih',
      kategori: 'fungsi',
      parameter: [{ nama: 'd', tipe: 'daftar' }],
      tipeKembalian: 'apapun',
    },
  ],
]);

export function buatEksporAcak(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnDesimal: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'desimal',
    eksekusi: () => buatDesimal(Math.random()),
  };
  ekspor.set('desimal', fnDesimal);

  const fnBilangan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'bilangan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (
        args.length !== 2 ||
        args[0].jenis !== JenisNilaiRuntime.BILANGAN ||
        args[1].jenis !== JenisNilaiRuntime.BILANGAN
      ) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'acak.bilangan' membutuhkan 2 argumen bertipe bilangan (min, maks).`
        );
      }
      const min = args[0].nilai;
      const maks = args[1].nilai;
      if (min > maks) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Kesalahan acak: batas minimum (${min}) tidak boleh lebih besar dari batas maksimum (${maks}).`
        );
      }
      const val = Math.floor(Math.random() * (maks - min + 1)) + min;
      return buatBilangan(val);
    },
  };
  ekspor.set('bilangan', fnBilangan);

  const fnPilih: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pilih',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.DAFTAR) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'acak.pilih' membutuhkan 1 argumen bertipe daftar.`
        );
      }
      const d = args[0].elemen;
      if (d.length === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Kesalahan acak: tidak dapat memilih elemen dari daftar kosong.`
        );
      }
      const idx = Math.floor(Math.random() * d.length);
      return d[idx];
    },
  };
  ekspor.set('pilih', fnPilih);

  return ekspor;
}
