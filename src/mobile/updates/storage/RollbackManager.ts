/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Pengelola Pemulihan & Rollback Resource OTA (Resource Rollback Manager)
 */

import { UpdateCache } from './UpdateCache';
import { UpdateHistoryManager } from './UpdateHistory';
import { PlatformMobile } from '../types';

export interface PaketCadanganResource {
  versi: string;
  stempelWaktu: string;
  resourceIds: string[];
  berkas: Map<string, string | Uint8Array>;
  deskripsi: string;
}

export class RollbackManager {
  private static instance: RollbackManager;
  private cadanganSebelumnya?: PaketCadanganResource;
  private cache: UpdateCache;

  private constructor() {
    this.cache = new UpdateCache();
    this.inisialisasiCadanganAwal();
  }

  public static dapatkanInstance(): RollbackManager {
    if (!RollbackManager.instance) {
      RollbackManager.instance = new RollbackManager();
    }
    return RollbackManager.instance;
  }

  private inisialisasiCadanganAwal(): void {
    const berkasMap = new Map<string, string>();
    berkasMap.set('themes/default.json', JSON.stringify({ nama: 'Tema Bawaan Nusantara', mode: 'terang' }));
    berkasMap.set('locales/id.json', JSON.stringify({ judul: 'Nusantara', sambutan: 'Selamat Datang' }));

    this.cadanganSebelumnya = {
      versi: '0.41.0',
      stempelWaktu: new Date(Date.now() - 86400000).toISOString(),
      resourceIds: ['theme-default', 'locale-id-v0.41.0'],
      berkas: berkasMap,
      deskripsi: 'Cadangan stabil versi 0.41.0',
    };
  }

  /**
   * Menyimpan cadangan resource sebelum mengaktifkan versi baru.
   */
  public simpanCadangan(versi: string, resourceIds: string[], berkasAktif: Map<string, string | Uint8Array>): void {
    this.cadanganSebelumnya = {
      versi,
      stempelWaktu: new Date().toISOString(),
      resourceIds: [...resourceIds],
      berkas: new Map(berkasAktif),
      deskripsi: `Cadangan otomatis sebelum aktivasi versi ${versi}`,
    };
  }

  public apakahCadanganTersedia(): boolean {
    return Boolean(this.cadanganSebelumnya && this.cadanganSebelumnya.berkas.size > 0);
  }

  public dapatkanInfoCadangan(): PaketCadanganResource | undefined {
    return this.cadanganSebelumnya;
  }

  /**
   * Melakukan rollback resource non-eksekusi ke versi cadangan sebelumnya.
   */
  public eksekusiRollback(
    platform: PlatformMobile = 'android',
    onPulihkan?: (versi: string, berkas: Map<string, string | Uint8Array>) => void
  ): {
    sukses: boolean;
    versiDipulihkan?: string;
    totalBerkas: number;
    berkasDipulihkan?: Map<string, string | Uint8Array>;
    pesan: string;
  } {
    if (!this.apakahCadanganTersedia()) {
      return {
        sukses: false,
        totalBerkas: 0,
        pesan: 'Tidak ada cadangan resource stabil sebelumnya yang dapat dipulihkan.',
      };
    }

    const cadangan = this.cadanganSebelumnya!;
    if (onPulihkan) {
      onPulihkan(cadangan.versi, cadangan.berkas);
    }

    // Catat ke riwayat
    UpdateHistoryManager.dapatkanInstance().catat({
      platform,
      versiSebelum: 'terkini',
      versiSesudah: cadangan.versi,
      saluran: 'stable',
      jenisPembaruan: 'ota_resource',
      status: 'rollback',
      resourceIds: cadangan.resourceIds,
      pesan: `Rollback resource non-eksekusi ke versi stabil '${cadangan.versi}' berhasil diselesaikan.`,
      durasiMs: 320,
    });

    return {
      sukses: true,
      versiDipulihkan: cadangan.versi,
      totalBerkas: cadangan.berkas.size,
      berkasDipulihkan: new Map(cadangan.berkas),
      pesan: `Resource berhasil di-rollback ke versi ${cadangan.versi} (${cadangan.berkas.size} berkas dipulihkan).`,
    };
  }
}
