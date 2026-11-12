/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Verifikator Tanda Tangan Digital Manifest Pembaruan (Signature Verifier)
 */

import { ManifestPembaruan, TandaTanganManifest } from '../types';
import { TrustManager } from './TrustManager';
import { HashValidator } from './HashValidator';
import { muatModulNode } from '../../../gui/platform/node_bridge';

export interface HasilVerifikasiTandaTangan {
  valid: boolean;
  keyId?: string;
  algoritma?: string;
  modeKripto?: 'ASYMMETRIC_PEM_CRYPTO' | 'HMAC_CRYPTO' | 'PINNED_HEX_LEGACY';
  pesan: string;
  alasan?: string;
}

export class SignatureVerifier {
  /**
   * Menghasilkan pasangan kunci asimetris Ed25519 nyata (PKCS#8 Private PEM & SPKI Public PEM).
   */
  public static buatPasanganKunciEd25519(): {
    kunciPublikPem: string;
    kunciPrivatPem: string;
    fingerprintHex: string;
  } {
    const cryptoMod = muatModulNode<typeof import('node:crypto')>('crypto');
    if (!cryptoMod || typeof cryptoMod.generateKeyPairSync !== 'function') {
      throw new Error('Generasi pasangan kunci Ed25519 hanya tersedia pada runtime Node.js.');
    }
    const { publicKey, privateKey } = cryptoMod.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const fingerprintHex = HashValidator.hitungSHA256(publicKey);
    return {
      kunciPublikPem: publicKey,
      kunciPrivatPem: privateKey,
      fingerprintHex,
    };
  }

  /**
   * Menghasilkan representasi kanonikal dari manifest untuk penandatanganan/verifikasi.
   * Field 'tandaTangan' dikecualikan agar tidak circular.
   */
  public static kanonikalisasiManifest(manifest: ManifestPembaruan): string {
    const salinan: Record<string, any> = { ...manifest };
    delete salinan.tandaTangan;

    // Pengurutan kunci deterministik
    const kunciTerurut = Object.keys(salinan).sort();
    const terurut: Record<string, any> = {};
    for (const k of kunciTerurut) {
      terurut[k] = salinan[k];
    }
    return JSON.stringify(terurut);
  }

  /**
   * Memverifikasi tanda tangan digital yang tersemat pada manifest pembaruan.
   */
  public static verifikasi(manifest: ManifestPembaruan): HasilVerifikasiTandaTangan {
    if (!manifest.tandaTangan) {
      return {
        valid: false,
        pesan: 'Tanda tangan digital tidak ditemukan pada manifest.',
        alasan: 'MISSING_SIGNATURE',
      };
    }

    const { keyId, algoritma, nilaiTandaTangan } = manifest.tandaTangan;
    const trustManager = TrustManager.dapatkanInstance();

    // 1. Periksa apakah keyId terdaftar dan tepercaya
    if (!trustManager.apakahKunciSah(keyId)) {
      return {
        valid: false,
        keyId,
        algoritma,
        pesan: `Kunci '${keyId}' tidak dikenal atau sudah kedaluwarsa/dicabut.`,
        alasan: 'UNTRUSTED_KEY_ID',
      };
    }

    const kunci = trustManager.dapatkanKunci(keyId)!;

    // 2. Hitung digest kanonikal
    const kanonikal = this.kanonikalisasiManifest(manifest);
    const digestKanonikal = HashValidator.hitungSHA256(kanonikal);

    // 3. Verifikasi signature terhadap digest dan public key
    const hasilKripto = this.verifikasiTandaTanganKripto(
      digestKanonikal,
      nilaiTandaTangan,
      kunci.kunciPublikHex,
      algoritma,
      kunci.kunciPublikPem
    );

    if (!hasilKripto.valid) {
      return {
        valid: false,
        keyId,
        algoritma,
        modeKripto: hasilKripto.mode,
        pesan: 'Tanda tangan digital tidak cocok dengan konten manifest. Kemungkinan manipulasi terdeteksi!',
        alasan: 'SIGNATURE_MISMATCH',
      };
    }

    return {
      valid: true,
      keyId,
      algoritma,
      modeKripto: hasilKripto.mode,
      pesan: `Manifest berhasil diverifikasi secara kriptografis menggunakan kunci '${keyId}' (${algoritma}, ${hasilKripto.mode}).`,
    };
  }

  /**
   * Menandatangani manifest (digunakan di Backend / CLI generator).
   */
  public static tandaTangani(
    manifest: ManifestPembaruan,
    keyId = 'nusantara-root-release-2026',
    kunciPrivatPemOrHex?: string,
    algoritma: 'Ed25519' | 'RSA-SHA256' | 'HMAC-SHA256' = 'Ed25519'
  ): ManifestPembaruan {
    const tm = TrustManager.dapatkanInstance();
    const kunci = tm.dapatkanKunci(keyId);
    const privMaterial = kunciPrivatPemOrHex || (kunci ? kunci.kunciPublikHex : 'mock_priv_key');
    const kanonikal = this.kanonikalisasiManifest(manifest);
    const digest = HashValidator.hitungSHA256(kanonikal);
    const nilaiTandaTangan = this.buatTandaTanganKripto(digest, privMaterial, algoritma);

    const tandaTangan: TandaTanganManifest = {
      algoritma,
      keyId,
      nilaiTandaTangan,
      stempelWaktu: new Date().toISOString(),
    };

    return {
      ...manifest,
      tandaTangan,
    };
  }

  /**
   * Menghasilkan tanda tangan kriptografis asimetris nyata (Ed25519 / RSA-SHA256 PEM),
   * HMAC-SHA256, atau fallback hash-pinned untuk kunci hex legacy.
   */
  private static buatTandaTanganKripto(
    digest: string,
    kunciPrivatPemOrHex: string,
    algoritma: string
  ): string {
    const isPem = kunciPrivatPemOrHex.includes('-----BEGIN ');
    if (isPem) {
      const cryptoMod = muatModulNode<typeof import('node:crypto')>('crypto');
      if (!cryptoMod || typeof cryptoMod.sign !== 'function') {
        throw new Error(`Penandatanganan ${algoritma} PEM membutuhkan runtime Node.js crypto.`);
      }
      if (algoritma === 'Ed25519') {
        return cryptoMod.sign(null, Buffer.from(digest, 'utf8'), kunciPrivatPemOrHex).toString('hex');
      }
      if (algoritma === 'RSA-SHA256') {
        return cryptoMod.sign('RSA-SHA256', Buffer.from(digest, 'utf8'), kunciPrivatPemOrHex).toString('hex');
      }
    }

    if (algoritma === 'HMAC-SHA256') {
      const cryptoMod = muatModulNode<typeof import('node:crypto')>('crypto');
      if (cryptoMod && typeof cryptoMod.createHmac === 'function') {
        return cryptoMod.createHmac('sha256', kunciPrivatPemOrHex).update(digest).digest('hex');
      }
    }

    const gabungan = `${digest}:${kunciPrivatPemOrHex}:${algoritma}`;
    return HashValidator.hitungSHA256(gabungan);
  }

  /**
   * Memverifikasi tanda tangan kriptografis terhadap digest kanonikal.
   */
  private static verifikasiTandaTanganKripto(
    digest: string,
    signatureHex: string,
    kunciPublikHex: string,
    algoritma: string,
    kunciPublikPem?: string
  ): { valid: boolean; mode: 'ASYMMETRIC_PEM_CRYPTO' | 'HMAC_CRYPTO' | 'PINNED_HEX_LEGACY' } {
    if (kunciPublikPem && kunciPublikPem.includes('-----BEGIN ')) {
      const cryptoMod = muatModulNode<typeof import('node:crypto')>('crypto');
      if (!cryptoMod || typeof cryptoMod.verify !== 'function') {
        return { valid: false, mode: 'ASYMMETRIC_PEM_CRYPTO' };
      }
      try {
        const sigBuf = Buffer.from(signatureHex.trim(), 'hex');
        if (sigBuf.length === 0) {
          return { valid: false, mode: 'ASYMMETRIC_PEM_CRYPTO' };
        }
        if (algoritma === 'Ed25519') {
          const ok = cryptoMod.verify(null, Buffer.from(digest, 'utf8'), kunciPublikPem, sigBuf);
          return { valid: ok, mode: 'ASYMMETRIC_PEM_CRYPTO' };
        }
        if (algoritma === 'RSA-SHA256') {
          const ok = cryptoMod.verify('RSA-SHA256', Buffer.from(digest, 'utf8'), kunciPublikPem, sigBuf);
          return { valid: ok, mode: 'ASYMMETRIC_PEM_CRYPTO' };
        }
      } catch {
        return { valid: false, mode: 'ASYMMETRIC_PEM_CRYPTO' };
      }
      return { valid: false, mode: 'ASYMMETRIC_PEM_CRYPTO' };
    }

    if (algoritma === 'HMAC-SHA256') {
      const cryptoMod = muatModulNode<typeof import('node:crypto')>('crypto');
      if (cryptoMod && typeof cryptoMod.createHmac === 'function' && typeof cryptoMod.timingSafeEqual === 'function') {
        try {
          const expectedHex = cryptoMod.createHmac('sha256', kunciPublikHex).update(digest).digest('hex');
          const a = Buffer.from(signatureHex.toLowerCase().trim(), 'utf8');
          const b = Buffer.from(expectedHex.toLowerCase(), 'utf8');
          return {
            valid: a.length === b.length && cryptoMod.timingSafeEqual(a, b),
            mode: 'HMAC_CRYPTO',
          };
        } catch {
          return { valid: false, mode: 'HMAC_CRYPTO' };
        }
      }
    }

    const expected = HashValidator.hitungSHA256(`${digest}:${kunciPublikHex}:${algoritma}`);
    return {
      valid: signatureHex.toLowerCase().trim() === expected.toLowerCase().trim(),
      mode: 'PINNED_HEX_LEGACY',
    };
  }
}
