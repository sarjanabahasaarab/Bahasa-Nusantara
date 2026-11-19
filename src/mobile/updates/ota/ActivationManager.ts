/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Manajer Aktivasi Atomik Resource OTA (Activation Manager)
 */

import { HasilAktivasiResource } from '../types';
import { RollbackManager } from '../storage/RollbackManager';
import { UpdateSecurityPolicy } from '../security/UpdateSecurityPolicy';

export class ActivationManager {
  private static instance: ActivationManager;
  private resourceAktif: Map<string, string | Uint8Array> = new Map();
  private versiAktif = '0.0.0';

  private constructor() {
    this.inisialisasiResourceBawaan();
  }

  public static dapatkanInstance(): ActivationManager {
    if (!ActivationManager.instance) {
      ActivationManager.instance = new ActivationManager();
    }
    return ActivationManager.instance;
  }

  private inisialisasiResourceBawaan(): void {
    this.resourceAktif.set('themes/default.json', JSON.stringify({ nama: 'Tema Nusantara Bawaan', mode: 'gelap' }));
    this.resourceAktif.set('locales/id.json', JSON.stringify({ sambutan: 'Selamat Datang' }));
  }

  public dapatkanVersiAktif(): string {
    return this.versiAktif;
  }

  public dapatkanSemuaResourceAktif(): Map<string, string | Uint8Array> {
    return new Map(this.resourceAktif);
  }

  public bacaResource(jalurRelatif: string): string | Uint8Array | undefined {
    return this.resourceAktif.get(jalurRelatif);
  }

  /**
   * Mengaktifkan paket resource baru melalui daftar item resource.
   */
  public aktifkanResource(
    versiBaru: string,
    resources: any[],
    platform = 'android'
  ): HasilAktivasiResource {
    const map = new Map<string, string | Uint8Array>();
    if (!Array.isArray(resources) || resources.length === 0) {
      return {
        sukses: false,
        versiAktif: this.versiAktif,
        resourceDiaktifkan: [],
        pesan: 'Daftar resource OTA kosong atau tidak valid.',
        stempelWaktu: new Date().toISOString(),
      };
    }
    for (const r of resources) {
      if (!r || typeof (r.jalurRelatif || r.id) !== 'string' ||
          !(typeof r.konten === 'string' || r.konten instanceof Uint8Array)) {
        return {
          sukses: false,
          versiAktif: this.versiAktif,
          resourceDiaktifkan: [],
          pesan: 'Resource OTA ditolak: payload aktual tidak tersedia. Konten placeholder/mock tidak diizinkan.',
          stempelWaktu: new Date().toISOString(),
        };
      }
      map.set(r.jalurRelatif || r.id, r.konten);
    }
    return this.aktifkanAtomik(versiBaru, map);
  }

  public tetapkanVersiBaseline(versi: string): void {
    this.versiAktif = versi;
  }

  public pulihkanCadangan(versiCadangan: string, berkasCadangan: Map<string, string | Uint8Array>): void {
    this.resourceAktif = new Map(berkasCadangan);
    this.versiAktif = versiCadangan;
  }

  /**
   * Mengaktifkan paket resource baru secara atomik:
   * 1. Validasi path & ekstensi aman (defense-in-depth).
   * 2. Salin resource aktif saat ini ke backup RollbackManager.
   * 3. Terapkan paket baru ke memori aktif.
   * 4. Perbarui pointer versi.
   */
  public aktifkanAtomik(
    versiBaru: string,
    berkasBaru: Map<string, string | Uint8Array>
  ): HasilAktivasiResource {
    if (!berkasBaru || berkasBaru.size === 0) {
      return {
        sukses: false,
        versiAktif: this.versiAktif,
        resourceDiaktifkan: [],
        pesan: 'Tidak ada berkas resource baru yang dapat diaktifkan.',
        stempelWaktu: new Date().toISOString(),
      };
    }

    for (const jalur of berkasBaru.keys()) {
      const cekPath = UpdateSecurityPolicy.periksaPathTraversal(jalur);
      const cekExt = UpdateSecurityPolicy.periksaEkstensiAman(jalur);
      if (!cekPath.valid || !cekExt.valid) {
        return {
          sukses: false,
          versiAktif: this.versiAktif,
          resourceDiaktifkan: [],
          pesan: cekPath.pesan || cekExt.pesan || `Resource '${jalur}' ditolak kebijakan keamanan.`,
          stempelWaktu: new Date().toISOString(),
        };
      }
    }

    const versiLama = this.versiAktif;
    const snapshotLama = new Map(this.resourceAktif);

    // 1. Simpan cadangan untuk rollback
    RollbackManager.dapatkanInstance().simpanCadangan(
      versiLama,
      Array.from(snapshotLama.keys()),
      snapshotLama
    );

    // 2. Terapkan paket baru secara atomik
    const daftarDiaktifkan: string[] = [];
    try {
      for (const [jalur, konten] of berkasBaru.entries()) {
        this.resourceAktif.set(jalur, konten);
        daftarDiaktifkan.push(jalur);
      }

      // 3. Update versi
      this.versiAktif = versiBaru;
    } catch (err: any) {
      this.resourceAktif = snapshotLama;
      this.versiAktif = versiLama;
      return {
        sukses: false,
        versiAktif: versiLama,
        resourceDiaktifkan: [],
        pesan: `Aktivasi OTA terganggu (${err?.message || 'galat tulis'}). State dipulihkan ke versi ${versiLama}.`,
        stempelWaktu: new Date().toISOString(),
      };
    }

    return {
      sukses: true,
      versiAktif: versiBaru,
      versiSebelumnya: versiLama,
      resourceDiaktifkan: daftarDiaktifkan,
      pesan: `Berhasil mengaktifkan ${daftarDiaktifkan.length} resource OTA baru (versi ${versiBaru}).`,
      stempelWaktu: new Date().toISOString(),
    };
  }
}
