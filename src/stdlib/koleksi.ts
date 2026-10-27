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
  buatKosong,
  buatTeks,
  buatPeta,
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
  [
    'potong',
    {
      nama: 'potong',
      kategori: 'fungsi',
      parameter: [
        { nama: 'd', tipe: 'daftar' },
        { nama: 'mulai', tipe: 'bilangan' },
        { nama: 'akhir', tipe: 'bilangan' },
      ],
      tipeKembalian: 'daftar',
    },
  ],
  [
    'ambil',
    {
      nama: 'ambil',
      kategori: 'fungsi',
      parameter: [
        { nama: 'koleksi', tipe: 'apapun' },
        { nama: 'indeksAtauKunci', tipe: 'apapun' },
      ],
      tipeKembalian: 'apapun',
    },
  ],
  [
    'tambah',
    {
      nama: 'tambah',
      kategori: 'fungsi',
      parameter: [
        { nama: 'd', tipe: 'daftar' },
        { nama: 'elemen', tipe: 'apapun' },
      ],
      tipeKembalian: 'daftar',
    },
  ],
  [
    'tetapkan',
    {
      nama: 'tetapkan',
      kategori: 'fungsi',
      parameter: [
        { nama: 'p', tipe: 'peta' },
        { nama: 'kunci', tipe: 'teks' },
        { nama: 'nilai', tipe: 'apapun' },
      ],
      tipeKembalian: 'peta',
    },
  ],
  [
    'hapus',
    {
      nama: 'hapus',
      kategori: 'fungsi',
      parameter: [
        { nama: 'koleksi', tipe: 'apapun' },
        { nama: 'indeksAtauKunci', tipe: 'apapun' },
      ],
      tipeKembalian: 'apapun',
    },
  ],
  [
    'kunci',
    {
      nama: 'kunci',
      kategori: 'fungsi',
      parameter: [{ nama: 'p', tipe: 'peta' }],
      tipeKembalian: 'daftar',
    },
  ],
  [
    'nilai',
    {
      nama: 'nilai',
      kategori: 'fungsi',
      parameter: [{ nama: 'p', tipe: 'peta' }],
      tipeKembalian: 'daftar',
    },
  ],
  [
    'salin',
    {
      nama: 'salin',
      kategori: 'fungsi',
      parameter: [{ nama: 'koleksi', tipe: 'apapun' }],
      tipeKembalian: 'apapun',
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
  ekspor.set('potong', fnIris);

  const fnAmbil: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambil',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.ambil' membutuhkan 2 argumen: (koleksi, indeksAtauKunci).`
        );
      }
      const target = args[0];
      const kunci = args[1];

      if (target.jenis === JenisNilaiRuntime.DAFTAR) {
        if (kunci.jenis !== JenisNilaiRuntime.BILANGAN) {
          throw new GalatRuntime(
            JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
            `Pengindeksan daftar membutuhkan argumen indeks bilangan, bukan '${kunci.jenis}'.`
          );
        }
        const idx = kunci.nilai;
        if (idx < 0 || idx >= target.elemen.length) {
          throw new GalatRuntime(
            JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
            `Indeks '${idx}' di luar rentang daftar (ukuran ${target.elemen.length}).`
          );
        }
        return target.elemen[idx];
      }

      if (target.jenis === JenisNilaiRuntime.PETA) {
        if (kunci.jenis !== JenisNilaiRuntime.TEKS) {
          throw new GalatRuntime(
            JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
            `Kunci peta harus bertipe teks, bukan '${kunci.jenis}'.`
          );
        }
        const val = target.nilai.get(kunci.nilai);
        return val !== undefined ? val : buatKosong();
      }

      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Fungsi 'koleksi.ambil' hanya dapat digunakan pada daftar atau peta, bukan '${target.jenis}'.`
      );
    },
  };
  ekspor.set('ambil', fnAmbil);

  const fnTambah: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tambah',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.DAFTAR) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.tambah' membutuhkan argumen pertama bertipe daftar.`
        );
      }
      return buatDaftar([...args[0].elemen, args[1]]);
    },
  };
  ekspor.set('tambah', fnTambah);

  const fnTetapkan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tetapkan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 3 || args[0].jenis !== JenisNilaiRuntime.PETA || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.tetapkan' membutuhkan 3 argumen: (peta, kunci: teks, nilai).`
        );
      }
      const salinan = new Map(args[0].nilai);
      salinan.set(args[1].nilai, args[2]);
      return buatPeta(salinan);
    },
  };
  ekspor.set('tetapkan', fnTetapkan);

  const fnHapus: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'hapus',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.hapus' membutuhkan 2 argumen: (koleksi, indeksAtauKunci).`
        );
      }
      const target = args[0];
      const kunci = args[1];

      if (target.jenis === JenisNilaiRuntime.DAFTAR) {
        if (kunci.jenis !== JenisNilaiRuntime.BILANGAN) {
          throw new GalatRuntime(
            JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
            `Indeks daftar yang dihapus harus bertipe bilangan.`
          );
        }
        const idx = kunci.nilai;
        if (idx < 0 || idx >= target.elemen.length) {
          throw new GalatRuntime(
            JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
            `Indeks '${idx}' di luar batas daftar saat mencoba menghapus.`
          );
        }
        const salinan = [...target.elemen];
        salinan.splice(idx, 1);
        return buatDaftar(salinan);
      }

      if (target.jenis === JenisNilaiRuntime.PETA) {
        if (kunci.jenis !== JenisNilaiRuntime.TEKS) {
          throw new GalatRuntime(
            JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
            `Kunci peta yang dihapus harus bertipe teks.`
          );
        }
        const salinan = new Map(target.nilai);
        salinan.delete(kunci.nilai);
        return buatPeta(salinan);
      }

      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Fungsi 'koleksi.hapus' hanya dapat digunakan pada daftar atau peta.`
      );
    },
  };
  ekspor.set('hapus', fnHapus);

  const fnKunci: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'kunci',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.PETA) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.kunci' membutuhkan 1 argumen bertipe peta.`
        );
      }
      const kunciArray = Array.from(args[0].nilai.keys()).map(k => buatTeks(k));
      return buatDaftar(kunciArray);
    },
  };
  ekspor.set('kunci', fnKunci);

  const fnNilai: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'nilai',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.PETA) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.nilai' membutuhkan 1 argumen bertipe peta.`
        );
      }
      const nilaiArray = Array.from(args[0].nilai.values());
      return buatDaftar(nilaiArray);
    },
  };
  ekspor.set('nilai', fnNilai);

  const fnSalin: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'salin',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'koleksi.salin' membutuhkan 1 argumen.`
        );
      }
      const target = args[0];
      if (target.jenis === JenisNilaiRuntime.DAFTAR) {
        return buatDaftar([...target.elemen]);
      }
      if (target.jenis === JenisNilaiRuntime.PETA) {
        return buatPeta(new Map(target.nilai));
      }
      return target;
    },
  };
  ekspor.set('salin', fnSalin);

  return ekspor;
}
