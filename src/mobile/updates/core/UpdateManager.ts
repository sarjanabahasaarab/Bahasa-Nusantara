/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Fasad Utama Pengelola Sistem Pembaruan & OTA (Update Manager)
 */

import {
  HasilPemeriksaanVersi,
  ManifestPembaruan,
  PlatformMobile,
  SaluranPembaruan,
  LaporanPembaruanLengkap,
  HasilAktivasiResource,
} from '../types';
import { VersionChecker } from './VersionChecker';
import { UpdateChannelManager } from './UpdateChannel';
import { UpdatePolicyManager, EvaluasiKebijakan } from './UpdatePolicy';
import { UpdateRegistry } from '../backend/UpdateRegistry';
import { OTAResourceManager } from '../ota/OTAResourceManager';
import { ActivationManager } from '../ota/ActivationManager';
import { RollbackManager } from '../storage/RollbackManager';
import { UpdateStateManager } from '../storage/UpdateState';
import { UpdateHistoryManager } from '../storage/UpdateHistory';
import { GooglePlayInAppUpdate } from '../store/GooglePlayInAppUpdate';
import { AppleAppStoreUpdate } from '../store/AppleAppStoreUpdate';
import { SignatureVerifier } from '../security/SignatureVerifier';
import { UpdateNotificationManager } from '../notification/UpdateNotification';

export class UpdateManager {
  private static instance: UpdateManager;

  private channelManager: UpdateChannelManager;
  private otaManager: OTAResourceManager;
  private stateManager: UpdateStateManager;
  private historyManager: UpdateHistoryManager;
  private notificationManager: UpdateNotificationManager;

  private applicationId = 'id.nusantara.aplikasi';
  private versiTerpasang = '0.0.0';
  private revisiTerpasang = 0;
  private revisiPerVersi: Map<string, number> = new Map();
  private platform: PlatformMobile = 'android';

  private constructor() {
    this.channelManager = new UpdateChannelManager('stable');
    this.otaManager = new OTAResourceManager();
    this.stateManager = UpdateStateManager.dapatkanInstance();
    this.historyManager = UpdateHistoryManager.dapatkanInstance();
    this.notificationManager = UpdateNotificationManager.dapatkanInstance();
  }

  public static dapatkanInstance(): UpdateManager {
    if (!UpdateManager.instance) {
      UpdateManager.instance = new UpdateManager();
    }
    return UpdateManager.instance;
  }

  public konfigurasiAplikasi(appId: string, versi: string, platform: PlatformMobile = 'android', revisi: number = 0): void {
    this.applicationId = appId;
    this.versiTerpasang = versi;
    this.revisiTerpasang = revisi;
    this.revisiPerVersi = new Map([[versi, revisi]]);
    this.platform = platform;
    ActivationManager.dapatkanInstance().tetapkanVersiBaseline(versi);
  }

  public dapatkanVersiTerpasang(): string {
    return this.versiTerpasang;
  }

  public dapatkanApplicationId(): string {
    return this.applicationId;
  }

  public dapatkanPlatform(): PlatformMobile {
    return this.platform;
  }

  public dapatkanSaluranManager(): UpdateChannelManager {
    return this.channelManager;
  }

  public dapatkanStateManager(): UpdateStateManager {
    return this.stateManager;
  }

  /**
   * Memeriksa ketersediaan pembaruan (store binary atau OTA resource).
   */
  public periksaPembaruan(): {
    hasil: HasilPemeriksaanVersi;
    evaluasi: EvaluasiKebijakan;
    manifest?: ManifestPembaruan;
  } {
    this.stateManager.transisi('checking', 'Memeriksa ketersediaan pembaruan ke server...');

    const channel = this.channelManager.dapatkanSaluranAktif();
    const manifest = UpdateRegistry.dapatkanInstance().ambilManifest(
      this.applicationId,
      this.platform,
      channel
    );

    if (!manifest) {
      const fallbackHasil: HasilPemeriksaanVersi = {
        adaPembaruan: false,
        status: 'TERBARU',
        versiTerpasang: this.versiTerpasang,
        versiTerbaru: this.versiTerpasang,
        versiMinimum: '0.40.0',
        perluPembaruanWajib: false,
        jenisPembaruan: 'ota_resource',
        saluran: channel,
        kebijakan: 'opsional',
        catatanRilis: { id: 'Aplikasi versi stabil terkini.' },
        totalUkuranResourceByte: 0,
        pesan: 'Tidak ditemukan paket pembaruan baru di server.',
      };
      this.stateManager.transisi('idle', fallbackHasil.pesan);
      return {
        hasil: fallbackHasil,
        evaluasi: UpdatePolicyManager.evaluasi(fallbackHasil),
      };
    }

    const hasil = VersionChecker.periksaKetersediaan(
      this.versiTerpasang,
      this.applicationId,
      this.platform,
      manifest
    );

    const evaluasi = UpdatePolicyManager.evaluasi(hasil);

    if (hasil.adaPembaruan) {
      this.stateManager.transisi(
        hasil.perluPembaruanWajib ? 'requires_store_update' : 'available',
        hasil.pesan,
        {
          versiTarget: manifest.releaseVersion,
          saluran: channel,
          manifestAktif: manifest,
        }
      );

      // Kirim notifikasi jika diizinkan
      this.notificationManager.kirimNotifikasi({
        judul: hasil.perluPembaruanWajib ? 'Pembaruan Wajib Aplikasi!' : 'Pembaruan Tersedia',
        pesan: manifest.releaseNotes.id || `Versi v${manifest.releaseVersion} telah dirilis.`,
        versiTarget: manifest.releaseVersion,
        tipe: hasil.perluPembaruanWajib ? 'wajib' : 'tersedia',
        intervalJam: evaluasi.intervalPengingatJam,
      });
    } else {
      this.stateManager.transisi('idle', hasil.pesan);
    }

    return {
      hasil,
      evaluasi,
      manifest,
    };
  }

  /**
   * Mengambil manifest pembaruan langsung dari server HTTP/HTTPS OTA,
   * memvalidasi URL, skema manifest, serta memverifikasi tanda tangan digitalnya.
   */
  public async periksaPembaruanJarakJauh(manifestUrl: string, timeoutMs = 15000): Promise<{
    sukses: boolean;
    hasil?: HasilPemeriksaanVersi;
    evaluasi?: EvaluasiKebijakan;
    manifest?: ManifestPembaruan;
    signatureValid: boolean;
    pesan: string;
  }> {
    const { UpdateSecurityPolicy } = await import('../security/UpdateSecurityPolicy');
    const { ManifestValidator } = await import('../manifest/ManifestValidator');

    const cekUrl = UpdateSecurityPolicy.validasiURL(manifestUrl);
    if (!cekUrl.valid) {
      return { sukses: false, signatureValid: false, pesan: cekUrl.pesan || 'URL tidak valid' };
    }

    this.stateManager.transisi('checking', `Mengambil manifest OTA dari ${manifestUrl}...`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(manifestUrl, { signal: controller.signal });
      if (!resp.ok) {
        this.stateManager.transisi('failed', `Server OTA mengembalikan HTTP ${resp.status}`);
        return { sukses: false, signatureValid: false, pesan: `HTTP ${resp.status} saat mengambil manifest.` };
      }

      const manifest = (await resp.json()) as ManifestPembaruan;
      const validasiSkema = ManifestValidator.validasi(manifest);
      if (!validasiSkema.valid) {
        this.stateManager.transisi('failed', validasiSkema.pesanGalat.join('; '));
        return {
          sukses: false,
          manifest,
          signatureValid: false,
          pesan: `Skema manifest tidak valid: ${validasiSkema.pesanGalat.join(', ')}`,
        };
      }

      const verifSig = SignatureVerifier.verifikasi(manifest);
      if (!verifSig.valid) {
        this.stateManager.transisi('failed', verifSig.pesan);
        return {
          sukses: false,
          manifest,
          signatureValid: false,
          pesan: verifSig.pesan,
        };
      }

      UpdateRegistry.dapatkanInstance().daftarkanManifest(manifest);
      const hasil = VersionChecker.periksaKetersediaan(
        this.versiTerpasang,
        this.applicationId,
        this.platform,
        manifest
      );
      const evaluasi = UpdatePolicyManager.evaluasi(hasil);
      this.stateManager.transisi(
        hasil.adaPembaruan ? (hasil.perluPembaruanWajib ? 'requires_store_update' : 'available') : 'idle',
        hasil.pesan,
        { versiTarget: manifest.releaseVersion, saluran: manifest.channel, manifestAktif: manifest }
      );
      return {
        sukses: true,
        hasil,
        evaluasi,
        manifest,
        signatureValid: true,
        pesan: hasil.pesan,
      };
    } catch (err: any) {
      this.stateManager.transisi('failed', err?.message || 'Galat jaringan OTA');
      return { sukses: false, signatureValid: false, pesan: err?.message || 'Galat jaringan OTA' };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Menerapkan paket OTA langsung dari sebuah objek manifest terverifikasi.
   */
  public async terapkanManifestOTA(manifest: ManifestPembaruan): Promise<{
    sukses: boolean;
    aktivasi?: HasilAktivasiResource;
    pesan: string;
  }> {
    if (manifest.updateType === 'native_store') {
      return {
        sukses: false,
        pesan: 'Pembaruan ini adalah Native Binary Update. Harus diperbarui melalui Google Play Store atau Apple App Store.',
      };
    }

    if (manifest.applicationId !== this.applicationId) {
      return {
        sukses: false,
        pesan: `Application ID manifest ('${manifest.applicationId}') tidak cocok dengan aplikasi terpasang ('${this.applicationId}').`,
      };
    }

    const cmpVer = VersionChecker.bandingkan(manifest.releaseVersion, this.versiTerpasang);
    if (cmpVer < 0) {
      this.stateManager.transisi('failed', `Penolakan anti-downgrade OTA: ${manifest.releaseVersion} < ${this.versiTerpasang}`);
      return {
        sukses: false,
        pesan: `Pembaruan OTA ditolak (anti-downgrade): versi target '${manifest.releaseVersion}' lebih rendah daripada versi terpasang '${this.versiTerpasang}'.`,
      };
    }
    const revisiTercatat = this.revisiPerVersi.get(manifest.releaseVersion) ?? -1;
    if (cmpVer === 0 && (manifest.revision || 0) <= Math.max(this.revisiTerpasang, revisiTercatat)) {
      this.stateManager.transisi('failed', `Penolakan anti-replay OTA: revisi ${manifest.revision} <= ${Math.max(this.revisiTerpasang, revisiTercatat)}`);
      return {
        sukses: false,
        pesan: `Pembaruan OTA ditolak (anti-replay): versi '${manifest.releaseVersion}' revisi ${manifest.revision} sudah diterapkan.`,
      };
    }

    const res = await this.otaManager.terapkanPembaruanOTA(manifest);
    if (res.sukses && res.aktivasi) {
      this.versiTerpasang = res.aktivasi.versiAktif;
      this.revisiTerpasang = manifest.revision || 0;
      const prevMax = this.revisiPerVersi.get(this.versiTerpasang) ?? 0;
      this.revisiPerVersi.set(this.versiTerpasang, Math.max(prevMax, this.revisiTerpasang));
    }

    return {
      sukses: res.sukses,
      aktivasi: res.aktivasi,
      pesan: res.pesan,
    };
  }

  public async aktivasiDenganHealthCheck(
    manifest: ManifestPembaruan,
    pemeriksaKesehatan: () => boolean | Promise<boolean>
  ): Promise<{ sukses: boolean; rolledBack: boolean; pesan: string }> {
    const terapkan = await this.terapkanManifestOTA(manifest);
    if (!terapkan.sukses) {
      return { sukses: false, rolledBack: false, pesan: terapkan.pesan };
    }
    let sehat = false;
    try {
      sehat = Boolean(await pemeriksaKesehatan());
    } catch {
      sehat = false;
    }
    if (!sehat) {
      const rb = this.rollbackResource();
      return {
        sukses: false,
        rolledBack: rb.sukses,
        pesan: `Pemeriksaan kesehatan pasca-OTA gagal! Rollback otomatis ke '${rb.versiDipulihkan || 'sebelumnya'}': ${rb.pesan}`,
      };
    }
    return { sukses: true, rolledBack: false, pesan: terapkan.pesan };
  }

  /**
   * Menjalankan siklus unduh dan penerapan OTA resource secara aman.
   */
  public async terapkanPembaruanOTA(): Promise<{
    sukses: boolean;
    aktivasi?: HasilAktivasiResource;
    pesan: string;
  }> {
    const cek = this.periksaPembaruan();
    if (!cek.manifest) {
      return {
        sukses: false,
        pesan: 'Manifest pembaruan tidak tersedia untuk diunduh.',
      };
    }

    if (cek.manifest.updateType === 'native_store') {
      return {
        sukses: false,
        pesan: 'Pembaruan ini adalah Native Binary Update. Harus diperbarui melalui Google Play Store atau Apple App Store, bukan melalui OTA.',
      };
    }

    const res = await this.otaManager.terapkanPembaruanOTA(cek.manifest);
    if (res.sukses && res.aktivasi) {
      this.versiTerpasang = res.aktivasi.versiAktif;
    }

    return {
      sukses: res.sukses,
      aktivasi: res.aktivasi,
      pesan: res.pesan,
    };
  }

  /**
   * Melakukan rollback resource non-eksekusi ke versi sebelumnya dan memulihkan ActivationManager.
   */
  public rollbackResource(): { sukses: boolean; pesan: string; versiDipulihkan?: string } {
    const res = RollbackManager.dapatkanInstance().eksekusiRollback(
      this.platform,
      (versiDipulihkan, berkasDipulihkan) => {
        ActivationManager.dapatkanInstance().pulihkanCadangan(versiDipulihkan, berkasDipulihkan);
        this.versiTerpasang = versiDipulihkan;
        this.revisiTerpasang = this.revisiPerVersi.get(versiDipulihkan) ?? 0;
        this.stateManager.transisi('rolled_back', `Dipulihkan ke versi ${versiDipulihkan}`);
      }
    );
    return {
      sukses: res.sukses,
      versiDipulihkan: res.versiDipulihkan,
      pesan: res.pesan,
    };
  }

  /**
   * Mendapatkan status Google Play In-App Updates.
   */
  public dapatkanStatusPlayInApp(versionCodeTerbaru = 101) {
    return GooglePlayInAppUpdate.periksaKetersediaan(this.applicationId, 100, versionCodeTerbaru);
  }

  /**
   * Mendapatkan status Apple App Store Update.
   */
  public dapatkanStatusAppStoreApple(versiAppStore = '1.2.0') {
    return AppleAppStoreUpdate.periksaKetersediaan(this.applicationId, this.versiTerpasang, versiAppStore);
  }

  /**
   * Membuat laporan rilis pembaruan lengkap.
   */
  public buatLaporan(): LaporanPembaruanLengkap {
    const channel = this.channelManager.dapatkanSaluranAktif();
    const manifest = UpdateRegistry.dapatkanInstance().ambilManifest(
      this.applicationId,
      this.platform,
      channel
    );

    const sig = manifest ? SignatureVerifier.verifikasi(manifest).valid : false;
    const totalResource = manifest ? manifest.resources.length : 0;
    const totalUkuranByte = manifest ? manifest.resources.reduce((a, b) => a + b.ukuranByte, 0) : 0;

    return {
      idLaporan: `lap_upd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      namaAplikasi: 'Aplikasi Nusantara Resmi',
      applicationId: this.applicationId,
      platform: this.platform,
      saluran: channel,
      versiAplikasi: this.versiTerpasang,
      versiManifest: manifest ? manifest.releaseVersion : this.versiTerpasang,
      statusPembaruan: this.stateManager.dapatkanStatus(),
      jenisPembaruan: manifest ? manifest.updateType : 'ota_resource',
      kebijakan: manifest ? manifest.policy : 'opsional',
      totalResource,
      totalUkuranByte,
      integritasLolos: true,
      signatureLolos: sig,
      riwayatTerkini: this.historyManager.dapatkanSemua(),
      pesan: `Pemeriksaan pembaruan aplikasi selesai dievaluasi pada saluran '${channel}'.`,
      stempelWaktu: new Date().toISOString(),
    };
  }
}
