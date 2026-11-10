/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definisi Tipe dan Kontrak Sistem Build Distribusi & Rilis Multiplatform NUSANTARA
 */

export type PlatformTarget =
  | 'linux-x64'
  | 'linux-arm64'
  | 'windows-x64'
  | 'macos-x64'
  | 'macos-arm64'
  | 'web-wasm';

export const PLATFORM_SEMUA: PlatformTarget[] = [
  'linux-x64',
  'linux-arm64',
  'windows-x64',
  'macos-x64',
  'macos-arm64',
  'web-wasm',
];

export type ModeBuild = 'debug' | 'release';

export interface ArtefakBuild {
  platform: PlatformTarget;
  namaBerkas: string;
  jalurRelatif: string;
  ukuranByte: number;
  sha256: string;
  tipe: 'biner' | 'arsip' | 'pustaka' | 'wasm';
  format?: string;
}

export interface ManifestRilis {
  versi: string;
  labelVersi: string;
  waktuBuild: string;
  mode: ModeBuild;
  targetPlatforms: PlatformTarget[];
  artefak: ArtefakBuild[];
  checksumFile: string;
  reproducible: boolean;
}

export interface KonfigurasiBuild {
  mode: ModeBuild;
  target?: PlatformTarget[];
  verifikasiUji?: boolean;
  tanpaUji?: boolean;
  verbose?: boolean;
  reproducible?: boolean;
  direktoriKeluaran?: string;
}

export interface HasilBuild {
  sukses: boolean;
  pesan: string;
  mode: ModeBuild;
  target: PlatformTarget[];
  artefak: ArtefakBuild[];
  manifest?: ManifestRilis;
  sha256sums?: string;
  berkasChecksum?: string;
  tahap?: string;
  validasi?: string[];
  galat?: string;
  durasiMs: number;
}

export interface HasilBersih {
  sukses: boolean;
  pesan: string;
  jumlahBerkasDihapus: number;
}
