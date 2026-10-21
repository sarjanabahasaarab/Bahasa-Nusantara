/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatTeks,
  buatLogika,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';

/**
 * Modul Standar: teks
 * Menyediakan fungsi-fungsi manipulasi string resmi Bahasa NUSANTARA.
 */
export const simbolEksporTeks: Map<string, InfoSimbolModul> = new Map([
  [
    'panjang',
    {
      nama: 'panjang',
      kategori: 'fungsi',
      parameter: [{ nama: 's', tipe: 'teks' }],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'gabung',
    {
      nama: 'gabung',
      kategori: 'fungsi',
      parameter: [
        { nama: 'daftarTeks', tipe: 'daftar' },
        { nama: 'pemisah', tipe: 'teks' },
      ],
      tipeKembalian: 'teks',
    },
  ],
  [
    'potong',
    {
      nama: 'potong',
      kategori: 'fungsi',
      parameter: [
        { nama: 's', tipe: 'teks' },
        { nama: 'mulai', tipe: 'bilangan' },
        { nama: 'akhir', tipe: 'bilangan' },
      ],
      tipeKembalian: 'teks',
    },
  ],
  [
    'cari',
    {
      nama: 'cari',
      kategori: 'fungsi',
      parameter: [
        { nama: 's', tipe: 'teks' },
        { nama: 'target', tipe: 'teks' },
      ],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'kapital',
    {
      nama: 'kapital',
      kategori: 'fungsi',
      parameter: [{ nama: 's', tipe: 'teks' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'kecil',
    {
      nama: 'kecil',
      kategori: 'fungsi',
      parameter: [{ nama: 's', tipe: 'teks' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'pangkas',
    {
      nama: 'pangkas',
      kategori: 'fungsi',
      parameter: [{ nama: 's', tipe: 'teks' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'berisi',
    {
      nama: 'berisi',
      kategori: 'fungsi',
      parameter: [
        { nama: 's', tipe: 'teks' },
        { nama: 'target', tipe: 'teks' },
      ],
      tipeKembalian: 'logika',
    },
  ],
  [
    'ganti',
    {
      nama: 'ganti',
      kategori: 'fungsi',
      parameter: [
        { nama: 's', tipe: 'teks' },
        { nama: 'target', tipe: 'teks' },
        { nama: 'pengganti', tipe: 'teks' },
      ],
      tipeKembalian: 'teks',
    },
  ],
]);

export function buatEksporTeks(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnPanjang: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'panjang',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.panjang' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatBilangan(args[0].nilai.length);
    },
  };
  ekspor.set('panjang', fnPanjang);

  const fnGabung: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'gabung',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1 || args[0].jenis !== JenisNilaiRuntime.DAFTAR) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.gabung' membutuhkan argumen pertama bertipe daftar.`
        );
      }
      const pemisah = args.length > 1 && args[1].jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      const list = args[0].elemen.map(el => (el.jenis === JenisNilaiRuntime.TEKS ? el.nilai : String((el as any).nilai ?? '')));
      return buatTeks(list.join(pemisah));
    },
  };
  ekspor.set('gabung', fnGabung);

  const fnPotong: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'potong',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.potong' membutuhkan minimal 2 argumen (teks, mulai: bilangan).`
        );
      }
      const s = args[0].nilai;
      const mulai = Math.max(0, args[1].nilai);
      const akhir = args.length > 2 && args[2].jenis === JenisNilaiRuntime.BILANGAN ? args[2].nilai : undefined;
      return buatTeks(s.slice(mulai, akhir));
    },
  };
  ekspor.set('potong', fnPotong);

  const fnCari: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'cari',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.cari' membutuhkan 2 argumen bertipe teks.`
        );
      }
      return buatBilangan(args[0].nilai.indexOf(args[1].nilai));
    },
  };
  ekspor.set('cari', fnCari);

  const fnKapital: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'kapital',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.kapital' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatTeks(args[0].nilai.toUpperCase());
    },
  };
  ekspor.set('kapital', fnKapital);

  const fnKecil: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'kecil',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.kecil' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatTeks(args[0].nilai.toLowerCase());
    },
  };
  ekspor.set('kecil', fnKecil);

  const fnPangkas: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pangkas',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.pangkas' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatTeks(args[0].nilai.trim());
    },
  };
  ekspor.set('pangkas', fnPangkas);

  const fnBerisi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'berisi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.berisi' membutuhkan 2 argumen bertipe teks.`
        );
      }
      return buatLogika(args[0].nilai.includes(args[1].nilai));
    },
  };
  ekspor.set('berisi', fnBerisi);

  const fnGanti: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ganti',
    eksekusi: (args: NilaiRuntime[]) => {
      if (
        args.length !== 3 ||
        args[0].jenis !== JenisNilaiRuntime.TEKS ||
        args[1].jenis !== JenisNilaiRuntime.TEKS ||
        args[2].jenis !== JenisNilaiRuntime.TEKS
      ) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.ganti' membutuhkan 3 argumen bertipe teks (s, target, pengganti).`
        );
      }
      return buatTeks(args[0].nilai.split(args[1].nilai).join(args[2].nilai));
    },
  };
  ekspor.set('ganti', fnGanti);

  return ekspor;
}
