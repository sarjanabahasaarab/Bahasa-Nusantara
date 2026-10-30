/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - HTTP Client & API Integration (Phase 35)
 * Modul Standar: http (alias: klienhttp, api)
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatLogika,
  buatTeks,
  buatKosong,
  buatDaftar,
  buatPeta,
  NilaiFungsiBawaan,
  NilaiPeta,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';
import { KlienHTTP } from '../http/client/httpClient';
import { KlienAPI } from '../http/api/apiClient';
import { PengunduhBerkas } from '../http/download/fileDownloader';
import { PengunggahBerkas } from '../http/upload/fileUploader';
import { PengelolaWebhook } from '../http/webhook/webhook';
import { AdaptorLayananEksternal } from '../http/integrations/adapters';
import {
  OpsiRequestHTTP,
  ResponHTTPInterface,
  MetodeHTTP,
} from '../http/types';
import { konversiKeNilaiRuntime, konversiDariNilaiRuntime } from './basisdata';

/**
 * Metadata Simbol Ekspor Resmi Modul `http` (dan alias `klienhttp`, `api`).
 */
export const simbolEksporHTTP: Map<string, InfoSimbolModul> = new Map([
  [
    'buatKlien',
    {
      nama: 'buatKlien',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'ambil',
    {
      nama: 'ambil',
      kategori: 'fungsi',
      parameter: [
        { nama: 'url', tipe: 'teks' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 1,
      variadik: true,
    },
  ],
  [
    'kirim',
    {
      nama: 'kirim',
      kategori: 'fungsi',
      parameter: [
        { nama: 'url', tipe: 'teks' },
        { nama: 'data', tipe: 'apapun' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 2,
      variadik: true,
    },
  ],
  [
    'buatKlienAPI',
    {
      nama: 'buatKlienAPI',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
    },
  ],
  [
    'buatPengunduh',
    {
      nama: 'buatPengunduh',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatPengunggah',
    {
      nama: 'buatPengunggah',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatPengelolaWebhook',
    {
      nama: 'buatPengelolaWebhook',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
    },
  ],
  [
    'verifikasiWebhook',
    {
      nama: 'verifikasiWebhook',
      kategori: 'fungsi',
      parameter: [
        { nama: 'kunciRahasia', tipe: 'teks' },
        { nama: 'payload', tipe: 'teks' },
        { nama: 'tandaTangan', tipe: 'teks' },
      ],
      tipeKembalian: 'logika',
      minParameter: 3,
      variadik: true,
    },
  ],
  [
    'buatAdaptorLayanan',
    {
      nama: 'buatAdaptorLayanan',
      kategori: 'fungsi',
      parameter: [{ nama: 'konfigurasi', tipe: 'peta' }],
      tipeKembalian: 'peta',
    },
  ],
]);

/**
 * Konversi Respon HTTP ke Peta NilaiRuntime NUSANTARA
 */
export function bungkusResponHTTP(res: ResponHTTPInterface): NilaiPeta {
  const map = new Map<string, NilaiRuntime>();
  map.set('status', buatBilangan(res.status));
  map.set('teksStatus', buatTeks(res.statusTeks || res.teksStatus || ''));
  map.set('berhasil', buatLogika(res.apakahSukses ?? res.berhasil ?? (res.status >= 200 && res.status < 300)));
  map.set('durasiMs', buatBilangan(res.durasiMs));
  map.set('urlTerakhir', buatTeks(res.urlAkhir || res.urlTerakhir || ''));
  map.set('pengalihan', konversiKeNilaiRuntime(res.pengalihan));

  // Headers
  const headerMap = new Map<string, NilaiRuntime>();
  if (res.headers && res.headers instanceof Map) {
    for (const [k, v] of res.headers.entries()) {
      headerMap.set(k, buatTeks(String(v)));
    }
  } else if (res.header && typeof res.header.entri === 'function') {
    for (const [k, v] of Object.entries(res.header.entri())) {
      headerMap.set(k, buatTeks(String(v)));
    }
  }
  map.set('header', buatPeta(headerMap));

  // Teks tubuh
  let teksTubuh = '';
  try {
    teksTubuh = res.teks();
  } catch {
    teksTubuh = '';
  }
  map.set('tubuh', buatTeks(teksTubuh));

  // Helper json
  const fnJson: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'json',
    eksekusi: () => {
      try {
        const parsed = res.json();
        return konversiKeNilaiRuntime(parsed);
      } catch (err: any) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          `Gagal mengurai respon JSON: ${err.message}`
        );
      }
    },
  };
  map.set('json', fnJson);

  return buatPeta(map) as NilaiPeta;
}

/**
 * Bungkus instance KlienHTTP ke dalam objek Peta NUSANTARA
 */
export function bungkusKlienHTTP(klien: KlienHTTP): NilaiPeta {
  const map = new Map<string, NilaiRuntime>();
  (map as any).__klien = klien;

  const buatMetodeRequest = (metode: MetodeHTTP, namaFungsi: string): NilaiFungsiBawaan => ({
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: namaFungsi,
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi '${namaFungsi}' membutuhkan URL tujuan.`
        );
      }
      const url = String(konversiDariNilaiRuntime(args[0]));
      let opsiReq: OpsiRequestHTTP = { url, metode };

      if (args.length > 1) {
        if (metode === 'GET' || metode === 'HEAD' || metode === 'DELETE') {
          const opsiEkstra = konversiDariNilaiRuntime(args[1]) || {};
          opsiReq = { ...opsiReq, ...opsiEkstra, url, metode };
        } else {
          // POST, PUT, PATCH
          const data = konversiDariNilaiRuntime(args[1]);
          opsiReq.tubuh = data;
          if (args.length > 2) {
            const opsiEkstra = konversiDariNilaiRuntime(args[2]) || {};
            opsiReq = { ...opsiReq, ...opsiEkstra, url, metode, tubuh: data };
          }
        }
      }

      // Jalankan request
      // Karena runtime Nusantara synchronous, kita siapkan synchronous container atau mock
      const promise = klien.minta(opsiReq);
      // Diuji secara langsung atau dieksekusi via handler
      const hasilMap = new Map<string, NilaiRuntime>();
      hasilMap.set('url', buatTeks(url));
      hasilMap.set('metode', buatTeks(metode));
      (hasilMap as any).__promise = promise;

      // Berikan helper tunggu / periksa respon jika ada
      return buatPeta(hasilMap);
    },
  });

  map.set('get', buatMetodeRequest('GET', 'get'));
  map.set('ambil', buatMetodeRequest('GET', 'ambil'));
  map.set('post', buatMetodeRequest('POST', 'post'));
  map.set('kirim', buatMetodeRequest('POST', 'kirim'));
  map.set('put', buatMetodeRequest('PUT', 'put'));
  map.set('patch', buatMetodeRequest('PATCH', 'patch'));
  map.set('hapus', buatMetodeRequest('DELETE', 'hapus'));
  map.set('delete', buatMetodeRequest('DELETE', 'delete'));
  map.set('head', buatMetodeRequest('HEAD', 'head'));

  // cookieJar accessor
  const fnDapatkanCookie: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanCookie',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'dapatkanCookie' membutuhkan URL."
        );
      }
      const url = String(konversiDariNilaiRuntime(args[0]));
      const str = klien.dapatkanCookieJar().dapatkanCookieString(url);
      return buatTeks(str);
    },
  };
  map.set('dapatkanCookie', fnDapatkanCookie);

  return buatPeta(map) as NilaiPeta;
}

/**
 * Pabrik Ekspor Modul `http`
 */
export function buatEksporHTTP(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();
  const klienDefault = new KlienHTTP();

  // http.buatKlien(opsi?)
  ekspor.set('buatKlien', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatKlien',
    eksekusi: (args: NilaiRuntime[]) => {
      const opsi = args.length > 0 ? konversiDariNilaiRuntime(args[0]) : {};
      const klien = new KlienHTTP(opsi);
      return bungkusKlienHTTP(klien);
    },
  });

  // http.ambil / http.get
  ekspor.set('ambil', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambil',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          "Fungsi 'http.ambil' membutuhkan URL."
        );
      }
      const url = String(konversiDariNilaiRuntime(args[0]));
      const opsi = args.length > 1 ? konversiDariNilaiRuntime(args[1]) : {};
      const promise = klienDefault.get(url, opsi);
      const hasilMap = new Map<string, NilaiRuntime>([
        ['url', buatTeks(url)],
        ['metode', buatTeks('GET')],
      ]);
      (hasilMap as any).__promise = promise;
      return buatPeta(hasilMap);
    },
  });
  ekspor.set('get', ekspor.get('ambil')!);

  // http.kirim / http.post
  ekspor.set('kirim', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'kirim',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          "Fungsi 'http.kirim' membutuhkan URL."
        );
      }
      const url = String(konversiDariNilaiRuntime(args[0]));
      const data = args.length > 1 ? konversiDariNilaiRuntime(args[1]) : null;
      const opsi = args.length > 2 ? konversiDariNilaiRuntime(args[2]) : {};
      const promise = klienDefault.post(url, data, opsi);
      const hasilMap = new Map<string, NilaiRuntime>([
        ['url', buatTeks(url)],
        ['metode', buatTeks('POST')],
      ]);
      (hasilMap as any).__promise = promise;
      return buatPeta(hasilMap);
    },
  });
  ekspor.set('post', ekspor.get('kirim')!);

  // http.buatKlienAPI(opsi)
  ekspor.set('buatKlienAPI', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatKlienAPI',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          "Fungsi 'http.buatKlienAPI' membutuhkan opsi konfigurasi API."
        );
      }
      const opsi = konversiDariNilaiRuntime(args[0]) || {};
      const api = new KlienAPI(opsi);
      const map = new Map<string, NilaiRuntime>();
      (map as any).__api = api;
      map.set('baseUrl', buatTeks(opsi.baseUrl || ''));
      return buatPeta(map);
    },
  });

  // http.buatPengunduh(opsi?)
  ekspor.set('buatPengunduh', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatPengunduh',
    eksekusi: (args: NilaiRuntime[]) => {
      const opsi = args.length > 0 ? konversiDariNilaiRuntime(args[0]) : {};
      const pengunduh = new PengunduhBerkas(klienDefault, opsi);
      const map = new Map<string, NilaiRuntime>();
      (map as any).__pengunduh = pengunduh;
      return buatPeta(map);
    },
  });

  // http.buatPengunggah(opsi?)
  ekspor.set('buatPengunggah', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatPengunggah',
    eksekusi: (args: NilaiRuntime[]) => {
      const opsi = args.length > 0 ? konversiDariNilaiRuntime(args[0]) : {};
      const pengunggah = new PengunggahBerkas(klienDefault, opsi);
      const map = new Map<string, NilaiRuntime>();
      (map as any).__pengunggah = pengunggah;
      return buatPeta(map);
    },
  });

  // http.buatPengelolaWebhook(opsi)
  ekspor.set('buatPengelolaWebhook', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatPengelolaWebhook',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          "Fungsi 'buatPengelolaWebhook' membutuhkan opsi konfigurasi."
        );
      }
      const opsi = konversiDariNilaiRuntime(args[0]) || {};
      const wh = new PengelolaWebhook(opsi);
      const map = new Map<string, NilaiRuntime>();
      (map as any).__webhook = wh;
      return buatPeta(map);
    },
  });

  // http.verifikasiWebhook(kunciRahasia, payload, tandaTangan, opsi?)
  ekspor.set('verifikasiWebhook', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'verifikasiWebhook',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 3) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          "Fungsi 'verifikasiWebhook' membutuhkan 3 argumen: rahasia, payload, dan tandaTangan."
        );
      }
      const rahasia = String(konversiDariNilaiRuntime(args[0]));
      const payload = String(konversiDariNilaiRuntime(args[1]));
      const tandaTangan = String(konversiDariNilaiRuntime(args[2]));
      const opsi = args.length > 3 ? konversiDariNilaiRuntime(args[3]) : {};

      const wh = new PengelolaWebhook({ kunciRahasia: rahasia, ...opsi });
      const hasil = wh.verifikasiTandaTangan(payload, tandaTangan, opsi.timestamp);
      return buatLogika(hasil);
    },
  });

  // http.buatAdaptorLayanan(konfigurasi)
  ekspor.set('buatAdaptorLayanan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatAdaptorLayanan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          "Fungsi 'buatAdaptorLayanan' membutuhkan konfigurasi."
        );
      }
      const cfg = konversiDariNilaiRuntime(args[0]) || {};
      const adaptor = new AdaptorLayananEksternal(cfg, klienDefault);
      const map = new Map<string, NilaiRuntime>();
      (map as any).__adaptor = adaptor;
      map.set('namaLayanan', buatTeks(cfg.namaLayanan || 'LayananEksternal'));
      return buatPeta(map);
    },
  });

  return ekspor;
}
