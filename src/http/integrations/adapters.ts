/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Adaptor Layanan Eksternal (External Service Adapters)
 */

import { AdaptorLayananEksternalInterface as IAdaptorLayananEksternal } from '../types';
import { KlienHTTP } from '../client/httpClient';

export interface KonfigurasiAdaptorLayanan {
  nama?: string;
  deskripsi?: string;
  apiKey?: string;
  baseUrl?: string;
  hostApi?: string;
  modeUji?: boolean;
  [key: string]: any;
}

/**
 * Kelas Dasar / Generik Adaptor Layanan Eksternal.
 */
export class AdaptorLayananEksternal implements IAdaptorLayananEksternal {
  public readonly nama: string;
  public readonly deskripsi: string;
  public terkonfigurasi: boolean;
  protected readonly hostApi: string;
  protected readonly modeUji: boolean;

  constructor(
    konfigurasi: KonfigurasiAdaptorLayanan = {},
    protected readonly klienHttp?: KlienHTTP
  ) {
    this.nama = konfigurasi.nama || 'layanan_eksternal';
    this.deskripsi = konfigurasi.deskripsi || 'Adaptor Layanan Eksternal Generik';
    this.hostApi = konfigurasi.baseUrl || konfigurasi.hostApi || 'https://api.nusantara.lang';
    this.modeUji = konfigurasi.modeUji ?? true;
    this.terkonfigurasi = true;
  }

  public async periksaKoneksi(): Promise<boolean> {
    return true;
  }

  public async eksekusi(aksi: string, parameter: Record<string, any>): Promise<any> {
    return {
      layanan: this.nama,
      aksi,
      parameter,
      sukses: true,
      waktu: new Date().toISOString(),
    };
  }
}

/**
 * Adaptor layanan pengiriman email eksternal (misal: Resend / SendGrid / SMTP HTTP API).
 */
export class AdaptorLayananEmail extends AdaptorLayananEksternal {
  public override readonly nama = 'layanan_email';
  public override readonly deskripsi = 'Adaptor Pengiriman Email Transaksional & Notifikasi';
  private readonly apiKey?: string;

  constructor(
    arg0?: string | KonfigurasiAdaptorLayanan,
    hostApiOrKlien?: string | KlienHTTP,
    modeUji?: boolean,
    klienHttp?: KlienHTTP
  ) {
    const isObj = typeof arg0 === 'object' && arg0 !== null;
    const cfg: KonfigurasiAdaptorLayanan = isObj
      ? (arg0 as KonfigurasiAdaptorLayanan)
      : { hostApi: typeof hostApiOrKlien === 'string' ? hostApiOrKlien : undefined, modeUji };
    const client = isObj ? (hostApiOrKlien as KlienHTTP) : klienHttp;
    super(cfg, client);
    this.apiKey = isObj ? (arg0 as KonfigurasiAdaptorLayanan).apiKey : (arg0 as string | undefined);
  }

  public override async periksaKoneksi(): Promise<boolean> {
    if (this.modeUji) return true;
    try {
      const client = this.klienHttp || new KlienHTTP();
      const res = await client.get(`${this.hostApi}/health`, { timeoutMs: 3000 });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  public override async eksekusi(aksi: string, parameter: Record<string, any>): Promise<any> {
    if (aksi === 'kirim_email') {
      const { tujuan, subjek, pesan } = parameter;
      if (!tujuan || !subjek || !pesan) {
        throw new Error("Parameter 'tujuan', 'subjek', dan 'pesan' wajib diisi untuk kirim_email.");
      }

      if (this.modeUji) {
        return {
          sukses: true,
          idPengiriman: `mock-email-${Date.now()}`,
          tujuan,
          stempelWaktu: new Date().toISOString(),
          mode: 'simulasi',
        };
      }

      const client = this.klienHttp || new KlienHTTP();
      const res = await client.post(
        `${this.hostApi}/v1/send`,
        { to: tujuan, subject: subjek, text: pesan },
        {
          headers: { Authorization: `Bearer ${this.apiKey || ''}` },
        }
      );
      return res.json();
    }

    throw new Error(`Aksi '${aksi}' tidak didukung oleh ${this.nama}.`);
  }
}

/**
 * Adaptor layanan pemantauan cuaca eksternal.
 */
export class AdaptorLayananCuaca extends AdaptorLayananEksternal {
  public override readonly nama = 'layanan_cuaca';
  public override readonly deskripsi = 'Adaptor Informasi Cuaca Publik';
  private readonly apiKey?: string;

  constructor(
    arg0?: string | KonfigurasiAdaptorLayanan,
    hostApiOrKlien?: string | KlienHTTP,
    modeUji?: boolean,
    klienHttp?: KlienHTTP
  ) {
    const isObj = typeof arg0 === 'object' && arg0 !== null;
    const cfg: KonfigurasiAdaptorLayanan = isObj
      ? (arg0 as KonfigurasiAdaptorLayanan)
      : { hostApi: typeof hostApiOrKlien === 'string' ? hostApiOrKlien : undefined, modeUji };
    const client = isObj ? (hostApiOrKlien as KlienHTTP) : klienHttp;
    super(cfg, client);
    this.apiKey = isObj ? (arg0 as KonfigurasiAdaptorLayanan).apiKey : (arg0 as string | undefined);
  }

  public override async periksaKoneksi(): Promise<boolean> {
    return true;
  }

  public override async eksekusi(aksi: string, parameter: Record<string, any>): Promise<any> {
    if (aksi === 'ambil_cuaca') {
      const kota = parameter.kota || 'Jakarta';

      if (this.modeUji) {
        return {
          kota,
          suhuCelsius: 29.5,
          kondisi: 'Cerah Berawan',
          kelembapan: 75,
          sumber: 'simulasi_offline',
        };
      }

      const client = this.klienHttp || new KlienHTTP();
      const res = await client.get(`${this.hostApi}/weather`, {
        kueri: { q: kota, key: this.apiKey || '' },
      });
      return res.json();
    }

    throw new Error(`Aksi '${aksi}' tidak didukung oleh ${this.nama}.`);
  }
}

/**
 * Pembantu integrasi tugas latar belakang (Background Tasks - Phase 34).
 */
export function buatTugasHTTP(nama: string, opsi: Record<string, any>): { id: string; nama: string; payload: Record<string, any> } {
  return {
    id: `tugas-http-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    nama,
    payload: opsi,
  };
}
