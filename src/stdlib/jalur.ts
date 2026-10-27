/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatTeks,
  buatLogika,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';

/**
 * Modul Standar: jalur
 * Menyediakan utilitas manipulasi jalur berkas (path) lintas platform (Windows & POSIX)
 * secara aman dan konsisten.
 */
export const simbolEksporJalur: Map<string, InfoSimbolModul> = new Map([
  [
    'gabung',
    {
      nama: 'gabung',
      kategori: 'fungsi',
      parameter: [{ nama: 'bagian', tipe: 'teks' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'normalisasi',
    {
      nama: 'normalisasi',
      kategori: 'fungsi',
      parameter: [{ nama: 'jalur', tipe: 'teks' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'ekstensi',
    {
      nama: 'ekstensi',
      kategori: 'fungsi',
      parameter: [{ nama: 'jalur', tipe: 'teks' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'namaBerkas',
    {
      nama: 'namaBerkas',
      kategori: 'fungsi',
      parameter: [
        { nama: 'jalur', tipe: 'teks' },
        { nama: 'buangEkstensi', tipe: 'apapun' },
      ],
      tipeKembalian: 'teks',
    },
  ],
  [
    'direktoriInduk',
    {
      nama: 'direktoriInduk',
      kategori: 'fungsi',
      parameter: [{ nama: 'jalur', tipe: 'teks' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'apakahAbsolut',
    {
      nama: 'apakahAbsolut',
      kategori: 'fungsi',
      parameter: [{ nama: 'jalur', tipe: 'teks' }],
      tipeKembalian: 'logika',
    },
  ],
  [
    'pemisah',
    {
      nama: 'pemisah',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'teks',
    },
  ],
]);

export function normalisasiJalurInternal(jalur: string): string {
  if (!jalur || jalur.trim() === '') return '.';
  const seragam = jalur.replace(/\\/g, '/');
  const adalahAbsolut = seragam.startsWith('/') || /^[a-zA-Z]:\//.test(seragam);
  const driveMatch = seragam.match(/^([a-zA-Z]:)(\/.*)?$/);
  const drive = driveMatch ? driveMatch[1] : '';
  const sisa = driveMatch ? (driveMatch[2] || '/') : seragam;

  const bagian = sisa.split('/').filter(p => p !== '' && p !== '.');
  const tumpukan: string[] = [];

  for (const seg of bagian) {
    if (seg === '..') {
      if (tumpukan.length > 0 && tumpukan[tumpukan.length - 1] !== '..') {
        tumpukan.pop();
      } else if (!adalahAbsolut) {
        tumpukan.push('..');
      }
    } else {
      tumpukan.push(seg);
    }
  }

  let hasil = tumpukan.join('/');
  if (drive) {
    return drive + (hasil ? '/' + hasil : '/');
  }
  if (adalahAbsolut) {
    return '/' + hasil;
  }
  return hasil || '.';
}

export function buatEksporJalur(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnGabung: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'gabung',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0) {
        return buatTeks('.');
      }
      const segmen: string[] = [];
      for (const a of args) {
        if (a.jenis === JenisNilaiRuntime.TEKS) {
          segmen.push(a.nilai);
        } else if (a.jenis === JenisNilaiRuntime.DAFTAR) {
          for (const item of a.elemen) {
            if (item.jenis === JenisNilaiRuntime.TEKS) {
              segmen.push(item.nilai);
            }
          }
        }
      }
      return buatTeks(normalisasiJalurInternal(segmen.join('/')));
    },
  };
  ekspor.set('gabung', fnGabung);

  const fnNormalisasi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'normalisasi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'jalur.normalisasi' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatTeks(normalisasiJalurInternal(args[0].nilai));
    },
  };
  ekspor.set('normalisasi', fnNormalisasi);

  const fnEkstensi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ekstensi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'jalur.ekstensi' membutuhkan 1 argumen bertipe teks.`
        );
      }
      const norm = args[0].nilai.replace(/\\/g, '/');
      const nama = norm.split('/').pop() || '';
      const dotIdx = nama.lastIndexOf('.');
      if (dotIdx <= 0 || dotIdx === nama.length - 1) {
        return buatTeks('');
      }
      return buatTeks(nama.slice(dotIdx));
    },
  };
  ekspor.set('ekstensi', fnEkstensi);

  const fnNamaBerkas: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'namaBerkas',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'jalur.namaBerkas' membutuhkan argumen pertama bertipe teks.`
        );
      }
      const norm = args[0].nilai.replace(/\\/g, '/').replace(/\/+$/, '');
      let nama = norm.split('/').pop() || '';
      if (args.length > 1) {
        if (args[1].jenis === JenisNilaiRuntime.LOGIKA && args[1].nilai) {
          const dotIdx = nama.lastIndexOf('.');
          if (dotIdx > 0) nama = nama.slice(0, dotIdx);
        } else if (args[1].jenis === JenisNilaiRuntime.TEKS) {
          const akhiran = args[1].nilai;
          if (nama.endsWith(akhiran)) {
            nama = nama.slice(0, -akhiran.length);
          }
        }
      }
      return buatTeks(nama);
    },
  };
  ekspor.set('namaBerkas', fnNamaBerkas);

  const fnDirektoriInduk: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'direktoriInduk',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'jalur.direktoriInduk' membutuhkan 1 argumen bertipe teks.`
        );
      }
      const norm = normalisasiJalurInternal(args[0].nilai);
      const idx = norm.lastIndexOf('/');
      if (idx === -1) {
        return buatTeks('.');
      }
      if (idx === 0) {
        return buatTeks('/');
      }
      return buatTeks(norm.slice(0, idx));
    },
  };
  ekspor.set('direktoriInduk', fnDirektoriInduk);

  const fnApakahAbsolut: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'apakahAbsolut',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'jalur.apakahAbsolut' membutuhkan 1 argumen bertipe teks.`
        );
      }
      const s = args[0].nilai.replace(/\\/g, '/');
      const isAbs = s.startsWith('/') || /^[a-zA-Z]:\//.test(s);
      return buatLogika(isAbs);
    },
  };
  ekspor.set('apakahAbsolut', fnApakahAbsolut);

  const fnPemisah: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pemisah',
    eksekusi: () => {
      if (typeof process !== 'undefined' && process.platform === 'win32') {
        return buatTeks('\\');
      }
      return buatTeks('/');
    },
  };
  ekspor.set('pemisah', fnPemisah);

  return ekspor;
}
