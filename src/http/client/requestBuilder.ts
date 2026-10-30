/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Pembangun Permintaan HTTP Berantai (Request Builder)
 */

import { KlienHTTP } from './httpClient';
import { ResponHTTP } from './response';
import {
  MetodeHTTP,
  OpsiPermintaanHTTP,
  KonfigurasiOtentikasi,
  BagianMultipart,
  KebijakanRetryHTTP,
  NilaiHeader,
} from '../types';

export class PembangunRequest<T = any> {
  private urlSasaran: string;
  private opsi: OpsiPermintaanHTTP = {
    metode: 'GET',
    headers: {},
    kueri: {},
  };

  constructor(
    private readonly klien: KlienHTTP,
    url: string = ''
  ) {
    this.urlSasaran = url;
  }

  public metode(m: MetodeHTTP): this {
    this.opsi.metode = m;
    return this;
  }

  public url(u: string): this {
    this.urlSasaran = u;
    return this;
  }

  public ke(u: string): this {
    this.urlSasaran = u;
    return this;
  }

  public header(nama: string, nilai: NilaiHeader | NilaiHeader[]): this {
    if (!this.opsi.headers) this.opsi.headers = {};
    if (Array.isArray(this.opsi.headers)) {
      this.opsi.headers.push([nama, Array.isArray(nilai) ? nilai[0] : nilai]);
    } else {
      this.opsi.headers[nama] = nilai;
    }
    return this;
  }

  public kueri(nama: string, nilai: string | number | boolean): this {
    if (!this.opsi.kueri) this.opsi.kueri = {};
    this.opsi.kueri[nama] = nilai;
    return this;
  }

  public query(nama: string, nilai: string | number | boolean): this {
    return this.kueri(nama, nilai);
  }

  public kueriBanyak(params: Record<string, any>): this {
    if (!this.opsi.kueri) this.opsi.kueri = {};
    Object.assign(this.opsi.kueri, params);
    return this;
  }

  public json(data: any): this {
    this.opsi.body = data;
    this.opsi.tipeBody = 'json';
    return this;
  }

  public form(data: Record<string, any>): this {
    this.opsi.body = data;
    this.opsi.tipeBody = 'form';
    return this;
  }

  public multipart(bagian: BagianMultipart[] | Record<string, any>): this {
    this.opsi.body = bagian;
    this.opsi.tipeBody = 'multipart';
    return this;
  }

  public teks(data: string): this {
    this.opsi.body = data;
    this.opsi.tipeBody = 'teks';
    return this;
  }

  public biner(data: Buffer): this {
    this.opsi.body = data;
    this.opsi.tipeBody = 'biner';
    return this;
  }

  public timeout(ms: number): this {
    this.opsi.timeoutMs = ms;
    return this;
  }

  public ikutiPengalihan(ikuti: boolean, maks?: number): this {
    this.opsi.ikutiPengalihan = ikuti;
    if (maks !== undefined) this.opsi.maksimalPengalihan = maks;
    return this;
  }

  public abaikanTLS(abaikan: boolean = true): this {
    this.opsi.abaikanTLS = abaikan;
    return this;
  }

  public otentikasi(auth: KonfigurasiOtentikasi): this {
    this.opsi.otentikasi = auth;
    return this;
  }

  public basicAuth(namaPengguna: string, kataSandi: string): this {
    return this.otentikasi({ tipe: 'basic', namaPengguna, kataSandi });
  }

  public bearerToken(token: string): this {
    return this.otentikasi({ tipe: 'bearer', token });
  }

  public apiKey(kunci: string, lokasi: 'header' | 'kueri' = 'header', namaParam?: string): this {
    return this.otentikasi({ tipe: 'apiKey', kunci, lokasi, namaParam });
  }

  public retry(kebijakan: KebijakanRetryHTTP): this {
    this.opsi.kebijakanRetry = kebijakan;
    return this;
  }

  public async kirim(): Promise<ResponHTTP<T>> {
    return this.klien.kirim<T>(this.urlSasaran, this.opsi);
  }
}
