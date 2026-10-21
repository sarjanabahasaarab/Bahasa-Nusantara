/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatTeks,
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

  return ekspor;
}
