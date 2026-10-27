/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatDesimal,
  buatLogika,
  buatTeks,
  buatKosong,
  buatDaftar,
  buatPeta,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';

/**
 * Modul Standar: json
 * Menyediakan fungsi pemrosesan JSON aman dengan pemetaan tipe data resmi Nusantara:
 * Objek JSON <-> Peta, Array <-> Daftar, Teks <-> String, Bilangan/Desimal <-> Number,
 * Logika <-> Boolean, Kosong <-> Null.
 */
export const simbolEksporJson: Map<string, InfoSimbolModul> = new Map([
  [
    'urai',
    {
      nama: 'urai',
      kategori: 'fungsi',
      parameter: [{ nama: 'teksJson', tipe: 'teks' }],
      tipeKembalian: 'apapun',
    },
  ],
  [
    'cetak',
    {
      nama: 'cetak',
      kategori: 'fungsi',
      parameter: [
        { nama: 'nilai', tipe: 'apapun' },
        { nama: 'spasi', tipe: 'bilangan' },
      ],
      tipeKembalian: 'teks',
    },
  ],
  [
    'apakahValid',
    {
      nama: 'apakahValid',
      kategori: 'fungsi',
      parameter: [{ nama: 'teksJson', tipe: 'teks' }],
      tipeKembalian: 'logika',
    },
  ],
]);

function konversiJsKeNusantara(jsVal: any): NilaiRuntime {
  if (jsVal === null || jsVal === undefined) {
    return buatKosong();
  }
  if (typeof jsVal === 'boolean') {
    return buatLogika(jsVal);
  }
  if (typeof jsVal === 'number') {
    return Number.isInteger(jsVal) ? buatBilangan(jsVal) : buatDesimal(jsVal);
  }
  if (typeof jsVal === 'string') {
    return buatTeks(jsVal);
  }
  if (Array.isArray(jsVal)) {
    return buatDaftar(jsVal.map(konversiJsKeNusantara));
  }
  if (typeof jsVal === 'object') {
    const peta = new Map<string, NilaiRuntime>();
    for (const [k, v] of Object.entries(jsVal)) {
      peta.set(k, konversiJsKeNusantara(v));
    }
    return buatPeta(peta);
  }
  return buatTeks(String(jsVal));
}

function konversiNusantaraKeJs(val: NilaiRuntime): any {
  switch (val.jenis) {
    case JenisNilaiRuntime.TEKS:
    case JenisNilaiRuntime.KARAKTER:
      return val.nilai;
    case JenisNilaiRuntime.BILANGAN:
    case JenisNilaiRuntime.DESIMAL:
      return val.nilai;
    case JenisNilaiRuntime.LOGIKA:
      return val.nilai;
    case JenisNilaiRuntime.KOSONG:
      return null;
    case JenisNilaiRuntime.DAFTAR:
      return val.elemen.map(konversiNusantaraKeJs);
    case JenisNilaiRuntime.PETA: {
      const obj: Record<string, any> = {};
      val.nilai.forEach((v, k) => {
        obj[k] = konversiNusantaraKeJs(v);
      });
      return obj;
    }
    default:
      return null;
  }
}

export function buatEksporJson(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnUrai: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'urai',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'json.urai' membutuhkan 1 argumen bertipe teks (string JSON).`
        );
      }
      const raw = args[0].nilai.trim();
      if (!raw) {
        throw new GalatRuntime(
          JenisGalatRuntime.SINTAKS_TIDAK_VALID,
          `Kesalahan sintaks JSON: teks JSON tidak boleh kosong.`
        );
      }

      try {
        const parsed = JSON.parse(raw);
        return konversiJsKeNusantara(parsed);
      } catch (err: any) {
        // Laporkan posisi dan pesan galat JSON secara presisi
        throw new GalatRuntime(
          JenisGalatRuntime.SINTAKS_TIDAK_VALID,
          `Kesalahan sintaks JSON saat penguraian: ${err.message}`
        );
      }
    },
  };
  ekspor.set('urai', fnUrai);

  const fnCetak: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'cetak',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'json.cetak' membutuhkan minimal 1 argumen (nilai yang akan diserialisasi).`
        );
      }
      const jsObj = konversiNusantaraKeJs(args[0]);
      let spasi: number | undefined = undefined;
      if (args.length > 1 && args[1].jenis === JenisNilaiRuntime.BILANGAN) {
        spasi = Math.max(0, args[1].nilai);
      }
      try {
        const res = JSON.stringify(jsObj, null, spasi);
        return buatTeks(res ?? 'null');
      } catch (err: any) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Gagal menserialisasi nilai menjadi JSON: ${err.message}`
        );
      }
    },
  };
  ekspor.set('cetak', fnCetak);

  const fnApakahValid: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'apakahValid',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        return buatLogika(false);
      }
      try {
        JSON.parse(args[0].nilai);
        return buatLogika(true);
      } catch {
        return buatLogika(false);
      }
    },
  };
  ekspor.set('apakahValid', fnApakahValid);

  return ekspor;
}
