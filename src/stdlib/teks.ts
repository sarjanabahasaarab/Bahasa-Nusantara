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
  buatDaftar,
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
  [
    'awalan',
    {
      nama: 'awalan',
      kategori: 'fungsi',
      parameter: [
        { nama: 's', tipe: 'teks' },
        { nama: 'awalan', tipe: 'teks' },
      ],
      tipeKembalian: 'logika',
    },
  ],
  [
    'akhiran',
    {
      nama: 'akhiran',
      kategori: 'fungsi',
      parameter: [
        { nama: 's', tipe: 'teks' },
        { nama: 'akhiran', tipe: 'teks' },
      ],
      tipeKembalian: 'logika',
    },
  ],
  [
    'pisah',
    {
      nama: 'pisah',
      kategori: 'fungsi',
      parameter: [
        { nama: 's', tipe: 'teks' },
        { nama: 'pemisah', tipe: 'teks' },
      ],
      tipeKembalian: 'daftar',
    },
  ],
  [
    'panjangKarakter',
    {
      nama: 'panjangKarakter',
      kategori: 'fungsi',
      parameter: [{ nama: 's', tipe: 'teks' }],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'panjangByte',
    {
      nama: 'panjangByte',
      kategori: 'fungsi',
      parameter: [{ nama: 's', tipe: 'teks' }],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'apakahKosong',
    {
      nama: 'apakahKosong',
      kategori: 'fungsi',
      parameter: [{ nama: 's', tipe: 'teks' }],
      tipeKembalian: 'logika',
    },
  ],
  [
    'ulangi',
    {
      nama: 'ulangi',
      kategori: 'fungsi',
      parameter: [
        { nama: 's', tipe: 'teks' },
        { nama: 'jumlah', tipe: 'bilangan' },
      ],
      tipeKembalian: 'teks',
    },
  ],
  [
    'format',
    {
      nama: 'format',
      kategori: 'fungsi',
      parameter: [
        { nama: 'pola', tipe: 'teks' },
        { nama: 'daftarArgumen', tipe: 'daftar' },
      ],
      tipeKembalian: 'teks',
    },
  ],
  [
    'karakterPada',
    {
      nama: 'karakterPada',
      kategori: 'fungsi',
      parameter: [
        { nama: 's', tipe: 'teks' },
        { nama: 'indeks', tipe: 'bilangan' },
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

  const fnAwalan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'awalan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.awalan' membutuhkan 2 argumen bertipe teks (s, awalan).`
        );
      }
      return buatLogika(args[0].nilai.startsWith(args[1].nilai));
    },
  };
  ekspor.set('awalan', fnAwalan);

  const fnAkhiran: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'akhiran',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.akhiran' membutuhkan 2 argumen bertipe teks (s, akhiran).`
        );
      }
      return buatLogika(args[0].nilai.endsWith(args[1].nilai));
    },
  };
  ekspor.set('akhiran', fnAkhiran);

  const fnPisah: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pisah',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.pisah' membutuhkan argumen pertama bertipe teks.`
        );
      }
      const pemisah = args.length > 1 && args[1].jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : ' ';
      const bagian = args[0].nilai.split(pemisah).map(b => buatTeks(b));
      return buatDaftar(bagian);
    },
  };
  ekspor.set('pisah', fnPisah);

  const fnPanjangKarakter: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'panjangKarakter',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.panjangKarakter' membutuhkan 1 argumen bertipe teks.`
        );
      }
      // Menghitung Unicode code points (bukan hanya UTF-16 code units)
      return buatBilangan(Array.from(args[0].nilai).length);
    },
  };
  ekspor.set('panjangKarakter', fnPanjangKarakter);

  const fnPanjangByte: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'panjangByte',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.panjangByte' membutuhkan 1 argumen bertipe teks.`
        );
      }
      if (typeof TextEncoder !== 'undefined') {
        return buatBilangan(new TextEncoder().encode(args[0].nilai).length);
      }
      if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') {
        return buatBilangan(Buffer.byteLength(args[0].nilai, 'utf8'));
      }
      return buatBilangan(args[0].nilai.length);
    },
  };
  ekspor.set('panjangByte', fnPanjangByte);

  const fnApakahKosong: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'apakahKosong',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.apakahKosong' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatLogika(args[0].nilai.length === 0);
    },
  };
  ekspor.set('apakahKosong', fnApakahKosong);

  const fnUlangi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ulangi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.ulangi' membutuhkan 2 argumen: (s: teks, jumlah: bilangan).`
        );
      }
      const count = Math.max(0, args[1].nilai);
      return buatTeks(args[0].nilai.repeat(count));
    },
  };
  ekspor.set('ulangi', fnUlangi);

  const fnFormat: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'format',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.format' membutuhkan argumen pertama bertipe teks.`
        );
      }
      let pola = args[0].nilai;
      const daftarNilai: string[] = [];
      if (args.length > 1 && args[1].jenis === JenisNilaiRuntime.DAFTAR) {
        for (const el of args[1].elemen) {
          daftarNilai.push(el.jenis === JenisNilaiRuntime.TEKS ? el.nilai : String((el as any).nilai ?? ''));
        }
      } else {
        for (let i = 1; i < args.length; i++) {
          const el = args[i];
          daftarNilai.push(el.jenis === JenisNilaiRuntime.TEKS ? el.nilai : String((el as any).nilai ?? ''));
        }
      }

      for (let i = 0; i < daftarNilai.length; i++) {
        pola = pola.split(`{${i}}`).join(daftarNilai[i]);
      }
      return buatTeks(pola);
    },
  };
  ekspor.set('format', fnFormat);

  const fnKarakterPada: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'karakterPada',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'teks.karakterPada' membutuhkan 2 argumen: (s: teks, indeks: bilangan).`
        );
      }
      const s = args[0].nilai;
      const idx = args[1].nilai;
      if (idx < 0 || idx >= s.length) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Indeks '${idx}' di luar rentang panjang teks (0..${s.length - 1}).`
        );
      }
      return buatTeks(s.charAt(idx));
    },
  };
  ekspor.set('karakterPada', fnKarakterPada);

  return ekspor;
}
