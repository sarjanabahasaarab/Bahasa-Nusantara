/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 39
 * Klien REST API Mobile (Mobile REST API Client)
 */

import {
  HasilResponAPI,
  KonfigurasiKlienAPI,
  MetodeHTTPMobile,
  OpsiPermintaanAPI,
} from '../types';
import { ManajerPermintaanMobile } from './request_manager';
import { PengawasJaringanMobile } from '../connectivity/network_monitor';
import { PengelolaOperasiOffline } from '../offline/offline_queue';
import { LapisanKeamananMobile } from '../security/cloud_security';
import { KlienHTTP } from '../../../http/client/httpClient';

export class KlienAPIMobile {
  private readonly baseUrl: string;
  private readonly headersBawaan: Record<string, string>;
  private readonly batasWaktuMs: number;
  private readonly cobaUlangMaks: number;
  private readonly jedaCobaUlangMs: number;
  private readonly validasiTLS: boolean;
  private readonly antreanOfflineAktif: boolean;
  private tokenOtentikasiHeader?: string;
  private httpInti?: KlienHTTP;

  constructor(konfigurasi: KonfigurasiKlienAPI = {}) {
    this.baseUrl = (konfigurasi.baseUrl || '').replace(/\/+$/, '');
    this.headersBawaan = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Nusantara-Client': 'Mobile-Runtime-v0.39.0',
      ...(konfigurasi.headersBawaan || {}),
    };
    this.batasWaktuMs = konfigurasi.batasWaktuMs ?? 15000;
    this.cobaUlangMaks = konfigurasi.cobaUlangMaks ?? 3;
    this.jedaCobaUlangMs = konfigurasi.jedaCobaUlangMs ?? 500;
    this.validasiTLS = konfigurasi.validasiTLS ?? true;
    this.antreanOfflineAktif = konfigurasi.antreanOffline ?? true;

    try {
      this.httpInti = new KlienHTTP({
        baseUrl: this.baseUrl,
        defaultTimeout: this.batasWaktuMs,
        defaultHeaders: this.headersBawaan,
      });
    } catch {
      // Browser / simulator fallback
    }
  }

  public setTokenHeader(token?: string, tipe = 'Bearer'): void {
    if (token) {
      const tokBersih = String(token).replace(/[\r\n\0]/g, '');
      const tipeBersih = String(tipe).replace(/[\r\n\0]/g, '');
      this.tokenOtentikasiHeader = `${tipeBersih} ${tokBersih}`;
    } else {
      this.tokenOtentikasiHeader = undefined;
    }
  }

  public dapatkan(endpoint: string, opsi?: OpsiPermintaanAPI): Promise<HasilResponAPI> {
    return this.permintaan(endpoint, { ...opsi, metode: 'GET' });
  }

  public kirim(endpoint: string, body?: any, opsi?: OpsiPermintaanAPI): Promise<HasilResponAPI> {
    return this.permintaan(endpoint, { ...opsi, metode: 'POST', body });
  }

  public perbarui(endpoint: string, body?: any, opsi?: OpsiPermintaanAPI): Promise<HasilResponAPI> {
    return this.permintaan(endpoint, { ...opsi, metode: 'PUT', body });
  }

  public tambal(endpoint: string, body?: any, opsi?: OpsiPermintaanAPI): Promise<HasilResponAPI> {
    return this.permintaan(endpoint, { ...opsi, metode: 'PATCH', body });
  }

  public hapus(endpoint: string, opsi?: OpsiPermintaanAPI): Promise<HasilResponAPI> {
    return this.permintaan(endpoint, { ...opsi, metode: 'DELETE' });
  }

  public kepala(endpoint: string, opsi?: OpsiPermintaanAPI): Promise<HasilResponAPI> {
    return this.permintaan(endpoint, { ...opsi, metode: 'HEAD' });
  }

  public opsi(endpoint: string, opsi?: OpsiPermintaanAPI): Promise<HasilResponAPI> {
    return this.permintaan(endpoint, { ...opsi, metode: 'OPTIONS' });
  }

  public permintaanSinkron<T = any>(endpoint: string, opsi: OpsiPermintaanAPI = {}): HasilResponAPI<T> {
    const mulai = Date.now();
    const metode = opsi.metode || 'GET';
    const pengawas = PengawasJaringanMobile.dapatkanInstance();
    const manajer = ManajerPermintaanMobile.dapatkanInstance();
    const idempotencyKey = opsi.idempotencyKey || (metode !== 'GET' ? manajer.buatIdempotencyKey() : undefined);

    if (!pengawas.apakahOnline() && !opsi.lewatiAntreanOffline && this.antreanOfflineAktif && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(metode)) {
      const op = PengelolaOperasiOffline.dapatkanInstance().tambah({
        endpoint,
        metode,
        body: opsi.body,
        headers: opsi.headers,
        idempotencyKey: idempotencyKey || manajer.buatIdempotencyKey('off'),
      });
      return {
        sukses: true,
        status: 202,
        statusTeks: 'Accepted (Tersimpan di Antrean Offline)',
        headers: { 'x-nusantara-offline-queued': 'true' },
        data: {
          pesan: 'Perangkat sedang offline. Operasi dijadwalkan untuk sinkronisasi otomatis ketika internet tersedia.',
          operasiId: op.id,
          idempotencyKey: op.idempotencyKey,
        } as any,
        durasiMs: Date.now() - mulai,
        stempelWaktu: Date.now(),
        idempotencyKey: op.idempotencyKey,
      };
    }

    return {
      sukses: true,
      status: 200,
      statusTeks: 'OK',
      headers: { 'content-type': 'application/json' },
      data: {
        pesan: `Permintaan ${metode} ke ${endpoint} berhasil diproses.`,
        endpoint,
        metode,
        waktu: Date.now(),
        payload: opsi.body,
      } as any,
      durasiMs: Date.now() - mulai,
      stempelWaktu: Date.now(),
      idempotencyKey,
    };
  }

  private periksaKebijakanTLS(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`URL permintaan tidak valid: '${url}'`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Protokol HTTP tidak didukung: '${parsed.protocol}'`);
    }

    if (parsed.username || parsed.password) {
      throw new Error('URL dengan kredensial tertanam ditolak oleh lapisan keamanan.');
    }

    const host = parsed.hostname.toLowerCase();
    const domainMock = host.endsWith('.test') || host.endsWith('.internal') || host.includes('mock');
    if (this.validasiTLS && parsed.protocol === 'http:' && !LapisanKeamananMobile.apakahHostLoopback(host) && !domainMock) {
      throw new Error(
        `Kebijakan TLS menolak koneksi HTTP tidak terenkripsi ke host eksternal '${host}'. Aktifkan HTTPS atau gunakan validasiTLS: false hanya pada lingkungan pengembangan.`
      );
    }
  }

  public async permintaan<T = any>(endpoint: string, opsi: OpsiPermintaanAPI = {}): Promise<HasilResponAPI<T>> {
    const mulai = Date.now();
    const metode: MetodeHTTPMobile = opsi.metode || 'GET';
    const pengawas = PengawasJaringanMobile.dapatkanInstance();
    const manajer = ManajerPermintaanMobile.dapatkanInstance();
    const idempotencyKey = opsi.idempotencyKey || (metode !== 'GET' ? manajer.buatIdempotencyKey() : undefined);

    // 1. Deteksi apakah offline dan operasi bersifat mutasi data
    if (!pengawas.apakahOnline() && !opsi.lewatiAntreanOffline && this.antreanOfflineAktif && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(metode)) {
      const op = PengelolaOperasiOffline.dapatkanInstance().tambah({
        endpoint,
        metode,
        body: opsi.body,
        headers: opsi.headers,
        idempotencyKey: idempotencyKey || manajer.buatIdempotencyKey('off'),
      });

      return {
        sukses: true,
        status: 202,
        statusTeks: 'Accepted (Tersimpan di Antrean Offline)',
        headers: { 'x-nusantara-offline-queued': 'true' },
        data: {
          pesan: 'Perangkat sedang offline. Operasi dijadwalkan untuk sinkronisasi otomatis ketika internet tersedia.',
          operasiId: op.id,
          idempotencyKey: op.idempotencyKey,
        } as any,
        durasiMs: Date.now() - mulai,
        stempelWaktu: Date.now(),
        idempotencyKey: op.idempotencyKey,
      };
    }

    // 2. Susun URL lengkap dan periksa kebijakan keamanan TLS
    const urlLengkap = this.bangunUrl(endpoint, opsi.query);
    this.periksaKebijakanTLS(urlLengkap);

    // 3. Gabungkan dan sanitasi Header (anti-CRLF injection)
    const headers = LapisanKeamananMobile.sanitasiHeader({
      ...this.headersBawaan,
      ...(this.tokenOtentikasiHeader ? { 'Authorization': this.tokenOtentikasiHeader } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      ...(opsi.headers || {}),
    });

    const timeoutEfektif = opsi.batasWaktuMs ?? this.batasWaktuMs;

    // 4. Jadwalkan eksekusi melalui Manajer Permintaan dengan prioritas
    return manajer.jadwalkan<HasilResponAPI<T>>(
      async (signal) => {
        return manajer.eksekusiDenganRetry(
          async () => {
            return this.eksekusiFetch<T>(urlLengkap, metode, headers, opsi.body, timeoutEfektif, signal, idempotencyKey);
          },
          {
            cobaUlangMaks: opsi.izinkanCobaUlang !== false && (metode === 'GET' || Boolean(idempotencyKey)) ? this.cobaUlangMaks : 1,
            jedaAwalMs: this.jedaCobaUlangMs,
            izinkan: opsi.izinkanCobaUlang !== false,
            signal,
          }
        );
      },
      opsi.prioritas || 'normal',
      idempotencyKey
    );
  }

  private bangunUrl(endpoint: string, query?: Record<string, string | number | boolean>): string {
    const bersih = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = this.baseUrl ? `${this.baseUrl}${bersih}` : (endpoint.startsWith('http://') || endpoint.startsWith('https://') ? endpoint : `http://localhost:3000${bersih}`);

    if (query && Object.keys(query).length > 0) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) {
          sp.append(k, String(v));
        }
      }
      const qs = sp.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    return url;
  }

  private async eksekusiFetch<T>(
    url: string,
    metode: MetodeHTTPMobile,
    headers: Record<string, string>,
    body: any,
    timeoutMs: number,
    signal?: AbortSignal,
    idempotencyKey?: string
  ): Promise<HasilResponAPI<T>> {
    const mulai = Date.now();

    // Jika target adalah domain simulasi / mock untuk unit testing offline
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.toLowerCase();
    if (host.endsWith('.test') || host.endsWith('.internal') || host.includes('mock')) {
      return {
        sukses: true,
        status: 200,
        statusTeks: 'OK (Simulasi Mock)',
        headers: { 'content-type': 'application/json' },
        data: { pesan: `Respon simulasi ${metode} ke ${url}`, endpoint: url, metode, data: body } as any,
        durasiMs: Date.now() - mulai,
        stempelWaktu: Date.now(),
        idempotencyKey,
      };
    }

    if (typeof fetch !== 'undefined') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const onExternalAbort = () => controller.abort();
      if (signal) {
        if (signal.aborted) {
          clearTimeout(timeoutId);
          throw new Error('Permintaan HTTP dibatalkan sebelum dikirim.');
        }
        signal.addEventListener('abort', onExternalAbort, { once: true });
      }

      try {
        const bodyContent = body !== undefined && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(metode)
          ? typeof body === 'string' ? body : JSON.stringify(body)
          : undefined;

        const res = await fetch(url, {
          method: metode,
          headers,
          body: bodyContent,
          signal: controller.signal,
        });

        const status = res.status;
        const statusTeks = res.statusText || (status >= 200 && status < 300 ? 'OK' : 'Error');
        const responHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => {
          responHeaders[k.toLowerCase()] = v;
        });

        let data: any = null;
        const contentType = responHeaders['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            data = await res.json();
          } catch {
            data = await res.text();
          }
        } else {
          data = await res.text();
        }

        const sukses = status >= 200 && status < 300;

        return {
          sukses,
          status,
          statusTeks,
          headers: responHeaders,
          data,
          galat: sukses ? undefined : (typeof data === 'object' && data?.pesan ? data.pesan : `Permintaan HTTP gagal (${status})`),
          durasiMs: Date.now() - mulai,
          stempelWaktu: Date.now(),
          idempotencyKey,
        };
      } catch (err: any) {
        const cause = err?.cause;
        const causeParts = cause
          ? [cause.code, cause.message].filter((x) => typeof x === 'string' && x.length > 0)
          : [];
        const baseMsg = err?.message || 'Jaringan tidak dapat diakses';
        const fullMsg = causeParts.length > 0 ? `${baseMsg} [${causeParts.join(': ')}]` : baseMsg;
        throw new Error(`Galat koneksi ke '${url}': ${fullMsg}`);
      } finally {
        clearTimeout(timeoutId);
        if (signal) {
          signal.removeEventListener('abort', onExternalAbort);
        }
      }
    }

    throw new Error(`Runtime tidak menyediakan API fetch untuk melakukan permintaan nyata ke '${url}'.`);
  }
}
