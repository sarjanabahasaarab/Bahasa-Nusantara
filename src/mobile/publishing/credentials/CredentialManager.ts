/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 41
 * Manajer Kredensial Toko Aplikasi (Credential Manager)
 */

import * as fs from 'fs';
import { SecretProvider } from './SecretProvider';
import { CredentialValidator, HasilValidasiGooglePlayKey, HasilValidasiASCKey } from './CredentialValidator';
import { KonfigurasiGooglePlay, KonfigurasiAppStoreConnect } from '../types';

export class CredentialManager {
  private static instance: CredentialManager;

  private constructor() {}

  public static dapatkanInstance(): CredentialManager {
    if (!CredentialManager.instance) {
      CredentialManager.instance = new CredentialManager();
    }
    return CredentialManager.instance;
  }

  /**
   * Mengambil raw Service Account JSON Google Play.
   * Prioritas:
   * 1. Environment Variable yang ditentukan atau default 'GOOGLE_PLAY_KEY_JSON' / 'GOOGLE_APPLICATION_CREDENTIALS'
   * 2. Berkas lokal jika ditentukan dan ada di disk
   */
  public ambilServiceAccountGoogle(konfig: KonfigurasiGooglePlay): {
    ditemukan: boolean;
    sumber: 'env' | 'berkas' | 'tidak_ada';
    konten?: string;
    validasi: HasilValidasiGooglePlayKey;
  } {
    const namaEnv = konfig.serviceAccountKeyEnv || 'GOOGLE_PLAY_KEY_JSON';
    const dariEnv = SecretProvider.ambilDariEnv(namaEnv) || SecretProvider.ambilDariEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON');

    if (dariEnv) {
      const validasi = CredentialValidator.validasiServiceAccountGoogle(dariEnv);
      return {
        ditemukan: true,
        sumber: 'env',
        konten: dariEnv,
        validasi,
      };
    }

    // Periksa jalur berkas jika di lingkungan Node
    const jalurBerkas = konfig.serviceAccountKeyPath || SecretProvider.ambilDariEnv('GOOGLE_APPLICATION_CREDENTIALS');
    if (jalurBerkas) {
      if (jalurBerkas.includes('\0')) {
        return {
          ditemukan: false,
          sumber: 'berkas',
          validasi: { valid: false, daftarGalat: ['Jalur berkas kredensial mengandung karakter NUL ilegal.'], pesanPeringatan: [] },
        };
      }
      const isNode = typeof window === 'undefined' && typeof process !== 'undefined' && Boolean(process?.versions?.node);
      if (isNode && typeof (fs as any)?.existsSync === 'function') {
        try {
          if ((fs as any).existsSync(jalurBerkas)) {
            const raw = (fs as any).readFileSync(jalurBerkas, 'utf-8');
            const validasi = CredentialValidator.validasiServiceAccountGoogle(raw);
            return {
              ditemukan: true,
              sumber: 'berkas',
              konten: raw,
              validasi,
            };
          }
        } catch (err: any) {
          return {
            ditemukan: false,
            sumber: 'berkas',
            validasi: {
              valid: false,
              daftarGalat: [`Gagal membaca berkas kredensial dari '${jalurBerkas}': ${err.message}`],
              pesanPeringatan: [],
            },
          };
        }
      }
    }

    return {
      ditemukan: false,
      sumber: 'tidak_ada',
      validasi: {
        valid: false,
        daftarGalat: [
          `Kredensial Service Account Google Play belum diset. Atur variabel lingkungan '${namaEnv}' atau berikan jalur berkas kunci.`,
        ],
        pesanPeringatan: ['Mode simulasi sandbox lokal akan digunakan jika dijalankan tanpa kredensial resmi.'],
      },
    };
  }

  /**
   * Mengambil kredensial App Store Connect API Key (.p8).
   * Prioritas:
   * 1. Environment Variable yang ditentukan atau default 'APP_STORE_CONNECT_PRIVATE_KEY'
   * 2. Berkas lokal .p8 jika ditentukan dan ada di disk
   */
  public ambilKredensialAppStoreConnect(konfig: KonfigurasiAppStoreConnect): {
    ditemukan: boolean;
    sumber: 'env' | 'berkas' | 'tidak_ada';
    issuerId?: string;
    keyId?: string;
    privateKey?: string;
    validasi: HasilValidasiASCKey;
  } {
    const issuerId = konfig.issuerId || SecretProvider.ambilDariEnv('APP_STORE_CONNECT_ISSUER_ID');
    const keyId = konfig.keyId || SecretProvider.ambilDariEnv('APP_STORE_CONNECT_KEY_ID');

    const namaEnvPrivKey = konfig.privateKeyEnv || 'APP_STORE_CONNECT_PRIVATE_KEY';
    let privateKey = SecretProvider.ambilDariEnv(namaEnvPrivKey);

    let sumber: 'env' | 'berkas' | 'tidak_ada' = privateKey ? 'env' : 'tidak_ada';

    if (!privateKey && konfig.privateKeyPath && !konfig.privateKeyPath.includes('\0')) {
      const isNode = typeof window === 'undefined' && typeof process !== 'undefined' && Boolean(process?.versions?.node);
      if (isNode && typeof (fs as any)?.existsSync === 'function') {
        try {
          if ((fs as any).existsSync(konfig.privateKeyPath)) {
            privateKey = (fs as any).readFileSync(konfig.privateKeyPath, 'utf-8');
            sumber = 'berkas';
          }
        } catch {
          // Abaikan
        }
      }
    }

    const validasi = CredentialValidator.validasiAppStoreConnect(issuerId, keyId, privateKey);

    return {
      ditemukan: Boolean(issuerId && keyId && privateKey),
      sumber,
      issuerId,
      keyId,
      privateKey,
      validasi,
    };
  }
}
