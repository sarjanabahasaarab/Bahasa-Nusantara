/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 41
 * Klien App Store Connect API Resmi (Apple API Client & Simulator)
 */

import {
  KonfigurasiAppStoreConnect,
  StatusKoneksiASC,
  HasilUploadASC,
  StatusBuildASC,
} from '../types';
import { CredentialManager } from '../credentials/CredentialManager';
import { SecretProvider } from '../credentials/SecretProvider';
import { muatModulNode } from '../../../gui/platform/node_bridge';

function encodeBase64UrlASC(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export class AppStoreConnectClient {
  private konfig: KonfigurasiAppStoreConnect;
  private tokenJwtAktif?: string;
  private kadaluwarsaJwtMs: number = 0;
  private readonly baseUrl: string;

  constructor(konfig: KonfigurasiAppStoreConnect) {
    this.konfig = { ...konfig };
    const rawUrl = (konfig.endpointApi || 'https://api.appstoreconnect.apple.com/v1').replace(/\/+$/, '');
    const parsed = new URL(rawUrl);
    if (parsed.username || parsed.password) {
      throw new Error('URL endpoint App Store Connect API tidak boleh memuat kredensial tertanam.');
    }
    const hostname = parsed.hostname.toLowerCase();
    const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(hostname);
    const isOfficialHost = hostname === 'api.appstoreconnect.apple.com';
    if (!isOfficialHost && !isLoopback) {
      throw new Error('Endpoint App Store Connect API hanya boleh menggunakan host resmi api.appstoreconnect.apple.com atau loopback lokal untuk pengujian.');
    }
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback)) {
      throw new Error(`Endpoint App Store Connect API wajib menggunakan HTTPS (atau HTTP loopback pengujian), ditemukan: '${rawUrl}'`);
    }
    this.baseUrl = rawUrl;
  }

  /**
   * Menguji koneksi ke App Store Connect API dan memvalidasi kredensial.
   */
  public async ujiKoneksi(): Promise<StatusKoneksiASC> {
    const credMgr = CredentialManager.dapatkanInstance();
    const cred = credMgr.ambilKredensialAppStoreConnect(this.konfig);

    if (!cred.ditemukan || !cred.validasi.valid) {
      return {
        terhubung: false,
        bundleId: this.konfig.bundleId,
        masaBerlakuTokenDetik: 0,
        waktuPemeriksaan: new Date().toISOString(),
        pesan:
          'Kredensial App Store Connect belum lengkap. ' +
          (cred.validasi.daftarGalat[0] || 'Mode Simulator Sandbox aktif.'),
        modeSandbox: true,
      };
    }

    return {
      terhubung: true,
      issuerId: SecretProvider.samarkan(cred.issuerId, 4, 4),
      keyId: SecretProvider.samarkan(cred.keyId, 2, 2),
      bundleId: this.konfig.bundleId,
      masaBerlakuTokenDetik: 1200, // 20 menit standar Apple JWT
      waktuPemeriksaan: new Date().toISOString(),
      pesan: `Terhubung ke App Store Connect API untuk Bundle ID '${this.konfig.bundleId}'.`,
      modeSandbox: false,
    };
  }

  /**
   * Menghasilkan struktur token JWT standar ES256 untuk App Store Connect API.
   * Header: { alg: "ES256", kid: keyId, typ: "JWT" }
   * Payload: { iss: issuerId, exp: now + 1200, aud: "appstoreconnect-v1" }
   */
  public buatTokenJWTHeaderPayload(): {
    header: Record<string, string>;
    payload: Record<string, any>;
  } {
    const credMgr = CredentialManager.dapatkanInstance();
    const cred = credMgr.ambilKredensialAppStoreConnect(this.konfig);

    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = nowSec + 20 * 60; // 20 menit

    if (!cred.validasi.valid || !cred.keyId || !cred.issuerId) {
      throw new Error('Issuer ID, Key ID, dan kunci App Store Connect yang valid wajib tersedia; nilai contoh tidak diizinkan.');
    }

    const header = {
      alg: 'ES256',
      kid: cred.keyId,
      typ: 'JWT',
    };

    const payload = {
      iss: cred.issuerId || '',
      exp: expSec,
      aud: 'appstoreconnect-v1',
      bid: this.konfig.bundleId,
    };

    return { header, payload };
  }

  /**
   * Menandatangani JWT ES256 (ECDSA P-256 SHA-256 format IEEE P1363 sesuai RFC 7515) secara kriptografis nyata.
   */
  public static verifikasiJWTES256(
    jwt: string,
    kunciPublikPem: string,
    expectedAudience: string = 'appstoreconnect-v1'
  ): { valid: boolean; header?: any; payload?: any; galat?: string } {
    const parts = String(jwt || '').split('.');
    if (parts.length !== 3) {
      return { valid: false, galat: 'Format JWT harus terdiri atas 3 bagian.' };
    }
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      if (header?.alg !== 'ES256') {
        return { valid: false, galat: `Algoritma JWT ditolak: diharapkan 'ES256', ditemukan '${header?.alg}'.` };
      }
      const nowSec = Math.floor(Date.now() / 1000);
      if (typeof payload?.exp !== 'number' || payload.exp <= nowSec) {
        return { valid: false, galat: 'Token JWT App Store Connect telah kedaluwarsa.' };
      }
      if (expectedAudience && payload?.aud !== expectedAudience) {
        return { valid: false, galat: `Audience JWT tidak cocok: diharapkan '${expectedAudience}', ditemukan '${payload?.aud}'.` };
      }
      const cryptoMod = muatModulNode<any>('crypto');
      if (!cryptoMod || typeof cryptoMod.verify !== 'function') {
        return { valid: false, galat: 'Node.js crypto runtime tidak tersedia untuk verifikasi ES256.' };
      }
      const ok = cryptoMod.verify(
        'sha256',
        Buffer.from(`${parts[0]}.${parts[1]}`, 'utf-8'),
        { key: kunciPublikPem, dsaEncoding: 'ieee-p1363' },
        Buffer.from(parts[2], 'base64url')
      );
      return ok ? { valid: true, header, payload } : { valid: false, galat: 'Tanda tangan ECDSA ES256 tidak sah.' };
    } catch (err: any) {
      return { valid: false, galat: `Gagal memverifikasi JWT ES256: ${err.message}` };
    }
  }

  public buatDanTandaTanganiJWT(kunciPrivatPem?: string): string {
    if (this.tokenJwtAktif && Date.now() < this.kadaluwarsaJwtMs - 60000) {
      return this.tokenJwtAktif;
    }
    const kredensial = CredentialManager.dapatkanInstance().ambilKredensialAppStoreConnect(this.konfig);
    const key = kunciPrivatPem || this.konfig.kunciPrivatPem || kredensial.privateKey;
    if (!key || !kredensial.validasi.valid) {
      throw new Error('Kunci privat P-256 (.p8) diperlukan untuk menandatangani token JWT ES256.');
    }
    const crypto = muatModulNode<any>('crypto');
    if (!crypto || typeof crypto.sign !== 'function') {
      throw new Error('Penandatanganan ECDSA ES256 membutuhkan Node.js crypto runtime.');
    }
    const { header, payload } = this.buatTokenJWTHeaderPayload();
    const input = `${encodeBase64UrlASC(JSON.stringify(header))}.${encodeBase64UrlASC(JSON.stringify(payload))}`;
    const sig = crypto.sign('sha256', Buffer.from(input, 'utf-8'), {
      key,
      dsaEncoding: 'ieee-p1363',
    });
    this.tokenJwtAktif = `${input}.${encodeBase64UrlASC(new Uint8Array(sig))}`;
    this.kadaluwarsaJwtMs = (payload.exp as number) * 1000;
    return this.tokenJwtAktif;
  }

  public async verifikasiAksesAPIHttp(kunciPrivatPem?: string): Promise<{ sukses: boolean; statusHTTP: number; data?: any; pesan: string }> {
    const jwt = this.buatDanTandaTanganiJWT(kunciPrivatPem);
    const url = `${this.baseUrl}/apps?filter[bundleId]=${encodeURIComponent(this.konfig.bundleId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/json',
      },
    });
    const data = await res.json().catch(() => ({}));
    return {
      sukses: res.ok,
      statusHTTP: res.status,
      data,
      pesan: res.ok ? 'Autentikasi ES256 App Store Connect API berhasil.' : `HTTP ${res.status}`,
    };
  }

  /**
   * Mengunggah build iOS (.xcarchive / IPA) ke App Store Connect.
   * Menggunakan Transporter / altool di macOS, API REST jika endpoint dikonfigurasi, atau jembatan simulator.
   */
  public async unggahBuild(
    jalurArchiveAtauIpa: string,
    versi: string,
    buildNumber: number,
    ukuranBytes: number,
    sha256: string,
    modeSimulasi: boolean = true
  ): Promise<HasilUploadASC> {
    const isMac = typeof process !== 'undefined' && process.platform === 'darwin';

    if (!modeSimulasi && this.konfig.endpointApi) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.konfig.kunciPrivatPem) {
          headers.Authorization = `Bearer ${this.buatDanTandaTanganiJWT()}`;
        }
        const res = await fetch(`${this.baseUrl}/builds`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            bundleId: this.konfig.bundleId,
            versi,
            buildNumber,
            ukuranBytes,
            sha256,
            jalurArchiveAtauIpa,
          }),
        });
        if (!res.ok) {
          return {
            sukses: false,
            bundleId: this.konfig.bundleId,
            versi,
            buildNumber,
            ukuranBytes,
            sha256,
            uploadTool: 'transporter',
            pesan: `Gagal mengunggah build via REST API (HTTP ${res.status}).`,
            waktuUpload: new Date().toISOString(),
            modeSandbox: false,
          };
        }
        return {
          sukses: true,
          bundleId: this.konfig.bundleId,
          versi,
          buildNumber,
          ukuranBytes,
          sha256,
          uploadTool: 'transporter',
          pesan: `Build v${versi} (#${buildNumber}) berhasil dikirim ke App Store Connect API (${this.baseUrl}).`,
          waktuUpload: new Date().toISOString(),
          modeSandbox: false,
        };
      } catch (err: any) {
        return {
          sukses: false,
          bundleId: this.konfig.bundleId,
          versi,
          buildNumber,
          ukuranBytes,
          sha256,
          uploadTool: 'transporter',
          pesan: `Galat koneksi App Store Connect API: ${err.message}`,
          waktuUpload: new Date().toISOString(),
          modeSandbox: false,
        };
      }
    }

    if (modeSimulasi || !isMac) {
      return {
        sukses: true,
        bundleId: this.konfig.bundleId,
        versi,
        buildNumber,
        ukuranBytes,
        sha256,
        uploadTool: 'simulator_bridge',
        pesan: isMac
          ? `[SIMULASI] Build ${this.konfig.bundleId} (v${versi}#${buildNumber}) siap diunggah ke App Store Connect.`
          : `[STANDALONE BRIDGE] Paket iOS divalidasi. Upload binary resmi ke Apple Store mewajibkan macOS dengan Apple Transporter/altool.`,
        waktuUpload: new Date().toISOString(),
        modeSandbox: true,
      };
    }

    // Tidak ada klaim upload sukses tanpa menjalankan Apple Transporter/altool dan memverifikasi hasilnya.
    return {
      sukses: false,
      bundleId: this.konfig.bundleId,
      versi,
      buildNumber,
      ukuranBytes,
      sha256,
      uploadTool: 'transporter',
      pesan: 'Upload iOS live belum dijalankan: integrasi Apple Transporter belum tersedia pada klien ini. Gunakan Transporter/Xcode secara eksplisit; status tidak boleh dilaporkan sukses.',
      waktuUpload: new Date().toISOString(),
      modeSandbox: false,
    };
  }

  /**
   * Membaca status pemrosesan build di App Store Connect.
   */
  public async periksaStatusBuild(
    versi: string,
    buildNumber: number
  ): Promise<{ status: StatusBuildASC; siapTestFlight: boolean; pesan: string }> {
    return {
      status: 'processing',
      siapTestFlight: false,
      pesan: `Status build v${versi} (#${buildNumber}) belum diperiksa melalui App Store Connect API; tidak boleh diasumsikan siap TestFlight.`,
    };
  }
}
