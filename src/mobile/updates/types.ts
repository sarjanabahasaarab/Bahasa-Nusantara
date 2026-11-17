/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Definisi Tipe Data & Kontrak Sistem Pembaruan Mobile & Over-the-Air (OTA)
 */

import type { PlatformMobile } from '../types';
export type { PlatformMobile };

export type SaluranPembaruan =
  | 'development'
  | 'alpha'
  | 'beta'
  | 'testing'
  | 'stable';

export type JenisPembaruan =
  | 'native_store'
  | 'ota_resource'
  | 'hybrid';

export type KebijakanPembaruan =
  | 'opsional'
  | 'disarankan'
  | 'wajib'
  | 'keamanan'
  | 'resource_saja';

export type StatusPembaruan =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'verifying'
  | 'staged'
  | 'activating'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rolled_back'
  | 'requires_store_update';

export type TipeResourceOTA =
  | 'theme'
  | 'images'
  | 'fonts'
  | 'localization'
  | 'content'
  | 'config'
  | 'template';

export interface ItemResourceOTA {
  id: string;
  tipe: TipeResourceOTA;
  jalurRelatif: string;
  url?: string;
  sha256: string;
  ukuranByte: number;
  mimeType?: string;
  versi?: string;
  deskripsi?: string;
}

export interface TandaTanganManifest {
  algoritma: 'Ed25519' | 'RSA-SHA256' | 'HMAC-SHA256';
  keyId: string;
  nilaiTandaTangan: string;
  stempelWaktu: string;
}

export interface ManifestPembaruan {
  schemaVersion: number;
  applicationId: string;
  platform: PlatformMobile | 'keduanya';
  channel: SaluranPembaruan;
  releaseVersion: string;
  minimumSupportedVersion: string;
  updateType: JenisPembaruan;
  policy: KebijakanPembaruan;
  releaseDate: string;
  expirationDate?: string;
  revision: number;
  storeUrl?: {
    googlePlay?: string;
    appStore?: string;
  };
  releaseNotes: Record<string, string>; // locale -> notes
  resources: ItemResourceOTA[];
  tandaTangan?: TandaTanganManifest;
  metadataTambahan?: Record<string, any>;
}

export interface HasilPemeriksaanVersi {
  adaPembaruan: boolean;
  status: 'TERBARU' | 'PEMBARUAN_TERSEDIA' | 'PEMBARUAN_WAJIB' | 'TIDAK_KOMPATIBEL' | 'GALAT_SERVER';
  versiTerpasang: string;
  versiTerbaru: string;
  versiMinimum: string;
  perluPembaruanWajib: boolean;
  jenisPembaruan: JenisPembaruan;
  saluran: SaluranPembaruan;
  kebijakan: KebijakanPembaruan;
  catatanRilis: Record<string, string>;
  storeUrl?: string;
  manifestUrl?: string;
  totalUkuranResourceByte: number;
  pesan: string;
}

export interface KemajuanUnduhan {
  bytesTerunduh: number;
  totalBytes: number;
  persentase: number;
  resourceSaatIni?: string;
  kecepatanBytesPerDetik?: number;
  dibatalkan: boolean;
}

export interface HasilAktivasiResource {
  sukses: boolean;
  versiAktif: string;
  versiSebelumnya?: string;
  resourceDiaktifkan: string[];
  pesan: string;
  stempelWaktu: string;
}

export interface EntriRiwayatPembaruan {
  id: string;
  stempelWaktu: string;
  platform: PlatformMobile;
  versiSebelum: string;
  versiSesudah: string;
  saluran: SaluranPembaruan;
  jenisPembaruan: JenisPembaruan;
  status: 'sukses' | 'gagal' | 'dibatalkan' | 'rollback';
  resourceIds: string[];
  manifestHash?: string;
  pesan: string;
  durasiMs: number;
}

export interface StatusInAppUpdateGooglePlay {
  tersedia: boolean;
  kodeKetersediaan: 'UPDATE_AVAILABLE' | 'UPDATE_NOT_AVAILABLE' | 'DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS';
  versiTersedia: number;
  staleDays: number;
  immediateAllowed: boolean;
  flexibleAllowed: boolean;
  storeUrl: string;
}

export interface StatusAppStoreUpdateApple {
  tersedia: boolean;
  versiTersedia: string;
  bundleId: string;
  appStoreUrl: string;
  minimumOsVersion: string;
  catatanRilis: string;
}

export interface StatistikPembaruanAgregat {
  platform: PlatformMobile | 'semua';
  saluran: SaluranPembaruan;
  totalPemeriksaan: number;
  totalUnduhanSukses: number;
  totalUnduhanGagal: number;
  totalAktivasiSukses: number;
  totalRollback: number;
  distribusiVersi: Record<string, number>;
  jenisKesalahanUmum: Record<string, number>;
}

export interface LaporanPembaruanLengkap {
  idLaporan: string;
  namaAplikasi: string;
  applicationId: string;
  platform: PlatformMobile;
  saluran: SaluranPembaruan;
  versiAplikasi: string;
  versiManifest: string;
  statusPembaruan: StatusPembaruan;
  jenisPembaruan: JenisPembaruan;
  kebijakan: KebijakanPembaruan;
  totalResource: number;
  totalUkuranByte: number;
  integritasLolos: boolean;
  signatureLolos: boolean;
  riwayatTerkini: EntriRiwayatPembaruan[];
  pesan: string;
  stempelWaktu: string;
}
