/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InfoSimbolModul } from '../modul/jenisModul';
import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatLogika,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { Penegasan } from '../testing/penegasan';

export const simbolEksporUji: Map<string, InfoSimbolModul> = new Map([
  [
    'pastikan',
    {
      nama: 'pastikan',
      kategori: 'fungsi',
      tipeKembalian: 'logika',
      parameter: [{ nama: 'kondisi', tipe: 'apapun' }, { nama: 'pesan', tipe: 'teks' }],
    },
  ],
  [
    'pastikanSama',
    {
      nama: 'pastikanSama',
      kategori: 'fungsi',
      tipeKembalian: 'logika',
      parameter: [{ nama: 'aktual', tipe: 'apapun' }, { nama: 'diharapkan', tipe: 'apapun' }, { nama: 'pesan', tipe: 'teks' }],
    },
  ],
  [
    'pastikanTidakSama',
    {
      nama: 'pastikanTidakSama',
      kategori: 'fungsi',
      tipeKembalian: 'logika',
      parameter: [{ nama: 'aktual', tipe: 'apapun' }, { nama: 'tidakDiharapkan', tipe: 'apapun' }, { nama: 'pesan', tipe: 'teks' }],
    },
  ],
  [
    'pastikanBenar',
    {
      nama: 'pastikanBenar',
      kategori: 'fungsi',
      tipeKembalian: 'logika',
      parameter: [{ nama: 'kondisi', tipe: 'apapun' }, { nama: 'pesan', tipe: 'teks' }],
    },
  ],
  [
    'pastikanSalah',
    {
      nama: 'pastikanSalah',
      kategori: 'fungsi',
      tipeKembalian: 'logika',
      parameter: [{ nama: 'kondisi', tipe: 'apapun' }, { nama: 'pesan', tipe: 'teks' }],
    },
  ],
]);

export function buatEksporUji(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnPastikan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pastikan',
    eksekusi: (argumen: NilaiRuntime[]) => {
      const pesan = argumen[1]?.jenis === JenisNilaiRuntime.TEKS ? argumen[1].nilai : undefined;
      Penegasan.pastikan(argumen[0], pesan);
      return buatLogika(true);
    },
  };
  ekspor.set('pastikan', fnPastikan);

  const fnPastikanSama: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pastikanSama',
    eksekusi: (argumen: NilaiRuntime[]) => {
      const pesan = argumen[2]?.jenis === JenisNilaiRuntime.TEKS ? argumen[2].nilai : undefined;
      Penegasan.pastikanSama(argumen[0], argumen[1], pesan);
      return buatLogika(true);
    },
  };
  ekspor.set('pastikanSama', fnPastikanSama);
  ekspor.set('pastikan_sama', fnPastikanSama);

  const fnPastikanTidakSama: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pastikanTidakSama',
    eksekusi: (argumen: NilaiRuntime[]) => {
      const pesan = argumen[2]?.jenis === JenisNilaiRuntime.TEKS ? argumen[2].nilai : undefined;
      Penegasan.pastikanTidakSama(argumen[0], argumen[1], pesan);
      return buatLogika(true);
    },
  };
  ekspor.set('pastikanTidakSama', fnPastikanTidakSama);
  ekspor.set('pastikan_tidak_sama', fnPastikanTidakSama);

  const fnPastikanBenar: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pastikanBenar',
    eksekusi: (argumen: NilaiRuntime[]) => {
      const pesan = argumen[1]?.jenis === JenisNilaiRuntime.TEKS ? argumen[1].nilai : undefined;
      Penegasan.pastikanBenar(argumen[0], pesan);
      return buatLogika(true);
    },
  };
  ekspor.set('pastikanBenar', fnPastikanBenar);
  ekspor.set('pastikan_benar', fnPastikanBenar);

  const fnPastikanSalah: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pastikanSalah',
    eksekusi: (argumen: NilaiRuntime[]) => {
      const pesan = argumen[1]?.jenis === JenisNilaiRuntime.TEKS ? argumen[1].nilai : undefined;
      Penegasan.pastikanSalah(argumen[0], pesan);
      return buatLogika(true);
    },
  };
  ekspor.set('pastikanSalah', fnPastikanSalah);
  ekspor.set('pastikan_salah', fnPastikanSalah);

  return ekspor;
}
