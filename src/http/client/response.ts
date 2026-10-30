/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Representasi Tanggapan HTTP Resmi (ResponHTTP)
 */

import { InfoPengalihan, ResponHTTPInterface } from '../types';
import { PetaHeader } from '../headers/headerMap';
import { GalatSerialisasiHTTP } from '../errors/httpError';

export class ResponHTTP<T = any> implements ResponHTTPInterface<T> {
  public readonly status: number;
  public readonly statusTeks: string;
  public readonly headers: Map<string, string>;
  public readonly petaHeader: PetaHeader;
  public readonly urlAkhir: string;
  public readonly durasiMs: number;
  public readonly pengalihan: InfoPengalihan[];
  private readonly rawBuffer: Buffer;

  constructor(opsi: {
    status: number;
    statusTeks: string;
    headers: PetaHeader;
    buffer: Buffer;
    urlAkhir: string;
    durasiMs: number;
    pengalihan?: InfoPengalihan[];
  }) {
    this.status = opsi.status;
    this.statusTeks = opsi.statusTeks;
    this.petaHeader = opsi.headers;
    this.headers = opsi.headers.keMap();
    this.rawBuffer = opsi.buffer;
    this.urlAkhir = opsi.urlAkhir;
    this.durasiMs = opsi.durasiMs;
    this.pengalihan = opsi.pengalihan || [];
  }

  public get apakahSukses(): boolean {
    return this.status >= 200 && this.status < 300;
  }

  public get berhasil(): boolean {
    return this.apakahSukses;
  }

  public get header(): PetaHeader {
    return this.petaHeader;
  }

  public get urlTerakhir(): string {
    return this.urlAkhir;
  }

  public get apakahRedirect(): boolean {
    return this.status >= 300 && this.status < 400;
  }

  public get apakahGalatKlien(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  public get apakahGalatServer(): boolean {
    return this.status >= 500 && this.status < 600;
  }

  public teks(): string {
    return this.rawBuffer.toString('utf-8');
  }

  public json<R = T>(): R {
    const teks = this.teks();
    if (!teks.trim()) {
      return null as any;
    }
    try {
      return JSON.parse(teks) as R;
    } catch (err: any) {
      throw new GalatSerialisasiHTTP(
        `Gagal mengurai respons JSON: ${err.message}. Respons mentah: ${teks.slice(0, 100)}`,
        err
      );
    }
  }

  public buffer(): Buffer {
    return Buffer.from(this.rawBuffer);
  }

  public dapatkanHeader(nama: string): string | undefined {
    return this.petaHeader.ambil(nama);
  }

  public dapatkanTipeKonten(): string | undefined {
    return this.petaHeader.ambil('content-type');
  }

  public dapatkanPanjangKonten(): number | undefined {
    const val = this.petaHeader.ambil('content-length');
    if (val) {
      const n = parseInt(val, 10);
      return isNaN(n) ? undefined : n;
    }
    return this.rawBuffer.length;
  }
}
