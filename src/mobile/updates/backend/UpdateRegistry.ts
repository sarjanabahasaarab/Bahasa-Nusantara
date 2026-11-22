/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Registri Rilis & Manifest Server Backend (Update Registry)
 */

import { ManifestPembaruan, SaluranPembaruan, PlatformMobile } from '../types';
import { ManifestValidator } from '../manifest/ManifestValidator';
import { SignatureVerifier } from '../security/SignatureVerifier';

export class UpdateRegistry {
  private static instance: UpdateRegistry;
  private manifestStore: Map<string, ManifestPembaruan> = new Map();

  private constructor() {
    // Tidak ada manifest bawaan: semua rilis wajib divalidasi dan ditandatangani.
  }

  public static dapatkanInstance(): UpdateRegistry {
    if (!UpdateRegistry.instance) {
      UpdateRegistry.instance = new UpdateRegistry();
    }
    return UpdateRegistry.instance;
  }

  /**
   * Mendaftarkan snapshot manifest hanya setelah validasi skema dan verifikasi
   * tanda tangan asimetris terhadap trust store. Manifest unsigned/tampered ditolak.
   */
  public daftarkanManifest(manifest: ManifestPembaruan): void {
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Manifest pembaruan harus berupa objek yang valid.');
    }

    // Snapshot JSON mencegah pemanggil mengubah objek setelah pemeriksaan.
    let snapshot: ManifestPembaruan;
    try {
      snapshot = JSON.parse(JSON.stringify(manifest)) as ManifestPembaruan;
    } catch {
      throw new Error('Manifest pembaruan tidak dapat diserialisasi sebagai JSON.');
    }

    const validasi = ManifestValidator.validasi(snapshot);
    if (!validasi.valid) {
      throw new Error(`Manifest pembaruan ditolak: ${validasi.pesanGalat.join('; ')}`);
    }

    const verifikasi = SignatureVerifier.verifikasi(snapshot);
    if (!verifikasi.valid) {
      throw new Error(`Manifest pembaruan ditolak karena tanda tangan tidak sah: ${verifikasi.alasan || verifikasi.pesan}`);
    }

    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      throw new Error('Manifest pembaruan ditolak: revision harus bilangan bulat aman mulai dari 1.');
    }

    const k = this.buatKunci(snapshot.applicationId, snapshot.platform, snapshot.channel);
    const current = this.manifestStore.get(k);
    if (current && snapshot.revision <= current.revision) {
      throw new Error(
        `Manifest pembaruan ditolak: revision ${snapshot.revision} tidak lebih tinggi dari revision aktif ${current.revision} (anti-replay/anti-rollback).`
      );
    }
    this.manifestStore.set(k, snapshot);
  }

  public ambilManifest(
    applicationId: string,
    platform: PlatformMobile | 'keduanya',
    channel: SaluranPembaruan
  ): ManifestPembaruan | undefined {
    let manifest = this.manifestStore.get(this.buatKunci(applicationId, platform, channel));
    if (!manifest && platform !== 'keduanya') {
      manifest = this.manifestStore.get(this.buatKunci(applicationId, 'keduanya', channel));
    }
    // Kembalikan salinan agar konsumen tidak dapat mengubah data tepercaya di registry.
    return manifest ? JSON.parse(JSON.stringify(manifest)) as ManifestPembaruan : undefined;
  }

  private buatKunci(appId: string, platform: string, channel: string): string {
    return `${appId}:${platform}:${channel}`;
  }
}
