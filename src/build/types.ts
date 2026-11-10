/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language
 * Definisi Tipe Data Sistem Build & Distribusi Multi-Platform
 */

export type PlatformTarget =
  | 'linux-x64'
  | 'linux-arm64'
  | 'windows-x64'
  | 'macos-x64'
  | 'macos-arm64'
  | 'darwin-x64'
  | 'darwin-arm64';

export type ModeBuild = 'debug' | 'release';

export const PLATFORM_SEMUA: PlatformTarget[] = [
  'linux-x64',
  'linux-arm64',
  'windows-x64',
  'macos-x64',
  'macos-arm64',
];

export interface ArtefakBuild {
  namaBerkas: string;
  jalur: string;
  platform: PlatformTarget;
  format: string;
  ukuranByte: number;
  sha256: string;
  tipe?: 'biner' | 'arsip';
  timestamp?: number | string;
}

export interface ManifestRilis {
  versi: string;
  labelVersi?: string;
  mode?: ModeBuild;
  tanggalRilis?: string;
  waktuDibuat?: string;
  artefak: ArtefakBuild[];
  totalUkuranByte?: number;
  reproducible?: boolean;
  metadata?: Record<string, any>;
}

export interface OpsiBuild {
  mode?: ModeBuild;
  target?: PlatformTarget[];
  targetPlatforms?: PlatformTarget[];
  verifikasiUji?: boolean;
  tanpaUji?: boolean;
  reproducible?: boolean;
  verbose?: boolean;
  direktoriKeluaran?: string;
}

export interface HasilBuild {
  sukses: boolean;
  pesan: string;
  mode: ModeBuild;
  tahap: string;
  artefak: ArtefakBuild[];
  manifest?: ManifestRilis;
  berkasChecksum?: string;
  sha256sums?: string;
  validasi?: string[];
  durasiMs?: number;
  galat?: string;
}

export interface HasilBersih {
  sukses: boolean;
  pesan: string;
  itemDihapus?: string[];
  berkasDihapus?: number;
}
