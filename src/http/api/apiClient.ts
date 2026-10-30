/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Abstraksi Klien API Tingkat Tinggi (KlienAPI & Paginasi)
 */

import { KlienHTTP } from '../client/httpClient';
import { ResponHTTP } from '../client/response';
import {
  KonfigurasiKlienAPI,
  KonfigurasiPaginasi,
  OpsiPermintaanHTTP,
} from '../types';
import { GalatStatusHTTP } from '../errors/httpError';

export class KlienAPI {
  public readonly baseUrl: string;
  private readonly http: KlienHTTP;
  public readonly konfigurasi: KonfigurasiKlienAPI;

  constructor(konfigurasi: KonfigurasiKlienAPI) {
    if (!konfigurasi || !konfigurasi.baseUrl) {
      throw new Error("Base URL wajib ditentukan untuk KlienAPI.");
    }
    this.baseUrl = konfigurasi.baseUrl.replace(/\/+$/, '');
    this.konfigurasi = konfigurasi;
    this.http = new KlienHTTP({
      baseUrl: this.baseUrl,
      defaultHeaders: konfigurasi.headersBawaan,
      defaultTimeout: konfigurasi.timeoutBawaanMs,
      retryPolicy: konfigurasi.kebijakanRetry,
    });
  }

  public async get<T = any>(endpoint: string, kueri?: Record<string, any>): Promise<T> {
    const respon = await this.http.get<T>(endpoint, {
      kueri,
      otentikasi: this.konfigurasi.otentikasi,
      abaikanTLS: this.konfigurasi.abaikanTLS,
    });
    return this.tanganiRespon<T>(respon);
  }

  public async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const respon = await this.http.post<T>(endpoint, data, {
      tipeBody: 'json',
      otentikasi: this.konfigurasi.otentikasi,
      abaikanTLS: this.konfigurasi.abaikanTLS,
    });
    return this.tanganiRespon<T>(respon);
  }

  public async put<T = any>(endpoint: string, data?: any): Promise<T> {
    const respon = await this.http.put<T>(endpoint, data, {
      tipeBody: 'json',
      otentikasi: this.konfigurasi.otentikasi,
      abaikanTLS: this.konfigurasi.abaikanTLS,
    });
    return this.tanganiRespon<T>(respon);
  }

  public async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    const respon = await this.http.patch<T>(endpoint, data, {
      tipeBody: 'json',
      otentikasi: this.konfigurasi.otentikasi,
      abaikanTLS: this.konfigurasi.abaikanTLS,
    });
    return this.tanganiRespon<T>(respon);
  }

  public async delete<T = any>(endpoint: string): Promise<T> {
    const respon = await this.http.delete<T>(endpoint, {
      otentikasi: this.konfigurasi.otentikasi,
      abaikanTLS: this.konfigurasi.abaikanTLS,
    });
    return this.tanganiRespon<T>(respon);
  }

  public async dapatkan<T = any>(endpoint: string, kueri?: Record<string, any>): Promise<T> {
    return this.get<T>(endpoint, kueri);
  }

  public async buat<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.post<T>(endpoint, data);
  }

  public async perbarui<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.put<T>(endpoint, data);
  }

  public async tambal<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.patch<T>(endpoint, data);
  }

  public async hapus<T = any>(endpoint: string): Promise<T> {
    return this.delete<T>(endpoint);
  }

  public dapatkanKlienHTTP(): KlienHTTP {
    return this.http;
  }

  public async *iterasiPaginasi<T = any>(
    endpoint: string,
    opsiPaginasi?: any,
    kueriAwal?: Record<string, any>
  ): AsyncGenerator<T[], void, unknown> {
    const namaKunciHalaman = opsiPaginasi?.namaKunciHalaman || opsiPaginasi?.namaParamHalaman || 'page';
    const namaKunciBatas = opsiPaginasi?.namaKunciBatas || opsiPaginasi?.namaParamBatas || 'limit';
    const batas = (kueriAwal && kueriAwal[namaKunciBatas]) || opsiPaginasi?.batasPerHalaman || 20;

    let halaman = 1;
    let selesai = false;

    while (!selesai && halaman <= (opsiPaginasi?.maksimalHalaman || 100)) {
      const kueri: Record<string, any> = { ...(kueriAwal || {}) };
      kueri[namaKunciHalaman] = halaman;
      kueri[namaKunciBatas] = batas;

      const hasilRespon = await this.get<any>(endpoint, kueri);
      if (!hasilRespon) break;

      let itemHalaman: any[] = [];
      if (opsiPaginasi?.ekstraksiData) {
        itemHalaman = opsiPaginasi.ekstraksiData(hasilRespon) || [];
      } else if (Array.isArray(hasilRespon)) {
        itemHalaman = hasilRespon;
      } else if (Array.isArray(hasilRespon.items)) {
        itemHalaman = hasilRespon.items;
      } else if (Array.isArray(hasilRespon.data)) {
        itemHalaman = hasilRespon.data;
      }

      if (itemHalaman.length > 0) {
        yield itemHalaman;
      }

      if (opsiPaginasi?.ekstraksiApakahHabis) {
        selesai = opsiPaginasi.ekstraksiApakahHabis(hasilRespon);
      } else if (itemHalaman.length < batas || itemHalaman.length === 0) {
        selesai = true;
      }

      halaman++;
    }
  }

  /**
   * Mengambil seluruh data bertahap melalui pagination otomatis (page, offset, atau cursor).
   */
  public async ambilSemuaHalaman<T = any>(
    endpoint: string,
    opsiPaginasi?: Partial<KonfigurasiPaginasi>,
    kueriAwal?: Record<string, any>
  ): Promise<T[]> {
    const cfg: KonfigurasiPaginasi = {
      tipe: opsiPaginasi?.tipe ?? this.konfigurasi.paginasiBawaan?.tipe ?? 'halaman',
      namaParamHalaman: opsiPaginasi?.namaParamHalaman ?? 'page',
      namaParamBatas: opsiPaginasi?.namaParamBatas ?? 'limit',
      namaParamOffset: opsiPaginasi?.namaParamOffset ?? 'offset',
      namaParamKursor: opsiPaginasi?.namaParamKursor ?? 'cursor',
      batasPerHalaman: opsiPaginasi?.batasPerHalaman ?? 20,
      maksimalHalaman: opsiPaginasi?.maksimalHalaman ?? 50,
      ekstrakKursor: opsiPaginasi?.ekstrakKursor,
      ekstrakData: opsiPaginasi?.ekstrakData,
    };

    const semuaData: T[] = [];
    let halamanSaatIni = 1;
    let offsetSaatIni = 0;
    let kursorBerikutnya: string | undefined = undefined;

    while (halamanSaatIni <= cfg.maksimalHalaman!) {
      const kueri: Record<string, any> = { ...(kueriAwal || {}) };

      if (cfg.tipe === 'halaman') {
        kueri[cfg.namaParamHalaman!] = halamanSaatIni;
        kueri[cfg.namaParamBatas!] = cfg.batasPerHalaman!;
      } else if (cfg.tipe === 'offset') {
        kueri[cfg.namaParamOffset!] = offsetSaatIni;
        kueri[cfg.namaParamBatas!] = cfg.batasPerHalaman!;
      } else if (cfg.tipe === 'kursor') {
        if (kursorBerikutnya) {
          kueri[cfg.namaParamKursor!] = kursorBerikutnya;
        }
        kueri[cfg.namaParamBatas!] = cfg.batasPerHalaman!;
      }

      const hasilRespon = await this.get<any>(endpoint, kueri);
      if (!hasilRespon) break;

      // Ekstrak data array
      let itemHalaman: any[] = [];
      if (cfg.ekstrakData) {
        itemHalaman = cfg.ekstrakData(hasilRespon) || [];
      } else if (Array.isArray(hasilRespon)) {
        itemHalaman = hasilRespon;
      } else if (Array.isArray(hasilRespon.data)) {
        itemHalaman = hasilRespon.data;
      } else if (Array.isArray(hasilRespon.items)) {
        itemHalaman = hasilRespon.items;
      } else if (Array.isArray(hasilRespon.results)) {
        itemHalaman = hasilRespon.results;
      }

      if (itemHalaman.length === 0) {
        break; // Halaman kosong, pagination selesai
      }

      semuaData.push(...itemHalaman);

      // Pembaruan penunjuk pagination
      if (cfg.tipe === 'halaman') {
        halamanSaatIni++;
      } else if (cfg.tipe === 'offset') {
        offsetSaatIni += itemHalaman.length;
      } else if (cfg.tipe === 'kursor') {
        if (cfg.ekstrakKursor) {
          kursorBerikutnya = cfg.ekstrakKursor(hasilRespon);
        } else {
          kursorBerikutnya = hasilRespon.next_cursor || hasilRespon.kursor_berikutnya;
        }
        if (!kursorBerikutnya) break;
      }

      // Jika data yang diterima kurang dari batas per halaman, biasanya halaman terakhir
      if (itemHalaman.length < cfg.batasPerHalaman!) {
        break;
      }
    }

    return semuaData;
  }

  private tanganiRespon<T>(respon: ResponHTTP<T>): T {
    if (!respon.apakahSukses) {
      throw new GalatStatusHTTP(
        respon.status,
        respon.statusTeks,
        respon.teks(),
        respon.urlAkhir
      );
    }

    const contentType = respon.dapatkanTipeKonten() || '';
    if (contentType.includes('application/json')) {
      return respon.json<T>();
    }
    return respon.teks() as any;
  }
}
