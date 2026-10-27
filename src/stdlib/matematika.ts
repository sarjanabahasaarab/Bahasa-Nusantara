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
    'TAU',
    {
      nama: 'TAU',
      kategori: 'tetap',
      tipeData: 'desimal',
      tetap: true,
    },
  ],
  [
    'INF',
    {
      nama: 'INF',
      kategori: 'tetap',
      tipeData: 'desimal',
      tetap: true,
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
  [
    'sin',
    {
      nama: 'sin',
      kategori: 'fungsi',
      parameter: [{ nama: 'rad', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'cos',
    {
      nama: 'cos',
      kategori: 'fungsi',
      parameter: [{ nama: 'rad', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'tan',
    {
      nama: 'tan',
      kategori: 'fungsi',
      parameter: [{ nama: 'rad', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'asin',
    {
      nama: 'asin',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'acos',
    {
      nama: 'acos',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'atan',
    {
      nama: 'atan',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'atan2',
    {
      nama: 'atan2',
      kategori: 'fungsi',
      parameter: [
        { nama: 'y', tipe: 'apapun' },
        { nama: 'x', tipe: 'apapun' },
      ],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'log',
    {
      nama: 'log',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'log10',
    {
      nama: 'log10',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'exp',
    {
      nama: 'exp',
      kategori: 'fungsi',
      parameter: [{ nama: 'x', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'derajatKeRadian',
    {
      nama: 'derajatKeRadian',
      kategori: 'fungsi',
      parameter: [{ nama: 'deg', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'radianKeDerajat',
    {
      nama: 'radianKeDerajat',
      kategori: 'fungsi',
      parameter: [{ nama: 'rad', tipe: 'apapun' }],
      tipeKembalian: 'desimal',
    },
  ],
  [
    'bagi',
    {
      nama: 'bagi',
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

  // Konstanta tambahan Fase 28
  ekspor.set('TAU', buatDesimal(6.283185307179586));
  ekspor.set('INF', buatDesimal(Infinity));

  const fnSin: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'sin',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.sin' membutuhkan 1 argumen.`);
      }
      const val = dapatkanNilaiNumerik(args[0], 'sin');
      return buatDesimal(Math.sin(val));
    },
  };
  ekspor.set('sin', fnSin);

  const fnCos: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'cos',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.cos' membutuhkan 1 argumen.`);
      }
      const val = dapatkanNilaiNumerik(args[0], 'cos');
      return buatDesimal(Math.cos(val));
    },
  };
  ekspor.set('cos', fnCos);

  const fnTan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.tan' membutuhkan 1 argumen.`);
      }
      const val = dapatkanNilaiNumerik(args[0], 'tan');
      return buatDesimal(Math.tan(val));
    },
  };
  ekspor.set('tan', fnTan);

  const fnAsin: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'asin',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.asin' membutuhkan 1 argumen.`);
      }
      const val = dapatkanNilaiNumerik(args[0], 'asin');
      if (val < -1 || val > 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Kesalahan domain matematika: nilai asin harus berada di antara -1 dan 1, namun mendapatkan ${val}.`
        );
      }
      return buatDesimal(Math.asin(val));
    },
  };
  ekspor.set('asin', fnAsin);

  const fnAcos: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'acos',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.acos' membutuhkan 1 argumen.`);
      }
      const val = dapatkanNilaiNumerik(args[0], 'acos');
      if (val < -1 || val > 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Kesalahan domain matematika: nilai acos harus berada di antara -1 dan 1, namun mendapatkan ${val}.`
        );
      }
      return buatDesimal(Math.acos(val));
    },
  };
  ekspor.set('acos', fnAcos);

  const fnAtan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'atan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.atan' membutuhkan 1 argumen.`);
      }
      const val = dapatkanNilaiNumerik(args[0], 'atan');
      return buatDesimal(Math.atan(val));
    },
  };
  ekspor.set('atan', fnAtan);

  const fnAtan2: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'atan2',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.atan2' membutuhkan 2 argumen: (y, x).`);
      }
      const y = dapatkanNilaiNumerik(args[0], 'atan2');
      const x = dapatkanNilaiNumerik(args[1], 'atan2');
      return buatDesimal(Math.atan2(y, x));
    },
  };
  ekspor.set('atan2', fnAtan2);

  const fnLog: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'log',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.log' membutuhkan 1 argumen.`);
      }
      const val = dapatkanNilaiNumerik(args[0], 'log');
      if (val <= 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Kesalahan domain matematika: logaritma natural hanya terdefinisi untuk bilangan positif (> 0), namun mendapatkan ${val}.`
        );
      }
      return buatDesimal(Math.log(val));
    },
  };
  ekspor.set('log', fnLog);

  const fnLog10: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'log10',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.log10' membutuhkan 1 argumen.`);
      }
      const val = dapatkanNilaiNumerik(args[0], 'log10');
      if (val <= 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Kesalahan domain matematika: logaritma basis 10 hanya terdefinisi untuk bilangan positif (> 0), namun mendapatkan ${val}.`
        );
      }
      return buatDesimal(Math.log10(val));
    },
  };
  ekspor.set('log10', fnLog10);

  const fnExp: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'exp',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.exp' membutuhkan 1 argumen.`);
      }
      const val = dapatkanNilaiNumerik(args[0], 'exp');
      return buatDesimal(Math.exp(val));
    },
  };
  ekspor.set('exp', fnExp);

  const fnDerajatKeRadian: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'derajatKeRadian',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.derajatKeRadian' membutuhkan 1 argumen.`);
      }
      const deg = dapatkanNilaiNumerik(args[0], 'derajatKeRadian');
      return buatDesimal((deg * Math.PI) / 180);
    },
  };
  ekspor.set('derajatKeRadian', fnDerajatKeRadian);

  const fnRadianKeDerajat: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'radianKeDerajat',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.radianKeDerajat' membutuhkan 1 argumen.`);
      }
      const rad = dapatkanNilaiNumerik(args[0], 'radianKeDerajat');
      return buatDesimal((rad * 180) / Math.PI);
    },
  };
  ekspor.set('radianKeDerajat', fnRadianKeDerajat);

  const fnBagi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'bagi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI, `Fungsi 'matematika.bagi' membutuhkan 2 argumen: (a, b).`);
      }
      const a = dapatkanNilaiNumerik(args[0], 'bagi');
      const b = dapatkanNilaiNumerik(args[1], 'bagi');
      if (b === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.PEMBAGIAN_DENGAN_NOL,
          `Kesalahan matematika: pembagian dengan nol tidak diperbolehkan.`
        );
      }
      const hasil = a / b;
      return Number.isInteger(hasil) && args[0].jenis === JenisNilaiRuntime.BILANGAN && args[1].jenis === JenisNilaiRuntime.BILANGAN
        ? buatBilangan(hasil)
        : buatDesimal(hasil);
    },
  };
  ekspor.set('bagi', fnBagi);

  return ekspor;
}
