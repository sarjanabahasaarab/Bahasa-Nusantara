/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatLogika,
  buatDaftar,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';

export const simbolEksporKoleksi: Map<string, InfoSimbolModul> = new Map([
  [
    'panjang',
    {
      nama: 'panjang',
      kategori: 'fungsi',
      parameter: [{ nama: 'k', tipe: 'apapun' }],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'kosong',
    {
      nama: 'kosong',
      kategori: 'fungsi',
      parameter: [{ nama: 'k', tipe: 'apapun' }],
      tipeKembalian: 'logika',
    },
  ],
  [
    'berisi',
    {
      nama: 'berisi',
      kategori: 'fungsi',
      parameter: [
        { nama: 'd', tipe: 'daftar' },
        { nama: 'item', tipe: 'apapun' },
      ],
      tipeKembalian: 'logika',
    },
  ],
  [
    'cari',
    {
      nama: 'cari',
      kategori: 'fungsi',
      parameter: [
        { nama: 'd', tipe: 'daftar' },
        { nama: 'item', tipe: 'apapun' },
      ],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'balik',
    {
      nama: 'balik',
      kategori: 'fungsi',
      parameter: [{ nama: 'd', tipe: 'daftar' }],
      tipeKembalian: 'daftar',
    },
  ],
  [
    'urutkan',
    {
      nama: 'urutkan',
      kategori: 'fungsi',
      parameter: [{ nama: 'd', tipe: 'daftar' }],
      tipeKembalian: 'daftar',
    },
  ],
  [
    'gabung',
    {
      nama: 'gabung',
      kategori: 'fungsi',
      parameter: [
        { nama: 'd1', tipe: 'daftar' },
        { nama: 'd2', tipe: 'daftar' },
      ],
      tipeKembalian: 'daftar',
    },
  ],
  [
    'iris',
    {
      nama: 'iris',
      kategori: 'fungsi',
      parameter: [
        { nama: 'd', tipe: 'daftar' },
        { nama: 'mulai', tipe: 'bilangan' },
        { nama: 'akhir', tipe: 'bilangan' },
      ],
      tipeKembalian: 'daftar',
    },
  ],
]);

function apakahElemenIdentik(a: NilaiRuntime, b: NilaiRuntime): boolean {
  if (a.jenis !== b.jenis) return false;
  if (
    a.jenis === JenisNilaiRuntime.BILANGAN ||
    a.jenis === JenisNilaiRuntime.DESIMAL ||
    a.jenis === JenisNilaiRuntime.TEKS ||
    a.jenis === JenisNilaiRuntime.LOGIKA ||
    a.jenis === JenisNilaiRuntime.KARAKTER
  ) {
    return (a as any).nilai === (b as any).nilai;
  }
  return a === b;
}

export function buatEksporKoleksi(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnPanjang: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'panjang',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.panjang' membutuhkan 1 argumen.`
        );
      }
      const target = args[0];
      if (target.jenis === JenisNilaiRuntime.DAFTAR) return buatBilangan(target.elemen.length);
      if (target.jenis === JenisNilaiRuntime.PETA) return buatBilangan(target.nilai.size);
      if (target.jenis === JenisNilaiRuntime.TEKS) return buatBilangan(target.nilai.length);
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Fungsi 'koleksi.panjang' hanya mendukung daftar, peta, atau teks, bukan '${target.jenis}'.`
      );
    },
  };
  ekspor.set('panjang', fnPanjang);

  const fnKosong: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'kosong',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.kosong' membutuhkan 1 argumen.`
        );
      }
      const target = args[0];
      if (target.jenis === JenisNilaiRuntime.DAFTAR) return buatLogika(target.elemen.length === 0);
      if (target.jenis === JenisNilaiRuntime.PETA) return buatLogika(target.nilai.size === 0);
      if (target.jenis === JenisNilaiRuntime.TEKS) return buatLogika(target.nilai.length === 0);
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Fungsi 'koleksi.kosong' hanya mendukung daftar, peta, atau teks.`
      );
    },
  };
  ekspor.set('kosong', fnKosong);

  const fnBerisi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'berisi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.DAFTAR) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.berisi' membutuhkan argumen pertama bertipe daftar.`
        );
      }
      const list = args[0].elemen;
      const target = args[1];
      const ada = list.some(el => apakahElemenIdentik(el, target));
      return buatLogika(ada);
    },
  };
  ekspor.set('berisi', fnBerisi);

  const fnCari: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'cari',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.DAFTAR) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.cari' membutuhkan argumen pertama bertipe daftar.`
        );
      }
      const list = args[0].elemen;
      const target = args[1];
      const idx = list.findIndex(el => apakahElemenIdentik(el, target));
      return buatBilangan(idx);
    },
  };
  ekspor.set('cari', fnCari);

  const fnBalik: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'balik',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.DAFTAR) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.balik' membutuhkan 1 argumen bertipe daftar.`
        );
      }
      const salinan = [...args[0].elemen].reverse();
      return buatDaftar(salinan);
    },
  };
  ekspor.set('balik', fnBalik);

  const fnUrutkan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'urutkan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.DAFTAR) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.urutkan' membutuhkan 1 argumen bertipe daftar.`
        );
      }
      const salinan = [...args[0].elemen].sort((a, b) => {
        if (
          (a.jenis === JenisNilaiRuntime.BILANGAN || a.jenis === JenisNilaiRuntime.DESIMAL) &&
          (b.jenis === JenisNilaiRuntime.BILANGAN || b.jenis === JenisNilaiRuntime.DESIMAL)
        ) {
          return a.nilai - b.nilai;
        }
        if (a.jenis === JenisNilaiRuntime.TEKS && b.jenis === JenisNilaiRuntime.TEKS) {
          return a.nilai.localeCompare(b.nilai);
        }
        return 0;
      });
      return buatDaftar(salinan);
    },
  };
  ekspor.set('urutkan', fnUrutkan);

  const fnGabung: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'gabung',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.DAFTAR || args[1].jenis !== JenisNilaiRuntime.DAFTAR) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.gabung' membutuhkan 2 argumen bertipe daftar.`
        );
      }
      return buatDaftar([...args[0].elemen, ...args[1].elemen]);
    },
  };
  ekspor.set('gabung', fnGabung);

  const fnIris: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'iris',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2 || args[0].jenis !== JenisNilaiRuntime.DAFTAR || args[1].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.iris' membutuhkan minimal 2 argumen (daftar, mulai: bilangan).`
        );
      }
      const mulai = Math.max(0, args[1].nilai);
      const akhir = args.length > 2 && args[2].jenis === JenisNilaiRuntime.BILANGAN ? args[2].nilai : undefined;
      return buatDaftar(args[0].elemen.slice(mulai, akhir));
    },
  };
  ekspor.set('iris', fnIris);

  return ekspor;
}
