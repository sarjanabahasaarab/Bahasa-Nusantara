/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Modul Autentikasi HTTP (Basic, Bearer, API Key, & OAuth 2.0)
 */

import { KonfigurasiOtentikasi } from '../types';
import { PetaHeader } from '../headers/headerMap';
import { GalatAutentikasiHTTP } from '../errors/httpError';

export class ManajerOtentikasiHTTP {
  /**
   * Menerapkan kredensial otentikasi ke header atau URL kueri.
   */
  public static terapkan(
    otentikasi: KonfigurasiOtentikasi,
    headers: PetaHeader,
    searchParams?: URLSearchParams
  ): void {
    if (!otentikasi) return;

    switch (otentikasi.tipe) {
      case 'basic': {
        if (!otentikasi.namaPengguna) {
          throw new GalatAutentikasiHTTP("Nama pengguna wajib diisi pada Basic Authentication.");
        }
        const gabungan = `${otentikasi.namaPengguna}:${otentikasi.kataSandi || ''}`;
        const base64 = Buffer.from(gabungan, 'utf-8').toString('base64');
        headers.tetapkan('Authorization', `Basic ${base64}`);
        break;
      }

      case 'bearer': {
        if (!otentikasi.token) {
          throw new GalatAutentikasiHTTP("Token wajib diisi pada Bearer Token Authentication.");
        }
        headers.tetapkan('Authorization', `Bearer ${otentikasi.token.trim()}`);
        break;
      }

      case 'apiKey': {
        if (!otentikasi.kunci) {
          throw new GalatAutentikasiHTTP("Kunci API (API Key) wajib diisi.");
        }
        const lokasi = otentikasi.lokasi || 'header';
        if (lokasi === 'header') {
          const namaHeader = otentikasi.namaParam || 'X-API-Key';
          headers.tetapkan(namaHeader, otentikasi.kunci.trim());
        } else if (lokasi === 'kueri' && searchParams) {
          const namaKueri = otentikasi.namaParam || 'api_key';
          searchParams.set(namaKueri, otentikasi.kunci.trim());
        }
        break;
      }

      case 'oauth2': {
        if (!otentikasi.accessToken) {
          throw new GalatAutentikasiHTTP("Access token OAuth2 wajib diisi.");
        }
        const jenis = otentikasi.tokenType || 'Bearer';
        headers.tetapkan('Authorization', `${jenis} ${otentikasi.accessToken.trim()}`);
        break;
      }

      default:
        throw new GalatAutentikasiHTTP(`Tipe otentikasi tidak dikenal: ${(otentikasi as any).tipe}`);
    }
  }

  /**
   * Helper factory untuk Basic Auth
   */
  public static buatBasic(namaPengguna: string, kataSandi: string): KonfigurasiOtentikasi {
    return { tipe: 'basic', namaPengguna, kataSandi };
  }

  /**
   * Helper factory untuk Bearer Token
   */
  public static buatBearer(token: string): KonfigurasiOtentikasi {
    return { tipe: 'bearer', token };
  }

  /**
   * Helper factory untuk API Key
   */
  public static buatApiKey(
    arg1: string,
    arg2?: string,
    arg3?: 'header' | 'kueri' | 'query' | string
  ): KonfigurasiOtentikasi {
    if (arg2 !== undefined && arg2 !== 'header' && arg2 !== 'kueri' && arg2 !== 'query') {
      // Pola: buatApiKey(namaParam, kunci, lokasi?)
      const lokasi = (arg3 === 'query' || arg3 === 'kueri') ? 'kueri' : 'header';
      return { tipe: 'apiKey', kunci: arg2, lokasi, namaParam: arg1 };
    }
    // Pola: buatApiKey(kunci, lokasi?, namaParam?)
    const lokasi = (arg2 === 'query' || arg2 === 'kueri') ? 'kueri' : 'header';
    return { tipe: 'apiKey', kunci: arg1, lokasi, namaParam: typeof arg3 === 'string' ? arg3 : undefined };
  }

  /**
   * Helper factory untuk OAuth2
   */
  public static buatOAuth2(opsi: {
    accessToken?: string;
    tokenAkses?: string;
    tokenType?: string;
    refreshToken?: string;
    tokenPenyegar?: string;
    expiresAt?: number;
    kedaluwarsaPada?: number;
    [key: string]: any;
  }): KonfigurasiOtentikasi {
    return {
      tipe: 'oauth2',
      accessToken: opsi.accessToken || opsi.tokenAkses || '',
      tokenType: opsi.tokenType || 'Bearer',
      refreshToken: opsi.refreshToken || opsi.tokenPenyegar,
      expiresAt: opsi.expiresAt || opsi.kedaluwarsaPada,
    };
  }
}

export { ManajerOtentikasiHTTP as PengelolaAutentikasiHTTP };
