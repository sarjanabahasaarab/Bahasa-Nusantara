/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Mesin Inti Klien HTTP NUSANTARA (KlienHTTP)
 */

import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';
import {
  MetodeHTTP,
  OpsiPermintaanHTTP,
  ResponHTTPInterface,
  InfoPengalihan,
  KonfigurasiKlienHTTP,
} from '../types';
import { PetaHeader } from '../headers/headerMap';
import { PengelolaCookie } from './cookieJar';
import { ResponHTTP } from './response';
import { PembentukBodyHTTP } from '../body/bodyBuilder';
import { ManajerOtentikasiHTTP } from '../authentication/auth';
import { PengelolaRetryHTTP } from '../retry/retryPolicy';
import {
  GalatHTTP,
  GalatJaringanHTTP,
  GalatTimeoutHTTP,
  GalatTLSHTTP,
} from '../errors/httpError';
import { PembangunRequest } from './requestBuilder';

export interface KonfigurasiKlienOpsional extends KonfigurasiKlienHTTP {
  cookieJar?: PengelolaCookie;
  batasWaktuMs?: number;
  autentikasi?: any;
  cobaUlang?: any;
  headerBawaan?: any;
}

export class KlienHTTP {
  public readonly baseUrl?: string;
  public readonly headersBawaan: PetaHeader;
  public readonly timeoutBawaanMs: number;
  public readonly cookieJar: PengelolaCookie;
  public readonly retryBawaan?: PengelolaRetryHTTP;
  public readonly autentikasiBawaan?: any;
  private readonly agenHttp: http.Agent;
  private readonly agenHttps: https.Agent;
  private readonly batasUkuranTubuhBytes: number;

  constructor(konfigurasi?: KonfigurasiKlienOpsional) {
    this.baseUrl = konfigurasi?.baseUrl?.replace(/\/+$/, '');
    this.headersBawaan = new PetaHeader(konfigurasi?.defaultHeaders || (konfigurasi as any)?.headerBawaan);
    this.timeoutBawaanMs = konfigurasi?.defaultTimeout ?? (konfigurasi as any)?.batasWaktuMs ?? 30000;
    this.cookieJar = konfigurasi?.cookieJar || new PengelolaCookie();
    this.batasUkuranTubuhBytes = konfigurasi?.batasUkuranTubuhBytes ?? 50 * 1024 * 1024; // 50 MB
    this.autentikasiBawaan = konfigurasi?.otentikasi || (konfigurasi as any)?.autentikasi;

    const retryCfg = konfigurasi?.retryPolicy || (konfigurasi as any)?.cobaUlang;
    if (retryCfg) {
      this.retryBawaan = new PengelolaRetryHTTP(retryCfg);
    }

    // Agent dengan keep-alive pooling
    this.agenHttp = new http.Agent({ keepAlive: true, maxSockets: 50 });
    this.agenHttps = new https.Agent({ keepAlive: true, maxSockets: 50 });
  }

  public dapatkanCookieJar(): PengelolaCookie {
    return this.cookieJar;
  }

  public permintaan(url?: string): PembangunRequest {
    return new PembangunRequest(this, url);
  }

  public async minta<T = any>(opsi: OpsiPermintaanHTTP & { url?: string; [key: string]: any }): Promise<ResponHTTP<T>> {
    const url = opsi.url || this.baseUrl || '';
    return this.kirim<T>(url, opsi);
  }

  public async get<T = any>(url: string, opsi?: OpsiPermintaanHTTP): Promise<ResponHTTP<T>> {
    return this.kirim<T>(url, { ...opsi, metode: 'GET' });
  }

  public async post<T = any>(url: string, body?: any, opsi?: OpsiPermintaanHTTP): Promise<ResponHTTP<T>> {
    return this.kirim<T>(url, { ...opsi, metode: 'POST', body: body ?? opsi?.body });
  }

  public async put<T = any>(url: string, body?: any, opsi?: OpsiPermintaanHTTP): Promise<ResponHTTP<T>> {
    return this.kirim<T>(url, { ...opsi, metode: 'PUT', body: body ?? opsi?.body });
  }

  public async patch<T = any>(url: string, body?: any, opsi?: OpsiPermintaanHTTP): Promise<ResponHTTP<T>> {
    return this.kirim<T>(url, { ...opsi, metode: 'PATCH', body: body ?? opsi?.body });
  }

  public async delete<T = any>(url: string, opsi?: OpsiPermintaanHTTP): Promise<ResponHTTP<T>> {
    return this.kirim<T>(url, { ...opsi, metode: 'DELETE' });
  }

  public async head(url: string, opsi?: OpsiPermintaanHTTP): Promise<ResponHTTP<null>> {
    return this.kirim<null>(url, { ...opsi, metode: 'HEAD' });
  }

  public async options(url: string, opsi?: OpsiPermintaanHTTP): Promise<ResponHTTP<null>> {
    return this.kirim<null>(url, { ...opsi, metode: 'OPTIONS' });
  }

  /**
   * Mengirim permintaan HTTP dengan dukungan redirect, cookie, auth, retry, dan validasi TLS.
   */
  public async kirim<T = any>(
    urlSasaran: string,
    opsi: OpsiPermintaanHTTP = {}
  ): Promise<ResponHTTP<T>> {
    const pengelolaRetry = opsi.kebijakanRetry
      ? new PengelolaRetryHTTP(opsi.kebijakanRetry)
      : this.retryBawaan || new PengelolaRetryHTTP({ maksimalPercobaan: 1 });

    let percobaan = 0;
    let galatTerakhir: any = null;

    while (percobaan < pengelolaRetry.maksimalPercobaan) {
      percobaan++;
      try {
        const respon = await this.eksekusiTunggal<T>(urlSasaran, opsi);
        if (
          pengelolaRetry.apakahLayakUlang(
            percobaan,
            (opsi.metode || 'GET').toUpperCase() as MetodeHTTP,
            respon.status
          )
        ) {
          const jeda = pengelolaRetry.hitungJedaMs(
            percobaan,
            respon.dapatkanHeader('retry-after')
          );
          await this.tunda(jeda);
          continue;
        }
        return respon;
      } catch (err: any) {
        galatTerakhir = err;
        const metode = (opsi.metode || 'GET').toUpperCase() as MetodeHTTP;
        if (pengelolaRetry.apakahLayakUlang(percobaan, metode, undefined, err)) {
          const jeda = pengelolaRetry.hitungJedaMs(percobaan);
          await this.tunda(jeda);
          continue;
        }
        throw err;
      }
    }

    throw galatTerakhir;
  }

  private async eksekusiTunggal<T>(
    urlSasaran: string,
    opsi: OpsiPermintaanHTTP
  ): Promise<ResponHTTP<T>> {
    const kueri = opsi.kueri || (opsi as any).query;
    let urlAktif = this.gabungkanUrl(urlSasaran, kueri);
    let metodeAktif: MetodeHTTP = (opsi.metode || 'GET').toUpperCase() as MetodeHTTP;
    let bodyAktif = opsi.body ?? (opsi as any).tubuh;
    let tipeBodyAktif = opsi.tipeBody;

    const riwayatPengalihan: InfoPengalihan[] = [];
    const batasRedirect = opsi.maksimalPengalihan ?? 10;
    const ikutiRedirect = opsi.ikutiPengalihan ?? true;
    const jejakUrlRedirect = new Set<string>();

    const waktuMulai = Date.now();

    while (true) {
      const urlObj = this.validasiDanUraiUrl(urlAktif);

      // Siapkan Header
      const headerReq = new PetaHeader(this.headersBawaan.keObjek());
      if (opsi.headers) {
        headerReq.tambahBanyak(opsi.headers);
      }
      if ((opsi as any).header) {
        headerReq.tambahBanyak((opsi as any).header);
      }

      // Terapkan Otentikasi
      const auth = opsi.otentikasi || (opsi as any).autentikasi || this.autentikasiBawaan;
      if (auth) {
        // Jangan teruskan otentikasi jika berpindah origin saat redirect
        const apakahAsalSama =
          riwayatPengalihan.length === 0 ||
          this.apakahOriginSama(urlObj, new URL(riwayatPengalihan[0].urlAsal));

        if (apakahAsalSama) {
          ManajerOtentikasiHTTP.terapkan(auth, headerReq, urlObj.searchParams);
        } else {
          // Stripping Authorization header for security
          headerReq.hapus('Authorization');
          headerReq.hapus('Proxy-Authorization');
        }
      }

      // Terapkan Cookie jika diizinkan
      if (opsi.sertakanCookie !== false) {
        const cookieStr = this.cookieJar.dapatkanHeaderCookie(urlAktif);
        if (cookieStr) {
          headerReq.tetapkan('Cookie', cookieStr);
        }
      }

      // Set Host header
      headerReq.tetapkan('Host', urlObj.host);

      // Serialisasi Muatan (Body) jika ada
      let muatanData: Buffer | null = null;
      if (metodeAktif !== 'GET' && metodeAktif !== 'HEAD') {
        const hasilBody = PembentukBodyHTTP.proses(bodyAktif, tipeBodyAktif, headerReq);
        if (hasilBody) {
          muatanData = hasilBody.buffer;
        }
      }

      // Jalankan Pengiriman Fisik
      const responMentah = await this.kirimFisik({
        urlObj,
        metode: metodeAktif,
        headers: headerReq,
        body: muatanData,
        timeoutMs: opsi.timeoutMs ?? (opsi as any).batasWaktuMs ?? this.timeoutBawaanMs,
        abaikanTLS: opsi.abaikanTLS ?? false,
        sinyal: opsi.sinyalPembatalan,
      });

      // Simpan Set-Cookie ke Jar
      if (responMentah.rawSetCookies && responMentah.rawSetCookies.length > 0 && opsi.sertakanCookie !== false) {
        this.cookieJar.prosesSetCookie(responMentah.rawSetCookies, urlAktif);
      } else {
        const setCookieHeader = responMentah.headers.get('set-cookie');
        if (setCookieHeader && opsi.sertakanCookie !== false) {
          this.cookieJar.prosesSetCookie(setCookieHeader, urlAktif);
        }
      }

      // Evaluasi Redirect (301, 302, 303, 307, 308)
      if (
        ikutiRedirect &&
        responMentah.status >= 300 &&
        responMentah.status < 400 &&
        responMentah.headers.has('location')
      ) {
        if (riwayatPengalihan.length >= batasRedirect) {
          throw new GalatHTTP(
            `Batas maksimal pengalihan (${batasRedirect}) terlampaui.`,
            'BATAS_PENGALIHAN_TERLAMPAUI',
            undefined,
            urlAktif
          );
        }

        const rawLocation = responMentah.headers.get('location')!;
        const urlTujuan = new URL(rawLocation, urlAktif).toString();

        // Loop detection
        if (jejakUrlRedirect.has(urlTujuan)) {
          throw new GalatHTTP(
            `Terdeteksi perulangan pengalihan (redirect loop) ke '${urlTujuan}'.`,
            'LOOP_PENGALIHAN_TERDETEKSI',
            undefined,
            urlTujuan
          );
        }
        jejakUrlRedirect.add(urlTujuan);

        riwayatPengalihan.push({
          urlAsal: urlAktif,
          urlTujuan,
          kodeStatus: responMentah.status,
        });

        // Penyesuaian metode HTTP sesuai spesifikasi
        if (responMentah.status === 303 || ((responMentah.status === 301 || responMentah.status === 302) && metodeAktif === 'POST')) {
          metodeAktif = 'GET';
          bodyAktif = undefined;
          tipeBodyAktif = undefined;
        }

        urlAktif = urlTujuan;
        continue;
      }

      const durasiMs = Date.now() - waktuMulai;

      return new ResponHTTP<T>({
        status: responMentah.status,
        statusTeks: responMentah.statusTeks,
        headers: responMentah.petaHeader,
        buffer: responMentah.buffer,
        urlAkhir: urlAktif,
        durasiMs,
        pengalihan: riwayatPengalihan,
      });
    }
  }

  private kirimFisik(params: {
    urlObj: URL;
    metode: MetodeHTTP;
    headers: PetaHeader;
    body: Buffer | null;
    timeoutMs: number;
    abaikanTLS: boolean;
    sinyal?: AbortSignal;
  }): Promise<{
    status: number;
    statusTeks: string;
    headers: Map<string, string>;
    petaHeader: PetaHeader;
    rawSetCookies?: string[];
    buffer: Buffer;
  }> {
    return new Promise((resolve, reject) => {
      const isHttps = params.urlObj.protocol === 'https:';
      const lib = isHttps ? https : http;
      const agent = isHttps ? this.agenHttps : this.agenHttp;

      const requestOptions: http.RequestOptions = {
        protocol: params.urlObj.protocol,
        hostname: params.urlObj.hostname,
        port: params.urlObj.port || (isHttps ? 443 : 80),
        path: `${params.urlObj.pathname}${params.urlObj.search}`,
        method: params.metode,
        headers: params.headers.keObjek(),
        agent,
      };

      if (isHttps && params.abaikanTLS) {
        (requestOptions as https.RequestOptions).rejectUnauthorized = false;
      }

      let timeoutTimer: NodeJS.Timeout | null = null;
      let requestAborted = false;

      const req = lib.request(requestOptions, (res) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);

        const chunks: Buffer[] = [];
        let totalPanjang = 0;

        const petaHeaderRes = new PetaHeader();
        const mapHeader = new Map<string, string>();
        const rawSetCookies: string[] = Array.isArray(res.headers['set-cookie'])
          ? res.headers['set-cookie']
          : (res.headers['set-cookie'] ? [res.headers['set-cookie']] : []);

        for (const [k, v] of Object.entries(res.headers)) {
          if (v !== undefined) {
            petaHeaderRes.tetapkan(k, v as any);
            mapHeader.set(k.toLowerCase(), Array.isArray(v) ? v.join(', ') : String(v));
          }
        }

        res.on('data', (chunk: Buffer) => {
          totalPanjang += chunk.length;
          if (totalPanjang > this.batasUkuranTubuhBytes) {
            req.destroy(
              new GalatHTTP(
                `Ukuran respons melebihi batas yang diizinkan (${this.batasUkuranTubuhBytes} bytes).`,
                'RESPONS_TERLALU_BESAR'
              )
            );
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            status: res.statusCode || 200,
            statusTeks: res.statusMessage || '',
            headers: mapHeader,
            petaHeader: petaHeaderRes,
            rawSetCookies,
            buffer,
          });
        });

        res.on('error', (err) => {
          reject(new GalatJaringanHTTP(`Galat pada aliran data respons: ${err.message}`, err));
        });
      });

      // Penanganan Timeout
      if (params.timeoutMs > 0) {
        timeoutTimer = setTimeout(() => {
          requestAborted = true;
          req.destroy(
            new GalatTimeoutHTTP(
              `Permintaan HTTP melebihi batas waktu ${params.timeoutMs}ms.`,
              undefined,
              params.urlObj.toString()
            )
          );
        }, params.timeoutMs);
      }

      // Penanganan Pembatalan (AbortSignal)
      if (params.sinyal) {
        if (params.sinyal.aborted) {
          req.destroy(new GalatHTTP("Permintaan dibatalkan oleh sinyal AbortSignal.", 'DIBATALKAN'));
          return;
        }
        params.sinyal.addEventListener('abort', () => {
          req.destroy(new GalatHTTP("Permintaan dibatalkan oleh sinyal AbortSignal.", 'DIBATALKAN'));
        });
      }

      req.on('error', (err: any) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (requestAborted) return;

        const pesan = err.message || '';
        const urlStr = params.urlObj.toString();

        if (err.code === 'CERT_HAS_EXPIRED' || err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || pesan.includes('certificate')) {
          reject(new GalatTLSHTTP(`Galat sertifikat TLS/SSL: ${pesan}`, err, urlStr));
        } else if (err.code === 'ENOTFOUND') {
          reject(new GalatJaringanHTTP(`Host tidak ditemukan (DNS lookup failed): ${params.urlObj.hostname}`, err, urlStr));
        } else if (err.code === 'ECONNREFUSED') {
          reject(new GalatJaringanHTTP(`Koneksi ditolak oleh server target (${urlStr})`, err, urlStr));
        } else {
          reject(new GalatJaringanHTTP(`Kegagalan transport jaringan: ${pesan}`, err, urlStr));
        }
      });

      // Tulis muatan body jika ada
      if (params.body) {
        req.write(params.body);
      }

      req.end();
    });
  }

  private validasiDanUraiUrl(urlStr: string): URL {
    if (!urlStr || typeof urlStr !== 'string' || !urlStr.trim()) {
      throw new GalatHTTP("URL permintaan wajib diisi berupa string teks.", 'URL_KOSONG');
    }

    try {
      const u = new URL(urlStr);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new GalatHTTP(
          `Skema protokol '${u.protocol}' tidak didukung. Hanya 'http:' dan 'https:' yang diperbolehkan.`,
          'SKEMA_TIDAK_DIDUKUNG',
          undefined,
          urlStr
        );
      }
      return u;
    } catch (err: any) {
      if (err instanceof GalatHTTP) throw err;
      throw new GalatHTTP(`Format URL tidak valid: '${urlStr}'`, 'URL_TIDAK_VALID', err);
    }
  }

  private gabungkanUrl(
    urlTujuan: string,
    kueri?: Record<string, string | number | boolean | (string | number | boolean)[]>
  ): string {
    let baseUrlLengkap = urlTujuan;
    if (this.baseUrl && !/^https?:\/\//i.test(urlTujuan)) {
      const jalur = urlTujuan.startsWith('/') ? urlTujuan : `/${urlTujuan}`;
      baseUrlLengkap = `${this.baseUrl}${jalur}`;
    }

    if (!kueri || Object.keys(kueri).length === 0) {
      return baseUrlLengkap;
    }

    const u = new URL(baseUrlLengkap);
    for (const [k, v] of Object.entries(kueri)) {
      if (Array.isArray(v)) {
        for (const item of v) u.searchParams.append(k, String(item));
      } else if (v !== undefined && v !== null) {
        u.searchParams.append(k, String(v));
      }
    }
    return u.toString();
  }

  private apakahOriginSama(url1: URL, url2: URL): boolean {
    return (
      url1.protocol === url2.protocol &&
      url1.hostname === url2.hostname &&
      url1.port === url2.port
    );
  }

  private tunda(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
