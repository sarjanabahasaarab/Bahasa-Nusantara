/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Pengelola Kunci Publik Tepercaya & Rotasi Kunci (Trust Manager)
 */

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
  private daftarKunci: Map<string, KunciPublikTepercaya> = new Map();

  private constructor() {
    this.inisialisasiKunciBawaan();
  }

  public static dapatkanInstance(): TrustManager {
    if (!TrustManager.instance) {
      TrustManager.instance = new TrustManager();
    }
    return TrustManager.instance;
  }

  /**
   * Menginisialisasi kunci publik resmi NUSANTARA Release Team.
   */
  private inisialisasiKunciBawaan(): void {
    // Kunci produksi default resmi (Pinned Public Key)
    this.daftarKunci.set('nusantara-ota-root-2026', {
      keyId: 'nusantara-ota-root-2026',
      algoritma: 'Ed25519',
      kunciPublikHex: 'a7c9f4d1e8b35a60c7f21d9e4a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
      deskripsi: 'NUSANTARA Official OTA Root Release Key 2026',
      tanggalDibuat: '2026-01-01T00:00:00Z',
      aktif: true,
    });

    this.daftarKunci.set('nusantara-root-release-2026', {
      keyId: 'nusantara-root-release-2026',
      algoritma: 'Ed25519',
      kunciPublikHex: 'a7c9f4d1e8b35a60c7f21d9e4a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
      deskripsi: 'NUSANTARA Official Release Root Key 2026',
      tanggalDibuat: '2026-01-01T00:00:00Z',
      aktif: true,
    });

    // Kunci sekunder untuk rotasi aman
    this.daftarKunci.set('nusantara-ota-backup-2026', {
      keyId: 'nusantara-ota-backup-2026',
      algoritma: 'Ed25519',
      kunciPublikHex: 'b8da05e2f9c46b71d8a32e0f5b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c',
      deskripsi: 'NUSANTARA Official OTA Backup Key 2026',
      tanggalDibuat: '2026-01-01T00:00:00Z',
      aktif: true,
    });
  }

  /**
   * Mendaftarkan kunci publik tepercaya baru (misal saat rotasi kunci).
   */
  public daftarkanKunci(kunci: KunciPublikTepercaya): void {
    this.daftarKunci.set(kunci.keyId, { ...kunci });
  }

  /**
   * Mengambil kunci publik berdasarkan keyId.
   */
  public dapatkanKunci(keyId: string): KunciPublikTepercaya | undefined {
    return this.daftarKunci.get(keyId);
  }

  /**
   * Memeriksa apakah suatu keyId terdaftar dan berstatus aktif.
   */
  public apakahKunciSah(keyId: string): boolean {
    const k = this.daftarKunci.get(keyId);
    if (!k || !k.aktif) return false;
    if (k.kedaluwarsa && new Date(k.kedaluwarsa).getTime() < Date.now()) {
      return false;
    }
    return true;
  }

  /**
   * Alias bahasa Indonesia/Inggris untuk apakahKunciSah.
   */
  public apakahKunciDipercaya(keyId: string): boolean {
    return this.apakahKunciSah(keyId);
  }

  /**
   * Menghapus atau menonaktifkan kunci lama saat terjadi pembatalan (revocation).
   */
  public cabutKunci(keyId: string): boolean {
    const k = this.daftarKunci.get(keyId);
    if (k) {
      k.aktif = false;
      return true;
    }
    return false;
  }

  /**
   * Mengambil daftar seluruh keyId yang aktif.
   */
  public dapatkanSemuaKeyIdAktif(): string[] {
    return Array.from(this.daftarKunci.values())
      .filter((k) => k.aktif)
      .map((k) => k.keyId);
  }
}
