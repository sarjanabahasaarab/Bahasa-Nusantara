/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NUSANTARA Phase 42 — explicit public-key trust store.
 *
 * No built-in/example release key is trusted. Production keys must be provisioned
 * from a separately controlled, authenticated release process.
 */
import { HashValidator } from './HashValidator';

export interface KunciPublikTepercaya {
  keyId: string;
  algoritma: 'Ed25519' | 'RSA-SHA256' | 'HMAC-SHA256';
  kunciPublikHex: string;
  kunciPublikPem?: string;
  deskripsi: string;
  tanggalDibuat: string;
  kedaluwarsa?: string;
  aktif: boolean;
}

export class TrustManager {
  private static instance: TrustManager;
  private readonly daftarKunci: Map<string, KunciPublikTepercaya> = new Map();

  private constructor() {
    // Intentionally empty: placeholder/demo keys must never be trusted by default.
  }

  public static dapatkanInstance(): TrustManager {
    if (!TrustManager.instance) TrustManager.instance = new TrustManager();
    return TrustManager.instance;
  }

  private validasiMaterial(kunci: KunciPublikTepercaya): boolean {
    if (!kunci || !/^[A-Za-z0-9._-]{3,128}$/.test(kunci.keyId)) return false;
    if (!['Ed25519', 'RSA-SHA256'].includes(kunci.algoritma)) return false;
    if (!/^[a-fA-F0-9]{64}$/.test(kunci.kunciPublikHex || '')) return false;
    if (typeof kunci.kunciPublikPem !== 'string' || !kunci.kunciPublikPem.includes('-----BEGIN PUBLIC KEY-----')) return false;
    if (HashValidator.hitungSHA256(kunci.kunciPublikPem) !== kunci.kunciPublikHex.toLowerCase()) return false;
    if (!kunci.deskripsi || !Number.isFinite(Date.parse(kunci.tanggalDibuat))) return false;
    if (kunci.kedaluwarsa && !Number.isFinite(Date.parse(kunci.kedaluwarsa))) return false;
    return true;
  }

  public daftarkanKunci(kunci: KunciPublikTepercaya): void {
    if (!this.validasiMaterial(kunci)) {
      throw new Error('Kunci tepercaya ditolak: hanya Ed25519/RSA dengan PEM public key dan fingerprint SHA-256 valid yang dapat didaftarkan. HMAC/placeholder tidak didukung.');
    }
    if (kunci.kedaluwarsa && Date.parse(kunci.kedaluwarsa) <= Date.now()) {
      throw new Error('Kunci tepercaya yang sudah kedaluwarsa tidak dapat didaftarkan.');
    }
    this.daftarKunci.set(kunci.keyId, { ...kunci });
  }

  public dapatkanKunci(keyId: string): KunciPublikTepercaya | undefined {
    const k = this.daftarKunci.get(keyId);
    return k ? { ...k } : undefined;
  }

  public apakahKunciSah(keyId: string): boolean {
    const k = this.daftarKunci.get(keyId);
    if (!k || !k.aktif || !this.validasiMaterial(k)) return false;
    return !k.kedaluwarsa || Date.parse(k.kedaluwarsa) > Date.now();
  }

  public apakahKunciDipercaya(keyId: string): boolean {
    return this.apakahKunciSah(keyId);
  }

  public cabutKunci(keyId: string): boolean {
    const k = this.daftarKunci.get(keyId);
    if (!k) return false;
    k.aktif = false;
    return true;
  }

  public dapatkanSemuaKeyIdAktif(): string[] {
    return Array.from(this.daftarKunci.values())
      .filter((k) => this.apakahKunciSah(k.keyId))
      .map((k) => k.keyId);
  }
}
