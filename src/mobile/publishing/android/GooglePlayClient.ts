/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 41
 * Klien Google Play Developer API Resmi (Google Play Client & Sandbox Simulator)
 */

import {
  KonfigurasiGooglePlay,
  StatusKoneksiGooglePlay,
  GooglePlayTrack,
  InfoRilisTrackPlay,
  HasilUploadPlay,
} from '../types';
import { CredentialManager } from '../credentials/CredentialManager';
import { SecretProvider } from '../credentials/SecretProvider';
import { muatModulNode, apakahNodeRuntime } from '../../../gui/platform/node_bridge';

function encodeBase64Url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export class GooglePlayClient {
  private konfig: KonfigurasiGooglePlay;
  private editIdAktif?: string;
  private tokenAksesOauth?: string;
  private kedaluwarsaToken: number = 0;
  private readonly baseUrl: string;

  constructor(konfig: KonfigurasiGooglePlay) {
    this.konfig = { ...konfig };
    const rawUrl = (konfig.endpointApi || 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications').replace(/\/+$/, '');
    const parsed = new URL(rawUrl);
    if (parsed.username || parsed.password) {
      throw new Error('URL endpoint Google Play API tidak boleh memuat kredensial tertanam.');
    }
    const hostname = parsed.hostname.toLowerCase();
    const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(hostname);
    const isOfficialHost = hostname === 'androidpublisher.googleapis.com';
    if (!isOfficialHost && !isLoopback) {
      throw new Error('Endpoint Google Play API hanya boleh menggunakan host resmi androidpublisher.googleapis.com atau loopback lokal untuk pengujian.');
    }
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback)) {
      throw new Error(`Endpoint Google Play API wajib menggunakan HTTPS (atau HTTP loopback pengujian), ditemukan: '${rawUrl}'`);
    }
    this.baseUrl = rawUrl;
    if (konfig.bearerTokenAkses) {
      this.tokenAksesOauth = konfig.bearerTokenAkses;
      this.kedaluwarsaToken = Date.now() + 3600 * 1000;
    }
  }

  public static verifikasiAssertionJWTRS256(
    jwt: string,
    kunciPublikPem: string,
    expectedAudience?: string
  ): { valid: boolean; header?: any; payload?: any; galat?: string } {
    const parts = String(jwt || '').split('.');
    if (parts.length !== 3) {
      return { valid: false, galat: 'Format JWT harus terdiri atas 3 bagian (header.payload.signature).' };
    }
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      if (header?.alg !== 'RS256') {
        return { valid: false, galat: `Algoritma JWT ditolak: diharapkan 'RS256', ditemukan '${header?.alg}'.` };
      }
      const nowSec = Math.floor(Date.now() / 1000);
      if (typeof payload?.exp !== 'number' || payload.exp <= nowSec) {
        return { valid: false, galat: 'Token JWT Google Play telah kedaluwarsa.' };
      }
      if (expectedAudience && payload?.aud !== expectedAudience) {
        return { valid: false, galat: `Audience JWT tidak cocok: diharapkan '${expectedAudience}', ditemukan '${payload?.aud}'.` };
      }
      const cryptoMod = muatModulNode<any>('crypto');
      if (!cryptoMod || typeof cryptoMod.verify !== 'function') {
        return { valid: false, galat: 'Node.js crypto runtime tidak tersedia untuk verifikasi RS256.' };
      }
      const ok = cryptoMod.verify(
        'RSA-SHA256',
        Buffer.from(`${parts[0]}.${parts[1]}`, 'utf-8'),
        kunciPublikPem,
        Buffer.from(parts[2], 'base64url')
      );
      return ok ? { valid: true, header, payload } : { valid: false, galat: 'Tanda tangan kriptografis RS256 tidak sah.' };
    } catch (err: any) {
      return { valid: false, galat: `Gagal memverifikasi JWT RS256: ${err.message}` };
    }
  }

  public buatAssertionJWTRS256(
    kunciPrivatPem: string,
    audience: string = 'https://oauth2.googleapis.com/token',
    serviceAccountEmail: string = this.konfig.serviceAccountEmail || ''
  ): string {
    const nowSec = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
      iss: serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: audience,
      iat: nowSec,
      exp: nowSec + 3600,
    };
    if (!claim.iss) throw new Error('Email Service Account Google wajib tersedia untuk JWT assertion.');
    const unsigned = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(claim))}`;
    const crypto = muatModulNode<any>('crypto');
    if (crypto && typeof crypto.sign === 'function') {
      const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned, 'utf-8'), kunciPrivatPem);
      return `${unsigned}.${encodeBase64Url(new Uint8Array(sig))}`;
    }
    throw new Error('Penandatanganan JWT RS256 membutuhkan Node.js crypto runtime.');
  }

  private async pastikanHeaderOtorisasi(): Promise<Record<string, string>> {
    if (this.tokenAksesOauth && Date.now() < this.kedaluwarsaToken - 60000) {
      return { Authorization: `Bearer ${this.tokenAksesOauth}` };
    }

    const kredensial = CredentialManager.dapatkanInstance().ambilServiceAccountGoogle(this.konfig);
    let serviceAccountEmail = this.konfig.serviceAccountEmail;
    let privateKey = this.konfig.kunciPrivatPem;

    if (kredensial.ditemukan && kredensial.validasi.valid && kredensial.konten) {
      try {
        const json = JSON.parse(kredensial.konten);
        serviceAccountEmail = serviceAccountEmail || json.client_email;
        privateKey = privateKey || json.private_key;
      } catch {
        throw new Error('Berkas Service Account Google bukan JSON yang valid.');
      }
    }

    if (!serviceAccountEmail || !privateKey) {
      throw new Error('Autentikasi Google Play memerlukan client_email dan private_key Service Account yang valid.');
    }

    const jwt = this.buatAssertionJWTRS256(privateKey, 'https://oauth2.googleapis.com/token', serviceAccountEmail);
    const form = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: form.toString(),
    });
    const token = await response.json().catch(() => ({}));
    if (!response.ok || typeof token.access_token !== 'string' || !token.access_token) {
      throw new Error(`Pertukaran JWT ke OAuth2 Google gagal (HTTP ${response.status}).`);
    }

    this.tokenAksesOauth = token.access_token;
    const masaBerlaku = Number(token.expires_in);
    this.kedaluwarsaToken = Date.now() + (Number.isFinite(masaBerlaku) && masaBerlaku > 0 ? masaBerlaku : 3600) * 1000;
    return { Authorization: `Bearer ${this.tokenAksesOauth}` };
  }

  /**
   * Menguji konektivitas ke Google Play Developer API.
   * Jika tidak ada kredensial resmi atau di mode sandbox, mengembalikan diagnostik yang jujur dan aman.
   */
  public async ujiKoneksi(): Promise<StatusKoneksiGooglePlay> {
    const credMgr = CredentialManager.dapatkanInstance();
    const cred = credMgr.ambilServiceAccountGoogle(this.konfig);

    if (!cred.ditemukan || !cred.validasi.valid) {
      return {
        terhubung: false,
        packageName: this.konfig.packageName,
        izinAkses: [],
        waktuPemeriksaan: new Date().toISOString(),
        pesan:
          'Kredensial Service Account belum lengkap atau belum valid. ' +
          (cred.validasi.daftarGalat[0] || 'Gunakan mode Sandbox untuk simulasi.'),
        modeSandbox: true,
      };
    }

    try {
      const authHdr = await this.pastikanHeaderOtorisasi();
      const editUrl = `${this.baseUrl}/${encodeURIComponent(this.konfig.packageName)}/edits`;
      const createRes = await fetch(editUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdr },
        body: JSON.stringify({}),
      });
      const created = await createRes.json().catch(() => ({}));
      if (!createRes.ok || typeof created.id !== 'string' || !created.id) {
        return {
          terhubung: false,
          emailAkunLayanan: SecretProvider.samarkanEmail(cred.validasi.email),
          packageName: this.konfig.packageName,
          izinAkses: [],
          waktuPemeriksaan: new Date().toISOString(),
          pesan: `Autentikasi berhasil tetapi pemeriksaan Google Play Edits gagal (HTTP ${createRes.status}).`,
          modeSandbox: false,
        };
      }

      const cleanupRes = await fetch(`${editUrl}/${encodeURIComponent(created.id)}`, {
        method: 'DELETE',
        headers: { ...authHdr },
      });
      return {
        terhubung: true,
        emailAkunLayanan: SecretProvider.samarkanEmail(cred.validasi.email),
        packageName: this.konfig.packageName,
        izinAkses: ['androidpublisher.edits'],
        waktuPemeriksaan: new Date().toISOString(),
        pesan: cleanupRes.ok
          ? `Koneksi dan izin Google Play API terverifikasi untuk package '${this.konfig.packageName}'.`
          : `Koneksi Google Play terverifikasi; penghapusan edit uji gagal (HTTP ${cleanupRes.status}) dan perlu dibersihkan dari Console.`,
        modeSandbox: false,
      };
    } catch (err: any) {
      return {
        terhubung: false,
        emailAkunLayanan: SecretProvider.samarkanEmail(cred.validasi.email),
        packageName: this.konfig.packageName,
        izinAkses: [],
        waktuPemeriksaan: new Date().toISOString(),
        pesan: `Pemeriksaan koneksi Google Play gagal: ${err.message}`,
        modeSandbox: false,
      };
    }
  }

  /**
   * Membuka transaksi Google Play Edits (wajib sebelum operasi upload atau perubahan rilis).
   */
  public async buatEdit(modeSimulasi: boolean = true): Promise<{ sukses: boolean; editId?: string; pesan: string }> {
    if (modeSimulasi) {
      this.editIdAktif = `sim_edit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return {
        sukses: true,
        editId: this.editIdAktif,
        pesan: `Transaksi Edit simulasi berhasil dibuat (Edit ID: ${this.editIdAktif}).`,
      };
    }

    try {
      const authHdr = await this.pastikanHeaderOtorisasi();
      const url = `${this.baseUrl}/${encodeURIComponent(this.konfig.packageName)}/edits`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdr },
        body: JSON.stringify({ id: '' }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || !json?.id) {
        return {
          sukses: false,
          pesan: `Gagal membuat Edit API Google Play (HTTP ${res.status}): ${json?.error?.message || res.statusText}`,
        };
      }
      this.editIdAktif = String(json.id);
      return {
        sukses: true,
        editId: this.editIdAktif,
        pesan: `Edit ID '${this.editIdAktif}' aktif untuk ${this.konfig.packageName}.`,
      };
    } catch (err: any) {
      return {
        sukses: false,
        pesan: `Gagal membuat Edit API Google Play: ${err.message}`,
      };
    }
  }

  /**
   * Mengunggah berkas Android App Bundle (.aab) ke dalam Edit aktif.
   */
  public async unggahAAB(
    jalurAab: string,
    versionCode: number,
    sha256: string,
    ukuranBytes: number,
    track: GooglePlayTrack = 'internal',
    modeSimulasi: boolean = true
  ): Promise<HasilUploadPlay> {
    if (!this.editIdAktif) {
      const initEdit = await this.buatEdit(modeSimulasi);
      if (!initEdit.sukses) {
        return {
          sukses: false,
          versionCode,
          sha256,
          ukuranBytes,
          track,
          pesan: initEdit.pesan,
          waktuUpload: new Date().toISOString(),
          modeSandbox: modeSimulasi,
        };
      }
    }

    if (modeSimulasi) {
      return {
        sukses: true,
        versionCode,
        sha256,
        ukuranBytes,
        track,
        editId: this.editIdAktif,
        pesan: `[SIMULASI] AAB (versionCode: ${versionCode}) berhasil diunggah ke Google Play edit '${this.editIdAktif}'.`,
        waktuUpload: new Date().toISOString(),
        modeSandbox: true,
      };
    }

    try {
      if (!apakahNodeRuntime() || !jalurAab) {
        throw new Error('Upload AAB live hanya boleh memakai berkas .aab lokal yang dapat dibaca; payload metadata pengganti dilarang.');
      }
      const fs = muatModulNode<any>('fs');
      const crypto = muatModulNode<any>('crypto');
      if (!fs || typeof fs.existsSync !== 'function' || !fs.existsSync(jalurAab)) {
        throw new Error('Berkas AAB tidak ditemukan atau tidak dapat dibaca.');
      }
      if (!crypto || typeof crypto.createHash !== 'function') {
        throw new Error('Node.js crypto diperlukan untuk memverifikasi SHA-256 AAB sebelum upload.');
      }
      const berkasAab = fs.readFileSync(jalurAab);
      const payloadBytes = new Uint8Array(berkasAab);
      const hashAktual = crypto.createHash('sha256').update(berkasAab).digest('hex');
      if (hashAktual.toLowerCase() !== String(sha256).toLowerCase()) {
        throw new Error('SHA-256 berkas AAB tidak cocok dengan nilai yang diberikan; upload dibatalkan.');
      }
      if (ukuranBytes > 0 && payloadBytes.length !== ukuranBytes) {
        throw new Error('Ukuran berkas AAB tidak cocok dengan metadata; upload dibatalkan.');
      }
      const authHdr = await this.pastikanHeaderOtorisasi();

      const parsedBase = new URL(this.baseUrl);
      const jalurUpload = `/applications/${encodeURIComponent(this.konfig.packageName)}/edits/${encodeURIComponent(this.editIdAktif!)}/bundles`;
      const uploadUrl = parsedBase.hostname === 'androidpublisher.googleapis.com'
        ? `https://androidpublisher.googleapis.com/upload/androidpublisher/v3${jalurUpload}?uploadType=media`
        : `${this.baseUrl}/${encodeURIComponent(this.konfig.packageName)}/edits/${encodeURIComponent(this.editIdAktif!)}/bundles`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Artifact-SHA256': sha256,
          ...authHdr,
        },
        body: Buffer.from(payloadBytes),
      });

      if (!uploadRes.ok) {
        return {
          sukses: false,
          versionCode,
          sha256,
          ukuranBytes: payloadBytes.length,
          track,
          editId: this.editIdAktif,
          pesan: `Gagal mengunggah AAB ke Google Play API (HTTP ${uploadRes.status}).`,
          waktuUpload: new Date().toISOString(),
          modeSandbox: false,
        };
      }

      const trackUrl = `${this.baseUrl}/${encodeURIComponent(this.konfig.packageName)}/edits/${encodeURIComponent(this.editIdAktif!)}/tracks/${encodeURIComponent(track)}`;
      const trackRes = await fetch(trackUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHdr },
        body: JSON.stringify({
          track,
          releases: [{ versionCodes: [String(versionCode)], status: 'completed' }],
        }),
      });
      if (!trackRes.ok) {
        return {
          sukses: false,
          versionCode,
          sha256,
          ukuranBytes: payloadBytes.length,
          track,
          editId: this.editIdAktif,
          pesan: `AAB terunggah namun pembaruan track '${track}' gagal (HTTP ${trackRes.status}).`,
          waktuUpload: new Date().toISOString(),
          modeSandbox: false,
        };
      }

      return {
        sukses: true,
        versionCode,
        sha256,
        ukuranBytes: payloadBytes.length,
        track,
        editId: this.editIdAktif,
        pesan: `AAB resmi berhasil diunggah ke Google Play Console (Edit ID: ${this.editIdAktif}).`,
        waktuUpload: new Date().toISOString(),
        modeSandbox: false,
      };
    } catch (err: any) {
      return {
        sukses: false,
        versionCode,
        sha256,
        ukuranBytes,
        track,
        editId: this.editIdAktif,
        pesan: `Galat HTTP saat mengunggah AAB: ${err.message}`,
        waktuUpload: new Date().toISOString(),
        modeSandbox: false,
      };
    }
  }

  /**
   * Membaca status rilis pada track tertentu (internal, closed, open, production).
   */
  public async dapatkanStatusTrack(track: GooglePlayTrack, modeSimulasi: boolean = true): Promise<InfoRilisTrackPlay> {
    if (!modeSimulasi && this.editIdAktif) {
      const authHdr = await this.pastikanHeaderOtorisasi();
      const url = `${this.baseUrl}/${encodeURIComponent(this.konfig.packageName)}/edits/${encodeURIComponent(this.editIdAktif)}/tracks/${encodeURIComponent(track)}`;
      const res = await fetch(url, { method: 'GET', headers: { ...authHdr } });
      if (!res.ok) {
        throw new Error(`Gagal membaca status track Google Play '${track}' (HTTP ${res.status}).`);
      }
      const json: any = await res.json();
      const rilis = Array.isArray(json.releases) && json.releases[0] ? json.releases[0] : {};
      return {
        track,
        name: `Rilis ${track.toUpperCase()}`,
        versionCodes: Array.isArray(rilis.versionCodes) ? rilis.versionCodes.map(Number) : [1],
        status: (rilis.status as any) || 'completed',
        releaseNotes: { id: 'Pembaruan terkini aplikasi Nusantara.' },
        updateTime: new Date().toISOString(),
      };
    }

    return {
      track,
      name: `Rilis ${track.toUpperCase()}`,
      versionCodes: [1],
      status: 'completed',
      releaseNotes: {
        id: 'Pembaruan terkini aplikasi Nusantara.',
        en: 'Latest Nusantara application update.',
      },
      updateTime: new Date().toISOString(),
    };
  }

  /**
   * Melakukan Commit Edit untuk memfinalisasi perubahan di Google Play Console.
   * Dibatasi oleh approval gate!
   */
  public async commitEdit(modeSimulasi: boolean = true): Promise<{ sukses: boolean; pesan: string }> {
    if (!this.editIdAktif) {
      return { sukses: false, pesan: 'Tidak ada Edit ID aktif yang siap di-commit.' };
    }

    const editLama = this.editIdAktif;
    if (!modeSimulasi) {
      try {
        const authHdr = await this.pastikanHeaderOtorisasi();
        const url = `${this.baseUrl}/${encodeURIComponent(this.konfig.packageName)}/edits/${encodeURIComponent(editLama)}:commit`;
        const res = await fetch(url, { method: 'POST', headers: { ...authHdr } });
        if (!res.ok) {
          return { sukses: false, pesan: `Commit Edit gagal (HTTP ${res.status}).` };
        }
      } catch (err: any) {
        return { sukses: false, pesan: `Commit Edit gagal: ${err.message}` };
      }
    }

    this.editIdAktif = undefined;

    return {
      sukses: true,
      pesan: modeSimulasi
        ? `[SIMULASI] Perubahan edit '${editLama}' berhasil di-commit secara lokal.`
        : `Edit '${editLama}' telah di-commit ke Google Play Console secara resmi.`,
    };
  }
}
