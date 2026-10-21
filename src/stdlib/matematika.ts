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

export const simbolEksporMatematika: Map<string, InfoSimbolModul> = new Map([
  [
    'PI',
    {
      nama: 'PI',
      kategori: 'tetap',
      tipeData: 'desimal',
      tetap: true,
    },
  ],
  [
    'E',
    {
      nama: 'E',
      kategori: 'tetap',
      tipeData: 'desimal',
      tetap: true,
    },
  ],
  [
    'absolut',
    {
      nama: 'absolut',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'apapun' }],
      tipeKembalian: 'apapun',
    },
  ],
  [
    'bulat',
    {
      nama: 'bulat',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'apapun' }],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'lantai',
    {
      nama: 'lantai',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'apapun' }],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'plafon',
    {
      nama: 'plafon',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'apapun' }],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'pangkat',
    {
      nama: 'pangkat',
      kategori: 'fungsi',
      parameter: [
        { nama: 'basis', tipe: 'apapun' },
        { nama: 'eksponen', tipe: 'apapun' },
      ],
      tipeKembalian: 'apapun',
    },
  ],
  [
    'akar',
    {
      nama: 'akar',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'minimum',
    {
      nama: 'minimum',
      kategori: 'fungsi',
      parameter: [
        { nama: 'a', tipe: 'apapun' },
        { nama: 'b', tipe: 'apapun' },
      ],
      tipeKembalian: 'apapun',
    },
  ],
  [
    'maksimum',
    {
      nama: 'maksimum',
      kategori: 'fungsi',
      parameter: [
        { nama: 'a', tipe: 'apapun' },
        { nama: 'b', tipe: 'apapun' },
      ],
      tipeKembalian: 'apapun',
    },
  ],
]);

function dapatkanNilaiNumerik(v: NilaiRuntime, namaFn: string): number {
  if (v.jenis === JenisNilaiRuntime.BILANGAN || v.jenis === JenisNilaiRuntime.DESIMAL) {
    return v.nilai;
  }
  throw new GalatRuntime(
    JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
    `Fungsi 'matematika.${namaFn}' membutuhkan argumen numerik (bilangan atau desimal), bukan '${v.jenis}'.`
  );
}

export function buatEksporMatematika(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  // Konstanta matematika
  ekspor.set('PI', buatDesimal(3.141592653589793));
  ekspor.set('E', buatDesimal(2.718281828459045));

  const fnAbsolut: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'absolut',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'matematika.absolut' membutuhkan 1 argumen.`
        );
      }
      const val = dapatkanNilaiNumerik(args[0], 'absolut');
      const hasil = Math.abs(val);
      return args[0].jenis === JenisNilaiRuntime.BILANGAN ? buatBilangan(hasil) : buatDesimal(hasil);
    },
  };
  ekspor.set('absolut', fnAbsolut);

  const fnBulat: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'bulat',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'matematika.bulat' membutuhkan 1 argumen.`
        );
      }
      const val = dapatkanNilaiNumerik(args[0], 'bulat');
      return buatBilangan(Math.round(val));
    },
  };
  ekspor.set('bulat', fnBulat);

  const fnLantai: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'lantai',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'matematika.lantai' membutuhkan 1 argumen.`
        );
      }
      const val = dapatkanNilaiNumerik(args[0], 'lantai');
      return buatBilangan(Math.floor(val));
    },
  };
  ekspor.set('lantai', fnLantai);

  const fnPlafon: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'plafon',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'matematika.plafon' membutuhkan 1 argumen.`
        );
      }
      const val = dapatkanNilaiNumerik(args[0], 'plafon');
      return buatBilangan(Math.ceil(val));
    },
  };
  ekspor.set('plafon', fnPlafon);

  const fnPangkat: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pangkat',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'matematika.pangkat' membutuhkan 2 argumen (basis, eksponen).`
        );
      }
      const basis = dapatkanNilaiNumerik(args[0], 'pangkat');
      const eksponen = dapatkanNilaiNumerik(args[1], 'pangkat');
      const hasil = Math.pow(basis, eksponen);
      if (Number.isInteger(hasil) && args[0].jenis === JenisNilaiRuntime.BILANGAN && args[1].jenis === JenisNilaiRuntime.BILANGAN && eksponen >= 0) {
        return buatBilangan(hasil);
      }
      return buatDesimal(hasil);
    },
  };
  ekspor.set('pangkat', fnPangkat);

  const fnAkar: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'akar',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'matematika.akar' membutuhkan 1 argumen.`
        );
      }
      const val = dapatkanNilaiNumerik(args[0], 'akar');
      if (val < 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Kesalahan matematika: tidak dapat menghitung akar kuadrat dari bilangan negatif (${val}).`
        );
      }
      return buatDesimal(Math.sqrt(val));
    },
  };
  ekspor.set('akar', fnAkar);

  const fnMinimum: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'minimum',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'matematika.minimum' membutuhkan 2 argumen.`
        );
      }
      const a = dapatkanNilaiNumerik(args[0], 'minimum');
      const b = dapatkanNilaiNumerik(args[1], 'minimum');
      const min = Math.min(a, b);
      if (args[0].jenis === JenisNilaiRuntime.BILANGAN && args[1].jenis === JenisNilaiRuntime.BILANGAN) {
        return buatBilangan(min);
      }
      return buatDesimal(min);
    },
  };
  ekspor.set('minimum', fnMinimum);

  const fnMaksimum: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'maksimum',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'matematika.maksimum' membutuhkan 2 argumen.`
        );
      }
      const a = dapatkanNilaiNumerik(args[0], 'maksimum');
      const b = dapatkanNilaiNumerik(args[1], 'maksimum');
      const max = Math.max(a, b);
      if (args[0].jenis === JenisNilaiRuntime.BILANGAN && args[1].jenis === JenisNilaiRuntime.BILANGAN) {
        return buatBilangan(max);
      }
      return buatDesimal(max);
    },
  };
  ekspor.set('maksimum', fnMaksimum);

  return ekspor;
}
