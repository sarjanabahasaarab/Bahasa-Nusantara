/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatDesimal,
  buatTeks,
  buatLogika,
  formatNilaiTeks,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';

export const simbolEksporKonversi: Map<string, InfoSimbolModul> = new Map([
  [
    'keTeks',
    {
      nama: 'keTeks',
      kategori: 'fungsi',
      parameter: [{ nama: 'nilai', tipe: 'apapun' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'keBilangan',
    {
      nama: 'keBilangan',
      kategori: 'fungsi',
      parameter: [{ nama: 's', tipe: 'teks' }],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'keDesimal',
    {
      nama: 'keDesimal',
      kategori: 'fungsi',
      parameter: [{ nama: 's', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'keBulat',
    {
      nama: 'keBulat',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'desimal' }],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'keLogika',
    {
      nama: 'keLogika',
      kategori: 'fungsi',
      parameter: [{ nama: 'nilai', tipe: 'apapun' }],
      tipeKembalian: 'logika',
    },
  ],
]);

export function buatEksporKonversi(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnKeTeks: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'keTeks',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'konversi.keTeks' membutuhkan 1 argumen.`
        );
      }
      return buatTeks(formatNilaiTeks(args[0]));
    },
  };
  ekspor.set('keTeks', fnKeTeks);

  const fnKeBilangan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'keBilangan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'konversi.keBilangan' membutuhkan 1 argumen bertipe teks.`
        );
      }
      const raw = args[0].nilai.trim();
      if (!/^-?\d+$/.test(raw)) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Kesalahan konversi: teks '${args[0].nilai}' tidak dapat dikonversi menjadi bilangan.`
        );
      }
      const num = parseInt(raw, 10);
      if (isNaN(num)) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Kesalahan konversi: teks '${args[0].nilai}' tidak dapat dikonversi menjadi bilangan.`
        );
      }
      return buatBilangan(num);
    },
  };
  ekspor.set('keBilangan', fnKeBilangan);

  const fnKeDesimal: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'keDesimal',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'konversi.keDesimal' membutuhkan 1 argumen.`
        );
      }
      const item = args[0];
      if (item.jenis === JenisNilaiRuntime.BILANGAN || item.jenis === JenisNilaiRuntime.DESIMAL) {
        return buatDesimal(item.nilai);
      }
      if (item.jenis === JenisNilaiRuntime.TEKS) {
        const raw = item.nilai.trim();
        if (!/^-?\d+(\.\d+)?$/.test(raw)) {
          throw new GalatRuntime(
            JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
            `Kesalahan konversi: teks '${item.nilai}' tidak dapat dikonversi menjadi desimal.`
          );
        }
        const parsed = parseFloat(raw);
        if (isNaN(parsed)) {
          throw new GalatRuntime(
            JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
            `Kesalahan konversi: teks '${item.nilai}' tidak dapat dikonversi menjadi desimal.`
          );
        }
        return buatDesimal(parsed);
      }
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Kesalahan konversi: nilai bertipe '${item.jenis}' tidak dapat dikonversi menjadi desimal.`
      );
    },
  };
  ekspor.set('keDesimal', fnKeDesimal);

  const fnKeBulat: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'keBulat',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'konversi.keBulat' membutuhkan 1 argumen.`
        );
      }
      const item = args[0];
      if (item.jenis === JenisNilaiRuntime.DESIMAL || item.jenis === JenisNilaiRuntime.BILANGAN) {
        return buatBilangan(Math.trunc(item.nilai));
      }
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Fungsi 'konversi.keBulat' hanya menerima tipe desimal atau bilangan, bukan '${item.jenis}'.`
      );
    },
  };
  ekspor.set('keBulat', fnKeBulat);

  const fnKeLogika: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'keLogika',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'konversi.keLogika' membutuhkan 1 argumen.`
        );
      }
      const item = args[0];
      if (item.jenis === JenisNilaiRuntime.LOGIKA) return item;
      if (item.jenis === JenisNilaiRuntime.BILANGAN) return buatLogika(item.nilai !== 0);
      if (item.jenis === JenisNilaiRuntime.TEKS) {
        const s = item.nilai.trim().toLowerCase();
        if (s === 'benar' || s === 'true' || s === '1') return buatLogika(true);
        if (s === 'salah' || s === 'false' || s === '0') return buatLogika(false);
      }
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Kesalahan konversi: tidak dapat mengonversi nilai menjadi logika.`
      );
    },
  };
  ekspor.set('keLogika', fnKeLogika);

  return ekspor;
}
