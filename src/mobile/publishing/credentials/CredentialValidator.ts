/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 41
 * Validator Kredensial Toko Aplikasi (Credential Validator)
 */

export interface HasilValidasiGooglePlayKey {
  valid: boolean;
  email?: string;
  projectId?: string;
  daftarGalat: string[];
  pesanPeringatan: string[];
}

export interface HasilValidasiASCKey {
  valid: boolean;
  issuerId?: string;
  keyId?: string;
  adaPrivateKey: boolean;
  daftarGalat: string[];
  pesanPeringatan: string[];
}

export class CredentialValidator {
  /**
   * Validasi format kredensial Google Play Service Account JSON.
   */
  public static validasiServiceAccountGoogle(raw: string | Record<string, any>): HasilValidasiGooglePlayKey {
    const daftarGalat: string[] = [];
    const pesanPeringatan: string[] = [];

    let obj: Record<string, any>;
    if (typeof raw === 'string') {
      try {
        obj = JSON.parse(raw);
      } catch {
        return {
          valid: false,
          daftarGalat: ['Format JSON Service Account tidak sah atau rusak.'],
          pesanPeringatan,
        };
      }
    } else {
      obj = raw;
    }

    if (!obj || typeof obj !== 'object') {
      return { valid: false, daftarGalat: ['Data Service Account harus berupa obyek JSON.'], pesanPeringatan };
    }

    if (obj.type !== 'service_account') {
      daftarGalat.push(`Field 'type' harus 'service_account' (ditemukan: '${obj.type || 'kosong'}').`);
    }

    if (!obj.project_id || typeof obj.project_id !== 'string') {
      daftarGalat.push("Field 'project_id' wajib diisi pada Google Service Account.");
    }

    if (!obj.client_email || !obj.client_email.includes('@')) {
      daftarGalat.push("Field 'client_email' tidak valid atau kosong.");
    } else if (!obj.client_email.endsWith('.gserviceaccount.com')) {
      pesanPeringatan.push("Email akun layanan biasanya diakhiri dengan '.gserviceaccount.com'.");
    }

    if (!obj.private_key || typeof obj.private_key !== 'string') {
      daftarGalat.push("Field 'private_key' wajib ada pada Google Service Account.");
    } else if (
      !/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+-----END (?:RSA )?PRIVATE KEY-----/.test(obj.private_key)
    ) {
      daftarGalat.push("Field 'private_key' tidak memuat blok PEM PKCS#8 lengkap ('BEGIN' dan 'END PRIVATE KEY').");
    }

    return {
      valid: daftarGalat.length === 0,
      email: obj.client_email,
      projectId: obj.project_id,
      daftarGalat,
      pesanPeringatan,
    };
  }

  /**
   * Validasi kredensial App Store Connect API (Issuer ID, Key ID, Private Key .p8).
   */
  public static validasiAppStoreConnect(issuerId?: string, keyId?: string, privateKey?: string): HasilValidasiASCKey {
    const daftarGalat: string[] = [];
    const pesanPeringatan: string[] = [];

    // 1. Validasi Issuer ID (UUID Format 8-4-4-4-12)
    const adaIssuer = Boolean(issuerId && issuerId.trim().length > 0);
    if (!adaIssuer) {
      daftarGalat.push('Issuer ID App Store Connect belum ditentukan.');
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(issuerId!.trim())) {
        pesanPeringatan.push(`Format Issuer ID '${issuerId}' biasanya berupa UUID v4 (contoh: 57246542-96fe-1a63-e053-0824d011072a).`);
      }
    }

    // 2. Validasi Key ID (Apple Key ID biasanya 10 karakter alfanumerik)
    const adaKeyId = Boolean(keyId && keyId.trim().length > 0);
    if (!adaKeyId) {
      daftarGalat.push('Key ID App Store Connect belum ditentukan.');
    } else {
      const keyIdBersih = keyId!.trim();
      if (keyIdBersih.length !== 10) {
        pesanPeringatan.push(`Key ID Apple biasanya berpanjang tepat 10 karakter (contoh: '2X9R4HXF34', ditemukan: ${keyIdBersih.length} karakter).`);
      }
    }

    // 3. Validasi Private Key (.p8 / PKCS#8 / EC)
    const adaPrivKey = Boolean(privateKey && privateKey.trim().length > 0);
    if (!adaPrivKey) {
      daftarGalat.push('Private Key App Store Connect (.p8) belum ditentukan.');
    } else {
      const privKeyBersih = privateKey!.trim();
      if (!/-----BEGIN (?:EC )?PRIVATE KEY-----[\s\S]+-----END (?:EC )?PRIVATE KEY-----/.test(privKeyBersih)) {
        daftarGalat.push("Kunci privat App Store Connect harus dalam format PEM/PKCS#8 lengkap ('BEGIN' hingga 'END PRIVATE KEY').");
      }
    }

    return {
      valid: daftarGalat.length === 0,
      issuerId,
      keyId,
      adaPrivateKey: adaPrivKey,
      daftarGalat,
      pesanPeringatan,
    };
  }

  /**
   * Memeriksa konfigurasi terhadap pola rahasia hardcoded.
   */
  public static periksaBebasHardcode(konten: string): { aman: boolean; temuan: string[] } {
    const temuan: string[] = [];

    if (/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/i.test(konten)) {
      temuan.push('Ditemukan blok PEM Private Key mentah di dalam berkas.');
    }

    if (/"private_key":\s*"-----BEGIN/i.test(konten)) {
      temuan.push("Ditemukan JSON Service Account dengan 'private_key' plaintext.");
    }

    if (/\b(?:api_secret|client_secret|storePassword)\s*[:=]\s*["'][^"']{4,}["']/i.test(konten)) {
      temuan.push('Ditemukan rahasia/kredensial hardcoded dalam berkas konfigurasi.');
    }

    return {
      aman: temuan.length === 0,
      temuan,
    };
  }
}
