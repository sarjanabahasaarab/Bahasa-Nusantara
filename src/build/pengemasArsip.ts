/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pengemas Paket & Arsip Distribusi
 */

import { PlatformTarget, ArtefakBuild } from './types';
import { MATRIKS_PLATFORM } from './konfigurasi';

export class PengemasArsip {
  public static hitungHashSederhana(konten: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < konten.length; i++) {
      hash ^= konten.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    // Ulangi untuk menghasilkan 64 hex characters (sha256 format)
    return hex.repeat(8);
  }

  public static buatArtefak(
    versi: string,
    target: PlatformTarget,
    kontenBiner: string = ''
  ): ArtefakBuild {
    const info = MATRIKS_PLATFORM[target];
    const namaBiner = `nusantara${info.ekstensiBiner}`;
    const namaArsip = `nusantara-v${versi}-${target}.${info.formatArsip}`;
    const sha = this.hitungHashSederhana(`${versi}-${target}-${kontenBiner}`);

    return {
      platform: target,
      namaBerkas: namaArsip,
      jalurRelatif: `dist/${namaArsip}`,
      ukuranByte: Math.max(1024, (kontenBiner.length || 2048) * 8),
      sha256: sha,
      tipe: target === 'web-wasm' ? 'wasm' : 'arsip',
      format: info.formatArsip,
    };
  }
}
