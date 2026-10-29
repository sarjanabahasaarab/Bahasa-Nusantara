/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA CLI Application Generator (Phase 33)
 * Penulis Manifest Proyek (nusantara.toml & nusantara-project.json)
 */

import { ManifestPaket, tulisManifest } from '../paket/manifest';
import { VERSI_NUSANTARA } from '../konstanta/versi';

export interface MetadataProyekAwal {
  nama: string;
  versi: string;
  deskripsi: string;
  penulis: string;
  lisensi: string;
  template: string;
  entryPoint: string;
  dependensi?: Record<string, string>;
}

/**
 * Menghasilkan konten string nusantara.toml yang valid untuk ekosistem paket NUSANTARA.
 */
export function hasilkanKontenToml(meta: MetadataProyekAwal): string {
  const manifest: ManifestPaket = {
    nusantara: {
      nama: meta.nama,
      versi: meta.versi,
      deskripsi: meta.deskripsi,
      lisensi: meta.lisensi,
      penulis: meta.penulis,
    },
    dependensi: meta.dependensi || {},
  };

  return tulisManifest(manifest);
}

/**
 * Menghasilkan konten nusantara-project.json untuk metadata proyek dan toolchain IDE.
 */
export function hasilkanKontenJson(meta: MetadataProyekAwal): string {
  const objek = {
    name: meta.nama,
    language: 'NUSANTARA',
    languageVersion: VERSI_NUSANTARA,
    template: meta.template,
    projectVersion: meta.versi,
    description: meta.deskripsi,
    author: meta.penulis,
    license: meta.lisensi,
    entryPoint: meta.entryPoint,
    createdAt: new Date().toISOString(),
  };

  return JSON.stringify(objek, null, 2) + '\n';
}
