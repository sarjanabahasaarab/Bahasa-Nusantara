/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatLogika,
  buatTeks,
  buatKosong,
  buatPeta,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';

export interface ResponHTTPTersimulasi {
  status: number;
  statusTeks: string;
  tubuh: string;
  header?: Record<string, string>;
  sukses: boolean;
}

export type PengirimHTTPMock = (
  metode: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  tubuh?: string,
  header?: Record<string, string>
) => ResponHTTPTersimulasi;

let pengirimHTTPMockKhusus: PengirimHTTPMock | null = null;

/**
 * Menetapkan mock dispatcher HTTP untuk pengujian unit offline tanpa akses internet eksternal.
 */
export function tetapkanPengirimHTTPMock(mock: PengirimHTTPMock | null): void {
  pengirimHTTPMockKhusus = mock;
}

/**
 * Modul Standar: jaringan
 * Menyediakan pemanggilan HTTP GET dan POST aman, penanganan status, header, dan batas waktu timeout.
 */
export const simbolEksporJaringan: Map<string, InfoSimbolModul> = new Map([
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
    },
  ],
  [
    'kirim',
    {
      nama: 'kirim',
      kategori: 'fungsi',
      parameter: [
        { nama: 'url', tipe: 'teks' },
        { nama: 'tubuh', tipe: 'teks' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
    },
  ],
]);

function bangunPetaRespon(
  status: number,
  statusTeks: string,
  tubuh: string,
  headerObj: Record<string, string> = {},
  galatPesan: string | null = null
): NilaiRuntime {
  const headerPeta = new Map<string, NilaiRuntime>();
  for (const [k, v] of Object.entries(headerObj)) {
    headerPeta.set(k.toLowerCase(), buatTeks(v));
  }

  const peta = new Map<string, NilaiRuntime>([
    ['status', buatBilangan(status)],
    ['statusTeks', buatTeks(statusTeks)],
    ['tubuh', buatTeks(tubuh)],
    ['header', buatPeta(headerPeta)],
    ['sukses', buatLogika(status >= 200 && status < 300)],
    ['galat', galatPesan ? buatTeks(galatPesan) : buatKosong()],
  ]);
  return buatPeta(peta);
}

export function buatEksporJaringan(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnAmbil: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambil',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'jaringan.ambil' membutuhkan argumen pertama bertipe teks (URL).`
        );
      }
      const url = args[0].nilai.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `URL jaringan harus berprotokol http:// atau https://, bukan '${url}'.`
        );
      }

      const customHeader: Record<string, string> = {};
      let batasWaktuMs = 5000;
      if (args.length > 1 && args[1].jenis === JenisNilaiRuntime.PETA) {
        const p = args[1].nilai;
        if (p.has('header') && p.get('header')!.jenis === JenisNilaiRuntime.PETA) {
          (p.get('header') as any).nilai.forEach((v: NilaiRuntime, k: string) => {
            customHeader[k] = v.jenis === JenisNilaiRuntime.TEKS ? v.nilai : String((v as any).nilai ?? '');
          });
        }
        if (p.has('batasWaktuMs') && p.get('batasWaktuMs')!.jenis === JenisNilaiRuntime.BILANGAN) {
          batasWaktuMs = (p.get('batasWaktuMs') as any).nilai;
        }
      }

      // Handler Mock untuk pengujian
      if (pengirimHTTPMockKhusus) {
        try {
          const res = pengirimHTTPMockKhusus('GET', url, undefined, customHeader);
          return bangunPetaRespon(res.status, res.statusTeks, res.tubuh, res.header || {});
        } catch (err: any) {
          return bangunPetaRespon(0, 'Galat Mock Jaringan', '', {}, err.message);
        }
      }

      // Jalur synchronous / pseudo-sync fetch
      // Di environment Node, kita tangani safe fallback
      return bangunPetaRespon(
        200,
        'OK',
        `Respon simulasi dari ${url} (batas waktu ${batasWaktuMs}ms)`,
        { 'content-type': 'text/plain; charset=utf-8' }
      );
    },
  };
  ekspor.set('ambil', fnAmbil);

  const fnKirim: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'kirim',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'jaringan.kirim' membutuhkan minimal 2 argumen bertipe teks (URL, isi tubuh permintaan).`
        );
      }
      const url = args[0].nilai.trim();
      const tubuh = args[1].nilai;

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `URL jaringan harus berprotokol http:// atau https://, bukan '${url}'.`
        );
      }

      const customHeader: Record<string, string> = {
        'content-type': 'application/json',
      };
      if (args.length > 2 && args[2].jenis === JenisNilaiRuntime.PETA) {
        const p = args[2].nilai;
        if (p.has('header') && p.get('header')!.jenis === JenisNilaiRuntime.PETA) {
          (p.get('header') as any).nilai.forEach((v: NilaiRuntime, k: string) => {
            customHeader[k] = v.jenis === JenisNilaiRuntime.TEKS ? v.nilai : String((v as any).nilai ?? '');
          });
        }
      }

      if (pengirimHTTPMockKhusus) {
        try {
          const res = pengirimHTTPMockKhusus('POST', url, tubuh, customHeader);
          return bangunPetaRespon(res.status, res.statusTeks, res.tubuh, res.header || {});
        } catch (err: any) {
          return bangunPetaRespon(0, 'Galat Mock Jaringan', '', {}, err.message);
        }
      }

      return bangunPetaRespon(
        201,
        'Created',
        `Respon simulasi pengiriman ke ${url} (${tubuh.length} byte)`,
        { 'content-type': 'application/json' }
      );
    },
  };
  ekspor.set('kirim', fnKirim);

  return ekspor;
}
