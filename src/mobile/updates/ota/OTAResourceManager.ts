/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Manajer Pembaruan Resource OTA Terpadu (OTA Resource Manager)
 */

import { ManifestPembaruan, HasilAktivasiResource } from '../types';
import { SecureDownloadManager, OpsiUnduhan } from './DownloadManager';
import { IntegrityValidator, HasilVerifikasiIntegritasPaket } from './IntegrityValidator';
import { ActivationManager } from './ActivationManager';
import { SignatureVerifier } from '../security/SignatureVerifier';
import { UpdateStateManager } from '../storage/UpdateState';
import { UpdateHistoryManager } from '../storage/UpdateHistory';

export class OTAResourceManager {
  private downloadManager: SecureDownloadManager;
  private stateManager: UpdateStateManager;
  private historyManager: UpdateHistoryManager;

  constructor() {
    this.downloadManager = new SecureDownloadManager();
    this.stateManager = UpdateStateManager.dapatkanInstance();
    this.historyManager = UpdateHistoryManager.dapatkanInstance();
  }

  /**
   * Menjalankan siklus penuh unduh, verifikasi integritas, verifikasi tanda tangan, dan aktivasi.
   */
  public async terapkanPembaruanOTA(
    manifest: ManifestPembaruan,
    opsi: OpsiUnduhan = {}
  ): Promise<{
    sukses: boolean;
    aktivasi?: HasilAktivasiResource;
    integritas?: HasilVerifikasiIntegritasPaket;
    pesan: string;
  }> {
    const awal = Date.now();
    this.stateManager.transisi('downloading', 'Mengunduh paket resource OTA...');

    // 1. Verifikasi Tanda Tangan Digital Manifest terlebih dahulu
    const verifSignature = SignatureVerifier.verifikasi(manifest);
    if (!verifSignature.valid) {
      this.stateManager.transisi('failed', `Verifikasi tanda tangan manifest gagal: ${verifSignature.pesan}`);
      return {
        sukses: false,
        pesan: verifSignature.pesan,
      };
    }

    // 2. Unduh daftar resource
    const hasilUnduhan = await this.downloadManager.unduhDaftarResource(manifest.resources, opsi);
    if (!hasilUnduhan.sukses) {
      const statusAkhir = hasilUnduhan.dibatalkan ? 'cancelled' : 'failed';
      this.stateManager.transisi(statusAkhir, hasilUnduhan.pesan);
      return {
        sukses: false,
        pesan: hasilUnduhan.pesan,
      };
    }

    // 3. Verifikasi Integritas SHA-256
    this.stateManager.transisi('verifying', 'Memverifikasi integritas SHA-256 berkas resource...');
    const integritas = IntegrityValidator.validasiSemuaResource(
      manifest.resources,
      hasilUnduhan.hasilUnduhan
    );

    if (!integritas.valid) {
      this.stateManager.transisi('failed', `Integritas berkas tidak cocok: ${integritas.pesan}`);
      return {
        sukses: false,
        integritas,
        pesan: integritas.pesan,
      };
    }

    // 4. Tahap Staging (simpan ke cache disk/memori lokal)
    const { UpdateCache } = await import('../storage/UpdateCache');
    const cache = new UpdateCache();
    for (const [jalurRelatif, konten] of hasilUnduhan.hasilUnduhan.entries()) {
      cache.simpanBerkasStaging(jalurRelatif, konten);
    }
    this.stateManager.transisi('staged', 'Berkas divalidasi dan disiapkan di staging untuk aktivasi atomik.');

    // 5. Aktivasi Atomik
    this.stateManager.transisi('activating', 'Mengaktifkan resource baru secara atomik...');
    const aktivasi = ActivationManager.dapatkanInstance().aktifkanAtomik(
      manifest.releaseVersion,
      hasilUnduhan.hasilUnduhan
    );

    if (!aktivasi.sukses) {
      this.stateManager.transisi('failed', aktivasi.pesan);
      return {
        sukses: false,
        aktivasi,
        integritas,
        pesan: aktivasi.pesan,
      };
    }

    this.stateManager.transisi('completed', `Pembaruan resource versi ${manifest.releaseVersion} berhasil diterapkan.`);

    // 6. Catat riwayat
    this.historyManager.catat({
      platform: manifest.platform === 'keduanya' ? 'android' : manifest.platform,
      versiSebelum: aktivasi.versiSebelumnya || '0.41.0',
      versiSesudah: manifest.releaseVersion,
      saluran: manifest.channel,
      jenisPembaruan: manifest.updateType,
      status: 'sukses',
      resourceIds: manifest.resources.map((r) => r.id),
      pesan: `Pembaruan resource OTA versi ${manifest.releaseVersion} berhasil diterapkan.`,
      durasiMs: Date.now() - awal,
    });

    return {
      sukses: true,
      aktivasi,
      integritas,
      pesan: aktivasi.pesan,
    };
  }
}
