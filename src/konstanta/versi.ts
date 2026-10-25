/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA - Single Source of Truth untuk Informasi Versi dan Rilis
 * Target Milestone: Phase 24 (v0.24.0)
 */

export const VERSI_NUSANTARA = '0.24.0';
export const LABEL_VERSI_NUSANTARA = 'v0.24.0';
export const FASE_TERAKHIR = 24;
export const NAMA_FASE_TERAKHIR = 'CI/CD, Automated Release & GitHub Workflow';

export interface InfoRilisNUSANTARA {
  versi: string;
  label: string;
  fase: number;
  namaFase: string;
  tanggalRilis: string;
  lisensi: string;
  situsWeb: string;
  repositori: string;
  platformDidukung: string[];
}

export const METADATA_RILIS_NUSANTARA: InfoRilisNUSANTARA = {
  versi: VERSI_NUSANTARA,
  label: LABEL_VERSI_NUSANTARA,
  fase: FASE_TERAKHIR,
  namaFase: NAMA_FASE_TERAKHIR,
  tanggalRilis: '2026-10-25',
  lisensi: 'Apache-2.0',
  situsWeb: 'https://nusantara-lang.org',
  repositori: 'https://github.com/nusantara-lang/nusantara',
  platformDidukung: ['windows-x64', 'linux-x64', 'macos-x64', 'macos-arm64'],
};

/**
 * Mengembalikan informasi banner string resmi untuk CLI.
 */
export function dapatkanBannerCLI(): string {
  return `NUSANTARA CI/CD & Automated Release, Build System & Distribution, Package Ecosystem & Registry, Testing Framework, Language Server & Toolchain (nusantara) ${LABEL_VERSI_NUSANTARA} (fondasi v0.23.0, v0.22.0, v0.21.0, v0.20.0, v0.19.0)`;
}

/**
 * Mendapatkan deteksi platform host saat ini (OS & Arsitektur) tanpa mengarang nilai.
 */
export function dapatkanInfoHost(): {
  os: 'windows' | 'linux' | 'macos' | 'browser' | 'tidak-dikenal';
  arsitektur: 'x64' | 'arm64' | 'x86' | 'wasm' | 'tidak-dikenal';
  namaPlatform: string;
  kunciPlatform: string;
} {
  if (typeof process !== 'undefined' && process.platform && process.arch) {
    let os: 'windows' | 'linux' | 'macos' | 'tidak-dikenal' = 'tidak-dikenal';
    if (process.platform === 'win32') os = 'windows';
    else if (process.platform === 'linux') os = 'linux';
    else if (process.platform === 'darwin') os = 'macos';

    let arsitektur: 'x64' | 'arm64' | 'x86' | 'tidak-dikenal' = 'tidak-dikenal';
    if (process.arch === 'x64') arsitektur = 'x64';
    else if (process.arch === 'arm64') arsitektur = 'arm64';
    else if (process.arch === 'ia32') arsitektur = 'x86';

    const kunciPlatform = `${os}-${arsitektur}`;
    return {
      os,
      arsitektur,
      namaPlatform: `${os} (${arsitektur})`,
      kunciPlatform,
    };
  }

  // Lingkungan Browser
  return {
    os: 'browser',
    arsitektur: 'wasm',
    namaPlatform: 'Peramban Web (WASM / JS Engine)',
    kunciPlatform: 'web-runtime',
  };
}
