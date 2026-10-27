/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatTeks,
  buatPeta,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';

export const simbolEksporWaktu: Map<string, InfoSimbolModul> = new Map([
  [
    'sekarang',
    {
      nama: 'sekarang',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'teks',
    },
  ],
  [
    'tanggal',
    {
      nama: 'tanggal',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'teks',
    },
  ],
  [
    'jam',
    {
      nama: 'jam',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'menit',
    {
      nama: 'menit',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'detik',
    {
      nama: 'detik',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'timestamp',
    {
      nama: 'timestamp',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'format',
    {
      nama: 'format',
      kategori: 'fungsi',
      parameter: [
        { nama: 'ts', tipe: 'bilangan' },
        { nama: 'pola', tipe: 'teks' },
      ],
      tipeKembalian: 'teks',
    },
  ],
  [
    'milidetik',
    {
      nama: 'milidetik',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'timestampDetik',
    {
      nama: 'timestampDetik',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'tahun',
    {
      nama: 'tahun',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'bulan',
    {
      nama: 'bulan',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'hari',
    {
      nama: 'hari',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'hariDalamMinggu',
    {
      nama: 'hariDalamMinggu',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'urai',
    {
      nama: 'urai',
      kategori: 'fungsi',
      parameter: [{ nama: 'teksWaktu', tipe: 'teks' }],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'selisih',
    {
      nama: 'selisih',
      kategori: 'fungsi',
      parameter: [
        { nama: 'ts1', tipe: 'bilangan' },
        { nama: 'ts2', tipe: 'bilangan' },
      ],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'tambahDetik',
    {
      nama: 'tambahDetik',
      kategori: 'fungsi',
      parameter: [
        { nama: 'ts', tipe: 'bilangan' },
        { nama: 'detik', tipe: 'bilangan' },
      ],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'tambahHari',
    {
      nama: 'tambahHari',
      kategori: 'fungsi',
      parameter: [
        { nama: 'ts', tipe: 'bilangan' },
        { nama: 'hari', tipe: 'bilangan' },
      ],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'komponen',
    {
      nama: 'komponen',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'peta',
    },
  ],
]);

export function buatEksporWaktu(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnSekarang: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'sekarang',
    eksekusi: () => {
      const d = new Date();
      // Format ISO lokal tanpa offset rumit: YYYY-MM-DDTHH:mm:ss
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return buatTeks(`${y}-${m}-${day} ${hh}:${mm}:${ss}`);
    },
  };
  ekspor.set('sekarang', fnSekarang);

  const fnTanggal: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tanggal',
    eksekusi: () => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return buatTeks(`${y}-${m}-${day}`);
    },
  };
  ekspor.set('tanggal', fnTanggal);

  const fnJam: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'jam',
    eksekusi: () => buatBilangan(new Date().getHours()),
  };
  ekspor.set('jam', fnJam);

  const fnMenit: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'menit',
    eksekusi: () => buatBilangan(new Date().getMinutes()),
  };
  ekspor.set('menit', fnMenit);

  const fnDetik: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'detik',
    eksekusi: () => buatBilangan(new Date().getSeconds()),
  };
  ekspor.set('detik', fnDetik);

  const fnTimestamp: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'timestamp',
    eksekusi: () => buatBilangan(Date.now()),
  };
  ekspor.set('timestamp', fnTimestamp);

  const fnFormat: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'format',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1 || args[0].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'waktu.format' membutuhkan argumen pertama bertipe bilangan (timestamp ms).`
        );
      }
      const d = new Date(args[0].nilai);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');

      if (args.length > 1 && args[1].jenis === JenisNilaiRuntime.TEKS) {
        let pola = args[1].nilai;
        pola = pola.replace(/YYYY/g, String(y));
        pola = pola.replace(/MM/g, m);
        pola = pola.replace(/DD/g, day);
        pola = pola.replace(/HH/g, hh);
        pola = pola.replace(/mm/g, mm);
        pola = pola.replace(/ss/g, ss);
        return buatTeks(pola);
      }

      return buatTeks(`${y}-${m}-${day} ${hh}:${mm}:${ss}`);
    },
  };
  ekspor.set('format', fnFormat);

  const fnMilidetik: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'milidetik',
    eksekusi: () => buatBilangan(new Date().getMilliseconds()),
  };
  ekspor.set('milidetik', fnMilidetik);

  const fnTimestampDetik: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'timestampDetik',
    eksekusi: () => buatBilangan(Math.floor(Date.now() / 1000)),
  };
  ekspor.set('timestampDetik', fnTimestampDetik);

  const fnTahun: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tahun',
    eksekusi: () => buatBilangan(new Date().getFullYear()),
  };
  ekspor.set('tahun', fnTahun);

  const fnBulan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'bulan',
    eksekusi: () => buatBilangan(new Date().getMonth() + 1),
  };
  ekspor.set('bulan', fnBulan);

  const fnHari: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'hari',
    eksekusi: () => buatBilangan(new Date().getDate()),
  };
  ekspor.set('hari', fnHari);

  const fnHariDalamMinggu: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'hariDalamMinggu',
    eksekusi: () => buatBilangan(new Date().getDay()),
  };
  ekspor.set('hariDalamMinggu', fnHariDalamMinggu);

  const fnUrai: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'urai',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'waktu.urai' membutuhkan 1 argumen bertipe teks (representasi tanggal/waktu).`
        );
      }
      const parsed = Date.parse(args[0].nilai);
      if (Number.isNaN(parsed)) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Format tanggal/waktu '${args[0].nilai}' tidak valid untuk diurai.`
        );
      }
      return buatBilangan(parsed);
    },
  };
  ekspor.set('urai', fnUrai);

  const fnSelisih: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'selisih',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.BILANGAN || args[1].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'waktu.selisih' membutuhkan 2 argumen bertipe bilangan (timestamp ms).`
        );
      }
      return buatBilangan(Math.abs(args[0].nilai - args[1].nilai));
    },
  };
  ekspor.set('selisih', fnSelisih);

  const fnTambahDetik: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tambahDetik',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.BILANGAN || args[1].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'waktu.tambahDetik' membutuhkan 2 argumen bertipe bilangan (ts, detik).`
        );
      }
      return buatBilangan(args[0].nilai + args[1].nilai * 1000);
    },
  };
  ekspor.set('tambahDetik', fnTambahDetik);

  const fnTambahHari: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tambahHari',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.BILANGAN || args[1].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'waktu.tambahHari' membutuhkan 2 argumen bertipe bilangan (ts, hari).`
        );
      }
      return buatBilangan(args[0].nilai + args[1].nilai * 86400000);
    },
  };
  ekspor.set('tambahHari', fnTambahHari);

  const fnKomponen: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'komponen',
    eksekusi: (args: NilaiRuntime[]) => {
      const ts = args.length > 0 && args[0].jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : Date.now();
      const d = new Date(ts);
      const peta = new Map<string, NilaiRuntime>([
        ['tahun', buatBilangan(d.getFullYear())],
        ['bulan', buatBilangan(d.getMonth() + 1)],
        ['hari', buatBilangan(d.getDate())],
        ['jam', buatBilangan(d.getHours())],
        ['menit', buatBilangan(d.getMinutes())],
        ['detik', buatBilangan(d.getSeconds())],
        ['milidetik', buatBilangan(d.getMilliseconds())],
        ['hariDalamMinggu', buatBilangan(d.getDay())],
      ]);
      return buatPeta(peta);
    },
  };
  ekspor.set('komponen', fnKomponen);

  return ekspor;
}
